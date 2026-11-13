import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Marker } from 'maplibre-gl';
import { MapPin, RefreshCw, AlertTriangle, Radio } from 'lucide-react';
import { getDispatchLocations } from '@/lib/admin-dispatch.functions';
import { locationFreshness, type DispatchLocation } from '@/lib/provider-location';
import { supabase } from '@/integrations/supabase/client';
import { useMapLibre } from '@/components/map/use-maplibre';
import { Button } from '@/components/ui/button';

export const trackingOptions = queryOptions({ queryKey: ['admin-dispatch-locations'], queryFn: () => getDispatchLocations(), staleTime: 5000, refetchInterval: 15000 });
function TrackingMap({ rows, now }: {rows: DispatchLocation[]; now: number}) {
  const { containerRef, mapRef, maplibre, ready, error } = useMapLibre();
  const markers = useRef<Marker[]>([]);
  const framed = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maplibre || !ready) return;
    markers.current.forEach(m => m.remove());
    const bounds = new maplibre.LngLatBounds();
    markers.current = [];
    rows.forEach(row => {
      if (row.lat == null || row.lng == null) return;
      const freshness = locationFreshness(row.updated_at, now);
      const element = document.createElement('div');
      element.className = `grid size-12 place-items-center rounded-full border-2 border-background font-bold ${freshness === 'live' ? 'bg-success text-background' : 'bg-warning text-background'}`;
      element.textContent = freshness === 'live' ? '●' : '!';
      const label = `${row.provider_name} · ${freshness === 'live' ? 'Live' : 'Stale'} · ${row.booking_id.slice(0,8)}`;
      element.setAttribute('aria-label', label);
      element.title = label;
      const content = document.createElement('p');
      content.className = 'bg-background text-foreground p-2 text-xs';
      content.textContent = label;
      markers.current.push(new maplibre.Marker({element}).setLngLat([row.lng,row.lat]).setPopup(new maplibre.Popup().setDOMContent(content)).addTo(map));
      bounds.extend([row.lng,row.lat]);
    });
    if (!framed.current && markers.current.length) { map.fitBounds(bounds, {padding: 56, maxZoom: 14, duration: 0}); framed.current = true; }
    return () => { markers.current.forEach(m => m.remove()); markers.current = []; };
  }, [rows, now, ready, mapRef, maplibre]);
  return <div className="relative"><div ref={containerRef} className="h-80 w-full overflow-hidden rounded-md border border-border bg-muted" aria-label="Provider locations in Harare"/>{error && <p className="absolute inset-x-4 bottom-4 bg-background p-3 text-sm text-danger">Map unavailable. Location details remain below.</p>}</div>;
}
export function DispatchTracking() {
  const q = useQuery(trackingOptions), qc = useQueryClient();
  const [now,setNow] = useState(0);
  const [connection,setConnection] = useState('Connecting');
  useEffect(() => { setNow(Date.now()); const timer = window.setInterval(() => setNow(Date.now()), 10000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => { if (timer) return; timer = setTimeout(() => { timer = undefined; void qc.invalidateQueries({queryKey: trackingOptions.queryKey}); }, 1000); };
    const channel = supabase.channel(`dispatch-locations-${crypto.randomUUID()}`)
      .on('postgres_changes', {event:'*',schema:'public',table:'provider_locations'}, invalidate)
      .on('postgres_changes', {event:'*',schema:'public',table:'bookings'}, invalidate)
      .subscribe(status => setConnection(status === 'SUBSCRIBED' ? 'Connected' : 'Reconnecting'));
    return () => { if (timer) clearTimeout(timer); void supabase.removeChannel(channel); };
  }, [qc]);
  const rows = q.data?.rows ?? [];
  const live = rows.filter(r => locationFreshness(r.updated_at,now) === 'live').length;
  return <section className="mt-6 border-y border-border py-6" aria-label="Live provider tracking">
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex"><div className="min-w-0 sm:mr-auto"><h2 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="size-5 text-primary-text"/>Live provider tracking</h2><p className="mt-1 text-xs text-muted-foreground">{connection} · {live} live · {rows.length-live} stale / missing · Auto-refresh 15s</p></div><Button variant="outline" size="icon" aria-label="Refresh provider locations" disabled={q.isFetching} onClick={() => void q.refetch()}><RefreshCw className="size-4"/></Button></div>
    {q.isError && <p role="alert" className="mb-4 text-sm text-danger">Location updates unavailable. Last known positions may be outdated.</p>}
    <TrackingMap rows={rows} now={now}/>
    <p className="mt-3 text-xs text-muted-foreground">Stale after 60 seconds · Times in Harare · Device location permission required</p>
    {q.data && q.data.total > rows.length && <p className="mt-2 text-xs text-warning">Showing {rows.length} of {q.data.total} active assigned service jobs.</p>}
    <div className="mt-3 max-h-80 divide-y divide-border overflow-y-auto">{rows.map(row => {
      const freshness = locationFreshness(row.updated_at, now);
      return <div key={row.booking_id} className="flex flex-wrap items-start gap-3 py-3"><div className="min-w-0 flex-1"><Link to="/admin/bookings/$id" params={{id:row.booking_id}} className="break-words text-sm font-semibold text-primary-text">{row.provider_name} · {row.booking_id.slice(0,8).toUpperCase()}</Link><p className="mt-1 break-words text-xs text-muted-foreground">{row.address}</p><p className="mt-1 text-xs">{row.updated_at ? <>Last location: <time dateTime={row.updated_at}>{new Date(row.updated_at).toLocaleString('en-ZW',{timeZone:'Africa/Harare'})}</time>{row.accuracy != null && ` · ±${Math.round(row.accuracy)}m`}</> : 'No location reported'}</p></div><span className={`flex items-center gap-1 text-xs font-semibold ${freshness === 'live' ? 'text-success' : 'text-warning'}`}>{freshness === 'live' ? <Radio className="size-4"/> : <AlertTriangle className="size-4"/>}{freshness === 'live' ? 'Live' : freshness === 'stale' ? 'Stale location' : 'Location unavailable'}</span></div>;
    })}</div>
    {!rows.length && <p className="mt-4 text-sm text-muted-foreground">{q.isPending ? 'Loading provider locations…' : q.isError ? 'Unable to load active providers.' : 'No active assigned service jobs.'}</p>}
  </section>;
}