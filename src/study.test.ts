import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogue, starter, violations, type Kind, type Layout } from './layout.ts';
import { analyse, briefCost, defaultBrief, entryX, furnitureFor, generate, isBrief, type Brief } from './study.ts';

const front={...defaultBrief,entry:'center'} as const;
test('entry blockage prevents all reachability even when most of the room is open',()=>{
  const layout={...starter,items:[{id:'door',kind:'desk',turn:0,x:entryX(front),z:1.55}]} satisfies Layout;
  const m=analyse(layout,front);
  assert.equal(m.blocked,true);
  assert.equal(m.reachable,0);
  assert.ok(m.free>0);
});
test('passage width materially changes reachability in a 70 cm choke point',()=>{
  const chairs=([-1,1] as const).flatMap(side=>[.77,1.6].map(x=>({
    id:side+':'+x,kind:'chair' as const,turn:0,x:side*x,z:0,
  })));
  const layout={...starter,w:4,d:4,items:chairs};
  assert.equal(analyse(layout,{...front,clearance:.6}).windowReached,true);
  assert.equal(analyse(layout,{...front,clearance:.9}).windowReached,false);
});
test('the generator produces distinct, repeatable, feasible proposals for each default brief',()=>{
  for(const use of ['listening','working','hosting'] as const){
    const brief:Brief={...defaultBrief,use,budget:2000};
    const proposals=generate(brief);
    assert.equal(proposals.length,3);
    assert.deepEqual(proposals,generate(brief));
    assert.equal(new Set(proposals.map(p=>JSON.stringify(p.layout.items))).size,3);
    for(const {layout} of proposals){
      assert.deepEqual(layout.items.map(p=>p.kind).sort(),[...furnitureFor(brief)].sort());
      assert.equal(violations(layout).size,0);
      const checked=analyse(layout,brief);
      assert.ok(!checked.blocked&&checked.reachable>0&&checked.cost<=brief.budget);
    }
  }
});
test('a custom furniture set changes the bill and generated pieces; impossible briefs are rejected',()=>{
  const furniture:Kind[]=['desk','lamp'];
  const custom={...defaultBrief,furniture};
  assert.equal(briefCost(custom),catalogue.desk.price+catalogue.lamp.price);
  assert.ok(generate(custom).length>0);
  assert.ok(generate(custom).every(p=>p.layout.items.map(i=>i.kind).sort().join(',')==='desk,lamp'));
  assert.equal(generate({...custom,budget:1}).length,0);
  assert.equal(isBrief({...custom,furniture:['__proto__']}),false);
});
