import { and, eq, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, transcriptions, InsertTranscription } from "../drizzle/schema.js";
import type { User } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTranscription(transcription: InsertTranscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(transcriptions).values(transcription);
}

export async function getUserTranscriptions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(transcriptions)
    .where(eq(transcriptions.userId, userId))
    .orderBy((t) => t.createdAt)
    .limit(100);
}

export async function deleteTranscription(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .delete(transcriptions)
    .where(and(eq(transcriptions.id, id), eq(transcriptions.userId, userId)));
}

export async function incrementDictationCount(openId: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(users)
    .set({ dictationCount: sql`${users.dictationCount} + 1` })
    .where(eq(users.openId, openId));

  const result = await db
    .select({ dictationCount: users.dictationCount })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0]?.dictationCount ?? 0;
}

export async function getUserSubscriptionInfo(openId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      dictationCount: users.dictationCount,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionExpiry: users.subscriptionExpiry,
      role: users.role,
      freeAccess: users.freeAccess,
      registrationComplete: users.registrationComplete,
    })
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0] ?? null;
}

export async function updateSubscription(
  openId: string,
  status: "free" | "active" | "expired" | "cancelled",
  expiry?: Date,
  playStoreToken?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = { subscriptionStatus: status };
  if (expiry) updateSet.subscriptionExpiry = expiry;
  if (playStoreToken) updateSet.playStoreToken = playStoreToken;

  await db.update(users).set(updateSet).where(eq(users.openId, openId));
}

export async function completeRegistration(
  openId: string,
  data: { email: string; phone: string }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check phone uniqueness against other users
  const existing = await db
    .select({ openId: users.openId })
    .from(users)
    .where(and(eq(users.phone, data.phone), ne(users.openId, openId)))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("PHONE_IN_USE");
  }

  await db
    .update(users)
    .set({
      email: data.email,
      phone: data.phone,
      termsAccepted: true,
      registrationComplete: true,
    })
    .where(eq(users.openId, openId));
}

export async function grantFreeAccess(email: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ freeAccess: true }).where(eq(users.email, email));
}

export async function revokeFreeAccess(email: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ freeAccess: false }).where(eq(users.email, email));
}

export async function listFreeAccessUsers(): Promise<{ email: string | null; name: string | null }[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.freeAccess, true));
}
