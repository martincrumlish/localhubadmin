/**
 * POST /api/admin/auth/login
 * Authenticate admin user and create session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/apps/localhub/server/db';
import { verifyPassword, createSession } from '@/apps/localhub/server/auth';
import { badRequest, serverError } from '@/apps/localhub/server/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return badRequest('Email is required');
    }

    if (!password || typeof password !== 'string') {
      return badRequest('Password is required');
    }

    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, admin.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create session
    const session = await createSession(admin.id);

    // Create response with session cookie
    const response = NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('admin_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}
