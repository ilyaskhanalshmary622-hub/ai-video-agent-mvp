(()=>{
  const section=document.querySelector('.home-motion');
  if(!section)return;
  const button=section.querySelector('#motion-toggle');
  const svg=[...section.querySelectorAll('svg.motion-graphic')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let inView=false,userPaused=false;
  function sync(){
    const playing=inView&&!userPaused&&!reduced.matches&&!document.hidden;
    section.classList.toggle('is-playing',playing);
    section.classList.toggle('is-paused',userPaused);
    svg.forEach(item=>{if(typeof item.pauseAnimations==='function'){if(playing)item.unpauseAnimations();else item.pauseAnimations()}});
    if(button){button.setAttribute('aria-pressed',String(userPaused));button.setAttribute('aria-label',userPaused?'继续动画':'暂停动画');button.querySelector('span').textContent=userPaused?'继续动态':'暂停动态'}
  }
  button?.addEventListener('click',()=>{userPaused=!userPaused;sync()});
  const observer=new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting);sync()},{threshold:.16});
  observer.observe(section);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener?.('change',sync);
  sync();
})();
