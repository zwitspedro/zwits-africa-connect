import { useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Menu, RefreshCw, Search, User, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { ZwitsLogo } from '@/components/zwits-logo';
import { useAuth } from '@/hooks/use-auth';
import { AdminNav } from './admin-nav';

export function AdminShell({children}:{children:ReactNode}) {
 const [open,setOpen]=useState(false),[term,setTerm]=useState('');
 const {user,signOut}=useAuth(); const qc=useQueryClient();
 const path=useRouterState({select:s=>s.location.pathname});
 const title=path.replace(/\/$/,'').split('/')[2]?.replaceAll('-',' ')||'Executive overview';
 return <div data-experience="admin" className="min-h-dvh bg-background text-foreground lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
  <aside className="hidden border-r border-border bg-card lg:block"><div className="sticky top-0 max-h-dvh overflow-y-auto"><Link to="/admin" className="flex min-h-24 items-center px-6"><ZwitsLogo/></Link><div className="border-y border-border px-6 py-4 text-[10px] uppercase tracking-widest text-muted-foreground">Executive control centre</div><AdminNav/><p className="px-6 py-6 text-[10px] font-semibold text-primary-text">TRUST. DELIVERED.</p></div></aside>
  <div className="min-w-0"><header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap border-b border-border bg-card px-4 py-4 sm:px-6">
   <div className="flex min-w-0 items-center gap-2 sm:contents"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open admin navigation" aria-expanded={open} onClick={()=>setOpen(!open)}><Menu className="size-5"/></Button>
   <Link to="/admin" className="lg:hidden"><ZwitsLogo wordmark={false}/></Link>
   <span className="mr-auto hidden min-w-0 truncate text-sm font-semibold capitalize sm:block">{title}</span></div>
   <form action="/admin/search" className="order-last col-span-2 hidden min-w-0 w-full items-center gap-1 sm:order-none sm:flex sm:w-64"><Input name="q" aria-label="Global administrative search" placeholder="Search records…" value={term} onChange={e=>setTerm(e.target.value)} minLength={2}/><Button type="submit" variant="ghost" size="icon" aria-label="Search admin records"><Search className="size-4"/></Button></form>
   <div className="flex shrink-0 items-center gap-1 sm:contents"><Button asChild variant="ghost" size="icon" className="sm:hidden"><Link to="/admin/search" aria-label="Search admin records"><Search className="size-4"/></Link></Button><Button variant="ghost" size="icon" className="hidden sm:inline-flex" title="Refresh admin records" aria-label="Refresh admin records" onClick={()=>qc.invalidateQueries({predicate:q=>String(q.queryKey[0]).startsWith('admin')})}><RefreshCw className="size-4"/></Button>
   <Button asChild variant="ghost" size="icon"><Link to="/notifications" aria-label="Notification centre"><Bell className="size-4"/></Link></Button>
   <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Administrator account menu"><User className="size-4"/><span className="hidden sm:inline">Account</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="max-w-72"><DropdownMenuLabel className="break-all">{user?.user_metadata?.display_name||'Administrator'}</DropdownMenuLabel><DropdownMenuItem asChild><Link to="/admin/configuration">Settings</Link></DropdownMenuItem><DropdownMenuItem onSelect={()=>void signOut()}><LogOut/>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
  </header>
  {open&&<div className="border-b border-border bg-card lg:hidden"><div className="flex justify-end px-4"><Button variant="ghost" size="icon" aria-label="Close admin navigation" onClick={()=>setOpen(false)}><X className="size-4"/></Button></div><AdminNav/></div>}
  <main className="min-w-0" onClick={()=>{if(open)setOpen(false);}}>{children}</main></div>
 </div>;
}