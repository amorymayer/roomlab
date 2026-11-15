import { palettes, type PaletteId } from './materials.ts';
import { catalogue, type Layout, type Kind, type Piece } from './layout.ts';

export const maxPieces = 50;
const numberIn = (value: unknown, min: number, max: number): value is number =>
  typeof value==='number' && Number.isFinite(value) && value>=min && value<=max;

export function validateLayout(data: unknown): Layout | null {
  if (!data || typeof data!=='object') return null;
  const candidate=data as Partial<Layout>;
  const {w,d,budget,items,palette}=candidate;
  if(palette!==undefined && (typeof palette!=='string'||!Object.hasOwn(palettes,palette))) return null;
  if (!numberIn(w,2,10)||!numberIn(d,2,10)||!numberIn(budget,0,100000)||!Array.isArray(items)||items.length>maxPieces) return null;
  const ids=new Set<string>(), checked:Piece[]=[];
  for (const item of items) {
    if (!item || typeof item!=='object') return null;
    const {id,kind,x,z,turn,color}=item;
    if (typeof id!=='string'||!id||id.length>64||ids.has(id)||typeof kind!=='string'||!Object.hasOwn(catalogue,kind)||
      !numberIn(x,-10,10)||!numberIn(z,-10,10)||!numberIn(turn,0,3)||!Number.isInteger(turn)||
      (color!==undefined && (typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color)))) return null;
    ids.add(id); checked.push({id,kind:kind as Kind,x,z,turn,...(color ? {color} : {})});
  }
  return {w,d,budget,items:checked,...(palette ? {palette:palette as PaletteId} : {})};
}

export function encodeLayout(layout: Layout): string {
  const base=[layout.w,layout.d,layout.budget,layout.items.map(({kind,x,z,turn,color})=>[kind,x,z,turn,color??null])];
  const payload = layout.palette ? [2,...base,layout.palette] : [1,...base];
  return btoa(JSON.stringify(payload)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeLayout(encoded: string): Layout | null {
  if (!/^[A-Za-z0-9_-]{1,6000}$/.test(encoded)) return null;
  try {
    const payload:unknown=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
    if (!Array.isArray(payload)||!((payload[0]===1&&payload.length===5)||(payload[0]===2&&payload.length===6&&typeof payload[5]==='string'))||!Array.isArray(payload[4])||payload[4].length>maxPieces) return null;
    return validateLayout({w:payload[1],d:payload[2],budget:payload[3],palette:payload[5],items:payload[4].map((row,i)=>{
      if (!Array.isArray(row)||row.length!==5) throw new Error('Invalid piece');
      const [kind,x,z,turn,color]=row;
      return {id:'shared-'+i,kind,x,z,turn,color:color===null?undefined:color};
    })});
  } catch { return null; }
}
