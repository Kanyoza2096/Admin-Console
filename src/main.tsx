import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './lib/fetchInterceptor.ts';
import App from './App.tsx';
import './index.css';

console.log('[Kanyoza Bootstrap] Starting src/main.tsx execution. Document readyState:', document.readyState);

// Global query client with exponential retry backoff and 15s stale window.
// Queries that fail (e.g. backend offline) will retry twice before surfacing
// the error — at that point each page falls back to estimated / cached data.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
});

console.log('[Kanyoza Bootstrap] Mounting React application root...');
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[Kanyoza Bootstrap] Critical error: Root element with ID "root" not found in the document!');
} else {
  console.log('[Kanyoza Bootstrap] Found "root" element. Instantiating createRoot...');
}

createRoot(rootElement!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);

console.log('[Kanyoza Bootstrap] main.tsx initial execution complete.');

