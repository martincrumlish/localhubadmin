import { NextResponse } from 'next/server';

/**
 * OAuth Protected Resource Discovery Endpoint
 *
 * This endpoint tells ChatGPT and other MCP clients that this server
 * does NOT require OAuth authentication (no-auth mode).
 *
 * Returning an empty object {} signals that no authorization servers
 * are required for accessing the MCP endpoints.
 *
 * Reference: MCP Authorization Spec
 * https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
 */
export async function GET() {
  // Empty object means "no OAuth required"
  return NextResponse.json({});
}
