/**
 * GET /api/admin/auth/me
 * Get current authenticated admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/apps/localhub/server/auth';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const token = request.cookies.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate session
    const admin = await validateSession(token);

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Return admin data (without password hash)
    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    });

  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
