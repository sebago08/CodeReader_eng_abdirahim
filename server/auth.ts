// Supabase Auth implementation
import { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { verifySupabaseToken } from "./supabase";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      user?: SelectUser;
    }
  }
}

export function setupAuth(app: Express) {
  // GET /api/user - Get current user profile (requires JWT token)
  app.get("/api/user", supabaseAuthMiddleware, async (req, res) => {
    res.json(req.user);
  });
}

// Supabase Auth middleware - verifies JWT token and loads/creates user
export const supabaseAuthMiddleware: RequestHandler = async (req: any, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token with Supabase
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get or create user from database
    let user = await storage.getUserByAuthId(supabaseUser.id);
    
    if (!user) {
      // Auto-create user profile for new Supabase Auth users
      const email = supabaseUser.email;
      if (!email) {
        return res.status(401).json({ message: "Email not found in auth token" });
      }

      // Get username from user metadata (provided during registration)
      // If not available (legacy users), generate from email with random suffix
      let username = supabaseUser.user_metadata?.username;
      if (!username) {
        const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        username = `${baseUsername}_${randomSuffix}`;
      }

      user = await storage.createUser({
        authId: supabaseUser.id,
        email,
        firstName: supabaseUser.user_metadata?.first_name || null,
        lastName: supabaseUser.user_metadata?.last_name || null,
        username,
        password: null, // Supabase Auth users don't have passwords
        isAdmin: false,
        isApproved: true, // Auto-approve all users
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};

// Admin middleware for Supabase Auth
export const supabaseAdminMiddleware: RequestHandler = async (req: any, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  next();
};
