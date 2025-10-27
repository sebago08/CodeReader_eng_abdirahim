import {
  users,
  projects,
  roads,
  constructionLayers,
  layerProgress,
  activities,
  safetyIncidents,
  projectMembers,
  projectInvitations,
  clientPersonnel,
  contractorPersonnel,
  contractorEquipment,
  paymentCertificates,
  workPlanActivities,
  projectDocuments,
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
  type Activity,
  type InsertActivity,
  type SafetyIncident,
  type InsertSafetyIncident,
  type ProjectWithRoads,
  type ProjectMember,
  type InsertProjectMember,
  type ProjectInvitation,
  type InsertProjectInvitation,
  type ProjectMemberWithUser,
  type ProjectInvitationWithDetails,
  type ClientPersonnel,
  type InsertClientPersonnel,
  type ContractorPersonnel,
  type InsertContractorPersonnel,
  type ContractorEquipment,
  type InsertContractorEquipment,
  type PaymentCertificate,
  type InsertPaymentCertificate,
  type WorkPlanActivity,
  type InsertWorkPlanActivity,
  type ProjectDocument,
  type InsertProjectDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray } from "drizzle-orm";
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
  getLayersByRoadId(roadId: string): Promise<ConstructionLayer[]>;
  createLayers(roadId: string, layers: InsertLayer[]): Promise<ConstructionLayer[]>;
  updateLayer(id: string, layer: Partial<InsertLayer>): Promise<ConstructionLayer>;
  deleteLayer(id: string): Promise<void>;
  
  // Progress operations
  createLayerProgress(layerId: string, progress: InsertLayerProgress): Promise<LayerProgress>;
  updateLayerProgress(id: string, progress: Partial<InsertLayerProgress>): Promise<LayerProgress>;
  deleteLayerProgress(id: string): Promise<void>;
  resetLayerProgress(layerId: string): Promise<void>;
  
  // Activity operations
  getActivities(projectId: string): Promise<Activity[]>;
  createActivity(projectId: string, activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, activity: Partial<InsertActivity>): Promise<Activity>;
  deleteActivity(id: string): Promise<void>;
  
  // Safety incident operations
  getSafetyIncidents(projectId: string): Promise<SafetyIncident[]>;
  createSafetyIncident(projectId: string, incident: InsertSafetyIncident): Promise<SafetyIncident>;
  updateSafetyIncident(id: string, incident: Partial<InsertSafetyIncident>): Promise<SafetyIncident>;
  deleteSafetyIncident(id: string): Promise<void>;
  
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
  
  // Client personnel operations
  getClientPersonnel(projectId: string): Promise<ClientPersonnel[]>;
  createClientPersonnel(projectId: string, personnel: InsertClientPersonnel): Promise<ClientPersonnel>;
  updateClientPersonnel(id: string, personnel: Partial<InsertClientPersonnel>): Promise<ClientPersonnel>;
  deleteClientPersonnel(id: string): Promise<void>;
  
  // Contractor personnel operations
  getContractorPersonnel(projectId: string): Promise<ContractorPersonnel[]>;
  createContractorPersonnel(projectId: string, personnel: InsertContractorPersonnel): Promise<ContractorPersonnel>;
  updateContractorPersonnel(id: string, personnel: Partial<InsertContractorPersonnel>): Promise<ContractorPersonnel>;
  deleteContractorPersonnel(id: string): Promise<void>;
  
  // Contractor equipment operations
  getContractorEquipment(projectId: string): Promise<ContractorEquipment[]>;
  createContractorEquipment(projectId: string, equipment: InsertContractorEquipment): Promise<ContractorEquipment>;
  updateContractorEquipment(id: string, equipment: Partial<InsertContractorEquipment>): Promise<ContractorEquipment>;
  deleteContractorEquipment(id: string): Promise<void>;
  
  // Payment certificate operations
  getPaymentCertificates(projectId: string): Promise<PaymentCertificate[]>;
  getPaymentCertificateById(id: string): Promise<PaymentCertificate | undefined>;
  createPaymentCertificate(projectId: string, certificate: InsertPaymentCertificate): Promise<PaymentCertificate>;
  updatePaymentCertificate(id: string, certificate: Partial<InsertPaymentCertificate>): Promise<PaymentCertificate>;
  deletePaymentCertificate(id: string): Promise<void>;

  // Work plan activity operations
  getWorkPlanActivities(projectId: string): Promise<WorkPlanActivity[]>;
  getWorkPlanActivityById(id: string): Promise<WorkPlanActivity | undefined>;
  createWorkPlanActivity(projectId: string, activity: InsertWorkPlanActivity): Promise<WorkPlanActivity>;
  deleteWorkPlanActivity(id: string): Promise<void>;
  toggleWorkPlanMilestone(id: string, isMilestone: boolean): Promise<WorkPlanActivity>;
  
  // Project document operations
  getProjectDocuments(projectId: string): Promise<ProjectDocument[]>;
  getDocument(id: string): Promise<ProjectDocument | undefined>;
  createDocument(projectId: string, userId: string, document: InsertProjectDocument): Promise<ProjectDocument>;
  updateDocument(id: string, updates: Partial<Pick<InsertProjectDocument, 'documentName' | 'customContent'>>): Promise<ProjectDocument>;
  deleteDocument(id: string): Promise<void>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  sessionStore: session.SessionStore;
  private users = new Map<string, User>();
  private projects = new Map<string, Project>();
  private roads = new Map<string, Road>();
  private layers = new Map<string, ConstructionLayer>();
  private progress = new Map<string, LayerProgress>();
  private activities = new Map<string, Activity>();
  private safetyIncidents = new Map<string, SafetyIncident>();

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
  async getLayersByRoadId(roadId: string): Promise<ConstructionLayer[]> {
    return Array.from(this.layers.values()).filter(l => l.roadId === roadId);
  }

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

  // Activity operations
  async getActivities(projectId: string): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(a => a.projectId === projectId);
  }

  async createActivity(projectId: string, activity: InsertActivity): Promise<Activity> {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date();
    const newActivity: Activity = {
      ...activity,
      id,
      projectId,
      progress: activity.progress || 0,
      createdAt: now,
      updatedAt: now,
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async updateActivity(id: string, activity: Partial<InsertActivity>): Promise<Activity> {
    const existingActivity = this.activities.get(id);
    if (!existingActivity) throw new Error('Activity not found');
    
    const updatedActivity: Activity = {
      ...existingActivity,
      ...activity,
      updatedAt: new Date(),
    };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  async deleteActivity(id: string): Promise<void> {
    this.activities.delete(id);
  }

  // Safety incident operations
  async getSafetyIncidents(projectId: string): Promise<SafetyIncident[]> {
    return Array.from(this.safetyIncidents.values()).filter(s => s.projectId === projectId);
  }

  async createSafetyIncident(projectId: string, incident: InsertSafetyIncident): Promise<SafetyIncident> {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date();
    const newIncident: SafetyIncident = {
      ...incident,
      id,
      projectId,
      status: incident.status || "Open",
      reportedBy: incident.reportedBy || null,
      createdAt: now,
      updatedAt: now,
    };
    this.safetyIncidents.set(id, newIncident);
    return newIncident;
  }

  async updateSafetyIncident(id: string, incident: Partial<InsertSafetyIncident>): Promise<SafetyIncident> {
    const existingIncident = this.safetyIncidents.get(id);
    if (!existingIncident) throw new Error('Safety incident not found');
    
    const updatedIncident: SafetyIncident = {
      ...existingIncident,
      ...incident,
      reportedBy: incident.reportedBy !== undefined ? incident.reportedBy || null : existingIncident.reportedBy,
      updatedAt: new Date(),
    };
    this.safetyIncidents.set(id, updatedIncident);
    return updatedIncident;
  }

  async deleteSafetyIncident(id: string): Promise<void> {
    this.safetyIncidents.delete(id);
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
  
  // Document operations stubs (MemStorage doesn't support documents)
  async getProjectDocuments(): Promise<ProjectDocument[]> { return []; }
  async getDocument(): Promise<ProjectDocument | undefined> { return undefined; }
  async createDocument(): Promise<ProjectDocument> { throw new Error('Not supported in MemStorage'); }
  async updateDocument(): Promise<ProjectDocument> { throw new Error('Not supported in MemStorage'); }
  async deleteDocument(): Promise<void> { throw new Error('Not supported in MemStorage'); }
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
  async getLayersByRoadId(roadId: string): Promise<ConstructionLayer[]> {
    return await db.select().from(constructionLayers).where(eq(constructionLayers.roadId, roadId));
  }

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

  // Activity operations
  async getActivities(projectId: string): Promise<Activity[]> {
    const projectActivities = await db
      .select()
      .from(activities)
      .where(eq(activities.projectId, projectId))
      .orderBy(desc(activities.createdAt));
    return projectActivities;
  }

  async createActivity(projectId: string, activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values({ ...activity, projectId })
      .returning();
    return newActivity;
  }

  async updateActivity(id: string, activity: Partial<InsertActivity>): Promise<Activity> {
    const [updatedActivity] = await db
      .update(activities)
      .set({ ...activity, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return updatedActivity;
  }

  async deleteActivity(id: string): Promise<void> {
    await db.delete(activities).where(eq(activities.id, id));
  }

  // Safety incident operations
  async getSafetyIncidents(projectId: string): Promise<SafetyIncident[]> {
    const incidents = await db
      .select()
      .from(safetyIncidents)
      .where(eq(safetyIncidents.projectId, projectId))
      .orderBy(desc(safetyIncidents.incidentDate));
    return incidents;
  }

  async createSafetyIncident(projectId: string, incident: InsertSafetyIncident): Promise<SafetyIncident> {
    const [newIncident] = await db
      .insert(safetyIncidents)
      .values({ ...incident, projectId })
      .returning();
    return newIncident;
  }

  async updateSafetyIncident(id: string, incident: Partial<InsertSafetyIncident>): Promise<SafetyIncident> {
    const [updatedIncident] = await db
      .update(safetyIncidents)
      .set({ ...incident, updatedAt: new Date() })
      .where(eq(safetyIncidents.id, id))
      .returning();
    return updatedIncident;
  }

  async deleteSafetyIncident(id: string): Promise<void> {
    await db.delete(safetyIncidents).where(eq(safetyIncidents.id, id));
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

  // Client personnel operations
  async getClientPersonnel(projectId: string): Promise<ClientPersonnel[]> {
    return await db.select()
      .from(clientPersonnel)
      .where(eq(clientPersonnel.projectId, projectId))
      .orderBy(desc(clientPersonnel.createdAt));
  }

  async createClientPersonnel(projectId: string, personnel: InsertClientPersonnel): Promise<ClientPersonnel> {
    const [result] = await db.insert(clientPersonnel)
      .values({ ...personnel, projectId })
      .returning();
    return result;
  }

  async updateClientPersonnel(id: string, personnel: Partial<InsertClientPersonnel>): Promise<ClientPersonnel> {
    const [result] = await db.update(clientPersonnel)
      .set(personnel)
      .where(eq(clientPersonnel.id, id))
      .returning();
    return result;
  }

  async deleteClientPersonnel(id: string): Promise<void> {
    await db.delete(clientPersonnel).where(eq(clientPersonnel.id, id));
  }

  // Contractor personnel operations
  async getContractorPersonnel(projectId: string): Promise<ContractorPersonnel[]> {
    return await db.select()
      .from(contractorPersonnel)
      .where(eq(contractorPersonnel.projectId, projectId))
      .orderBy(desc(contractorPersonnel.createdAt));
  }

  async createContractorPersonnel(projectId: string, personnel: InsertContractorPersonnel): Promise<ContractorPersonnel> {
    const [result] = await db.insert(contractorPersonnel)
      .values({ ...personnel, projectId })
      .returning();
    return result;
  }

  async updateContractorPersonnel(id: string, personnel: Partial<InsertContractorPersonnel>): Promise<ContractorPersonnel> {
    const [result] = await db.update(contractorPersonnel)
      .set(personnel)
      .where(eq(contractorPersonnel.id, id))
      .returning();
    return result;
  }

  async deleteContractorPersonnel(id: string): Promise<void> {
    await db.delete(contractorPersonnel).where(eq(contractorPersonnel.id, id));
  }

  // Contractor equipment operations
  async getContractorEquipment(projectId: string): Promise<ContractorEquipment[]> {
    return await db.select()
      .from(contractorEquipment)
      .where(eq(contractorEquipment.projectId, projectId))
      .orderBy(desc(contractorEquipment.createdAt));
  }

  async createContractorEquipment(projectId: string, equipment: InsertContractorEquipment): Promise<ContractorEquipment> {
    const [result] = await db.insert(contractorEquipment)
      .values({ ...equipment, projectId })
      .returning();
    return result;
  }

  async updateContractorEquipment(id: string, equipment: Partial<InsertContractorEquipment>): Promise<ContractorEquipment> {
    const [result] = await db.update(contractorEquipment)
      .set(equipment)
      .where(eq(contractorEquipment.id, id))
      .returning();
    return result;
  }

  async deleteContractorEquipment(id: string): Promise<void> {
    await db.delete(contractorEquipment).where(eq(contractorEquipment.id, id));
  }

  // Payment certificate operations
  async getPaymentCertificates(projectId: string): Promise<PaymentCertificate[]> {
    return await db.select()
      .from(paymentCertificates)
      .where(eq(paymentCertificates.projectId, projectId))
      .orderBy(desc(paymentCertificates.createdAt));
  }

  async getPaymentCertificateById(id: string): Promise<PaymentCertificate | undefined> {
    const [result] = await db.select()
      .from(paymentCertificates)
      .where(eq(paymentCertificates.id, id))
      .limit(1);
    return result;
  }

  async createPaymentCertificate(projectId: string, certificate: InsertPaymentCertificate): Promise<PaymentCertificate> {
    const [result] = await db.insert(paymentCertificates)
      .values({ ...certificate, projectId })
      .returning();
    return result;
  }

  async updatePaymentCertificate(id: string, certificate: Partial<InsertPaymentCertificate>): Promise<PaymentCertificate> {
    const [result] = await db.update(paymentCertificates)
      .set({ ...certificate, updatedAt: new Date() })
      .where(eq(paymentCertificates.id, id))
      .returning();
    return result;
  }

  async deletePaymentCertificate(id: string): Promise<void> {
    await db.delete(paymentCertificates).where(eq(paymentCertificates.id, id));
  }

  // Work plan activity operations
  async getWorkPlanActivities(projectId: string): Promise<WorkPlanActivity[]> {
    return await db.select()
      .from(workPlanActivities)
      .where(eq(workPlanActivities.projectId, projectId))
      .orderBy(workPlanActivities.startDate);
  }

  async getWorkPlanActivityById(id: string): Promise<WorkPlanActivity | undefined> {
    const [result] = await db.select()
      .from(workPlanActivities)
      .where(eq(workPlanActivities.id, id))
      .limit(1);
    return result;
  }

  async createWorkPlanActivity(projectId: string, activity: InsertWorkPlanActivity): Promise<WorkPlanActivity> {
    const [result] = await db.insert(workPlanActivities)
      .values({ ...activity, projectId })
      .returning();
    return result;
  }

  async deleteWorkPlanActivity(id: string): Promise<void> {
    await db.delete(workPlanActivities).where(eq(workPlanActivities.id, id));
  }

  async toggleWorkPlanMilestone(id: string, isMilestone: boolean): Promise<WorkPlanActivity> {
    const [result] = await db.update(workPlanActivities)
      .set({ isMilestone, updatedAt: new Date() })
      .where(eq(workPlanActivities.id, id))
      .returning();
    return result;
  }
  
  // Project document operations
  async getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
    return await db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))
      .orderBy(desc(projectDocuments.createdAt));
  }
  
  async getDocument(id: string): Promise<ProjectDocument | undefined> {
    const [result] = await db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.id, id))
      .limit(1);
    return result;
  }
  
  async createDocument(projectId: string, userId: string, document: InsertProjectDocument): Promise<ProjectDocument> {
    const [result] = await db.insert(projectDocuments)
      .values({ ...document, projectId, userId })
      .returning();
    return result;
  }
  
  async updateDocument(id: string, updates: Partial<Pick<InsertProjectDocument, 'documentName' | 'customContent'>>): Promise<ProjectDocument> {
    const [result] = await db.update(projectDocuments)
      .set(updates)
      .where(eq(projectDocuments.id, id))
      .returning();
    return result;
  }
  
  async deleteDocument(id: string): Promise<void> {
    await db.delete(projectDocuments).where(eq(projectDocuments.id, id));
  }
}

// Use DatabaseStorage for persistent data
export const storage = new DatabaseStorage();
