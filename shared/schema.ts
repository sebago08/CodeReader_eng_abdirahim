import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  date,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table - extended for comprehensive construction management
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  projectNumber: varchar("project_number"), // optional project identifier
  
  // Client information
  client: varchar("client").notNull(), // kept for backward compatibility
  clientContact: varchar("client_contact"),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  clientAddress: text("client_address"),
  clientLogo: text("client_logo"), // URL or file path
  
  // Contractor information
  contractorName: varchar("contractor_name"),
  contractorContact: varchar("contractor_contact"),
  contractorEmail: varchar("contractor_email"),
  contractorPhone: varchar("contractor_phone"),
  
  // Project details
  location: varchar("location").notNull(),
  description: text("description"),
  scope: text("scope"),
  executiveSummary: text("executive_summary"),
  locationAndExtent: text("location_and_extent"),
  
  // Dates and timeline
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(), // kept for backward compatibility
  expectedCompletionDate: date("expected_completion_date"),
  duration: integer("duration"), // number value
  durationUnit: varchar("duration_unit").default("months"), // 'days' or 'months'
  defectsLiabilityPeriod: varchar("defects_liability_period"),
  
  // Financial
  contractAmount: varchar("contract_amount"),
  advancePayment: varchar("advance_payment"),
  
  // Status and progress
  status: varchar("status").default("active").notNull(), // 'active', 'completed', 'on-hold'
  progress: integer("progress").default(0), // overall percentage
  
  // Cover image/photo
  coverImage: text("cover_image"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roads table
export const roads = pgTable("roads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  length: decimal("length", { precision: 10, scale: 2 }).notNull(),
  roadType: varchar("road_type").notNull(),
  carriageway: varchar("carriageway").notNull().default("single"), // "single" or "dual"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Construction layers table
export const constructionLayers = pgTable("construction_layers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roadId: varchar("road_id").notNull(),
  name: varchar("name").notNull(),
  weight: integer("weight").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// Layer progress table
export const layerProgress = pgTable("layer_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  layerId: varchar("layer_id").notNull(),
  startChainage: decimal("start_chainage", { precision: 10, scale: 2 }).notNull(),
  endChainage: decimal("end_chainage", { precision: 10, scale: 2 }).notNull(),
  carriagewaySide: varchar("carriageway_side").default("both"), // "lhs", "rhs", or "both" for single carriageway
  completionDate: date("completion_date").notNull(),
  qualityStatus: varchar("quality_status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project members table (for team collaboration)
export const projectMembers = pgTable("project_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: varchar("role").notNull().default("viewer"), // "owner", "editor", or "viewer"
  addedBy: varchar("added_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_members_project_idx").on(table.projectId),
  index("project_members_user_idx").on(table.userId),
]);

// Project invitations table
export const projectInvitations = pgTable("project_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  invitedEmail: varchar("invited_email"),
  invitedUserId: varchar("invited_user_id"),
  invitedBy: varchar("invited_by").notNull(),
  role: varchar("role").notNull().default("viewer"), // "editor" or "viewer"
  status: varchar("status").notNull().default("pending"), // "pending", "accepted", "declined", "expired"
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("invitations_email_status_idx").on(table.invitedEmail, table.status),
  index("invitations_token_idx").on(table.token),
]);

// ==================== NEW TABLES FOR COMPREHENSIVE CONSTRUCTION MANAGEMENT ====================

// Issues and concerns table
export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  description: text("description").notNull(),
  status: varchar("status").default("outstanding").notNull(), // 'outstanding' or 'resolved'
  dateCaptured: date("date_captured").notNull(),
  resolvedDate: date("resolved_date"),
  comment: text("comment"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("issues_project_idx").on(table.projectId),
]);

// Client personnel table
export const clientPersonnel = pgTable("client_personnel", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  qualification: varchar("qualification"),
  designation: varchar("designation").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("client_personnel_project_idx").on(table.projectId),
]);

// Contractor personnel table
export const contractorPersonnel = pgTable("contractor_personnel", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  qualification: varchar("qualification"),
  designation: varchar("designation").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("contractor_personnel_project_idx").on(table.projectId),
]);

// Contractor equipment table
export const contractorEquipment = pgTable("contractor_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(),
  quantity: integer("quantity").notNull(),
  condition: varchar("condition").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("contractor_equipment_project_idx").on(table.projectId),
]);

// Payment certificates table
export const paymentCertificates = pgTable("payment_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  certificateNo: varchar("certificate_no").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dateCertified: date("date_certified"),
  dateSentToPCU: date("date_sent_to_pcu"),
  paymentDateStatus: varchar("payment_date_status"), // 'Paid', 'In Process', 'Pending', etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("payment_certificates_project_idx").on(table.projectId),
]);

// Work plans table
export const workPlans = pgTable("work_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  sourceBOQId: varchar("source_boq_id"), // if created from BOQ
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("work_plans_project_idx").on(table.projectId),
]);

// Planned activities table
export const plannedActivities = pgTable("planned_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workPlanId: varchar("work_plan_id"),
  projectId: varchar("project_id").notNull(), // for activities not in a work plan
  name: varchar("name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  duration: integer("duration").notNull(), // in days
  isMilestone: boolean("is_milestone").default(false).notNull(),
  progress: integer("progress").default(0).notNull(), // 0-100
  order: integer("order").default(0), // for sorting
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("planned_activities_work_plan_idx").on(table.workPlanId),
  index("planned_activities_project_idx").on(table.projectId),
]);

// BOQ (Bill of Quantities) table
export const boqs = pgTable("boqs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  createdDate: timestamp("created_date").defaultNow(),
  lastModified: timestamp("last_modified").defaultNow(),
}, (table) => [
  index("boqs_project_idx").on(table.projectId),
]);

// BOQ items table (sections, subsections, items, subtotals, grand totals)
export const boqItems = pgTable("boq_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  boqId: varchar("boq_id").notNull(),
  parentId: varchar("parent_id"), // for hierarchy (subsection parent is section, item parent is subsection)
  type: varchar("type").notNull(), // 'section', 'subsection', 'item', 'subtotal', 'grandtotal'
  no: varchar("no"), // item number (e.g., "1.1.1")
  description: text("description").notNull(),
  unit: varchar("unit"),
  qty: decimal("qty", { precision: 15, scale: 2 }),
  rate: decimal("rate", { precision: 15, scale: 2 }),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  order: integer("order").default(0), // for sorting
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("boq_items_boq_idx").on(table.boqId),
  index("boq_items_parent_idx").on(table.parentId),
]);

// Summary adjustments table (for BOQ-level and project-level summaries)
export const summaryAdjustments = pgTable("summary_adjustments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  boqId: varchar("boq_id"), // if belongs to specific BOQ
  projectId: varchar("project_id"), // if project-level adjustment
  type: varchar("type").notNull(), // 'tax', 'contingency', 'discount', 'subtotal', 'other'
  description: varchar("description").notNull(),
  unit: varchar("unit"),
  qty: decimal("qty", { precision: 15, scale: 2 }),
  rate: decimal("rate", { precision: 15, scale: 2 }),
  amount: decimal("amount", { precision: 15, scale: 2 }),
  isPercentage: boolean("is_percentage").default(false),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("summary_adjustments_boq_idx").on(table.boqId),
  index("summary_adjustments_project_idx").on(table.projectId),
]);

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  type: varchar("type").notNull(), // 'progress-report', 'taking-over-certificate', 'commencement-order', 'instruction-letter', 'meeting-minutes'
  name: varchar("name").notNull(),
  createdDate: timestamp("created_date").defaultNow(),
  savedAt: timestamp("saved_at"), // when the document was saved/finalized
  customContent: jsonb("custom_content"), // JSON data specific to document type
  projectSnapshot: jsonb("project_snapshot"), // snapshot of project data at save time
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("documents_project_idx").on(table.projectId),
  index("documents_type_idx").on(table.type),
]);

// Work accomplished entries (ordered list of completed work)
export const workAccomplished = pgTable("work_accomplished", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  description: text("description").notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("work_accomplished_project_idx").on(table.projectId),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  roads: many(roads),
  boqs: many(boqs),
  workPlans: many(workPlans),
  documents: many(documents),
  issues: many(issues),
  clientPersonnel: many(clientPersonnel),
  contractorPersonnel: many(contractorPersonnel),
  contractorEquipment: many(contractorEquipment),
  paymentCertificates: many(paymentCertificates),
  workAccomplished: many(workAccomplished),
}));

export const roadsRelations = relations(roads, ({ one, many }) => ({
  project: one(projects, {
    fields: [roads.projectId],
    references: [projects.id],
  }),
  layers: many(constructionLayers),
}));

export const constructionLayersRelations = relations(constructionLayers, ({ one, many }) => ({
  road: one(roads, {
    fields: [constructionLayers.roadId],
    references: [roads.id],
  }),
  progress: many(layerProgress),
}));

export const layerProgressRelations = relations(layerProgress, ({ one }) => ({
  layer: one(constructionLayers, {
    fields: [layerProgress.layerId],
    references: [constructionLayers.id],
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
  addedByUser: one(users, {
    fields: [projectMembers.addedBy],
    references: [users.id],
  }),
}));

export const projectInvitationsRelations = relations(projectInvitations, ({ one }) => ({
  project: one(projects, {
    fields: [projectInvitations.projectId],
    references: [projects.id],
  }),
  invitedByUser: one(users, {
    fields: [projectInvitations.invitedBy],
    references: [users.id],
  }),
}));

// New table relations
export const issuesRelations = relations(issues, ({ one }) => ({
  project: one(projects, {
    fields: [issues.projectId],
    references: [projects.id],
  }),
}));

export const clientPersonnelRelations = relations(clientPersonnel, ({ one }) => ({
  project: one(projects, {
    fields: [clientPersonnel.projectId],
    references: [projects.id],
  }),
}));

export const contractorPersonnelRelations = relations(contractorPersonnel, ({ one }) => ({
  project: one(projects, {
    fields: [contractorPersonnel.projectId],
    references: [projects.id],
  }),
}));

export const contractorEquipmentRelations = relations(contractorEquipment, ({ one }) => ({
  project: one(projects, {
    fields: [contractorEquipment.projectId],
    references: [projects.id],
  }),
}));

export const paymentCertificatesRelations = relations(paymentCertificates, ({ one }) => ({
  project: one(projects, {
    fields: [paymentCertificates.projectId],
    references: [projects.id],
  }),
}));

export const workPlansRelations = relations(workPlans, ({ one, many }) => ({
  project: one(projects, {
    fields: [workPlans.projectId],
    references: [projects.id],
  }),
  activities: many(plannedActivities),
  sourceBOQ: one(boqs, {
    fields: [workPlans.sourceBOQId],
    references: [boqs.id],
  }),
}));

export const plannedActivitiesRelations = relations(plannedActivities, ({ one }) => ({
  project: one(projects, {
    fields: [plannedActivities.projectId],
    references: [projects.id],
  }),
  workPlan: one(workPlans, {
    fields: [plannedActivities.workPlanId],
    references: [workPlans.id],
  }),
}));

export const boqsRelations = relations(boqs, ({ one, many }) => ({
  project: one(projects, {
    fields: [boqs.projectId],
    references: [projects.id],
  }),
  items: many(boqItems),
  adjustments: many(summaryAdjustments),
}));

export const boqItemsRelations = relations(boqItems, ({ one }) => ({
  boq: one(boqs, {
    fields: [boqItems.boqId],
    references: [boqs.id],
  }),
  parent: one(boqItems, {
    fields: [boqItems.parentId],
    references: [boqItems.id],
  }),
}));

export const summaryAdjustmentsRelations = relations(summaryAdjustments, ({ one }) => ({
  boq: one(boqs, {
    fields: [summaryAdjustments.boqId],
    references: [boqs.id],
  }),
  project: one(projects, {
    fields: [summaryAdjustments.projectId],
    references: [projects.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
}));

export const workAccomplishedRelations = relations(workAccomplished, ({ one }) => ({
  project: one(projects, {
    fields: [workAccomplished.projectId],
    references: [projects.id],
  }),
}));

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoadSchema = createInsertSchema(roads).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  length: z.coerce.number(),
});

export const insertLayerSchema = createInsertSchema(constructionLayers).omit({
  id: true,
  roadId: true,
  createdAt: true,
});

export const insertLayerProgressSchema = createInsertSchema(layerProgress).omit({
  id: true,
  layerId: true,
  createdAt: true,
}).extend({
  startChainage: z.coerce.number(),
  endChainage: z.coerce.number(),
});

// User schemas and types
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Team collaboration schemas
export const insertProjectMemberSchema = createInsertSchema(projectMembers).omit({
  id: true,
  createdAt: true,
});

export const insertProjectInvitationSchema = createInsertSchema(projectInvitations).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Road = typeof roads.$inferSelect;
export type InsertRoad = z.infer<typeof insertRoadSchema>;
export type ConstructionLayer = typeof constructionLayers.$inferSelect;
export type InsertLayer = z.infer<typeof insertLayerSchema>;
export type LayerProgress = typeof layerProgress.$inferSelect;
export type InsertLayerProgress = z.infer<typeof insertLayerProgressSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type InsertProjectMember = z.infer<typeof insertProjectMemberSchema>;
export type ProjectInvitation = typeof projectInvitations.$inferSelect;
export type InsertProjectInvitation = z.infer<typeof insertProjectInvitationSchema>;

// Extended types for frontend
export type ProjectWithRoads = Project & {
  roads: (Road & {
    layers: (ConstructionLayer & {
      progress: LayerProgress[];
    })[];
  })[];
};

export type ProjectMemberWithUser = ProjectMember & {
  user: User;
};

export type ProjectInvitationWithDetails = ProjectInvitation & {
  invitedByUser: User;
  project: Project;
};

// New table insert schemas
export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  projectId: true,
  createdAt: true,
});

export const insertClientPersonnelSchema = createInsertSchema(clientPersonnel).omit({
  id: true,
  projectId: true,
  createdAt: true,
});

export const insertContractorPersonnelSchema = createInsertSchema(contractorPersonnel).omit({
  id: true,
  projectId: true,
  createdAt: true,
});

export const insertContractorEquipmentSchema = createInsertSchema(contractorEquipment).omit({
  id: true,
  projectId: true,
  createdAt: true,
});

export const insertPaymentCertificateSchema = createInsertSchema(paymentCertificates).omit({
  id: true,
  projectId: true,
  createdAt: true,
});

export const insertWorkPlanSchema = createInsertSchema(workPlans).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlannedActivitySchema = createInsertSchema(plannedActivities).omit({
  id: true,
  createdAt: true,
});

export const insertBOQSchema = createInsertSchema(boqs).omit({
  id: true,
  projectId: true,
  createdDate: true,
  lastModified: true,
});

export const insertBOQItemSchema = createInsertSchema(boqItems).omit({
  id: true,
  boqId: true,
  createdAt: true,
});

export const insertSummaryAdjustmentSchema = createInsertSchema(summaryAdjustments).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  projectId: true,
  createdDate: true,
  createdAt: true,
});

export const insertWorkAccomplishedSchema = createInsertSchema(workAccomplished).omit({
  id: true,
  projectId: true,
  createdAt: true,
});

// New table types
export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;

export type ClientPersonnel = typeof clientPersonnel.$inferSelect;
export type InsertClientPersonnel = z.infer<typeof insertClientPersonnelSchema>;

export type ContractorPersonnel = typeof contractorPersonnel.$inferSelect;
export type InsertContractorPersonnel = z.infer<typeof insertContractorPersonnelSchema>;

export type ContractorEquipment = typeof contractorEquipment.$inferSelect;
export type InsertContractorEquipment = z.infer<typeof insertContractorEquipmentSchema>;

export type PaymentCertificate = typeof paymentCertificates.$inferSelect;
export type InsertPaymentCertificate = z.infer<typeof insertPaymentCertificateSchema>;

export type WorkPlan = typeof workPlans.$inferSelect;
export type InsertWorkPlan = z.infer<typeof insertWorkPlanSchema>;

export type PlannedActivity = typeof plannedActivities.$inferSelect;
export type InsertPlannedActivity = z.infer<typeof insertPlannedActivitySchema>;

export type BOQ = typeof boqs.$inferSelect;
export type InsertBOQ = z.infer<typeof insertBOQSchema>;

export type BOQItem = typeof boqItems.$inferSelect;
export type InsertBOQItem = z.infer<typeof insertBOQItemSchema>;

export type SummaryAdjustment = typeof summaryAdjustments.$inferSelect;
export type InsertSummaryAdjustment = z.infer<typeof insertSummaryAdjustmentSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type WorkAccomplished = typeof workAccomplished.$inferSelect;
export type InsertWorkAccomplished = z.infer<typeof insertWorkAccomplishedSchema>;
