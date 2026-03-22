/**
 * Google Maps location picker with reverse geocoding.
 * User clicks "Use My Location" (user gesture required for browser geolocation).
 * On pin/detect, reverse-geocodes to auto-fill address.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DEFAULT_CENTER = { lat: 19.076, lng: 72.8777 };

const MAP_STYLE: React.CSSProperties = {
  width: "100%",
  height: "180px",
  borderRadius: "6px",
};

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: "greedy",
  clickableIcons: false,
};

export interface LatLng {
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  value?: LatLng | null;
  onChange: (loc: LatLng) => void;
  onAddressDetected?: (address: string) => void;
}

export function LocationPicker({
  value,
  onChange,
  onAddressDetected,
}: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!onAddressDetected) return;
      if (!geocoderRef.current) {
        geocoderRef.current = new google.maps.Geocoder();
      }
      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === "OK" && results?.[0]) {
            onAddressDetected(results[0].formatted_address);
          }
        }
      );
    },
    [onAddressDetected]
  );

  const setPin = useCallback(
    (lat: number, lng: number) => {
      onChange({ lat, lng });
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(17);
      reverseGeocode(lat, lng);
    },
    [onChange, reverseGeocode]
  );

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser.");
      return;
    }
    setLocating(true);

    const onSuccess = (pos: GeolocationPosition) => {
      setPin(pos.coords.latitude, pos.coords.longitude);
      setLocating(false);
      toast.success("Location detected!");
    };

    const onError = (err: GeolocationPositionError) => {
      if (err.code === 1) {
        setLocating(false);
        toast.error("Location access denied. Allow location in browser settings, or tap the map.");
        return;
      }
      // enableHighAccuracy failed — retry with low accuracy (WiFi/network)
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        () => {
          setLocating(false);
          toast.error("Could not detect location. Tap the map to pin your spot.");
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      );
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    });
  }, [setPin]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setPin(e.latLng.lat(), e.latLng.lng());
      }
    },
    [setPin]
  );

  if (!apiKey) return null;

  if (!isLoaded) {
    return (
      <div className="h-[180px] w-full animate-pulse rounded-md bg-gold/10" />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gold/80">
          Pin Delivery Location
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={handleLocateMe}
          disabled={locating}
          className="text-xs px-3 py-1"
        >
          {locating ? "Detecting…" : "📍 Use My Location"}
        </Button>
      </div>

      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={value ?? DEFAULT_CENTER}
        zoom={value ? 17 : 12}
        options={MAP_OPTIONS}
        onClick={handleMapClick}
        onLoad={onMapLoad}
      >
        {value && (
          <MarkerF
            position={value}
            draggable
            onDragEnd={(e) => {
              if (e.latLng) setPin(e.latLng.lat(), e.latLng.lng());
            }}
          />
        )}
      </GoogleMap>

      <p className="text-xs text-gold/50">
        {value
          ? `📍 ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
          : "Click \"Use My Location\" or tap the map to pin your delivery spot"}
      </p>
    </div>
  );
}
