import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
const sections = [
 ['Overview','/admin'],['Operations','/admin/operations'],['Customers','/admin/customers'],['Providers','/admin/providers'],
 ['Verification','/admin/review'],['Drivers','/admin/drivers'],['Catalogue','/admin/catalogue'],['Search quality','/admin/search-quality'],
 ['Bookings','/admin/bookings'],['Deliveries','/admin/deliveries'],['Payments','/admin/payments'],['Wallets','/admin/wallets'],
 ['Withdrawals','/admin/withdrawals'],['Commissions','/admin/commissions'],['Reconciliation','/admin/reconciliation'],
 ['Disputes','/admin/disputes'],['Business accounts','/admin/business'],['Email','/admin/email'],['Reports','/admin/reports'],
 ['System health','/admin/health'],['Security & audit','/admin/audit'],['Configuration','/admin/configuration'],
] as const;
export function AdminNav() {
 const path=useRouterState({select:s=>s.location.pathname.replace(/\/$/,'')});
 return <nav aria-label="Admin sections" className="mx-auto flex w-full max-w-6xl flex-wrap gap-1 border-b border-border px-4 py-3 sm:px-6">
 {sections.map(([label,to])=><Button key={to} asChild variant={(path===to || (to!=='/admin' && path.startsWith(to+'/')))?'secondary':'ghost'} size="sm" className="text-xs"><Link to={to} aria-current={(path===to || (to!=='/admin' && path.startsWith(to+'/')))?'page':undefined}>{label}</Link></Button>)}
 </nav>;
}
