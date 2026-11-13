// Isolated presentation harness only. Not an application route or hosted financial API.
// Browser supplies records.json exported from disposable PostgreSQL via request interception.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { DriverEarnings } from '../src/components/driver/driver-earnings';
import { summarizeDriverFinance } from '../src/lib/driver-finance';
import '../src/styles.css';

const records = await fetch('/tests/isolated-records.json').then(r => r.json());
const data = { ...records, summary: summarizeDriverFinance(records.ledger, records.jobs, [], records.wallet), as_of: new Date().toISOString() };
const route = createRootRoute({ component: () => <div data-experience="driver" className="min-w-0 bg-background p-4 text-foreground"><DriverEarnings completed={records.jobs} finance={{ data, isError: false, isFetching: false, refetch: async () => ({ data }) } as any} /></div> });
const router = createRouter({ routeTree: route, history: createMemoryHistory({ initialEntries: ['/'] }) });
const root = document.getElementById('root');
if (!root) throw new Error('Harness root missing');
createRoot(root).render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);