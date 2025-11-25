import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memorystore from "memorystore";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  console.log("Using memory store for sessions");
  const MemoryStore = memorystore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: sessionTtl,
  });

  return session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Dev mode: Auto-login endpoint
  app.get("/api/login", async (req, res) => {
    // Create a mock user for development
    const mockUser = {
      id: "dev-user-123",
      email: "dev@example.com",
      firstName: "Dev",
      lastName: "User",
      profileImageUrl: null,
    };

    // Upsert the user in the database
    await storage.upsertUser(mockUser);

    // Log the user in
    req.login({ claims: mockUser }, (err) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }
      res.redirect("/");
    });
  });

  app.get("/api/callback", (req, res) => {
    res.redirect("/");
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // User endpoint for auth check
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json(user.claims || user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Alternative endpoint that frontend might be using
  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      res.json(user.claims || user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
