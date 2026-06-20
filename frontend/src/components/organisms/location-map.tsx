'use client';

import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Icon } from '@/components/atoms';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export interface LocationMapProps {
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Read-only location card shown on a confirmed booking: the full address, an
 * "Open in Google Maps" link, and (with a key + coords) an embedded map. The
 * address is only ever passed here for confirmed bookings (server-enforced).
 */
export function LocationMap({ addressLine, latitude, longitude }: LocationMapProps) {
  const hasCoords = latitude != null && longitude != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon name="pin" size={18} className="mt-0.5 shrink-0 text-gold" />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold text-text-2">Where to go</span>
            <span className="text-[15px]">{addressLine}</span>
          </div>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[13px] text-gold underline-offset-2 hover:underline"
        >
          Open in Maps
        </a>
      </div>

      {MAPS_KEY && hasCoords && (
        <div className="h-56 w-full overflow-hidden rounded-md border border-line">
          <APIProvider apiKey={MAPS_KEY}>
            <Map
              defaultCenter={{ lat: latitude, lng: longitude }}
              defaultZoom={16}
              gestureHandling="cooperative"
              disableDefaultUI
              mapId="ratatouille-location"
            >
              <AdvancedMarker position={{ lat: latitude, lng: longitude }} />
            </Map>
          </APIProvider>
        </div>
      )}
    </div>
  );
}
