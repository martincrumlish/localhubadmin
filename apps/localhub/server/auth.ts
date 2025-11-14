/**
 * Authentication Utility Functions
 * Handles password hashing, session management, and token generation
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './db';
import type { Admin, Session } from '@prisma/client';

const BCRYPT_COST = 10;
const SESSION_DURATION_DAYS = 7;

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verify a plain text password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new session for an admin user
 * Returns the session with a 7-day expiration
 */
export async function createSession(adminId: number): Promise<Session> {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const session = await prisma.session.create({
    data: {
      adminId,
      token,
      expiresAt,
    },
  });

  return session;
}

/**
 * Validate a session token and return the associated admin user
 * Returns null if session is invalid or expired
 */
export async function validateSession(token: string): Promise<Admin | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { admin: true },
  });

  if (!session) {
    return null;
  }

  // Check if session has expired
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.admin;
}

/**
 * Delete a session by token
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({
    where: { token },
  }).catch(() => {
    // Ignore errors if session doesn't exist
  });
}

/**
 * Clean up expired sessions from the database
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
