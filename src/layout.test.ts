import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starter, total, violations, findPlacement } from './layout.ts';
test('starter layout fits and totals €1,490', () => {
  assert.equal(violations(starter).size, 0);
  assert.equal(total(starter), 1490);
});
test('rotating a sofa against a narrow wall can make it spill outside', () => {
  const layout = { w: 3, d: 3, budget: 1000, items: [{ ...starter.items[0], x: .8, z: 0, turn: 0 }] };
  assert.ok(violations(layout).get('a')?.has('Outside the room'));
  layout.items[0].turn = 1;
  assert.equal(violations(layout).size, 0);
});
test('overlap is reported for both pieces; a newly placed item fits', () => {
  const p = { ...starter.items[0], id: 'new' };
  const result = violations({ ...starter, items: [...starter.items, p] });
  assert.ok(result.get('a')?.has('Overlaps furniture'));
  assert.ok(result.get('new')?.has('Overlaps furniture'));
  const placed = findPlacement(starter, 'lamp', 'new');
  assert.ok(placed);
  assert.equal(violations({ ...starter, items: [...starter.items, placed] }).size, 0);
});
