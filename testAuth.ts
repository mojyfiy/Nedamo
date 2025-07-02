import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple test authentication for local development
export async function setupTestAuth(app: Express) {
  // Test login endpoint - creates a test user session
  app.get('/api/login', async (req, res) => {
    try {
      // Create or get test user
      const testUser = await storage.upsertUser({
        id: "test-user-123",
        email: "test@example.com",
        firstName: "المستخدم",
        lastName: "التجريبي",
        profileImageUrl: null,
      });

      // Set session
      (req as any).session.user = {
        claims: {
          sub: "test-user-123",
          email: "test@example.com",
          first_name: "المستخدم",
          last_name: "التجريبي",
          profile_image_url: null,
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      res.redirect('/');
    } catch (error) {
      console.error('Test login error:', error);
      res.status(500).json({ message: 'خطأ في تسجيل الدخول التجريبي' });
    }
  });

  // Test logout endpoint
  app.get('/api/logout', (req, res) => {
    (req as any).session.destroy(() => {
      res.redirect('/');
    });
  });
}

// Simple authentication middleware for testing
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = (req as any).session;
  
  if (!session || !session.user || !session.user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > session.user.expires_at) {
    return res.status(401).json({ message: "Session expired" });
  }

  // Attach user to request
  (req as any).user = session.user;
  next();
};