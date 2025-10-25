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
  
  // Project scope
  scopeOfWork: text("scope_of_work"),
  
  // Client logo (file path)
  clientLogo: varchar("client_logo"),
  
  // Financial tracking
  advancePayment: decimal("advance_payment", { precision: 15, scale: 2 }).default("0"),
  
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

export type ProjectMemberWithUser = ProjectMember & {
  user: User;
};

export type ProjectInvitationWithDetails = ProjectInvitation & {
  invitedByUser: User;
  project: Project;
};
