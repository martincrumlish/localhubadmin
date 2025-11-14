/**
 * Prisma Models Tests
 * Focused tests for critical model behaviors
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Prisma Models', () => {
  beforeAll(async () => {
    // Clean up test database before running tests
    await prisma.business.deleteMany();
    await prisma.project.deleteMany();
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Admin Model', () => {
    it('should create admin with hashed password', async () => {
      const password = 'testpassword123';
      const hash = await bcrypt.hash(password, 10);

      const admin = await prisma.admin.create({
        data: {
          email: 'test@example.com',
          passwordHash: hash,
        },
      });

      expect(admin.id).toBeDefined();
      expect(admin.email).toBe('test@example.com');
      expect(admin.passwordHash).not.toBe(password);
      expect(await bcrypt.compare(password, admin.passwordHash)).toBe(true);
    });

    it('should enforce unique email constraint', async () => {
      const hash = await bcrypt.hash('password', 10);

      await prisma.admin.create({
        data: {
          email: 'unique@example.com',
          passwordHash: hash,
        },
      });

      await expect(
        prisma.admin.create({
          data: {
            email: 'unique@example.com',
            passwordHash: hash,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Session Model', () => {
    it('should create session with expiration', async () => {
      const hash = await bcrypt.hash('password', 10);
      const admin = await prisma.admin.create({
        data: {
          email: 'session-test@example.com',
          passwordHash: hash,
        },
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      const session = await prisma.session.create({
        data: {
          adminId: admin.id,
          token: 'test-token-123',
          expiresAt,
        },
      });

      expect(session.id).toBeDefined();
      expect(session.adminId).toBe(admin.id);
      expect(session.token).toBe('test-token-123');
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should cascade delete sessions when admin deleted', async () => {
      const hash = await bcrypt.hash('password', 10);
      const admin = await prisma.admin.create({
        data: {
          email: 'cascade-test@example.com',
          passwordHash: hash,
        },
      });

      await prisma.session.create({
        data: {
          adminId: admin.id,
          token: 'cascade-token',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.admin.delete({
        where: { id: admin.id },
      });

      const sessions = await prisma.session.findMany({
        where: { adminId: admin.id },
      });

      expect(sessions).toHaveLength(0);
    });
  });

  describe('Project-Business Relationship', () => {
    it('should create project and associate businesses', async () => {
      const hash = await bcrypt.hash('password', 10);
      const admin = await prisma.admin.create({
        data: {
          email: 'project-test@example.com',
          passwordHash: hash,
        },
      });

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          status: 'active',
          createdByAdminId: admin.id,
        },
      });

      const business = await prisma.business.create({
        data: {
          projectId: project.id,
          placeId: 'test-place-id-123',
          businessName: 'Test Business',
          addedByAdminId: admin.id,
        },
      });

      expect(business.projectId).toBe(project.id);

      const projectWithBusinesses = await prisma.project.findUnique({
        where: { id: project.id },
        include: { businesses: true },
      });

      expect(projectWithBusinesses?.businesses).toHaveLength(1);
      expect(projectWithBusinesses?.businesses[0].businessName).toBe('Test Business');
    });

    it('should cascade delete businesses when project deleted', async () => {
      const hash = await bcrypt.hash('password', 10);
      const admin = await prisma.admin.create({
        data: {
          email: 'cascade-project@example.com',
          passwordHash: hash,
        },
      });

      const project = await prisma.project.create({
        data: {
          name: 'Cascade Test Project',
          status: 'active',
          createdByAdminId: admin.id,
        },
      });

      await prisma.business.create({
        data: {
          projectId: project.id,
          placeId: 'cascade-place-id',
          businessName: 'Cascade Business',
          addedByAdminId: admin.id,
        },
      });

      await prisma.project.delete({
        where: { id: project.id },
      });

      const businesses = await prisma.business.findMany({
        where: { projectId: project.id },
      });

      expect(businesses).toHaveLength(0);
    });
  });

  describe('Business Model Constraints', () => {
    it('should enforce unique placeId constraint', async () => {
      const hash = await bcrypt.hash('password', 10);
      const admin = await prisma.admin.create({
        data: {
          email: 'unique-place@example.com',
          passwordHash: hash,
        },
      });

      const project = await prisma.project.create({
        data: {
          name: 'Unique Place Test',
          status: 'active',
          createdByAdminId: admin.id,
        },
      });

      await prisma.business.create({
        data: {
          projectId: project.id,
          placeId: 'unique-place-id',
          businessName: 'First Business',
          addedByAdminId: admin.id,
        },
      });

      await expect(
        prisma.business.create({
          data: {
            projectId: project.id,
            placeId: 'unique-place-id',
            businessName: 'Duplicate Business',
            addedByAdminId: admin.id,
          },
        })
      ).rejects.toThrow();
    });
  });
});
