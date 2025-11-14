/**
 * GET /api/admin/projects/[id]/businesses - List businesses for project
 * POST /api/admin/projects/[id]/businesses - Add business to project
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
 * List businesses for a project
 */
async function handleGet(request: AuthenticatedRequest, context: RouteContext) {
  try {
    const projectId = parseInt(context.params.id);

    if (isNaN(projectId)) {
      return badRequest('Invalid project ID');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get businesses
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

    return NextResponse.json({ businesses });

  } catch (error) {
    console.error('List businesses error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

/**
 * Add business to project
 */
async function handlePost(request: AuthenticatedRequest, context: RouteContext) {
  try {
    const projectId = parseInt(context.params.id);

    if (isNaN(projectId)) {
      return badRequest('Invalid project ID');
    }

    const body = await request.json();
    const { placeId, businessName } = body;

    // Validate required fields
    if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
      return badRequest('Place ID is required');
    }

    if (!businessName || typeof businessName !== 'string' || businessName.trim() === '') {
      return badRequest('Business name is required');
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check for duplicate placeId
    const existing = await prisma.business.findUnique({
      where: { placeId: placeId.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Business with this place ID already exists in the system' },
        { status: 409 }
      );
    }

    // Create business
    const business = await prisma.business.create({
      data: {
        projectId,
        placeId: placeId.trim(),
        businessName: businessName.trim(),
        addedByAdminId: request.admin!.id,
      },
      include: {
        addedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ business }, { status: 201 });

  } catch (error) {
    console.error('Add business error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
