const geo = 'https://geocoding-api.open-meteo.com/v1/search';
const forecast = 'https://api.open-meteo.com/v1/forecast';

export type City = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string };
export type Daylight = { city: City; evening: boolean; cloud: number; observed: string; sunrise: string | null; sunset: string | null };

async function json(url: string, params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const timer = AbortSignal.timeout(8000);
  const response = await fetch(url + '?' + new URLSearchParams(params), { signal: signal ? AbortSignal.any([signal, timer]) : timer });
  if (!response.ok) throw new Error('Open-Meteo returned HTTP ' + response.status);
  return response.json();
}

export async function searchCities(name: string, signal?: AbortSignal): Promise<City[]> {
  const query = name.trim();
  if (query.length < 2) return [];
  const data = await json(geo, { name: query, count: '5', language: 'en', format: 'json' }, signal) as { results?: City[] };
  if (!data || (data.results !== undefined && !Array.isArray(data.results))) throw new Error('Unexpected locations response');
  return (data.results ?? []).filter(c => c && Number.isFinite(c.id) && typeof c.name === 'string' &&
    Number.isFinite(c.latitude) && Number.isFinite(c.longitude));
}

const validTime = (t: unknown): t is string => typeof t === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t);

export async function getDaylight(city: City, signal?: AbortSignal): Promise<Daylight> {
  const data = await json(forecast, {
    latitude: String(city.latitude), longitude: String(city.longitude), timezone: 'auto',
    current: 'is_day,cloud_cover', daily: 'sunrise,sunset', forecast_days: '1',
  }, signal) as { current?: { is_day?: number; cloud_cover?: number; time?: string }; daily?: { sunrise?: string[]; sunset?: string[] } };
  const c = data?.current;
  if (!c || (c.is_day !== 0 && c.is_day !== 1) || typeof c.cloud_cover !== 'number' ||
      !Number.isFinite(c.cloud_cover) || c.cloud_cover < 0 || c.cloud_cover > 100 || !validTime(c.time)) throw new Error('Unexpected daylight response');
  const sunrise = data.daily?.sunrise?.[0], sunset = data.daily?.sunset?.[0];
  return { city, evening: c.is_day === 0, cloud: c.cloud_cover, observed: c.time,
    sunrise: validTime(sunrise) ? sunrise.slice(11) : null, sunset: validTime(sunset) ? sunset.slice(11) : null };
}
