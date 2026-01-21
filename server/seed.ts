import { db } from "./db";
import { pipelines, stages, companies, crmUsers, deals } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Starting seed...");

  // Check if already seeded
  const existingPipelines = await db.select().from(pipelines);
  if (existingPipelines.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Create default pipeline
  const [pipeline] = await db.insert(pipelines).values({
    name: "Sales Pipeline",
    isDefault: true,
  }).returning();

  console.log("Created pipeline:", pipeline.name);

  // Create default stages with probabilities
  const defaultStages = [
    { name: "Discovery", order: 0, probability: 20, color: "#6366f1" },
    { name: "Crafting", order: 1, probability: 40, color: "#8b5cf6" },
    { name: "Proposal", order: 2, probability: 60, color: "#a855f7" },
    { name: "Refinement", order: 3, probability: 80, color: "#d946ef" },
    { name: "Contract Sent", order: 4, probability: 90, color: "#ec4899" },
    { name: "Closed Won", order: 5, probability: 100, color: "#22c55e" },
    { name: "Closed Lost", order: 6, probability: 0, color: "#ef4444" },
  ];

  const createdStages = await db.insert(stages).values(
    defaultStages.map(s => ({
      ...s,
      pipelineId: pipeline.id,
    }))
  ).returning();

  console.log(`Created ${createdStages.length} stages`);

  // Create sample companies
  const sampleCompanies = [
    { name: "Acme Corp", industry: "Technology", website: "https://acme.com" },
    { name: "TechStart Inc", industry: "Software", website: "https://techstart.io" },
    { name: "Global Solutions", industry: "Consulting", website: "https://globalsolutions.com" },
    { name: "Innovation Labs", industry: "Research", website: "https://innovationlabs.co" },
    { name: "Digital Dynamics", industry: "Marketing", website: "https://digitaldynamics.com" },
  ];

  const createdCompanies = await db.insert(companies).values(sampleCompanies).returning();
  console.log(`Created ${createdCompanies.length} sample companies`);

  console.log("Seed completed successfully!");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
