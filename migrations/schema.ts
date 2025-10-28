import { pgTable, varchar, integer, timestamp, numeric, date, text, index, jsonb, unique, boolean, foreignKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const constructionLayers = pgTable("construction_layers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	roadId: varchar("road_id").notNull(),
	name: varchar().notNull(),
	weight: integer().default(1),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const layerProgress = pgTable("layer_progress", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	layerId: varchar("layer_id").notNull(),
	startChainage: numeric("start_chainage", { precision: 10, scale:  2 }).notNull(),
	endChainage: numeric("end_chainage", { precision: 10, scale:  2 }).notNull(),
	carriagewaySide: varchar("carriageway_side").default('both'),
	completionDate: date("completion_date").notNull(),
	qualityStatus: varchar("quality_status").notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const roads = pgTable("roads", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	name: varchar().notNull(),
	length: numeric({ precision: 10, scale:  2 }).notNull(),
	roadType: varchar("road_type").notNull(),
	carriageway: varchar().default('single').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const paymentCertificates = pgTable("payment_certificates", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	certificateNo: varchar("certificate_no").notNull(),
	pendingAmount: numeric("pending_amount", { precision: 15, scale:  2 }).default('0'),
	inProcessAmount: numeric("in_process_amount", { precision: 15, scale:  2 }).default('0'),
	amountPaid: numeric("amount_paid", { precision: 15, scale:  2 }).default('0'),
	dateCertified: date("date_certified"),
	paymentStatus: varchar("payment_status").default('Pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("payment_certificates_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	email: varchar().notNull(),
	firstName: varchar("first_name"),
	lastName: varchar("last_name"),
	profileImageUrl: varchar("profile_image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	username: varchar().notNull(),
	password: varchar().notNull(),
	isAdmin: boolean("is_admin").default(false).notNull(),
	isApproved: boolean("is_approved").default(false).notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
	unique("users_username_key").on(table.username),
]);

export const projects = pgTable("projects", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	name: varchar().notNull(),
	client: varchar().notNull(),
	location: varchar().notNull(),
	description: text(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	projectType: varchar("project_type").default('Road').notNull(),
	status: varchar().default('Active').notNull(),
	totalBudget: numeric("total_budget", { precision: 15, scale:  2 }),
	spentAmount: numeric("spent_amount", { precision: 15, scale:  2 }).default('0'),
	projectNumber: varchar("project_number"),
	contractAmount: numeric("contract_amount", { precision: 15, scale:  2 }),
	duration: integer(),
	defectsLiabilityPeriod: integer("defects_liability_period"),
	clientContactPerson: varchar("client_contact_person"),
	clientEmail: varchar("client_email"),
	clientPhone: varchar("client_phone"),
	clientAddress: text("client_address"),
	contractorName: varchar("contractor_name"),
	contractorContactPerson: varchar("contractor_contact_person"),
	contractorEmail: varchar("contractor_email"),
	contractorPhone: varchar("contractor_phone"),
	scopeOfWork: text("scope_of_work"),
	clientLogo: varchar("client_logo"),
	advancePayment: numeric("advance_payment", { precision: 15, scale:  2 }).default('0'),
	executiveSummary: text("executive_summary"),
	projectLocation: text("project_location"),
	contractorLogo: varchar("contractor_logo"),
});

export const projectMembers = pgTable("project_members", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	userId: varchar("user_id").notNull(),
	role: varchar().default('viewer').notNull(),
	addedBy: varchar("added_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("project_members_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("project_members_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("project_members_project_id_user_id_key").on(table.projectId, table.userId),
]);

export const projectInvitations = pgTable("project_invitations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	invitedEmail: varchar("invited_email"),
	invitedUserId: varchar("invited_user_id"),
	invitedBy: varchar("invited_by").notNull(),
	role: varchar().default('viewer').notNull(),
	status: varchar().default('pending').notNull(),
	token: varchar().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("invitations_email_status_idx").using("btree", table.invitedEmail.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("invitations_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	unique("project_invitations_token_key").on(table.token),
]);

export const projectDocuments = pgTable("project_documents", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	userId: varchar("user_id").notNull(),
	documentType: varchar("document_type").notNull(),
	documentName: varchar("document_name").notNull(),
	projectSnapshot: jsonb("project_snapshot").notNull(),
	customContent: jsonb("custom_content"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("project_documents_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("project_documents_type_idx").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
]);

export const workPlans = pgTable("work_plans", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	name: varchar().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("work_plans_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
]);

export const workPlanActivities = pgTable("work_plan_activities", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	activityName: varchar("activity_name").notNull(),
	startDate: date("start_date"),
	duration: integer(),
	endDate: date("end_date"),
	isMilestone: boolean("is_milestone").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	itemType: varchar("item_type").default('activity').notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	workPlanId: varchar("work_plan_id"),
}, (table) => [
	index("work_plan_activities_work_plan_idx").using("btree", table.workPlanId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "work_plan_activities_project_id_fkey"
		}).onDelete("cascade"),
]);

export const progressTrackers = pgTable("progress_trackers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	workPlanId: varchar("work_plan_id"),
	name: varchar().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("progress_trackers_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("progress_trackers_work_plan_idx").using("btree", table.workPlanId.asc().nullsLast().op("text_ops")),
]);

export const activities = pgTable("activities", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	name: varchar().notNull(),
	progress: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const progressTrackerItems = pgTable("progress_tracker_items", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	progressTrackerId: varchar("progress_tracker_id").notNull(),
	projectId: varchar("project_id").notNull(),
	activityId: varchar("activity_id"),
	itemType: varchar("item_type").default('activity').notNull(),
	description: varchar().notNull(),
	orderIndex: integer("order_index").default(0).notNull(),
	qtyInBoq: numeric("qty_in_boq", { precision: 15, scale:  2 }).default('0'),
	qtyDone: numeric("qty_done", { precision: 15, scale:  2 }).default('0'),
	weightedRatio: numeric("weighted_ratio", { precision: 10, scale:  4 }).default('1'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("progress_tracker_items_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("progress_tracker_items_tracker_idx").using("btree", table.progressTrackerId.asc().nullsLast().op("text_ops")),
]);

export const safetyIncidents = pgTable("safety_incidents", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	incidentDate: date("incident_date").notNull(),
	description: text().notNull(),
	severity: varchar().notNull(),
	status: varchar().default('Open').notNull(),
	reportedBy: varchar("reported_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const clientPersonnel = pgTable("client_personnel", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	name: varchar().notNull(),
	qualification: varchar(),
	designation: varchar(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("client_personnel_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
]);

export const contractorPersonnel = pgTable("contractor_personnel", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	name: varchar().notNull(),
	qualification: varchar(),
	designation: varchar(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("contractor_personnel_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
]);

export const contractorEquipment = pgTable("contractor_equipment", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	projectId: varchar("project_id").notNull(),
	equipmentName: varchar("equipment_name").notNull(),
	type: varchar(),
	quantity: integer().default(1),
	condition: varchar(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("contractor_equipment_project_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
]);
