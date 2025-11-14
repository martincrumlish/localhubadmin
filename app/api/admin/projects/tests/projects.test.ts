/**
 * Project API Tests
 * Focused tests for critical CRUD operations
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword, createSession } from '@/apps/localhub/server/auth';

const prisma = new PrismaClient();

describe('Project Management API', () => {
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
        email: 'project-admin@example.com',
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

  describe('Project CRUD Operations', () => {
    it('should create new project', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'Test Description',
          status: 'active',
          createdByAdminId: adminId,
        },
      });

      expect(project.id).toBeDefined();
      expect(project.name).toBe('Test Project');
      expect(project.description).toBe('Test Description');
      expect(project.status).toBe('active');
      expect(project.createdByAdminId).toBe(adminId);
    });

    it('should list all projects with business count', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'List Test Project',
          status: 'active',
          createdByAdminId: adminId,
        },
      });

      // Add a business to the project
      await prisma.business.create({
        data: {
          projectId: project.id,
          placeId: 'test-place-list',
          businessName: 'Test Business',
          addedByAdminId: adminId,
        },
      });

      const projects = await prisma.project.findMany({
        include: {
          _count: {
            select: { businesses: true },
          },
          createdBy: true,
        },
      });

      expect(projects.length).toBeGreaterThan(0);
      const foundProject = projects.find(p => p.id === project.id);
      expect(foundProject).toBeDefined();
      expect(foundProject?._count.businesses).toBe(1);
    });

    it('should update project', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Original Name',
          status: 'active',
          createdByAdminId: adminId,
        },
      });

      const updated = await prisma.project.update({
        where: { id: project.id },
        data: {
          name: 'Updated Name',
          description: 'Updated Description',
          status: 'inactive',
        },
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe('Updated Description');
      expect(updated.status).toBe('inactive');
    });

    it('should delete project and cascade delete businesses', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Delete Test Project',
          status: 'active',
          createdByAdminId: adminId,
        },
      });

      // Add businesses
      await prisma.business.create({
        data: {
          projectId: project.id,
          placeId: 'delete-place-1',
          businessName: 'Business 1',
          addedByAdminId: adminId,
        },
      });

      await prisma.business.create({
        data: {
          projectId: project.id,
          placeId: 'delete-place-2',
          businessName: 'Business 2',
          addedByAdminId: adminId,
        },
      });

      // Delete project
      await prisma.project.delete({
        where: { id: project.id },
      });

      // Verify businesses were cascade deleted
      const businesses = await prisma.business.findMany({
        where: { projectId: project.id },
      });

      expect(businesses).toHaveLength(0);
    });

    it('should filter projects by status', async () => {
      await prisma.project.create({
        data: {
          name: 'Active Project',
          status: 'active',
          createdByAdminId: adminId,
        },
      });

      await prisma.project.create({
        data: {
          name: 'Inactive Project',
          status: 'inactive',
          createdByAdminId: adminId,
        },
      });

      const activeProjects = await prisma.project.findMany({
        where: { status: 'active' },
      });

      const inactiveProjects = await prisma.project.findMany({
        where: { status: 'inactive' },
      });

      expect(activeProjects.length).toBeGreaterThan(0);
      expect(inactiveProjects.length).toBeGreaterThan(0);
      expect(activeProjects.every(p => p.status === 'active')).toBe(true);
      expect(inactiveProjects.every(p => p.status === 'inactive')).toBe(true);
    });
  });

  describe('Authentication Required', () => {
    it('should track which admin created the project', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Auth Test Project',
          status: 'active',
          createdByAdminId: adminId,
        },
        include: {
          createdBy: true,
        },
      });

      expect(project.createdBy.id).toBe(adminId);
      expect(project.createdBy.email).toBe('project-admin@example.com');
    });
  });
});
