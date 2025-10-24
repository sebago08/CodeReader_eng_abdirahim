import {
  users,
  projects,
  roads,
  constructionLayers,
  layerProgress,
  projectMembers,
  projectInvitations,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Road,
  type InsertRoad,
  type ConstructionLayer,
  type InsertLayer,
  type LayerProgress,
  type InsertLayerProgress,
  type ProjectWithRoads,
  type ProjectMember,
  type InsertProjectMember,
  type ProjectInvitation,
  type InsertProjectInvitation,
  type ProjectMemberWithUser,
  type ProjectInvitationWithDetails,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

// Interface for storage operations
export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  approveUser(userId: string): Promise<User>;
  rejectUser(userId: string): Promise<void>;
  promoteToAdmin(username: string): Promise<User>;
  
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
  
  // Team collaboration operations
  getUserProjectRole(userId: string, projectId: string): Promise<string | null>;
  getProjectMembers(projectId: string): Promise<ProjectMemberWithUser[]>;
  addProjectMember(member: InsertProjectMember): Promise<ProjectMember>;
  updateProjectMemberRole(memberId: string, role: string): Promise<ProjectMember>;
  removeProjectMember(memberId: string): Promise<void>;
  createInvitation(invitation: InsertProjectInvitation): Promise<ProjectInvitation>;
  getInvitationByToken(token: string): Promise<ProjectInvitation | undefined>;
  getUserInvitations(userEmail: string): Promise<ProjectInvitationWithDetails[]>;
  getProjectInvitations(projectId: string): Promise<ProjectInvitationWithDetails[]>;
  acceptInvitation(token: string, userId: string): Promise<ProjectMember>;
  declineInvitation(token: string): Promise<void>;
  deleteInvitation(invitationId: string): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  sessionStore: session.SessionStore;
  private users = new Map<string, User>();
  private projects = new Map<string, Project>();
  private roads = new Map<string, Road>();
  private layers = new Map<string, ConstructionLayer>();
  private progress = new Map<string, LayerProgress>();

  constructor() {
    const createMemoryStore = require("memorystore");
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.username === username);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const now = new Date();
    const id = Math.random().toString(36).substr(2, 9);
    
    if (!userData.username || !userData.password || !userData.email) {
      throw new Error('Username, password, and email are required');
    }
    
    const user: User = {
      id,
      username: userData.username,
      password: userData.password,
      email: userData.email,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      isAdmin: userData.isAdmin ?? false,
      isApproved: userData.isApproved ?? false,
      createdAt: now,
      updatedAt: now,
    };
    
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async approveUser(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      isApproved: true,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async rejectUser(userId: string): Promise<void> {
    this.users.delete(userId);
  }

  async promoteToAdmin(username: string): Promise<User> {
    const user = Array.from(this.users.values()).find(u => u.username === username);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      isAdmin: true,
      isApproved: true,
      updatedAt: new Date(),
    };
    this.users.set(user.id, updatedUser);
    return updatedUser;
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
  sessionStore: session.SessionStore;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: 7 * 24 * 60 * 60, // 1 week in seconds
      tableName: "sessions",
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    return allUsers;
  }

  async approveUser(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }

  async rejectUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async promoteToAdmin(username: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin: true, isApproved: true, updatedAt: new Date() })
      .where(eq(users.username, username))
      .returning();
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
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

// Use DatabaseStorage for persistent data
export const storage = new DatabaseStorage();
