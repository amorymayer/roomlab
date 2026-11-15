import { flushSync } from 'react-dom';

type Surface = 'page' | 'stage' | 'desk';
let active: ViewTransition | undefined;

export function glide(surface: Surface, update: () => void) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }
  if (!document.startViewTransition) {
    flushSync(update);
    const element = document.querySelector({page:'main', stage:'.stage', desk:'.studio-desk'}[surface]);
    element?.animate(
      [{opacity:.45, transform:surface==='page'?'translateY(7px)':'none'}, {opacity:1, transform:'none'}],
      {duration:200, easing:'cubic-bezier(.32, .72, 0, 1)'},
    );
    return;
  }
  active?.skipTransition();
  const root = document.documentElement;
  root.dataset.glide = surface;
  const transition = document.startViewTransition(() => flushSync(update));
  active = transition;
  const clear = () => {
    if (active !== transition) return;
    delete root.dataset.glide;
    active = undefined;
  };
  void transition.finished.then(clear, clear);
}
