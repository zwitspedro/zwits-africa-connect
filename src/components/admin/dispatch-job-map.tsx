import { useEffect, useRef } from 'react';
import type { Marker } from 'maplibre-gl';
import { useMapLibre } from '@/components/map/use-maplibre';
export function DispatchJobMap({rows,onSelect}:{rows:Record<string,any>[];onSelect:(row:Record<string,any>)=>void}){
 const {containerRef,mapRef,maplibre,ready,error}=useMapLibre(),markers=useRef<Marker[]>([]);
 useEffect(()=>{
  const map=mapRef.current;if(!map||!maplibre||!ready)return;
  const bounds=new maplibre.LngLatBounds();
  for(const row of rows){
   if(row.lat==null||row.lng==null)continue;
   const element=document.createElement('button');element.type='button';element.className='grid size-12 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground font-bold';element.textContent=row.kind==='delivery'?'D':'S';element.title=`${row.id.slice(0,8)} · ${row.address}`;element.setAttribute('aria-label',element.title);element.addEventListener('click',()=>onSelect(row));
   markers.current.push(new maplibre.Marker({element}).setLngLat([row.lng,row.lat]).addTo(map));bounds.extend([row.lng,row.lat]);
  }
  if(markers.current.length)map.fitBounds(bounds,{padding:56,maxZoom:14,duration:0});
  return ()=>{markers.current.forEach(m=>m.remove());markers.current=[];};
 },[rows,onSelect,mapRef,maplibre,ready]);
 return <div className="mt-4"><div ref={containerRef} className="h-96 w-full border border-border bg-muted" aria-label="Filtered job locations"/>{error&&<p role="alert" className="mt-2 text-sm text-danger">Map unavailable. Job list remains available.</p>}<p className="mt-2 text-xs text-muted-foreground">Showing recorded service and pickup locations for this page; jobs without coordinates remain in the list.</p></div>;
}