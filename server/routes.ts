import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertRoadSchema, insertLayerSchema, insertLayerProgressSchema } from "@shared/schema";

// Default user ID for development (no authentication)
const DEFAULT_USER_ID = "default-user";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes (removed authentication)
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      let user = await storage.getUser(DEFAULT_USER_ID);
      if (!user) {
        user = await storage.upsertUser({
          id: DEFAULT_USER_ID,
          email: "user@example.com",
          firstName: "Demo",
          lastName: "User",
        });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Project routes
  app.get('/api/projects', async (req: any, res) => {
    try {
      const userId = DEFAULT_USER_ID;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req: any, res) => {
    try {
      const userId = DEFAULT_USER_ID;
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

  app.post('/api/projects',  async (req: any, res) => {
    try {
      const userId = DEFAULT_USER_ID;
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(userId, validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id',  async (req: any, res) => {
    try {
      const userId = DEFAULT_USER_ID;
      const { id } = req.params;
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, userId, validatedData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id',  async (req: any, res) => {
    try {
      const userId = DEFAULT_USER_ID;
      const { id } = req.params;
      await storage.deleteProject(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.post('/api/projects/:id/duplicate',  async (req: any, res) => {
    try {
      const userId = DEFAULT_USER_ID;
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
  app.post('/api/projects/:projectId/roads',  async (req: any, res) => {
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

  app.patch('/api/roads/:id',  async (req: any, res) => {
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

  app.delete('/api/roads/:id',  async (req: any, res) => {
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
  app.post('/api/layers/:layerId/progress',  async (req: any, res) => {
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

  app.patch('/api/progress/:id',  async (req: any, res) => {
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

  app.delete('/api/progress/:id',  async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLayerProgress(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting layer progress:", error);
      res.status(500).json({ message: "Failed to delete layer progress" });
    }
  });

  app.delete('/api/layers/:layerId/progress/reset',  async (req: any, res) => {
    try {
      const { layerId } = req.params;
      await storage.resetLayerProgress(layerId);
      res.status(204).send();
    } catch (error) {
      console.error("Error resetting layer progress:", error);
      res.status(500).json({ message: "Failed to reset layer progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
