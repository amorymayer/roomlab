import { generate, isBrief } from './study.ts';
self.addEventListener('message',(event:MessageEvent<unknown>)=>{
  if (!isBrief(event.data)) { self.postMessage({error:'The brief is invalid.'}); return; }
  try { self.postMessage({proposals:generate(event.data)}); }
  catch { self.postMessage({error:'Layout search failed. Try again.'}); }
});
