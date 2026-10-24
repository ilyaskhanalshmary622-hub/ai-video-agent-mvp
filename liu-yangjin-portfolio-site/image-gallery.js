const suites = [
  {
    name: '日常穿搭', en: 'FORME / APPAREL', slug: 'forme', type: '服装',
    copy: '围绕雾紫色连帽套装展开 从版型细节到日常穿搭场景呈现统一的服装视觉系列'
  },
  {
    name: '声场之间', en: 'SONIQ / ELECTRONICS', slug: 'soniq', type: '头戴式耳机',
    copy: '以深蓝光影展示无线耳机 从产品轮廓与佩戴舒适度延伸到通勤和聆听场景'
  },
  {
    name: '收纳日常', en: 'NESTORA / HOME', slug: 'nestora', type: '家居收纳推车',
    copy: '用柔和家居场景呈现三层收纳推车 展示空间适配 收纳方式与移动使用体验'
  },
  {
    name: '晨间谷物', en: 'OAT & ORCHARD / FOOD', slug: 'oat-orchard', type: '枫糖碧根果格兰诺拉',
    copy: '围绕枫糖碧根果谷物 从早餐桌面 食材质感到多种食用情境组织整套画面'
  },
  {
    name: '沐浴日常', en: 'MORA / PERSONAL CARE', slug: 'mora', type: '身体护理',
    copy: '以雪松与柑橘为视觉线索 呈现沐浴露的瓶身质感 日常使用与浴室氛围'
  },
  {
    name: '一路向野', en: 'RIDGELINE / OUTDOOR', slug: 'ridgeline', type: '户外背包',
    copy: '以橙色户外背包为核心 展示收纳结构 面料细节以及城市通勤与户外行程'
  }
].map(suite => ({ ...suite, images: Array.from({ length: 9 }, (_, i) => `${String(i + 1).padStart(2, '0')}.webp`) }));

const asset = (slug, file) => `portfolio_media/aplus/sets/${slug}/${file}`;
const arrow = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const grid = document.querySelector('#suite-grid');
const dialog = document.querySelector('#suite-dialog');
const photo = document.querySelector('#suite-image');
const gallery = document.querySelector('#suite-gallery');
const viewer = document.querySelector('#viewer-image');
const imageControls = document.querySelector('#image-controls');
let current = 0;
let currentImage = 0;
let mode = 'single';
let opener = null;
let closing = false;

grid.innerHTML = suites.map((suite, i) => {
  const stack = suite.images.slice(0, 3).map((file, layer) => `<span class="stack-layer"><img src="${asset(suite.slug, file)}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}">${layer === 2 ? `<span class="stack-open">${arrow}</span>` : ''}</span>`).join('');
  return `<button class="suite-card" style="--delay:${i * .1}s" data-suite="${i}" aria-label="展开${suite.name} ${suite.type}套图"><span class="card-stack">${stack}</span><span class="card-label"><small>0${i + 1} / ${suite.en}</small><strong>${suite.name}</strong><span>${suite.type} · AI视觉概念 · 9张系列</span></span></button>`;
}).join('');

function renderGallery() {
  const suite = suites[current];
  gallery.innerHTML = suite.images.map((file, i) => `<button type="button" data-image-index="${i}" aria-label="查看${suite.name}第${i + 1}张"><img src="${asset(suite.slug, file)}" alt="${suite.type}视觉图 ${i + 1}" loading="lazy"><span>0${i + 1}</span></button>`).join('');
}

function imageView(next, index = currentImage) {
  mode = next;
  const suite = suites[current];
  if (mode === 'single') {
    currentImage = (index + suite.images.length) % suite.images.length;
    const file = suite.images[currentImage];
    photo.src = asset(suite.slug, file);
    photo.alt = `${suite.name} ${suite.type}视觉图 ${currentImage + 1}`;
    photo.hidden = false;
    gallery.hidden = true;
    imageControls.hidden = false;
    viewer.classList.add('main-view');
    document.querySelector('#image-index').textContent = `${String(currentImage + 1).padStart(2, '0')} / 09`;
    document.querySelector('#suite-original').href = photo.src;
    photo.style.animation = 'none';
    void photo.offsetWidth;
    photo.style.animation = '';
  } else {
    photo.hidden = true;
    gallery.hidden = false;
    imageControls.hidden = true;
    viewer.classList.remove('main-view');
    gallery.scrollTop = 0;
    document.querySelector('#suite-original').href = asset(suite.slug, suite.images[0]);
  }
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === mode)));
  photo.style.viewTransitionName = mode === 'single' && dialog.open ? 'suite-art' : '';
}

function show(index) {
  current = (index + suites.length) % suites.length;
  const suite = suites[current];
  document.querySelector('#suite-title').textContent = `${suite.name} / ${suite.type}`;
  document.querySelector('#suite-index').textContent = suite.en;
  document.querySelector('#suite-description').textContent = suite.copy;
  document.querySelector('#suite-count').textContent = `${String(current + 1).padStart(2, '0')} / ${String(suites.length).padStart(2, '0')}`;
  document.querySelector('#suite-views').innerHTML = '<button data-view="single" aria-pressed="true">单张预览</button><button data-view="gallery" aria-pressed="false">整套 9 张</button>';
  renderGallery();
  imageView('single', 0);
}

grid.addEventListener('click', event => {
  const button = event.target.closest('[data-suite]');
  if (!button) return;
  opener = button;
  const layer = button.querySelector('.stack-layer:nth-child(3)');
  const open = () => {
    layer.style.viewTransitionName = '';
    show(Number(button.dataset.suite));
    photo.style.viewTransitionName = 'suite-art';
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    layer.style.viewTransitionName = 'suite-art';
    document.startViewTransition(open);
  } else open();
});

function closeSuite() {
  if (closing || !dialog.open) return;
  closing = true;
  const canMorph = mode === 'single' && document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canMorph) {
    const layer = opener.querySelector('.stack-layer:nth-child(3)');
    document.startViewTransition(() => {
      photo.style.viewTransitionName = '';
      dialog.close();
      layer.style.viewTransitionName = 'suite-art';
      document.body.style.overflow = '';
    }).finished.finally(() => {
      layer.style.viewTransitionName = '';
      closing = false;
      opener?.focus();
    });
    return;
  }
  dialog.classList.add('leaving');
  setTimeout(() => {
    dialog.close();
    dialog.classList.remove('leaving');
    closing = false;
    document.body.style.overflow = '';
    opener?.focus();
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 230);
}

document.querySelector('#suite-close').onclick = closeSuite;
dialog.addEventListener('cancel', event => { event.preventDefault(); closeSuite(); });
dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSuite();
  }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) imageView(viewButton.dataset.view);
  const imageButton = event.target.closest('[data-image-index]');
  if (imageButton) imageView('single', Number(imageButton.dataset.imageIndex));
});

document.querySelector('#suite-prev').onclick = () => show(current - 1);
document.querySelector('#suite-next').onclick = () => show(current + 1);
document.querySelector('#image-prev').onclick = () => imageView('single', currentImage - 1);
document.querySelector('#image-next').onclick = () => imageView('single', currentImage + 1);
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    if (mode === 'single') imageView('single', currentImage + step);
    else show(current + step);
  }
});
