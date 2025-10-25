import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertRoadSchema, 
  insertLayerSchema, 
  insertLayerProgressSchema,
  insertBOQSchema,
  insertBOQItemSchema,
  insertSummaryAdjustmentSchema,
  insertDocumentSchema,
  insertWorkAccomplishedSchema,
  insertWorkPlanSchema,
  insertPlannedActivitySchema,
  insertPaymentCertificateSchema,
  insertClientPersonnelSchema,
  insertContractorPersonnelSchema,
  insertContractorEquipmentSchema,
  insertIssueSchema,
} from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import multer from "multer";
import { getStorageService, getMockStorage } from "./storage-service";

// Validation schema for reorder requests
const reorderItemSchema = z.object({
  id: z.string(),
  order: z.number().int().min(0),
});

const reorderRequestSchema = z.object({
  items: z.array(reorderItemSchema).min(1),
});

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

  // BOQ routes
  app.get('/api/projects/:projectId/boqs', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const boqs = await storage.getProjectBOQs(projectId);
      res.json(boqs);
    } catch (error) {
      console.error("Error fetching BOQs:", error);
      res.status(500).json({ message: "Failed to fetch BOQs" });
    }
  });

  app.get('/api/boqs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const boq = await storage.getBOQ(id);
      
      if (!boq) {
        return res.status(404).json({ message: "BOQ not found" });
      }
      
      // Fetch items and adjustments
      const items = await storage.getBOQItems(id);
      const adjustments = await storage.getBOQAdjustments(id);
      
      res.json({ ...boq, items, adjustments });
    } catch (error) {
      console.error("Error fetching BOQ:", error);
      res.status(500).json({ message: "Failed to fetch BOQ" });
    }
  });

  app.post('/api/projects/:projectId/boqs', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertBOQSchema.parse(req.body);
      const boq = await storage.createBOQ(projectId, validatedData);
      res.status(201).json(boq);
    } catch (error) {
      console.error("Error creating BOQ:", error);
      res.status(500).json({ message: "Failed to create BOQ" });
    }
  });

  app.patch('/api/boqs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { items, adjustments, ...boqData } = req.body;
      
      // Check if BOQ exists
      const existingBoq = await storage.getBOQ(id);
      if (!existingBoq) {
        return res.status(404).json({ message: "BOQ not found" });
      }
      
      // Update BOQ metadata
      if (Object.keys(boqData).length > 0) {
        const validatedData = insertBOQSchema.partial().parse(boqData);
        await storage.updateBOQ(id, validatedData);
      }
      
      // Validate and bulk update items if provided
      if (items && Array.isArray(items)) {
        // Validate each item
        const validatedItems = items.map(item => {
          // For existing items, use partial validation; for new items, validate all required fields
          const schema = item.id ? insertBOQItemSchema.partial() : insertBOQItemSchema;
          return schema.parse(item);
        });
        await storage.bulkUpsertBOQItems(id, validatedItems as any);
      }
      
      // Validate and bulk update adjustments if provided
      if (adjustments && Array.isArray(adjustments)) {
        // Validate each adjustment
        const validatedAdjustments = adjustments.map(adjustment => {
          // For existing adjustments, use partial validation; for new adjustments, validate all required fields
          const schema = adjustment.id ? insertSummaryAdjustmentSchema.partial() : insertSummaryAdjustmentSchema;
          return schema.parse(adjustment);
        });
        await storage.bulkUpsertAdjustments(id, validatedAdjustments as any);
      }
      
      // Fetch updated BOQ with items and adjustments
      const updatedBoq = await storage.getBOQ(id);
      if (!updatedBoq) {
        return res.status(404).json({ message: "BOQ not found after update" });
      }
      
      const updatedItems = await storage.getBOQItems(id);
      const updatedAdjustments = await storage.getBOQAdjustments(id);
      
      res.json({ ...updatedBoq, items: updatedItems, adjustments: updatedAdjustments });
    } catch (error: any) {
      console.error("Error updating BOQ:", error);
      // Return 400 for validation errors, 500 for other errors
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update BOQ" });
    }
  });

  app.delete('/api/boqs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBOQ(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting BOQ:", error);
      res.status(500).json({ message: "Failed to delete BOQ" });
    }
  });

  // Document routes
  app.get('/api/projects/:projectId/documents', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const docs = await storage.getProjectDocuments(projectId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post('/api/projects/:projectId/documents', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(projectId, validatedData);
      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error creating document:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.patch('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertDocumentSchema.partial().parse(req.body);
      const document = await storage.updateDocument(id, validatedData);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error: any) {
      console.error("Error updating document:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteDocument(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Work Accomplished routes
  app.get('/api/projects/:projectId/work-accomplished', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const work = await storage.getProjectWorkAccomplished(projectId);
      res.json(work);
    } catch (error) {
      console.error("Error fetching work accomplished:", error);
      res.status(500).json({ message: "Failed to fetch work accomplished" });
    }
  });

  app.post('/api/projects/:projectId/work-accomplished', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertWorkAccomplishedSchema.parse(req.body);
      const work = await storage.createWorkAccomplished(projectId, validatedData);
      res.status(201).json(work);
    } catch (error: any) {
      console.error("Error creating work accomplished:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work accomplished" });
    }
  });

  app.patch('/api/work-accomplished/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertWorkAccomplishedSchema.partial().parse(req.body);
      const work = await storage.updateWorkAccomplished(id, validatedData);
      
      if (!work) {
        return res.status(404).json({ message: "Work accomplished item not found" });
      }
      
      res.json(work);
    } catch (error: any) {
      console.error("Error updating work accomplished:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update work accomplished" });
    }
  });

  app.delete('/api/work-accomplished/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWorkAccomplished(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work accomplished:", error);
      res.status(500).json({ message: "Failed to delete work accomplished" });
    }
  });

  app.post('/api/projects/:projectId/work-accomplished/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = reorderRequestSchema.parse(req.body);
      
      await storage.reorderWorkAccomplished(projectId, validatedData.items);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error reordering work accomplished:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to reorder work accomplished" });
    }
  });

  // Work Plan routes
  app.get('/api/projects/:projectId/work-plans', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const plans = await storage.getProjectWorkPlans(projectId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching work plans:", error);
      res.status(500).json({ message: "Failed to fetch work plans" });
    }
  });

  app.get('/api/work-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const plan = await storage.getWorkPlan(id);
      
      if (!plan) {
        return res.status(404).json({ message: "Work plan not found" });
      }
      
      // Fetch activities for this work plan
      const activities = await storage.getWorkPlanActivities(id);
      
      res.json({ ...plan, activities });
    } catch (error) {
      console.error("Error fetching work plan:", error);
      res.status(500).json({ message: "Failed to fetch work plan" });
    }
  });

  app.post('/api/projects/:projectId/work-plans', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertWorkPlanSchema.parse(req.body);
      const plan = await storage.createWorkPlan(projectId, validatedData);
      res.status(201).json(plan);
    } catch (error: any) {
      console.error("Error creating work plan:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work plan" });
    }
  });

  app.patch('/api/work-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertWorkPlanSchema.partial().parse(req.body);
      const plan = await storage.updateWorkPlan(id, validatedData);
      
      if (!plan) {
        return res.status(404).json({ message: "Work plan not found" });
      }
      
      res.json(plan);
    } catch (error: any) {
      console.error("Error updating work plan:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update work plan" });
    }
  });

  app.delete('/api/work-plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWorkPlan(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work plan:", error);
      res.status(500).json({ message: "Failed to delete work plan" });
    }
  });

  // Planned Activity routes
  app.get('/api/work-plans/:workPlanId/activities', isAuthenticated, async (req: any, res) => {
    try {
      const { workPlanId } = req.params;
      const activities = await storage.getWorkPlanActivities(workPlanId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching work plan activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.get('/api/projects/:projectId/activities', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const activities = await storage.getProjectActivities(projectId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching project activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  app.post('/api/activities', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertPlannedActivitySchema.parse(req.body);
      const activity = await storage.createPlannedActivity(validatedData);
      res.status(201).json(activity);
    } catch (error: any) {
      console.error("Error creating activity:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  app.patch('/api/activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPlannedActivitySchema.partial().parse(req.body);
      const activity = await storage.updatePlannedActivity(id, validatedData);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      
      res.json(activity);
    } catch (error: any) {
      console.error("Error updating activity:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update activity" });
    }
  });

  app.delete('/api/activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id} = req.params;
      await storage.deletePlannedActivity(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Failed to delete activity" });
    }
  });

  // Payment Certificate routes
  app.get('/api/projects/:projectId/payment-certificates', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const certificates = await storage.getProjectPaymentCertificates(projectId);
      res.json(certificates);
    } catch (error) {
      console.error("Error fetching payment certificates:", error);
      res.status(500).json({ message: "Failed to fetch payment certificates" });
    }
  });

  app.post('/api/projects/:projectId/payment-certificates', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertPaymentCertificateSchema.parse(req.body);
      const certificate = await storage.createPaymentCertificate(projectId, validatedData);
      res.status(201).json(certificate);
    } catch (error: any) {
      console.error("Error creating payment certificate:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment certificate" });
    }
  });

  app.patch('/api/payment-certificates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertPaymentCertificateSchema.partial().parse(req.body);
      const certificate = await storage.updatePaymentCertificate(id, validatedData);
      
      if (!certificate) {
        return res.status(404).json({ message: "Payment certificate not found" });
      }
      
      res.json(certificate);
    } catch (error: any) {
      console.error("Error updating payment certificate:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update payment certificate" });
    }
  });

  app.delete('/api/payment-certificates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePaymentCertificate(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment certificate:", error);
      res.status(500).json({ message: "Failed to delete payment certificate" });
    }
  });

  // Client Personnel routes
  app.get('/api/projects/:projectId/client-personnel', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const personnel = await storage.getProjectClientPersonnel(projectId);
      res.json(personnel);
    } catch (error) {
      console.error("Error fetching client personnel:", error);
      res.status(500).json({ message: "Failed to fetch client personnel" });
    }
  });

  app.post('/api/projects/:projectId/client-personnel', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertClientPersonnelSchema.parse(req.body);
      const personnel = await storage.createClientPersonnel(projectId, validatedData);
      res.status(201).json(personnel);
    } catch (error: any) {
      console.error("Error creating client personnel:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client personnel" });
    }
  });

  app.patch('/api/client-personnel/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertClientPersonnelSchema.partial().parse(req.body);
      const personnel = await storage.updateClientPersonnel(id, validatedData);
      
      if (!personnel) {
        return res.status(404).json({ message: "Client personnel not found" });
      }
      
      res.json(personnel);
    } catch (error: any) {
      console.error("Error updating client personnel:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client personnel" });
    }
  });

  app.delete('/api/client-personnel/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClientPersonnel(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client personnel:", error);
      res.status(500).json({ message: "Failed to delete client personnel" });
    }
  });

  // Contractor Personnel routes
  app.get('/api/projects/:projectId/contractor-personnel', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const personnel = await storage.getProjectContractorPersonnel(projectId);
      res.json(personnel);
    } catch (error) {
      console.error("Error fetching contractor personnel:", error);
      res.status(500).json({ message: "Failed to fetch contractor personnel" });
    }
  });

  app.post('/api/projects/:projectId/contractor-personnel', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertContractorPersonnelSchema.parse(req.body);
      const personnel = await storage.createContractorPersonnel(projectId, validatedData);
      res.status(201).json(personnel);
    } catch (error: any) {
      console.error("Error creating contractor personnel:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contractor personnel" });
    }
  });

  app.patch('/api/contractor-personnel/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertContractorPersonnelSchema.partial().parse(req.body);
      const personnel = await storage.updateContractorPersonnel(id, validatedData);
      
      if (!personnel) {
        return res.status(404).json({ message: "Contractor personnel not found" });
      }
      
      res.json(personnel);
    } catch (error: any) {
      console.error("Error updating contractor personnel:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update contractor personnel" });
    }
  });

  app.delete('/api/contractor-personnel/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteContractorPersonnel(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contractor personnel:", error);
      res.status(500).json({ message: "Failed to delete contractor personnel" });
    }
  });

  // Contractor Equipment routes
  app.get('/api/projects/:projectId/contractor-equipment', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const equipment = await storage.getProjectContractorEquipment(projectId);
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching contractor equipment:", error);
      res.status(500).json({ message: "Failed to fetch contractor equipment" });
    }
  });

  app.post('/api/projects/:projectId/contractor-equipment', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertContractorEquipmentSchema.parse(req.body);
      const equipment = await storage.createContractorEquipment(projectId, validatedData);
      res.status(201).json(equipment);
    } catch (error: any) {
      console.error("Error creating contractor equipment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contractor equipment" });
    }
  });

  app.patch('/api/contractor-equipment/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertContractorEquipmentSchema.partial().parse(req.body);
      const equipment = await storage.updateContractorEquipment(id, validatedData);
      
      if (!equipment) {
        return res.status(404).json({ message: "Contractor equipment not found" });
      }
      
      res.json(equipment);
    } catch (error: any) {
      console.error("Error updating contractor equipment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update contractor equipment" });
    }
  });

  app.delete('/api/contractor-equipment/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteContractorEquipment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contractor equipment:", error);
      res.status(500).json({ message: "Failed to delete contractor equipment" });
    }
  });

  // Issue routes
  app.get('/api/projects/:projectId/issues', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const issues = await storage.getProjectIssues(projectId);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.post('/api/projects/:projectId/issues', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const validatedData = insertIssueSchema.parse(req.body);
      const issue = await storage.createIssue(projectId, validatedData);
      res.status(201).json(issue);
    } catch (error: any) {
      console.error("Error creating issue:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  app.patch('/api/issues/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertIssueSchema.partial().parse(req.body);
      const issue = await storage.updateIssue(id, validatedData);
      
      if (!issue) {
        return res.status(404).json({ message: "Issue not found" });
      }
      
      res.json(issue);
    } catch (error: any) {
      console.error("Error updating issue:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  app.delete('/api/issues/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteIssue(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting issue:", error);
      res.status(500).json({ message: "Failed to delete issue" });
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
