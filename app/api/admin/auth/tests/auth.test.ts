/**
 * Authentication Tests
 * Focused tests for critical auth behaviors
 */

import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  createSession,
  validateSession,
  deleteSession,
} from '@/apps/localhub/server/auth';

const prisma = new PrismaClient();

describe('Authentication System', () => {
  beforeAll(async () => {
    // Clean up test database
    await prisma.business.deleteMany();
    await prisma.project.deleteMany();
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Password Hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash).toMatch(/^\$2[ayb]\$.{56}$/);
    });

    it('should verify correct password', async () => {
      const password = 'correctpassword';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctpassword';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongpassword', hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should create session with valid expiration', async () => {
      const admin = await prisma.admin.create({
        data: {
          email: 'session@example.com',
          passwordHash: await hashPassword('password'),
        },
      });

      const session = await createSession(admin.id);

      expect(session.token).toBeDefined();
      expect(session.token.length).toBe(64); // 32 bytes * 2 for hex
      expect(session.adminId).toBe(admin.id);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(session.expiresAt.getTime()).toBeLessThan(Date.now() + 8 * 24 * 60 * 60 * 1000); // Less than 8 days
    });

    it('should validate valid session and return admin', async () => {
      const admin = await prisma.admin.create({
        data: {
          email: 'validate@example.com',
          passwordHash: await hashPassword('password'),
        },
      });

      const session = await createSession(admin.id);
      const validatedAdmin = await validateSession(session.token);

      expect(validatedAdmin).not.toBeNull();
      expect(validatedAdmin?.id).toBe(admin.id);
      expect(validatedAdmin?.email).toBe(admin.email);
    });

    it('should return null for invalid session token', async () => {
      const validatedAdmin = await validateSession('invalid-token-12345');
      expect(validatedAdmin).toBeNull();
    });

    it('should delete session on logout', async () => {
      const admin = await prisma.admin.create({
        data: {
          email: 'logout@example.com',
          passwordHash: await hashPassword('password'),
        },
      });

      const session = await createSession(admin.id);

      // Verify session exists
      let validatedAdmin = await validateSession(session.token);
      expect(validatedAdmin).not.toBeNull();

      // Delete session
      await deleteSession(session.token);

      // Verify session no longer valid
      validatedAdmin = await validateSession(session.token);
      expect(validatedAdmin).toBeNull();
    });
  });

  describe('Session Token Generation', () => {
    it('should generate unique session tokens', () => {
      const token1 = generateSessionToken();
      const token2 = generateSessionToken();
      const token3 = generateSessionToken();

      expect(token1).not.toBe(token2);
      expect(token1).not.toBe(token3);
      expect(token2).not.toBe(token3);

      expect(token1.length).toBe(64);
      expect(token2.length).toBe(64);
      expect(token3.length).toBe(64);
    });
  });
});
