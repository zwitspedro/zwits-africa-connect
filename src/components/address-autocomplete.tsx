/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";

export type AddressValue = {
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

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
  const { ready, error } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    google.maps.importLibrary("places").then(() => {
      tokenRef.current = new google.maps.places.AutocompleteSessionToken();
    });
  }, [ready]);

  const fetchSuggestions = (input: string) => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!input.trim() || !ready) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: tokenRef.current!,
        });
        setSuggestions(suggestions);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  };

  const pick = async (s: google.maps.places.AutocompleteSuggestion) => {
    const pred = s.placePrediction;
    if (!pred) return;
    const place = pred.toPlace();
    await place.fetchFields({ fields: ["location", "formattedAddress", "id"] });
    onChange({
      address: place.formattedAddress ?? pred.text.text,
      lat: place.location?.lat(),
      lng: place.location?.lng(),
      placeId: place.id,
    });
    setOpen(false);
    setSuggestions([]);
    tokenRef.current = new google.maps.places.AutocompleteSessionToken();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        required={required}
        value={value}
        placeholder={placeholder}
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
          {suggestions.map((s, i) => {
            const pred = s.placePrediction;
            if (!pred) return null;
            return (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <div className="font-medium">{pred.mainText?.text ?? pred.text.text}</div>
                  {pred.secondaryText?.text && (
                    <div className="text-xs text-muted-foreground">{pred.secondaryText.text}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
