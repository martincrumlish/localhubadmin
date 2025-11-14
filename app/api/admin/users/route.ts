/**
 * GET /api/admin/users - List all admin users
 * POST /api/admin/users - Create new admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/apps/localhub/server/db';
import { hashPassword } from '@/apps/localhub/server/auth';
import { withAuth, type AuthenticatedRequest } from '@/apps/localhub/server/auth-middleware';
import { badRequest, serverError } from '@/apps/localhub/server/utils';

/**
 * List all admin users (excluding password hashes)
 */
async function handleGet(request: AuthenticatedRequest) {
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ admins });

  } catch (error) {
    console.error('List admins error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

/**
 * Create new admin user
 */
async function handlePost(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate email
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return badRequest('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return badRequest('Invalid email format');
    }

    // Validate password
    if (!password || typeof password !== 'string') {
      return badRequest('Password is required');
    }

    if (password.length < 8) {
      return badRequest('Password must be at least 8 characters');
    }

    // Check if email already exists
    const existing = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password and create admin
    const passwordHash = await hashPassword(password);

    const admin = await prisma.admin.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ admin }, { status: 201 });

  } catch (error) {
    console.error('Create admin error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

export const GET = withAuth(handleGet);
export const POST = withAuth(handlePost);
