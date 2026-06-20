'use client';

import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Input } from '@/components/atoms';

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 }; // NYC fallback

export interface AddressValue {
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
}

export interface AddressPickerProps {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
}

/**
 * Host address input. With a Google Maps key: Places autocomplete + a draggable
 * pin that sets lat/long. Without a key: a plain address text field (no map),
 * so the app still works. The exact address is private — only shown to a guest
 * after they book (enforced server-side).
 */
export function AddressPicker({ value, onChange }: AddressPickerProps) {
  if (!MAPS_KEY) {
    return (
      <div className="flex flex-col gap-1.5">
        <Input
          label="Full address"
          value={value.addressLine}
          onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
          placeholder="123 Greene Ave, Brooklyn, NY 11216"
          hint="Shown to guests only after they book. (Add a Google Maps key to enable the map picker.)"
        />
      </div>
    );
  }

  return (
    <APIProvider apiKey={MAPS_KEY} libraries={['places']}>
      <PickerInner value={value} onChange={onChange} />
    </APIProvider>
  );
}

function PickerInner({ value, onChange }: AddressPickerProps) {
  const position =
    value.latitude != null && value.longitude != null
      ? { lat: value.latitude, lng: value.longitude }
      : null;

  return (
    <div className="flex flex-col gap-2">
      <AutocompleteField value={value} onChange={onChange} />
      <span className="text-xs text-text-3">
        Shown to guests only after they book. Drag the pin to fine-tune the exact spot.
      </span>
      <div className="h-64 w-full overflow-hidden rounded-md border border-line">
        <Map
          defaultCenter={position ?? DEFAULT_CENTER}
          defaultZoom={position ? 16 : 11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="ratatouille-picker"
        >
          {position && (
            <AdvancedMarker
              position={position}
              draggable
              onDragEnd={(e) => {
                const lat = e.latLng?.lat();
                const lng = e.latLng?.lng();
                if (lat != null && lng != null)
                  onChange({ ...value, latitude: lat, longitude: lng });
              }}
            />
          )}
          <Recenter position={position} />
        </Map>
      </div>
    </div>
  );
}

/** Pans/zooms the map when the chosen position changes (e.g. after autocomplete). */
function Recenter({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && position) {
      map.panTo(position);
      map.setZoom(16);
    }
  }, [map, position]);
  return null;
}

function AutocompleteField({ value, onChange }: AddressPickerProps) {
  const places = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry'],
      types: ['address'],
    });
    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const loc = place.geometry?.location;
      onChange({
        addressLine: place.formatted_address ?? inputRef.current?.value ?? '',
        latitude: loc ? loc.lat() : null,
        longitude: loc ? loc.lng() : null,
      });
    });
    setReady(true);
    return () => listener.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind once when places loads
  }, [places]);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold tracking-[0.02em] text-text-2">Full address</span>
      <input
        ref={inputRef}
        defaultValue={value.addressLine}
        placeholder={ready ? 'Start typing an address…' : 'Loading address search…'}
        onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
        className="h-12 rounded-sm border border-line bg-bg-2 px-[15px] text-[14.5px] text-text placeholder:text-text-3 focus:border-gold-line focus:bg-surface focus:outline-none"
      />
    </label>
  );
}
