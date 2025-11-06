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
    
    console.log('[Auth Middleware] Verifying token:', token.substring(0, 20) + '...');
    
    // Verify token with Supabase
    const supabaseUser = await verifySupabaseToken(token);
    console.log('[Auth Middleware] Verification result:', supabaseUser ? 'Success' : 'Failed');
    
    if (!supabaseUser) {
      console.error('[Auth Middleware] Token verification failed');
      return res.status(401).json({ message: "Invalid token" });
    }

    console.log('[Auth Middleware] User verified:', supabaseUser.email);

    // Get or create user from database
    let user = await storage.getUserByAuthId(supabaseUser.id);
    
    if (!user) {
      // Check if user exists with this email (from old Passport system)
      const email = supabaseUser.email;
      if (!email) {
        return res.status(401).json({ message: "Email not found in auth token" });
      }

      const existingUser = await storage.getUserByEmail(email);
      
      if (existingUser) {
        // Update existing user with Supabase authId
        console.log('[Auth Middleware] Migrating existing user to Supabase:', email);
        user = await storage.updateUser(existingUser.id, {
          authId: supabaseUser.id,
          firstName: supabaseUser.user_metadata?.first_name || existingUser.firstName,
          lastName: supabaseUser.user_metadata?.last_name || existingUser.lastName,
        });
      } else {
        // Create new user profile for new Supabase Auth users
        // Get username from user metadata (provided during registration)
        // If not available (legacy users), generate from email with random suffix
        let username = supabaseUser.user_metadata?.username;
        if (!username) {
          const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          username = `${baseUsername}_${randomSuffix}`;
        }

        console.log('[Auth Middleware] Creating new user:', email);
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
