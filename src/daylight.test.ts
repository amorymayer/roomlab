import assert from 'node:assert/strict';
import test from 'node:test';
import { getDaylight, searchCities } from './daylight.ts';

const city={id:1,name:'Zurich',latitude:47.37,longitude:8.55};
test('city search filters malformed entries and encodes the name',async t=>{
  const request=t.mock.method(globalThis,'fetch',async (url:string)=>{
    assert.equal(new URL(url).searchParams.get('name'),'São Paulo');
    return Response.json({results:[city,{name:'Missing coordinates'}]});
  });
  assert.deepEqual(await searchCities(' São Paulo '),[city]);
  assert.equal(request.mock.callCount(),1);
});
test('weather uses selected coordinates and preserves local daylight times',async t=>{
  t.mock.method(globalThis,'fetch',async (url:string)=>{
    const q=new URL(url).searchParams;
    assert.equal(q.get('latitude'),'47.37');
    assert.equal(q.get('timezone'),'auto');
    return Response.json({current:{is_day:0,cloud_cover:67,time:'2026-11-15T19:00'},
      daily:{sunrise:['2026-11-15T07:30'],sunset:['2026-11-15T16:50']}});
  });
  const reading=await getDaylight(city);
  assert.equal(reading.evening,true);
  assert.equal(reading.cloud,67);
  assert.equal(reading.sunset,'16:50');
});
test('rejects failed or invalid weather instead of applying a made-up reading',async t=>{
  const request=t.mock.method(globalThis,'fetch',async ()=>new Response(null,{status:503}));
  await assert.rejects(getDaylight(city),/503/);
  request.mock.mockImplementationOnce(async ()=>Response.json({current:{is_day:0,cloud_cover:130,time:'2026-11-15T19:00'}}));
  await assert.rejects(getDaylight(city),/Unexpected daylight/);
});
