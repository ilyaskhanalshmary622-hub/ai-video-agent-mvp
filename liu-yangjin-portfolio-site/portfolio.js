const revealItems = document.querySelectorAll(".reveal");
const spotlight = document.querySelector(".spotlight");
const progressBar = document.querySelector(".progress-rail-bar");
const interactiveCards = document.querySelectorAll(".interactive-card");
const magneticItems = document.querySelectorAll(".magnetic, .action-btn, .ghost-link");
const parallaxItems = document.querySelectorAll("[data-depth]");
const projectTriggers = document.querySelectorAll(".project-trigger");
const projectModal = document.querySelector(".project-modal");
const modalType = document.querySelector(".modal-type");
const modalTitle = document.querySelector(".modal-title");
const modalSummary = document.querySelector(".modal-summary");
const modalPoints = document.querySelector(".modal-points");
const modalRole = document.querySelector(".modal-role");
const modalValue = document.querySelector(".modal-value");
const closeModalTargets = document.querySelectorAll("[data-close-modal]");
const mediaCards = document.querySelectorAll(".media-card");
const featuredVideo = document.querySelector("#featured-video");
const featuredImage = document.querySelector("#featured-image");
const mediaKind = document.querySelector("#media-kind");
const mediaTitle = document.querySelector("#media-title");
const mediaDescription = document.querySelector("#media-description");
const mediaTags = document.querySelector("#media-tags");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

revealItems.forEach((item) => revealObserver.observe(item));

if (spotlight) {
  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;
  let targetX = currentX;
  let targetY = currentY;

  const animateSpotlight = () => {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;
    spotlight.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animateSpotlight);
  };

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
  });

  animateSpotlight();
}

const updateProgress = () => {
  if (!progressBar) {
    return;
  }

  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressBar.style.width = `${Math.min(progress, 100)}%`;
};

window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

interactiveCards.forEach((card) => {
  const resetCard = () => {
    card.style.transform = "";
  };

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const rotateY = ((offsetX / rect.width) - 0.5) * 9;
    const rotateX = (0.5 - offsetY / rect.height) * 9;
    card.style.transform = `perspective(1400px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
  });

  card.addEventListener("pointerleave", resetCard);
  card.addEventListener("pointercancel", resetCard);
});

magneticItems.forEach((item) => {
  const resetMagnet = () => {
    item.style.transform = "";
  };

  item.addEventListener("pointermove", (event) => {
    const rect = item.getBoundingClientRect();
    const moveX = (event.clientX - rect.left - rect.width / 2) * 0.12;
    const moveY = (event.clientY - rect.top - rect.height / 2) * 0.12;
    item.style.transform = `translate(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px)`;
  });

  item.addEventListener("pointerleave", resetMagnet);
  item.addEventListener("pointercancel", resetMagnet);
});

window.addEventListener("pointermove", (event) => {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const offsetX = (event.clientX - centerX) / centerX;
  const offsetY = (event.clientY - centerY) / centerY;

  parallaxItems.forEach((item) => {
    const depth = Number(item.dataset.depth || 0);
    const moveX = offsetX * depth * 80;
    const moveY = offsetY * depth * 80;
    item.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
  });
});

const openProjectModal = (card) => {
  if (!projectModal) {
    return;
  }

  modalType.textContent = card.dataset.type || "";
  modalTitle.textContent = card.dataset.title || "";
  modalSummary.textContent = card.dataset.summary || "";
  modalRole.textContent = card.dataset.role || "";
  modalValue.textContent = card.dataset.value || "";

  modalPoints.innerHTML = "";
  (card.dataset.points || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      modalPoints.appendChild(li);
    });

  projectModal.classList.add("open");
  projectModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
};

const closeProjectModal = () => {
  if (!projectModal) {
    return;
  }

  projectModal.classList.remove("open");
  projectModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
};

projectTriggers.forEach((card) => {
  card.addEventListener("click", () => openProjectModal(card));
});

closeModalTargets.forEach((item) => {
  item.addEventListener("click", closeProjectModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProjectModal();
  }
});

const setMediaTags = (tagsText) => {
  if (!mediaTags) {
    return;
  }

  mediaTags.innerHTML = "";
  tagsText
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const span = document.createElement("span");
      span.textContent = tag;
      mediaTags.appendChild(span);
    });
};

const activateVideo = (card) => {
  if (!featuredVideo || !featuredImage) {
    return;
  }

  const source = featuredVideo.querySelector("source");
  const mediaSrc = card.dataset.mediaSrc || "";
  const poster = card.dataset.mediaPoster || "";

  if (source) {
    source.src = mediaSrc;
  }

  featuredVideo.poster = poster;
  featuredVideo.load();
  featuredVideo.classList.add("is-active");
  featuredImage.classList.remove("is-active");
  mediaKind.textContent = "VIDEO";
};

const activateImage = (card) => {
  if (!featuredVideo || !featuredImage) {
    return;
  }

  featuredVideo.pause();
  featuredVideo.classList.remove("is-active");
  featuredImage.src = card.dataset.mediaSrc || "";
  featuredImage.alt = card.dataset.mediaTitle || "作品预览图";
  featuredImage.classList.add("is-active");
  mediaKind.textContent = "BOARD";
};

mediaCards.forEach((card) => {
  card.addEventListener("click", () => {
    mediaCards.forEach((node) => node.classList.remove("is-active"));
    card.classList.add("is-active");

    const mediaType = card.dataset.mediaType;
    if (mediaType === "video") {
      activateVideo(card);
    } else {
      activateImage(card);
    }

    if (mediaTitle) {
      mediaTitle.textContent = card.dataset.mediaTitle || "";
    }

    if (mediaDescription) {
      mediaDescription.textContent = card.dataset.mediaDescription || "";
    }

    setMediaTags(card.dataset.mediaTags || "");
  });
});
