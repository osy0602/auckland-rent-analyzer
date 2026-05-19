"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import Map, { Marker, Popup } from "react-map-gl";
import { useState } from "react";

type AffordabilityStatus = "affordable" | "moderate" | "expensive";

type MapResult = {
  suburbName: string;
  suburbSlug: string;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  weeklyRent: number;
  monthlyRent: number;
  rentToIncomePercentage: number;
  status: AffordabilityStatus;
};

type RentMapProps = {
  results: MapResult[];
};

function getMarkerClass(status: AffordabilityStatus) {
  if (status === "affordable") {
    return "bg-green-500 border-green-700";
  }

  if (status === "moderate") {
    return "bg-yellow-400 border-yellow-600";
  }

  return "bg-red-500 border-red-700";
}

export default function RentMap({ results }: RentMapProps) {
  const [selectedSuburb, setSelectedSuburb] = useState<MapResult | null>(null);

  const validResults = results.filter(
    (item) => item.latitude !== null && item.longitude !== null
  );

  return (
    <div className="h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: 174.763336,
          latitude: -36.848461,
          zoom: 10,
        }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        style={{ width: "100%", height: "100%" }}
      >
        {validResults.map((item) => (
          <Marker
            key={`${item.suburbSlug}-${item.status}`}
            longitude={item.longitude as number}
            latitude={item.latitude as number}
            anchor="center"
          >
            <button
              type="button"
              onClick={() => setSelectedSuburb(item)}
              className={`h-4 w-4 rounded-full border-2 shadow-md transition hover:scale-125 ${getMarkerClass(
                item.status
              )}`}
              aria-label={item.suburbName}
            />
          </Marker>
        ))}

        {selectedSuburb &&
          selectedSuburb.latitude !== null &&
          selectedSuburb.longitude !== null && (
            <Popup
              longitude={selectedSuburb.longitude}
              latitude={selectedSuburb.latitude}
              anchor="top"
              onClose={() => setSelectedSuburb(null)}
              closeOnClick={false}
            >
              <div className="min-w-[180px] text-slate-900">
                <p className="font-semibold">{selectedSuburb.suburbName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  ${selectedSuburb.weeklyRent}/week
                </p>
                <p className="text-sm text-slate-600">
                  {selectedSuburb.rentToIncomePercentage}% of income
                </p>
              </div>
            </Popup>
          )}
      </Map>
    </div>
  );
}