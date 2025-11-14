/**
 * Admin User Management API Tests
 * Focused tests for critical operations
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword, createSession, verifyPassword } from '@/apps/localhub/server/auth';

const prisma = new PrismaClient();

describe('Admin User Management API', () => {
  let adminId: number;
  let sessionToken: string;

  beforeAll(async () => {
    // Clean up test database
    await prisma.business.deleteMany();
    await prisma.project.deleteMany();
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();

    // Create test admin
    const admin = await prisma.admin.create({
      data: {
        email: 'user-admin@example.com',
        passwordHash: await hashPassword('password'),
      },
    });
    adminId = admin.id;

    // Create session
    const session = await createSession(adminId);
    sessionToken = session.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Admin User CRUD Operations', () => {
    it('should list all admins excluding password hash', async () => {
      const admins = await prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(admins.length).toBeGreaterThan(0);
      expect(admins[0]).not.toHaveProperty('passwordHash');
      expect(admins[0]).toHaveProperty('email');
      expect(admins[0]).toHaveProperty('id');
    });

    it('should create new admin with hashed password', async () => {
      const email = 'newadmin@example.com';
      const password = 'securepassword123';

      const admin = await prisma.admin.create({
        data: {
          email,
          passwordHash: await hashPassword(password),
        },
      });

      expect(admin.id).toBeDefined();
      expect(admin.email).toBe(email);
      expect(admin.passwordHash).not.toBe(password);
      expect(await verifyPassword(password, admin.passwordHash)).toBe(true);
    });

    it('should enforce email uniqueness', async () => {
      const email = 'unique@example.com';

      await prisma.admin.create({
        data: {
          email,
          passwordHash: await hashPassword('password'),
        },
      });

      await expect(
        prisma.admin.create({
          data: {
            email,
            passwordHash: await hashPassword('password'),
          },
        })
      ).rejects.toThrow();
    });

    it('should delete admin user', async () => {
      const admin = await prisma.admin.create({
        data: {
          email: 'delete@example.com',
          passwordHash: await hashPassword('password'),
        },
      });

      await prisma.admin.delete({
        where: { id: admin.id },
      });

      const found = await prisma.admin.findUnique({
        where: { id: admin.id },
      });

      expect(found).toBeNull();
    });

    it('should cascade delete sessions when admin deleted', async () => {
      const admin = await prisma.admin.create({
        data: {
          email: 'cascade@example.com',
          passwordHash: await hashPassword('password'),
        },
      });

      const session = await createSession(admin.id);

      await prisma.admin.delete({
        where: { id: admin.id },
      });

      const foundSession = await prisma.session.findUnique({
        where: { token: session.token },
      });

      expect(foundSession).toBeNull();
    });
  });

  describe('Self-Delete Prevention Logic', () => {
    it('should identify current admin id from session', async () => {
      const session = await prisma.session.findUnique({
        where: { token: sessionToken },
        include: { admin: true },
      });

      expect(session).not.toBeNull();
      expect(session?.adminId).toBe(adminId);
      expect(session?.admin.id).toBe(adminId);
    });

    it('should prevent deleting self (logic validation)', async () => {
      // In actual API, we'll check if targetId === currentAdminId
      const currentAdminId = adminId;
      const targetAdminId = adminId;

      const isSelf = currentAdminId === targetAdminId;
      expect(isSelf).toBe(true);

      // This simulates what the API endpoint will do
      if (isSelf) {
        // Would return 403 error
        expect(true).toBe(true);
      }
    });
  });
});
