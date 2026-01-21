import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar, boolean, pgEnum, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Auth provider enum
export const authProviderEnum = pgEnum("auth_provider", ["local", "microsoft", "replit"]);

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table - extended for dual auth support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Authentication fields
  authProvider: authProviderEnum("auth_provider").default("local").notNull(),
  passwordHash: varchar("password_hash"),
  // Microsoft SSO fields
  microsoftUserId: varchar("microsoft_user_id"),
  microsoftTenantId: varchar("microsoft_tenant_id"),
  // Account status
  isDisabled: boolean("is_disabled").default(false).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// SSO Settings (admin configurable)
export const ssoSettings = pgTable("sso_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Microsoft SSO configuration
  microsoftClientId: varchar("microsoft_client_id"),
  microsoftTenantId: varchar("microsoft_tenant_id"), // For single-tenant, or "common" for multi-tenant
  allowedTenantIds: text("allowed_tenant_ids").array(), // Allowed tenant IDs
  allowedEmailDomains: text("allowed_email_domains").array(), // Allowed email domains for auto-provisioning
  defaultRoleForSso: varchar("default_role_for_sso").default("sales"),
  autoProvisionUsers: boolean("auto_provision_users").default(true).notNull(),
  ssoOnly: boolean("sso_only").default(false).notNull(), // If true, only SSO login allowed for configured domains
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Auth audit log
export const authAuditLog = pgTable("auth_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email"),
  action: varchar("action").notNull(), // login, logout, failed_login, password_reset, sso_login, etc.
  provider: authProviderEnum("provider"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").default(true).notNull(),
  failureReason: text("failure_reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export const insertSsoSettingsSchema = createInsertSchema(ssoSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuthAuditLogSchema = createInsertSchema(authAuditLog).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type SsoSettings = typeof ssoSettings.$inferSelect;
export type InsertSsoSettings = z.infer<typeof insertSsoSettingsSchema>;
export type AuthAuditLogEntry = typeof authAuditLog.$inferSelect;
export type InsertAuthAuditLog = z.infer<typeof insertAuthAuditLogSchema>;
