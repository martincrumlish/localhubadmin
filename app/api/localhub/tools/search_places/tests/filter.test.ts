/**
 * MCP Place Filtering Tests
 * Focused tests for critical filtering behaviors
 */

import { PrismaClient } from '@prisma/client';
import { filterPlacesByDatabase } from '@/apps/localhub/server/place-filter';
import { hashPassword } from '@/apps/localhub/server/auth';

const prisma = new PrismaClient();

describe('MCP Place Filtering', () => {
  let adminId: number;
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
        email: 'filter-test@example.com',
        passwordHash: await hashPassword('password'),
      },
    });
    adminId = admin.id;

    // Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Filter Test Project',
        status: 'active',
        createdByAdminId: adminId,
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Filter Functionality', () => {
    it('should return empty array for empty input', async () => {
      const result = await filterPlacesByDatabase([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when no businesses match', async () => {
      const result = await filterPlacesByDatabase(['non-existent-place-1', 'non-existent-place-2']);
      expect(result).toEqual([]);
    });

    it('should return matching place IDs from database', async () => {
      // Add businesses to database
      await prisma.business.create({
        data: {
          projectId,
          placeId: 'test-place-match-1',
          businessName: 'Match Business 1',
          addedByAdminId: adminId,
        },
      });

      await prisma.business.create({
        data: {
          projectId,
          placeId: 'test-place-match-2',
          businessName: 'Match Business 2',
          addedByAdminId: adminId,
        },
      });

      const result = await filterPlacesByDatabase([
        'test-place-match-1',
        'test-place-match-2',
        'non-existent-place',
      ]);

      expect(result).toHaveLength(2);
      expect(result).toContain('test-place-match-1');
      expect(result).toContain('test-place-match-2');
      expect(result).not.toContain('non-existent-place');
    });

    it('should handle large lists of place IDs efficiently', async () => {
      await prisma.business.create({
        data: {
          projectId,
          placeId: 'large-test-place',
          businessName: 'Large Test Business',
          addedByAdminId: adminId,
        },
      });

      const manyPlaceIds = Array.from({ length: 100 }, (_, i) => `fake-place-${i}`);
      manyPlaceIds.push('large-test-place');

      const result = await filterPlacesByDatabase(manyPlaceIds);

      expect(result).toHaveLength(1);
      expect(result).toContain('large-test-place');
    });

    it('should preserve case sensitivity of place IDs', async () => {
      await prisma.business.create({
        data: {
          projectId,
          placeId: 'CaseSensitiveID',
          businessName: 'Case Sensitive Business',
          addedByAdminId: adminId,
        },
      });

      const exactMatch = await filterPlacesByDatabase(['CaseSensitiveID']);
      const wrongCase = await filterPlacesByDatabase(['casesensitiveid']);

      expect(exactMatch).toHaveLength(1);
      expect(wrongCase).toHaveLength(0);
    });
  });

  describe('Integration with Database', () => {
    it('should find businesses across multiple projects', async () => {
      const project2 = await prisma.project.create({
        data: {
          name: 'Second Project',
          status: 'active',
          createdByAdminId: adminId,
        },
      });

      await prisma.business.create({
        data: {
          projectId,
          placeId: 'multi-project-place-1',
          businessName: 'Business in Project 1',
          addedByAdminId: adminId,
        },
      });

      await prisma.business.create({
        data: {
          projectId: project2.id,
          placeId: 'multi-project-place-2',
          businessName: 'Business in Project 2',
          addedByAdminId: adminId,
        },
      });

      const result = await filterPlacesByDatabase([
        'multi-project-place-1',
        'multi-project-place-2',
      ]);

      expect(result).toHaveLength(2);
    });
  });
});
