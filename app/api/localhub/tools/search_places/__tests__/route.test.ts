/**
 * Tests for search_places tool endpoint
 * These tests verify the Places API integration, geocoding, and viewport calculation
 */

import { POST } from '../route';

// Mock fetch globally for API calls
global.fetch = jest.fn();

describe('Search Places Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables for tests
    process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';
  });

  it('should successfully search with query and where parameters', async () => {
    // Mock geocoding API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [{
          geometry: {
            location: { lat: 53.3498, lng: -6.2603 }
          }
        }]
      })
    });

    // Mock Places API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            place_id: 'place1',
            name: 'Test Coffee Shop',
            vicinity: '123 Main St',
            geometry: { location: { lat: 53.35, lng: -6.26 } },
            rating: 4.5,
            user_ratings_total: 100
          }
        ]
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/search_places', {
      method: 'POST',
      body: JSON.stringify({
        query: 'coffee',
        where: 'Dublin'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.search).toBeDefined();
    expect(data.search.query).toBe('coffee');
    expect(data.search.resolvedArea).toBe('Dublin');
    expect(data.places).toBeDefined();
    expect(Array.isArray(data.places)).toBe(true);
    expect(data.places.length).toBeGreaterThan(0);
  });

  it('should successfully search with query and center coordinates', async () => {
    // Mock Places API response only (no geocoding needed)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            place_id: 'place1',
            name: 'Test Restaurant',
            vicinity: '456 Oak Ave',
            geometry: { location: { lat: 53.34, lng: -6.25 } },
            rating: 4.2,
            user_ratings_total: 50
          },
          {
            place_id: 'place2',
            name: 'Another Restaurant',
            vicinity: '789 Pine St',
            geometry: { location: { lat: 53.36, lng: -6.27 } },
            rating: 4.8,
            user_ratings_total: 200
          }
        ]
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/search_places', {
      method: 'POST',
      body: JSON.stringify({
        query: 'restaurants',
        center: { lat: 53.3498, lng: -6.2603 }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.search.center).toEqual({ lat: 53.3498, lng: -6.2603 });
    expect(data.places.length).toBe(2);
    expect(data.search.viewport).toBeDefined();
    expect(data.search.viewport.north).toBeDefined();
    expect(data.search.viewport.south).toBeDefined();
    expect(data.search.viewport.east).toBeDefined();
    expect(data.search.viewport.west).toBeDefined();
  });

  it('should return 400 error when geocoding fails', async () => {
    // Mock geocoding API returning no results
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'ZERO_RESULTS',
        results: []
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/search_places', {
      method: 'POST',
      body: JSON.stringify({
        query: 'coffee',
        where: 'NonExistentPlace12345'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.error).toContain('Could not resolve');
  });

  it('should return 502 error when Places API returns error status', async () => {
    // Mock Places API error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'REQUEST_DENIED',
        error_message: 'Invalid API key'
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/search_places', {
      method: 'POST',
      body: JSON.stringify({
        query: 'coffee',
        center: { lat: 53.3498, lng: -6.2603 }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBeDefined();
  });

  it('should include search object and places array in response', async () => {
    // Mock Places API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            place_id: 'test_place',
            name: 'Test Place',
            vicinity: 'Test Address',
            geometry: { location: { lat: 53.35, lng: -6.26 } },
            rating: 4.0,
            user_ratings_total: 75
          }
        ]
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/search_places', {
      method: 'POST',
      body: JSON.stringify({
        query: 'test',
        center: { lat: 53.3498, lng: -6.2603 }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toHaveProperty('search');
    expect(data).toHaveProperty('places');
    expect(data.search).toHaveProperty('query');
    expect(data.search).toHaveProperty('resolvedArea');
    expect(data.search).toHaveProperty('center');
    expect(data.search).toHaveProperty('viewport');

    const place = data.places[0];
    expect(place).toHaveProperty('id');
    expect(place).toHaveProperty('name');
    expect(place).toHaveProperty('address');
    expect(place).toHaveProperty('phone');
    expect(place).toHaveProperty('rating');
    expect(place).toHaveProperty('userRatingsTotal');
    expect(place).toHaveProperty('location');
    expect(place).toHaveProperty('provider');
    expect(place.phone).toBe(null); // Phase 1 doesn't include phone enrichment
    expect(place.provider.source).toBe('google_places');
  });

  it('should handle ZERO_RESULTS from Places API gracefully', async () => {
    // Mock Places API returning no results
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'ZERO_RESULTS',
        results: []
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/search_places', {
      method: 'POST',
      body: JSON.stringify({
        query: 'extremely_specific_nonexistent_place',
        center: { lat: 53.3498, lng: -6.2603 }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.places).toEqual([]);
    expect(data.search).toBeDefined();
  });
});
