/**
 * Place Filter Utility
 * Filters Google Places API results to only include businesses in database
 */

import { prisma } from './db';

/**
 * Filter place IDs by checking which ones exist in the database
 * Returns array of place IDs that are found in the database
 */
export async function filterPlacesByDatabase(placeIds: string[]): Promise<string[]> {
  if (placeIds.length === 0) {
    return [];
  }

  const businesses = await prisma.business.findMany({
    where: {
      placeId: {
        in: placeIds,
      },
    },
    select: {
      placeId: true,
    },
  });

  return businesses.map((b) => b.placeId);
}

/**
 * Get all business place IDs from the database
 */
export async function getAllBusinessPlaceIds(): Promise<string[]> {
  const businesses = await prisma.business.findMany({
    select: {
      placeId: true,
    },
  });

  return businesses.map((b) => b.placeId);
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
