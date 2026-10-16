import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { services } from '@/data/services';
import { rankServices, scoreService, normalise, tokenize, SYNONYMS } from '@/lib/service-search';
import { adminHead } from '@/lib/admin-period';
import { SiteShell } from '@/components/site-shell';
import { RoleGate } from '@/components/portal/role-gate';
import { Input } from '@/components/ui/input';
export const Route=createFileRoute('/_authenticated/admin/search-quality')({head:()=>adminHead('Search quality','Inspect actual Zwits service relevance and synonym matches.'),component:()=> <RoleGate role="admin"><SearchQuality/></RoleGate>});
function SearchQuality(){
 const [query,setQuery]=useState(''); const ranked=rankServices(services,query);
 return <SiteShell><section className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><h1 className="font-display text-3xl">Search quality</h1><Input aria-label="Test service search" placeholder="Enter a service query" className="mt-5 max-w-lg" value={query} onChange={e=>setQuery(e.target.value)}/>
 <p className="mt-3 text-xs text-muted-foreground">{ranked.length} relevant results · Normalized query: {normalise(query)||'—'}</p>
 <ol className="mt-5 grid gap-3">{ranked.map((s,i)=>{const exact=normalise(query)===normalise(s.name);const category=normalise(query)===s.slug;const synonyms=tokenize(query).filter(t=>SYNONYMS[t]?.includes(s.slug));return <li key={s.slug} className="rounded-lg border border-border bg-card p-4"><strong>{i+1}. {s.name}</strong><p className="mt-1 text-sm text-muted-foreground">Score {scoreService(s,query)} · {exact?'Exact service name':category?'Exact category':normalise(s.name).startsWith(normalise(query))?'Strong name prefix':'Word, sub-service or description match'}{synonyms.length?` · Synonyms: ${synonyms.join(', ')}`:''}</p><p className="mt-2 text-xs text-muted-foreground">{s.examples.join(' · ')}</p></li>})}</ol>
 {query&&!ranked.length&&<p className="py-8 text-muted-foreground">No relevant services found.</p>}
 </section></SiteShell>
}
