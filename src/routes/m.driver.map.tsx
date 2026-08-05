import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Map as MapIcon, Navigation } from "lucide-react";
import { toast } from "sonner";
import { useDriverData } from "@/components/driver/use-driver-data";
import { LiveTrackingMap } from "@/components/live-tracking-map";
import { openNavigation, useLiveLocation } from "@/mobile/maps";
import { AppBar, Card, Empty, GhostButton, Pill, Screen, Section, money } from "@/mobile/ui";

export const Route = createFileRoute("/m/driver/map")({ component: DriverMap });

/** Live route view for the current run, with GPS sharing and hand-off to the phone's maps app. */
function DriverMap() {
  const d = useDriverData();
  const navigate = useNavigate();
  const run = d.active[0];
  const { position } = useLiveLocation(!!run);

  const dest =
    run?.status === "picked_up"
      ? { lat: run?.dropoff_lat, lng: run?.dropoff_lng, address: run?.dropoff_address }
      : { lat: run?.pickup_lat, lng: run?.pickup_lng, address: run?.pickup_address };

  return (
    <>
      <AppBar title="Map" subtitle={run ? "Live run" : "No active run"} />
      <Screen>
        {!run ? (
          <Section>
            <Empty
              icon={MapIcon}
              title="No active delivery"
              hint="Accept an offer to see your live route here."
            />
          </Section>
        ) : (
          <>
            <Section>
              <div className="overflow-hidden rounded-3xl border border-border">
                <LiveTrackingMap
                  bookingId={run.id}
                  destination={
                    dest.lat != null && dest.lng != null
                      ? { lat: dest.lat, lng: dest.lng }
                      : position
                  }
                  className="h-[340px]"
                />
              </div>
            </Section>

            <Section
              title={run.status === "picked_up" ? "Heading to dropoff" : "Heading to pickup"}
            >
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{dest.address}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {run.distance_km ?? "—"} km · {run.service_tier}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Pill tone="primary">{String(run.status).replace(/_/g, " ")}</Pill>
                    <p className="mt-1 text-xs font-semibold">{money(run.price)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <GhostButton
                    onClick={() =>
                      dest.lat && dest.lng
                        ? openNavigation({ lat: dest.lat, lng: dest.lng })
                        : toast.error("No pin available")
                    }
                  >
                    <Navigation className="size-4" /> Navigate
                  </GhostButton>
                  <GhostButton
                    onClick={() =>
                      navigate({ to: "/m/driver/deliveries/$id", params: { id: run.id } })
                    }
                  >
                    Open delivery
                  </GhostButton>
                </div>
              </Card>
            </Section>
          </>
        )}
      </Screen>
    </>
  );
}
