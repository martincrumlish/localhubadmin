'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Business {
  id: number;
  placeId: string;
  businessName: string;
}

interface MapsBusinessPickerProps {
  projectId: string;
  onBusinessAdded: () => void;
  existingBusinesses?: Business[];
  onMapReady?: (focusBusiness: (placeId: string) => void) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function MapsBusinessPicker({ projectId, onBusinessAdded, existingBusinesses = [], onMapReady }: MapsBusinessPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [searchBox, setSearchBox] = useState<any>(null);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const existingMarkersRef = useRef<Map<string, { marker: any; infoWindow: any }>>(new Map());
  const scriptLoadedRef = useRef(false);
  const mapReadyCalledRef = useRef(false);

  useEffect(() => {
    // Load Google Maps script only once
    if (scriptLoadedRef.current) return;

    if (!window.google) {
      scriptLoadedRef.current = true;
      const script = document.createElement('script');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapsLoaded(true);
      };
      script.onerror = () => {
        toast.error('Failed to load Google Maps');
        scriptLoadedRef.current = false;
      };
      document.head.appendChild(script);
    } else {
      setMapsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (mapsLoaded && mapRef.current && !map) {
      // Initialize map
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center: { lat: 37.7749, lng: -122.4194 }, // San Francisco default (will be adjusted)
        zoom: 12,
      });
      setMap(googleMap);

      // Initialize search box
      if (searchInputRef.current) {
        const searchBoxInstance = new window.google.maps.places.SearchBox(searchInputRef.current);
        setSearchBox(searchBoxInstance);

        // Bias search results to map viewport
        googleMap.addListener('bounds_changed', () => {
          const bounds = googleMap.getBounds();
          if (bounds) {
            searchBoxInstance.setBounds(bounds);
          }
        });

        // Listen for place selection
        searchBoxInstance.addListener('places_changed', () => {
          const places = searchBoxInstance.getPlaces();

          if (places.length === 0) {
            return;
          }

          // Clear previous markers
          const bounds = new window.google.maps.LatLngBounds();

          places.forEach((place: any) => {
            if (!place.geometry || !place.geometry.location) {
              return;
            }

            // Create marker
            const marker = new window.google.maps.Marker({
              map: googleMap,
              title: place.name,
              position: place.geometry.location,
            });

            // Add click listener to marker
            marker.addListener('click', () => {
              setSelectedPlace(place);

              // Show info window
              const infoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px;">
                    <h3 style="font-weight: bold; margin-bottom: 8px;">${place.name}</h3>
                    <p style="font-size: 14px; color: #666; margin-bottom: 8px;">${place.formatted_address || ''}</p>
                    <p style="font-size: 12px; color: #999;">Place ID: ${place.place_id}</p>
                  </div>
                `,
              });
              infoWindow.open(googleMap, marker);
            });

            bounds.extend(place.geometry.location);
          });

          googleMap.fitBounds(bounds);
        });
      }
    }
  }, [mapsLoaded, map]);

  // Expose focusBusiness function to parent - only call once when map is ready
  useEffect(() => {
    if (map && onMapReady && !mapReadyCalledRef.current) {
      mapReadyCalledRef.current = true;

      const focusBusiness = (placeId: string) => {
        const markerData = existingMarkersRef.current.get(placeId);
        if (markerData && map) {
          const position = markerData.marker.getPosition();
          map.panTo(position);
          map.setZoom(16);
          markerData.infoWindow.open(map, markerData.marker);

          // Scroll to map
          mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };

      onMapReady(focusBusiness);
    }
  }, [map]);

  // Load and display existing businesses on the map
  useEffect(() => {
    if (!map || !mapsLoaded || !window.google?.maps?.places) return;

    // Clear existing markers
    existingMarkersRef.current.forEach((markerData) => markerData.marker.setMap(null));
    existingMarkersRef.current.clear();

    if (existingBusinesses.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    // Small delay to ensure Places API is fully initialized
    const loadMarkers = () => {
      try {
        const placesService = new window.google.maps.places.PlacesService(map);

        // Load details for each business and create markers
        existingBusinesses.forEach((business, index) => {
          placesService.getDetails(
            {
              placeId: business.placeId,
              fields: ['name', 'geometry', 'formatted_address'],
            },
            (place: any, status: any) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            // Create marker for existing business
            const marker = new window.google.maps.Marker({
              map: map,
              position: place.geometry.location,
              title: business.businessName,
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Blue marker for saved businesses
              },
            });

            // Add info window
            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px;">
                  <h3 style="font-weight: bold; margin-bottom: 8px;">${business.businessName}</h3>
                  <p style="font-size: 14px; color: #666; margin-bottom: 8px;">${place.formatted_address || ''}</p>
                  <p style="font-size: 12px; color: #999;">Place ID: ${business.placeId}</p>
                  <p style="font-size: 12px; color: #0066cc; font-weight: bold; margin-top: 8px;">✓ Saved</p>
                </div>
              `,
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });

                // Store marker with placeId
                existingMarkersRef.current.set(business.placeId, { marker, infoWindow });
                bounds.extend(place.geometry.location);

                // If this is the last business, fit bounds
                if (existingMarkersRef.current.size === existingBusinesses.length) {
                  map.fitBounds(bounds);
                  // Adjust zoom if only one business
                  if (existingBusinesses.length === 1) {
                    const listener = window.google.maps.event.addListener(map, 'idle', () => {
                      if (map.getZoom() > 15) map.setZoom(15);
                      window.google.maps.event.removeListener(listener);
                    });
                  }
                }
              } else if (status === window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                console.warn('Places API quota exceeded for:', business.businessName);
              } else {
                console.warn('Could not load place details for:', business.businessName, status);
              }
            }
          );
        });
      } catch (error) {
        console.error('Error loading business markers:', error);
        toast.error('Failed to load saved businesses on map');
      }
    };

    // Add small delay to ensure Places API is ready
    const timer = setTimeout(loadMarkers, 100);
    return () => clearTimeout(timer);
  }, [map, mapsLoaded, existingBusinesses]);

  const handleAddBusiness = async () => {
    if (!selectedPlace) {
      toast.error('Please select a business from the map');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/projects/${projectId}/businesses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          placeId: selectedPlace.place_id,
          businessName: selectedPlace.name,
        }),
      });

      if (response.ok) {
        toast.success('Business added successfully');
        setSelectedPlace(null);
        onBusinessAdded();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add business');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mapsLoaded) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-600">Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search for a business..."
          className="w-full"
        />
      </div>

      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-lg border border-gray-300"
      />

      {selectedPlace && (
        <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
          <h4 className="font-semibold mb-2">Selected Business</h4>
          <p className="text-sm mb-1">
            <span className="font-medium">Name:</span> {selectedPlace.name}
          </p>
          <p className="text-sm mb-1">
            <span className="font-medium">Address:</span> {selectedPlace.formatted_address || 'N/A'}
          </p>
          <p className="text-sm mb-4">
            <span className="font-medium">Place ID:</span> <code className="text-xs">{selectedPlace.place_id}</code>
          </p>
          <Button onClick={handleAddBusiness} disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Business to Project'}
          </Button>
        </div>
      )}
    </div>
  );
}
