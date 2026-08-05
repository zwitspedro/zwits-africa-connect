import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSavedAddresses } from "@/mobile/local";
import { currentPosition } from "@/mobile/maps";
import { AppBar, Card, Empty, GhostButton, PrimaryButton, Screen, Section } from "@/mobile/ui";

export const Route = createFileRoute("/m/customer/addresses")({ component: Addresses });

function Addresses() {
  const { addresses, add, remove, loading } = useSavedAddresses();
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const save = async () => {
    if (!address.trim()) return toast.error("Enter the address");
    await add({
      label: label.trim() || "Address",
      address: address.trim(),
      lat: coords?.lat,
      lng: coords?.lng,
    });
    setAddress("");
    setCoords(null);
    toast.success("Address saved on this device");
  };

  return (
    <>
      <AppBar title="Saved addresses" subtitle="Stored privately on your phone" back />
      <Screen>
        <Section title="Add an address">
          <Card>
            <div className="grid grid-cols-3 gap-2">
              {["Home", "Work", "Other"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLabel(l)}
                  className={`min-h-11 rounded-2xl text-xs font-semibold ${
                    label === l
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, suburb, Harare"
              className="mt-3 min-h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <GhostButton
                onClick={async () => {
                  const pos = await currentPosition();
                  if (!pos) return toast.error("Location unavailable");
                  setCoords(pos);
                  toast.success("Pinned to your location");
                }}
              >
                <MapPin className="size-4" /> Pin GPS
              </GhostButton>
              <PrimaryButton onClick={() => void save()}>
                <Plus className="size-4" /> Save
              </PrimaryButton>
            </div>
          </Card>
        </Section>

        <Section title="Your addresses">
          {loading ? null : addresses.length === 0 ? (
            <Empty
              icon={MapPin}
              title="No saved addresses"
              hint="Save Home and Work to book in two taps."
            />
          ) : (
            <div className="grid gap-3">
              {addresses.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-2xl bg-primary/12 text-primary">
                      <MapPin className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{a.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.address}</p>
                    </div>
                    <button
                      aria-label="Delete address"
                      onClick={() => void remove(a.id)}
                      className="grid size-11 place-items-center rounded-full text-muted-foreground active:bg-muted"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      </Screen>
    </>
  );
}
