import type { ReactNode } from 'react';
export function Icon({name}: {name:'undo'|'redo'|'camera'|'link'}) {
  const paths: Record<typeof name, ReactNode> = {
    undo:<><path d="M8 5 3 10l5 5"/><path d="M3 10h11a5 5 0 0 1 0 10h-3"/></>,
    redo:<><path d="m16 5 5 5-5 5"/><path d="M21 10H10a5 5 0 0 0 0 10h3"/></>,
    camera:<><path d="M4 7h4l2-2h4l2 2h4a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3"/></>,
    link:<><path d="M10 13a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.6 1.6"/><path d="M14 11a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
