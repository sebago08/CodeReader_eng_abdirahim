import {
  users,
  projects,
  roads,
  constructionLayers,
  layerProgress,
  projectMembers,
  projectInvitations,
  boqs,
  boqItems,
  summaryAdjustments,
  documents,
  workAccomplished,
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
  type BOQ,
  type InsertBOQ,
  type BOQItem,
  type InsertBOQItem,
  type SummaryAdjustment,
  type InsertSummaryAdjustment,
  type Document,
  type InsertDocument,
  type WorkAccomplished,
  type InsertWorkAccomplished,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray, asc } from "drizzle-orm";
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
  
  // BOQ operations
  getProjectBOQs(projectId: string): Promise<BOQ[]>;
  getBOQ(id: string): Promise<BOQ | undefined>;
  createBOQ(projectId: string, boq: InsertBOQ): Promise<BOQ>;
  updateBOQ(id: string, boq: Partial<InsertBOQ>): Promise<BOQ>;
  deleteBOQ(id: string): Promise<void>;
  
  // BOQ Item operations
  getBOQItems(boqId: string): Promise<BOQItem[]>;
  createBOQItem(boqId: string, item: InsertBOQItem): Promise<BOQItem>;
  updateBOQItem(id: string, item: Partial<InsertBOQItem>): Promise<BOQItem>;
  deleteBOQItem(id: string): Promise<void>;
  bulkUpsertBOQItems(boqId: string, items: BOQItem[]): Promise<BOQItem[]>;
  
  // Summary Adjustment operations
  getBOQAdjustments(boqId: string): Promise<SummaryAdjustment[]>;
  createSummaryAdjustment(adjustment: InsertSummaryAdjustment): Promise<SummaryAdjustment>;
  updateSummaryAdjustment(id: string, adjustment: Partial<InsertSummaryAdjustment>): Promise<SummaryAdjustment>;
  deleteSummaryAdjustment(id: string): Promise<void>;
  bulkUpsertAdjustments(boqId: string, adjustments: SummaryAdjustment[]): Promise<SummaryAdjustment[]>;
  
  // Document operations
  getProjectDocuments(projectId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(projectId: string, document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<void>;
  
  // Work Accomplished operations
  getProjectWorkAccomplished(projectId: string): Promise<WorkAccomplished[]>;
  createWorkAccomplished(projectId: string, work: InsertWorkAccomplished): Promise<WorkAccomplished>;
  updateWorkAccomplished(id: string, work: Partial<InsertWorkAccomplished>): Promise<WorkAccomplished | undefined>;
  deleteWorkAccomplished(id: string): Promise<void>;
  reorderWorkAccomplished(projectId: string, items: Array<{id: string; order: number}>): Promise<void>;
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

  // Team collaboration stubs (MemStorage doesn't support collaboration)
  async getUserProjectRole(): Promise<string | null> { return null; }
  async getProjectMembers(): Promise<ProjectMemberWithUser[]> { return []; }
  async addProjectMember(): Promise<ProjectMember> { throw new Error('Not supported in MemStorage'); }
  async updateProjectMemberRole(): Promise<ProjectMember> { throw new Error('Not supported in MemStorage'); }
  async removeProjectMember(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async createInvitation(): Promise<ProjectInvitation> { throw new Error('Not supported in MemStorage'); }
  async getInvitationByToken(): Promise<ProjectInvitation | undefined> { return undefined; }
  async getUserInvitations(): Promise<ProjectInvitationWithDetails[]> { return []; }
  async getProjectInvitations(): Promise<ProjectInvitationWithDetails[]> { return []; }
  async acceptInvitation(): Promise<ProjectMember> { throw new Error('Not supported in MemStorage'); }
  async declineInvitation(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async deleteInvitation(): Promise<void> { throw new Error('Not supported in MemStorage'); }

  // BOQ stubs (MemStorage doesn't support BOQ)
  async getProjectBOQs(): Promise<BOQ[]> { return []; }
  async getBOQ(): Promise<BOQ | undefined> { return undefined; }
  async createBOQ(): Promise<BOQ> { throw new Error('Not supported in MemStorage'); }
  async updateBOQ(): Promise<BOQ> { throw new Error('Not supported in MemStorage'); }
  async deleteBOQ(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async getBOQItems(): Promise<BOQItem[]> { return []; }
  async createBOQItem(): Promise<BOQItem> { throw new Error('Not supported in MemStorage'); }
  async updateBOQItem(): Promise<BOQItem> { throw new Error('Not supported in MemStorage'); }
  async deleteBOQItem(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async bulkUpsertBOQItems(): Promise<BOQItem[]> { throw new Error('Not supported in MemStorage'); }
  async getBOQAdjustments(): Promise<SummaryAdjustment[]> { return []; }
  async createSummaryAdjustment(): Promise<SummaryAdjustment> { throw new Error('Not supported in MemStorage'); }
  async updateSummaryAdjustment(): Promise<SummaryAdjustment> { throw new Error('Not supported in MemStorage'); }
  async deleteSummaryAdjustment(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async bulkUpsertAdjustments(): Promise<SummaryAdjustment[]> { throw new Error('Not supported in MemStorage'); }
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
    // Get projects where user is a member (collaborator)
    const memberProjects = await db.select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    
    const memberProjectIds = memberProjects.map(m => m.projectId);
    
    // Get all projects (owned or collaborated)
    const projectsData = await db.query.projects.findMany({
      where: memberProjectIds.length > 0 
        ? or(eq(projects.userId, userId), inArray(projects.id, memberProjectIds))
        : eq(projects.userId, userId),
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
    // Check if user has access (owner or member)
    const role = await this.getUserProjectRole(userId, id);
    if (!role) return undefined;
    
    const [project] = await db.query.projects.findMany({
      where: eq(projects.id, id),
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

  // Team collaboration operations (simplified - just "collaborator" role)
  async getUserProjectRole(userId: string, projectId: string): Promise<string | null> {
    // Check if user is the owner
    const [project] = await db.select().from(projects).where(
      and(eq(projects.id, projectId), eq(projects.userId, userId))
    );
    if (project) return 'owner';

    // Check if user is a collaborator
    const [member] = await db.select().from(projectMembers).where(
      and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId))
    );
    if (member) return 'collaborator';

    return null;
  }

  async getProjectMembers(projectId: string): Promise<ProjectMemberWithUser[]> {
    const members = await db.select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      role: projectMembers.role,
      addedBy: projectMembers.addedBy,
      createdAt: projectMembers.createdAt,
      user: users,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
    
    return members as ProjectMemberWithUser[];
  }

  async addProjectMember(member: InsertProjectMember): Promise<ProjectMember> {
    const [newMember] = await db
      .insert(projectMembers)
      .values({ ...member, role: 'collaborator' })
      .returning();
    return newMember;
  }

  async updateProjectMemberRole(memberId: string, role: string): Promise<ProjectMember> {
    const [updated] = await db
      .update(projectMembers)
      .set({ role })
      .where(eq(projectMembers.id, memberId))
      .returning();
    return updated;
  }

  async removeProjectMember(memberId: string): Promise<void> {
    await db.delete(projectMembers).where(eq(projectMembers.id, memberId));
  }

  async createInvitation(invitation: InsertProjectInvitation): Promise<ProjectInvitation> {
    const [newInvitation] = await db
      .insert(projectInvitations)
      .values(invitation)
      .returning();
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<ProjectInvitation | undefined> {
    const [invitation] = await db.select().from(projectInvitations).where(eq(projectInvitations.token, token));
    return invitation;
  }

  async getUserInvitations(userEmail: string): Promise<ProjectInvitationWithDetails[]> {
    const invitations = await db.select({
      id: projectInvitations.id,
      projectId: projectInvitations.projectId,
      invitedEmail: projectInvitations.invitedEmail,
      invitedUserId: projectInvitations.invitedUserId,
      invitedBy: projectInvitations.invitedBy,
      role: projectInvitations.role,
      status: projectInvitations.status,
      token: projectInvitations.token,
      expiresAt: projectInvitations.expiresAt,
      createdAt: projectInvitations.createdAt,
      invitedByUser: users,
      project: projects,
    })
    .from(projectInvitations)
    .innerJoin(users, eq(projectInvitations.invitedBy, users.id))
    .innerJoin(projects, eq(projectInvitations.projectId, projects.id))
    .where(and(
      eq(projectInvitations.invitedEmail, userEmail),
      eq(projectInvitations.status, 'pending')
    ));
    
    return invitations as ProjectInvitationWithDetails[];
  }

  async getProjectInvitations(projectId: string): Promise<ProjectInvitationWithDetails[]> {
    const invitations = await db.select({
      id: projectInvitations.id,
      projectId: projectInvitations.projectId,
      invitedEmail: projectInvitations.invitedEmail,
      invitedUserId: projectInvitations.invitedUserId,
      invitedBy: projectInvitations.invitedBy,
      role: projectInvitations.role,
      status: projectInvitations.status,
      token: projectInvitations.token,
      expiresAt: projectInvitations.expiresAt,
      createdAt: projectInvitations.createdAt,
      invitedByUser: users,
      project: projects,
    })
    .from(projectInvitations)
    .innerJoin(users, eq(projectInvitations.invitedBy, users.id))
    .innerJoin(projects, eq(projectInvitations.projectId, projects.id))
    .where(eq(projectInvitations.projectId, projectId));
    
    return invitations as ProjectInvitationWithDetails[];
  }

  async acceptInvitation(token: string, userId: string): Promise<ProjectMember> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) throw new Error('Invitation not found');
    if (invitation.status !== 'pending') throw new Error('Invitation already processed');
    if (new Date() > new Date(invitation.expiresAt)) throw new Error('Invitation expired');

    // Add user as member
    const member = await this.addProjectMember({
      projectId: invitation.projectId,
      userId,
      role: 'collaborator',
      addedBy: invitation.invitedBy,
    });

    // Mark invitation as accepted
    await db.update(projectInvitations)
      .set({ status: 'accepted', invitedUserId: userId })
      .where(eq(projectInvitations.id, invitation.id));

    return member;
  }

  async declineInvitation(token: string): Promise<void> {
    await db.update(projectInvitations)
      .set({ status: 'declined' })
      .where(eq(projectInvitations.token, token));
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    await db.delete(projectInvitations).where(eq(projectInvitations.id, invitationId));
  }

  // BOQ operations
  async getProjectBOQs(projectId: string): Promise<BOQ[]> {
    const boqList = await db
      .select()
      .from(boqs)
      .where(eq(boqs.projectId, projectId))
      .orderBy(desc(boqs.createdDate));
    return boqList;
  }

  async getBOQ(id: string): Promise<BOQ | undefined> {
    const [boq] = await db.select().from(boqs).where(eq(boqs.id, id));
    return boq;
  }

  async createBOQ(projectId: string, boq: InsertBOQ): Promise<BOQ> {
    const [newBOQ] = await db
      .insert(boqs)
      .values({ ...boq, projectId })
      .returning();
    return newBOQ;
  }

  async updateBOQ(id: string, boq: Partial<InsertBOQ>): Promise<BOQ> {
    const [updatedBOQ] = await db
      .update(boqs)
      .set({ ...boq, lastModified: new Date() })
      .where(eq(boqs.id, id))
      .returning();
    return updatedBOQ;
  }

  async deleteBOQ(id: string): Promise<void> {
    await db.delete(boqs).where(eq(boqs.id, id));
  }

  // BOQ Item operations
  async getBOQItems(boqId: string): Promise<BOQItem[]> {
    const items = await db
      .select()
      .from(boqItems)
      .where(eq(boqItems.boqId, boqId))
      .orderBy(asc(boqItems.order));
    return items;
  }

  async createBOQItem(boqId: string, item: InsertBOQItem): Promise<BOQItem> {
    const [newItem] = await db
      .insert(boqItems)
      .values({ ...item, boqId })
      .returning();
    return newItem;
  }

  async updateBOQItem(id: string, item: Partial<InsertBOQItem>): Promise<BOQItem> {
    const [updatedItem] = await db
      .update(boqItems)
      .set(item)
      .where(eq(boqItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteBOQItem(id: string): Promise<void> {
    await db.delete(boqItems).where(eq(boqItems.id, id));
  }

  async bulkUpsertBOQItems(boqId: string, items: BOQItem[]): Promise<BOQItem[]> {
    // Delete existing items first
    await db.delete(boqItems).where(eq(boqItems.boqId, boqId));
    
    // Insert all new items
    if (items.length === 0) return [];
    
    const newItems = await db
      .insert(boqItems)
      .values(items.map(item => ({ ...item, boqId })))
      .returning();
    return newItems;
  }

  // Summary Adjustment operations
  async getBOQAdjustments(boqId: string): Promise<SummaryAdjustment[]> {
    const adjustments = await db
      .select()
      .from(summaryAdjustments)
      .where(eq(summaryAdjustments.boqId, boqId))
      .orderBy(asc(summaryAdjustments.order));
    return adjustments;
  }

  async createSummaryAdjustment(adjustment: InsertSummaryAdjustment): Promise<SummaryAdjustment> {
    const [newAdjustment] = await db
      .insert(summaryAdjustments)
      .values(adjustment)
      .returning();
    return newAdjustment;
  }

  async updateSummaryAdjustment(id: string, adjustment: Partial<InsertSummaryAdjustment>): Promise<SummaryAdjustment> {
    const [updatedAdjustment] = await db
      .update(summaryAdjustments)
      .set(adjustment)
      .where(eq(summaryAdjustments.id, id))
      .returning();
    return updatedAdjustment;
  }

  async deleteSummaryAdjustment(id: string): Promise<void> {
    await db.delete(summaryAdjustments).where(eq(summaryAdjustments.id, id));
  }

  async bulkUpsertAdjustments(boqId: string, adjustments: SummaryAdjustment[]): Promise<SummaryAdjustment[]> {
    // Delete existing adjustments first
    await db.delete(summaryAdjustments).where(eq(summaryAdjustments.boqId, boqId));
    
    // Insert all new adjustments
    if (adjustments.length === 0) return [];
    
    const newAdjustments = await db
      .insert(summaryAdjustments)
      .values(adjustments.map(adj => ({ ...adj, boqId })))
      .returning();
    return newAdjustments;
  }

  // Document operations
  async getProjectDocuments(projectId: string): Promise<Document[]> {
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.createdAt));
    return docs;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return document;
  }

  async createDocument(projectId: string, document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values({ ...document, projectId })
      .returning();
    return newDocument;
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDocument] = await db
      .update(documents)
      .set(document)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Work Accomplished operations
  async getProjectWorkAccomplished(projectId: string): Promise<WorkAccomplished[]> {
    const work = await db
      .select()
      .from(workAccomplished)
      .where(eq(workAccomplished.projectId, projectId))
      .orderBy(asc(workAccomplished.order));
    return work;
  }

  async createWorkAccomplished(projectId: string, work: InsertWorkAccomplished): Promise<WorkAccomplished> {
    const [newWork] = await db
      .insert(workAccomplished)
      .values({ ...work, projectId })
      .returning();
    return newWork;
  }

  async updateWorkAccomplished(id: string, work: Partial<InsertWorkAccomplished>): Promise<WorkAccomplished | undefined> {
    const [updatedWork] = await db
      .update(workAccomplished)
      .set(work)
      .where(eq(workAccomplished.id, id))
      .returning();
    return updatedWork;
  }

  async deleteWorkAccomplished(id: string): Promise<void> {
    await db.delete(workAccomplished).where(eq(workAccomplished.id, id));
  }

  async reorderWorkAccomplished(projectId: string, items: Array<{id: string; order: number}>): Promise<void> {
    // Verify all items belong to this project before updating
    const itemIds = items.map(item => item.id);
    const existingItems = await db
      .select()
      .from(workAccomplished)
      .where(and(
        inArray(workAccomplished.id, itemIds),
        eq(workAccomplished.projectId, projectId)
      ));
    
    // If any items don't belong to this project, throw an error
    if (existingItems.length !== items.length) {
      throw new Error("Some work accomplished items do not belong to this project");
    }
    
    // Update each item's order
    for (const item of items) {
      await db
        .update(workAccomplished)
        .set({ order: item.order })
        .where(and(
          eq(workAccomplished.id, item.id),
          eq(workAccomplished.projectId, projectId)
        ));
    }
  }
}

// Use DatabaseStorage for persistent data
export const storage = new DatabaseStorage();
