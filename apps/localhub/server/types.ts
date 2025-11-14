// Shared TypeScript types for LocalHub MCP server

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  location: LatLng;
  provider: {
    source: string;
    placeId?: string;
  };
}

export interface SearchData {
  query: string;
  resolvedArea: string;
  center: LatLng;
  viewport: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface DirectionsData {
  from: LatLng;
  to: LatLng;
  mode: string;
  polyline: string;
  distanceText: string;
  durationText: string;
  googleMapsUrl: string;
}

export interface PlaceDetails {
  place_id: string;
  phone: string | null;
  international_phone: string | null;
  website: string | null;
  google_maps_url: string | null;
  price_level: number | null; // 0-4, where 0 is free and 4 is very expensive
  opening_hours: {
    open_now: boolean | null;
    weekday_text: string[];
  } | null;
  photos_available: boolean;
}

export interface ToolOutput {
  search?: SearchData;
  places?: Place[];
  directions?: DirectionsData;
  placeDetails?: PlaceDetails;
}
