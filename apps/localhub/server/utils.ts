import { NextResponse } from 'next/server';

/**
 * Returns a 400 Bad Request error response
 * Used for validation errors and missing required parameters
 */
export function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

/**
 * Returns a 502 Bad Gateway error response
 * Used when external API calls fail or return errors
 */
export function externalError(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 502 }
  );
}

/**
 * Returns a 500 Internal Server Error response
 * Used for unexpected server errors and exceptions
 */
export function serverError(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 500 }
  );
}
