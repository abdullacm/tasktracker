import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertTimeSessionSchema, insertUserSettingsSchema } from "@shared/schema";
import { config } from "./config";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user.id;//.claims.sub;
      //const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Time tracking routes
  app.post('/api/time-sessions/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;//.claims.sub;
      const { taskName } = req.body;

      if (!taskName) {
        return res.status(400).json({ message: "Task name is required" });
      }

      const sessionData = {
        userId,
        taskName,
        startTime: new Date(),
      };

      const validatedData = insertTimeSessionSchema.parse(sessionData);
      const session = await storage.startTimeSession(validatedData);
      
      res.json(session);
    } catch (error) {
      //console.error("Error starting time session:", error.stack);
      res.status(500).json({ message: "Failed to start time session" });
    }
  });

  app.post('/api/time-sessions/:id/stop', isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.stopTimeSession(sessionId, new Date());
      
      if (!session) {
        return res.status(404).json({ message: "Time session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error stopping time session:", error);
      res.status(500).json({ message: "Failed to stop time session" });
    }
  });

  app.get('/api/time-sessions/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;//.claims.sub;
      console.log('*******',req.user);
      const session = await storage.getActiveTimeSession(userId);
      res.json(session || null);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.get('/api/time-sessions', isAuthenticated, async (req: any, res) => {
    try {

      const userId = req.user.id;//.claims.sub;
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const sessions = await storage.getTimeSessions(userId, start, end);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching time sessions:", error);
      res.status(500).json({ message: "Failed to fetch time sessions" });
    }
  });

  // User settings routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;//.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;//.claims.sub;
      const settingsData = { userId, ...req.body };
      
      const validatedData = insertUserSettingsSchema.parse(settingsData);
      const settings = await storage.upsertUserSettings(validatedData);
      
      res.json(settings);
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Trello integration routes
  app.get('/api/trello/boards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;//.claims.sub;
      const settings = await storage.getUserSettings(userId);
      
      if (!settings?.trelloApiKey || !settings?.trelloToken) {
        return res.status(400).json({ message: "Trello credentials not configured" });
      }

      const response = await fetch(
        `${config.trello.apiUrl}/members/me/boards?key=${settings.trelloApiKey}&token=${settings.trelloToken}`
      );
      
      if (!response.ok) {
        throw new Error(`Trello API error: ${response.statusText}`);
      }
      
      const boards = await response.json();
      res.json(boards);
    } catch (error) {
      console.error("Error fetching Trello boards:", error);
      res.status(500).json({ message: "Failed to fetch Trello boards" });
    }
  });

  app.get('/api/trello/cards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;//.claims.sub;
      const settings = await storage.getUserSettings(userId);
      
      if (!settings?.trelloApiKey || !settings?.trelloToken || !settings?.selectedTrelloBoard) {
        return res.status(400).json({ message: "Trello configuration incomplete" });
      }

      const response = await fetch(
        `${config.trello.apiUrl}/boards/${settings.selectedTrelloBoard}/cards?key=${settings.trelloApiKey}&token=${settings.trelloToken}`
      );
      
      if (!response.ok) {
        throw new Error(`Trello API error: ${response.statusText}`);
      }
      
      const cards = await response.json();
      res.json(cards);
    } catch (error) {
      console.error("Error fetching Trello cards:", error);
      res.status(500).json({ message: "Failed to fetch Trello cards" });
    }
  });

  app.post('/api/trello/test-connection', isAuthenticated, async (req: any, res) => {
    try {
      const { apiKey, token } = req.body;
      
      if (!apiKey || !token) {
        return res.status(400).json({ message: "API key and token are required" });
      }

      const response = await fetch(
        `${config.trello.apiUrl}/members/me?key=${apiKey}&token=${token}`
      );
      
      if (!response.ok) {
        throw new Error(`Trello API error: ${response.statusText}`);
      }
      
      const member = await response.json();
      res.json({ success: true, member });
    } catch (error) {
      console.error("Error testing Trello connection:", error);
      res.status(400).json({ success: false, message: "Invalid Trello credentials" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
