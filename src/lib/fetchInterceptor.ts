import { useStore, type HttpLog } from '../store/useStore';

const originalFetch = window.fetch;

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
  const method = init?.method || 'GET';
  const timestamp = Date.now();
  const id = `http_${timestamp}_${Math.floor(Math.random() * 10000)}`;
  const page = window.location.pathname;

  const state = useStore.getState();
  const restEndpoint = state.restEndpoint || '';
  const masterToken = state.masterToken || localStorage.getItem('master_token') || '';
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

  // Inject auth header automatically
  const headers = new Headers(init?.headers);
  if (masterToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${masterToken}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const modifiedInit: RequestInit = {
    ...init,
    headers,
  };

  const log: HttpLog = {
    id,
    timestamp,
    url,
    method,
    page,
  };

  try {
    const response = await originalFetch.apply(this, [input, modifiedInit]);
    
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
