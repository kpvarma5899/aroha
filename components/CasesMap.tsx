"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCategoryLabel } from "@/lib/categories";
import type { Locale } from "@/lib/i18n";

const pin = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -28],
});

export type MapCase = {
  caseNumber: string;
  token: string;
  category: string;
  status: string;
  address: string;
  lat: number;
  lng: number;
  supportCount: number;
  daysOpen: number;
  approximate: boolean;
};

export default function CasesMap({ cases, locale }: { cases: MapCase[]; locale: Locale }) {
  const center = useMemo(() => {
    if (!cases[0]) return { lat: 17.385, lng: 78.4867 };
    return { lat: cases[0].lat, lng: cases[0].lng };
  }, [cases]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-[520px] w-full border border-line bg-paper-2" />;

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-[520px] w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {cases.map((row) => (
        <Marker key={row.token} position={[row.lat, row.lng]} icon={pin}>
          <Popup>
            <p className="font-medium">{getCategoryLabel(row.category, locale)}</p>
            <p>{row.address}</p>
            <p className="text-xs">
              {row.caseNumber} · {row.daysOpen}d · {row.supportCount} voices
              {row.approximate ? " · approximate pin" : ""}
            </p>
            <p>
              <a href={`/case/${row.caseNumber}`}>Open case</a>
            </p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
