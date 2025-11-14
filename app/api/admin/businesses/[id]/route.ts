/**
 * DELETE /api/admin/businesses/[id] - Remove business from project
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
 * Delete business
 */
async function handleDelete(request: AuthenticatedRequest, context: RouteContext) {
  try {
    const businessId = parseInt(context.params.id);

    if (isNaN(businessId)) {
      return badRequest('Invalid business ID');
    }

    await prisma.business.delete({
      where: { id: businessId },
    }).catch((error) => {
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Delete business error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export const DELETE = withAuth(handleDelete);
