import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertRoadSchema, insertLayerSchema, insertLayerProgressSchema } from "@shared/schema";
import { setupAuth } from "./auth";

// Middleware to check if user is authenticated
const isAuthenticated: RequestHandler = (req, res, next) => {
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
      const validatedData = insertRoadSchema.partial().parse(req.body);
      const road = await storage.updateRoad(id, validatedData);
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

  const httpServer = createServer(app);
  return httpServer;
}
