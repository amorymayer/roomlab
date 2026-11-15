import type { PaletteId } from './materials.ts';
export const catalogue = {
  sofa: { name: 'Tobacco modular sofa', w: 2.1, d: .9, h: .8, price: 680, color: '#73422f', icon: '▰' },
  chair: { name: 'Chrome sling chair', w: .83, d: .83, h: .82, price: 290, color: '#373e31', icon: '◩' },
  table: { name: 'Smoked coffee table', w: 1.15, d: .61, h: .39, price: 185, color: '#554c43', icon: '⊟' },
  shelf: { name: 'Walnut record console', w: 1.5, d: .4, h: .61, price: 240, color: '#65402b', icon: '▤' },
  lamp: { name: 'Amber dome lamp', w: .38, d: .38, h: 1.46, price: 95, color: '#ed993d', icon: '◉' },
  desk: { name: 'Steel writing desk', w: 1.35, d: .65, h: .75, price: 360, color: '#a4a9a8', icon: '⊓' },
} as const;
export type Kind = keyof typeof catalogue;
export type Piece = { id: string; kind: Kind; x: number; z: number; turn: number; color?: string };
export type Layout = { w: number; d: number; budget: number; palette?: PaletteId; items: Piece[] };
export const starter: Layout = { w: 5, d: 4, budget: 1500, items: [
  { id: 'a', kind: 'sofa', x: -.52, z: -1.35, turn: 0 },
  { id: 'b', kind: 'table', x: -.4, z: -.05, turn: 0 },
  { id: 'c', kind: 'chair', x: 1.38, z: .35, turn: 3 },
  { id: 'd', kind: 'shelf', x: -.55, z: 1.55, turn: 0 },
  { id: 'e', kind: 'lamp', x: 1.28, z: -1.44, turn: 0 },
] };
export function bounds(p: Piece) {
  const {w,d} = catalogue[p.kind];
  const [a,b] = p.turn % 2 ? [d/2,w/2] : [w/2,d/2];
  return { left: p.x-a, right:p.x+a, top:p.z-b, bottom:p.z+b };
}
const epsilon = .00001;
type Bounds = ReturnType<typeof bounds>;
const outside = (a:Bounds, layout:Layout) => a.left < -layout.w/2-epsilon || a.right > layout.w/2+epsilon ||
  a.top < -layout.d/2-epsilon || a.bottom > layout.d/2+epsilon;
const overlap = (a:Bounds,b:Bounds) => Math.min(a.right,b.right)-Math.max(a.left,b.left)>epsilon &&
  Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>epsilon;
export function violations(layout: Layout) {
  const messages = new Map<string, Set<string>>();
  const add = (id:string, msg:string) => {
    const group = messages.get(id) ?? new Set<string>(); group.add(msg); messages.set(id, group);
  };
  for (const [i, p] of layout.items.entries()) {
    const a = bounds(p);
    if (outside(a,layout)) add(p.id, 'Outside the room');
    for (const q of layout.items.slice(i+1)) {
      const b = bounds(q);
      if (overlap(a,b)) {
        add(p.id, 'Overlaps furniture'); add(q.id, 'Overlaps furniture');
      }
    }
  }
  return messages;
}
export const total = (layout: Layout) => layout.items.reduce((sum,p) => sum + catalogue[p.kind].price, 0);
export const snap = (n:number) => Math.round(n*20)/20;
export function findPlacement(layout: Layout, kind: Kind, id: string): Piece | undefined {
  const occupied=layout.items.map(bounds);
  for (const turn of [0,1]) {
    for (let z = -Math.floor(layout.d * 5); z <= layout.d * 5; z++) {
      for (let x = -Math.floor(layout.w * 5); x <= layout.w * 5; x++) {
        const p = { id, kind, x:x/10, z:z/10, turn };
        const footprint=bounds(p);
        if (!outside(footprint,layout)&&!occupied.some(b=>overlap(footprint,b))) return p;
      }
    }
  }
}
