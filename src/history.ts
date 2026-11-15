import type { Layout } from './layout.ts';

export type History = { past: Layout[]; current: Layout; future: Layout[]; gesture: 'ready'|'recorded'|null };
type Action = { type: 'edit'|'move'; edit: (layout: Layout) => Layout } |
  { type: 'start'|'end'|'undo'|'redo' };
export const historyOf = (current: Layout): History => ({ past: [], current, future: [], gesture: null });
const append = (list: Layout[], item: Layout) => [...list.slice(-59), item];

export function historyReducer(state: History, action: Action): History {
  switch (action.type) {
    case 'start': return {...state, gesture:'ready'};
    case 'end': return {...state, gesture:null};
    case 'undo': return state.past.length ? {
      past:state.past.slice(0,-1), current:state.past.at(-1)!,
      future:[state.current,...state.future], gesture:null,
    } : state;
    case 'redo': return state.future.length ? {
      past:append(state.past,state.current), current:state.future[0],
      future:state.future.slice(1), gesture:null,
    } : state;
    default: {
      const current=action.edit(state.current);
      if (current===state.current) return state;
      if (action.type==='move' && state.gesture==='recorded') return {...state,current};
      return {past:append(state.past,state.current),current,future:[],
        gesture:action.type==='move' && state.gesture==='ready' ? 'recorded' : null};
    }
  }
}
