import { bounds, catalogue, total, violations, type Kind, type Layout, type Piece } from './layout.ts';
import type { PaletteId } from './materials.ts';

export const uses = {
  listening:{ name:'Listening room', description:'A focused seat, a place for records, and a clear route past the furniture.', kinds:['sofa','shelf','chair','table','lamp'] },
  working:{ name:'Work by the window', description:'A desk near the window, with a separate spot to take a break.', kinds:['desk','chair','lamp','shelf'] },
  hosting:{ name:'Drinks for four', description:'Seats grouped around a shared table, with room to arrive and move through.', kinds:['sofa','chair','chair','table','lamp'] },
} as const;
export type Use = keyof typeof uses;
export type Entry = 'left'|'center'|'right';
export type Brief = { use:Use; w:number; d:number; budget:number; clearance:number; entry:Entry; furniture?:Kind[] };
export const defaultBrief:Brief={use:'listening',w:5,d:4,budget:1600,clearance:.75,entry:'right'};
const ENTRY_WIDTH=1.10, entryDepth=.65;
export const entryX=(brief:Brief)=> (brief.entry==='left'?-1:brief.entry==='right'?1:0)*Math.max(0,brief.w/2-.73);
export const furnitureFor=(brief:Brief):readonly Kind[]=>brief.furniture??uses[brief.use].kinds;
export const briefCost=(brief:Brief)=>furnitureFor(brief).reduce((sum,k)=>sum+catalogue[k].price,0);

export function isBrief(data:unknown):data is Brief {
  if(!data||typeof data!=='object') return false;
  const b=data as Brief;
  return Object.hasOwn(uses,b.use)&&(b.furniture===undefined||(Array.isArray(b.furniture)&&b.furniture.length>=1&&b.furniture.length<=8&&b.furniture.every(k=>typeof k==='string'&&Object.hasOwn(catalogue,k))))&&['left','center','right'].includes(b.entry)&&
    [[b.w,2,10],[b.d,2,10],[b.budget,0,100000],[b.clearance,.6,1]].every(([value,min,max])=>Number.isFinite(value)&&value>=min&&value<=max);
}

function entryBlocked(layout:Layout, brief:Brief) {
  const ex=entryX(brief);
  return layout.items.some(piece=>{
    const b=bounds(piece);
    return b.left<ex+ENTRY_WIDTH/2&&b.right>ex-ENTRY_WIDTH/2&&b.bottom>layout.d/2-entryDepth&&b.top<layout.d/2;
  });
}

export function analyse(layout:Layout, brief:Brief) {
  const cols=Math.ceil(layout.w*10), rows=Math.ceil(layout.d*10);
  const dx=layout.w/cols,dz=layout.d/rows,r=brief.clearance/2;
  const board=new Uint8Array(cols*rows), queue=new Int32Array(board.length);
  const occupied=layout.items.map(bounds), entry=entryX({...brief,w:layout.w});
  const blocked=entryBlocked(layout,{...brief,w:layout.w});
  let end=0,start=0, free=0, windowReached=false;
  for(let row=0;row<rows;row++){
    const z=-layout.d/2+(row+.5)*dz;
    for(let col=0;col<cols;col++){
      const x=-layout.w/2+(col+.5)*dx, n=row*cols+col;
      if(Math.abs(x)>layout.w/2-r||Math.abs(z)>layout.d/2-r||occupied.some(b=>x>b.left-r&&x<b.right+r&&z>b.top-r&&z<b.bottom+r)){
        board[n]=1;continue;
      }
      free++;
      if(!blocked&&Math.abs(x-entry)<=(ENTRY_WIDTH-brief.clearance)/2+.001&&z>=layout.d/2-r-dz){
        board[n]=2;queue[end++]=n;
      }
    }
  }
  const visit=(n:number)=>{if(board[n]===0){board[n]=2;queue[end++]=n;}};
  while(start<end){
    const n=queue[start++], col=n%cols, row=Math.floor(n/cols);
    const z=-layout.d/2+(row+.5)*dz;
    const x=-layout.w/2+(col+.5)*dx;
    if(z<=-layout.d/2+r+.45&&Math.abs(x)<layout.w*.33)windowReached=true;
    if(col>0)visit(n-1);if(col<cols-1)visit(n+1);if(row>0)visit(n-cols);if(row<rows-1)visit(n+cols);
  }
  return {board,cols,rows,dx,dz,free,reachable:end,
    area:end*dx*dz,windowReached,blocked,fitIssues:violations(layout).size,cost:total(layout)};
}

export const strategies = {
  flow: { name:'Clear passage', description:'Prioritizes floor area reachable from the entry.', palette:'gallery' },
  window: { name:'Window first', description:'Places the desk or main seat toward the window while preserving a route to it when possible.', palette:'loft' },
  cluster: { name:'Gather around', description:'Groups the seating toward its focal piece, with a usable entry.', palette:'dusk' },
} as const;
export type Strategy=keyof typeof strategies;
export type Proposal={strategy:Strategy;layout:Layout};
const strategyIds=Object.keys(strategies) as Strategy[];
const dist=(a:Piece,b:Piece)=>Math.hypot(a.x-b.x,a.z-b.z);
function seeded(seed:number){
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function canPlace(p:Piece,items:Piece[], brief:Brief){
  const b=bounds(p),ex=entryX(brief);
  if(b.left< -brief.w/2||b.right>brief.w/2||b.top< -brief.d/2||b.bottom>brief.d/2)return false;
  if(b.bottom>brief.d/2-entryDepth&&b.left<ex+ENTRY_WIDTH/2&&b.right>ex-ENTRY_WIDTH/2)return false;
  return items.every(i=>{
    const q=bounds(i);return b.left>=q.right+.045||q.left>=b.right+.045||b.top>=q.bottom+.045||q.top>=b.bottom+.045;
  });
}
function signature(layout:Layout){
  return layout.items.map(p=>p.kind+':'+Math.round(p.x*2)+':'+Math.round(p.z*2)).sort().join('/');
}
export function generate(brief:Brief):Proposal[]{
  if(!isBrief(brief)||briefCost(brief)>brief.budget)return [];
  const options:Proposal[]=[], seen=new Set<string>();
  const kinds=[...furnitureFor(brief)].sort((a,b)=>Number(b===(brief.use==='working'?'desk':'sofa'))-Number(a===(brief.use==='working'?'desk':'sofa'))||catalogue[b].w*catalogue[b].d-catalogue[a].w*catalogue[a].d);
  const rand=seeded(3177+Math.round(brief.w*10)+Math.round(brief.d*100));
  for(const strategy of strategyIds){
    let best:Layout|null=null, bestScore=-Infinity;
    for(let trial=0;trial<155;trial++){
      const items:Piece[]=[];
      for(const [index,kind] of kinds.entries()){
        let chosen:Piece|null=null, bestLocal=-Infinity;
        for(let pick=0;pick<100;pick++){
          const p:Piece={id:'piece-'+index,kind,x:Math.round((rand()-.5)*brief.w*10)/10,z:Math.round((rand()-.5)*brief.d*10)/10,turn:Math.floor(rand()*4)};
          if(!canPlace(p,items,brief))continue;
          const b=bounds(p);
          const edge=Math.min(b.left+brief.w/2,brief.w/2-b.right,b.top+brief.d/2,brief.d/2-b.bottom);
          const anchor=items[0], close=anchor?Math.abs(dist(anchor,p)-(kind==='lamp'?1.15:1.55)):0;
          const affinity=strategy==='flow'?-edge*1.45:strategy==='window'?(index===0?-p.z*1.5:-edge*.8):(anchor?-close*1.45:-edge*.75);
          const facingAnchor=kind==='chair'||kind==='sofa';
          const front = p.turn===0?[0,1]:p.turn===1?[1,0]:p.turn===2?[0,-1]:[-1,0];
          const facing = facingAnchor ? (anchor ? ((anchor.x-p.x)*front[0]+(anchor.z-p.z)*front[1])/Math.max(.1,dist(anchor,p)) : front[1]) : 0;
          const score=affinity+rand()*(.65+(trial%5)*.48)+facing*.32;
          if(score>bestLocal){bestLocal=score;chosen=p;}
        }
        if(!chosen)break;
        items.push(chosen);
      }
      if(items.length!==kinds.length)continue;
      const layout={w:brief.w,d:brief.d,budget:brief.budget,palette:strategies[strategy].palette as PaletteId,items};
      const key=signature(layout);if(seen.has(key))continue;
      const metric=analyse(layout,brief);
      if(metric.blocked||metric.reachable===0)continue;
      const seatGroup=items.filter(p=>p.kind==='chair'||p.kind==='table').reduce((sum,p)=>sum+Math.abs(dist(items[0],p)-1.5),0);
      const score=strategy==='flow'?metric.area+(metric.windowReached?.8:0):
        strategy==='window'?metric.area*.35+(metric.windowReached?5:0)-items[0].z*2:
        metric.area*.42-seatGroup*2+(metric.windowReached?.65:0);
      if(score>bestScore){best=layout;bestScore=score;}
    }
    if(best){seen.add(signature(best));options.push({strategy,layout:best});}
  }
  return options;
}
