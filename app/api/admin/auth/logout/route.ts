/**
 * POST /api/admin/auth/logout
 * Delete session and clear cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/apps/localhub/server/auth';

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const token = request.cookies.get('admin_session')?.value;

    if (token) {
      // Delete session from database
      await deleteSession(token);
    }

    // Create response and clear cookie
    const response = NextResponse.json({ success: true });

    response.cookies.delete('admin_session');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, clear the cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_session');
    return response;
  }
}
