import { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { verifySupabaseToken, supabase } from "./supabase";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      user?: SelectUser;
    }
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  app.use(session(sessionSettings));

  app.post("/api/auth/link-profile", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const supabaseUser = (req as any).supabaseUser;

      if (!supabaseUser?.email) {
        return res.status(400).json({ message: "Email not found in auth token" });
      }

      let user = await storage.getUserByAuthId(supabaseUser.id);
      
      if (user) {
        if (!user.isApproved) {
          return res.status(200).json({
            user,
            pendingApproval: true,
            message: "Your account is pending approval from an administrator.",
          });
        }
        return res.status(200).json({ user });
      }

      user = await storage.getUserByEmail(supabaseUser.email);
      
      if (user) {
        const updatedUser = await storage.updateUserAuthId(user.id, supabaseUser.id);
        
        if (!updatedUser.isApproved) {
          return res.status(200).json({
            user: updatedUser,
            pendingApproval: true,
            message: "Your account is pending approval from an administrator.",
          });
        }
        
        return res.status(200).json({ user: updatedUser });
      }

      const metadata = supabaseUser.user_metadata || {};
      const emailPrefix = supabaseUser.email.split('@')[0];
      const timestamp = Date.now().toString(36);
      const generatedUsername = metadata.username || `${emailPrefix}_${timestamp}`;

      const newUser = await storage.createUser({
        authId: supabaseUser.id,
        username: generatedUsername,
        email: supabaseUser.email,
        firstName: metadata.first_name || null,
        lastName: metadata.last_name || null,
        password: null,
        isAdmin: false,
        isSuperAdmin: false,
        isApproved: false,
      });

      return res.status(201).json({
        user: newUser,
        pendingApproval: true,
        message: "Profile created. Please wait for an administrator to approve your account.",
      });
    } catch (error) {
      console.error("Link profile error:", error);
      next(error);
    }
  });

  app.post("/api/auth/create-profile", supabaseAuthMiddleware, async (req, res, next) => {
    try {
      const { username, firstName, lastName } = req.body;
      const supabaseUser = (req as any).supabaseUser;

      if (!supabaseUser?.email) {
        return res.status(400).json({ message: "Email not found in auth token" });
      }

      const existingUser = await storage.getUserByAuthId(supabaseUser.id);
      if (existingUser) {
        return res.status(200).json(existingUser);
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(supabaseUser.email);
      if (existingEmail) {
        if (!existingEmail.authId) {
          const updatedUser = await storage.updateUserAuthId(existingEmail.id, supabaseUser.id);
          return res.status(200).json(updatedUser);
        }
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        authId: supabaseUser.id,
        username,
        email: supabaseUser.email,
        firstName: firstName || null,
        lastName: lastName || null,
        password: null,
        isAdmin: false,
        isSuperAdmin: false,
        isApproved: false,
      });

      res.status(201).json({
        message: "Profile created. Please wait for an administrator to approve your account.",
        user,
        pendingApproval: true,
      });
    } catch (error) {
      console.error("Create profile error:", error);
      next(error);
    }
  });

  app.get("/api/user", supabaseAuthMiddleware, async (req, res) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        message: "Your account is pending approval. Please contact an administrator.",
        pendingApproval: true,
      });
    }

    res.json(user);
  });

  app.post("/api/logout", (req, res) => {
    res.sendStatus(200);
  });
}

export const supabaseAuthMiddleware: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.substring(7);

    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.supabaseUser = supabaseUser;

    let user = await storage.getUserByAuthId(supabaseUser.id);

    if (!user && supabaseUser.email) {
      user = await storage.getUserByEmail(supabaseUser.email);
      if (user && !user.authId) {
        user = await storage.updateUserAuthId(user.id, supabaseUser.id);
      }
    }

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};

export const supabaseAdminMiddleware: RequestHandler = async (req: any, res, next) => {
  if (!req.user?.isAdmin && !req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Forbidden - Admin access required" });
  }
  next();
};

export const superAdminMiddleware: RequestHandler = async (req: any, res, next) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Forbidden - Super Admin access required" });
  }
  next();
};

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);

  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: "Invalid token" });
    }

    let user = await storage.getUserByAuthId(supabaseUser.id);
    
    if (!user && supabaseUser.email) {
      user = await storage.getUserByEmail(supabaseUser.email);
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        message: "Your account is pending approval",
        pendingApproval: true,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

export const isAdmin: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);

  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await storage.getUserByAuthId(supabaseUser.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isAdmin && !user.isSuperAdmin) {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

export const isSuperAdmin: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.substring(7);

  try {
    const supabaseUser = await verifySupabaseToken(token);
    if (!supabaseUser) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await storage.getUserByAuthId(supabaseUser.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (!user.isSuperAdmin) {
      return res.status(403).json({ message: "Forbidden - Super Admin access required" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};
