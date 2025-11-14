/**
 * GET /api/admin/projects - List all projects
 * POST /api/admin/projects - Create new project
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/apps/localhub/server/db';
import { withAuth, type AuthenticatedRequest } from '@/apps/localhub/server/auth-middleware';
import { badRequest, serverError } from '@/apps/localhub/server/utils';

/**
 * List all projects with optional status filter
 */
async function handleGet(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build where clause
    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            businesses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform response
    const projectsData = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdByAdminId: project.createdByAdminId,
      createdBy: project.createdBy,
      businessCount: project._count.businesses,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));

    return NextResponse.json({ projects: projectsData });

  } catch (error) {
    console.error('List projects error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

/**
 * Create new project
 */
async function handlePost(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { name, description, status } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return badRequest('Project name is required');
    }

    // Validate status
    const validStatuses = ['active', 'inactive'];
    const projectStatus = status || 'active';
    if (!validStatuses.includes(projectStatus)) {
      return badRequest('Status must be either "active" or "inactive"');
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: projectStatus,
        createdByAdminId: request.admin!.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          createdByAdminId: project.createdByAdminId,
          createdBy: project.createdBy,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Create project error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
