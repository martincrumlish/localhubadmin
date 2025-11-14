import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import type { ToolOutput, Place, LatLng } from "./types";
import { useToolOutput, SET_GLOBALS_EVENT_TYPE } from "./hooks";

/**
 * Window.openai bridge interface with fallbacks for local development
 */
const openai = (globalThis as any).openai || {
  openExternal: ({ href }: { href: string }) => window.open(href, "_blank"),
  callTool: async (_name: string, _input: any) => ({}),
  requestDisplayMode: (_opts: any) => {},
  toolOutput: {}
};

/**
 * Google Maps loader singleton - ensures Maps API script loaded only once
 */
const loadMaps = (() => {
  let promise: Promise<typeof google> | null = null;
  return (apiKey = (window as any).GOOGLE_MAPS_PUBLIC_KEY) => {
    if (promise) return promise;
    promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.onerror = reject;
      script.onload = () => resolve((window as any).google);
      document.head.appendChild(script);
    });
    return promise;
  };
})();

/**
 * Decodes a Google polyline encoded string to array of LatLng coordinates
 */
function decodePolyline(str: string): LatLng[] {
  let index = 0, lat = 0, lng = 0;
  const coordinates: LatLng[] = [];

  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

/**
 * MapView component - renders Google Maps with place markers and route polylines
 */
function MapView({
  data,
  onSelect,
  selected,
  onMapReady
}: {
  data: ToolOutput;
  onSelect: (id: string) => void;
  selected: string | null;
  onMapReady: (ready: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const lineRef = useRef<google.maps.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Google Maps only when we have search data
  useEffect(() => {
    // Don't initialize map until we have actual search data
    if (!data.search?.center || mapRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const google = await loadMaps();
        if (cancelled || !ref.current) return;

        // Use center from search data
        const center = data.search.center;

        // Create map instance
        const map = new google.maps.Map(ref.current, {
          center,
          zoom: 13,
        });
        mapRef.current = map;

        // Fit viewport if available
        if (data.search?.viewport) {
          const { north, south, east, west } = data.search.viewport;
          const bounds = new google.maps.LatLngBounds(
            { lat: south, lng: west },
            { lat: north, lng: east }
          );
          map.fitBounds(bounds);
        }

        // Signal that map is ready
        console.log('Map initialized and ready');
        setMapReady(true);
        onMapReady(true);
      } catch (err) {
        console.error("Failed to load Google Maps:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data.search?.center]);

  // Update markers when data changes OR map becomes ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      console.log('Skipping markers update - map not ready yet');
      return;
    }

    console.log('=== UPDATING MARKERS ===');
    console.log('Data changed, places:', data.places?.length || 0);

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};

    // Create new markers for all places
    const places = data.places || [];
    console.log('Creating markers for places:', places.length);
    console.log('Places data:', places);

    const markers: Record<string, google.maps.Marker> = {};

    for (const place of places) {
      console.log('Creating marker for:', place.name, 'at', place.location);
      const marker = new google.maps.Marker({
        position: place.location,
        map,
        title: place.name,
      });

      marker.addListener("click", () => {
        console.log('Marker clicked:', place.name);
        onSelect(place.id);
      });

      markers[place.id] = marker;
    }

    console.log('Created', Object.keys(markers).length, 'markers');
    markersRef.current = markers;

    // Update map center and bounds if available
    if (data.search?.center) {
      map.setCenter(data.search.center);
    }

    if (data.search?.viewport) {
      const { north, south, east, west } = data.search.viewport;
      const bounds = new google.maps.LatLngBounds(
        { lat: south, lng: west },
        { lat: north, lng: east }
      );
      map.fitBounds(bounds);
    }
  }, [data, onSelect, mapReady]);

  // Update polyline when directions change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear previous polyline
    if (lineRef.current) {
      lineRef.current.setMap(null);
      lineRef.current = null;
    }

    // Render new polyline if directions exist
    if (data.directions?.polyline) {
      const path = decodePolyline(data.directions.polyline);
      const polyline = new google.maps.Polyline({
        path,
        map: mapRef.current,
        strokeColor: "#4285F4",
        strokeOpacity: 0.8,
        strokeWeight: 4
      });
      lineRef.current = polyline;
    }
  }, [data.directions?.polyline]);

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        borderRadius: 12,
        minHeight: 420,
        overflow: "hidden"
      }}
    >
      <div
        ref={ref}
        style={{
          width: "100%",
          height: "100%"
        }}
      />
      {!mapReady && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            zIndex: 1000
          }}
        >
          <div style={{ textAlign: "center", color: "#333" }}>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>
              Loading map...
            </div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Please wait
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * BusinessCard component - displays selected place details and actions
 */
function BusinessCard({
  place,
  directions,
  placeDetails,
  loadingDetails,
  onCall,
  onDirections
}: {
  place: Place;
  directions?: ToolOutput["directions"];
  placeDetails?: ToolOutput["placeDetails"];
  loadingDetails?: boolean;
  onCall: (href: string) => void;
  onDirections: () => Promise<void>;
}) {
  // Use phone from placeDetails if available, otherwise fallback to place.phone
  const phone = placeDetails?.phone || place.phone;
  const telHref = phone ? `tel:${phone.replace(/\s/g, "")}` : null;

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 12,
        backgroundColor: "#fff"
      }}
    >
      <h4 style={{ margin: "0 0 6px", color: "#000" }}>{place.name}</h4>

      {place.rating !== null && (
        <div style={{ fontSize: 12, color: "#666" }}>
          {place.rating} ⭐ ({place.userRatingsTotal})
        </div>
      )}

      <div style={{ fontSize: 13, marginTop: 6, color: "#333" }}>
        {place.address}
      </div>

      {loadingDetails && (
        <div style={{ fontSize: 13, marginTop: 4, color: "#666", fontStyle: "italic" }}>
          Loading details...
        </div>
      )}

      {phone && (
        <div style={{ fontSize: 13, marginTop: 4, color: "#333" }}>
          📞 {phone}
        </div>
      )}

      {placeDetails?.website && (
        <div style={{ fontSize: 13, marginTop: 4 }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openai.openExternal({ href: placeDetails.website! });
            }}
            style={{ color: "#007AFF", textDecoration: "none" }}
          >
            🌐 Website
          </a>
        </div>
      )}

      {placeDetails?.opening_hours?.open_now !== null && placeDetails?.opening_hours?.open_now !== undefined && (
        <div style={{ fontSize: 13, marginTop: 4, color: placeDetails?.opening_hours?.open_now ? "#34C759" : "#FF3B30" }}>
          {placeDetails?.opening_hours?.open_now ? "🟢 Open now" : "🔴 Closed"}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {telHref && (
          <button
            onClick={() => {
              console.log('Call button clicked, tel:', telHref);
              onCall(telHref);
            }}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #ddd",
              backgroundColor: "#007AFF",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13
            }}
          >
            Call Business
          </button>
        )}
        <button
          onClick={onDirections}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ddd",
            backgroundColor: "#34C759",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13
          }}
        >
          Get Directions
        </button>
      </div>

      {directions && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#333" }}>
          <div>
            ETA: {directions.durationText} • {directions.distanceText}
          </div>
          {directions.googleMapsUrl && (
            <div style={{ marginTop: 6 }}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openai.openExternal({ href: directions.googleMapsUrl });
                }}
                style={{ color: "#007AFF" }}
              >
                Open in Google Maps
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * App component - main widget application
 */
function App({ initial }: { initial: ToolOutput }) {
  // Use official React hook for tool output - event-driven, no polling needed
  const toolOutput = useToolOutput<ToolOutput>();

  const [selected, setSelected] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [placeDetails, setPlaceDetails] = useState<Record<string, ToolOutput['placeDetails']>>({});

  // Use toolOutput from hook, fall back to initial data if not yet available
  const data = (toolOutput && Object.keys(toolOutput).length > 0) ? toolOutput : initial;

  // Get selected place from places array
  const selectedPlace = useMemo(
    () => (data.places || []).find((p) => p.id === selected) || null,
    [selected, data.places]
  );

  // Fetch place details when a place is selected
  useEffect(() => {
    if (!selectedPlace || placeDetails[selectedPlace.id]) return;

    // Call the get_place_details tool
    setLoadingDetails(true);
    openai.callTool?.('localhub.get_place_details', { place_id: selectedPlace.id })
      .then((result: any) => {
        console.log('Place details fetched:', result);

        // Handle both direct response and MCP-wrapped response
        const details = result?.placeDetails || result?.structuredContent?.placeDetails;

        if (details) {
          console.log('Setting place details:', details);
          setPlaceDetails(prev => ({
            ...prev,
            [selectedPlace.id]: details
          }));
        } else {
          console.warn('No place details found in response:', result);
        }
      })
      .catch((error: any) => {
        console.error('Failed to fetch place details:', error);
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  }, [selectedPlace, placeDetails]);

  // Handle Call Business action
  const handleCall = (href: string) => {
    openai.openExternal({ href });
  };

  // Handle Get Directions action - opens Google Maps
  const handleDirections = () => {
    if (!selectedPlace) return;

    // Build Google Maps directions URL
    // This lets Google Maps handle getting the user's location
    const destination = encodeURIComponent(selectedPlace.address || selectedPlace.name);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${selectedPlace.id}`;

    console.log('Opening Google Maps directions:', googleMapsUrl);
    openai.openExternal({ href: googleMapsUrl });
  };

  // Handle Display Mode Toggle
  const toggleFullscreen = () => {
    setFull(!full);
    openai.requestDisplayMode?.({ mode: !full ? "fullscreen" : "inline" });
  };

  return (
    <div
      id="root"
      style={{
        display: "flex",
        height: "100%",
        fontFamily: "system-ui",
        gap: 12,
        backgroundColor: "#fff",
        color: "#000"
      }}
    >
      <MapView data={data} onSelect={setSelected} selected={selected} onMapReady={setMapReady} />

      <div style={{
        width: 340,
        maxWidth: "40%",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        backgroundColor: "#fff"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4
        }}>
          <img
            src={`${(window as any).LOCALHUB_BASE_URL || ''}/logo.png`}
            alt="LocalHub"
            style={{
              height: 32,
              width: "auto"
            }}
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {!mapReady || !data.places || data.places.length === 0 ? (
          <div style={{ fontSize: 13, color: "#666", fontStyle: "italic" }}>
            {!mapReady ? "Loading map..." : "Waiting for results..."}
          </div>
        ) : selectedPlace ? (
          <BusinessCard
            place={selectedPlace}
            directions={data.directions}
            placeDetails={placeDetails[selectedPlace.id]}
            loadingDetails={loadingDetails}
            onCall={handleCall}
            onDirections={handleDirections}
          />
        ) : (
          <div style={{ fontSize: 13, color: "#666" }}>
            Select a marker to see details
          </div>
        )}

        <button onClick={toggleFullscreen} style={{ marginTop: "auto" }}>
          {full ? "Exit Fullscreen" : "Expand"}
        </button>
      </div>
    </div>
  );
}

/**
 * Export init function for HTML mounting
 */
export default function init({ mount }: { mount: HTMLElement }) {
  console.log('=== WIDGET INIT CALLED ===');
  console.log('Mount element:', mount);
  console.log('openai object:', openai);
  console.log('toolOutput:', openai.toolOutput);

  const toolOutput = openai.toolOutput || {};
  console.log('Initial toolOutput:', toolOutput);
  console.log('toolOutput keys:', Object.keys(toolOutput));

  const root = createRoot(mount);
  root.render(<App initial={toolOutput} />);
  console.log('Widget rendered');
}
