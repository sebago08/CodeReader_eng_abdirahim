import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertRoadSchema, 
  insertLayerSchema, 
  insertLayerProgressSchema,
  insertActivitySchema,
  insertSafetyIncidentSchema,
  insertWorkPlanSchema,
  insertWorkPlanActivitySchema,
  insertProjectDocumentSchema,
  progressTrackerItems,
  preCommencementItems,
  insertDailyLogSchema,
  insertActionPointSchema
} from "@shared/schema";
import { ZodError, z } from "zod";
import { setupAuth, supabaseAuthMiddleware } from "./auth";
import { supabase } from "./supabase";
import multer from "multer";
import { getStorageService, getMockStorage } from "./storage-service";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Passport authentication middleware - checks session cookie
const isAuthenticated: RequestHandler = (req: any, res, next) => {
  console.log("Auth check - isAuthenticated:", req.isAuthenticated(), "sessionID:", req.sessionID, "user:", req.user?.id);
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Middleware to check if user is admin (works after isAuthenticated)
const isAdmin: RequestHandler = (req: any, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  next();
};

export function registerRoutes(app: Express): Server {
  // Setup authentication (includes /api/register, /api/login, /api/logout, /api/user routes)
  setupAuth(app);

  // Supabase Auth routes
  // Get current user (protected route - auto-creates profile if needed)
  app.get('/api/auth/me', supabaseAuthMiddleware, async (req: any, res) => {
    res.json(req.user);
  });

  // Dev mode login (only works in development)
  app.post('/api/auth/dev-login', async (req: any, res) => {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ message: 'Dev login only available in development mode' });
    }

    try {
      // Return static dev user for development mode
      // This bypasses database auth completely for easier local development
      const devUser = {
        id: 'dev-user-id',
        authId: 'dev-user-local',
        email: 'dev@constructtrack.local',
        username: 'devuser',
        firstName: 'Dev',
        lastName: 'User',
        password: null,
        isAdmin: true,
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      res.json(devUser);
    } catch (error) {
      console.error('Dev login error:', error);
      res.status(500).json({ message: 'Dev login failed' });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const metrics = await storage.getDashboardMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const project = await storage.getProject(id, userId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(userId, validatedData);
      
      // Create default pre-commencement checklist items for new project
      await storage.createDefaultChecklistItems(project.id);
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Get project alerts (milestones, action points, critical issues)
  app.get('/api/projects/:id/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const alerts = await storage.getProjectAlerts(id, userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching project alerts:", error);
      res.status(500).json({ message: "Failed to fetch project alerts" });
    }
  });

  // Update project dashboard layout
  app.patch('/api/projects/:id/dashboard-layout', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { dashboardLayout } = req.body;
      
      // Validate dashboard layout structure
      const validWidgetIds = ["basic-info", "financial", "progress", "action-points"];
      if (!dashboardLayout || typeof dashboardLayout !== "object") {
        return res.status(400).json({ message: "Invalid dashboard layout" });
      }

      const requiredFields = ["topLeft", "topRight", "bottomLeft", "bottomRight"];
      for (const field of requiredFields) {
        if (!dashboardLayout[field] || !validWidgetIds.includes(dashboardLayout[field])) {
          return res.status(400).json({ message: `Invalid widget ID for ${field}` });
        }
      }
      
      const project = await storage.updateProject(id, userId, { dashboardLayout });
      res.json({ dashboardLayout: project.dashboardLayout });
    } catch (error) {
      console.error("Error updating dashboard layout:", error);
      res.status(500).json({ message: "Failed to update dashboard layout" });
    }
  });

  app.patch('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, userId, validatedData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      await storage.deleteProject(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.post('/api/projects/:id/duplicate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const originalProject = await storage.getProject(id, userId);
      
      if (!originalProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const duplicatedProject = await storage.createProject(userId, {
        name: `${originalProject.name} (Copy)`,
        client: originalProject.client,
        location: originalProject.location,
        description: originalProject.description,
        startDate: originalProject.startDate,
        endDate: originalProject.endDate,
      });
      
      // Duplicate roads and layers if they exist
      for (const road of originalProject.roads) {
        const newRoad = await storage.createRoad(duplicatedProject.id, {
          name: road.name,
          length: Number(road.length),
          roadType: road.roadType,
          carriageway: road.carriageway || "single",
        });
        
        if (road.layers.length > 0) {
          await storage.createLayers(newRoad.id, road.layers.map(layer => ({
            name: layer.name,
            weight: layer.weight,
          })));
        }
      }
      
      res.status(201).json(duplicatedProject);
    } catch (error) {
      console.error("Error duplicating project:", error);
      res.status(500).json({ message: "Failed to duplicate project" });
    }
  });

  // Road routes
  app.post('/api/projects/:projectId/roads', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const { layers, ...roadData } = req.body;
      const validatedRoadData = insertRoadSchema.parse(roadData);
      
      const road = await storage.createRoad(projectId, validatedRoadData);
      
      // Create layers if provided
      if (layers && layers.length > 0) {
        const validatedLayers = layers.map((layer: any) => insertLayerSchema.parse(layer));
        await storage.createLayers(road.id, validatedLayers);
      }
      
      res.status(201).json(road);
    } catch (error) {
      console.error("Error creating road:", error);
      res.status(500).json({ message: "Failed to create road" });
    }
  });

  app.patch('/api/roads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { layers, ...roadData } = req.body;
      const validatedData = insertRoadSchema.partial().parse(roadData);
      
      const road = await storage.updateRoad(id, validatedData);
      
      // Update layers if provided
      if (layers !== undefined) {
        // First, validate all incoming layers to prevent data loss
        const validatedLayers = layers.length > 0 
          ? layers.map((layer: any) => insertLayerSchema.parse(layer))
          : [];
        
        // Only after validation succeeds, get existing layers
        const existingLayers = await storage.getLayersByRoadId(id);
        
        // Delete all existing layers
        for (const layer of existingLayers) {
          await storage.deleteLayer(layer.id);
        }
        
        // Then create new validated layers
        if (validatedLayers.length > 0) {
          await storage.createLayers(road.id, validatedLayers);
        }
      }
      
      res.json(road);
    } catch (error) {
      console.error("Error updating road:", error);
      res.status(500).json({ message: "Failed to update road" });
    }
  });

  app.delete('/api/roads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRoad(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting road:", error);
      res.status(500).json({ message: "Failed to delete road" });
    }
  });

  app.post('/api/roads/:id/duplicate', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get the original road with layers
      const projects = await storage.getProjects(req.user.id);
      let originalRoad: any = null;
      let projectId: string = '';
      
      for (const project of projects) {
        const road = project.roads.find((r: any) => r.id === id);
        if (road) {
          originalRoad = road;
          projectId = project.id;
          break;
        }
      }
      
      if (!originalRoad) {
        return res.status(404).json({ message: "Road not found" });
      }
      
      // Create duplicate road with " (Copy)" suffix
      const duplicatedRoad = await storage.createRoad(projectId, {
        name: `${originalRoad.name} (Copy)`,
        length: Number(originalRoad.length),
        roadType: originalRoad.roadType,
        carriageway: originalRoad.carriageway || "single",
      });
      
      // Duplicate layers if they exist
      if (originalRoad.layers && originalRoad.layers.length > 0) {
        await storage.createLayers(
          duplicatedRoad.id,
          originalRoad.layers.map((layer: any) => ({
            name: layer.name,
            weight: layer.weight || 1,
          }))
        );
      }
      
      res.status(201).json(duplicatedRoad);
    } catch (error) {
      console.error("Error duplicating road:", error);
      res.status(500).json({ message: "Failed to duplicate road" });
    }
  });

  // Progress routes
  app.post('/api/layers/:layerId/progress', isAuthenticated, async (req: any, res) => {
    try {
      const { layerId } = req.params;
      const validatedData = insertLayerProgressSchema.parse(req.body);
      const progress = await storage.createLayerProgress(layerId, validatedData);
      res.status(201).json(progress);
    } catch (error) {
      console.error("Error creating layer progress:", error);
      res.status(500).json({ message: "Failed to create layer progress" });
    }
  });

  app.patch('/api/progress/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertLayerProgressSchema.partial().parse(req.body);
      const progress = await storage.updateLayerProgress(id, validatedData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating layer progress:", error);
      res.status(500).json({ message: "Failed to update layer progress" });
    }
  });

  app.delete('/api/progress/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLayerProgress(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting layer progress:", error);
      res.status(500).json({ message: "Failed to delete layer progress" });
    }
  });

  app.delete('/api/layers/:layerId/progress/reset', isAuthenticated, async (req: any, res) => {
    try {
      const { layerId } = req.params;
      await storage.resetLayerProgress(layerId);
      res.status(204).send();
    } catch (error) {
      console.error("Error resetting layer progress:", error);
      res.status(500).json({ message: "Failed to reset layer progress" });
    }
  });

  // Activity routes
  app.get('/api/projects/:projectId/activities', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const activities = await storage.getActivities(projectId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post('/api/projects/:projectId/activities', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(projectId, validatedData);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  app.patch('/api/activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertActivitySchema.partial().parse(req.body);
      const activity = await storage.updateActivity(id, validatedData);
      res.json(activity);
    } catch (error) {
      console.error("Error updating activity:", error);
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.delete('/api/activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteActivity(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Safety incident routes
  app.get('/api/projects/:projectId/safety-incidents', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const incidents = await storage.getSafetyIncidents(projectId);
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching safety incidents:", error);
      res.status(500).json({ message: "Failed to fetch safety incidents" });
    }
  });

  app.post('/api/projects/:projectId/safety-incidents', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertSafetyIncidentSchema.parse(req.body);
      const incident = await storage.createSafetyIncident(projectId, validatedData);
      res.status(201).json(incident);
    } catch (error) {
      console.error("Error creating safety incident:", error);
      res.status(500).json({ message: "Failed to create safety incident" });
    }
  });

  app.patch('/api/safety-incidents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSafetyIncidentSchema.partial().parse(req.body);
      const incident = await storage.updateSafetyIncident(id, validatedData);
      res.json(incident);
    } catch (error) {
      console.error("Error updating safety incident:", error);
      res.status(500).json({ message: "Failed to update safety incident" });
    }
  });

  app.delete('/api/safety-incidents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSafetyIncident(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting safety incident:", error);
      res.status(500).json({ message: "Failed to delete safety incident" });
    }
  });

  // Bootstrap endpoint to create first admin (protected by secret key)
  app.post('/api/bootstrap/promote-admin', async (req: any, res) => {
    try {
      const { username, secret } = req.body;
      
      // Check if secret matches
      const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET || 'constructtrack-admin-2024';
      
      if (secret !== BOOTSTRAP_SECRET) {
        return res.status(403).json({ message: "Invalid secret" });
      }
      
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      const user = await storage.promoteToAdmin(username);
      res.json({ message: "User promoted to admin successfully", user: { username: user.username, isAdmin: user.isAdmin } });
    } catch (error: any) {
      console.error("Error promoting user to admin:", error);
      res.status(500).json({ message: error.message || "Failed to promote user" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users/:id/approve', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = await storage.approveUser(id);
      res.json(user);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  app.delete('/api/admin/users/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.rejectUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Failed to reject user" });
    }
  });

  // Team collaboration routes
  // Get project members
  app.get('/api/projects/:projectId/members', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      
      // Check if user has access to this project
      const role = await storage.getUserProjectRole(userId, projectId);
      if (!role) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const members = await storage.getProjectMembers(projectId);
      
      // Also get the project owner info
      const project = await storage.getProject(projectId, userId);
      const owner = project ? await storage.getUser(project.userId) : null;
      
      res.json({ members, owner });
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  // Invite user to project (by username)
  app.post('/api/projects/:projectId/members/invite', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const { username } = req.body;
      const userId = req.user.id;
      
      // Only owner can invite
      const project = await storage.getProject(projectId, userId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Only project owner can invite members" });
      }
      
      // Find user by username
      const invitedUser = await storage.getUserByUsername(username);
      if (!invitedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if already a member
      const existingRole = await storage.getUserProjectRole(invitedUser.id, projectId);
      if (existingRole) {
        return res.status(400).json({ message: "User is already a member" });
      }
      
      // Add user directly as collaborator (simplified - no invitation workflow)
      const member = await storage.addProjectMember({
        projectId,
        userId: invitedUser.id,
        role: 'collaborator',
        addedBy: userId,
      });
      
      res.status(201).json({ message: "User added successfully", member });
    } catch (error: any) {
      console.error("Error inviting user:", error);
      res.status(500).json({ message: error.message || "Failed to invite user" });
    }
  });

  // Remove member from project
  app.delete('/api/projects/:projectId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, memberId } = req.params;
      const userId = req.user.id;
      
      // Only owner can remove members
      const project = await storage.getProject(projectId, userId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Only project owner can remove members" });
      }
      
      await storage.removeProjectMember(memberId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Client personnel routes
  app.get('/api/projects/:projectId/client-personnel', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const personnel = await storage.getClientPersonnel(projectId);
      res.json(personnel);
    } catch (error) {
      console.error("Error fetching client personnel:", error);
      res.status(500).json({ message: "Failed to fetch client personnel" });
    }
  });

  app.post('/api/projects/:projectId/client-personnel', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const personnel = await storage.createClientPersonnel(projectId, req.body);
      res.status(201).json(personnel);
    } catch (error) {
      console.error("Error creating client personnel:", error);
      res.status(500).json({ message: "Failed to create client personnel" });
    }
  });

  app.patch('/api/client-personnel/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const personnel = await storage.updateClientPersonnel(id, req.body);
      res.json(personnel);
    } catch (error) {
      console.error("Error updating client personnel:", error);
      res.status(500).json({ message: "Failed to update client personnel" });
    }
  });

  app.delete('/api/client-personnel/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClientPersonnel(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client personnel:", error);
      res.status(500).json({ message: "Failed to delete client personnel" });
    }
  });

  // Contractor personnel routes
  app.get('/api/projects/:projectId/contractor-personnel', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const personnel = await storage.getContractorPersonnel(projectId);
      res.json(personnel);
    } catch (error) {
      console.error("Error fetching contractor personnel:", error);
      res.status(500).json({ message: "Failed to fetch contractor personnel" });
    }
  });

  app.post('/api/projects/:projectId/contractor-personnel', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const personnel = await storage.createContractorPersonnel(projectId, req.body);
      res.status(201).json(personnel);
    } catch (error) {
      console.error("Error creating contractor personnel:", error);
      res.status(500).json({ message: "Failed to create contractor personnel" });
    }
  });

  app.patch('/api/contractor-personnel/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const personnel = await storage.updateContractorPersonnel(id, req.body);
      res.json(personnel);
    } catch (error) {
      console.error("Error updating contractor personnel:", error);
      res.status(500).json({ message: "Failed to update contractor personnel" });
    }
  });

  app.delete('/api/contractor-personnel/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteContractorPersonnel(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contractor personnel:", error);
      res.status(500).json({ message: "Failed to delete contractor personnel" });
    }
  });

  // Contractor equipment routes
  app.get('/api/projects/:projectId/contractor-equipment', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const equipment = await storage.getContractorEquipment(projectId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching contractor equipment:", error);
      res.status(500).json({ message: "Failed to fetch contractor equipment" });
    }
  });

  app.post('/api/projects/:projectId/contractor-equipment', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const equipment = await storage.createContractorEquipment(projectId, req.body);
      res.status(201).json(equipment);
    } catch (error) {
      console.error("Error creating contractor equipment:", error);
      res.status(500).json({ message: "Failed to create contractor equipment" });
    }
  });

  app.patch('/api/contractor-equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const equipment = await storage.updateContractorEquipment(id, req.body);
      res.json(equipment);
    } catch (error) {
      console.error("Error updating contractor equipment:", error);
      res.status(500).json({ message: "Failed to update contractor equipment" });
    }
  });

  app.delete('/api/contractor-equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteContractorEquipment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contractor equipment:", error);
      res.status(500).json({ message: "Failed to delete contractor equipment" });
    }
  });

  // Payment certificates routes
  app.get('/api/projects/:projectId/payment-certificates', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const certificates = await storage.getPaymentCertificates(projectId);
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching payment certificates:", error);
      res.status(500).json({ message: "Failed to fetch payment certificates" });
    }
  });

  app.post('/api/projects/:projectId/payment-certificates', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const certificate = await storage.createPaymentCertificate(projectId, req.body);
      res.status(201).json(certificate);
    } catch (error) {
      console.error("Error creating payment certificate:", error);
      res.status(500).json({ message: "Failed to create payment certificate" });
    }
  });

  app.patch('/api/payment-certificates/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const certificate = await storage.updatePaymentCertificate(id, req.body);
      res.json(certificate);
    } catch (error) {
      console.error("Error updating payment certificate:", error);
      res.status(500).json({ message: "Failed to update payment certificate" });
    }
  });

  app.delete('/api/payment-certificates/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePaymentCertificate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment certificate:", error);
      res.status(500).json({ message: "Failed to delete payment certificate" });
    }
  });

  // Update certificate status (moves amount to correct column)
  app.patch('/api/payment-certificates/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Get current certificate to calculate the total amount
      const certificate = await storage.getPaymentCertificateById(id);
      if (!certificate) {
        return res.status(404).json({ message: "Certificate not found" });
      }
      
      // Calculate total amount (sum of all three columns)
      const totalAmount = (
        parseFloat(certificate.pendingAmount || "0") +
        parseFloat(certificate.inProcessAmount || "0") +
        parseFloat(certificate.amountPaid || "0")
      ).toString();
      
      // Map amount to correct column based on new status
      const pendingAmount = status === "Submitted" ? totalAmount : "0";
      const inProcessAmount = status === "In Process" ? totalAmount : "0";
      const amountPaid = status === "Paid" ? totalAmount : "0";
      
      // Update the certificate with new status and amounts
      const updatedCertificate = await storage.updatePaymentCertificate(id, {
        paymentStatus: status,
        pendingAmount,
        inProcessAmount,
        amountPaid,
      });
      
      res.json(updatedCertificate);
    } catch (error) {
      console.error("Error updating payment certificate status:", error);
      res.status(500).json({ message: "Failed to update payment certificate status" });
    }
  });

  // Update advance payment
  app.patch('/api/projects/:projectId/advance-payment', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { advancePayment } = req.body;
      const userId = req.user!.id;
      const project = await storage.updateProject(projectId, userId, { advancePayment });
      res.json(project);
    } catch (error) {
      console.error("Error updating advance payment:", error);
      res.status(500).json({ message: "Failed to update advance payment" });
    }
  });

  // Work Plan Routes
  app.get('/api/projects/:projectId/work-plans', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const workPlans = await storage.getWorkPlans(projectId);
      res.json(workPlans);
    } catch (error) {
      console.error("Error fetching work plans:", error);
      res.status(500).json({ message: "Failed to fetch work plans" });
    }
  });

  app.post('/api/projects/:projectId/work-plans', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const validated = insertWorkPlanSchema.parse(req.body);
      
      const workPlan = await storage.createWorkPlan(projectId, validated);
      res.status(201).json(workPlan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating work plan:", error);
      res.status(500).json({ message: "Failed to create work plan" });
    }
  });

  app.patch('/api/work-plans/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Get the work plan to verify access
      const workPlan = await storage.getWorkPlan(id);
      if (!workPlan) {
        return res.status(404).json({ message: "Work plan not found" });
      }
      
      // Verify user has access to the work plan's project
      const project = await storage.getProject(workPlan.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const validated = insertWorkPlanSchema.partial().parse(req.body);
      
      const updatedWorkPlan = await storage.updateWorkPlan(id, validated);
      res.json(updatedWorkPlan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating work plan:", error);
      res.status(500).json({ message: "Failed to update work plan" });
    }
  });

  app.get('/api/work-plans/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Get the work plan
      const workPlan = await storage.getWorkPlan(id);
      if (!workPlan) {
        return res.status(404).json({ message: "Work plan not found" });
      }
      
      // Verify user has access to the work plan's project
      const project = await storage.getProject(workPlan.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      res.json(workPlan);
    } catch (error) {
      console.error("Error fetching work plan:", error);
      res.status(500).json({ message: "Failed to fetch work plan" });
    }
  });

  app.delete('/api/work-plans/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Get the work plan to verify access
      const workPlan = await storage.getWorkPlan(id);
      if (!workPlan) {
        return res.status(404).json({ message: "Work plan not found" });
      }
      
      // Verify user has access to the work plan's project
      const project = await storage.getProject(workPlan.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      await storage.deleteWorkPlan(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work plan:", error);
      res.status(500).json({ message: "Failed to delete work plan" });
    }
  });

  // Get activities for a specific work plan
  app.get('/api/work-plans/:workPlanId/activities', isAuthenticated, async (req, res) => {
    try {
      const { workPlanId } = req.params;
      const userId = req.user!.id;
      
      // Get the work plan to verify access
      const workPlan = await storage.getWorkPlan(workPlanId);
      if (!workPlan) {
        return res.status(404).json({ message: "Work plan not found" });
      }
      
      // Verify user has access to the work plan's project
      const project = await storage.getProject(workPlan.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const activities = await storage.getWorkPlanActivities(workPlan.projectId, workPlanId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching work plan activities:", error);
      res.status(500).json({ message: "Failed to fetch work plan activities" });
    }
  });

  // Create activity for a specific work plan
  app.post('/api/work-plans/:workPlanId/activities', isAuthenticated, async (req, res) => {
    try {
      const { workPlanId } = req.params;
      const userId = req.user!.id;
      
      // Get the work plan to verify access
      const workPlan = await storage.getWorkPlan(workPlanId);
      if (!workPlan) {
        return res.status(404).json({ message: "Work plan not found" });
      }
      
      // Verify user has access to the work plan's project
      const project = await storage.getProject(workPlan.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const validated = insertWorkPlanActivitySchema.parse({
        ...req.body,
        workPlanId,
      });
      
      const activity = await storage.createWorkPlanActivity(workPlan.projectId, validated);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating work plan activity:", error);
      res.status(500).json({ message: "Failed to create work plan activity" });
    }
  });

  // Work Plan Activity Routes
  app.get('/api/projects/:projectId/work-plan-activities', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const { workPlanId } = req.query;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const activities = await storage.getWorkPlanActivities(projectId, workPlanId as string | undefined);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching work plan activities:", error);
      res.status(500).json({ message: "Failed to fetch work plan activities" });
    }
  });

  app.post('/api/projects/:projectId/work-plan-activities', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const validated = insertWorkPlanActivitySchema.parse(req.body);
      
      let activityData;
      
      // If it's a section header, don't calculate dates
      if (validated.itemType === 'section') {
        activityData = {
          itemType: validated.itemType,
          activityName: validated.activityName,
          orderIndex: validated.orderIndex,
          isMilestone: false,
        };
      } else {
        // For activities, recalculate end date server-side (duration - 1 days from start)
        if (!validated.startDate || !validated.duration) {
          return res.status(400).json({ message: "Activities must have start date and duration" });
        }
        const startDate = new Date(validated.startDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + (validated.duration - 1));
        
        activityData = {
          ...validated,
          startDate: validated.startDate,
          duration: validated.duration,
          endDate: endDate.toISOString().split('T')[0],
        };
      }
      
      const activity = await storage.createWorkPlanActivity(projectId, activityData);
      res.status(201).json(activity);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating work plan activity:", error);
      res.status(500).json({ message: "Failed to create work plan activity" });
    }
  });

  app.delete('/api/work-plan-activities/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Get the activity to find its project
      const activity = await storage.getWorkPlanActivityById(id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Verify user has access to the activity's project
      const project = await storage.getProject(activity.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      await storage.deleteWorkPlanActivity(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work plan activity:", error);
      res.status(500).json({ message: "Failed to delete work plan activity" });
    }
  });

  app.patch('/api/work-plan-activities/:id/milestone', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Validate request body
      const milestoneSchema = z.object({
        isMilestone: z.boolean(),
      });
      const { isMilestone } = milestoneSchema.parse(req.body);
      
      // Get the activity to find its project
      const activity = await storage.getWorkPlanActivityById(id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Verify user has access to the activity's project
      const project = await storage.getProject(activity.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const updatedActivity = await storage.toggleWorkPlanMilestone(id, isMilestone);
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error toggling milestone:", error);
      res.status(500).json({ message: "Failed to toggle milestone" });
    }
  });

  app.post('/api/work-plan-activities/:targetId/insert-section', isAuthenticated, async (req, res) => {
    try {
      const { targetId } = req.params;
      const userId = req.user!.id;
      
      // Validate request body
      const insertSchema = z.object({
        position: z.enum(['above', 'below']),
        sectionName: z.string().min(1),
      });
      const { position, sectionName } = insertSchema.parse(req.body);
      
      // Get the target activity to find its project and orderIndex
      const targetActivity = await storage.getWorkPlanActivityById(targetId);
      if (!targetActivity) {
        return res.status(404).json({ message: "Target activity not found" });
      }
      
      // Verify user has access to the activity's project
      const project = await storage.getProject(targetActivity.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Insert section and reorder atomically
      const newSection = await storage.insertSectionAtPosition(
        targetActivity.projectId,
        targetActivity.orderIndex,
        position,
        sectionName
      );
      
      res.json(newSection);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error inserting section:", error);
      res.status(500).json({ message: "Failed to insert section" });
    }
  });

  app.post('/api/work-plan-activities/:targetId/insert-activity', isAuthenticated, async (req, res) => {
    try {
      const { targetId } = req.params;
      const userId = req.user!.id;
      
      // Validate request body
      const insertSchema = z.object({
        position: z.enum(['above', 'below']),
        activityName: z.string().min(1),
        startDate: z.string().optional(),
        duration: z.number().optional(),
        endDate: z.string().optional(),
      });
      const { position, ...activityData } = insertSchema.parse(req.body);
      
      // Get the target activity to find its project and orderIndex
      const targetActivity = await storage.getWorkPlanActivityById(targetId);
      if (!targetActivity) {
        return res.status(404).json({ message: "Target activity not found" });
      }
      
      // Verify user has access to the activity's project
      const project = await storage.getProject(targetActivity.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Insert activity and reorder atomically
      // Preserve the parent section ID if the target is an activity
      const newActivity = await storage.insertActivityAtPosition(
        targetActivity.projectId,
        targetActivity.orderIndex,
        position,
        {
          ...activityData,
          itemType: "activity",
          isMilestone: false,
          orderIndex: 0, // Will be overridden by insertActivityAtPosition
          parentSectionId: targetActivity.itemType === "activity" ? targetActivity.parentSectionId : null,
        }
      );
      
      res.json(newActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error inserting activity:", error);
      res.status(500).json({ message: "Failed to insert activity" });
    }
  });

  app.patch('/api/work-plan-activities/:id/name', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Validate request body
      const nameSchema = z.object({
        activityName: z.string().min(1),
      });
      const { activityName } = nameSchema.parse(req.body);
      
      // Get the activity to find its project
      const activity = await storage.getWorkPlanActivityById(id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Verify user has access to the activity's project
      const project = await storage.getProject(activity.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const updatedActivity = await storage.updateWorkPlanActivityName(id, activityName);
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating activity name:", error);
      res.status(500).json({ message: "Failed to update activity name" });
    }
  });

  app.patch('/api/work-plan-activities/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Validate request body
      const updateSchema = z.object({
        activityName: z.string().optional(),
        duration: z.number().min(1).nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
      });
      const updates = updateSchema.parse(req.body);
      
      // Get the activity to find its project
      const activity = await storage.getWorkPlanActivityById(id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      // Verify user has access to the activity's project
      const project = await storage.getProject(activity.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const updatedActivity = await storage.updateWorkPlanActivity(id, updates);
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating work plan activity:", error);
      res.status(500).json({ message: "Failed to update work plan activity" });
    }
  });

  // Progress Tracker Routes
  app.get('/api/projects/:projectId/progress-trackers', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const trackers = await storage.getProgressTrackers(projectId);
      res.json(trackers);
    } catch (error) {
      console.error("Error fetching progress trackers:", error);
      res.status(500).json({ message: "Failed to fetch progress trackers" });
    }
  });

  app.get('/api/progress-trackers/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const tracker = await storage.getProgressTracker(id);
      if (!tracker) {
        return res.status(404).json({ message: "Progress tracker not found" });
      }
      
      // Verify user has access to the tracker's project
      const project = await storage.getProject(tracker.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      res.json(tracker);
    } catch (error) {
      console.error("Error fetching progress tracker:", error);
      res.status(500).json({ message: "Failed to fetch progress tracker" });
    }
  });

  app.post('/api/projects/:projectId/progress-trackers', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const createSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        workPlanId: z.string().optional(),
      });
      const validated = createSchema.parse(req.body);
      
      // Get activities from the work plan if provided
      let activities: any[] = [];
      if (validated.workPlanId) {
        console.log(`Fetching activities for work plan: ${validated.workPlanId}`);
        activities = await storage.getWorkPlanActivities(projectId, validated.workPlanId);
        console.log(`Found ${activities.length} activities for specific work plan`);
        
        // Fallback: if work plan has no activities, use all project activities
        if (activities.length === 0) {
          console.log('Work plan has no activities, falling back to all project activities');
          activities = await storage.getWorkPlanActivities(projectId); // Get all activities for project
          console.log(`Fallback found ${activities.length} total project activities`);
        }
      } else {
        console.log('No work plan ID provided, fetching all project activities');
        activities = await storage.getWorkPlanActivities(projectId);
        console.log(`Found ${activities.length} project activities`);
      }
      
      const tracker = await storage.createProgressTracker(projectId, validated, activities);
      console.log(`Created tracker with ${tracker.items.length} items`);
      res.status(201).json(tracker);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating progress tracker:", error);
      res.status(500).json({ message: "Failed to create progress tracker" });
    }
  });

  app.patch('/api/progress-trackers/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const tracker = await storage.getProgressTracker(id);
      if (!tracker) {
        return res.status(404).json({ message: "Progress tracker not found" });
      }
      
      // Verify user has access to the tracker's project
      const project = await storage.getProject(tracker.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      });
      const validated = updateSchema.parse(req.body);
      
      const updated = await storage.updateProgressTracker(id, validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating progress tracker:", error);
      res.status(500).json({ message: "Failed to update progress tracker" });
    }
  });

  app.delete('/api/progress-trackers/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const tracker = await storage.getProgressTracker(id);
      if (!tracker) {
        return res.status(404).json({ message: "Progress tracker not found" });
      }
      
      // Verify user has access to the tracker's project
      const project = await storage.getProject(tracker.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      await storage.deleteProgressTracker(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting progress tracker:", error);
      res.status(500).json({ message: "Failed to delete progress tracker" });
    }
  });

  app.patch('/api/progress-tracker-items/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      // Get the item to find its tracker and project
      const items = await db.select()
        .from(progressTrackerItems)
        .where(eq(progressTrackerItems.id, id))
        .limit(1);
      
      if (items.length === 0) {
        return res.status(404).json({ message: "Progress tracker item not found" });
      }
      
      const item = items[0];
      
      // Verify user has access to the item's project
      const project = await storage.getProject(item.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const updateSchema = z.object({
        qtyInBoq: z.number().optional(),
        qtyDone: z.number().optional(),
        weightedRatio: z.number().optional(),
        description: z.string().optional(),
      });
      const validated = updateSchema.parse(req.body);
      
      const updated = await storage.updateProgressTrackerItem(id, validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating progress tracker item:", error);
      res.status(500).json({ message: "Failed to update progress tracker item" });
    }
  });

  // Pre-Commencement Checklist Routes
  app.get('/api/projects/:projectId/pre-commencement', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const items = await storage.getPreCommencementItems(projectId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching pre-commencement items:", error);
      res.status(500).json({ message: "Failed to fetch pre-commencement items" });
    }
  });

  app.post('/api/projects/:projectId/pre-commencement', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const createSchema = z.object({
        itemName: z.string().min(1),
        status: z.enum(['pending', 'submitted', 'approved', 'rejected']).default('pending'),
        deadline: z.string().optional(),
        dateSubmitted: z.string().optional(),
        responsibleParty: z.string().optional(),
        notes: z.string().optional(),
        fileUrl: z.string().optional(),
        isDefault: z.boolean().default(false),
        orderIndex: z.number(),
      });
      const validated = createSchema.parse(req.body);
      
      const item = await storage.createPreCommencementItem(projectId, validated);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating pre-commencement item:", error);
      res.status(500).json({ message: "Failed to create pre-commencement item" });
    }
  });

  app.patch('/api/pre-commencement/:itemId', isAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user!.id;
      
      // Get the item to verify access
      const items = await db.select()
        .from(preCommencementItems)
        .where(eq(preCommencementItems.id, itemId))
        .limit(1);
      
      if (items.length === 0) {
        return res.status(404).json({ message: "Pre-commencement item not found" });
      }
      
      const item = items[0];
      
      // Verify user has access to the item's project
      const project = await storage.getProject(item.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const updateSchema = z.object({
        itemName: z.string().min(1).optional(),
        status: z.enum(['pending', 'submitted', 'approved', 'rejected']).optional(),
        deadline: z.string().optional().nullable(),
        dateSubmitted: z.string().optional().nullable(),
        responsibleParty: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        fileUrl: z.string().optional().nullable(),
        orderIndex: z.number().optional(),
      });
      const validated = updateSchema.parse(req.body);
      
      const updated = await storage.updatePreCommencementItem(itemId, validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating pre-commencement item:", error);
      res.status(500).json({ message: "Failed to update pre-commencement item" });
    }
  });

  app.delete('/api/pre-commencement/:itemId', isAuthenticated, async (req, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user!.id;
      
      // Get the item to verify access
      const items = await db.select()
        .from(preCommencementItems)
        .where(eq(preCommencementItems.id, itemId))
        .limit(1);
      
      if (items.length === 0) {
        return res.status(404).json({ message: "Pre-commencement item not found" });
      }
      
      const item = items[0];
      
      // Verify user has access to the item's project
      const project = await storage.getProject(item.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      await storage.deletePreCommencementItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pre-commencement item:", error);
      res.status(500).json({ message: "Failed to delete pre-commencement item" });
    }
  });

  // Project Document Routes
  app.get('/api/projects/:projectId/documents', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const documents = await storage.getProjectDocuments(projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching project documents:", error);
      res.status(500).json({ message: "Failed to fetch project documents" });
    }
  });

  app.post('/api/projects/:projectId/documents', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const validated = insertProjectDocumentSchema.parse(req.body);
      
      const document = await storage.createDocument(projectId, userId, validated);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Verify user has access to the document's project
      const project = await storage.getProject(document.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.patch('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { documentName, customContent } = req.body;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Verify user has access to the document's project
      const project = await storage.getProject(document.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const updatedDocument = await storage.updateDocument(id, {
        documentName,
        customContent,
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Verify user has access to the document's project
      const project = await storage.getProject(document.projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      await storage.deleteDocument(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // File storage routes
  const upload = multer({ storage: multer.memoryStorage() });
  const storageService = getStorageService();

  // Upload file
  app.post('/api/storage/:bucket/:path(*)', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const { bucket, path } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const result = await storageService.uploadFile(
        bucket,
        path,
        req.file.buffer,
        req.file.mimetype
      );

      if (result.error) {
        return res.status(500).json({ message: result.error });
      }

      res.json({ url: result.url });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  // Download/view file
  app.get('/api/storage/:bucket/:path(*)', async (req, res) => {
    try {
      const { bucket, path } = req.params;
      
      // For mock storage in development
      const mockStorage = getMockStorage();
      const file = mockStorage.getFile(bucket, path);
      
      if (file) {
        res.setHeader('Content-Type', file.contentType);
        return res.send(file.buffer);
      }
      
      // For Supabase storage, redirect to public URL
      const url = storageService.getPublicUrl(bucket, path);
      res.redirect(url);
    } catch (error: any) {
      console.error("Error retrieving file:", error);
      res.status(500).json({ message: error.message || "Failed to retrieve file" });
    }
  });

  // Daily Logs Routes
  app.get('/api/projects/:projectId/daily-logs', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Get all logs for the project
      const logs = await storage.getDailyLogs(projectId);
      
      // For each log, fetch its action points
      const logsWithActionPoints = await Promise.all(
        logs.map(async (log) => {
          const actionPoints = await storage.getActionPointsByLog(log.id);
          return {
            ...log,
            actionPoints,
          };
        })
      );
      
      res.json(logsWithActionPoints);
    } catch (error) {
      console.error("Error fetching daily logs:", error);
      res.status(500).json({ message: "Failed to fetch daily logs" });
    }
  });

  app.get('/api/daily-logs/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const log = await storage.getDailyLog(id);
      
      if (!log) {
        return res.status(404).json({ message: "Daily log not found" });
      }
      
      res.json(log);
    } catch (error) {
      console.error("Error fetching daily log:", error);
      res.status(500).json({ message: "Failed to fetch daily log" });
    }
  });

  app.get('/api/projects/:projectId/daily-logs/date/:date', isAuthenticated, async (req, res) => {
    try {
      const { projectId, date } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const log = await storage.getDailyLogByDate(projectId, date);
      res.json(log || null);
    } catch (error) {
      console.error("Error fetching daily log by date:", error);
      res.status(500).json({ message: "Failed to fetch daily log" });
    }
  });

  app.post('/api/projects/:projectId/daily-logs', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const validated = insertDailyLogSchema.parse(req.body);
      
      const log = await storage.createDailyLog(projectId, validated);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating daily log:", error);
      res.status(500).json({ message: "Failed to create daily log" });
    }
  });

  app.patch('/api/daily-logs/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body
      const validated = insertDailyLogSchema.partial().parse(req.body);
      
      const log = await storage.updateDailyLog(id, validated);
      res.json(log);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating daily log:", error);
      res.status(500).json({ message: "Failed to update daily log" });
    }
  });

  app.delete('/api/daily-logs/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDailyLog(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting daily log:", error);
      res.status(500).json({ message: "Failed to delete daily log" });
    }
  });

  // Action Points Routes
  app.get('/api/projects/:projectId/action-points', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      const status = req.query.status as string | undefined;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const actionPoints = await storage.getActionPoints(projectId, status);
      res.json(actionPoints);
    } catch (error) {
      console.error("Error fetching action points:", error);
      res.status(500).json({ message: "Failed to fetch action points" });
    }
  });

  app.get('/api/daily-logs/:dailyLogId/action-points', isAuthenticated, async (req, res) => {
    try {
      const { dailyLogId } = req.params;
      const actionPoints = await storage.getActionPointsByLog(dailyLogId);
      res.json(actionPoints);
    } catch (error) {
      console.error("Error fetching action points for log:", error);
      res.status(500).json({ message: "Failed to fetch action points" });
    }
  });

  app.post('/api/projects/:projectId/action-points', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      // Validate request body
      const validated = insertActionPointSchema.parse(req.body);
      
      // dailyLogId can be null for standalone action points
      const dailyLogId = req.body.dailyLogId || null;
      
      const actionPoint = await storage.createActionPoint(projectId, dailyLogId, validated);
      res.status(201).json(actionPoint);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating action point:", error);
      res.status(500).json({ message: "Failed to create action point" });
    }
  });

  app.patch('/api/action-points/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate request body
      const validated = insertActionPointSchema.partial().parse(req.body);
      
      const actionPoint = await storage.updateActionPoint(id, validated);
      res.json(actionPoint);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error updating action point:", error);
      res.status(500).json({ message: "Failed to update action point" });
    }
  });

  app.delete('/api/action-points/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteActionPoint(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting action point:", error);
      res.status(500).json({ message: "Failed to delete action point" });
    }
  });

  // Delete file
  app.delete('/api/storage/:bucket/:path(*)', isAuthenticated, async (req, res) => {
    try {
      const { bucket, path } = req.params;
      
      const result = await storageService.deleteFile(bucket, path);

      if (result.error) {
        return res.status(500).json({ message: result.error });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: error.message || "Failed to delete file" });
    }
  });

  // List files in bucket
  app.get('/api/storage/:bucket', isAuthenticated, async (req, res) => {
    try {
      const { bucket } = req.params;
      const prefix = req.query.prefix as string | undefined;
      
      const result = await storageService.listFiles(bucket, prefix);

      if (result.error) {
        return res.status(500).json({ message: result.error });
      }

      res.json({ files: result.files });
    } catch (error: any) {
      console.error("Error listing files:", error);
      res.status(500).json({ message: error.message || "Failed to list files" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
