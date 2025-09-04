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

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  client: varchar("client").notNull(),
  location: varchar("location").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
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
  completionDate: date("completion_date").notNull(),
  qualityStatus: varchar("quality_status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Road = typeof roads.$inferSelect;
export type InsertRoad = z.infer<typeof insertRoadSchema>;
export type ConstructionLayer = typeof constructionLayers.$inferSelect;
export type InsertLayer = z.infer<typeof insertLayerSchema>;
export type LayerProgress = typeof layerProgress.$inferSelect;
export type InsertLayerProgress = z.infer<typeof insertLayerProgressSchema>;

// Extended types for frontend
export type ProjectWithRoads = Project & {
  roads: (Road & {
    layers: (ConstructionLayer & {
      progress: LayerProgress[];
    })[];
  })[];
};
