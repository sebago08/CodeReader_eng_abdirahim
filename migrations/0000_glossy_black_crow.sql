-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "construction_layers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"road_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "layer_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layer_id" varchar NOT NULL,
	"start_chainage" numeric(10, 2) NOT NULL,
	"end_chainage" numeric(10, 2) NOT NULL,
	"carriageway_side" varchar DEFAULT 'both',
	"completion_date" date NOT NULL,
	"quality_status" varchar NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"length" numeric(10, 2) NOT NULL,
	"road_type" varchar NOT NULL,
	"carriageway" varchar DEFAULT 'single' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_certificates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"certificate_no" varchar NOT NULL,
	"pending_amount" numeric(15, 2) DEFAULT '0',
	"in_process_amount" numeric(15, 2) DEFAULT '0',
	"amount_paid" numeric(15, 2) DEFAULT '0',
	"date_certified" date,
	"payment_status" varchar DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"username" varchar NOT NULL,
	"password" varchar NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_key" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"client" varchar NOT NULL,
	"location" varchar NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"project_type" varchar DEFAULT 'Road' NOT NULL,
	"status" varchar DEFAULT 'Active' NOT NULL,
	"total_budget" numeric(15, 2),
	"spent_amount" numeric(15, 2) DEFAULT '0',
	"project_number" varchar,
	"contract_amount" numeric(15, 2),
	"duration" integer,
	"defects_liability_period" integer,
	"client_contact_person" varchar,
	"client_email" varchar,
	"client_phone" varchar,
	"client_address" text,
	"contractor_name" varchar,
	"contractor_contact_person" varchar,
	"contractor_email" varchar,
	"contractor_phone" varchar,
	"scope_of_work" text,
	"client_logo" varchar,
	"advance_payment" numeric(15, 2) DEFAULT '0',
	"executive_summary" text,
	"project_location" text,
	"contractor_logo" varchar
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'viewer' NOT NULL,
	"added_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "project_members_project_id_user_id_key" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "project_invitations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"invited_email" varchar,
	"invited_user_id" varchar,
	"invited_by" varchar NOT NULL,
	"role" varchar DEFAULT 'viewer' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "project_invitations_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"document_type" varchar NOT NULL,
	"document_name" varchar NOT NULL,
	"project_snapshot" jsonb NOT NULL,
	"custom_content" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_plan_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"activity_name" varchar NOT NULL,
	"start_date" date,
	"duration" integer,
	"end_date" date,
	"is_milestone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"item_type" varchar DEFAULT 'activity' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"work_plan_id" varchar
);
--> statement-breakpoint
CREATE TABLE "progress_trackers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"work_plan_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress_tracker_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"progress_tracker_id" varchar NOT NULL,
	"project_id" varchar NOT NULL,
	"activity_id" varchar,
	"item_type" varchar DEFAULT 'activity' NOT NULL,
	"description" varchar NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"qty_in_boq" numeric(15, 2) DEFAULT '0',
	"qty_done" numeric(15, 2) DEFAULT '0',
	"weighted_ratio" numeric(10, 4) DEFAULT '1',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "safety_incidents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"incident_date" date NOT NULL,
	"description" text NOT NULL,
	"severity" varchar NOT NULL,
	"status" varchar DEFAULT 'Open' NOT NULL,
	"reported_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_personnel" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"qualification" varchar,
	"designation" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractor_personnel" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"qualification" varchar,
	"designation" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractor_equipment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar NOT NULL,
	"equipment_name" varchar NOT NULL,
	"type" varchar,
	"quantity" integer DEFAULT 1,
	"condition" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "work_plan_activities" ADD CONSTRAINT "work_plan_activities_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "payment_certificates_project_idx" ON "payment_certificates" USING btree ("project_id" text_ops);--> statement-breakpoint
CREATE INDEX "project_members_project_idx" ON "project_members" USING btree ("project_id" text_ops);--> statement-breakpoint
CREATE INDEX "project_members_user_idx" ON "project_members" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "invitations_email_status_idx" ON "project_invitations" USING btree ("invited_email" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "invitations_token_idx" ON "project_invitations" USING btree ("token" text_ops);--> statement-breakpoint
CREATE INDEX "project_documents_project_idx" ON "project_documents" USING btree ("project_id" text_ops);--> statement-breakpoint
CREATE INDEX "project_documents_type_idx" ON "project_documents" USING btree ("document_type" text_ops);--> statement-breakpoint
CREATE INDEX "work_plans_project_idx" ON "work_plans" USING btree ("project_id" text_ops);--> statement-breakpoint
CREATE INDEX "work_plan_activities_work_plan_idx" ON "work_plan_activities" USING btree ("work_plan_id" text_ops);--> statement-breakpoint
CREATE INDEX "progress_trackers_project_idx" ON "progress_trackers" USING btree ("project_id" text_ops);--> statement-breakpoint
CREATE INDEX "progress_trackers_work_plan_idx" ON "progress_trackers" USING btree ("work_plan_id" text_ops);--> statement-breakpoint
CREATE INDEX "progress_tracker_items_project_idx" ON "progress_tracker_items" USING btree ("project_id" text_ops);--> statement-breakpoint
CREATE INDEX "progress_tracker_items_tracker_idx" ON "progress_tracker_items" USING btree ("progress_tracker_id" text_ops);--> statement-breakpoint
CREATE INDEX "client_personnel_project_idx" ON "client_personnel" USING btree ("project_id" text_ops);--> statement-breakpoint
CREATE INDEX "contractor_personnel_project_idx" ON "contractor_personnel" USING btree ("project_id" text_ops);--> statement-breakpoint
CREATE INDEX "contractor_equipment_project_idx" ON "contractor_equipment" USING btree ("project_id" text_ops);
*/