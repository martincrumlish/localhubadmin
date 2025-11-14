/**
 * Get Place Details Tool Handler
 * Fetches detailed information about a specific place using Google Place Details API
 * Returns phone number, opening hours, website, and other details
 */

import { NextResponse } from 'next/server';
import { badRequest, externalError, serverError } from '@/apps/localhub/server/utils';

// Use Edge runtime for low latency
export const runtime = 'edge';

/**
 * POST handler for get_place_details tool
 * Accepts place_id parameter
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { place_id } = body;

    // Validate required parameters
    if (!place_id || typeof place_id !== 'string') {
      return badRequest('Missing required parameter: place_id');
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return serverError('GOOGLE_PLACES_API_KEY not configured');
    }

    // Build Place Details API URL
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.append('place_id', place_id);
    detailsUrl.searchParams.append('key', apiKey);

    // Request specific fields to minimize API usage and costs
    detailsUrl.searchParams.append('fields', 'formatted_phone_number,international_phone_number,website,opening_hours,url,price_level,photos');

    // Fetch from Place Details API
    const response = await fetch(detailsUrl.toString(), { cache: 'no-store' });
    const data = await response.json();

    // Check API response status
    if (data.status !== 'OK') {
      return externalError(
        `Place Details API error: ${data.status}${data.error_message ? ' - ' + data.error_message : ''}`
      );
    }

    const result = data.result || {};

    // Build response with available details
    const details = {
      place_id,
      phone: result.formatted_phone_number || null,
      international_phone: result.international_phone_number || null,
      website: result.website || null,
      google_maps_url: result.url || null,
      price_level: result.price_level ?? null, // 0-4, where 0 is free and 4 is very expensive
      opening_hours: result.opening_hours ? {
        open_now: result.opening_hours.open_now ?? null,
        weekday_text: result.opening_hours.weekday_text || []
      } : null,
      photos_available: result.photos ? result.photos.length > 0 : false
    };

    return NextResponse.json(details);

  } catch (error) {
    console.error('Get place details error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}
