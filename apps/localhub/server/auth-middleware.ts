/**
 * Authentication Middleware
 * Wraps API route handlers to require authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from './auth';
import type { Admin } from '@prisma/client';

export interface AuthenticatedRequest extends NextRequest {
  admin?: Admin;
}

type RouteHandler = (
  request: AuthenticatedRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Higher-order function to wrap route handlers with authentication
 * Validates session token from cookie and attaches admin to request
 */
export function withAuth(handler: RouteHandler) {
  return async (request: NextRequest, context?: any) => {
    // Get session token from cookie
    const token = request.cookies.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
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

    // Attach admin to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.admin = admin;

    // Call the original handler
    return handler(authenticatedRequest, context);
  };
}
