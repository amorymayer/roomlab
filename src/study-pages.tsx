import { useId, useMemo, type FormEvent } from 'react';
import { bounds, catalogue, starter, type Layout, type Kind } from './layout.ts';
import { StudySignal } from './study-signal.tsx';
import type { CSSProperties } from 'react';
import { palettes } from './materials.ts';
import { analyse, entryX, briefCost, defaultBrief, furnitureFor, uses, strategies, type Brief, type Proposal, type Use } from './study.ts';

const eur=(n:number)=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const pieceLabels:Record<Kind,string>={sofa:'SOFA',chair:'CHAIR',table:'TABLE',lamp:'LAMP',desk:'DESK',shelf:'RECORDS'};
export function PlanGraphic({layout,brief,showRoute=true}: {layout:Layout;brief:Brief;showRoute?:boolean}) {
  const metric=useMemo(()=>analyse(layout,brief),[layout,brief]);
  const id=useId(), {w,d}=layout, entry=entryX({...brief,w});
  const heat:string[]=[];
  if(showRoute) for(let row=0;row<metric.rows;row++){
    let start=-1;
    for(let col=0;col<=metric.cols;col++){
      if(col<metric.cols&&metric.board[row*metric.cols+col]===2){if(start===-1)start=col;}
      else if(start!==-1){
        const x=start*metric.dx-w/2,z=row*metric.dz-d/2, width=(col-start)*metric.dx;
        heat.push(`M${x.toFixed(4)} ${z.toFixed(4)}h${width.toFixed(4)}v${metric.dz.toFixed(4)}h-${width.toFixed(4)}Z`);start=-1;
      }
    }
  }
  const palette=palettes[layout.palette??'loft'];
  return <svg className="study-plan" viewBox={`${-w/2-.62} ${-d/2-.5} ${w+1.24} ${d+1.05}`} role="img" aria-label="Floor plan showing furniture footprints, the entry and estimated reachable area">
    <defs><pattern id={id} width=".25" height=".25" patternUnits="userSpaceOnUse"><path d="M0 .25V0h.25" fill="none" stroke="var(--plan-grid)" strokeWidth=".009"/></pattern></defs>
    <rect x={-w/2} y={-d/2} width={w} height={d} fill="var(--plan-floor)" stroke="var(--plan-outline)" strokeWidth=".045"/>
    <rect x={-w/2} y={-d/2} width={w} height={d} fill={`url(#${id})`}/>
    <path d={heat.join('')} fill="var(--plan-flow)" opacity=".68"/>
    <path d={`M${-w*.34} ${-d/2}h${w*.68}`} stroke="var(--plan-window)" strokeWidth=".07"/>
    <rect x={entry-.55} y={d/2-.65} width="1.1" height=".65" fill="var(--plan-entry)" opacity=".22"/>
    <path d={`M${entry-.55} ${d/2}h1.1`} stroke={metric.blocked?'var(--bad)':'var(--plan-entry)'} strokeWidth=".095"/>
    {layout.items.map(piece=>{
      const b=bounds(piece),color=piece.color??(piece.kind==='sofa'||piece.kind==='chair'?palette[piece.kind]:catalogue[piece.kind].color);
      return <g key={piece.id}>
        <rect x={b.left} y={b.top} width={b.right-b.left} height={b.bottom-b.top} rx=".037" fill={color} stroke="var(--plan-outline)" strokeWidth=".017"/>
        {piece.kind!=='lamp'&&<text x={piece.x} y={piece.z+.04} textAnchor="middle" fill="#fff8ea" stroke="#20150f" strokeWidth=".018" paintOrder="stroke" fontSize=".105">{pieceLabels[piece.kind]}</text>}
      </g>;
    })}
    <g fill="var(--plan-label)" fontSize=".12" textAnchor="middle">
      <text y={-d/2-.19}>WINDOW WALL</text><text x={entry} y={d/2+.24}>ENTRY</text>
    </g>
  </svg>;
}
export function StudyMetrics({layout,brief}: {layout:Layout;brief:Brief}) {
  const m=useMemo(()=>analyse(layout,brief),[layout,brief]), balance=brief.budget-m.cost;
  const anchor=layout.items.find(p=>p.kind===(brief.use==='working'?'desk':'sofa'));
  return <dl className="study-metrics">
    <div><dt>Reachable floor</dt><dd>{m.area.toFixed(1)} m²</dd></div>
    <div><dt>Window route</dt><dd>{m.windowReached?'Open':'No route'}</dd></div>
    {anchor&&<div><dt>{anchor.kind==='desk'?'Desk':'Sofa'} to window wall</dt><dd>{Math.max(0,bounds(anchor).top+layout.d/2).toFixed(2)} m</dd></div>}
    <div><dt>Budget balance</dt><dd className={balance<0?'warning':''}>{eur(Math.abs(balance))} {balance<0?'over':'left'}</dd></div>
    {(m.blocked||m.fitIssues>0)&&<div className="study-alert"><dt>Fit check</dt><dd>{m.blocked?'Entry blocked':m.fitIssues+' pieces flagged'}</dd></div>}
  </dl>;
}

const useIds=Object.keys(uses) as Use[];
export function BriefPage({brief,setBrief,proposals,busy,error,onGenerate,onOpen}:{
  brief:Brief;setBrief:(b:Brief)=>void;proposals:Proposal[];busy:boolean;error:string;
  onGenerate:()=>void;onOpen:(p:Proposal)=>void;
}) {
  const canGenerate=briefCost(brief)<=brief.budget;
  const signal=busy?'searching':error||!canGenerate?'error':proposals.length?'ready':'idle';
  const message=busy?'Checking furniture fit and circulation…':error||
    (!canGenerate?'The furniture set exceeds your budget.':proposals.length?`${proposals.length} proposals ready to compare.`:'Ready to search layouts.');
  function submit(e:FormEvent){e.preventDefault();onGenerate();}
  const picked=furnitureFor(brief);
  function changeCount(kind:Kind,delta:number){
    if(delta>0&&picked.length<8)setBrief({...brief,furniture:[...picked,kind]});
    if(delta<0&&picked.length>1){
      const n=picked.lastIndexOf(kind);
      if(n!==-1)setBrief({...brief,furniture:picked.filter((_,i)=>i!==n)});
    }
  }
  return <main className="study-page brief-page">
    <section className="brief-hero">
      <div className="brief-lead"><p className="study-kicker">Small-space planning</p><h1>Make room for<br/><em>what matters.</em></h1>
        <p>One compact room. Three ways to live in it. Compare what fits, what flows, and what you can afford before you move a thing.</p>
        <a className="study-action" href="#design-brief">Write your brief <span aria-hidden="true">↓</span></a>
      </div>
      <figure className="blueprint">
        <div><span>Circulation preview</span><span>{(proposals[0]?.layout.w??starter.w).toFixed(1)} × {(proposals[0]?.layout.d??starter.d).toFixed(1)} m</span></div>
        <PlanGraphic layout={proposals[0]?.layout??starter} brief={proposals.length?brief:defaultBrief}/>
        <figcaption><i/> Estimated floor reachable from the entry</figcaption>
      </figure>
    </section>
    <section id="design-brief" className="study-section">
      <div className="section-heading"><span className="study-kicker">Design brief</span><h2>Give the room a job.</h2></div>
      <form className="brief-form" onSubmit={submit}>
        <fieldset><legend>What happens here?</legend><div className="use-options">
          {useIds.map(use=><label key={use} data-checked={brief.use===use}>
            <input type="radio" name="room-use" checked={brief.use===use} onChange={()=>setBrief({...brief,use,furniture:undefined})}/>
            <strong>{uses[use].name}</strong><span>{uses[use].description}</span>
          </label>)}
        </div></fieldset>
        <fieldset><legend>Set the constraints</legend><div className="brief-inputs">
          <label>Room width (m)<input type="number" step=".1" min="2" max="10" defaultValue={brief.w} name="width" required
            onChange={e=>{const w=e.currentTarget.valueAsNumber;if(w>=2&&w<=10)setBrief({...brief,w});}}/></label>
          <label>Room depth (m)<input type="number" step=".1" min="2" max="10" defaultValue={brief.d} name="depth" required
            onChange={e=>{const d=e.currentTarget.valueAsNumber;if(d>=2&&d<=10)setBrief({...brief,d});}}/></label>
          <label>Budget (€)<input type="number" step="1" min="0" max="100000" defaultValue={brief.budget} required
            onChange={e=>{const budget=e.currentTarget.valueAsNumber;if(budget>=0&&budget<=100000)setBrief({...brief,budget});}}/></label>
          <label>Entry position<select value={brief.entry} onChange={e=>setBrief({...brief,entry:e.target.value as Brief['entry']})}><option value="left">Front left</option><option value="center">Front centre</option><option value="right">Front right</option></select></label>
          <label>Target passage<select value={brief.clearance} onChange={e=>setBrief({...brief,clearance:Number(e.target.value)})}><option value="0.6">60 cm</option><option value="0.75">75 cm</option><option value="0.9">90 cm</option><option value="1">100 cm</option></select></label>
        </div></fieldset>
        <details className="brief-furniture">
          <summary>Adjust furniture set <span>{picked.length} pieces</span></summary>
          <ul>{(Object.keys(catalogue) as Kind[]).map(kind=>{
            const count=picked.filter(k=>k===kind).length;
            return <li key={kind}><span>{catalogue[kind].name}<small>{eur(catalogue[kind].price)} each</small></span><div>
              <button type="button" aria-label={'Remove '+catalogue[kind].name+' from brief'} disabled={!count||picked.length===1} onClick={()=>changeCount(kind,-1)}>−</button>
              <output aria-label={catalogue[kind].name+' quantity'}>{count}</output>
              <button type="button" aria-label={'Add '+catalogue[kind].name+' to brief'} disabled={picked.length===8} onClick={()=>changeCount(kind,1)}>+</button>
            </div></li>;
          })}</ul>
        </details>
        <div className="brief-submit">
          <div className="brief-priced"><strong>{eur(briefCost(brief))} furniture set</strong><span>{canGenerate?'Each proposal uses the same pieces, arranged differently.':'Raise the budget or choose a different use.'}</span></div>
          <button className="study-action" disabled={busy||!canGenerate}>{busy?'Searching layouts…':'Generate layouts'} <span aria-hidden="true">↗</span></button>
        </div>
        <div className="study-feedback" data-state={signal}>
          <StudySignal state={signal}/>
          <p className="study-status" role="status">{message}</p>
        </div>
      </form>
    </section>
    {proposals.length>0&&<section className="study-section" aria-label="Layout proposals">
      <div className="section-heading"><span className="study-kicker">Layout proposals</span><h2>Same room. Different priorities.</h2></div>
      <div className="proposal-grid">{proposals.map((p,i)=><article key={p.strategy} className="proposal-card" style={{'--item-order':i} as CSSProperties}>
        <p className="study-kicker">Option 0{i+1}</p>
        <PlanGraphic layout={p.layout} brief={brief}/>
        <h3>{strategies[p.strategy].name}</h3><p>{strategies[p.strategy].description}</p>
        <StudyMetrics layout={p.layout} brief={brief}/>
        <button className="outline-action" onClick={()=>onOpen(p)}>Open in Studio <span aria-hidden="true">↗</span></button>
      </article>)}</div>
    </section>}
  </main>;
}

export function ReviewPage({layout,brief,proposals,comparison,onComparison,note,setNote}:{
  layout:Layout;brief:Brief;proposals:Proposal[];comparison:number;onComparison:(v:number)=>void;note:string;setNote:(v:string)=>void;
}) {
  const reference=proposals[comparison];
  const estimated=useMemo(()=>analyse(layout,brief),[layout,brief]);
  const required=furnitureFor(brief);
  const counts=new Map<Kind,number>();
  for(const piece of layout.items)counts.set(piece.kind,(counts.get(piece.kind)??0)+1);
  const available=new Map(counts);
  const missing=required.filter(kind=>{const count=available.get(kind)??0;available.set(kind,count-1);return count<=0;});
  return <main className="study-page review-page">
    <header className="review-lead"><div><h1>Design Review</h1><p>{uses[brief.use].name} · {layout.w.toFixed(1)} × {layout.d.toFixed(1)} m · {Math.round(brief.clearance*100)} cm target passage</p></div>
      <button className="study-action" onClick={()=>window.print()}>Print decision sheet <span aria-hidden="true">↗</span></button>
    </header>
    {proposals.length>1&&<div className="compare-control"><label>Compare against <select value={comparison} onChange={e=>onComparison(Number(e.target.value))}>
      {proposals.map((p,i)=><option key={p.strategy} value={i}>{strategies[p.strategy].name}</option>)}
    </select></label></div>}
    <div className="review-comparison">
      <article className="proposal-card"><p className="study-kicker">A / Working design</p><PlanGraphic layout={layout} brief={brief}/><StudyMetrics layout={layout} brief={brief}/></article>
      {reference&&<article className="proposal-card"><p className="study-kicker">B / {strategies[reference.strategy].name}</p><PlanGraphic layout={reference.layout} brief={brief}/><StudyMetrics layout={reference.layout} brief={brief}/></article>}
    </div>
    <p className="plan-key"><i/> Reachable floor at your target passage width <small>10 cm model · conservative rectangular footprints · planning estimate</small></p>
    <div className="review-bottom">
      <section className="review-card"><h2>What the room supports</h2>
        <ul><li>{missing.length?`Still missing: ${missing.map(k=>catalogue[k].name).join(', ')}.`:'The furniture set covers the brief.'}</li>
          <li>{estimated.blocked?'The entry zone is blocked. Move the furniture away from the front threshold.':estimated.reachable===0?'No passage at this target width starts from the entry.':estimated.windowReached?'The target passage reaches the window wall.':'The entry is open, but the target passage does not reach the window wall.'}</li>
          <li>{estimated.fitIssues?`${estimated.fitIssues} pieces overlap or extend beyond the room.`:'All furniture footprints fit without overlap.'}</li>
          <li>{estimated.cost>brief.budget?`${eur(estimated.cost-brief.budget)} over your brief budget.`:`${eur(brief.budget-estimated.cost)} remains in your brief budget.`}</li>
        </ul>
        <label className="decision-note">Decision notes<textarea value={note} maxLength={1200} rows={4} onChange={e=>setNote(e.target.value)} placeholder="What would you keep, change, or show a client?"/></label>
        {note&&<p className="print-note">{note}</p>}
      </section>
      <section className="review-card"><h2>Furniture schedule</h2>
        <dl className="furniture-schedule">{[...counts].map(([kind,count])=><div key={kind}><dt>{count} × {catalogue[kind].name}</dt><dd>{eur(catalogue[kind].price*count)}</dd></div>)}<div><dt>Total</dt><dd>{eur(estimated.cost)}</dd></div></dl>
      </section>
    </div>
  </main>;
}
