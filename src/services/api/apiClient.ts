import { useAppStore } from '../../stores/useAppStore';

const BASE_URL = ''; // Relative URL handled by Vite proxy to backend

const camelizeKey = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

function normalizeApiResponse(value: unknown): any {
  if (Array.isArray(value)) return value.map(normalizeApiResponse);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [camelizeKey(key), normalizeApiResponse(item)])
    );
  }
  return value;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const state = useAppStore.getState();
  const token = state.token;
  const tenantId = state.currentTenantId || 'tenant-1';
  const propertyId = state.currentPropertyId;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    ...(propertyId ? { 'X-Property-ID': propertyId } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError;
      try {
        parsedError = JSON.parse(errorText);
      } catch {
        parsedError = { detail: errorText };
      }

      const isProxyFailure = response.status === 500 && (typeof errorText === 'string' && (errorText.includes('ECONNREFUSED') || errorText.includes('AggregateError') || errorText.includes('<!DOCTYPE')));
      const message = isProxyFailure
        ? 'Cannot connect to backend server. Ensure FastAPI is running on http://127.0.0.1:8001'
        : (parsedError.detail || `API Error: ${response.status} ${response.statusText}`);

      throw new Error(message);
    }

    return normalizeApiResponse(await response.json()) as T;
  } catch (err: any) {
    console.warn(`[API Client] Request to ${endpoint} failed:`, err.message);
    throw err;
  }
}
