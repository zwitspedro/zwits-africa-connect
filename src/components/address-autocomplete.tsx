import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchAddress, type GeoSuggestion } from "@/lib/geo.functions";

export type AddressValue = {
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

/** Address search powered by Nominatim (OpenStreetMap), proxied via a server fn. */
export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address…",
  required,
}: {
  value: string;
  onChange: (v: AddressValue) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const runSearch = useServerFn(searchAddress);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const debounceRef = useRef<number | null>(null);

  const fetchSuggestions = (input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (input.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const results = await runSearch({ data: { query: input.trim() } });
        setError(false);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setError(true);
        setSuggestions([]);
      }
    }, 350);
  };

  const pick = (s: GeoSuggestion) => {
    onChange({ address: s.label, lat: s.lat, lng: s.lng, placeId: s.id });
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange({ address: e.target.value });
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => suggestions.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
      />
      {error && <p className="mt-1 text-xs text-destructive">Address suggestions unavailable.</p>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <div className="font-medium">{s.primary}</div>
                {s.secondary && <div className="text-xs text-muted-foreground">{s.secondary}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
