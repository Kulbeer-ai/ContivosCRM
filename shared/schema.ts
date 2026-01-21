import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "sales"]);
export const activityTypeEnum = pgEnum("activity_type", ["email", "call", "meeting", "note", "task"]);
export const forecastCategoryEnum = pgEnum("forecast_category", ["pipeline", "best_case", "commit", "closed"]);
export const approvalStatusEnum = pgEnum("approval_status", ["draft", "needs_approval", "approved"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "in_progress", "completed", "cancelled"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// CRM Users (extends auth users with role)
export const crmUsers = pgTable("crm_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authUserId: varchar("auth_user_id").notNull().unique(),
  role: userRoleEnum("role").default("sales").notNull(),
  teamId: varchar("team_id").references(() => teams.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pipelines
export const pipelines = pgTable("pipelines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stages
export const stages = pgTable("stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pipelineId: varchar("pipeline_id").references(() => pipelines.id).notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  probability: integer("probability").default(0).notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Companies
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logo: text("logo"),
  website: text("website"),
  industry: text("industry"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  companyId: varchar("company_id").references(() => companies.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deals
export const deals = pgTable("deals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).default("0"),
  pipelineId: varchar("pipeline_id").references(() => pipelines.id).notNull(),
  stageId: varchar("stage_id").references(() => stages.id).notNull(),
  ownerId: varchar("owner_id").references(() => crmUsers.id).notNull(),
  companyId: varchar("company_id").references(() => companies.id),
  closeDate: timestamp("close_date"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at"),
}, (table) => [
  index("deals_pipeline_idx").on(table.pipelineId),
  index("deals_stage_idx").on(table.stageId),
  index("deals_owner_idx").on(table.ownerId),
]);

// Deal Internal Fields (Admin only)
export const dealInternals = pgTable("deal_internals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id").references(() => deals.id).notNull().unique(),
  probabilityOverride: integer("probability_override"),
  weightedAmountOverride: decimal("weighted_amount_override", { precision: 15, scale: 2 }),
  costEstimate: decimal("cost_estimate", { precision: 15, scale: 2 }),
  expectedMargin: decimal("expected_margin", { precision: 5, scale: 2 }),
  forecastCategory: forecastCategoryEnum("forecast_category").default("pipeline"),
  internalScore: integer("internal_score"),
  internalNotes: text("internal_notes"),
  approvalStatus: approvalStatusEnum("approval_status").default("draft"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activities
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: activityTypeEnum("type").notNull(),
  summary: text("summary").notNull(),
  details: text("details"),
  dealId: varchar("deal_id").references(() => deals.id),
  contactId: varchar("contact_id").references(() => contacts.id),
  companyId: varchar("company_id").references(() => companies.id),
  createdById: varchar("created_by_id").references(() => crmUsers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  status: taskStatusEnum("status").default("pending").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  assigneeId: varchar("assignee_id").references(() => crmUsers.id),
  dealId: varchar("deal_id").references(() => deals.id),
  contactId: varchar("contact_id").references(() => contacts.id),
  companyId: varchar("company_id").references(() => companies.id),
  createdById: varchar("created_by_id").references(() => crmUsers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notes
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  dealId: varchar("deal_id").references(() => deals.id),
  contactId: varchar("contact_id").references(() => contacts.id),
  companyId: varchar("company_id").references(() => companies.id),
  createdById: varchar("created_by_id").references(() => crmUsers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit Log
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entity: text("entity").notNull(),
  entityId: varchar("entity_id").notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: varchar("user_id").references(() => crmUsers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const crmUsersRelations = relations(crmUsers, ({ one, many }) => ({
  team: one(teams, { fields: [crmUsers.teamId], references: [teams.id] }),
  ownedDeals: many(deals),
  activities: many(activities),
  tasks: many(tasks),
  notes: many(notes),
}));

export const pipelinesRelations = relations(pipelines, ({ many }) => ({
  stages: many(stages),
  deals: many(deals),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  pipeline: one(pipelines, { fields: [stages.pipelineId], references: [pipelines.id] }),
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  pipeline: one(pipelines, { fields: [deals.pipelineId], references: [pipelines.id] }),
  stage: one(stages, { fields: [deals.stageId], references: [stages.id] }),
  owner: one(crmUsers, { fields: [deals.ownerId], references: [crmUsers.id] }),
  company: one(companies, { fields: [deals.companyId], references: [companies.id] }),
  internal: one(dealInternals),
  activities: many(activities),
  tasks: many(tasks),
  notes: many(notes),
}));

export const dealInternalsRelations = relations(dealInternals, ({ one }) => ({
  deal: one(deals, { fields: [dealInternals.dealId], references: [deals.id] }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
  deals: many(deals),
  activities: many(activities),
  tasks: many(tasks),
  notes: many(notes),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  activities: many(activities),
  tasks: many(tasks),
  notes: many(notes),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  deal: one(deals, { fields: [activities.dealId], references: [deals.id] }),
  contact: one(contacts, { fields: [activities.contactId], references: [contacts.id] }),
  company: one(companies, { fields: [activities.companyId], references: [companies.id] }),
  createdBy: one(crmUsers, { fields: [activities.createdById], references: [crmUsers.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  deal: one(deals, { fields: [tasks.dealId], references: [deals.id] }),
  contact: one(contacts, { fields: [tasks.contactId], references: [contacts.id] }),
  company: one(companies, { fields: [tasks.companyId], references: [companies.id] }),
  assignee: one(crmUsers, { fields: [tasks.assigneeId], references: [crmUsers.id] }),
  createdBy: one(crmUsers, { fields: [tasks.createdById], references: [crmUsers.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  deal: one(deals, { fields: [notes.dealId], references: [deals.id] }),
  contact: one(contacts, { fields: [notes.contactId], references: [contacts.id] }),
  company: one(companies, { fields: [notes.companyId], references: [companies.id] }),
  createdBy: one(crmUsers, { fields: [notes.createdById], references: [crmUsers.id] }),
}));

// Insert Schemas
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertCrmUserSchema = createInsertSchema(crmUsers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPipelineSchema = createInsertSchema(pipelines).omit({ id: true, createdAt: true });
export const insertStageSchema = createInsertSchema(stages).omit({ id: true, createdAt: true });
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDealSchema = createInsertSchema(deals).omit({ id: true, createdAt: true, updatedAt: true, lastActivityAt: true });
export const insertDealInternalSchema = createInsertSchema(dealInternals).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true, createdAt: true });

// Types
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type CrmUser = typeof crmUsers.$inferSelect;
export type InsertCrmUser = z.infer<typeof insertCrmUserSchema>;
export type Pipeline = typeof pipelines.$inferSelect;
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export type Stage = typeof stages.$inferSelect;
export type InsertStage = z.infer<typeof insertStageSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type DealInternal = typeof dealInternals.$inferSelect;
export type InsertDealInternal = z.infer<typeof insertDealInternalSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Extended types for API responses
export type DealWithRelations = Deal & {
  stage?: Stage;
  owner?: CrmUser;
  company?: Company | null;
  internal?: DealInternal | null;
  activities?: Activity[];
};

export type StageWithDeals = Stage & {
  deals: DealWithRelations[];
};
