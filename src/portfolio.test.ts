import assert from 'node:assert/strict';
import test from 'node:test';
import { starter } from './layout.ts';
import { historyOf, historyReducer } from './history.ts';
import { encodeLayout, decodeLayout, validateLayout } from './share.ts';

test('a furniture drag is one undoable operation, and a new edit clears redo',()=>{
  let state=historyReducer(historyOf(starter),{type:'start'});
  for(const x of [0,.1,.25]) state=historyReducer(state,{type:'move',edit:l=>({...l,items:l.items.map((p,i)=>i===0?{...p,x}:p)})});
  state=historyReducer(state,{type:'end'});
  assert.equal(state.past.length,1);
  assert.equal(state.current.items[0].x,.25);
  state=historyReducer(state,{type:'undo'});
  assert.deepEqual(state.current,starter);
  assert.equal(historyReducer(state,{type:'redo'}).current.items[0].x,.25);
  state=historyReducer(state,{type:'edit',edit:l=>({...l,budget:1850})});
  assert.equal(state.future.length,0);
});
test('layout links open an editable copy with the same placement, budget and finish',()=>{
  const layout={...starter,budget:1740,items:[{...starter.items[1],turn:3,color:'#918277'}]};
  const result=decodeLayout(encodeLayout(layout));
  assert.deepEqual(result,{...layout,items:[{...layout.items[0],id:'shared-0'}]});
});
test('unknown share versions, tampered furniture, and broken saved layouts are ignored',()=>{
  assert.equal(decodeLayout(btoa(JSON.stringify([2,5,4,1500,[]]))),null);
  assert.equal(decodeLayout(btoa(JSON.stringify([1,5,4,1500,[['__proto__',0,0,0,null]]]))),null);
  assert.equal(decodeLayout('x'.repeat(6001)),null);
  assert.equal(validateLayout({...starter,items:[starter.items[0],starter.items[0]]}),null);
});

test('shared layouts preserve the selected material palette and reject unknown palettes',()=>{
  const layout={...starter,palette:'dusk'} as const;
  assert.equal(decodeLayout(encodeLayout(layout))?.palette,'dusk');
  assert.equal(validateLayout({...layout,palette:'invalid'}),null);
  assert.equal(decodeLayout(encodeLayout(starter))?.palette,undefined);
});
