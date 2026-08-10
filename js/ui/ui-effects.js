"use strict";
/* ================= FX CANVAS ================= */
const cv=$('#fx'), ctx=cv.getContext('2d');
let stars=[],parts=[];
function sizeFX(){ cv.width=innerWidth; cv.height=innerHeight;
  stars=Array.from({length:150},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height*.7,r:Math.random()*1.3+.3,p:Math.random()*Math.PI*2,s:.5+Math.random()*1.5}));
}
addEventListener('resize',sizeFX); sizeFX();
function ensureParts(){
  const want=state.fx==='rain'?130:state.fx==='heavy'?230:state.fx==='snow'?90:0;
  while(parts.length<want)parts.push(state.fx==='snow'
    ?{x:Math.random()*cv.width,y:Math.random()*cv.height,r:1+Math.random()*2.4,v:.4+Math.random()*.9,p:Math.random()*7}
    :{x:Math.random()*cv.width,y:Math.random()*cv.height,l:9+Math.random()*14,v:11+Math.random()*9});
  parts.length=want;
}
function loop(t){
  requestAnimationFrame(loop);
  ctx.clearRect(0,0,cv.width,cv.height);
  if(state.fx==='stars'){
    const dt=t/1000;
    for(const s of stars){ ctx.globalAlpha=.35+.55*Math.abs(Math.sin(s.p+dt*s.s)); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,7); ctx.fill(); }
    ctx.globalAlpha=1;
  } else if(state.fx==='rain'||state.fx==='heavy'){
    ensureParts();
    ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--pc').trim()||'rgba(200,230,255,.45)';
    ctx.lineWidth=1.4; ctx.lineCap='round'; ctx.beginPath();
    for(const p of parts){
      ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-3,p.y+p.l);
      p.y+=p.v; p.x-=.7;
      if(p.y>cv.height+20){ p.y=-20; p.x=Math.random()*(cv.width+80); }
    }
    ctx.stroke();
  } else if(state.fx==='snow'){
    ensureParts();
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--pc').trim()||'rgba(255,255,255,.85)';
    for(const p of parts){
      ctx.beginPath(); ctx.arc(p.x+Math.sin(t/900+p.p)*14,p.y,p.r,0,7); ctx.fill();
      p.y+=p.v; if(p.y>cv.height+6){ p.y=-8; p.x=Math.random()*cv.width; }
    }
  }
}
requestAnimationFrame(loop);

/* ================= REVEAL & DIVERS ================= */
$$('section.reveal').forEach(s=>new IntersectionObserver((es,ob)=>{ if(es[0].isIntersecting){ s.classList.add('in'); ob.disconnect(); } },{threshold:.1}).observe(s));

function tween(el,to){
  const from=parseFloat(el.dataset.v); const start=performance.now();
  if(isNaN(from)){ el.textContent=to; el.dataset.v=to; return; }
  const dur=700;
  (function step(now){
    const k=Math.min(1,(now-start)/dur), e=1-Math.pow(1-k,3);
    el.textContent=Math.round(from+(to-from)*e);
    if(k<1)requestAnimationFrame(step); else el.dataset.v=to;
  })(start);
}
let toastT=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),3600); }

