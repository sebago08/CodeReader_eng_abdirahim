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
  unique,
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
  authId: varchar("auth_id").unique(), // Supabase Auth user ID
  username: varchar("username").notNull().unique(),
  password: varchar("password"), // Nullable for OAuth/Supabase Auth support
  email: varchar("email").notNull().unique(), // Primary identifier
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isApproved: boolean("is_approved").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  projectNumber: varchar("project_number"),
  projectType: varchar("project_type").notNull().default("Road"), // "Road", "Building", "Infrastructure", etc.
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  description: text("description"),
  status: varchar("status").notNull().default("Active"), // "Active", "Completed", "On Hold"
  totalBudget: decimal("total_budget", { precision: 15, scale: 2 }),
  spentAmount: decimal("spent_amount", { precision: 15, scale: 2 }).default("0"),
  contractAmount: decimal("contract_amount", { precision: 15, scale: 2 }),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  duration: integer("duration"), // Duration in months
  defectsLiabilityPeriod: integer("defects_liability_period"), // In months
  
  // Client details
  clientContactPerson: varchar("client_contact_person"),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  clientAddress: text("client_address"),
  
  // Contractor details
  contractorName: varchar("contractor_name"),
  contractorContactPerson: varchar("contractor_contact_person"),
  contractorEmail: varchar("contractor_email"),
  contractorPhone: varchar("contractor_phone"),
  
  // Introduction/Report sections
  executiveSummary: text("executive_summary"),
  projectLocation: text("project_location"), // Detailed location description
  scopeOfWork: text("scope_of_work"),
  
  // Logos (file paths)
  clientLogo: varchar("client_logo"),
  contractorLogo: varchar("contractor_logo"),
  
  // Financial tracking
  advancePayment: decimal("advance_payment", { precision: 15, scale: 2 }).default("0"),
  
  // Dashboard customization
  dashboardLayout: jsonb("dashboard_layout"),
  
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

// Activities table (standard progress tracker for all project types)
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  progress: integer("progress").notNull().default(0), // 0-100 percentage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Safety incidents table (project-level safety tracking)
export const safetyIncidents = pgTable("safety_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  incidentDate: date("incident_date").notNull(),
  description: text("description").notNull(),
  severity: varchar("severity").notNull(), // "Low", "Medium", "High", "Critical"
  status: varchar("status").notNull().default("Open"), // "Open", "Under Investigation", "Resolved", "Closed"
  reportedBy: varchar("reported_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client personnel table
export const clientPersonnel = pgTable("client_personnel", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  qualification: varchar("qualification"),
  designation: varchar("designation"),
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
  designation: varchar("designation"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("contractor_personnel_project_idx").on(table.projectId),
]);

// Contractor equipment table
export const contractorEquipment = pgTable("contractor_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  equipmentName: varchar("equipment_name").notNull(),
  type: varchar("type"),
  quantity: integer("quantity").default(1),
  condition: varchar("condition"), // "Excellent", "Good", "Fair", "Poor"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("contractor_equipment_project_idx").on(table.projectId),
]);

// Payment certificates table (financial tracking)
export const paymentCertificates = pgTable("payment_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  certificateNo: varchar("certificate_no").notNull(),
  pendingAmount: decimal("pending_amount", { precision: 15, scale: 2 }).default("0"),
  inProcessAmount: decimal("in_process_amount", { precision: 15, scale: 2 }).default("0"),
  amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default("0"),
  dateCertified: date("date_certified"),
  paymentStatus: varchar("payment_status").notNull().default("Pending"), // "Pending", "In Process", "Paid"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("payment_certificates_project_idx").on(table.projectId),
]);

// Work plans table (multiple work plans per project)
export const workPlans = pgTable("work_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  startDate: date("start_date"),
  status: varchar("status").notNull().default("Not Started"), // "Not Started", "In Progress", "Completed", "Blocked"
  ownerId: varchar("owner_id"), // User who owns/manages this work plan
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("work_plans_project_idx").on(table.projectId),
  index("work_plans_owner_idx").on(table.ownerId),
]);

// Work plan activities table (project schedule and planning)
export const workPlanActivities = pgTable("work_plan_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  workPlanId: varchar("work_plan_id"), // Foreign key to work_plans, nullable for backward compatibility
  itemType: varchar("item_type").notNull().default("activity"), // "activity" or "section"
  activityName: varchar("activity_name").notNull(),
  startDate: date("start_date"), // Nullable for section headers
  duration: integer("duration"), // Nullable for section headers (duration in days)
  endDate: date("end_date"), // Nullable for section headers (calculated: startDate + duration)
  isMilestone: boolean("is_milestone").default(false).notNull(),
  orderIndex: integer("order_index").default(0).notNull(), // For manual ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("work_plan_activities_project_idx").on(table.projectId),
  index("work_plan_activities_work_plan_idx").on(table.workPlanId),
]);

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

// Project documents table (for generated documents like progress reports, certificates, etc.)
export const projectDocuments = pgTable("project_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  userId: varchar("user_id").notNull(), // User who created the document
  documentType: varchar("document_type").notNull(), // "progress-report", "taking-over-certificate", etc.
  documentName: varchar("document_name").notNull(),
  projectSnapshot: jsonb("project_snapshot").notNull(), // Frozen project data at time of creation
  customContent: jsonb("custom_content"), // Editable fields (meeting notes, instruction content, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("project_documents_project_idx").on(table.projectId),
  index("project_documents_type_idx").on(table.documentType),
]);

// Progress trackers table (BOQ-based progress tracking from work plans)
export const progressTrackers = pgTable("progress_trackers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  workPlanId: varchar("work_plan_id"), // Work plan used to generate tracker
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("progress_trackers_project_idx").on(table.projectId),
  index("progress_trackers_work_plan_idx").on(table.workPlanId),
]);

// Progress tracker items table (individual line items in the tracker)
export const progressTrackerItems = pgTable("progress_tracker_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  progressTrackerId: varchar("progress_tracker_id").notNull(),
  projectId: varchar("project_id").notNull(),
  activityId: varchar("activity_id"), // Reference to original work plan activity
  itemType: varchar("item_type").notNull().default("activity"), // "activity" or "section"
  description: varchar("description").notNull(), // From work plan activity name
  orderIndex: integer("order_index").default(0).notNull(),
  qtyInBoq: decimal("qty_in_boq", { precision: 15, scale: 2 }).default("0"), // Quantity in Bill of Quantities
  qtyDone: decimal("qty_done", { precision: 15, scale: 2 }).default("0"), // Quantity completed
  weightedRatio: decimal("weighted_ratio", { precision: 10, scale: 4 }).default("1"), // Weight for progress calculation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("progress_tracker_items_tracker_idx").on(table.progressTrackerId),
  index("progress_tracker_items_project_idx").on(table.projectId),
]);

// Pre-commencement checklist items table
export const preCommencementItems = pgTable("pre_commencement_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  itemName: varchar("item_name").notNull(),
  status: varchar("status").notNull().default("pending"), // "pending", "submitted", "approved", "rejected", "expired"
  deadline: date("deadline"),
  dateSubmitted: date("date_submitted"),
  responsibleParty: varchar("responsible_party"),
  notes: text("notes"),
  fileUrl: varchar("file_url"),
  isDefault: boolean("is_default").default(true).notNull(), // true if from default template
  orderIndex: integer("order_index").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pre_commencement_items_project_idx").on(table.projectId),
  index("pre_commencement_items_status_idx").on(table.status),
]);

// Daily logs table (one per project per day)
export const dailyLogs = pgTable("daily_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  date: date("date").notNull(),
  weather: varchar("weather"),
  workSummary: text("work_summary"),
  issues: text("issues"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("daily_logs_project_idx").on(table.projectId),
  index("daily_logs_date_idx").on(table.date),
  unique("daily_logs_project_date_unique").on(table.projectId, table.date),
]);

// Action points table (linked to daily logs and projects)
export const actionPoints = pgTable("action_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dailyLogId: varchar("daily_log_id"), // Optional - can be standalone or linked to a log
  projectId: varchar("project_id").notNull(),
  description: text("description").notNull(),
  assignedTo: varchar("assigned_to"),
  priority: varchar("priority").notNull().default("medium"), // "low", "medium", "high"
  status: varchar("status").notNull().default("open"), // "open", "completed"
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("action_points_daily_log_idx").on(table.dailyLogId),
  index("action_points_project_idx").on(table.projectId),
  index("action_points_status_idx").on(table.status),
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
  activities: many(activities),
  safetyIncidents: many(safetyIncidents),
  clientPersonnel: many(clientPersonnel),
  contractorPersonnel: many(contractorPersonnel),
  contractorEquipment: many(contractorEquipment),
  paymentCertificates: many(paymentCertificates),
  preCommencementItems: many(preCommencementItems),
  dailyLogs: many(dailyLogs),
  actionPoints: many(actionPoints),
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

export const activitiesRelations = relations(activities, ({ one }) => ({
  project: one(projects, {
    fields: [activities.projectId],
    references: [projects.id],
  }),
}));

export const safetyIncidentsRelations = relations(safetyIncidents, ({ one }) => ({
  project: one(projects, {
    fields: [safetyIncidents.projectId],
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
  owner: one(users, {
    fields: [workPlans.ownerId],
    references: [users.id],
  }),
  activities: many(workPlanActivities),
}));

export const workPlanActivitiesRelations = relations(workPlanActivities, ({ one }) => ({
  project: one(projects, {
    fields: [workPlanActivities.projectId],
    references: [projects.id],
  }),
  workPlan: one(workPlans, {
    fields: [workPlanActivities.workPlanId],
    references: [workPlans.id],
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

export const projectDocumentsRelations = relations(projectDocuments, ({ one }) => ({
  project: one(projects, {
    fields: [projectDocuments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectDocuments.userId],
    references: [users.id],
  }),
}));

export const progressTrackersRelations = relations(progressTrackers, ({ one, many }) => ({
  project: one(projects, {
    fields: [progressTrackers.projectId],
    references: [projects.id],
  }),
  workPlan: one(workPlans, {
    fields: [progressTrackers.workPlanId],
    references: [workPlans.id],
  }),
  items: many(progressTrackerItems),
}));

export const progressTrackerItemsRelations = relations(progressTrackerItems, ({ one }) => ({
  progressTracker: one(progressTrackers, {
    fields: [progressTrackerItems.progressTrackerId],
    references: [progressTrackers.id],
  }),
  project: one(projects, {
    fields: [progressTrackerItems.projectId],
    references: [projects.id],
  }),
  activity: one(workPlanActivities, {
    fields: [progressTrackerItems.activityId],
    references: [workPlanActivities.id],
  }),
}));

export const preCommencementItemsRelations = relations(preCommencementItems, ({ one }) => ({
  project: one(projects, {
    fields: [preCommencementItems.projectId],
    references: [projects.id],
  }),
}));

export const dailyLogsRelations = relations(dailyLogs, ({ one, many }) => ({
  project: one(projects, {
    fields: [dailyLogs.projectId],
    references: [projects.id],
  }),
  actionPoints: many(actionPoints),
}));

export const actionPointsRelations = relations(actionPoints, ({ one }) => ({
  project: one(projects, {
    fields: [actionPoints.projectId],
    references: [projects.id],
  }),
  dailyLog: one(dailyLogs, {
    fields: [actionPoints.dailyLogId],
    references: [dailyLogs.id],
  }),
}));

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  contractAmount: z.coerce.string().optional(),
  totalBudget: z.coerce.string().optional(),
  spentAmount: z.coerce.string().optional(),
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

// Activity and safety incident schemas
export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSafetyIncidentSchema = createInsertSchema(safetyIncidents).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
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
  updatedAt: true,
});

export const insertWorkPlanSchema = createInsertSchema(workPlans).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkPlanActivitySchema = createInsertSchema(workPlanActivities).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  itemType: z.enum(["activity", "section"]).default("activity"),
  startDate: z.string().optional(),
  duration: z.coerce.number().int().min(1, "Duration must be at least 1 day").optional(),
  endDate: z.string().optional(),
  orderIndex: z.coerce.number().int().default(0),
});

export const insertProjectDocumentSchema = createInsertSchema(projectDocuments).omit({
  id: true,
  projectId: true,
  userId: true,
  createdAt: true,
});

export const insertProgressTrackerSchema = createInsertSchema(progressTrackers).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProgressTrackerItemSchema = createInsertSchema(progressTrackerItems).omit({
  id: true,
  projectId: true,
  progressTrackerId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  qtyInBoq: z.coerce.number().default(0),
  qtyDone: z.coerce.number().default(0),
  weightedRatio: z.coerce.number().default(1),
  orderIndex: z.coerce.number().int().default(0),
});

export const insertPreCommencementItemSchema = createInsertSchema(preCommencementItems).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["pending", "submitted", "approved", "rejected", "expired"]).default("pending"),
  orderIndex: z.coerce.number().int().default(0),
});

export const insertDailyLogSchema = createInsertSchema(dailyLogs).omit({
  id: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActionPointSchema = createInsertSchema(actionPoints).omit({
  id: true,
  dailyLogId: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["open", "completed"]).default("open"),
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
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type SafetyIncident = typeof safetyIncidents.$inferSelect;
export type InsertSafetyIncident = z.infer<typeof insertSafetyIncidentSchema>;
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
export type WorkPlanActivity = typeof workPlanActivities.$inferSelect;
export type InsertWorkPlanActivity = z.infer<typeof insertWorkPlanActivitySchema>;

export type ProjectMemberWithUser = ProjectMember & {
  user: User;
};

export type ProjectInvitationWithDetails = ProjectInvitation & {
  invitedByUser: User;
  project: Project;
};

export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type InsertProjectDocument = z.infer<typeof insertProjectDocumentSchema>;

export type ProgressTracker = typeof progressTrackers.$inferSelect;
export type InsertProgressTracker = z.infer<typeof insertProgressTrackerSchema>;
export type ProgressTrackerItem = typeof progressTrackerItems.$inferSelect;
export type InsertProgressTrackerItem = z.infer<typeof insertProgressTrackerItemSchema>;

export type ProgressTrackerWithItems = ProgressTracker & {
  items: ProgressTrackerItem[];
};

export type PreCommencementItem = typeof preCommencementItems.$inferSelect;
export type InsertPreCommencementItem = z.infer<typeof insertPreCommencementItemSchema>;

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type ActionPoint = typeof actionPoints.$inferSelect;
export type InsertActionPoint = z.infer<typeof insertActionPointSchema>;

export type DailyLogWithActionPoints = DailyLog & {
  actionPoints: ActionPoint[];
};

// Document type enum
export type DocumentType = 
  | "progress-report" 
  | "taking-over-certificate" 
  | "commencement-order" 
  | "instruction-letter" 
  | "meeting-minutes";

// Dashboard metrics type
export type DashboardMetrics = {
  // Financial metrics
  financialTotal: number; // Total budget for all active projects
  amountSpent: number; // Total expenditure across all projects
  currentBalance: number; // Remaining funds available
  
  // Status metrics
  projectsBehindSchedule: number;
  criticalSafetyIssues: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  upcomingMilestones: number; // Milestones due in next 30 days
  
  // Active projects summary
  activeProjects: {
    id: string;
    name: string;
    status: string;
    financialProgress: number;
    timeProgress: number;
    physicalProgress: number;
    dueDate: string | null;
  }[];
};

// Project alerts type (for individual project overview)
export type ProjectAlerts = {
  milestones: {
    upcoming: {
      id: string;
      activityName: string;
      dueDate: string;
      daysUntil: number;
    }[];
    overdue: {
      id: string;
      activityName: string;
      dueDate: string;
      daysOverdue: number;
    }[];
  };
  actionPoints: {
    id: string;
    description: string;
    assignedTo: string | null;
    priority: string;
    dueDate: string;
    daysOverdue: number;
  }[];
  criticalIssues: {
    id: string;
    description: string;
    severity: string;
    dateOccurred: string;
    daysOpen: number;
  }[];
};
