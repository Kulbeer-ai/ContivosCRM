import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "./db";
import { users, passwordResetTokens, authAuditLog, ssoSettings } from "@shared/schema";
import type { User, InsertAuthAuditLog } from "@shared/schema";

const SALT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 24;

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async registerLocalUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<RegisterResult> {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: "Email already registered" };
    }

    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const passwordHash = await this.hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        authProvider: "local",
        emailVerified: false,
      })
      .returning();

    await this.logAuditEvent({
      userId: newUser.id,
      email: newUser.email!,
      action: "register",
      provider: "local",
      success: true,
    });

    return { success: true, user: newUser };
  }

  async loginLocalUser(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      await this.logAuditEvent({
        email,
        action: "failed_login",
        provider: "local",
        success: false,
        failureReason: "User not found",
        ipAddress,
        userAgent,
      });
      return { success: false, error: "Invalid email or password" };
    }

    if (user.isDisabled) {
      await this.logAuditEvent({
        userId: user.id,
        email,
        action: "failed_login",
        provider: "local",
        success: false,
        failureReason: "Account disabled",
        ipAddress,
        userAgent,
      });
      return { success: false, error: "Account is disabled. Contact your administrator." };
    }

    if (!user.passwordHash) {
      await this.logAuditEvent({
        userId: user.id,
        email,
        action: "failed_login",
        provider: "local",
        success: false,
        failureReason: "No password set (SSO account)",
        ipAddress,
        userAgent,
      });
      return { success: false, error: "This account uses Microsoft SSO. Please sign in with Microsoft." };
    }

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      await this.logAuditEvent({
        userId: user.id,
        email,
        action: "failed_login",
        provider: "local",
        success: false,
        failureReason: "Invalid password",
        ipAddress,
        userAgent,
      });
      return { success: false, error: "Invalid email or password" };
    }

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    await this.logAuditEvent({
      userId: user.id,
      email: user.email!,
      action: "login",
      provider: "local",
      success: true,
      ipAddress,
      userAgent,
    });

    return { success: true, user };
  }

  async createPasswordResetToken(email: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return { success: true };
    }

    if (user.authProvider !== "local") {
      return { success: false, error: "This account uses SSO. Password reset is not available." };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    await this.logAuditEvent({
      userId: user.id,
      email: user.email!,
      action: "password_reset_request",
      provider: "local",
      success: true,
    });

    return { success: true, token };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);

    if (!resetToken) {
      return { success: false, error: "Invalid or expired reset token" };
    }

    if (resetToken.usedAt) {
      return { success: false, error: "This reset token has already been used" };
    }

    if (new Date() > resetToken.expiresAt) {
      return { success: false, error: "This reset token has expired" };
    }

    if (newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const passwordHash = await this.hashPassword(newPassword);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetToken.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    await this.logAuditEvent({
      userId: resetToken.userId,
      action: "password_reset_complete",
      provider: "local",
      success: true,
    });

    return { success: true };
  }

  async getSsoSettings() {
    const [settings] = await db.select().from(ssoSettings).limit(1);
    return settings || null;
  }

  async updateSsoSettings(data: Partial<typeof ssoSettings.$inferInsert>) {
    const existing = await this.getSsoSettings();
    
    if (existing) {
      const [updated] = await db
        .update(ssoSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(ssoSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(ssoSettings)
        .values(data)
        .returning();
      return created;
    }
  }

  async handleMicrosoftSsoCallback(
    microsoftProfile: {
      id: string;
      displayName?: string;
      mail?: string;
      givenName?: string;
      surname?: string;
      userPrincipalName?: string;
    },
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const email = (microsoftProfile.mail || microsoftProfile.userPrincipalName || "").toLowerCase();
    
    if (!email) {
      return { success: false, error: "No email address found in Microsoft profile" };
    }

    const settings = await this.getSsoSettings();

    if (settings?.allowedTenantIds && settings.allowedTenantIds.length > 0) {
      if (!settings.allowedTenantIds.includes(tenantId)) {
        await this.logAuditEvent({
          email,
          action: "failed_sso_login",
          provider: "microsoft",
          success: false,
          failureReason: `Tenant ${tenantId} not in allowed list`,
          ipAddress,
          userAgent,
        });
        return { success: false, error: "Your organization is not authorized for SSO" };
      }
    }

    const emailDomain = email.split("@")[1];
    if (settings?.allowedEmailDomains && settings.allowedEmailDomains.length > 0) {
      if (!settings.allowedEmailDomains.includes(emailDomain)) {
        await this.logAuditEvent({
          email,
          action: "failed_sso_login",
          provider: "microsoft",
          success: false,
          failureReason: `Email domain ${emailDomain} not in allowed list`,
          ipAddress,
          userAgent,
        });
        return { success: false, error: "Your email domain is not authorized for access" };
      }
    }

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      if (user.isDisabled) {
        await this.logAuditEvent({
          userId: user.id,
          email,
          action: "failed_sso_login",
          provider: "microsoft",
          success: false,
          failureReason: "Account disabled",
          ipAddress,
          userAgent,
        });
        return { success: false, error: "Account is disabled. Contact your administrator." };
      }

      await db
        .update(users)
        .set({
          microsoftUserId: microsoftProfile.id,
          microsoftTenantId: tenantId,
          authProvider: user.authProvider === "local" ? "local" : "microsoft",
          firstName: microsoftProfile.givenName || user.firstName,
          lastName: microsoftProfile.surname || user.lastName,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      user = (await db.select().from(users).where(eq(users.id, user.id)).limit(1))[0];
    } else {
      if (settings?.autoProvisionUsers === false) {
        await this.logAuditEvent({
          email,
          action: "failed_sso_login",
          provider: "microsoft",
          success: false,
          failureReason: "Auto-provisioning disabled and user does not exist",
          ipAddress,
          userAgent,
        });
        return { success: false, error: "Account does not exist. Contact your administrator for access." };
      }

      [user] = await db
        .insert(users)
        .values({
          email,
          firstName: microsoftProfile.givenName || null,
          lastName: microsoftProfile.surname || null,
          microsoftUserId: microsoftProfile.id,
          microsoftTenantId: tenantId,
          authProvider: "microsoft",
          emailVerified: true,
        })
        .returning();
    }

    await this.logAuditEvent({
      userId: user.id,
      email: user.email!,
      action: "sso_login",
      provider: "microsoft",
      success: true,
      ipAddress,
      userAgent,
      metadata: { tenantId, microsoftUserId: microsoftProfile.id },
    });

    return { success: true, user };
  }

  async linkMicrosoftAccount(userId: string, microsoftUserId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await db
      .update(users)
      .set({
        microsoftUserId,
        microsoftTenantId: tenantId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await this.logAuditEvent({
      userId,
      email: user.email!,
      action: "microsoft_account_linked",
      provider: "microsoft",
      success: true,
      metadata: { tenantId, microsoftUserId },
    });

    return { success: true };
  }

  async unlinkMicrosoftAccount(userId: string): Promise<{ success: boolean; error?: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.authProvider === "microsoft" && !user.passwordHash) {
      return { success: false, error: "Cannot unlink Microsoft account without setting a password first" };
    }

    await db
      .update(users)
      .set({
        microsoftUserId: null,
        microsoftTenantId: null,
        authProvider: "local",
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await this.logAuditEvent({
      userId,
      email: user.email!,
      action: "microsoft_account_unlinked",
      provider: "local",
      success: true,
    });

    return { success: true };
  }

  async disableUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await db
      .update(users)
      .set({ isDisabled: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await this.logAuditEvent({
      userId,
      email: user.email!,
      action: "user_disabled",
      success: true,
    });

    return { success: true };
  }

  async enableUser(userId: string): Promise<{ success: boolean; error?: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await db
      .update(users)
      .set({ isDisabled: false, updatedAt: new Date() })
      .where(eq(users.id, userId));

    await this.logAuditEvent({
      userId,
      email: user.email!,
      action: "user_enabled",
      success: true,
    });

    return { success: true };
  }

  private async logAuditEvent(data: InsertAuthAuditLog): Promise<void> {
    try {
      await db.insert(authAuditLog).values(data);
    } catch (error) {
      console.error("Failed to log audit event:", error);
    }
  }

  async getAuditLogs(limit = 100) {
    return db
      .select()
      .from(authAuditLog)
      .orderBy(authAuditLog.createdAt)
      .limit(limit);
  }
}

export const authService = new AuthService();
