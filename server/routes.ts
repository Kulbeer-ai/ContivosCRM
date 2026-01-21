import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, type DealFilters } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, type AuthUser } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (local + Microsoft SSO)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Helper to get current CRM user
  async function getCurrentCrmUser(req: Request) {
    const authUser = req.user as AuthUser;
    if (!authUser?.id) return null;
    
    let crmUser = await storage.getCrmUserByAuthId(authUser.id);
    if (!crmUser) {
      // Create CRM user on first login
      crmUser = await storage.createCrmUser({
        authUserId: authUser.id,
        firstName: authUser.firstName || null,
        lastName: authUser.lastName || null,
        email: authUser.email || null,
        role: "sales", // Default role
      });
    }
    return crmUser;
  }

  // Check if user is admin/manager
  function requireAdmin(req: Request, res: Response, crmUser: any) {
    if (!crmUser || crmUser.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return false;
    }
    return true;
  }

  // Current user info
  app.get("/api/users/me", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      res.json(crmUser);
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // CRM Users - public basic list for UI (names only for dropdowns)
  app.get("/api/users/basic", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const users = await storage.getCrmUsers();
      res.json(users.map(u => ({ id: u.id, firstName: u.firstName, lastName: u.lastName, role: u.role })));
    } catch (error) {
      console.error("Error fetching basic users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // CRM Users (with auth provider info - admin only)
  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (crmUser?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getCrmUsersWithAuth();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Pipelines
  app.get("/api/pipelines", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const pipelineList = await storage.getPipelines();
      res.json(pipelineList);
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      res.status(500).json({ message: "Failed to fetch pipelines" });
    }
  });

  app.post("/api/pipelines", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!requireAdmin(req, res, crmUser)) return;

      const pipeline = await storage.createPipeline(req.body);
      res.status(201).json(pipeline);
    } catch (error) {
      console.error("Error creating pipeline:", error);
      res.status(500).json({ message: "Failed to create pipeline" });
    }
  });

  app.patch("/api/pipelines/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!requireAdmin(req, res, crmUser)) return;

      const pipeline = await storage.updatePipeline(req.params.id, req.body);
      if (!pipeline) {
        return res.status(404).json({ message: "Pipeline not found" });
      }
      res.json(pipeline);
    } catch (error) {
      console.error("Error updating pipeline:", error);
      res.status(500).json({ message: "Failed to update pipeline" });
    }
  });

  app.delete("/api/pipelines/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!requireAdmin(req, res, crmUser)) return;

      await storage.deletePipeline(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pipeline:", error);
      res.status(500).json({ message: "Failed to delete pipeline" });
    }
  });

  // Stages
  app.get("/api/stages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const pipelineId = req.query.pipelineId as string | undefined;
      const stageList = await storage.getStages(pipelineId);
      res.json(stageList);
    } catch (error) {
      console.error("Error fetching stages:", error);
      res.status(500).json({ message: "Failed to fetch stages" });
    }
  });

  app.post("/api/stages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!requireAdmin(req, res, crmUser)) return;

      const stage = await storage.createStage(req.body);
      res.status(201).json(stage);
    } catch (error) {
      console.error("Error creating stage:", error);
      res.status(500).json({ message: "Failed to create stage" });
    }
  });

  app.patch("/api/stages/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!requireAdmin(req, res, crmUser)) return;

      const stage = await storage.updateStage(req.params.id, req.body);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      res.json(stage);
    } catch (error) {
      console.error("Error updating stage:", error);
      res.status(500).json({ message: "Failed to update stage" });
    }
  });

  app.delete("/api/stages/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!requireAdmin(req, res, crmUser)) return;

      await storage.deleteStage(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stage:", error);
      res.status(500).json({ message: "Failed to delete stage" });
    }
  });

  // Companies
  app.get("/api/companies", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const companyList = await storage.getCompanies();
      res.json(companyList);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post("/api/companies", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const company = await storage.createCompany(req.body);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.patch("/api/companies/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const company = await storage.updateCompany(req.params.id, req.body);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.delete("/api/companies/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteCompany(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Contacts
  app.get("/api/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const contactList = await storage.getContacts();
      res.json(contactList);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const contact = await storage.createContact(req.body);
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const contact = await storage.updateContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteContact(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Deals
  app.get("/api/deals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const filters: DealFilters = {};
      if (req.query.pipelineId) filters.pipelineId = req.query.pipelineId as string;
      if (req.query.stageId) filters.stageId = req.query.stageId as string;
      if (req.query.ownerId) filters.ownerId = req.query.ownerId as string;
      if (req.query.companyId) filters.companyId = req.query.companyId as string;
      if (req.query.amountMin) filters.amountMin = parseFloat(req.query.amountMin as string);
      if (req.query.amountMax) filters.amountMax = parseFloat(req.query.amountMax as string);
      if (req.query.closeDateStart) filters.closeDateStart = new Date(req.query.closeDateStart as string);
      if (req.query.closeDateEnd) filters.closeDateEnd = new Date(req.query.closeDateEnd as string);

      const dealList = await storage.getDeals(filters);
      res.json(dealList);
    } catch (error) {
      console.error("Error fetching deals:", error);
      res.status(500).json({ message: "Failed to fetch deals" });
    }
  });

  app.get("/api/deals/export", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      const isAdmin = crmUser?.role === "admin";
      
      const filters: DealFilters = {};
      if (req.query.pipelineId) filters.pipelineId = req.query.pipelineId as string;

      const dealList = await storage.getDeals(filters);
      
      // Build CSV
      let headers = ["Deal Name", "Amount", "Stage", "Owner", "Company", "Close Date", "Created Date", "Probability", "Weighted Amount"];
      if (isAdmin) {
        headers.push("Internal Score", "Forecast Category", "Approval Status", "Internal Notes");
      }
      
      const rows = dealList.map(deal => {
        const probability = deal.internal?.probabilityOverride ?? deal.stage?.probability ?? 0;
        const amount = parseFloat(deal.amount || "0");
        const weightedAmount = amount * (probability / 100);
        
        const row: string[] = [
          deal.name,
          amount.toString(),
          deal.stage?.name || "",
          `${deal.owner?.firstName || ""} ${deal.owner?.lastName || ""}`.trim(),
          deal.company?.name || "",
          deal.closeDate ? new Date(deal.closeDate).toISOString().split("T")[0] : "",
          deal.createdAt ? new Date(deal.createdAt).toISOString().split("T")[0] : "",
          probability.toString(),
          weightedAmount.toFixed(2),
        ];
        
        if (isAdmin && deal.internal) {
          row.push(
            deal.internal.internalScore?.toString() || "",
            deal.internal.forecastCategory || "",
            deal.internal.approvalStatus || "",
            deal.internal.internalNotes || "",
          );
        } else if (isAdmin) {
          row.push("", "", "", "");
        }
        
        return row;
      });

      const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=deals-export.csv");
      res.send(csv);
    } catch (error) {
      console.error("Error exporting deals:", error);
      res.status(500).json({ message: "Failed to export deals" });
    }
  });

  app.get("/api/deals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const deal = await storage.getDeal(req.params.id);
      if (!deal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      res.json(deal);
    } catch (error) {
      console.error("Error fetching deal:", error);
      res.status(500).json({ message: "Failed to fetch deal" });
    }
  });

  app.post("/api/deals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!crmUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const dealData = {
        ...req.body,
        ownerId: req.body.ownerId || crmUser.id,
        companyId: req.body.companyId || null,
      };

      const deal = await storage.createDeal(dealData);

      // Log activity
      await storage.createActivity({
        type: "note",
        summary: "Deal created",
        dealId: deal.id,
        createdById: crmUser.id,
      });

      res.status(201).json(deal);
    } catch (error) {
      console.error("Error creating deal:", error);
      res.status(500).json({ message: "Failed to create deal" });
    }
  });

  app.patch("/api/deals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!crmUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const oldDeal = await storage.getDeal(req.params.id);
      if (!oldDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }

      const deal = await storage.updateDeal(req.params.id, req.body);

      // Log stage change activity
      if (req.body.stageId && oldDeal.stageId !== req.body.stageId) {
        const newStage = await storage.getStage(req.body.stageId);
        await storage.createActivity({
          type: "note",
          summary: `Stage changed to ${newStage?.name || "Unknown"}`,
          dealId: deal!.id,
          createdById: crmUser.id,
        });

        // Create audit log
        await storage.createAuditLog({
          entity: "deal",
          entityId: deal!.id,
          field: "stageId",
          oldValue: oldDeal.stageId,
          newValue: req.body.stageId,
          userId: crmUser.id,
        });
      }

      res.json(deal);
    } catch (error) {
      console.error("Error updating deal:", error);
      res.status(500).json({ message: "Failed to update deal" });
    }
  });

  app.delete("/api/deals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteDeal(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting deal:", error);
      res.status(500).json({ message: "Failed to delete deal" });
    }
  });

  // Deal Internals (Admin only)
  app.patch("/api/deals/:id/internal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!crmUser || crmUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const internal = await storage.upsertDealInternal(req.params.id, req.body);

      // Create audit log for internal changes
      for (const [key, value] of Object.entries(req.body)) {
        await storage.createAuditLog({
          entity: "dealInternal",
          entityId: req.params.id,
          field: key,
          oldValue: null,
          newValue: String(value),
          userId: crmUser.id,
        });
      }

      res.json(internal);
    } catch (error) {
      console.error("Error updating deal internal:", error);
      res.status(500).json({ message: "Failed to update deal internal" });
    }
  });

  // Tasks
  app.get("/api/tasks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const taskList = await storage.getTasks();
      res.json(taskList);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!crmUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const task = await storage.createTask({
        ...req.body,
        createdById: crmUser.id,
      });
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Activities
  app.post("/api/activities", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const crmUser = await getCurrentCrmUser(req);
      if (!crmUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const activity = await storage.createActivity({
        ...req.body,
        createdById: crmUser.id,
      });
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Metrics
  app.get("/api/metrics", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allDeals = await storage.getDeals({});
      const allStages = await storage.getStages();

      // Calculate metrics
      let totalDeals = 0;
      let totalAmount = 0;
      let weightedAmount = 0;
      let wonCount = 0;
      let wonAmount = 0;
      let lostCount = 0;
      let lostAmount = 0;
      
      const stageMetricsMap = new Map<string, { count: number; totalAmount: number; weightedAmount: number }>();
      
      for (const stage of allStages) {
        stageMetricsMap.set(stage.id, { count: 0, totalAmount: 0, weightedAmount: 0 });
      }

      for (const deal of allDeals) {
        const amount = parseFloat(deal.amount || "0");
        const probability = deal.internal?.probabilityOverride ?? deal.stage?.probability ?? 0;
        const weighted = amount * (probability / 100);

        totalDeals++;
        totalAmount += amount;
        weightedAmount += weighted;

        // Track stage metrics
        if (deal.stageId && stageMetricsMap.has(deal.stageId)) {
          const sm = stageMetricsMap.get(deal.stageId)!;
          sm.count++;
          sm.totalAmount += amount;
          sm.weightedAmount += weighted;
        }

        // Track won/lost
        const stageName = deal.stage?.name?.toLowerCase() || "";
        if (stageName.includes("won")) {
          wonCount++;
          wonAmount += amount;
        } else if (stageName.includes("lost")) {
          lostCount++;
          lostAmount += amount;
        }
      }

      const stageMetrics = allStages.map(stage => ({
        stageId: stage.id,
        stageName: stage.name,
        stageColor: stage.color,
        ...stageMetricsMap.get(stage.id)!,
      }));

      res.json({
        totalDeals,
        totalAmount,
        weightedAmount,
        wonCount,
        wonAmount,
        lostCount,
        lostAmount,
        stageMetrics,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  return httpServer;
}
