/**
 * GET /api/admin/projects/[id] - Get project details
 * PATCH /api/admin/projects/[id] - Update project
 * DELETE /api/admin/projects/[id] - Delete project
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/apps/localhub/server/db';
import { withAuth, type AuthenticatedRequest } from '@/apps/localhub/server/auth-middleware';
import { badRequest, serverError } from '@/apps/localhub/server/utils';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * Get project details
 */
async function handleGet(request: AuthenticatedRequest, context: RouteContext) {
  try {
    const projectId = parseInt(context.params.id);

    if (isNaN(projectId)) {
      return badRequest('Invalid project ID');
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
        businesses: {
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
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        createdByAdminId: project.createdByAdminId,
        createdBy: project.createdBy,
        businesses: project.businesses,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });

  } catch (error) {
    console.error('Get project error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

/**
 * Update project
 */
async function handlePatch(request: AuthenticatedRequest, context: RouteContext) {
  try {
    const projectId = parseInt(context.params.id);

    if (isNaN(projectId)) {
      return badRequest('Invalid project ID');
    }

    const body = await request.json();
    const { name, description, status } = body;

    // Build update data
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return badRequest('Project name cannot be empty');
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'inactive'];
      if (!validStatuses.includes(status)) {
        return badRequest('Status must be either "active" or "inactive"');
      }
      updateData.status = status;
    }

    // Update project
    const project = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }).catch((error) => {
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('Update project error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

/**
 * Delete project (cascade deletes businesses)
 */
async function handleDelete(request: AuthenticatedRequest, context: RouteContext) {
  try {
    const projectId = parseInt(context.params.id);

    if (isNaN(projectId)) {
      return badRequest('Invalid project ID');
    }

    await prisma.project.delete({
      where: { id: projectId },
    }).catch((error) => {
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Delete project error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export const GET = withAuth(handleGet);
export const PATCH = withAuth(handlePatch);
export const DELETE = withAuth(handleDelete);
