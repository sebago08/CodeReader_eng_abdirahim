import {
  users,
  projects,
  roads,
  constructionLayers,
  layerProgress,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Road,
  type InsertRoad,
  type ConstructionLayer,
  type InsertLayer,
  type LayerProgress,
  type InsertLayerProgress,
  type ProjectWithRoads,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Project operations
  getProjects(userId: string): Promise<ProjectWithRoads[]>;
  getProject(id: string, userId: string): Promise<ProjectWithRoads | undefined>;
  createProject(userId: string, project: InsertProject): Promise<Project>;
  updateProject(id: string, userId: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string, userId: string): Promise<void>;
  
  // Road operations
  createRoad(projectId: string, road: InsertRoad): Promise<Road>;
  updateRoad(id: string, road: Partial<InsertRoad>): Promise<Road>;
  deleteRoad(id: string): Promise<void>;
  
  // Layer operations
  createLayers(roadId: string, layers: InsertLayer[]): Promise<ConstructionLayer[]>;
  updateLayer(id: string, layer: Partial<InsertLayer>): Promise<ConstructionLayer>;
  deleteLayer(id: string): Promise<void>;
  
  // Progress operations
  createLayerProgress(layerId: string, progress: InsertLayerProgress): Promise<LayerProgress>;
  updateLayerProgress(id: string, progress: Partial<InsertLayerProgress>): Promise<LayerProgress>;
  deleteLayerProgress(id: string): Promise<void>;
  resetLayerProgress(layerId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Project operations
  async getProjects(userId: string): Promise<ProjectWithRoads[]> {
    const projectsData = await db.query.projects.findMany({
      where: eq(projects.userId, userId),
      with: {
        roads: {
          with: {
            layers: {
              with: {
                progress: true,
              },
            },
          },
        },
      },
      orderBy: [desc(projects.createdAt)],
    });
    
    return projectsData as ProjectWithRoads[];
  }

  async getProject(id: string, userId: string): Promise<ProjectWithRoads | undefined> {
    const [project] = await db.query.projects.findMany({
      where: and(eq(projects.id, id), eq(projects.userId, userId)),
      with: {
        roads: {
          with: {
            layers: {
              with: {
                progress: true,
              },
            },
          },
        },
      },
    });
    
    return project as ProjectWithRoads | undefined;
  }

  async createProject(userId: string, project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values({ ...project, userId })
      .returning();
    return newProject;
  }

  async updateProject(id: string, userId: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId)));
  }

  // Road operations
  async createRoad(projectId: string, road: InsertRoad): Promise<Road> {
    const [newRoad] = await db
      .insert(roads)
      .values({ ...road, projectId, length: road.length.toString() })
      .returning();
    return newRoad;
  }

  async updateRoad(id: string, road: Partial<InsertRoad>): Promise<Road> {
    const roadUpdate: any = { ...road, updatedAt: new Date() };
    if (road.length !== undefined) {
      roadUpdate.length = road.length.toString();
    }
    const [updatedRoad] = await db
      .update(roads)
      .set(roadUpdate)
      .where(eq(roads.id, id))
      .returning();
    return updatedRoad;
  }

  async deleteRoad(id: string): Promise<void> {
    await db.delete(roads).where(eq(roads.id, id));
  }

  // Layer operations
  async createLayers(roadId: string, layers: InsertLayer[]): Promise<ConstructionLayer[]> {
    if (layers.length === 0) return [];
    
    const newLayers = await db
      .insert(constructionLayers)
      .values(layers.map(layer => ({ ...layer, roadId })))
      .returning();
    return newLayers;
  }

  async updateLayer(id: string, layer: Partial<InsertLayer>): Promise<ConstructionLayer> {
    const [updatedLayer] = await db
      .update(constructionLayers)
      .set(layer)
      .where(eq(constructionLayers.id, id))
      .returning();
    return updatedLayer;
  }

  async deleteLayer(id: string): Promise<void> {
    await db.delete(constructionLayers).where(eq(constructionLayers.id, id));
  }

  // Progress operations
  async createLayerProgress(layerId: string, progress: InsertLayerProgress): Promise<LayerProgress> {
    const [newProgress] = await db
      .insert(layerProgress)
      .values({ 
        ...progress, 
        layerId, 
        startChainage: progress.startChainage.toString(),
        endChainage: progress.endChainage.toString()
      })
      .returning();
    return newProgress;
  }

  async updateLayerProgress(id: string, progress: Partial<InsertLayerProgress>): Promise<LayerProgress> {
    const progressUpdate: any = { ...progress };
    if (progress.startChainage !== undefined) {
      progressUpdate.startChainage = progress.startChainage.toString();
    }
    if (progress.endChainage !== undefined) {
      progressUpdate.endChainage = progress.endChainage.toString();
    }
    const [updatedProgress] = await db
      .update(layerProgress)
      .set(progressUpdate)
      .where(eq(layerProgress.id, id))
      .returning();
    return updatedProgress;
  }

  async deleteLayerProgress(id: string): Promise<void> {
    await db.delete(layerProgress).where(eq(layerProgress.id, id));
  }

  async resetLayerProgress(layerId: string): Promise<void> {
    await db.delete(layerProgress).where(eq(layerProgress.layerId, layerId));
  }
}

export const storage = new DatabaseStorage();
