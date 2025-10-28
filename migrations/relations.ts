import { relations } from "drizzle-orm/relations";
import { projects, workPlanActivities } from "./schema";

export const workPlanActivitiesRelations = relations(workPlanActivities, ({one}) => ({
	project: one(projects, {
		fields: [workPlanActivities.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	workPlanActivities: many(workPlanActivities),
}));