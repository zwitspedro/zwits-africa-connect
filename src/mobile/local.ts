/**
 * Device-local lists — favourite providers and saved addresses.
 *
 * Deliberately stored on the handset (Capacitor Preferences / localStorage):
 * the platform has no favourites or address book tables and this phase must
 * not add any. Everything else keeps using the existing backend.
 */
import { useCallback, useEffect, useState } from "react";
import { mobileStorage } from "./storage";

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
};

const FAV_KEY = "favourites.providers";
const ADDR_KEY = "addresses";

function useLocalList<T>(key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void mobileStorage.getJSON<T[]>(key, []).then((v) => {
      if (!alive) return;
      setItems(v);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const write = useCallback(
    async (next: T[]) => {
      setItems(next);
      await mobileStorage.setJSON(key, next);
    },
    [key],
  );

  return { items, loading, write };
}

export function useFavouriteProviders() {
  const { items, loading, write } = useLocalList<string>(FAV_KEY);
  return {
    favourites: items,
    loading,
    isFavourite: (id: string) => items.includes(id),
    toggle: (id: string) =>
      write(items.includes(id) ? items.filter((x) => x !== id) : [...items, id]),
  };
}

export function useSavedAddresses() {
  const { items, loading, write } = useLocalList<SavedAddress>(ADDR_KEY);
  return {
    addresses: items,
    loading,
    add: (a: Omit<SavedAddress, "id">) => write([...items, { ...a, id: crypto.randomUUID() }]),
    remove: (id: string) => write(items.filter((a) => a.id !== id)),
  };
}
