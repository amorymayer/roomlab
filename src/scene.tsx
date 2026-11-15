import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { CatmullRomCurve3, GridHelper, OrthographicCamera, PerspectiveCamera, Plane, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { catalogue, type Piece, type Layout, type Kind, snap } from './layout.ts';
import { palettes, type PaletteId } from './materials.ts';
type V = [number, number, number];
const floor = new Plane(new Vector3(0,1,0),0);
const point = (e: ThreeEvent<PointerEvent>) => e.ray.intersectPlane(floor,new Vector3());
function Box({size, at, color, metal=0, glow=0, shadow=true}: {size: V; at: V; color: string; metal?:number; glow?:number;shadow?:boolean}) {
  return <mesh position={at} castShadow={shadow} receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={metal ? .33 : .82} metalness={metal} emissive={color} emissiveIntensity={glow}/></mesh>;
}
function SoftBox({size, at, color, radius=.04}: {size:V; at:V; color:string; radius?:number}) {
  const [w,h,d]=size;
  const geometry=useMemo(()=>new RoundedBoxGeometry(w,h,d,3,radius),[w,h,d,radius]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} position={at} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.8}/></mesh>;
}
function Tube({points,color}: {points:V[];color:string}) {
  const curve=useMemo(()=>new CatmullRomCurve3(points.map(p=>new Vector3(...p))),[points]);
  return <mesh castShadow><tubeGeometry args={[curve,28,.017,8,false]}/><meshStandardMaterial color={color} roughness={.27} metalness={.48}/></mesh>;
}
export function Furniture({kind, color, evening}: {kind:Kind; color:string; evening:boolean}) {
  const {w,d,h} = catalogue[kind];
  if (kind === 'lamp') return <>
    <mesh position={[0,.025,0]} castShadow><cylinderGeometry args={[.14,.17,.05,24]}/><meshStandardMaterial color="#a3a6a3" metalness={.6} roughness={.34}/></mesh>
    <mesh position={[0,.64,0]} castShadow><cylinderGeometry args={[.016,.016,1.25,12]}/><meshStandardMaterial color="#969793" metalness={.6} roughness={.34}/></mesh>
    <mesh position={[0,1.26,0]} castShadow><sphereGeometry args={[.19,32,16,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={evening?.75:.1}/></mesh>
    {evening&&<pointLight position={[0,1.24,.04]} intensity={12} distance={3.7} color="#ff9943"/>}
  </>;
  if (kind === 'desk' || kind === 'table') {
    const leg = kind==='desk' ? .69 : .32;
    return <>
      {[-1,1].flatMap(a=>[-1,1].map(b=><Box key={a+':'+b} size={[.035,leg,.035]} at={[a*(w/2-.06),leg/2,b*(d/2-.06)]} color="#b2b7b5" metal={.62}/>))}
      {[-1,1].map(a=><Box key={a} size={[w-.09,.026,.026]} at={[0,.07,a*(d/2-.06)]} color="#b2b7b5" metal={.62}/>)}
      <Box size={[w,h-leg,d]} at={[0,(leg+h)/2,0]} color={color} metal={kind==='desk'?.6:.2}/>
    </>;
  }
  if (kind === 'chair') return <>
    {[-.36,.36].map(x=><Tube key={x} color="#c8cecc" points={[[x,.06,.3],[x,.055,-.29],[x,.12,-.36],[x,.42,-.35],[x,.52,.28],[x,.44,.36],[x,.105,.36],[x,.06,.3]]}/>)}
    <group position={[0,.46,.015]} rotation={[.13,0,0]}><SoftBox size={[.68,.09,.63]} at={[0,0,0]} color={color} radius={.04}/></group>
    <group position={[0,.635,-.27]} rotation={[.27,0,0]}><SoftBox size={[.68,.36,.095]} at={[0,0,0]} color={color} radius={.045}/></group>
  </>;
  const seating = kind === 'sofa';
  const legHeight = seating ? .15 : .16;
  return <>
    {[-1,1].flatMap(a => [-1,1].map(b => <Box key={a+':'+b} size={[.065,legHeight,.065]} at={[a*(w/2-.1),legHeight/2,b*(d/2-.08)]} color="#604b38"/>))}
    {seating ? <>
      <SoftBox size={[w,.25,d]} at={[0,.275,0]} color={color}/>
      <SoftBox size={[w,.43,.17]} at={[0,h-.215,-d/2+.085]} color={color}/>
      {[-1,1].map(s => <SoftBox key={s} size={[.15,.23,d-.1]} at={[s*(w/2-.075),.51,.025]} color={color}/>)}
      {Array.from({length:3}, (_,i) => {
        const count = 3, width=(w-.33)/count;
        return <SoftBox key={i} size={[width-.015,.13,d-.23]} at={[(i-(count-1)/2)*width,.45,.045]} color={color}/>;
      })}
    </> : <Box size={[w,h-legHeight,d]} at={[0,(h+legHeight)/2,0]} color={color}/>}
    {kind === 'shelf' && <>
      {Array.from({length:19},(_,i)=><Box key={i} size={[.022,.36,.018]} at={[(i-9)*.075,.373,d/2+.004]} color={i%2?'#81563b':'#714831'}/>)}
      <Box size={[.44,.045,.27]} at={[-.33,h+.023,0]} color="#ac5833"/>
      <mesh position={[-.35,h+.05,0]}><cylinderGeometry args={[.111,.111,.011,32]}/><meshStandardMaterial color="#232320"/></mesh>
      <mesh position={[-.35,h+.056,0]}><cylinderGeometry args={[.033,.033,.003,24]}/><meshStandardMaterial color="#d79845"/></mesh>
      <Box size={[.22,.027,.16]} at={[.37,h+.014,0]} color="#e1ceb1"/>
      <Box size={[.19,.027,.14]} at={[.36,h+.04,0]} color="#797451"/>
    </>}

  </>;
}
export type ViewMode = '3d'|'plan'|'inside';
function View({mode,w,d,angle}: {mode:ViewMode;w:number;d:number;angle:number}) {
  const {camera:initial,size,set,invalidate,gl}=useThree();
  const outside=useRef(initial as OrthographicCamera);
  const inside=useMemo(()=>new PerspectiveCamera(59,1,.06,60),[]);
  useLayoutEffect(()=>{
    const ratio=size.width/Math.max(1,size.height);
    if(mode==='inside'){
      inside.aspect=ratio;
      inside.fov=ratio<.95?72:57;
      inside.position.set(angle===0?w*.32:-w*.33,1.58,d*.47);
      inside.lookAt(angle===0?-w*.14:w*.17,.97,-d*.43);
      inside.updateProjectionMatrix(); set({camera:inside});
    } else {
      const c=outside.current, plan=mode==='plan';
      c.up.set(0,plan?0:1,plan?-1:0);
      c.position.set(plan?0:8,plan?12:8,plan?0:10);
      c.lookAt(0,plan?0:.62,0);
      const extent=plan?Math.max(d+1,w/Math.max(.1,ratio)+1):Math.max(w,d,3)*1.08*Math.max(1,.95/Math.max(.1,ratio))+1.8;
      c.zoom=size.height/extent;c.updateProjectionMatrix();set({camera:c});
    }
    invalidate();
  },[size,mode,w,d,angle,inside,set,invalidate]);
  useEffect(()=>{
    if(mode!=='inside')return;
    const surface=gl.domElement;
    inside.rotation.reorder('YXZ');
    const yaw=inside.rotation.y,pitch=inside.rotation.x;
    let active:number|null=null, prevX=0,prevY=0;
    function down(e:PointerEvent){
      if(e.button!==0||!e.isPrimary)return;
      active=e.pointerId;prevX=e.clientX;prevY=e.clientY;
      surface.setPointerCapture(e.pointerId);
    }
    function move(e:PointerEvent){
      if(e.pointerId!==active)return;
      inside.rotation.y=Math.max(yaw-1.2,Math.min(yaw+1.2,inside.rotation.y-(e.clientX-prevX)*.004));
      inside.rotation.x=Math.max(pitch-.52,Math.min(pitch+.58,inside.rotation.x-(e.clientY-prevY)*.004));
      prevX=e.clientX;prevY=e.clientY;invalidate();
    }
    function end(e:PointerEvent){if(e.pointerId===active)active=null;}
    surface.addEventListener('pointerdown',down);
    surface.addEventListener('pointermove',move);
    surface.addEventListener('lostpointercapture',end);
    return ()=>{
      surface.removeEventListener('pointerdown',down);
      surface.removeEventListener('pointermove',move);
      surface.removeEventListener('lostpointercapture',end);
    };
  },[mode,angle,w,d,size,inside,gl,invalidate]);
  return null;
}
function LoftShell({w,d,plan,evening,palette}:{w:number;d:number;plan:boolean;evening:boolean;palette:PaletteId}) {
  const material=palettes[palette];
  const rail=-d/2-.07, win=w*.72, x=w*.045, width=(w-win)/2;
  const rugW=Math.min(w*.72,3.15), rugD=Math.min(d*.49,1.85);
  return <>
    <Box size={[rugW,.004,rugD]} at={[0,.005,0]} color={material.rug}/>
    {Array.from({length:9},(_,i)=><Box key={i} size={[rugW*(i%3?.91:.84),.002,.019]} at={[0,.008,(i-4)*rugD/11]} color={i%3?material.stripe:'#51433b'}/>)}
    {plan ? <>
      <Box size={[w+.12,.075,.14]} at={[0,.037,rail]} color="#4b4741"/>
      <Box size={[.14,.075,d]} at={[-w/2-.07,.037,0]} color="#4b4741"/>
    </> : <>
      <Box size={[.14,2.55,d+.14]} at={[-w/2-.07,1.275,0]} color={material.wall}/>
      <Box size={[w,.55,.14]} at={[0,.275,rail]} color={material.windowWall}/>
      <Box size={[w,.22,.14]} at={[0,2.44,rail]} color={material.windowWall}/>
      <Box size={[width+x,1.78,.14]} at={[-w/2+(width+x)/2,1.44,rail]} color={material.windowWall}/>
      <Box size={[width-x,1.78,.14]} at={[w/2-(width-x)/2,1.44,rail]} color={material.windowWall}/>
      <Box size={[win,1.78,.034]} at={[x,1.44,rail-.04]} color={evening?'#23374c':'#a9c6d4'} glow={evening?.33:.4}/>
      {Array.from({length:9},(_,i)=>{
        const h=.18+(i*7%11)*.068, bx=x-win*.45+i*win*.099;
        return <group key={i}><Box size={[win*.076,h,.016]} at={[bx,.57+h/2,rail-.015]} color={evening?'#151b24':'#76929f'}/>
        {evening&&[0,1,2].filter(j=>.63+j*.14<.55+h).map(j=><Box key={j} size={[.026,.023,.008]} at={[bx,.63+j*.14,rail]} color="#ead0a3" glow={.7}/>)}</group>;
      })}
      {Array.from({length:6},(_,i)=><Box key={i} size={[.04,1.82,.065]} at={[x+win*(i/5-.5),1.44,rail+.017]} color="#242523"/>)}
      {[.55,1.14,1.73,2.32].map(y=><Box key={y} size={[win+.04,.035,.065]} at={[x,y,rail+.017]} color="#242523"/>)}
      {[[-.68,1.62,.46,.68,'#a45c41'],[.05,1.72,.57,.77,'#483e33'],[.72,1.43,.43,.56,'#666a4b']].map(([z,y,bw,bh,c],i)=><group key={i} position={[-w/2+.025,+y,+z]}>
        <Box size={[.035,+bh,+bw]} at={[0,0,0]} color="#503c32"/>
        <Box size={[.008,+bh-.055,+bw-.055]} at={[.021,0,0]} color="#e4d7bc"/>
        <mesh position={[.027,.025,.02]} rotation={[0,Math.PI/2,0]}><circleGeometry args={[+bw*.27,i===0?38: i===1?4:7]}/><meshStandardMaterial color={String(c)}/></mesh>
      </group>)}
      {evening&&<pointLight position={[-w*.34,1.9,-d*.34]} color="#fd7b37" intensity={15} distance={4.6}/>}
    </>}
  </>;
}
const grid = new GridHelper(24,48,'#536568','#384447');
function Capture({target}: {target:RefObject<(() => Promise<Blob>)|null>}) {
  const {gl,scene,camera}=useThree();
  useEffect(()=>{
    target.current=()=>new Promise((resolve,reject)=>{
      gl.render(scene,camera);
      gl.domElement.toBlob(blob=>blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png');
    });
    return ()=>{target.current=null;};
  },[gl,scene,camera,target]);
  return null;
}
interface Props {capture:RefObject<(() => Promise<Blob>)|null>; onDragStart:()=>void; onDragEnd:()=>void;evening:boolean;cloud:number;layout:Layout; entry:number; mode:ViewMode; angle:number; selected:string|null; errors:Map<string,Set<string>>; select:(id:string|null)=>void; move:(id:string,x:number,z:number)=>void}
export function Scene({layout,entry,mode,angle,evening,cloud,selected,errors,select,move,capture,onDragStart,onDragEnd}:Props) {
  const plan=mode==='plan', palette=layout.palette??'loft', material=palettes[palette];
  const drag = useRef<{id:string; x:number;z:number}|null>(null);
  const down = (e:ThreeEvent<PointerEvent>,p:Piece) => {
    if(e.button!==0||mode==='inside') return;
    e.stopPropagation(); select(p.id); const hit=point(e); if(!hit) return;
    drag.current={id:p.id,x:p.x-hit.x,z:p.z-hit.z}; onDragStart();
    (e.target as unknown as HTMLElement).setPointerCapture(e.pointerId);
  };
  return <Canvas orthographic shadows dpr={[1,1.75]} frameloop="demand" onPointerMissed={()=>select(null)} fallback={<p className="no-3d">WebGL is unavailable in this browser. You can still edit your layout through the controls.</p>}>
    <Capture target={capture}/>
    <View mode={mode} angle={angle} w={layout.w} d={layout.d}/>
    <color attach="background" args={[plan?'#293538':evening?'#13191c':'#3a484b']}/>
    <ambientLight intensity={plan?2.4:evening?1.14:2.15+cloud*.004}/>
    <directionalLight color={evening&&!plan?'#ffca96':'#fff1de'} position={evening?[3,8,4]:[1,6,-4]} intensity={evening&&!plan?1.48:2.6-cloud*.017} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-normalBias={.025}/>
    {plan && <primitive object={grid} position={[0,-.16,0]}/>}
    <Box size={[24,.08,24]} at={[0,-.21,0]} color={plan?'#233134':evening?'#1b2226':'#344347'}/>
    <Box size={[layout.w,.15,layout.d]} at={[0,-.075,0]} color={material.floor}/>
    {Array.from({length:Math.floor(layout.d/.19)},(_,i)=>
      <Box key={i} size={[layout.w,.001,.007]} at={[0,.002,-layout.d/2+(i+1)*.19]} color={i%3?material.floorLine:material.floor}/>)}
    {!plan && <group position={[-layout.w*.34,2.05,-layout.d*.28]}>
      <mesh castShadow><sphereGeometry args={[.30,32,20]}/><meshStandardMaterial color="#e2b37e" emissive="#ef9246" emissiveIntensity={evening?.46:.02}/></mesh>
      {Array.from({length:9},(_,i)=>{
        const y=(i-4)*.055, r=Math.sqrt(.3**2-y**2);
        return <mesh key={i} position={[0,y,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[r,.006,6,32]}/><meshStandardMaterial color="#b78353" emissive="#ff9b46" emissiveIntensity={evening?.18:0}/></mesh>;
      })}
      <Box size={[.011,.24,.011]} at={[0,.41,0]} color="#302824"/>
    </group>}
    {mode==='inside'&&<>
      <Box size={[layout.w+.28,.12,layout.d+.28]} at={[0,2.59,0]} color={material.wall} shadow={false}/>
      <Box size={[.14,2.55,layout.d+.14]} at={[layout.w/2+.07,1.275,0]} color={material.windowWall} shadow={false}/>
      <Box size={[layout.w+.28,2.55,.14]} at={[0,1.275,layout.d/2+.07]} color={material.wall} shadow={false}/>
      {[-.31,0,.31].map(x=><Box key={x} size={[.105,.12,layout.d]} at={[layout.w*x,2.49,0]} color={material.floorLine} shadow={false}/>)}
    </>}
    <Box size={[1.10,.009,.045]} at={[entry,.006,layout.d/2-.025]} color="#d5ad7d" shadow={false}/>
    <LoftShell palette={palette} w={layout.w} d={layout.d} plan={plan} evening={evening}/>
    {layout.items.map(p => {
      const obj=catalogue[p.kind], invalid=errors.has(p.id);
      return <group key={p.id} position={[p.x,.01,p.z]} rotation={[0,p.turn*Math.PI/2,0]}
        onClick={e=>{if(mode==='inside'&&e.delta<5){e.stopPropagation();select(p.id);}}}
        onPointerDown={e=>down(e,p)} onPointerMove={e=>{
          const held=drag.current; if(held?.id!==p.id) return; e.stopPropagation();
          const hit=point(e); if(hit) move(p.id,Math.max(-10,Math.min(10,snap(hit.x+held.x))),Math.max(-10,Math.min(10,snap(hit.z+held.z))));
        }} onPointerUp={e=>{ if(drag.current?.id===p.id) { drag.current=null; onDragEnd(); (e.target as unknown as HTMLElement).releasePointerCapture(e.pointerId); } }}
        onPointerCancel={()=>{if(drag.current){drag.current=null;onDragEnd();}}} onLostPointerCapture={()=>{if(drag.current){drag.current=null;onDragEnd();}}}>
        {(invalid||selected===p.id) && <Box size={[obj.w+.09,.012,obj.d+.09]} at={[0,0,0]} color={invalid?'#e57d68':'#9eba85'}/>}
        <Furniture kind={p.kind} color={p.color??(p.kind==='sofa'||p.kind==='chair'?material[p.kind]:obj.color)} evening={evening&&!plan}/>
      </group>;
    })}
  </Canvas>;
}
