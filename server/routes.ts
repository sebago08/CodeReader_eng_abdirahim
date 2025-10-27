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
  insertWorkPlanActivitySchema,
  insertProjectDocumentSchema
} from "@shared/schema";
import { ZodError, z } from "zod";
import { setupAuth } from "./auth";
import multer from "multer";
import { getStorageService, getMockStorage } from "./storage-service";

// Development mode auto-login user
let devUser: any = null;

// Middleware to check if user is authenticated
const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // In development mode, bypass authentication and auto-login as a default user
  if (process.env.NODE_ENV === 'development') {
    // Create or fetch a development user
    if (!devUser) {
      try {
        // Try to get existing dev user
        devUser = await storage.getUserByUsername('devuser');
        
        // If no dev user exists, create one
        if (!devUser) {
          devUser = await storage.createUser({
            username: 'devuser',
            email: 'dev@example.com',
            password: 'hashed_password_placeholder', // Won't be used in dev mode
            firstName: 'Dev',
            lastName: 'User',
            isAdmin: true,
            isApproved: true,
          });
        }
      } catch (error) {
        console.error("Error setting up dev user:", error);
      }
    }
    
    // Automatically authenticate as dev user
    if (devUser) {
      req.user = devUser;
      return next();
    }
  }
  
  // Production mode - require actual authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Middleware to check if user is admin
const isAdmin: RequestHandler = (req: any, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  next();
};

export function registerRoutes(app: Express): Server {
  // Setup authentication (includes /api/register, /api/login, /api/logout, /api/user routes)
  setupAuth(app);

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
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
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

  // Work Plan Activity Routes
  app.get('/api/projects/:projectId/work-plan-activities', isAuthenticated, async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      
      // Verify user has access to this project
      const project = await storage.getProject(projectId, userId);
      if (!project) {
        return res.status(404).json({ message: "Project not found or access denied" });
      }
      
      const activities = await storage.getWorkPlanActivities(projectId);
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
