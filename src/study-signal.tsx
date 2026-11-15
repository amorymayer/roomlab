import { useEffect, useRef } from 'react';

type Point = [number, number, number];
type State = 'idle' | 'searching' | 'ready' | 'error';
const count = 72;
const corner = 0.67;
const edges: [Point, Point][] = [];
for (const a of [-corner, corner]) {
  for (const b of [-corner, corner]) {
    edges.push([[-corner,a,b],[corner,a,b]], [[a,-corner,b],[a,corner,b]], [[a,b,-corner],[a,b,corner]]);
  }
}
const mix = (a:number,b:number,t:number) => a+(b-a)*t;
const shapes = {
  idle: Array.from({length:count}, (_,i):Point => {
    const [a,b]=edges[i%edges.length];
    const t=Math.floor(i/edges.length)/5;
    return [mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
  }),
  searching: Array.from({length:count}, (_,i):Point => {
    const latitude=(Math.floor(i/12)-2.5)*.46, theta=(i%12)*Math.PI/6;
    return [Math.cos(theta)*Math.cos(latitude),Math.sin(latitude),Math.sin(theta)*Math.cos(latitude)];
  }),
  ready: Array.from({length:count}, (_,i):Point => {
    const t=Math.floor(i/3)/23, first=t<.38, part=first?t/.38:(t-.38)/.62;
    const x=first?mix(-.83,-.25,part):mix(-.25,.86,part);
    const y=first?mix(-.04,.57,part):mix(.57,-.61,part);
    return [x,y+(i%3-1)*.095,0];
  }),
  error: Array.from({length:count}, (_,i):Point => {
    if(i>=60)return [(i%3-1)*.075,.37+Math.floor((i-60)/3)*.075,0];
    return [(i%3-1)*.075,mix(-.7,.11,Math.floor(i/3)/19),0];
  }),
};

export function StudySignal({state}: {state:State}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const target=useRef(state);
  const drawNow=useRef<(() => void)|undefined>(undefined);
  useEffect(()=>{
    target.current=state;
    drawNow.current?.();
  },[state]);

  useEffect(()=>{
    const element=canvas.current;
    const ctx=element?.getContext('2d');
    if(!element||!ctx)return;
    const context=ctx;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let visible=true, frame=0, last=0, spin=.42, tilt=.26;
    const position=shapes[target.current].map(([x,y,z]):Point=>[x,y,z]);
    function draw(now:number, snap=false) {
      const dt=Math.min(55,now-last||16);
      last=now;
      const mode=target.current;
      const color=mode==='error'?'255,172,153':'203,230,178';
      const angle=mode==='idle'?.5:0;
      const amount=snap?1:1-Math.exp(-dt/75);
      spin=mode==='searching'&&!snap?spin+dt*.0028:mix(spin,angle,amount);
      tilt=mix(tilt,mode==='idle'?.28:mode==='searching'?.39:0,amount);
      const c=Math.cos(spin),s=Math.sin(spin),ct=Math.cos(tilt),st=Math.sin(tilt);
      context.clearRect(0,0,128,128);
      for(const [i,p] of position.entries()){
        const [x,y,z]=shapes[mode][i];
        p[0]=mix(p[0],x,amount);p[1]=mix(p[1],y,amount);p[2]=mix(p[2],z,amount);
        const rx=p[0]*c-p[2]*s, rz=p[0]*s+p[2]*c;
        const ry=p[1]*ct-rz*st, depth=p[1]*st+rz*ct;
        const scale=1+depth*.17;
        context.fillStyle='rgba('+color+','+Math.max(.25,.79+depth*.22)+')';
        context.beginPath();
        context.arc(64+rx*42*scale,64+ry*42*scale,2.45*scale,0,Math.PI*2);
        context.fill();
      }
    }
    function tick(now:number) {
      frame=0;
      if(now-last>=30) draw(now);
      if(visible&&!document.hidden&&!reduced.matches&&(target.current==='searching'||now<settleUntil)) frame=requestAnimationFrame(tick);
    }
    let settleUntil=0;
    function wake() {
      if(frame)cancelAnimationFrame(frame);
      frame=0;
      if(reduced.matches){draw(performance.now(),true);return;}
      if(visible&&!document.hidden){
        settleUntil=performance.now()+450;
        frame=requestAnimationFrame(tick);
      }
    }
    draw(performance.now(),true);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;wake();});
    observer.observe(element);
    drawNow.current=wake;
    reduced.addEventListener('change',wake);
    document.addEventListener('visibilitychange',wake);
    return ()=>{
      cancelAnimationFrame(frame);
      observer.disconnect();
      reduced.removeEventListener('change',wake);
      document.removeEventListener('visibilitychange',wake);
      drawNow.current=undefined;
    };
  },[]);
  return <canvas className="signal" ref={canvas} width={128} height={128} data-state={state} aria-hidden="true"/>;
}
