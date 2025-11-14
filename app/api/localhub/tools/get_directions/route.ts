/**
 * Get Directions Tool Handler
 * Integrates with Google Directions API to provide route information
 * and returns structured content with polyline, distance, duration, and Google Maps URL
 */

import { NextResponse } from 'next/server';
import { badRequest, externalError, serverError } from '@/apps/localhub/server/utils';
import type { LatLng, DirectionsData } from '@/apps/localhub/server/types';

// Use Edge runtime for low latency
export const runtime = 'edge';

/**
 * POST handler for get_directions tool
 * Accepts to_coords, from_coords, mode, and language parameters
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const {
      to_coords,
      from_coords,
      mode = 'driving',
      language
    } = body;

    // Validate required parameters
    if (!to_coords || typeof to_coords !== 'object' || typeof to_coords.lat !== 'number' || typeof to_coords.lng !== 'number') {
      return badRequest('Missing or invalid required parameter: to_coords (must be an object with lat and lng numbers)');
    }

    if (!from_coords || typeof from_coords !== 'object' || typeof from_coords.lat !== 'number' || typeof from_coords.lng !== 'number') {
      return badRequest('Missing or invalid required parameter: from_coords (must be an object with lat and lng numbers)');
    }

    // Get API key (use GOOGLE_DIRECTIONS_API_KEY or fallback to GOOGLE_PLACES_API_KEY)
    const apiKey = process.env.GOOGLE_DIRECTIONS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return serverError('GOOGLE_DIRECTIONS_API_KEY not configured');
    }

    // Build Directions API URL
    const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
    directionsUrl.searchParams.append('origin', `${from_coords.lat},${from_coords.lng}`);
    directionsUrl.searchParams.append('destination', `${to_coords.lat},${to_coords.lng}`);
    directionsUrl.searchParams.append('mode', mode);
    directionsUrl.searchParams.append('key', apiKey);

    if (language) {
      directionsUrl.searchParams.append('language', language);
    }

    // Fetch from Directions API
    const directionsResponse = await fetch(directionsUrl.toString(), { cache: 'no-store' });
    const directionsData = await directionsResponse.json();

    // Check API response status - only OK is success
    if (directionsData.status !== 'OK') {
      return externalError(
        `Directions API error: ${directionsData.status}${directionsData.error_message ? ' - ' + directionsData.error_message : ''}`
      );
    }

    // Extract route data
    const route = directionsData.routes?.[0];
    if (!route) {
      return externalError('No routes found in Directions API response');
    }

    const leg = route.legs?.[0];
    if (!leg) {
      return externalError('No legs found in route');
    }

    const polyline = route.overview_polyline?.points;
    if (!polyline) {
      return externalError('No polyline found in route');
    }

    const distanceText = leg.distance?.text || 'Unknown distance';
    const durationText = leg.duration?.text || 'Unknown duration';

    // Generate Google Maps URL
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${from_coords.lat},${from_coords.lng}`)}&destination=${encodeURIComponent(`${to_coords.lat},${to_coords.lng}`)}&travelmode=${mode}`;

    // Build directions data
    const directions: DirectionsData = {
      from: from_coords,
      to: to_coords,
      mode,
      polyline,
      distanceText,
      durationText,
      googleMapsUrl
    };

    // Return structured content response
    return NextResponse.json({
      directions
    });

  } catch (error) {
    console.error('Get directions error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}
