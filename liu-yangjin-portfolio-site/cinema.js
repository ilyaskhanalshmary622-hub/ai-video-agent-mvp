const screen=document.querySelector('#cinema-screen'), strip=document.querySelector('#filmstrip');
let selected=0, pool=works.map((_,i)=>i), startX=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const shortCopy=['800w+播放 · 跨境电商广告创意','机械结构、空间层次与科技镜头','AI人物、穿搭氛围与服装动态','商品质感与商业镜头语言','消费电子的材质与产品识别','服装动态与品牌视觉','人物展示与社媒内容','产品卖点到批量详情页视觉','场景冲突与产品卖点表达'];
function change(i,direction=1){
 selected=i;let w=works[i],pos=pool.indexOf(i),prev=pool[(pos-1+pool.length)%pool.length],next=pool[(pos+1)%pool.length];
 screen.querySelectorAll('video').forEach(v=>v.pause());
 const vertical=[0,1,2,6].includes(i);
 screen.innerHTML=`<div class="screen-shot ${vertical?'portrait':'landscape'} ${direction<0?'from-left':'from-right'}">${w.video?`<video muted loop playsinline ${reduced?'':'autoplay'} preload="metadata" poster="${w.poster}" src="${w.video}"></video>`:`<img src="${w.poster}" alt="${w.title}">`}</div><button class="screen-play" data-case="${i}">${w.video?'▶ 播放完整作品':'↗ 查看完整作品'}</button><span class="screen-index">${String(i+1).padStart(2,'0')} / 09</span>`;
 screen.querySelector('video')?.play().catch(()=>{});if(reduced)screen.querySelector('video')?.pause();
 document.querySelector('#cinema-title').textContent=w.title;
 document.querySelector('#cinema-copy').textContent=shortCopy[i];
 document.querySelector('#cinema-category').textContent=w.cat==='video'?'MOTION / AI COMMERCIAL':'VISUAL / CREATIVE WORKFLOW';
 document.querySelector('#case-link').dataset.case=i;
 document.querySelector('#preview-toggle').hidden=!w.video;
 document.querySelector('#preview-toggle').textContent=reduced?'预览 ▶':'暂停预览 Ⅱ';
 for(const [id,index] of [['side-prev',prev],['side-next',next]]){let b=document.querySelector('#'+id);b.innerHTML=`<img src="${works[index].poster}" alt=""><span>${works[index].title}</span>`;b.dataset.select=index;b.disabled=pool.length<2;b.setAttribute('aria-label','切换到'+works[index].title)}
 document.querySelectorAll('[data-select]').forEach(b=>{let current=+b.dataset.select===i;b.classList.toggle('selected',current);if(b.closest('#filmstrip'))b.setAttribute('aria-pressed',String(current))});
 const thumb=strip.querySelector('.selected');if(thumb)strip.scrollTo({left:thumb.offsetLeft-strip.offsetLeft-strip.clientWidth/2+thumb.clientWidth/2,behavior:reduced?'instant':'smooth'});
 document.querySelector('#cinema-counter').textContent=`${String(pos+1).padStart(2,'0')} / ${String(pool.length).padStart(2,'0')}`;
}
function fillStrip(){strip.innerHTML=pool.map(i=>`<button data-select="${i}" aria-label="选择${works[i].title}"><div><img src="${works[i].poster}" alt=""><span>${String(i+1).padStart(2,'0')}</span></div><p>${works[i].title}</p></button>`).join('')}
function step(d){change(pool[(pool.indexOf(selected)+d+pool.length)%pool.length],d)}
fillStrip();change(0);
document.addEventListener('click',e=>{let b=e.target.closest('[data-select]');if(b)change(+b.dataset.select,+b.dataset.select<selected?-1:1)});
document.querySelector('#cinema-prev').onclick=()=>step(-1);document.querySelector('#cinema-next').onclick=()=>step(1);
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.target.closest('input,textarea,select'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();step(e.key==='ArrowRight'?1:-1)}});
screen.addEventListener('touchstart',e=>startX=e.changedTouches[0].clientX,{passive:true});screen.addEventListener('touchend',e=>{let delta=e.changedTouches[0].clientX-startX;if(startX!==null&&Math.abs(delta)>55)step(delta<0?1:-1);startX=null},{passive:true});
document.querySelector('#preview-toggle').onclick=function(){let v=screen.querySelector('video');if(!v)return;if(v.paused){v.play().catch(()=>{});this.textContent='暂停预览 Ⅱ'}else{v.pause();this.textContent='预览 ▶'}};
document.querySelectorAll('[data-cinema-filter]').forEach(b=>b.onclick=()=>{document.querySelector('.cinema-filters .active')?.classList.remove('active');b.classList.add('active');pool=works.map((_,i)=>i).filter(i=>b.dataset.cinemaFilter==='all'||works[i].cat===b.dataset.cinemaFilter);fillStrip();change(pool.includes(selected)?selected:pool[0]);document.querySelector('#overview').hidden=true;document.querySelector('#overview-toggle').setAttribute('aria-expanded','false')});
document.querySelector('#overview-toggle').onclick=function(){let o=document.querySelector('#overview');o.hidden=!o.hidden;this.setAttribute('aria-expanded',String(!o.hidden));if(!o.hidden)o.innerHTML=pool.map(i=>`<button data-select="${i}"><img src="${works[i].poster}" alt=""><span>${String(i+1).padStart(2,'0')} / ${works[i].title}</span></button>`).join('')};

