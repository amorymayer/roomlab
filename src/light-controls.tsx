import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getDaylight, searchCities, type City, type Daylight } from './daylight.ts';

type Props = { live: Daylight | null; apply: (light: Daylight) => void };

export function LightControls({live, apply}: Props) {
  const [query, setQuery] = useState('');
  const [cities,setCities] = useState<City[]>([]);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  const results = useRef<HTMLUListElement>(null);
  const [searched, setSearched] = useState(false);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (cities.length) results.current?.querySelector('button')?.focus(); }, [cities]);
  async function run(action: (signal: AbortSignal) => Promise<void>, pending: string, error: string) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setMessage(pending);
    try { await action(controller.signal); }
    catch { if (!controller.signal.aborted) setMessage(error); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) { setMessage('Enter at least two letters.'); return; }
    setCities([]);setSearched(true);
    void run(async signal => {
      const matches = await searchCities(query,signal);
      if (!signal.aborted) { setCities(matches); setMessage(matches.length ? 'Choose a city.' : 'No cities found. Try a different spelling.'); }
    }, 'Looking up cities…', 'City lookup failed. Try again, or use a lighting preset.');
  }
  function choose(city: City) {
    void run(async signal => {
      const light = await getDaylight(city,signal);
      if (!signal.aborted) { apply(light); setCities([]); setSearched(false); setMessage('City light applied.'); }
    }, 'Checking the light in ' + city.name + '…', 'Live light is unavailable. Try again, or use a preset.');
  }
  return <details className="light-controls">
    <summary><span>Light by city</span>{live && <small>{live.city.name} · {live.evening ? 'Night' : 'Day'}</small>}</summary>
    <div className="light-body">
      <form onSubmit={search} className="city-form">
        <label htmlFor="city-query">City</label>
        <div><input id="city-query" type="search" autoComplete="off" value={query} maxLength={80} placeholder="e.g. Zürich"
          onChange={e => {request.current?.abort();setBusy(false);setQuery(e.target.value);setCities([]);setSearched(false);setMessage('');}}/>
          <button disabled={busy}>Find</button></div>
      </form>
      {message && <p className="light-message" role="status">{message}</p>}
      {searched && cities.length>0 && <ul className="city-results" ref={results}>
        {cities.map(city => <li key={city.id}><button disabled={busy} onClick={()=>choose(city)}>{city.name}<small>{[city.admin1,city.country].filter(Boolean).join(', ')}</small></button></li>)}
      </ul>}
      {live && <div className="light-reading">
        <p><strong>{live.city.name}</strong> · {live.cloud}% cloud<br/><span>Conditions at {live.observed.slice(11)} local time</span></p>
        {(live.sunrise || live.sunset) && <p>{live.sunrise && 'Sunrise ' + live.sunrise}{live.sunrise && live.sunset && ' · '}{live.sunset && 'Sunset ' + live.sunset}</p>}
        <button type="button" disabled={busy} onClick={()=>choose(live.city)}>Refresh light</button>
      </div>}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Light data · Open-Meteo</a>
    </div>
  </details>;
}
