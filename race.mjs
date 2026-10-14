import {clamp,randomSource,LIMIT_X,LIMIT_Y} from './rules.mjs?v=canopy-1';
// Endless run: no finish line. Speed climbs every kilometre, then keeps
// creeping up more gently so long runs stay tense without becoming unfair.
export const FINISH_DISTANCE=Infinity, WAVE_LENGTH=800, BOOST_MULTIPLIER=1.8;
export const waveAt=distance=>1+Math.floor(Math.max(0,distance)/WAVE_LENGTH);
export const speedAt=wave=>{const w=Math.max(0,wave-1);return Math.min(118,40+Math.min(10,w)*3.8+Math.max(0,w-10)*1.4);};
// The rendered tunnel and steering forces use the same continuous course.
export const courseCenter=m=>({x:Math.sin(m/115)*46+Math.sin(m/285)*24,y:Math.sin(m/155)*22+Math.sin(m/390)*10});
export const courseSlope=m=>({x:Math.cos(m/115)*46/115+Math.cos(m/285)*24/285,y:Math.cos(m/155)*22/155+Math.cos(m/390)*10/390});
export function driftAt(m,speed,dt){const factor=speed*speed*.14*clamp(dt,0,.05);return {x:clamp((Math.sin(m/115)*46/115**2+Math.sin(m/285)*24/285**2)*factor,-6*dt,6*dt),y:clamp((Math.sin(m/155)*22/155**2+Math.sin(m/390)*10/390**2)*factor,-4*dt,4*dt)};}
// Ships have broad wings but a shallow body. Contacts shove both pilots sideways;
// longitudinal progress is never teleported, and scrapes cost speed rather than lives.
export function resolveVehicleCollisions(player,rivals=[]){const ships=player?[player,...rivals]:rivals,contacts=[];for(let i=0;i<ships.length;i++)for(let j=i+1;j<ships.length;j++){const a=ships[i],b=ships[j],dz=Math.abs(a.distance-b.distance);if(dz>=3.8)continue;const dx=b.x-a.x,dy=b.y-a.y;const overlap=Math.hypot(dx/2.25,dy/.8,dz/3.8);if(overlap>=1)continue;let nx=dx,ny=dy*.65;const length=Math.hypot(nx,ny);if(length<.001){nx=(i+j)%2?1:-1;ny=0;}else{nx/=length;ny/=length;}const push=(1-overlap)*1.2+.025;for(const [ship,sign]of[[a,-1],[b,1]]){const sx=nx*push*sign,sy=ny*push*sign;ship.x=clamp(ship.x+sx,-6.8,6.8);ship.y=clamp(ship.y+sy,-3.6,3.6);if(Number.isFinite(ship.tx))ship.tx=clamp(ship.tx+sx,-6.8,6.8);if(Number.isFinite(ship.ty))ship.ty=clamp(ship.ty+sy,-3.6,3.6);ship.penalty=Math.max(ship.penalty||0,.55);}contacts.push({a,b,impact:1-overlap});}return contacts;}
const NAMES=[];
const COLORS=[0xb99aff,0x59ffe0,0xff91c0,0xffbd68,0x77baff,0xff817d,0xc9ff89];
export class FlightRace {
 constructor(seed=69){this.reset(seed);}
 reset(seed){this.distance=0;this.time=0;this.wave=1;this.finished=false;this.finishTime=undefined;this.penalty=0;this.next=180;this.index=0;this.routeX=0;this.routeY=0;this.random=randomSource(seed);this.rivals=NAMES.map((name,i)=>({name,distance:[12,12,6,6,-6,-6,-12][i],x:i===6?0:i%2?2.5:-2.5,y:0,color:COLORS[i],pace:[1.012,.997,1.005,.99,1.015,.985,1][i],offset:i*3.7,lane:i%2?1:-1}));}
 step(dt,boost=false){if(this.finished)return;dt=clamp(dt,0,.05);this.time+=dt;this.wave=waveAt(this.distance);this.penalty=Math.max(0,this.penalty-dt);const speed=speedAt(this.wave)*(this.speedScale??1)*(boost?BOOST_MULTIPLIER:1)*(this.penalty>0?.78:1);const before=this.distance;this.distance=Math.min(FINISH_DISTANCE,this.distance+dt*speed);
  for(const r of this.rivals){const t=this.time+r.offset;const sprint=t%18>15?1.14:1;const dodge=t%23<1?.87:1;const before=r.distance;r.previousDistance=before;r.penalty=Math.max(0,(r.penalty||0)-dt);const velocity=speedAt(waveAt(r.distance))*r.pace*sprint*dodge*(r.penalty>0?.78:1);r.distance=Math.min(FINISH_DISTANCE,r.distance+dt*velocity);if(r.finishTime===undefined&&r.distance>=FINISH_DISTANCE)r.finishTime=this.time-dt+(FINISH_DISTANCE-before)/velocity;const follow=1-Math.exp(-dt*4);const targetX=r.targetX??r.lane*2.5+Math.sin(t*.65)*.7,targetY=r.targetY??Math.sin(t*.47)*.45;r.x=clamp(r.x+(clamp(targetX,-LIMIT_X,LIMIT_X)-r.x)*follow,-LIMIT_X,LIMIT_X);r.y=clamp(r.y+(clamp(targetY,-LIMIT_Y,LIMIT_Y)-r.y)*follow,-LIMIT_Y,LIMIT_Y);}
  this.finished=this.distance>=FINISH_DISTANCE;if(this.finished)this.finishTime=this.time-dt+(FINISH_DISTANCE-before)/speed;return speed;
 }
 get rank(){return 1+this.rivals.filter(r=>this.finished?r.finishTime!==undefined&&r.finishTime<this.finishTime:r.distance>this.distance).length;}
 upcoming(){const specs=[];while(this.next<this.distance+310){const wave=waveAt(this.next),index=this.index++,kind=['iris','debris','laser','iris','ring','laser','debris','iris','core'][index%9];this.routeX=clamp(this.routeX+(this.random()-.5)*3.4,-3.8,3.8);this.routeY=clamp(this.routeY+(this.random()-.5)*1.6,-2.1,2.1);const cross=kind==='laser'&&wave>=5&&index%2===0;if(cross){this.routeX=(this.routeX<0?-1:1)*3;this.routeY=(this.routeY<0?-1:1)*2.8;}specs.push({kind,cross,index,distance:this.next,wave,stage:Math.min(2,Math.floor((wave-1)/4)),arrival:0,routeX:this.routeX,routeY:this.routeY});this.next+=speedAt(wave)*Math.max(.88,1.42-wave*.045);}return specs;}
}
