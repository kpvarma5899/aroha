"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const pin = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Props = {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
};

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
        const nextZoom = map.getZoom() < 16 ? 16 : map.getZoom();
        map.setView([lat, lng], nextZoom, { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function MapPicker({ lat, lng, onChange }: Props) {
  const position = useMemo(() => ({ lat, lng }), [lat, lng]);

  return (
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={14}
      className="h-[420px] w-full isolate"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[position.lat, position.lng]}
        icon={pin}
        draggable
        eventHandlers={{
          dragend(event) {
            const next = event.target.getLatLng();
            onChange(next.lat, next.lng);
          },
        }}
      />
      <ClickHandler onChange={onChange} />
      <Recenter lat={position.lat} lng={position.lng} />
    </MapContainer>
  );
}
