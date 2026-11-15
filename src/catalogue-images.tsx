import { useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera } from 'three';
import { Furniture } from './scene.tsx';
import { catalogue,type Kind } from './layout.ts';

export const kinds=Object.keys(catalogue) as Kind[];
export type CatalogueImages=Partial<Record<Kind,string>>;

function Frames({ready}:{ready:(images:CatalogueImages)=>void}) {
  const {scene,gl}=useThree();
  useEffect(()=>{
    // One renderer for the entire collection. The browser paints static WebP thumbnails afterwards.
    const frame=requestAnimationFrame(()=>{
      const images:CatalogueImages={};
      const camera=new OrthographicCamera(-1,1,1,-1,.1,30);
      for(const [i,kind] of kinds.entries()){
        const {w,h,d}=catalogue[kind];
        const framing=Math.max(w*.63,d*.85,h*.78,.55);
        camera.left=-framing*1.4;camera.right=framing*1.4;camera.top=framing;camera.bottom=-framing;
        camera.position.set(i*8+(kind==='chair'?2.5:2.7),h*.47+1.5,3.5);
        camera.lookAt(i*8,h*.46,0);camera.updateProjectionMatrix();
        gl.render(scene,camera);images[kind]=gl.domElement.toDataURL('image/webp',.88);
      }
      ready(images);
    });
    return ()=>cancelAnimationFrame(frame);
  },[gl,scene,ready]);
  return null;
}

export function CatalogueRenderer({ready}:{ready:(images:CatalogueImages)=>void}) {
  return <div className="catalogue-renderer" aria-hidden="true">
    <Canvas frameloop="never" dpr={1.5} fallback={<span/>}>
      <color attach="background" args={['#293235']}/>
      <ambientLight intensity={2.15}/>
      <directionalLight position={[2,5,3]} intensity={2.5} color="#ffe8d0"/>
      <directionalLight position={[-3,2,2]} intensity={1} color="#d1dfff"/>
      {kinds.map((kind,i)=><group key={kind} position={[i*8,0,0]}>
        <Furniture kind={kind} color={catalogue[kind].color} evening={false}/>
      </group>)}
      <Frames ready={ready}/>
    </Canvas>
  </div>;
}
