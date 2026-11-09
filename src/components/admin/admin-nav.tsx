import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Users, Truck, CalendarCheck, Wallet, ShieldCheck, Settings, Activity, Bell, Layers, Building2, FileText } from 'lucide-react';
const sections = [
 ['Overview','/admin'],['Dispatch','/admin/dispatch'],['Operations','/admin/operations'],['Customers','/admin/customers'],['Providers','/admin/providers'],
 ['Verification','/admin/review'],['Drivers','/admin/drivers'],['Catalogue','/admin/catalogue'],['Search quality','/admin/search-quality'],
 ['Bookings','/admin/bookings'],['Deliveries','/admin/deliveries'],['Payments','/admin/payments'],['Wallets','/admin/wallets'],
 ['Withdrawals','/admin/withdrawals'],['Commissions','/admin/commissions'],['Reconciliation','/admin/reconciliation'],
 ['Disputes','/admin/disputes'],['Business accounts','/admin/business'],['Email','/admin/email'],['Reports','/admin/reports'],
 ['System health','/admin/health'],['Security & audit','/admin/audit'],['Configuration','/admin/configuration'],
] as const;
export function AdminNav() {
 const path=useRouterState({select:s=>s.location.pathname.replace(/\/$/,'')});
 const groups=[{name:'Command centre',items:sections.slice(0,3)},{name:'People & services',items:sections.slice(3,9)},{name:'Operations & finance',items:sections.slice(9,18)},{name:'Governance',items:sections.slice(18)}];
 const icons=[LayoutDashboard,Truck,Activity,Users,Users,ShieldCheck,Truck,Layers,Activity,CalendarCheck,Truck,Wallet,Wallet,Wallet,Wallet,Wallet,ShieldCheck,Building2,Bell,FileText,Activity,ShieldCheck,Settings];
 return <nav aria-label="Admin sections" className="space-y-5 px-3 py-5">
 {groups.map(group=><details key={group.name} open><summary className="mb-2 cursor-pointer px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{group.name}</summary><div className="grid gap-1">{group.items.map(([label,to])=>{const active=path===to||(to!=='/admin'&&path.startsWith(to+'/'));const Icon=icons[sections.findIndex(s=>s[1]===to)]||Activity;return <Button key={to} asChild variant={active?'secondary':'ghost'} className={`w-full justify-start gap-3 text-xs ${active?'border-l-2 border-primary text-primary-text':''}`}><Link to={to} aria-current={active?'page':undefined}><Icon className="size-4 shrink-0"/>{label==='Reports'?'Reports & analytics':label==='Catalogue'?'Services & categories':label==='Configuration'?'Settings':label}</Link></Button>})}</div></details>)}
 <Button asChild variant="ghost" className="w-full justify-start gap-3 text-xs"><Link to="/notifications"><Bell className="size-4"/>Notifications</Link></Button>
 </nav>;
}
