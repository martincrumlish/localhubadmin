/**
 * Business API Tests
 * Focused tests for critical operations
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword, createSession } from '@/apps/localhub/server/auth';

const prisma = new PrismaClient();

describe('Business Management API', () => {
  let adminId: number;
  let sessionToken: string;
  let projectId: number;

  beforeAll(async () => {
    // Clean up test database
    await prisma.business.deleteMany();
    await prisma.project.deleteMany();
    await prisma.session.deleteMany();
    await prisma.admin.deleteMany();

    // Create test admin
    const admin = await prisma.admin.create({
      data: {
        email: 'business-admin@example.com',
        passwordHash: await hashPassword('password'),
      },
    });
    adminId = admin.id;

    // Create session
    const session = await createSession(adminId);
    sessionToken = session.token;

    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Business Test Project',
        status: 'active',
        createdByAdminId: adminId,
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Business CRUD Operations', () => {
    it('should add business to project', async () => {
      const business = await prisma.business.create({
        data: {
          projectId,
          placeId: 'test-place-add',
          businessName: 'Test Business',
          addedByAdminId: adminId,
        },
      });

      expect(business.id).toBeDefined();
      expect(business.projectId).toBe(projectId);
      expect(business.placeId).toBe('test-place-add');
      expect(business.businessName).toBe('Test Business');
      expect(business.addedByAdminId).toBe(adminId);
    });

    it('should list businesses for project', async () => {
      await prisma.business.create({
        data: {
          projectId,
          placeId: 'list-place-1',
          businessName: 'List Business 1',
          addedByAdminId: adminId,
        },
      });

      await prisma.business.create({
        data: {
          projectId,
          placeId: 'list-place-2',
          businessName: 'List Business 2',
          addedByAdminId: adminId,
        },
      });

      const businesses = await prisma.business.findMany({
        where: { projectId },
        include: {
          addedBy: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(businesses.length).toBeGreaterThanOrEqual(2);
      expect(businesses[0].addedBy.email).toBe('business-admin@example.com');
    });

    it('should remove business from project', async () => {
      const business = await prisma.business.create({
        data: {
          projectId,
          placeId: 'remove-place',
          businessName: 'Remove Business',
          addedByAdminId: adminId,
        },
      });

      await prisma.business.delete({
        where: { id: business.id },
      });

      const found = await prisma.business.findUnique({
        where: { id: business.id },
      });

      expect(found).toBeNull();
    });

    it('should reject duplicate place_id', async () => {
      await prisma.business.create({
        data: {
          projectId,
          placeId: 'duplicate-place',
          businessName: 'First Business',
          addedByAdminId: adminId,
        },
      });

      await expect(
        prisma.business.create({
          data: {
            projectId,
            placeId: 'duplicate-place',
            businessName: 'Duplicate Business',
            addedByAdminId: adminId,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Business Tracking', () => {
    it('should track which admin added business', async () => {
      const business = await prisma.business.create({
        data: {
          projectId,
          placeId: 'tracking-place',
          businessName: 'Tracking Business',
          addedByAdminId: adminId,
        },
        include: {
          addedBy: true,
        },
      });

      expect(business.addedBy.id).toBe(adminId);
      expect(business.addedBy.email).toBe('business-admin@example.com');
    });

    it('should track creation timestamp', async () => {
      const before = new Date();

      const business = await prisma.business.create({
        data: {
          projectId,
          placeId: 'timestamp-place',
          businessName: 'Timestamp Business',
          addedByAdminId: adminId,
        },
      });

      const after = new Date();

      expect(business.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(business.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
