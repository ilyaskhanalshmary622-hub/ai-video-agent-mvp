/* Original site-native build choreography. Not the Swarm Rebuild extension. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const homePage = !!document.querySelector('.hero');
  const resumePage = !!document.querySelector('.resume');
  if (resumePage) return;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs) => { const e = document.createElementNS(svgNS, tag); Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v))); return e; };
  let dispose = null;
  function runBuild(manual = false) {
    if (reduced.matches || !homePage || !window.anime?.createTimeline) return;
    if (dispose) dispose();
    const initialFocus = document.activeElement;
    if (manual) scrollTo({top:0,behavior:'instant'});
    const selectors = ['header .logo','header nav','.hero .eyebrow','.hero h1','.hero .intro','.hero .actions','.hero-art','.hero-foot'];
    const nodes = selectors.map(s=>document.querySelector(s)).filter(e=>e && e.getBoundingClientRect().top<innerHeight-35 && e.getBoundingClientRect().bottom>0);
    const measured = nodes.map(el=>({el,rect:el.getBoundingClientRect(),style:el.getAttribute('style')}));
    const overlay = document.createElement('div'); overlay.className='build-layer'; overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<div class="build-grid"></div>';
    const lines=svg('svg',{class:'build-lines',viewBox:`0 0 ${innerWidth} ${innerHeight}`}); overlay.append(lines);
    const workers=Array.from({length:innerWidth<700?2:3},(_,i)=>{
      const el=document.createElement('div'); el.className='build-worker'; el.style.color=['#426aff','#16a3b5','#7c82a1'][i];
      el.innerHTML=`<svg viewBox="0 0 24 30"><path d="M2 1L3 23L9 17L15 29L20 26L14 15L24 14Z"/></svg><span><b>${['LAYOUT','TYPE','MOTION'][i]}</b></span>`;
      overlay.append(el);return el;
    });
    const status=document.createElement('div');status.className='build-status';status.setAttribute('role','status');status.innerHTML='<div class="build-progress"><i></i></div><small>正在构建创意空间</small><button type="button">跳过开场 ↗</button>';
    // Keep the status controls accessible while the decorative layer is ignored.
    const controls=document.createElement('div'); controls.append(status); overlay.append(controls); overlay.removeAttribute('aria-hidden');lines.setAttribute('aria-hidden','true'); workers.forEach(w=>w.setAttribute('aria-hidden','true'));
    document.body.append(overlay);
    const activeVideos=[...document.querySelectorAll('video')].filter(v=>!v.paused);activeVideos.forEach(v=>v.pause());
    let ended=false,timer,previousScroll=scrollY;
    let timeline;
    const stop=()=>{
      if(ended)return; ended=true; clearTimeout(timer); timeline?.cancel();
      measured.forEach(({el,style})=>{if(style===null)el.removeAttribute('style');else el.setAttribute('style',style)});
      overlay.remove();window.removeEventListener('keydown',onKey);window.removeEventListener('resize',stop);window.removeEventListener('scroll',onScroll); reduced.removeEventListener('change',stop);
      if(document.visibilityState==='visible')activeVideos.forEach(v=>v.play().catch(()=>{}));
      if(manual && initialFocus?.isConnected)initialFocus.focus({preventScroll:true});
      if(dispose===stop)dispose=null;
    };
    const onKey=e=>{if(e.key==='Escape'||e.key==='Tab'){stop()}};
    const onScroll=()=>{if(Math.abs(scrollY-previousScroll)>45)stop()};
    dispose=stop;status.querySelector('button').onclick=stop;window.addEventListener('keydown',onKey);window.addEventListener('resize',stop);window.addEventListener('scroll',onScroll,{passive:true});reduced.addEventListener('change',stop);
    timer=setTimeout(stop,4600);
    try{
      timeline=anime.createTimeline({defaults:{ease:'outCubic'},onComplete:stop});
      measured.forEach(({el,rect:r},i)=>{
        const outline=svg('rect',{class:'build-outline',x:r.x-5,y:r.y-5,width:r.width+10,height:r.height+10,rx:3,pathLength:1});
        const group=svg('g',{});group.append(outline);
        for(const [x,y]of[[r.x-5,r.y-5],[r.right+5,r.bottom+5]])group.append(svg('rect',{class:'build-handle',x:x-2.5,y:y-2.5,width:5,height:5}));
        const guide=svg('line',{class:'build-guide',x1:0,y1:r.y-5,x2:innerWidth,y2:r.y-5});group.append(guide);lines.append(group);group.style.opacity='0';
        el.style.opacity='0';el.style.clipPath='inset(0 100% 0 0)';
        const at=160+i*340;const worker=workers[i%workers.length];
        timeline.add(worker,{opacity:1,x:r.x-8,y:r.y-10,duration:310},at);
        timeline.add(group,{opacity:[0,1],duration:120},at+80);
        timeline.add(outline,{strokeDashoffset:[1,0],duration:450},at+130);
        timeline.add(worker,{x:Math.min(innerWidth-90,r.right-8),y:r.bottom-8,duration:470,ease:'inOutCubic'},at+320);
        timeline.add(el,{opacity:[0,1],clipPath:['inset(0 100% 0 0)','inset(0 0% 0 0)'],duration:650,ease:'outQuart'},at+390);
        timeline.add(group,{opacity:0,duration:350},at+1080);
      });
      timeline.add(status.querySelector('i'),{scaleX:[0,1],duration:3400,ease:'linear'},0);
      timeline.add(workers,{opacity:0,duration:260},3400);
      timeline.add(overlay,{opacity:0,duration:350},3700);
    }catch(error){stop();console.warn('Build intro unavailable; showing the page.',error)}
  }
  if(homePage)runBuild();
  // Refreshing or leaving a tab never leaves a build overlay above the real page.
  document.addEventListener('visibilitychange',()=>{if(document.hidden)dispose?.()});window.addEventListener('pagehide',()=>dispose?.());
})();
