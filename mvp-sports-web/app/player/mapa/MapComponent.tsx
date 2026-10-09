"use client";
import { useCallback, useRef, useEffect, useState } from "react";
import { GoogleMap, Marker, useLoadScript, Circle } from "@react-google-maps/api";
import { useRouter } from "next/navigation";

const containerStyle = { width: "100%", height: "100%" };

const getSportColor = (sportId: string) => {
  switch (sportId) {
    case "futbol": case "futbolito": return "#10b981";
    case "padel": return "#3b82f6";
    case "tenis": return "#f59e0b";
    case "basquet": return "#f97316";
    case "voley": return "#a855f7";
    default: return "#10b981";
  }
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#020617" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748B" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#083344" }] },
];

const LIGHT_MAP_STYLE = [
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#BAE6FD" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#F8FAFC" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E2E8F0" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#DCFCE7" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "labels.text.fill", stylers: [{ color: "#64748B" }] },
];

export default function MapView({ venues, center, isDark }: { venues: any[]; center: { lat: number; lng: number }; isDark: boolean }) {
  const router = useRouter();
  const [mapCenter, setMapCenter] = useState(center);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    setMapCenter(center);
    if (mapRef.current) mapRef.current.panTo(center);
  }, [center]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral | null>(null);

  useEffect(() => {
    if (!isLoaded || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(p);
        if (mapRef.current) mapRef.current.panTo(p);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isLoaded]);

  if (loadError) return <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium">Error al cargar Google Maps</div>;
  if (!isLoaded) return <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={14}
      onLoad={onLoad}
      options={{
        zoomControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
      }}
    >
      {userPos && (
        <>
          <Marker position={userPos} icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6",
            fillOpacity: 0.4,
            strokeColor: "#3b82f6",
            strokeWeight: 2,
          }} />
          <Circle center={userPos} radius={15} options={{ strokeColor: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1, strokeWeight: 1 }} />
        </>
      )}

      {venues.map((v) => {
        const color = getSportColor(v.primarySportId);
        return (
          <Marker
            key={v.id}
            position={{ lat: v.lat, lng: v.lng }}
            onClick={() => router.push(`/player/clubes/${v.id}`)}
            icon={{
              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
              fillColor: color,
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
              scale: 1.5,
              anchor: new google.maps.Point(12, 24),
            }}
          />
        );
      })}
    </GoogleMap>
  );
}
