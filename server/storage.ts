import { eq, and, desc, asc, gte, lte, like, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  teams, crmUsers, pipelines, stages, companies, contacts, 
  deals, dealInternals, activities, tasks, notes, auditLog,
  users,
  type Team, type InsertTeam,
  type CrmUser, type InsertCrmUser,
  type Pipeline, type InsertPipeline,
  type Stage, type InsertStage,
  type Company, type InsertCompany,
  type Contact, type InsertContact,
  type Deal, type InsertDeal,
  type DealInternal, type InsertDealInternal,
  type Activity, type InsertActivity,
  type Task, type InsertTask,
  type Note, type InsertNote,
  type AuditLogEntry, type InsertAuditLog,
} from "@shared/schema";

export interface CrmUserWithAuth extends CrmUser {
  authProvider?: string;
  microsoftUserId?: string;
  isDisabled?: boolean;
}

export interface IStorage {
  // CRM Users
  getCrmUser(id: string): Promise<CrmUser | undefined>;
  getCrmUserByAuthId(authUserId: string): Promise<CrmUser | undefined>;
  getCrmUsers(): Promise<CrmUser[]>;
  getCrmUsersWithAuth(): Promise<CrmUserWithAuth[]>;
  createCrmUser(user: InsertCrmUser): Promise<CrmUser>;
  updateCrmUser(id: string, data: Partial<InsertCrmUser>): Promise<CrmUser | undefined>;

  // Pipelines
  getPipelines(): Promise<Pipeline[]>;
  getPipeline(id: string): Promise<Pipeline | undefined>;
  createPipeline(pipeline: InsertPipeline): Promise<Pipeline>;
  updatePipeline(id: string, data: Partial<InsertPipeline>): Promise<Pipeline | undefined>;
  deletePipeline(id: string): Promise<void>;

  // Stages
  getStages(pipelineId?: string): Promise<Stage[]>;
  getStage(id: string): Promise<Stage | undefined>;
  createStage(stage: InsertStage): Promise<Stage>;
  updateStage(id: string, data: Partial<InsertStage>): Promise<Stage | undefined>;
  deleteStage(id: string): Promise<void>;

  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<void>;

  // Contacts
  getContacts(): Promise<(Contact & { company?: Company })[]>;
  getContact(id: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, data: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: string): Promise<void>;

  // Deals
  getDeals(filters?: DealFilters): Promise<any[]>;
  getDeal(id: string): Promise<any | undefined>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: string, data: Partial<InsertDeal>): Promise<Deal | undefined>;
  deleteDeal(id: string): Promise<void>;

  // Deal Internals
  getDealInternal(dealId: string): Promise<DealInternal | undefined>;
  upsertDealInternal(dealId: string, data: Partial<InsertDealInternal>): Promise<DealInternal>;

  // Activities
  getActivities(dealId?: string): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Tasks
  getTasks(): Promise<(Task & { assignee?: CrmUser; deal?: Deal })[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  // Notes
  getNotes(entityType?: string, entityId?: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;

  // Audit Log
  createAuditLog(entry: InsertAuditLog): Promise<AuditLogEntry>;
  getAuditLog(entityType: string, entityId: string): Promise<AuditLogEntry[]>;
}

export interface DealFilters {
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  companyId?: string;
  amountMin?: number;
  amountMax?: number;
  closeDateStart?: Date;
  closeDateEnd?: Date;
  search?: string;
}

export class DatabaseStorage implements IStorage {
  // CRM Users
  async getCrmUser(id: string): Promise<CrmUser | undefined> {
    const [user] = await db.select().from(crmUsers).where(eq(crmUsers.id, id));
    return user;
  }

  async getCrmUserByAuthId(authUserId: string): Promise<CrmUser | undefined> {
    const [user] = await db.select().from(crmUsers).where(eq(crmUsers.authUserId, authUserId));
    return user;
  }

  async getCrmUsers(): Promise<CrmUser[]> {
    return db.select().from(crmUsers).orderBy(asc(crmUsers.firstName));
  }

  async getCrmUsersWithAuth(): Promise<CrmUserWithAuth[]> {
    const result = await db
      .select({
        id: crmUsers.id,
        authUserId: crmUsers.authUserId,
        role: crmUsers.role,
        teamId: crmUsers.teamId,
        firstName: crmUsers.firstName,
        lastName: crmUsers.lastName,
        email: crmUsers.email,
        createdAt: crmUsers.createdAt,
        updatedAt: crmUsers.updatedAt,
        authProvider: users.authProvider,
        microsoftUserId: users.microsoftUserId,
        isDisabled: users.isDisabled,
      })
      .from(crmUsers)
      .leftJoin(users, eq(crmUsers.authUserId, users.id))
      .orderBy(asc(crmUsers.firstName));
    
    return result as CrmUserWithAuth[];
  }

  async createCrmUser(user: InsertCrmUser): Promise<CrmUser> {
    const [created] = await db.insert(crmUsers).values(user).returning();
    return created;
  }

  async updateCrmUser(id: string, data: Partial<InsertCrmUser>): Promise<CrmUser | undefined> {
    const [updated] = await db.update(crmUsers).set({ ...data, updatedAt: new Date() }).where(eq(crmUsers.id, id)).returning();
    return updated;
  }

  // Pipelines
  async getPipelines(): Promise<Pipeline[]> {
    return db.select().from(pipelines).orderBy(asc(pipelines.name));
  }

  async getPipeline(id: string): Promise<Pipeline | undefined> {
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id));
    return pipeline;
  }

  async createPipeline(pipeline: InsertPipeline): Promise<Pipeline> {
    const [created] = await db.insert(pipelines).values(pipeline).returning();
    return created;
  }

  async updatePipeline(id: string, data: Partial<InsertPipeline>): Promise<Pipeline | undefined> {
    const [updated] = await db.update(pipelines).set(data).where(eq(pipelines.id, id)).returning();
    return updated;
  }

  async deletePipeline(id: string): Promise<void> {
    // Get all stages in pipeline
    const pipelineStages = await db.select().from(stages).where(eq(stages.pipelineId, id));
    const stageIds = pipelineStages.map(s => s.id);
    
    // Delete all deals and related data in this pipeline first
    const pipelineDeals = await db.select().from(deals).where(eq(deals.pipelineId, id));
    for (const deal of pipelineDeals) {
      await this.deleteDeal(deal.id);
    }
    
    // Now delete stages and pipeline
    await db.delete(stages).where(eq(stages.pipelineId, id));
    await db.delete(pipelines).where(eq(pipelines.id, id));
  }

  // Stages
  async getStages(pipelineId?: string): Promise<Stage[]> {
    if (pipelineId) {
      return db.select().from(stages).where(eq(stages.pipelineId, pipelineId)).orderBy(asc(stages.order));
    }
    return db.select().from(stages).orderBy(asc(stages.order));
  }

  async getStage(id: string): Promise<Stage | undefined> {
    const [stage] = await db.select().from(stages).where(eq(stages.id, id));
    return stage;
  }

  async createStage(stage: InsertStage): Promise<Stage> {
    const [created] = await db.insert(stages).values(stage).returning();
    return created;
  }

  async updateStage(id: string, data: Partial<InsertStage>): Promise<Stage | undefined> {
    const [updated] = await db.update(stages).set(data).where(eq(stages.id, id)).returning();
    return updated;
  }

  async deleteStage(id: string): Promise<void> {
    // Delete all deals in this stage first
    const stageDeals = await db.select().from(deals).where(eq(deals.stageId, id));
    for (const deal of stageDeals) {
      await this.deleteDeal(deal.id);
    }
    await db.delete(stages).where(eq(stages.id, id));
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return db.select().from(companies).orderBy(asc(companies.name));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const [updated] = await db.update(companies).set({ ...data, updatedAt: new Date() }).where(eq(companies.id, id)).returning();
    return updated;
  }

  async deleteCompany(id: string): Promise<void> {
    // Nullify company references in contacts and deals before deleting
    await db.update(contacts).set({ companyId: null }).where(eq(contacts.companyId, id));
    await db.update(deals).set({ companyId: null }).where(eq(deals.companyId, id));
    await db.update(tasks).set({ companyId: null }).where(eq(tasks.companyId, id));
    await db.update(activities).set({ companyId: null }).where(eq(activities.companyId, id));
    await db.update(notes).set({ companyId: null }).where(eq(notes.companyId, id));
    await db.delete(companies).where(eq(companies.id, id));
  }

  // Contacts
  async getContacts(): Promise<(Contact & { company?: Company })[]> {
    const result = await db
      .select({
        contact: contacts,
        company: companies,
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .orderBy(asc(contacts.firstName));
    
    return result.map(r => ({ ...r.contact, company: r.company || undefined }));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  async updateContact(id: string, data: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updated] = await db.update(contacts).set({ ...data, updatedAt: new Date() }).where(eq(contacts.id, id)).returning();
    return updated;
  }

  async deleteContact(id: string): Promise<void> {
    // Nullify contact references before deleting
    await db.update(tasks).set({ contactId: null }).where(eq(tasks.contactId, id));
    await db.update(activities).set({ contactId: null }).where(eq(activities.contactId, id));
    await db.update(notes).set({ contactId: null }).where(eq(notes.contactId, id));
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Deals
  async getDeals(filters?: DealFilters): Promise<any[]> {
    const conditions = [];
    
    if (filters?.pipelineId) {
      conditions.push(eq(deals.pipelineId, filters.pipelineId));
    }
    if (filters?.stageId) {
      conditions.push(eq(deals.stageId, filters.stageId));
    }
    if (filters?.ownerId) {
      conditions.push(eq(deals.ownerId, filters.ownerId));
    }
    if (filters?.companyId) {
      conditions.push(eq(deals.companyId, filters.companyId));
    }
    if (filters?.amountMin !== undefined) {
      conditions.push(gte(deals.amount, filters.amountMin.toString()));
    }
    if (filters?.amountMax !== undefined) {
      conditions.push(lte(deals.amount, filters.amountMax.toString()));
    }
    if (filters?.closeDateStart) {
      conditions.push(gte(deals.closeDate, filters.closeDateStart));
    }
    if (filters?.closeDateEnd) {
      conditions.push(lte(deals.closeDate, filters.closeDateEnd));
    }

    const result = await db
      .select({
        deal: deals,
        stage: stages,
        owner: crmUsers,
        company: companies,
        internal: dealInternals,
      })
      .from(deals)
      .leftJoin(stages, eq(deals.stageId, stages.id))
      .leftJoin(crmUsers, eq(deals.ownerId, crmUsers.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(dealInternals, eq(deals.id, dealInternals.dealId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(deals.createdAt));

    const dealsWithActivities = await Promise.all(
      result.map(async (r) => {
        const dealActivities = await db
          .select()
          .from(activities)
          .where(eq(activities.dealId, r.deal.id))
          .orderBy(desc(activities.createdAt))
          .limit(1);

        return {
          ...r.deal,
          stage: r.stage || undefined,
          owner: r.owner || undefined,
          company: r.company || undefined,
          internal: r.internal || undefined,
          activities: dealActivities,
        };
      })
    );

    return dealsWithActivities;
  }

  async getDeal(id: string): Promise<any | undefined> {
    const [result] = await db
      .select({
        deal: deals,
        stage: stages,
        owner: crmUsers,
        company: companies,
        internal: dealInternals,
      })
      .from(deals)
      .leftJoin(stages, eq(deals.stageId, stages.id))
      .leftJoin(crmUsers, eq(deals.ownerId, crmUsers.id))
      .leftJoin(companies, eq(deals.companyId, companies.id))
      .leftJoin(dealInternals, eq(deals.id, dealInternals.dealId))
      .where(eq(deals.id, id));

    if (!result) return undefined;

    const dealActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.dealId, id))
      .orderBy(desc(activities.createdAt));

    return {
      ...result.deal,
      stage: result.stage || undefined,
      owner: result.owner || undefined,
      company: result.company || undefined,
      internal: result.internal || undefined,
      activities: dealActivities,
    };
  }

  async createDeal(deal: InsertDeal): Promise<Deal> {
    const [created] = await db.insert(deals).values(deal).returning();
    return created;
  }

  async updateDeal(id: string, data: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [updated] = await db.update(deals).set({ ...data, updatedAt: new Date() }).where(eq(deals.id, id)).returning();
    return updated;
  }

  async deleteDeal(id: string): Promise<void> {
    await db.delete(dealInternals).where(eq(dealInternals.dealId, id));
    await db.delete(activities).where(eq(activities.dealId, id));
    await db.delete(tasks).where(eq(tasks.dealId, id));
    await db.delete(notes).where(eq(notes.dealId, id));
    await db.delete(deals).where(eq(deals.id, id));
  }

  // Deal Internals
  async getDealInternal(dealId: string): Promise<DealInternal | undefined> {
    const [internal] = await db.select().from(dealInternals).where(eq(dealInternals.dealId, dealId));
    return internal;
  }

  async upsertDealInternal(dealId: string, data: Partial<InsertDealInternal>): Promise<DealInternal> {
    const existing = await this.getDealInternal(dealId);
    if (existing) {
      const [updated] = await db
        .update(dealInternals)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dealInternals.dealId, dealId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dealInternals)
        .values({ ...data, dealId })
        .returning();
      return created;
    }
  }

  // Activities
  async getActivities(dealId?: string): Promise<Activity[]> {
    if (dealId) {
      return db.select().from(activities).where(eq(activities.dealId, dealId)).orderBy(desc(activities.createdAt));
    }
    return db.select().from(activities).orderBy(desc(activities.createdAt));
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [created] = await db.insert(activities).values(activity).returning();
    
    // Update deal's lastActivityAt
    if (activity.dealId) {
      await db.update(deals).set({ lastActivityAt: new Date() }).where(eq(deals.id, activity.dealId));
    }
    
    return created;
  }

  // Tasks
  async getTasks(): Promise<(Task & { assignee?: CrmUser; deal?: Deal })[]> {
    const result = await db
      .select({
        task: tasks,
        assignee: crmUsers,
        deal: deals,
      })
      .from(tasks)
      .leftJoin(crmUsers, eq(tasks.assigneeId, crmUsers.id))
      .leftJoin(deals, eq(tasks.dealId, deals.id))
      .orderBy(desc(tasks.createdAt));

    return result.map(r => ({
      ...r.task,
      assignee: r.assignee || undefined,
      deal: r.deal || undefined,
    }));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Notes
  async getNotes(entityType?: string, entityId?: string): Promise<Note[]> {
    let conditions = [];
    if (entityType === "deal" && entityId) {
      conditions.push(eq(notes.dealId, entityId));
    } else if (entityType === "contact" && entityId) {
      conditions.push(eq(notes.contactId, entityId));
    } else if (entityType === "company" && entityId) {
      conditions.push(eq(notes.companyId, entityId));
    }
    
    if (conditions.length > 0) {
      return db.select().from(notes).where(and(...conditions)).orderBy(desc(notes.createdAt));
    }
    return db.select().from(notes).orderBy(desc(notes.createdAt));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [created] = await db.insert(notes).values(note).returning();
    return created;
  }

  // Audit Log
  async createAuditLog(entry: InsertAuditLog): Promise<AuditLogEntry> {
    const [created] = await db.insert(auditLog).values(entry).returning();
    return created;
  }

  async getAuditLog(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, entityType), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.createdAt));
  }
}

export const storage = new DatabaseStorage();
