import { useStore, type HttpLog } from '../store/useStore';

// Backup original fetch function
const originalFetch = window.fetch;

// Intercept all fetch requests globally
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
  const method = init?.method || 'GET';
  const timestamp = Date.now();
  const id = `http_${timestamp}_${Math.floor(Math.random() * 10000)}`;
  const page = window.location.pathname;

  const restEndpoint = useStore.getState().restEndpoint || '';
  const cleanBase = restEndpoint.replace(/\/+$/, '');
  
  // Check if it is a request targeting our REST backend API
  const isApiCall = 
    url.includes('/api/v1') || 
    url.includes(cleanBase) || 
    url.startsWith('/api/') || 
    (cleanBase !== '' && url.startsWith(cleanBase));

  if (!isApiCall) {
    return originalFetch.apply(this, [input, init]);
  }

  const log: HttpLog = {
    id,
    timestamp,
    url,
    method,
    page,
  };

  try {
    const response = await originalFetch.apply(this, [input, init]);
    
    log.status = response.status;
    log.statusText = response.statusText;
    
    if (!response.ok) {
      log.error = `HTTP Error ${response.status}: ${response.statusText || 'Error response'}`;
    }

    useStore.getState().addHttpLog(log);
    return response;
  } catch (err: any) {
    const errMsg = err?.message || String(err) || 'Failed to fetch / Connection Error';
    log.error = errMsg;
    
    useStore.getState().addHttpLog(log);
    throw err;
  }
};
