import type { Express, Request, Response } from "express";
import passport from "passport";
import { authService } from "../auth-service";
import { microsoftAuth } from "../microsoft-auth";
import { isAuthenticated, isAdmin, type AuthUser } from "./session";
import { db } from "../db";
import { users, crmUsers } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      const result = await authService.registerLocalUser(email, password, firstName, lastName);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      await ensureCrmUser(result.user!);
      
      const authUser: AuthUser = {
        id: result.user!.id,
        email: result.user!.email!,
        firstName: result.user!.firstName,
        lastName: result.user!.lastName,
        authProvider: "local",
        isDisabled: false,
      };
      
      req.login(authUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to log in after registration" });
        }
        res.status(201).json({ user: sanitizeUser(result.user!) });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next) => {
    passport.authenticate("local", (err: any, user: AuthUser | false, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication failed" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Login failed" });
        }
        
        const [fullUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        await ensureCrmUser(fullUser);
        
        res.json({ user: { ...user } });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    const user = req.user as AuthUser;
    const [fullUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    res.json(sanitizeUser(fullUser));
  });

  app.get("/api/auth/status", (req: Request, res: Response) => {
    res.json({
      authenticated: req.isAuthenticated(),
      user: req.user ? sanitizeUser(req.user as any) : null,
      microsoftSsoEnabled: microsoftAuth.isConfigured(),
    });
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const result = await authService.createPasswordResetToken(email);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ 
        message: "If an account exists with this email, a password reset link has been sent.",
        token: result.token,
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      const result = await authService.resetPassword(token, password);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.get("/api/auth/microsoft", (req: Request, res: Response) => {
    const authUrl = microsoftAuth.getAuthorizationUrl();
    
    if (!authUrl) {
      return res.status(503).json({ message: "Microsoft SSO is not configured" });
    }
    
    res.redirect(authUrl);
  });

  app.get("/api/auth/microsoft/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query;
      
      if (error) {
        console.error("Microsoft OAuth error:", error, error_description);
        return res.redirect(`/login?error=${encodeURIComponent(error_description as string || "SSO failed")}`);
      }
      
      if (!code || !state) {
        return res.redirect("/login?error=Invalid%20callback%20parameters");
      }
      
      const result = await microsoftAuth.handleCallback(
        code as string,
        state as string,
        req.ip,
        req.headers["user-agent"]
      );
      
      if (!result.success || !result.user) {
        return res.redirect(`/login?error=${encodeURIComponent(result.error || "SSO failed")}`);
      }

      await ensureCrmUser(result.user);
      
      const authUser: AuthUser = {
        id: result.user.id,
        email: result.user.email!,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        authProvider: result.user.authProvider as any,
        isDisabled: result.user.isDisabled,
      };
      
      req.login(authUser, (err) => {
        if (err) {
          console.error("Login error after SSO:", err);
          return res.redirect("/login?error=Login%20failed");
        }
        res.redirect("/");
      });
    } catch (error) {
      console.error("Microsoft callback error:", error);
      res.redirect("/login?error=SSO%20failed");
    }
  });

  app.get("/api/auth/sso-settings", isAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await authService.getSsoSettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching SSO settings:", error);
      res.status(500).json({ message: "Failed to fetch SSO settings" });
    }
  });

  app.patch("/api/auth/sso-settings", isAdmin, async (req: Request, res: Response) => {
    try {
      const settings = await authService.updateSsoSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating SSO settings:", error);
      res.status(500).json({ message: "Failed to update SSO settings" });
    }
  });

  app.post("/api/auth/users/:id/link-microsoft", isAdmin, async (req: Request, res: Response) => {
    try {
      const { microsoftUserId, tenantId } = req.body;
      const result = await authService.linkMicrosoftAccount(req.params.id, microsoftUserId, tenantId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error linking Microsoft account:", error);
      res.status(500).json({ message: "Failed to link Microsoft account" });
    }
  });

  app.post("/api/auth/users/:id/unlink-microsoft", isAdmin, async (req: Request, res: Response) => {
    try {
      const result = await authService.unlinkMicrosoftAccount(req.params.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error unlinking Microsoft account:", error);
      res.status(500).json({ message: "Failed to unlink Microsoft account" });
    }
  });

  app.post("/api/auth/users/:id/disable", isAdmin, async (req: Request, res: Response) => {
    try {
      const result = await authService.disableUser(req.params.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error disabling user:", error);
      res.status(500).json({ message: "Failed to disable user" });
    }
  });

  app.post("/api/auth/users/:id/enable", isAdmin, async (req: Request, res: Response) => {
    try {
      const result = await authService.enableUser(req.params.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error enabling user:", error);
      res.status(500).json({ message: "Failed to enable user" });
    }
  });

  app.get("/api/auth/audit-log", isAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await authService.getAuditLogs(100);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });
}

async function ensureCrmUser(user: any) {
  const [existingCrmUser] = await db
    .select()
    .from(crmUsers)
    .where(eq(crmUsers.authUserId, user.id))
    .limit(1);
    
  if (!existingCrmUser) {
    const ssoSettings = await authService.getSsoSettings();
    const defaultRole = (ssoSettings?.defaultRoleForSso as any) || "sales";
    
    await db.insert(crmUsers).values({
      authUserId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.authProvider === "local" ? "sales" : defaultRole,
    });
  }
}

function sanitizeUser(user: any) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
