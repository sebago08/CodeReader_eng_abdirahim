import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertRoadSchema, insertLayerSchema, insertLayerProgressSchema } from "@shared/schema";
import { setupAuth } from "./auth";
import multer from "multer";
import { getStorageService, getMockStorage } from "./storage-service";

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
