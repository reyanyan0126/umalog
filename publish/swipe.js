// Shared, testable touch gesture classifier. No navigation or storage side effects.
export function swipeDirection(dx,dy,duration,{minimum=75,ratio=1.8,maximumDuration=1200}={}){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||!Number.isFinite(duration))return 0;
 if(duration<0||duration>maximumDuration||Math.abs(dx)<minimum||Math.abs(dx)<Math.abs(dy)*ratio)return 0;
 return dx<0?1:-1;
}
