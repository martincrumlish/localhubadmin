/**
 * Search Places Tool Handler
 * Integrates with Google Geocoding API and Places Details API
 * to find local businesses and return structured content with map data
 * FILTERS results to only return businesses in the database within 40km radius
 */

import { NextResponse } from 'next/server';
import { badRequest, externalError, serverError } from '@/apps/localhub/server/utils';
import { getAllBusinessPlaceIds, calculateDistance } from '@/apps/localhub/server/place-filter';
import type { LatLng, Place, SearchData, ToolOutput } from '@/apps/localhub/server/types';

// Changed from edge to nodejs to support Prisma
export const runtime = 'nodejs';

async function geocodeWhere(where?: string): Promise<LatLng | null> {
  if (!where) {
    return null;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY not configured');
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.append('address', where);
  url.searchParams.append('key', apiKey);

  try {
    const response = await fetch(url.toString(), { cache: 'no-store' });
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

function expandViewportFromPoints(points: LatLng[]): SearchData['viewport'] | null {
  if (!points || points.length === 0) {
    return null;
  }

  let north = points[0].lat;
  let south = points[0].lat;
  let east = points[0].lng;
  let west = points[0].lng;

  for (const point of points) {
    if (point.lat > north) north = point.lat;
    if (point.lat < south) south = point.lat;
    if (point.lng > east) east = point.lng;
    if (point.lng < west) west = point.lng;
  }

  const padLat = (north - south) * 0.05;
  const padLng = (east - west) * 0.05;

  return {
    north: north + padLat,
    south: south - padLat,
    east: east + padLng,
    west: west - padLng
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      query,
      where,
      center,
      radius_m = 40000, // Default to 40km radius
      language
    } = body;

    if (!query || typeof query !== 'string') {
      return badRequest('Missing required parameter: query');
    }

    let resolvedCenter: LatLng | null = null;
    let resolvedArea = '';

    if (center && typeof center === 'object' && center.lat && center.lng) {
      resolvedCenter = { lat: center.lat, lng: center.lng };
    } else if (where) {
      resolvedCenter = await geocodeWhere(where);
      resolvedArea = where;

      if (!resolvedCenter) {
        return badRequest('Could not resolve a search area from the provided location');
      }
    } else {
      return badRequest('Either center coordinates or where location string must be provided');
    }

    const searchRadius = Math.max(100, Math.min(50000, radius_m));

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return serverError('GOOGLE_PLACES_API_KEY not configured');
    }

    // Get all businesses from database
    const databasePlaceIds = await getAllBusinessPlaceIds();
    console.log(`Radius Filter: Found ${databasePlaceIds.length} businesses in database`);

    if (databasePlaceIds.length === 0) {
      // No businesses in database
      const searchData: SearchData = {
        query,
        resolvedArea,
        center: resolvedCenter,
        viewport: {
          north: resolvedCenter.lat + 0.01,
          south: resolvedCenter.lat - 0.01,
          east: resolvedCenter.lng + 0.01,
          west: resolvedCenter.lng - 0.01
        }
      };

      return NextResponse.json({
        search: searchData,
        places: []
      });
    }

    // Fetch details for each business from Google Places API
    const placesWithinRadius: Place[] = [];
    const detailsPromises = databasePlaceIds.map(async (placeId) => {
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailsUrl.searchParams.append('place_id', placeId);
      detailsUrl.searchParams.append('fields', 'place_id,name,formatted_address,geometry,rating,user_ratings_total');
      detailsUrl.searchParams.append('key', apiKey);

      if (language) {
        detailsUrl.searchParams.append('language', language);
      }

      try {
        const response = await fetch(detailsUrl.toString(), { cache: 'no-store' });
        const data = await response.json();

        if (data.status === 'OK' && data.result) {
          const place = data.result;

          if (place.geometry?.location) {
            const distance = calculateDistance(
              resolvedCenter!.lat,
              resolvedCenter!.lng,
              place.geometry.location.lat,
              place.geometry.location.lng
            );

            // Only include if within search radius
            if (distance <= searchRadius) {
              return {
                id: place.place_id,
                name: place.name,
                address: place.formatted_address || '',
                phone: null,
                rating: place.rating ?? null,
                userRatingsTotal: place.user_ratings_total ?? null,
                location: {
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng
                },
                provider: {
                  source: 'google_places' as const,
                  placeId: place.place_id
                },
                distance
              };
            }
          }
        }
      } catch (error) {
        console.error(`Failed to fetch details for place ${placeId}:`, error);
      }

      return null;
    });

    const results = await Promise.all(detailsPromises);
    const validPlaces = results.filter((p): p is Place & { distance: number } => p !== null);

    // Sort by distance (closest first)
    validPlaces.sort((a, b) => a.distance - b.distance);

    // Remove distance property before returning
    const filteredPlaces: Place[] = validPlaces.map(({ distance, ...place }) => place);

    console.log(`Radius Filter: ${filteredPlaces.length} businesses within ${searchRadius}m of "${resolvedArea || 'coordinates'}"`);

    const placeLocations = filteredPlaces.map(p => p.location);
    const viewport = expandViewportFromPoints(placeLocations) || {
      north: resolvedCenter.lat + 0.01,
      south: resolvedCenter.lat - 0.01,
      east: resolvedCenter.lng + 0.01,
      west: resolvedCenter.lng - 0.01
    };

    const searchData: SearchData = {
      query,
      resolvedArea,
      center: resolvedCenter,
      viewport
    };

    const output: ToolOutput = {
      search: searchData,
      places: filteredPlaces
    };

    return NextResponse.json(output);

  } catch (error) {
    console.error('Search places error:', error);
    return serverError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}
