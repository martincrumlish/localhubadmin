/**
 * Tests for get_directions tool endpoint
 * These tests verify the Directions API integration and response formatting
 */

import { POST } from '../route';

// Mock fetch globally for API calls
global.fetch = jest.fn();

describe('Get Directions Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up environment variables for tests
    process.env.GOOGLE_DIRECTIONS_API_KEY = 'test-directions-key';
  });

  it('should successfully get directions with valid coordinates', async () => {
    // Mock Directions API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [{
          legs: [{
            distance: { text: '5.2 km' },
            duration: { text: '12 mins' }
          }],
          overview_polyline: {
            points: 'encodedPolylineString123'
          }
        }]
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/get_directions', {
      method: 'POST',
      body: JSON.stringify({
        from_coords: { lat: 53.3498, lng: -6.2603 },
        to_coords: { lat: 53.3448, lng: -6.2548 },
        mode: 'driving'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.directions).toBeDefined();
    expect(data.directions.from).toEqual({ lat: 53.3498, lng: -6.2603 });
    expect(data.directions.to).toEqual({ lat: 53.3448, lng: -6.2548 });
    expect(data.directions.mode).toBe('driving');
    expect(data.directions.polyline).toBe('encodedPolylineString123');
    expect(data.directions.distanceText).toBe('5.2 km');
    expect(data.directions.durationText).toBe('12 mins');
    expect(data.directions.googleMapsUrl).toContain('google.com/maps/dir');
  });

  it('should return 400 error when to_coords is missing', async () => {
    const request = new Request('http://localhost:3000/api/localhub/tools/get_directions', {
      method: 'POST',
      body: JSON.stringify({
        from_coords: { lat: 53.3498, lng: -6.2603 },
        mode: 'driving'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.error).toContain('to_coords');
  });

  it('should return 400 error when from_coords is missing', async () => {
    const request = new Request('http://localhost:3000/api/localhub/tools/get_directions', {
      method: 'POST',
      body: JSON.stringify({
        to_coords: { lat: 53.3448, lng: -6.2548 },
        mode: 'driving'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
    expect(data.error).toContain('from_coords');
  });

  it('should return 502 error when Directions API returns error status', async () => {
    // Mock Directions API error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'NOT_FOUND',
        error_message: 'At least one of the locations specified in the request could not be geocoded'
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/get_directions', {
      method: 'POST',
      body: JSON.stringify({
        from_coords: { lat: 53.3498, lng: -6.2603 },
        to_coords: { lat: 53.3448, lng: -6.2548 },
        mode: 'driving'
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBeDefined();
    expect(data.error).toContain('Directions API error');
  });

  it('should verify response includes polyline, distance, and duration', async () => {
    // Mock Directions API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [{
          legs: [{
            distance: { text: '3.8 km', value: 3800 },
            duration: { text: '8 mins', value: 480 }
          }],
          overview_polyline: {
            points: 'testPolyline456'
          }
        }]
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/get_directions', {
      method: 'POST',
      body: JSON.stringify({
        from_coords: { lat: 53.35, lng: -6.26 },
        to_coords: { lat: 53.34, lng: -6.25 }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.directions).toBeDefined();
    expect(data.directions.polyline).toBe('testPolyline456');
    expect(data.directions.distanceText).toBe('3.8 km');
    expect(data.directions.durationText).toBe('8 mins');
    expect(data.directions.googleMapsUrl).toBeDefined();
    expect(data.directions.googleMapsUrl).toContain('origin=53.35%2C-6.26');
    expect(data.directions.googleMapsUrl).toContain('destination=53.34%2C-6.25');
    expect(data.directions.googleMapsUrl).toContain('travelmode=driving');
  });

  it('should use default mode "driving" when not specified', async () => {
    // Mock Directions API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [{
          legs: [{
            distance: { text: '2.1 km' },
            duration: { text: '5 mins' }
          }],
          overview_polyline: {
            points: 'defaultModePolyline'
          }
        }]
      })
    });

    const request = new Request('http://localhost:3000/api/localhub/tools/get_directions', {
      method: 'POST',
      body: JSON.stringify({
        from_coords: { lat: 53.3498, lng: -6.2603 },
        to_coords: { lat: 53.3448, lng: -6.2548 }
      })
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.directions.mode).toBe('driving');
  });
});
