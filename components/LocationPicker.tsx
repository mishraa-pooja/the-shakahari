/**
 * Google Maps location picker with reverse geocoding.
 * User clicks "Use My Location" (user gesture required for browser geolocation).
 * On pin/detect, reverse-geocodes to auto-fill address.
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

interface LocationPickerFullProps extends LocationPickerProps {
  addressText?: string;
}

export function LocationPicker({
  value,
  onChange,
  onAddressDetected,
  addressText,
}: LocationPickerFullProps) {
  const [locating, setLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<LatLng>(DEFAULT_CENTER);
  const mapRef = useRef<google.maps.Map | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const lastGeocodedRef = useRef<string>("");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });

  const getGeocoder = useCallback(() => {
    if (!geocoderRef.current && typeof google !== "undefined") {
      geocoderRef.current = new google.maps.Geocoder();
    }
    return geocoderRef.current;
  }, []);

  const reverseGeocode = useCallback(
    (lat: number, lng: number) => {
      if (!onAddressDetected) return;
      const gc = getGeocoder();
      if (!gc) return;
      gc.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          onAddressDetected(results[0].formatted_address);
        }
      });
    },
    [onAddressDetected, getGeocoder]
  );

  // Forward-geocode the typed address to center the map when no pin is set
  useEffect(() => {
    if (value) return; // already have a pin
    if (!isLoaded) return;
    const text = (addressText ?? "").trim();
    if (text.length < 10) return;
    if (text === lastGeocodedRef.current) return;
    lastGeocodedRef.current = text;

    const gc = getGeocoder();
    if (!gc) return;

    const timer = setTimeout(() => {
      gc.geocode({ address: text, region: "IN" }, (results, status) => {
        if (status === "OK" && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          const newCenter = { lat: loc.lat(), lng: loc.lng() };
          setMapCenter(newCenter);
          mapRef.current?.panTo(newCenter);
          mapRef.current?.setZoom(15);
        }
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [addressText, value, isLoaded, getGeocoder]);

  const setPin = useCallback(
    (lat: number, lng: number) => {
      onChange({ lat, lng });
      const loc = { lat, lng };
      setMapCenter(loc);
      mapRef.current?.panTo(loc);
      mapRef.current?.setZoom(17);
      reverseGeocode(lat, lng);
    },
    [onChange, reverseGeocode]
  );

  const permStatusRef = useRef<PermissionState | null>(null);

  const doGeolocate = useCallback(
    (silent = false) => {
      if (!navigator.geolocation) {
        if (!silent) toast.error("Geolocation not supported by your browser.");
        return;
      }
      setLocating(true);

      const onSuccess = (pos: GeolocationPosition) => {
        setPin(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        if (!silent) toast.success("Location detected!");
      };

      const onError = (err: GeolocationPositionError) => {
        if (err.code === 1) {
          setLocating(false);
          permStatusRef.current = "denied";
          if (!silent)
            toast.error(
              "Location access denied. Allow location in browser settings, or tap the map."
            );
          return;
        }
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          () => {
            setLocating(false);
            if (!silent)
              toast.info("Could not detect location. Tap the map to pin your spot.");
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 }
        );
      };

      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 120000,
      });
    },
    [setPin]
  );

  // Auto-detect location on mount if permission is already granted
  useEffect(() => {
    if (value) return;
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        permStatusRef.current = result.state;
        if (result.state === "granted") {
          doGeolocate(true);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocateMe = useCallback(() => {
    if (permStatusRef.current === "denied") {
      toast.error(
        "Location access is blocked. Enable it in your browser's site settings, or tap the map."
      );
      return;
    }
    doGeolocate(false);
  }, [doGeolocate]);

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
        center={value ?? mapCenter}
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
