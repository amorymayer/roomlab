import { useEffect, useMemo, useReducer, useRef, useState, type PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Glass, SegmentedControl } from 'glisse';
import { catalogue, starter, total, violations, findPlacement, snap, type Layout, type Kind, type Piece } from './layout.ts';
import { Scene, type ViewMode } from './scene.tsx';
import { LightControls } from './light-controls.tsx';
import type { Daylight } from './daylight.ts';
import { historyOf, historyReducer } from './history.ts';
import { decodeLayout, encodeLayout, maxPieces, validateLayout } from './share.ts';
import { Icon } from './toolbar.tsx';
import { CatalogueRenderer, kinds, type CatalogueImages } from './catalogue-images.tsx';
import { palettes, finishes, type PaletteId } from './materials.ts';
import { BriefPage, ReviewPage, PlanGraphic, StudyMetrics } from './study-pages.tsx';
import { defaultBrief, entryX, isBrief, strategies, type Brief, type Proposal } from './study.ts';
import './style.css';
import './study.css';
import './motion.css';
import { glide } from './motion.ts';

const key='roomlab.layout.v1';
const money=(n:number)=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
const sharedPrefix='#layout=';
type Page='brief'|'studio'|'review';
const pageNames:Record<Page,string>={brief:'Brief',studio:'Studio',review:'Review'};
const studyKey='roomlab.study.v1';
function currentPage():Page {
  const view=new URLSearchParams(location.search).get('view');
  return view==='studio'||view==='review'||view==='brief'?view:location.hash.startsWith(sharedPrefix)?'studio':'brief';
}
function pageHref(view:Page) {
  const url=new URL(location.href);
  url.searchParams.set('view',view);
  if(!url.hash.startsWith(sharedPrefix))url.hash='';
  return url.pathname+url.search+url.hash;
}
function readStudy() {
  try {
    const saved=JSON.parse(localStorage.getItem(studyKey)??'null');
    if(saved&&isBrief(saved.brief)){
      const proposals:Proposal[]=Array.isArray(saved.proposals)?saved.proposals.slice(0,3).flatMap((p:Proposal)=>{
        const layout=validateLayout(p?.layout);
        return layout&&typeof p.strategy==='string'&&Object.hasOwn(strategies,p.strategy)?[{strategy:p.strategy,layout}]:[];
      }):[];
      return {brief:saved.brief as Brief,note:typeof saved.note==='string'?saved.note.slice(0,1200):'',proposals};
    }
  } catch {}
  return {brief:defaultBrief,note:'',proposals:[] as Proposal[]};
}
function restore() {
  const fromLink=location.hash.startsWith(sharedPrefix);
  const shared=fromLink ? decodeLayout(location.hash.slice(sharedPrefix.length)) : null;
  if (shared) return {layout:shared,status:'Shared layout opened'};
  let saved:Layout|null=null;
  try { const raw=localStorage.getItem(key); if(raw) saved=validateLayout(JSON.parse(raw)); } catch {}
  return {layout:saved??starter,status:fromLink?'Could not open this layout link.':saved?'Saved on this device':'Changes stay in this tab until you save.'};
}
function NumberField({label,value,min,max,step,change}: {label:string;value:number;min:number;max:number;step:number;change:(n:number)=>void}) {
  return <label>{label}<input key={value} type="number" defaultValue={value} min={min} max={max} step={step}
    onBlur={e=>{const n=e.currentTarget.valueAsNumber;if(Number.isFinite(n)){const next=Math.min(max,Math.max(min,n));e.currentTarget.value=String(next);change(next);}else e.currentTarget.value=String(value);}}
    onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></label>;
}
function Panel({title,caption,children}:PropsWithChildren<{title:string;caption?:string}>) {
  return <section className="panel"><div className="panel-title"><h2>{title}</h2>{caption&&<span>{caption}</span>}</div>{children}</section>;
}
function App() {
  const [initial]=useState(restore);
  const [page,setPage]=useState(currentPage);
  const [study]=useState(readStudy);
  const [brief,setBriefState]=useState<Brief>(study.brief);
  const [note,setNote]=useState(study.note);
  const [proposals,setProposals]=useState<Proposal[]>(study.proposals);
  const [comparison,setComparison]=useState(0);
  const [busy,setBusy]=useState(false);
  const [studyError,setStudyError]=useState('');
  const worker=useRef<Worker|null>(null);
  const [flow,setFlow]=useState(false);
  useEffect(()=>{
    const pop=()=>setPage(currentPage());
    window.addEventListener('popstate',pop);
    return ()=>{window.removeEventListener('popstate',pop);worker.current?.terminate();};
  },[]);
  useEffect(()=>{
    try {localStorage.setItem(studyKey,JSON.stringify({brief,note,proposals}));} catch {}
  },[brief,note,proposals]);
  function navigate(view:Page) {
    if(page===view)return;
    const href=pageHref(view);
    glide('page',()=>{
      window.history.pushState(null,'',href);
      setPage(view);
      window.scrollTo({ top:0, behavior:'instant' });
    });
  }
  function setBrief(next:Brief) {
    worker.current?.terminate();worker.current=null;setBusy(false);setStudyError('');setProposals([]);setBriefState(next);
  }
  function runStudy() {
    worker.current?.terminate();
    setStudyError('');setBusy(true);
    try {
      const task=new Worker(new URL('./study.worker.ts',import.meta.url),{type:'module'});
      worker.current=task;
      function finish(){
        task.terminate();if(worker.current!==task)return false;
        worker.current=null;setBusy(false);return true;
      }
      task.onmessage=(e:MessageEvent<{error?:string;proposals?:Proposal[]}>)=>{
        if(!finish())return;
        const found=e.data.proposals??[];
        setProposals(found);setComparison(0);
        if(!found.length)setStudyError(e.data.error??'No workable layout found for these dimensions and passage width. Try a wider room or a different entry.');
      };
      task.onerror=()=>{if(finish())setStudyError('Layout search could not run. Refresh and try again.');};
      task.postMessage(brief);
    } catch {setBusy(false);setStudyError('This browser could not start the layout search.');}
  }
  function openProposal(proposal:Proposal) {
    update(()=>proposal.layout);setStatus(strategies[proposal.strategy].name+' opened');
    setSelected(null);setPanel('scheme');setFlow(false);setMode('3d');
    const other=proposals.findIndex(p=>p.strategy!==proposal.strategy);
    setComparison(Math.max(0,other));navigate('studio');
  }
  const [history,dispatch]=useReducer(historyReducer,initial.layout,historyOf);
  const {current:layout}=history;
  const capture=useRef<(() => Promise<Blob>)|null>(null);
  const shareDialog=useRef<HTMLDialogElement>(null);
  const imageDialog=useRef<HTMLDialogElement>(null);
  const [image,setImage]=useState<{url:string;name:string}|null>(null);
  const [exporting,setExporting]=useState(false);
  useEffect(()=>()=>{if(image)URL.revokeObjectURL(image.url);},[image]);
  const shareInput=useRef<HTMLInputElement>(null);
  const [shareUrl,setShareUrl]=useState('');
  const [shareStatus,setShareStatus]=useState('');
  const [selected,setSelected]=useState<string|null>(null);
  const [mode,setMode]=useState<ViewMode>('3d');
  const plan=mode==='plan';
  const [angle,setAngle]=useState(0);
  const [panel,setPanel]=useState<'scheme'|'objects'>('scheme');
  const [images,setImages]=useState<CatalogueImages|null>(null);
  const palette=layout.palette??'loft', material=palettes[palette];
  const [lighting,setLighting]=useState<'day'|'evening'|'live'>('evening');
  const [live,setLive]=useState<Daylight|null>(null);
  const evening = lighting === 'live' ? (live?.evening ?? true) : lighting === 'evening';
  const cloud = lighting === 'live' ? (live?.cloud ?? 0) : 0;
  const [status,setStatus]=useState(initial.status);
  const errors=useMemo(()=>violations(layout),[layout]);
  const expense=total(layout), balance=layout.budget-expense;
  const item=layout.items.find(p=>p.id===selected);
  function update(fn:(l:Layout)=>Layout) {dispatch({type:'edit',edit:fn});setStatus('Unsaved changes');}
  function edit(id:string, patch:Partial<Piece>) { update(l=>({...l,items:l.items.map(p=>p.id===id?{...p,...patch}:p)})); }
  function step(type:'undo'|'redo') {
    if (type==='undo' ? !history.past.length : !history.future.length) return;
    dispatch({type});setStatus(type==='undo'?'Edit undone':'Edit restored');
  }
  useEffect(()=>{
    function shortcut(e:KeyboardEvent) {
      const target=e.target;
      if (page!=='studio'||e.defaultPrevented || !(e.metaKey||e.ctrlKey) || e.altKey ||
          (target instanceof HTMLElement && (target.matches('input, textarea, select, [contenteditable]') || target.closest('dialog')))) return;
      const k=e.key.toLowerCase();
      if (k!=='z' && k!=='y') return;
      e.preventDefault(); step(k==='y'||e.shiftKey?'redo':'undo');
    }
    window.addEventListener('keydown',shortcut);
    return ()=>window.removeEventListener('keydown',shortcut);
  },[history.past.length,history.future.length,page]);
  function move(id:string,x:number,z:number) {
    dispatch({type:'move',edit:l=>{
      const piece=l.items.find(p=>p.id===id);
      if(!piece||(piece.x===x&&piece.z===z)) return l;
      return {...l,items:l.items.map(p=>p.id===id?{...p,x,z}:p)};
    }});setStatus('Unsaved changes');
  }
  function select(id:string|null) {setSelected(id);if(id)setPanel('objects');}
  function add(kind:Kind) {
    if(layout.items.length>=maxPieces) {setStatus('This layout holds up to 50 pieces.');return;}
    const next=findPlacement(layout,kind,crypto.randomUUID());
    if(!next) {setStatus('No space for this piece. Move furniture or resize your room.');return;}
    update(l=>({...l,items:[...l.items,next]}));select(next.id);
  }
  function save() {
    try {localStorage.setItem(key,JSON.stringify(layout));if(location.hash.startsWith(sharedPrefix))window.history.replaceState(null,'',location.pathname+location.search);setStatus('Saved in this browser.');}
    catch {setStatus('Could not save: browser storage is unavailable.');}
  }
  function openShare() {
    const url=new URL(location.href);
    url.searchParams.set('view','studio');
    url.hash=sharedPrefix+encodeLayout(layout);
    setShareUrl(url.toString());setShareStatus('');
    shareDialog.current?.showModal();
  }
  async function copyShare() {
    try {await navigator.clipboard.writeText(shareUrl);setShareStatus('Layout link copied');}
    catch {shareInput.current?.select();setShareStatus('Select and copy the link.');}
  }
  async function exportImage() {
    if(flow){setStatus('Switch to a room view to export a PNG.');return;}
    setExporting(true);
    try {
      if (!capture.current) throw new Error('No renderer');
      const blob=await capture.current();
      setImage({url:URL.createObjectURL(blob),name:'roomlab-'+mode+'.png'});
      imageDialog.current?.showModal();
    } catch {setStatus('Could not export the image.');}
    finally {setExporting(false);}
  }

  return <>
    <header className="mast project-mast"><a className="brand" href={pageHref('brief')} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();navigate('brief');}}>
      <span className="mark" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m3 8 9-5 9 5v9l-9 5-9-5zM3 8l9 5 9-5M12 13v9"/></svg></span><span>RoomLab</span></a>
      <nav className="project-nav" data-page={page} aria-label="Design workflow">
        {(Object.keys(pageNames) as Page[]).map(view=><a key={view} href={pageHref(view)} aria-current={page===view?'page':undefined}
          onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();navigate(view);}}>{pageNames[view]}</a>)}
      </nav>
      <div className="mast-actions">{page==='studio'&&<><span className="status" role="status">{status}</span><button className="primary" onClick={save}>Save layout</button></>}</div>
    </header>
    {page==='brief'&&<BriefPage brief={brief} setBrief={setBrief} proposals={proposals} busy={busy} error={studyError} onGenerate={runStudy} onOpen={openProposal}/>}
    {page==='review'&&<ReviewPage layout={layout} brief={brief} proposals={proposals} comparison={comparison} onComparison={setComparison} note={note} setNote={setNote}/>}
    {page==='studio'&&<main className="studio-page">
      <div className="intro"><div><h1>The Listening Loft</h1></div><p><button className="text-action" onClick={()=>navigate('review')}>Open Design Review ↗</button></p></div>
      <div className="workspace">
        <div className="stage">
          <div className="stage-top">
            <SegmentedControl className="stage-segment" aria-label="Room lighting" value={lighting}
              items={[{value:'day',label:'Day'},{value:'evening',label:'Evening'},...(live?[{value:'live',label:'Live'}]:[])]}
              onValueChange={v=>{if(v!==lighting&&(v==='day'||v==='evening'||v==='live'))glide('stage',()=>setLighting(v));}}/>
            <SegmentedControl className="stage-segment" aria-label="Camera view" value={flow?'flow':mode}
              items={[{value:'3d',label:'Dollhouse'},{value:'plan',label:'Plan'},{value:'inside',label:'Inside'},{value:'flow',label:'Flow'}]}
              onValueChange={v=>{
                if(v===(flow?'flow':mode))return;
                glide('stage',()=>{
                  setFlow(v==='flow');
                  if(v==='3d'||v==='plan'||v==='inside')setMode(v);
                });
              }}/>
          </div>
          {flow&&<div className="flow-stage"><PlanGraphic layout={layout} brief={brief}/><span>{Math.round(brief.clearance*100)} cm passage · shaded floor is reachable</span></div>}
          <div className="canvas" data-view={mode} hidden={flow}><Scene capture={capture} onDragStart={()=>dispatch({type:'start'})} onDragEnd={()=>dispatch({type:'end'})}
            cloud={cloud} evening={evening} layout={layout} entry={entryX({...brief,w:layout.w})} mode={mode} angle={angle} selected={selected} errors={errors} select={select} move={move}/></div>
          {!flow&&mode==='inside'&&<div className="viewpoints" role="group" aria-label="Inside viewpoints">
            <Button aria-pressed={angle===0} onClick={()=>{if(angle!==0)glide('stage',()=>setAngle(0));}}>From entry</Button>
            <Button aria-pressed={angle===1} onClick={()=>{if(angle!==1)glide('stage',()=>setAngle(1));}}>From gallery wall</Button>
            <span className="viewpoint-hint">Drag to look around</span>
          </div>}
          <div className="stage-foot">
            <Glass className="stage-meta"><span>{layout.w.toFixed(1)} × {layout.d.toFixed(1)} m</span><span className="meta-area">{(layout.w*layout.d).toFixed(1)} m²</span>
              {lighting==='live'&&live&&<span className="meta-area">{live.city.name} · Live</span>}</Glass>
            <div className="stage-tools" role="group" aria-label="Layout actions">
              <Button aria-label="Undo" title="Undo (⌘Z)" disabled={!history.past.length} onClick={()=>step('undo')} icon={<Icon name="undo"/>}/>
              <Button aria-label="Redo" title="Redo (⇧⌘Z)" disabled={!history.future.length} onClick={()=>step('redo')} icon={<Icon name="redo"/>}/>
              <Button aria-label="Export PNG" title="Export PNG" disabled={exporting||flow} onClick={()=>void exportImage()} icon={<Icon name="camera"/>}/>
              <Button aria-label="Share layout" title="Share layout" onClick={openShare} icon={<Icon name="link"/>}/>
            </div>
          </div>
        </div>
        <aside className="studio-desk" aria-label="Room customization">
          <div className="desk-heading"><span>Design desk</span><span>{String(layout.items.length).padStart(2,'0')} objects</span></div>
          <div className="desk-tabs" role="group" aria-label="Customization sections">
            <button aria-pressed={panel==='scheme'} onClick={()=>{if(panel!=='scheme')glide('desk',()=>setPanel('scheme'));}}>Room scheme</button>
            <button aria-pressed={panel==='objects'} onClick={()=>{if(panel!=='objects')glide('desk',()=>setPanel('objects'));}}>Furniture</button>
          </div>
          {panel==='scheme'&&<>
          <Panel title="Material palette">
            <div className="palettes">{(Object.keys(palettes) as PaletteId[]).map(id=>{
              const look=palettes[id];
              return <button key={id} aria-pressed={palette===id} onClick={()=>{if(palette!==id)glide('stage',()=>update(l=>({...l,palette:id})));}}>
                <span className="palette-sample" aria-hidden="true"><i style={{background:look.wall}}/><i style={{background:look.floor}}/><i style={{background:look.sofa}}/></span>
                <span>{look.name}</span>{palette===id&&<span className="palette-check" aria-hidden="true">✓</span>}
              </button>;
            })}</div>
            <p className="palette-note">{material.note}</p>
          </Panel>
          {flow&&<Panel title="Circulation"><StudyMetrics layout={layout} brief={brief}/>
            <button className="text-action" onClick={()=>navigate('brief')}>Change passage or entry ↗</button>
          </Panel>}
          <Panel title="Room & budget">
            <div className="fields">
              <NumberField label="Width (m)" min={2} max={10} step={.1} value={layout.w} change={w=>{if(w!==layout.w)update(l=>({...l,w}));}}/>
              <NumberField label="Depth (m)" min={2} max={10} step={.1} value={layout.d} change={d=>{if(d!==layout.d)update(l=>({...l,d}));}}/>
              <NumberField label="Budget (€)" min={0} max={100000} step={50} value={layout.budget} change={budget=>{if(budget!==layout.budget)update(l=>({...l,budget}));}}/>
            </div>
            <div className="budget"><strong>{money(expense)}</strong><span className={balance<0?'warning':''}>{money(Math.abs(balance))} {balance<0?'over budget':'remaining'}</span></div>
            <progress data-over={balance<0} max={Math.max(1,layout.budget)} value={expense} aria-label="Budget used"/>
          </Panel>
          <LightControls live={live} apply={light=>glide('stage',()=>{setLive(light);setLighting('live');if(plan)setMode('3d');})}/>
          </>}
          {panel==='objects'&&<Panel title="In this room" caption={String(layout.items.length).padStart(2,'0')}>
            {errors.size>0&&<p className="warning notice" role="status">{errors.size} {errors.size===1?'piece needs':'pieces need'} repositioning.</p>}
            <div className="pieces">{layout.items.length===0&&<p className="note">Add a piece from the catalogue below.</p>}{layout.items.map(p=><button className="piece" key={p.id} aria-pressed={item?.id===p.id} onClick={()=>setSelected(p.id)}>
              <span><i className="swatch" style={{backgroundColor:p.color??(p.kind==='sofa'||p.kind==='chair'?material[p.kind]:catalogue[p.kind].color)}}/>{catalogue[p.kind].name}</span><small className={errors.has(p.id)?'warning':''}>{errors.has(p.id)?'Check fit':money(catalogue[p.kind].price)}</small>
            </button>)}</div>
            {item&&<div className="inspector" key={item.id}>
              {images?.[item.kind]&&<img className="inspector-photo" src={images[item.kind]} alt="" />}
              <div className="inspector-head"><strong>{catalogue[item.kind].name}</strong><label className="color">Finish <input aria-label="Furniture colour" type="color" value={item.color??(item.kind==='sofa'||item.kind==='chair'?material[item.kind]:catalogue[item.kind].color)} onChange={e=>edit(item.id,{color:e.target.value})}/></label></div>
              <div className="finish-swatches" role="group" aria-label="Curated furniture finishes">
                {finishes.map(([name,color])=><button key={name} type="button" title={name} aria-label={name+' finish'} aria-pressed={item.color===color} onClick={()=>{if(item.color!==color)edit(item.id,{color});}}><i style={{background:color}}/></button>)}
                <button className="reset-finish" disabled={!item.color} onClick={()=>edit(item.id,{color:undefined})}>Reset finish</button>
              </div>
              {errors.has(item.id)&&<p className="warning notice">{[...errors.get(item.id)!].join(' · ')}</p>}
              <div className="fields coordinates">
                <NumberField label="Left / right (m)" min={-10} max={10} step={.05} value={item.x} change={x=>{if(snap(x)!==item.x)edit(item.id,{x:snap(x)});}}/>
                <NumberField label="Front / back (m)" min={-10} max={10} step={.05} value={item.z} change={z=>{if(snap(z)!==item.z)edit(item.id,{z:snap(z)});}}/>
              </div>
              <div className="edit-actions"><button onClick={()=>edit(item.id,{turn:(item.turn+1)%4})}>↻ Rotate 90°</button><button onClick={()=>{update(l=>({...l,items:l.items.filter(p=>p.id!==item.id)}));setSelected(null);}}>Remove</button></div>
            </div>}
          </Panel>}
        </aside>
      </div>
      <section className="catalogue" aria-labelledby="catalogue-title">
        <div className="collection-title"><div><h2 id="catalogue-title">Furnish the loft</h2></div><p>Six studio pieces, drawn to scale. Select one to place it in the room.</p></div>
        <div className="catalogue-grid">{kinds.map(kind=>{
          const obj=catalogue[kind];
          return <button key={kind} aria-label={'Add '+obj.name} onClick={()=>add(kind)}>
            <span className="product-image">{images?.[kind]&&<img src={images[kind]} alt=""/>}</span>
            <span className="product-info"><span><strong>{obj.name}</strong><small>{obj.w} × {obj.d} m · {money(obj.price)}</small></span><b aria-hidden="true">+</b></span>
          </button>;
        })}</div>
      </section>
      {!images&&<CatalogueRenderer ready={setImages}/>}
    </main>}
    <dialog className="share-dialog" ref={shareDialog} aria-labelledby="share-title">
      <form method="dialog"><button className="close-dialog" aria-label="Close share dialog" autoFocus>×</button></form>
      <h2 id="share-title">Share this layout</h2>
      <p>{location.hostname==='127.0.0.1'||location.hostname==='localhost'
        ? 'This local link opens on this Mac while RoomLab is running. Links become shareable across devices when the app is hosted.'
        : 'Anyone with the link can open their own editable copy.'}</p>
      <label htmlFor="share-url">Layout link</label>
      <input id="share-url" ref={shareInput} value={shareUrl} readOnly onFocus={e=>e.currentTarget.select()}/>
      <div className="share-bottom"><button className="primary" onClick={()=>void copyShare()}>Copy link</button><span role="status">{shareStatus}</span></div>
    </dialog>
    <dialog className="share-dialog image-dialog" ref={imageDialog} aria-labelledby="image-title" onClose={()=>setImage(null)}>
      <form method="dialog"><button className="close-dialog" aria-label="Close export preview" autoFocus>×</button></form>
      <h2 id="image-title">Export preview</h2>
      {image&&<><img src={image.url} alt="PNG of the current RoomLab view"/>
        <a className="primary" href={image.url} download={image.name}>Download PNG</a></>}
    </dialog>
    <footer><span>RoomLab / Room studies</span><span>Original furniture shapes · Local workspace</span></footer>
  </>;
}
createRoot(document.getElementById('root')!).render(<App/>);
