// Passive gestures never suppress native scrolling or browser edge navigation.
const PAGES=['#home','#quick','#history','#analysis'];
const BLOCKED='input,textarea,select,button,a,label,summary,[contenteditable],.carousel,.table-wrap,[data-no-swipe],[role="slider"],[role="dialog"]';
export function mountDockSwipe({element,window:win,getRoute,canNavigate,navigate,now=()=>Date.now()}) {
 let start=null;
 const cancel=()=>{start=null;};
 const blocked=target=>target?.closest?.(BLOCKED);
 const eligible=()=>canNavigate()&&PAGES.includes(getRoute());
 const begin=event=>{
  cancel();
  if(event.touches.length!==1||!eligible()||blocked(event.target))return;
  const t=event.touches[0];
  if(t.clientX<=28||t.clientX>=win.innerWidth-28)return;
  start={id:t.identifier,x:t.clientX,y:t.clientY,route:getRoute(),at:now(),scrollY:win.scrollY};
 };
 const move=event=>{
  if(!start)return;
  const t=event.touches[0];
  if(event.touches.length!==1||t.identifier!==start.id||Math.abs(t.clientY-start.y)>24||win.scrollY!==start.scrollY)cancel();
 };
 const end=event=>{
  const from=start;cancel();
  if(!from||event.touches.length||event.changedTouches.length!==1||!eligible()||getRoute()!==from.route)return;
  const t=event.changedTouches[0],dx=t.clientX-from.x,dy=t.clientY-from.y;
  if(t.identifier!==from.id||win.scrollY!==from.scrollY||Math.abs(dy)>24||Math.abs(dx)<85||Math.abs(dx)<Math.abs(dy)*1.6||now()-from.at>900)return;
  const next=PAGES.indexOf(from.route)+(dx<0?1:-1);
  if(PAGES[next])navigate(PAGES[next]);
 };
 const listeners={touchstart:begin,touchmove:move,touchend:end,touchcancel:cancel};
 for(const [name,fn] of Object.entries(listeners))element.addEventListener(name,fn,{passive:true});
 return ()=>{for(const [name,fn] of Object.entries(listeners))element.removeEventListener(name,fn);};
}
