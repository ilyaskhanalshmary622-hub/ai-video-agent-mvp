const pages = document.querySelectorAll("[data-page]");
const pageLinks = document.querySelectorAll("[data-page-link]");
const slides = document.querySelectorAll(".slide");
const pickerButtons = document.querySelectorAll("[data-slide]");
const prevButton = document.querySelector(".arrow.prev");
const nextButton = document.querySelector(".arrow.next");
const projectCards = document.querySelectorAll(".project-card");

let activeSlide = 0;
let audioContext;

const playTick = () => {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(520, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(760, audioContext.currentTime + 0.045);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.035, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.075);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
  } catch {
    // Sound is optional; some browsers block audio until user interaction.
  }
};

const pauseVideos = () => {
  document.querySelectorAll("video").forEach((video) => video.pause());
};

const openPage = (pageName) => {
  pages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === pageName);
  });

  pageLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.pageLink === pageName);
  });

  if (pageName !== "work") {
    pauseVideos();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

const setSlide = (nextIndex) => {
  if (!slides.length) return;

  activeSlide = (nextIndex + slides.length) % slides.length;
  pauseVideos();

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === activeSlide);
  });

  pickerButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.slide) === activeSlide);
  });
};

pageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const pageName = link.dataset.pageLink;
    if (!pageName) return;

    event.preventDefault();
    playTick();
    history.replaceState(null, "", `#${pageName}`);
    openPage(pageName);
  });
});

pickerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    playTick();
    setSlide(Number(button.dataset.slide || 0));
  });
});

prevButton?.addEventListener("click", () => {
  playTick();
  setSlide(activeSlide - 1);
});

nextButton?.addEventListener("click", () => {
  playTick();
  setSlide(activeSlide + 1);
});

projectCards.forEach((card) => {
  const trigger = card.querySelector(".project-trigger");

  trigger?.addEventListener("click", () => {
    playTick();
    projectCards.forEach((item) => {
      item.classList.toggle("is-open", item === card ? !item.classList.contains("is-open") : false);
    });
  });
});

window.addEventListener("keydown", (event) => {
  if (!document.querySelector('[data-page="work"].is-active')) return;

  if (event.key === "ArrowLeft") {
    setSlide(activeSlide - 1);
  }

  if (event.key === "ArrowRight") {
    setSlide(activeSlide + 1);
  }
});

const initialPage = location.hash.replace("#", "") || "resume";
openPage(["resume", "work", "ai-projects"].includes(initialPage) ? initialPage : "resume");
setSlide(0);
