import {
  users,
  projects,
  roads,
  constructionLayers,
  layerProgress,
  activities,
  safetyIncidents,
  incidentReports,
  grievances,
  projectMembers,
  projectInvitations,
  clientPersonnel,
  contractorPersonnel,
  contractorEquipment,
  paymentCertificates,
  workPlans,
  workPlanActivities,
  projectDocuments,
  progressTrackers,
  progressTrackerItems,
  preCommencementItems,
  dailyLogs,
  actionPoints,
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
  type IncidentReport,
  type InsertIncidentReport,
  type Grievance,
  type InsertGrievance,
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
  type WorkPlan,
  type InsertWorkPlan,
  type WorkPlanActivity,
  type InsertWorkPlanActivity,
  type ProjectDocument,
  type InsertProjectDocument,
  type ProgressTracker,
  type InsertProgressTracker,
  type ProgressTrackerItem,
  type InsertProgressTrackerItem,
  type ProgressTrackerWithItems,
  type PreCommencementItem,
  type InsertPreCommencementItem,
  type DailyLog,
  type InsertDailyLog,
  type ActionPoint,
  type InsertActionPoint,
  type DailyLogWithActionPoints,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, inArray, sql, gte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Store } from "express-session";

// Interface for storage operations
export interface IStorage {
  // Session store
  sessionStore: Store;
  
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAuthId(authId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  approveUser(userId: string): Promise<User>;
  deactivateUser(userId: string): Promise<User>;
  rejectUser(userId: string): Promise<void>;
  promoteToAdmin(userId: string): Promise<User>;
  demoteFromAdmin(userId: string): Promise<User>;
  updateUserRole(userId: string, updates: { isAdmin?: boolean; isSuperAdmin?: boolean; isApproved?: boolean }): Promise<User>;
  updateUserAuthId(userId: string, authId: string): Promise<User>;
  
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

  // Work plan operations
  getWorkPlans(projectId: string): Promise<WorkPlan[]>;
  getWorkPlan(id: string): Promise<WorkPlan | undefined>;
  createWorkPlan(projectId: string, workPlan: InsertWorkPlan): Promise<WorkPlan>;
  updateWorkPlan(id: string, workPlan: Partial<InsertWorkPlan>): Promise<WorkPlan>;
  deleteWorkPlan(id: string): Promise<void>;

  // Work plan activity operations
  getWorkPlanActivities(projectId: string, workPlanId?: string): Promise<WorkPlanActivity[]>;
  getWorkPlanActivityById(id: string): Promise<WorkPlanActivity | undefined>;
  createWorkPlanActivity(projectId: string, activity: InsertWorkPlanActivity): Promise<WorkPlanActivity>;
  deleteWorkPlanActivity(id: string): Promise<void>;
  toggleWorkPlanMilestone(id: string, isMilestone: boolean): Promise<WorkPlanActivity>;
  updateWorkPlanActivityName(id: string, activityName: string): Promise<WorkPlanActivity>;
  updateWorkPlanActivity(id: string, updates: { activityName?: string; duration?: number | null; startDate?: string | null; endDate?: string | null }): Promise<WorkPlanActivity>;
  insertSectionAtPosition(projectId: string, targetOrderIndex: number, position: "above" | "below", sectionName: string, workPlanId?: string): Promise<WorkPlanActivity>;
  insertActivityAtPosition(projectId: string, targetOrderIndex: number, position: "above" | "below", activity: InsertWorkPlanActivity): Promise<WorkPlanActivity>;
  
  // Project document operations
  getProjectDocuments(projectId: string): Promise<ProjectDocument[]>;
  getDocument(id: string): Promise<ProjectDocument | undefined>;
  createDocument(projectId: string, userId: string, document: InsertProjectDocument): Promise<ProjectDocument>;
  updateDocument(id: string, updates: Partial<Pick<InsertProjectDocument, 'documentName' | 'customContent'>>): Promise<ProjectDocument>;
  deleteDocument(id: string): Promise<void>;
  
  // Progress tracker operations
  getProgressTrackers(projectId: string): Promise<ProgressTracker[]>;
  getProgressTracker(id: string): Promise<ProgressTrackerWithItems | undefined>;
  createProgressTracker(projectId: string, tracker: InsertProgressTracker, activities: WorkPlanActivity[]): Promise<ProgressTrackerWithItems>;
  updateProgressTracker(id: string, tracker: Partial<InsertProgressTracker>): Promise<ProgressTracker>;
  deleteProgressTracker(id: string): Promise<void>;
  updateProgressTrackerItem(id: string, item: Partial<InsertProgressTrackerItem>): Promise<ProgressTrackerItem>;
  
  // Pre-commencement checklist operations
  getPreCommencementItems(projectId: string): Promise<PreCommencementItem[]>;
  createPreCommencementItem(projectId: string, item: InsertPreCommencementItem): Promise<PreCommencementItem>;
  updatePreCommencementItem(id: string, item: Partial<InsertPreCommencementItem>): Promise<PreCommencementItem>;
  
  // Daily logs operations
  getDailyLogs(projectId: string): Promise<DailyLog[]>;
  getDailyLog(id: string): Promise<DailyLogWithActionPoints | undefined>;
  getDailyLogByDate(projectId: string, date: string): Promise<DailyLogWithActionPoints | undefined>;
  createDailyLog(projectId: string, log: InsertDailyLog): Promise<DailyLog>;
  updateDailyLog(id: string, log: Partial<InsertDailyLog>): Promise<DailyLog>;
  deleteDailyLog(id: string): Promise<void>;
  
  // Action points operations
  getActionPoints(projectId: string, status?: string): Promise<ActionPoint[]>;
  getActionPointsByLog(dailyLogId: string): Promise<ActionPoint[]>;
  createActionPoint(projectId: string, dailyLogId: string | null, actionPoint: InsertActionPoint): Promise<ActionPoint>;
  updateActionPoint(id: string, actionPoint: Partial<InsertActionPoint>): Promise<ActionPoint>;
  deleteActionPoint(id: string): Promise<void>;
  deletePreCommencementItem(id: string): Promise<void>;
  createDefaultChecklistItems(projectId: string): Promise<PreCommencementItem[]>;
  
  // Incident report operations (World Bank compliant)
  getIncidentReports(projectId: string): Promise<IncidentReport[]>;
  getIncidentReport(id: string): Promise<IncidentReport | undefined>;
  createIncidentReport(projectId: string, report: InsertIncidentReport): Promise<IncidentReport>;
  updateIncidentReport(id: string, report: Partial<InsertIncidentReport>): Promise<IncidentReport>;
  deleteIncidentReport(id: string): Promise<void>;
  getCriticalIncidents(userId: string): Promise<IncidentReport[]>;
  
  // Grievance operations
  getGrievances(projectId: string): Promise<Grievance[]>;
  getGrievance(id: string): Promise<Grievance | undefined>;
  createGrievance(projectId: string, grievance: InsertGrievance): Promise<Grievance>;
  updateGrievance(id: string, grievance: Partial<InsertGrievance>): Promise<Grievance>;
  deleteGrievance(id: string): Promise<void>;
  getOpenGrievances(userId: string): Promise<Grievance[]>;
  
  // Dashboard operations
  getDashboardMetrics(userId: string): Promise<import("@shared/schema").DashboardMetrics>;
  
  // Project alerts operations
  getProjectAlerts(projectId: string, userId: string): Promise<import("@shared/schema").ProjectAlerts>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  sessionStore: Store;
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

  async getUserByAuthId(authId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.authId === authId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const now = new Date();
    const id = Math.random().toString(36).substr(2, 9);
    
    if (!userData.username || !userData.password || !userData.email) {
      throw new Error('Username, password, and email are required');
    }
    
    const user: User = {
      id,
      authId: userData.authId || null,
      username: userData.username,
      password: userData.password || null,
      email: userData.email,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      isAdmin: userData.isAdmin ?? false,
      isSuperAdmin: userData.isSuperAdmin ?? false,
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

  async deactivateUser(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      isApproved: false,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async promoteToAdmin(userId: string): Promise<User> {
    const user = this.users.get(userId);
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

  async demoteFromAdmin(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      isAdmin: false,
      updatedAt: new Date(),
    };
    this.users.set(user.id, updatedUser);
    return updatedUser;
  }

  async updateUserRole(userId: string, updates: { isAdmin?: boolean; isSuperAdmin?: boolean; isApproved?: boolean }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserAuthId(userId: string, authId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser: User = {
      ...user,
      authId,
      updatedAt: new Date(),
    };
    this.users.set(userId, updatedUser);
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
  
  // Pre-commencement checklist stubs (MemStorage doesn't support this)
  async getPreCommencementItems(): Promise<PreCommencementItem[]> { return []; }
  async createPreCommencementItem(): Promise<PreCommencementItem> { throw new Error('Not supported in MemStorage'); }
  async updatePreCommencementItem(): Promise<PreCommencementItem> { throw new Error('Not supported in MemStorage'); }
  async deletePreCommencementItem(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async createDefaultChecklistItems(): Promise<PreCommencementItem[]> { throw new Error('Not supported in MemStorage'); }
  
  // Daily logs stubs
  async getDailyLogs(): Promise<DailyLog[]> { return []; }
  async getDailyLog(): Promise<DailyLogWithActionPoints | undefined> { return undefined; }
  async getDailyLogByDate(): Promise<DailyLogWithActionPoints | undefined> { return undefined; }
  async createDailyLog(): Promise<DailyLog> { throw new Error('Not supported in MemStorage'); }
  async updateDailyLog(): Promise<DailyLog> { throw new Error('Not supported in MemStorage'); }
  async deleteDailyLog(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  
  // Action points stubs
  async getActionPoints(): Promise<ActionPoint[]> { return []; }
  async getActionPointsByLog(): Promise<ActionPoint[]> { return []; }
  async createActionPoint(): Promise<ActionPoint> { throw new Error('Not supported in MemStorage'); }
  async updateActionPoint(): Promise<ActionPoint> { throw new Error('Not supported in MemStorage'); }
  async deleteActionPoint(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  
  // Incident report stubs (World Bank compliant)
  async getIncidentReports(): Promise<IncidentReport[]> { return []; }
  async getIncidentReport(): Promise<IncidentReport | undefined> { return undefined; }
  async createIncidentReport(): Promise<IncidentReport> { throw new Error('Not supported in MemStorage'); }
  async updateIncidentReport(): Promise<IncidentReport> { throw new Error('Not supported in MemStorage'); }
  async deleteIncidentReport(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async getCriticalIncidents(_userId: string): Promise<IncidentReport[]> { return []; }
  
  // Grievance stubs
  async getGrievances(): Promise<Grievance[]> { return []; }
  async getGrievance(): Promise<Grievance | undefined> { return undefined; }
  async createGrievance(): Promise<Grievance> { throw new Error('Not supported in MemStorage'); }
  async updateGrievance(): Promise<Grievance> { throw new Error('Not supported in MemStorage'); }
  async deleteGrievance(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async getOpenGrievances(_userId: string): Promise<Grievance[]> { return []; }
  
  // Progress tracker stubs
  async getProgressTrackers(): Promise<ProgressTracker[]> { return []; }
  async getProgressTracker(): Promise<ProgressTrackerWithItems | undefined> { return undefined; }
  async createProgressTracker(): Promise<ProgressTrackerWithItems> { throw new Error('Not supported in MemStorage'); }
  async updateProgressTracker(): Promise<ProgressTracker> { throw new Error('Not supported in MemStorage'); }
  async deleteProgressTracker(): Promise<void> { throw new Error('Not supported in MemStorage'); }
  async updateProgressTrackerItem(): Promise<ProgressTrackerItem> { throw new Error('Not supported in MemStorage'); }
  
  // Dashboard operations stub
  async getDashboardMetrics(): Promise<import("@shared/schema").DashboardMetrics> {
    return {
      financialTotal: 0,
      amountSpent: 0,
      currentBalance: 0,
      projectsBehindSchedule: 0,
      openIncidentReports: { total: 0, severe: 0, serious: 0, indicative: 0 },
      openGrievances: { total: 0, registered: 0, underInvestigation: 0, escalated: 0 },
      upcomingMilestones: 0,
      delayedProjects: [],
      incidentsList: [],
      grievancesList: [],
      activeProjects: [],
    };
  }

  async getProjectAlerts(): Promise<import("@shared/schema").ProjectAlerts> {
    return {
      milestones: {
        upcoming: [],
        overdue: [],
      },
      actionPoints: [],
      criticalIssues: [],
    };
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: Store;

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

  async getUserByAuthId(authId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.authId, authId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async deactivateUser(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isApproved: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }

  async promoteToAdmin(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin: true, isApproved: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }

  async demoteFromAdmin(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ isAdmin: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }

  async updateUserRole(userId: string, updates: { isAdmin?: boolean; isSuperAdmin?: boolean; isApproved?: boolean }): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    if (!updatedUser) throw new Error('User not found');
    return updatedUser;
  }

  async updateUserAuthId(userId: string, authId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ authId, updatedAt: new Date() })
      .where(eq(users.id, userId))
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

  // Work plan operations
  async getWorkPlans(projectId: string): Promise<WorkPlan[]> {
    return await db.select()
      .from(workPlans)
      .where(eq(workPlans.projectId, projectId))
      .orderBy(workPlans.createdAt);
  }

  async getWorkPlan(id: string): Promise<WorkPlan | undefined> {
    const [result] = await db.select()
      .from(workPlans)
      .where(eq(workPlans.id, id))
      .limit(1);
    return result;
  }

  async createWorkPlan(projectId: string, workPlan: InsertWorkPlan): Promise<WorkPlan> {
    const [result] = await db.insert(workPlans)
      .values({ ...workPlan, projectId })
      .returning();
    return result;
  }

  async updateWorkPlan(id: string, workPlan: Partial<InsertWorkPlan>): Promise<WorkPlan> {
    const [result] = await db.update(workPlans)
      .set({ ...workPlan, updatedAt: new Date() })
      .where(eq(workPlans.id, id))
      .returning();
    return result;
  }

  async deleteWorkPlan(id: string): Promise<void> {
    await db.delete(workPlans).where(eq(workPlans.id, id));
  }

  // Work plan activity operations
  async getWorkPlanActivities(projectId: string, workPlanId?: string): Promise<WorkPlanActivity[]> {
    const conditions = [eq(workPlanActivities.projectId, projectId)];
    if (workPlanId) {
      conditions.push(eq(workPlanActivities.workPlanId, workPlanId));
    }
    
    console.log(`getWorkPlanActivities called with projectId=${projectId}, workPlanId=${workPlanId}`);
    
    const results = await db.select()
      .from(workPlanActivities)
      .where(and(...conditions))
      .orderBy(workPlanActivities.orderIndex);
    
    console.log(`getWorkPlanActivities query returned ${results.length} activities`);
    if (results.length > 0) {
      console.log('Sample activity:', JSON.stringify(results[0]));
    }
    
    // Also check total activities for this project
    const allProjectActivities = await db.select()
      .from(workPlanActivities)
      .where(eq(workPlanActivities.projectId, projectId));
    console.log(`Total activities in project ${projectId}: ${allProjectActivities.length}`);
    if (allProjectActivities.length > 0 && workPlanId) {
      const workPlanIds = [...new Set(allProjectActivities.map(a => a.workPlanId))];
      console.log('All work plan IDs in project:', workPlanIds);
    }
    
    return results;
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

  async updateWorkPlanActivityName(id: string, activityName: string): Promise<WorkPlanActivity> {
    const [result] = await db.update(workPlanActivities)
      .set({ activityName, updatedAt: new Date() })
      .where(eq(workPlanActivities.id, id))
      .returning();
    return result;
  }

  async updateWorkPlanActivity(id: string, updates: { activityName?: string; duration?: number | null; startDate?: string | null; endDate?: string | null }): Promise<WorkPlanActivity> {
    const [result] = await db.update(workPlanActivities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workPlanActivities.id, id))
      .returning();
    return result;
  }

  async insertSectionAtPosition(
    projectId: string,
    targetOrderIndex: number,
    position: "above" | "below",
    sectionName: string,
    workPlanId?: string
  ): Promise<WorkPlanActivity> {
    // Calculate the insert position
    const insertIndex = position === "above" ? targetOrderIndex : targetOrderIndex + 1;
    
    // Execute in a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Build conditions for the update query
      const updateConditions = [
        eq(workPlanActivities.projectId, projectId),
        gte(workPlanActivities.orderIndex, insertIndex),
      ];
      if (workPlanId) {
        updateConditions.push(eq(workPlanActivities.workPlanId, workPlanId));
      }

      // First, shift all items at or after the insert position by 1
      await tx.update(workPlanActivities)
        .set({ 
          orderIndex: sql`${workPlanActivities.orderIndex} + 1`,
          updatedAt: new Date()
        })
        .where(and(...updateConditions));
      
      // Then insert the new section at the calculated position
      const [newSection] = await tx.insert(workPlanActivities)
        .values({
          projectId,
          workPlanId,
          activityName: sectionName,
          itemType: "section",
          orderIndex: insertIndex,
          isMilestone: false,
        })
        .returning();
      
      return newSection;
    });
  }

  async insertActivityAtPosition(
    projectId: string,
    targetOrderIndex: number,
    position: "above" | "below",
    activity: InsertWorkPlanActivity
  ): Promise<WorkPlanActivity> {
    // Calculate the insert position
    const insertIndex = position === "above" ? targetOrderIndex : targetOrderIndex + 1;
    
    // Execute in a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Build conditions for the update query
      const updateConditions = [
        eq(workPlanActivities.projectId, projectId),
        gte(workPlanActivities.orderIndex, insertIndex),
      ];
      if (activity.workPlanId) {
        updateConditions.push(eq(workPlanActivities.workPlanId, activity.workPlanId));
      }

      // First, shift all items at or after the insert position by 1
      await tx.update(workPlanActivities)
        .set({ 
          orderIndex: sql`${workPlanActivities.orderIndex} + 1`,
          updatedAt: new Date()
        })
        .where(and(...updateConditions));
      
      // Then insert the new activity at the calculated position
      const [newActivity] = await tx.insert(workPlanActivities)
        .values({
          ...activity,
          projectId,
          orderIndex: insertIndex,
        })
        .returning();
      
      return newActivity;
    });
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
  
  // Progress tracker operations
  async getProgressTrackers(projectId: string): Promise<ProgressTracker[]> {
    return await db.select()
      .from(progressTrackers)
      .where(eq(progressTrackers.projectId, projectId))
      .orderBy(desc(progressTrackers.createdAt));
  }
  
  async getProgressTracker(id: string): Promise<ProgressTrackerWithItems | undefined> {
    const [tracker] = await db.select()
      .from(progressTrackers)
      .where(eq(progressTrackers.id, id))
      .limit(1);
    
    if (!tracker) return undefined;
    
    const items = await db.select()
      .from(progressTrackerItems)
      .where(eq(progressTrackerItems.progressTrackerId, id))
      .orderBy(progressTrackerItems.orderIndex);
    
    return { ...tracker, items };
  }
  
  async createProgressTracker(
    projectId: string, 
    tracker: InsertProgressTracker, 
    activities: WorkPlanActivity[]
  ): Promise<ProgressTrackerWithItems> {
    return await db.transaction(async (tx) => {
      // Create the tracker
      const [newTracker] = await tx.insert(progressTrackers)
        .values({ ...tracker, projectId })
        .returning();
      
      // Create items from activities
      if (activities.length > 0) {
        const items = activities.map((activity, index) => ({
          progressTrackerId: newTracker.id,
          projectId,
          activityId: activity.id,
          itemType: activity.itemType,
          description: activity.activityName,
          orderIndex: activity.orderIndex ?? index,
          qtyInBoq: "0",
          qtyDone: "0",
          weightedRatio: "1",
        }));
        
        const createdItems = await tx.insert(progressTrackerItems)
          .values(items)
          .returning();
        
        return { ...newTracker, items: createdItems };
      }
      
      return { ...newTracker, items: [] };
    });
  }
  
  async updateProgressTracker(id: string, tracker: Partial<InsertProgressTracker>): Promise<ProgressTracker> {
    const [result] = await db.update(progressTrackers)
      .set({ ...tracker, updatedAt: new Date() })
      .where(eq(progressTrackers.id, id))
      .returning();
    return result;
  }
  
  async deleteProgressTracker(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete all items first
      await tx.delete(progressTrackerItems)
        .where(eq(progressTrackerItems.progressTrackerId, id));
      
      // Delete the tracker
      await tx.delete(progressTrackers)
        .where(eq(progressTrackers.id, id));
    });
  }
  
  async updateProgressTrackerItem(id: string, item: Partial<InsertProgressTrackerItem>): Promise<ProgressTrackerItem> {
    // First, get the current item to calculate amounts if needed
    const [currentItem] = await db.select()
      .from(progressTrackerItems)
      .where(eq(progressTrackerItems.id, id));
    
    if (!currentItem) {
      throw new Error('Progress tracker item not found');
    }
    
    // Helper to safely parse numeric values (handles both strings and numbers from API, returns null for empty)
    const toNumber = (value: any, fallback: string | null): number | null => {
      if (value === '' || value === null || value === undefined) {
        return null;
      }
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(num) ? (fallback ? parseFloat(fallback) : null) : num;
    };
    
    // Extract numeric values for calculations - handle both string and number payloads
    const qtyInBoqNum = toNumber(item.qtyInBoq, currentItem.qtyInBoq);
    const rateNum = toNumber(item.rate, currentItem.rate);
    const qtyDoneNum = toNumber(item.qtyDone, currentItem.qtyDone);
    
    // Calculate amounts with numeric values (null if any component is null)
    const amountNum = (qtyInBoqNum !== null && rateNum !== null) ? qtyInBoqNum * rateNum : null;
    const amountDoneNum = (qtyDoneNum !== null && rateNum !== null) ? qtyDoneNum * rateNum : null;
    
    // Now convert all numeric values to strings for decimal fields, or set to null
    const updates: any = { ...item, updatedAt: new Date() };
    
    // Handle nullable numeric fields
    if (item.qtyInBoq !== undefined) {
      updates.qtyInBoq = qtyInBoqNum !== null ? qtyInBoqNum.toString() : null;
    }
    if (item.qtyDone !== undefined) {
      updates.qtyDone = qtyDoneNum !== null ? qtyDoneNum.toString() : null;
    }
    if (item.rate !== undefined) {
      updates.rate = rateNum !== null ? rateNum.toString() : null;
    }
    if (typeof updates.weightedRatio === 'number') {
      updates.weightedRatio = updates.weightedRatio.toString();
    }
    
    // Always update calculated amounts if any related field changed
    if (item.qtyInBoq !== undefined || item.rate !== undefined) {
      updates.amount = amountNum !== null ? amountNum.toString() : null;
    }
    if (item.qtyDone !== undefined || item.rate !== undefined) {
      updates.amountDone = amountDoneNum !== null ? amountDoneNum.toString() : null;
    }
    
    const [result] = await db.update(progressTrackerItems)
      .set(updates)
      .where(eq(progressTrackerItems.id, id))
      .returning();
    return result;
  }
  
  // Pre-commencement checklist operations
  async getPreCommencementItems(projectId: string): Promise<PreCommencementItem[]> {
    return await db.select()
      .from(preCommencementItems)
      .where(eq(preCommencementItems.projectId, projectId))
      .orderBy(preCommencementItems.orderIndex);
  }
  
  async createPreCommencementItem(projectId: string, item: InsertPreCommencementItem): Promise<PreCommencementItem> {
    const [newItem] = await db.insert(preCommencementItems)
      .values({
        ...item,
        projectId,
      })
      .returning();
    return newItem;
  }
  
  async updatePreCommencementItem(id: string, item: Partial<InsertPreCommencementItem>): Promise<PreCommencementItem> {
    const [result] = await db.update(preCommencementItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(preCommencementItems.id, id))
      .returning();
    return result;
  }
  
  async deletePreCommencementItem(id: string): Promise<void> {
    await db.delete(preCommencementItems)
      .where(eq(preCommencementItems.id, id));
  }
  
  async createDefaultChecklistItems(projectId: string): Promise<PreCommencementItem[]> {
    const defaultItems = [
      { itemName: "Insurance Certificate", orderIndex: 0 },
      { itemName: "Performance Bank Guarantee", orderIndex: 1 },
      { itemName: "List of Personnel", orderIndex: 2 },
      { itemName: "CLMP (Contract Labor Management Plan)", orderIndex: 3 },
      { itemName: "CSEMP (Construction Site Environmental Management Plan)", orderIndex: 4 },
      { itemName: "Health & Safety Plan", orderIndex: 5 },
      { itemName: "Environmental Impact Assessment", orderIndex: 6 },
      { itemName: "Tax Clearance Certificate", orderIndex: 7 },
      { itemName: "Equipment Inspection Certificates", orderIndex: 8 },
      { itemName: "Site Possession Handover", orderIndex: 9 },
      { itemName: "Design Drawings Approval", orderIndex: 10 },
      { itemName: "Method Statement Approval", orderIndex: 11 },
      { itemName: "Material Testing Reports", orderIndex: 12 },
      { itemName: "Contractor License/Registration", orderIndex: 13 },
    ];
    
    const createdItems = await db.insert(preCommencementItems)
      .values(defaultItems.map(item => ({
        projectId,
        itemName: item.itemName,
        orderIndex: item.orderIndex,
        status: "pending" as const,
        isDefault: true,
      })))
      .returning();
      
    return createdItems;
  }
  
  // Daily logs operations
  async getDailyLogs(projectId: string): Promise<DailyLog[]> {
    return await db.select()
      .from(dailyLogs)
      .where(eq(dailyLogs.projectId, projectId))
      .orderBy(desc(dailyLogs.date));
  }
  
  async getDailyLog(id: string): Promise<DailyLogWithActionPoints | undefined> {
    const [log] = await db.select()
      .from(dailyLogs)
      .where(eq(dailyLogs.id, id));
      
    if (!log) return undefined;
    
    const logActionPoints = await db.select()
      .from(actionPoints)
      .where(eq(actionPoints.dailyLogId, id))
      .orderBy(actionPoints.createdAt);
    
    return {
      ...log,
      actionPoints: logActionPoints,
    };
  }
  
  async getDailyLogByDate(projectId: string, date: string): Promise<DailyLogWithActionPoints | undefined> {
    const [log] = await db.select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.projectId, projectId),
          eq(dailyLogs.date, date)
        )
      );
      
    if (!log) return undefined;
    
    const logActionPoints = await db.select()
      .from(actionPoints)
      .where(eq(actionPoints.dailyLogId, log.id))
      .orderBy(actionPoints.createdAt);
    
    return {
      ...log,
      actionPoints: logActionPoints,
    };
  }
  
  async createDailyLog(projectId: string, log: InsertDailyLog): Promise<DailyLog> {
    const [newLog] = await db.insert(dailyLogs)
      .values({
        ...log,
        projectId,
      })
      .returning();
    return newLog;
  }
  
  async updateDailyLog(id: string, log: Partial<InsertDailyLog>): Promise<DailyLog> {
    const [result] = await db.update(dailyLogs)
      .set({ ...log, updatedAt: new Date() })
      .where(eq(dailyLogs.id, id))
      .returning();
    return result;
  }
  
  async deleteDailyLog(id: string): Promise<void> {
    // First delete all associated action points
    await db.delete(actionPoints)
      .where(eq(actionPoints.dailyLogId, id));
    
    // Then delete the log
    await db.delete(dailyLogs)
      .where(eq(dailyLogs.id, id));
  }
  
  // Action points operations
  async getActionPoints(projectId: string, status?: string): Promise<ActionPoint[]> {
    const conditions = [eq(actionPoints.projectId, projectId)];
    
    if (status) {
      conditions.push(eq(actionPoints.status, status));
    }
    
    return await db.select()
      .from(actionPoints)
      .where(and(...conditions))
      .orderBy(desc(actionPoints.createdAt));
  }
  
  async getActionPointsByLog(dailyLogId: string): Promise<ActionPoint[]> {
    return await db.select()
      .from(actionPoints)
      .where(eq(actionPoints.dailyLogId, dailyLogId))
      .orderBy(actionPoints.createdAt);
  }
  
  async createActionPoint(projectId: string, dailyLogId: string | null, actionPoint: InsertActionPoint): Promise<ActionPoint> {
    const [newActionPoint] = await db.insert(actionPoints)
      .values({
        ...actionPoint,
        projectId,
        dailyLogId,
      })
      .returning();
    return newActionPoint;
  }
  
  async updateActionPoint(id: string, actionPoint: Partial<InsertActionPoint>): Promise<ActionPoint> {
    const [result] = await db.update(actionPoints)
      .set({ ...actionPoint, updatedAt: new Date() })
      .where(eq(actionPoints.id, id))
      .returning();
    return result;
  }
  
  async deleteActionPoint(id: string): Promise<void> {
    await db.delete(actionPoints)
      .where(eq(actionPoints.id, id));
  }
  
  // Incident report operations (World Bank compliant)
  async getIncidentReports(projectId: string): Promise<IncidentReport[]> {
    return await db.select()
      .from(incidentReports)
      .where(eq(incidentReports.projectId, projectId))
      .orderBy(desc(incidentReports.incidentDateTime));
  }
  
  async getIncidentReport(id: string): Promise<IncidentReport | undefined> {
    const [report] = await db.select()
      .from(incidentReports)
      .where(eq(incidentReports.id, id));
    return report;
  }
  
  async createIncidentReport(projectId: string, report: InsertIncidentReport): Promise<IncidentReport> {
    const [created] = await db.insert(incidentReports)
      .values({
        ...report,
        projectId,
        incidentDateTime: report.incidentDateTime,
        discoveredDateTime: report.discoveredDateTime ?? null,
      })
      .returning();
    return created;
  }
  
  async updateIncidentReport(id: string, report: Partial<InsertIncidentReport>): Promise<IncidentReport> {
    const updateData: Record<string, any> = {
      ...report,
      updatedAt: new Date(),
    };
    
    const [updated] = await db.update(incidentReports)
      .set(updateData)
      .where(eq(incidentReports.id, id))
      .returning();
    return updated;
  }
  
  async deleteIncidentReport(id: string): Promise<void> {
    await db.delete(incidentReports)
      .where(eq(incidentReports.id, id));
  }
  
  async getCriticalIncidents(userId: string): Promise<IncidentReport[]> {
    // Get user's projects first
    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const projectIds = userProjects.map(p => p.id);
    
    if (projectIds.length === 0) {
      return [];
    }
    
    return await db.select()
      .from(incidentReports)
      .where(
        and(
          inArray(incidentReports.projectId, projectIds),
          or(
            eq(incidentReports.classification, 'serious'),
            eq(incidentReports.classification, 'severe')
          ),
          or(
            eq(incidentReports.status, 'draft'),
            eq(incidentReports.status, 'submitted'),
            eq(incidentReports.status, 'under_review')
          )
        )
      )
      .orderBy(desc(incidentReports.incidentDateTime));
  }
  
  // Grievance operations
  async getGrievances(projectId: string): Promise<Grievance[]> {
    return await db.select()
      .from(grievances)
      .where(eq(grievances.projectId, projectId))
      .orderBy(desc(grievances.dateReceived));
  }
  
  async getGrievance(id: string): Promise<Grievance | undefined> {
    const [grievance] = await db.select()
      .from(grievances)
      .where(eq(grievances.id, id));
    return grievance;
  }
  
  async createGrievance(projectId: string, grievance: InsertGrievance): Promise<Grievance> {
    // Auto-generate grievance number
    const count = await db.select({ count: sql`count(*)` })
      .from(grievances)
      .where(eq(grievances.projectId, projectId));
    const grievanceNumber = `GRV-${projectId.substring(0, 4).toUpperCase()}-${String(Number(count[0].count) + 1).padStart(4, '0')}`;
    
    const [created] = await db.insert(grievances)
      .values({
        ...grievance,
        projectId,
        grievanceNumber,
        dateReceived: grievance.dateReceived ?? new Date(),
      })
      .returning();
    return created;
  }
  
  async updateGrievance(id: string, grievance: Partial<InsertGrievance>): Promise<Grievance> {
    const updateData: Record<string, any> = {
      ...grievance,
      updatedAt: new Date(),
    };
    
    const [updated] = await db.update(grievances)
      .set(updateData)
      .where(eq(grievances.id, id))
      .returning();
    return updated;
  }
  
  async deleteGrievance(id: string): Promise<void> {
    await db.delete(grievances)
      .where(eq(grievances.id, id));
  }
  
  async getOpenGrievances(userId: string): Promise<Grievance[]> {
    // Get user's projects first
    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const projectIds = userProjects.map(p => p.id);
    
    if (projectIds.length === 0) {
      return [];
    }
    
    return await db.select()
      .from(grievances)
      .where(
        and(
          inArray(grievances.projectId, projectIds),
          or(
            eq(grievances.status, 'registered'),
            eq(grievances.status, 'acknowledged'),
            eq(grievances.status, 'under_investigation'),
            eq(grievances.status, 'escalated')
          )
        )
      )
      .orderBy(desc(grievances.dateReceived));
  }
  
  // Dashboard operations
  async getDashboardMetrics(userId: string): Promise<import("@shared/schema").DashboardMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setDate(today.getDate() + 30);
    
    // Get all user's projects
    const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));
    const projectIds = userProjects.map(p => p.id);
    
    // Filter active projects (status is Active, On Track, At Risk, or Behind)
    const activeProjectStatuses = ['Active', 'On Track', 'At Risk', 'Behind'];
    const activeProjects = userProjects.filter(p => activeProjectStatuses.includes(p.status));
    
    if (projectIds.length === 0) {
      return {
        financialTotal: 0,
        amountSpent: 0,
        currentBalance: 0,
        projectsBehindSchedule: 0,
        openIncidentReports: { total: 0, severe: 0, serious: 0, indicative: 0 },
        openGrievances: { total: 0, registered: 0, underInvestigation: 0, escalated: 0 },
        upcomingMilestones: 0,
        delayedProjects: [],
        incidentsList: [],
        grievancesList: [],
        activeProjects: [],
      };
    }
    
    // 1. Calculate financial metrics using contractAmount and payment certificates
    // Total Contracts Amount = sum of all contractAmount fields
    const financialTotal = activeProjects.reduce((sum, p) => {
      const contractAmt = parseFloat(p.contractAmount || '0');
      return sum + (isNaN(contractAmt) ? 0 : contractAmt);
    }, 0);
    
    // Get all payment certificates for active projects to calculate IPCs paid
    const allPaymentCerts = await db.select()
      .from(paymentCertificates)
      .where(inArray(paymentCertificates.projectId, activeProjects.map(p => p.id)));
    
    // Amount Spent = total IPCs paid (amountPaid from payment certificates)
    const amountSpent = allPaymentCerts.reduce((sum, cert) => {
      const paid = parseFloat(cert.amountPaid || '0');
      return sum + (isNaN(paid) ? 0 : paid);
    }, 0);
    
    const currentBalance = financialTotal - amountSpent;
    
    // 2. Projects Behind Schedule - those where time lapse > BOQ progress
    const projectsBehind = userProjects.filter(p => p.status === 'Behind' || p.status === 'Delayed').length;
    
    // 3b. Open Incident Reports (World Bank reports not yet closed)
    const allIncidentReports = await db.select()
      .from(incidentReports)
      .where(
        and(
          inArray(incidentReports.projectId, projectIds),
          or(
            eq(incidentReports.status, 'draft'),
            eq(incidentReports.status, 'submitted'),
            eq(incidentReports.status, 'under_review')
          )
        )
      );
    
    const severeIncidents = allIncidentReports.filter(ir => ir.classification === 'severe').length;
    const seriousIncidents = allIncidentReports.filter(ir => ir.classification === 'serious').length;
    const indicativeIncidents = allIncidentReports.filter(ir => ir.classification === 'indicative').length;
    
    // 3c. Open Grievances (not yet resolved or closed)
    const allOpenGrievances = await db.select()
      .from(grievances)
      .where(
        and(
          inArray(grievances.projectId, projectIds),
          or(
            eq(grievances.status, 'registered'),
            eq(grievances.status, 'acknowledged'),
            eq(grievances.status, 'under_investigation'),
            eq(grievances.status, 'escalated')
          )
        )
      );
    
    const registeredGrievances = allOpenGrievances.filter(g => g.status === 'registered' || g.status === 'acknowledged').length;
    const underInvestigationGrievances = allOpenGrievances.filter(g => g.status === 'under_investigation').length;
    const escalatedGrievances = allOpenGrievances.filter(g => g.status === 'escalated').length;
    
    // 4. Upcoming Milestones (next 30 days)
    const upcomingMiles = await db.select()
      .from(workPlanActivities)
      .where(
        and(
          inArray(workPlanActivities.projectId, projectIds),
          eq(workPlanActivities.isMilestone, true)
        )
      );
    
    const upcomingMilestonesCount = upcomingMiles.filter(m => 
      m.endDate && new Date(m.endDate) >= today && new Date(m.endDate) <= oneMonthFromNow
    ).length;
    
    // 5. Get progress for active projects (fetch all roads in one query)
    const activeProjectIds = activeProjects.map(p => p.id);
    let activeProjectsWithRoads: any[] = [];
    
    if (activeProjectIds.length > 0) {
      const allRoads = await db.select()
        .from(roads)
        .where(inArray(roads.projectId, activeProjectIds));
      
      const allRoadIds = allRoads.map(r => r.id);
      
      let allLayers: any[] = [];
      let allLayerProgress: any[] = [];
      
      if (allRoadIds.length > 0) {
        allLayers = await db.select()
          .from(constructionLayers)
          .where(inArray(constructionLayers.roadId, allRoadIds));
        
        const allLayerIds = allLayers.map(l => l.id);
        
        if (allLayerIds.length > 0) {
          allLayerProgress = await db.select()
            .from(layerProgress)
            .where(inArray(layerProgress.layerId, allLayerIds));
        }
      }
      
      // Calculate progress for each project
      activeProjectsWithRoads = activeProjects.map(project => {
        const projectRoads = allRoads.filter(r => r.projectId === project.id);
        let physicalProgress = 0;
        
        if (projectRoads.length > 0) {
          const totalLength = projectRoads.reduce((sum, road) => {
            const len = parseFloat(road.length);
            return sum + (isNaN(len) || len <= 0 ? 0 : len);
          }, 0);
          
          if (totalLength > 0) {
            let weightedProgress = 0;
            
            projectRoads.forEach(road => {
              const roadLength = parseFloat(road.length);
              if (!roadLength || roadLength <= 0 || isNaN(roadLength)) return;
              
              const roadWeight = roadLength / totalLength;
              const roadLayers = allLayers.filter(l => l.roadId === road.id);
              
              if (roadLayers.length > 0) {
                let roadProgress = 0;
                let totalLayerWeight = roadLayers.reduce((sum, l) => sum + (l.weight || 1), 0);
                
                roadLayers.forEach(layer => {
                  const layerWeight = layer.weight || 1;
                  const progress = allLayerProgress.filter(p => p.layerId === layer.id);
                  
                  if (progress.length > 0) {
                    const isDual = road.carriageway === 'dual';
                    if (isDual) {
                      const lhsProgress = progress
                        .filter(p => p.carriagewaySide?.toUpperCase() === 'LHS' || p.carriagewaySide?.toLowerCase() === 'both')
                        .reduce((sum, p) => {
                          const start = parseFloat(p.startChainage as any);
                          const end = parseFloat(p.endChainage as any);
                          return sum + (isNaN(start) || isNaN(end) || end <= start ? 0 : end - start);
                        }, 0);
                      const rhsProgress = progress
                        .filter(p => p.carriagewaySide?.toUpperCase() === 'RHS' || p.carriagewaySide?.toLowerCase() === 'both')
                        .reduce((sum, p) => {
                          const start = parseFloat(p.startChainage as any);
                          const end = parseFloat(p.endChainage as any);
                          return sum + (isNaN(start) || isNaN(end) || end <= start ? 0 : end - start);
                        }, 0);
                      const lhsPct = Math.min(100, (lhsProgress / roadLength) * 100);
                      const rhsPct = Math.min(100, (rhsProgress / roadLength) * 100);
                      roadProgress += ((lhsPct + rhsPct) / 2) * layerWeight;
                    } else {
                      const completed = progress.reduce((sum, p) => {
                        const start = parseFloat(p.startChainage as any);
                        const end = parseFloat(p.endChainage as any);
                        return sum + (isNaN(start) || isNaN(end) || end <= start ? 0 : end - start);
                      }, 0);
                      const layerPct = Math.min(100, (completed / roadLength) * 100);
                      roadProgress += layerPct * layerWeight;
                    }
                  }
                });
                
                if (totalLayerWeight > 0) {
                  weightedProgress += (roadProgress / totalLayerWeight) * roadWeight;
                }
              }
            });
            
            physicalProgress = Math.min(100, Math.max(0, weightedProgress));
          }
        }
        
        // Calculate financial progress
        const budget = parseFloat(project.totalBudget || '0');
        const spent = parseFloat(project.spentAmount || '0');
        const financialProgress = budget > 0 ? Math.min(100, Math.max(0, (spent / budget) * 100)) : 0;
        
        // Calculate time progress
        let timeProgress = 0;
        if (project.startDate && project.endDate) {
          const start = new Date(project.startDate).getTime();
          const end = new Date(project.endDate).getTime();
          const now = today.getTime();
          
          if (end > start) {
            const elapsed = now - start;
            const total = end - start;
            timeProgress = Math.min(100, Math.max(0, (elapsed / total) * 100));
          }
        }
        
        const projectGrievances = allOpenGrievances.filter(g => g.projectId === project.id).length;
        
        return {
          id: project.id,
          name: project.name,
          status: project.status,
          financialProgress: Math.round(financialProgress),
          timeProgress: Math.round(timeProgress),
          physicalProgress: Math.round(physicalProgress),
          dueDate: project.endDate || null,
          openGrievances: projectGrievances,
        };
      });
    }
    
    // Build delayed projects list with time lapse and BOQ progress
    const delayedProjects = activeProjectsWithRoads
      .filter(p => p.timeProgress > p.physicalProgress + 10) // Consider delayed if time > progress + 10%
      .map(p => ({
        id: p.id,
        name: p.name,
        timeLapse: p.timeProgress,
        boqProgress: p.physicalProgress,
      }));
    
    // Build project name lookup
    const projectNameMap = new Map(userProjects.map(p => [p.id, p.name]));
    
    // Build incidents list for modal with full details
    const incidentsList = allIncidentReports.map(ir => ({
      id: ir.id,
      projectId: ir.projectId,
      projectName: projectNameMap.get(ir.projectId) || 'Unknown',
      title: ir.incidentTitle || 'Untitled Incident',
      classification: ir.classification,
      status: ir.status,
      dateOccurred: ir.incidentDateTime ? ir.incidentDateTime.toISOString() : '',
      location: ir.incidentLocation || undefined,
      description: ir.incidentDescription || undefined,
      reportedBy: ir.reportedBy || undefined,
      immediateActions: ir.immediateActions || undefined,
    }));
    
    // Build grievances list for modal with full details
    const grievancesList = allOpenGrievances.map(g => ({
      id: g.id,
      projectId: g.projectId,
      projectName: projectNameMap.get(g.projectId) || 'Unknown',
      title: g.description?.substring(0, 50) + (g.description && g.description.length > 50 ? '...' : '') || 'Untitled Grievance',
      category: g.category,
      status: g.status,
      priority: g.priority || 'medium',
      dateReceived: g.dateReceived ? g.dateReceived.toISOString() : '',
      description: g.description || undefined,
      complainantName: g.complainantName || undefined,
      isAnonymous: g.isAnonymous || false,
      location: g.location || undefined,
      source: g.source || undefined,
    }));
    
    return {
      financialTotal: Math.round(financialTotal * 100) / 100,
      amountSpent: Math.round(amountSpent * 100) / 100,
      currentBalance: Math.round(currentBalance * 100) / 100,
      projectsBehindSchedule: delayedProjects.length, // Use actual delayed count
      openIncidentReports: {
        total: allIncidentReports.length,
        severe: severeIncidents,
        serious: seriousIncidents,
        indicative: indicativeIncidents,
      },
      openGrievances: {
        total: allOpenGrievances.length,
        registered: registeredGrievances,
        underInvestigation: underInvestigationGrievances,
        escalated: escalatedGrievances,
      },
      upcomingMilestones: upcomingMilestonesCount,
      delayedProjects,
      incidentsList,
      grievancesList,
      activeProjects: activeProjectsWithRoads,
    };
  }

  async getProjectAlerts(projectId: string, userId: string): Promise<import("@shared/schema").ProjectAlerts> {
    // Verify user has access to this project
    const project = await this.getProject(projectId, userId);
    if (!project) {
      throw new Error('Project not found or access denied');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // 1. Get milestones (upcoming and overdue)
    const allMilestones = await db.select()
      .from(workPlanActivities)
      .where(
        and(
          eq(workPlanActivities.projectId, projectId),
          eq(workPlanActivities.isMilestone, true)
        )
      )
      .orderBy(workPlanActivities.endDate);

    const upcomingMilestones = [];
    const overdueMilestones = [];

    for (const milestone of allMilestones) {
      if (!milestone.endDate) continue;
      
      const endDate = new Date(milestone.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue
        overdueMilestones.push({
          id: milestone.id,
          activityName: milestone.activityName,
          dueDate: milestone.endDate,
          daysOverdue: Math.abs(diffDays),
        });
      } else if (diffDays <= 7) {
        // Upcoming (within 7 days)
        upcomingMilestones.push({
          id: milestone.id,
          activityName: milestone.activityName,
          dueDate: milestone.endDate,
          daysUntil: diffDays,
        });
      }
    }

    // 2. Get missed action point deadlines (overdue open action points)
    const allActionPoints = await db.select()
      .from(actionPoints)
      .where(
        and(
          eq(actionPoints.projectId, projectId),
          eq(actionPoints.status, 'open')
        )
      )
      .orderBy(actionPoints.dueDate);

    const missedActionPoints = [];

    for (const actionPoint of allActionPoints) {
      if (!actionPoint.dueDate) continue;

      const dueDate = new Date(actionPoint.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue
        missedActionPoints.push({
          id: actionPoint.id,
          description: actionPoint.description,
          assignedTo: actionPoint.assignedTo,
          priority: actionPoint.priority,
          dueDate: actionPoint.dueDate,
          daysOverdue: Math.abs(diffDays),
        });
      }
    }

    // 3. Get critical outstanding safety issues (open high/critical severity)
    const criticalIssues = await db.select()
      .from(safetyIncidents)
      .where(
        and(
          eq(safetyIncidents.projectId, projectId),
          eq(safetyIncidents.status, 'Open')
        )
      )
      .orderBy(safetyIncidents.incidentDate);

    const criticalOutstanding = criticalIssues
      .filter(issue => issue.severity === 'High' || issue.severity === 'Critical')
      .map(issue => {
        const occurredDate = new Date(issue.incidentDate);
        occurredDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - occurredDate.getTime();
        const daysOpen = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: issue.id,
          description: issue.description,
          severity: issue.severity,
          dateOccurred: issue.incidentDate,
          daysOpen: Math.max(0, daysOpen),
        };
      });

    return {
      milestones: {
        upcoming: upcomingMilestones,
        overdue: overdueMilestones,
      },
      actionPoints: missedActionPoints,
      criticalIssues: criticalOutstanding,
    };
  }
}

// Use DatabaseStorage for persistent data
export const storage = new DatabaseStorage();
