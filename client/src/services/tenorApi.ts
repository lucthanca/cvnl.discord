import { getCache, setCache } from '~/utils/tenorCache';

const TENOR_API_BASE = 'https://tenor.googleapis.com/v2';
const API_KEY = import.meta.env.VITE_TENOR_API_KEY;

export type TenorParams = Record<string, string | number | boolean>;

export async function callTenorApi<T = any>(
  endpoint: string,
  params: TenorParams = {},
  options: RequestInit = {},
  useCache = true
): Promise<T> {
  const url = new URL(`${TENOR_API_BASE}/${endpoint}`);
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('contentfilter', 'low');
  url.searchParams.set('locale', 'vi');
  url.searchParams.set('country', 'VN');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const cacheKey = `${endpoint}?${url.searchParams.toString()}`;
  if (useCache) {
    const cached = await getCache<T>(cacheKey);
    if (cached) return cached;
  }

  const res = await fetch(url.toString(), options);

  if (!res.ok) {
    throw new Error(`Tenor API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (useCache) {
    await setCache<T>(cacheKey, data);
  }

  return data;
}