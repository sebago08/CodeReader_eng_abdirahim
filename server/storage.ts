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

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private projects = new Map<string, Project>();
  private roads = new Map<string, Road>();
  private layers = new Map<string, ConstructionLayer>();
  private progress = new Map<string, LayerProgress>();

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const existingUser = this.users.get(userData.id!);
    
    const user: User = {
      id: userData.id!,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: existingUser?.createdAt || now,
      updatedAt: now,
    };
    
    this.users.set(userData.id!, user);
    return user;
  }

  // Project operations
  async getProjects(userId: string): Promise<ProjectWithRoads[]> {
    const userProjects = Array.from(this.projects.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    return userProjects.map(project => ({
      ...project,
      roads: Array.from(this.roads.values())
        .filter(r => r.projectId === project.id)
        .map(road => ({
          ...road,
          layers: Array.from(this.layers.values())
            .filter(l => l.roadId === road.id)
            .map(layer => ({
              ...layer,
              progress: Array.from(this.progress.values())
                .filter(p => p.layerId === layer.id),
            })),
        })),
    }));
  }

  async getProject(id: string, userId: string): Promise<ProjectWithRoads | undefined> {
    const project = this.projects.get(id);
    if (!project || project.userId !== userId) return undefined;

    return {
      ...project,
      roads: Array.from(this.roads.values())
        .filter(r => r.projectId === project.id)
        .map(road => ({
          ...road,
          layers: Array.from(this.layers.values())
            .filter(l => l.roadId === road.id)
            .map(layer => ({
              ...layer,
              progress: Array.from(this.progress.values())
                .filter(p => p.layerId === layer.id),
            })),
        })),
    };
  }

  async createProject(userId: string, project: InsertProject): Promise<Project> {
    const now = new Date();
    const id = Math.random().toString(36).substr(2, 9);
    const newProject: Project = {
      ...project,
      id,
      userId,
      description: project.description || null,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, userId: string, project: Partial<InsertProject>): Promise<Project> {
    const existingProject = this.projects.get(id);
    if (!existingProject || existingProject.userId !== userId) {
      throw new Error('Project not found');
    }
    
    const updatedProject: Project = {
      ...existingProject,
      ...project,
      updatedAt: new Date(),
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string, userId: string): Promise<void> {
    const project = this.projects.get(id);
    if (!project || project.userId !== userId) return;
    
    // Delete related roads, layers, and progress
    const projectRoads = Array.from(this.roads.values()).filter(r => r.projectId === id);
    for (const road of projectRoads) {
      await this.deleteRoad(road.id);
    }
    
    this.projects.delete(id);
  }

  // Road operations
  async createRoad(projectId: string, road: InsertRoad): Promise<Road> {
    const now = new Date();
    const id = Math.random().toString(36).substr(2, 9);
    const newRoad: Road = {
      ...road,
      id,
      projectId,
      carriageway: road.carriageway || "single",
      length: road.length.toString(),
      createdAt: now,
      updatedAt: now,
    };
    this.roads.set(id, newRoad);
    return newRoad;
  }

  async updateRoad(id: string, road: Partial<InsertRoad>): Promise<Road> {
    const existingRoad = this.roads.get(id);
    if (!existingRoad) throw new Error('Road not found');
    
    const updatedRoad: Road = {
      ...existingRoad,
      ...road,
      length: road.length !== undefined ? road.length.toString() : existingRoad.length,
      updatedAt: new Date(),
    };
    this.roads.set(id, updatedRoad);
    return updatedRoad;
  }

  async deleteRoad(id: string): Promise<void> {
    // Delete related layers and progress
    const roadLayers = Array.from(this.layers.values()).filter(l => l.roadId === id);
    for (const layer of roadLayers) {
      await this.deleteLayer(layer.id);
    }
    
    this.roads.delete(id);
  }

  // Layer operations
  async createLayers(roadId: string, layers: InsertLayer[]): Promise<ConstructionLayer[]> {
    if (layers.length === 0) return [];
    
    const newLayers: ConstructionLayer[] = layers.map(layer => {
      const id = Math.random().toString(36).substr(2, 9);
      const now = new Date();
      const newLayer: ConstructionLayer = {
        ...layer,
        id,
        roadId,
        weight: layer.weight || null,
        createdAt: now,
      };
      this.layers.set(id, newLayer);
      return newLayer;
    });
    
    return newLayers;
  }

  async updateLayer(id: string, layer: Partial<InsertLayer>): Promise<ConstructionLayer> {
    const existingLayer = this.layers.get(id);
    if (!existingLayer) throw new Error('Layer not found');
    
    const updatedLayer: ConstructionLayer = {
      ...existingLayer,
      ...layer,
    };
    this.layers.set(id, updatedLayer);
    return updatedLayer;
  }

  async deleteLayer(id: string): Promise<void> {
    // Delete related progress
    const layerProgress = Array.from(this.progress.values()).filter(p => p.layerId === id);
    for (const prog of layerProgress) {
      this.progress.delete(prog.id);
    }
    
    this.layers.delete(id);
  }

  // Progress operations
  async createLayerProgress(layerId: string, progress: InsertLayerProgress): Promise<LayerProgress> {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date();
    const newProgress: LayerProgress = {
      ...progress,
      id,
      layerId,
      carriagewaySide: progress.carriagewaySide || null,
      notes: progress.notes || null,
      startChainage: progress.startChainage.toString(),
      endChainage: progress.endChainage.toString(),
      createdAt: now,
    };
    this.progress.set(id, newProgress);
    return newProgress;
  }

  async updateLayerProgress(id: string, progress: Partial<InsertLayerProgress>): Promise<LayerProgress> {
    const existingProgress = this.progress.get(id);
    if (!existingProgress) throw new Error('Progress not found');
    
    const updatedProgress: LayerProgress = {
      ...existingProgress,
      ...progress,
      carriagewaySide: progress.carriagewaySide !== undefined ? progress.carriagewaySide || null : existingProgress.carriagewaySide,
      notes: progress.notes !== undefined ? progress.notes || null : existingProgress.notes,
      startChainage: progress.startChainage !== undefined ? progress.startChainage.toString() : existingProgress.startChainage,
      endChainage: progress.endChainage !== undefined ? progress.endChainage.toString() : existingProgress.endChainage,
    };
    this.progress.set(id, updatedProgress);
    return updatedProgress;
  }

  async deleteLayerProgress(id: string): Promise<void> {
    this.progress.delete(id);
  }

  async resetLayerProgress(layerId: string): Promise<void> {
    const layerProgress = Array.from(this.progress.values()).filter(p => p.layerId === layerId);
    for (const prog of layerProgress) {
      this.progress.delete(prog.id);
    }
  }
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

export const storage = new MemStorage();
