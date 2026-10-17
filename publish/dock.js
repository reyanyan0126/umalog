// The nav remains mounted across renders. Call only after route acceptance.
export function createDock(nav){
 const links=[...nav.querySelectorAll('a')],indicator=document.createElement('span');
 indicator.className='dock-indicator';indicator.setAttribute('aria-hidden','true');nav.prepend(indicator);
 let current='home',ready=false;
 function position(){const a=links.find(a=>a.hash==='#'+current);if(!a)return;indicator.style.width=a.offsetWidth+'px';indicator.style.transform=`translateX(${a.offsetLeft}px)`;indicator.style.height=a.offsetHeight+'px';indicator.style.top=a.offsetTop+'px';}
 window.addEventListener('resize',position);if(typeof ResizeObserver!=='undefined')new ResizeObserver(position).observe(nav);document.fonts?.ready.then(position);
 return route=>{
  if(route!=='settings')current=route==='entry-date'?'entry':['detail','edit'].includes(route)?'history':links.some(a=>a.hash==='#'+route)?route:'home';
  links.forEach(a=>{if(a.hash==='#'+current)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  position();if(!ready){ready=true;requestAnimationFrame(()=>requestAnimationFrame(()=>nav.classList.add('dock-ready')));}
 };
}
