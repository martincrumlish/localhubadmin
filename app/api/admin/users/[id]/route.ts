/**
 * DELETE /api/admin/users/[id] - Delete admin user
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
 * Delete admin user (with self-delete prevention)
 */
async function handleDelete(request: AuthenticatedRequest, context: RouteContext) {
  try {
    const targetAdminId = parseInt(context.params.id);

    if (isNaN(targetAdminId)) {
      return badRequest('Invalid admin ID');
    }

    // Prevent self-delete
    if (targetAdminId === request.admin!.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin account' },
        { status: 403 }
      );
    }

    // Delete admin (cascade deletes sessions)
    await prisma.admin.delete({
      where: { id: targetAdminId },
    }).catch((error) => {
      if (error.code === 'P2025') {
        return null;
      }
      throw error;
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Delete admin error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export const DELETE = withAuth(handleDelete);
