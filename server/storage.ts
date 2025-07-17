import {
  users,
  timeSessions,
  userSettings,
  type User,
  type UpsertUser,
  type TimeSession,
  type InsertTimeSession,
  type UserSettings,
  type InsertUserSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, between, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Time tracking operations
  startTimeSession(session: InsertTimeSession): Promise<TimeSession>;
  stopTimeSession(sessionId: number, endTime: Date): Promise<TimeSession | undefined>;
  getActiveTimeSession(userId: string): Promise<TimeSession | undefined>;
  getTimeSessions(userId: string, startDate?: Date, endDate?: Date): Promise<TimeSession[]>;
  
  // User settings operations
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Time tracking operations
  async startTimeSession(session: InsertTimeSession): Promise<TimeSession> {
    // First, stop any active sessions for this user
    await db
      .update(timeSessions)
      .set({ isActive: false })
      .where(and(eq(timeSessions.userId, session.userId), eq(timeSessions.isActive, true)));

    const [newSession] = await db
      .insert(timeSessions)
      .values({ ...session, isActive: true })
      .returning();
    return newSession;
  }

  async stopTimeSession(sessionId: number, endTime: Date): Promise<TimeSession | undefined> {
    const [session] = await db.select().from(timeSessions).where(eq(timeSessions.id, sessionId));
    if (!session) return undefined;

    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);
    
    const [updatedSession] = await db
      .update(timeSessions)
      .set({ 
        endTime, 
        duration, 
        isActive: false 
      })
      .where(eq(timeSessions.id, sessionId))
      .returning();
    
    return updatedSession;
  }

  async getActiveTimeSession(userId: string): Promise<TimeSession | undefined> {
    const [session] = await db
      .select()
      .from(timeSessions)
      .where(and(eq(timeSessions.userId, userId), eq(timeSessions.isActive, true)));
    return session;
  }

  async getTimeSessions(userId: string, startDate?: Date, endDate?: Date): Promise<TimeSession[]> {
    let query = db
      .select()
      .from(timeSessions)
      .where(eq(timeSessions.userId, userId));

    if (startDate && endDate) {
      query = query.where(
        and(
          eq(timeSessions.userId, userId),
          between(timeSessions.startTime, startDate, endDate)
        )
      );
    }

    return query.orderBy(desc(timeSessions.startTime));
  }

  // User settings operations
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, settings.userId));

    if (existingSettings) {
      const [updatedSettings] = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.userId, settings.userId))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(userSettings)
        .values(settings)
        .returning();
      return newSettings;
    }
  }
}

export const storage = new DatabaseStorage();
