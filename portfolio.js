const revealItems = document.querySelectorAll(".reveal");
const cursorGlow = document.querySelector(".cursor-glow");
const interactiveCards = document.querySelectorAll(".interactive-card");
const magneticButtons = document.querySelectorAll(".btn, .ghost-btn, .modal-close");
const projectTriggers = document.querySelectorAll(".project-trigger");
const projectModal = document.querySelector(".project-modal");
const modalType = document.querySelector(".modal-type");
const modalTitle = document.querySelector(".modal-title");
const modalSummary = document.querySelector(".modal-summary");
const modalPoints = document.querySelector(".modal-points");
const modalRole = document.querySelector(".modal-role");
const modalValue = document.querySelector(".modal-value");
const closeModalTargets = document.querySelectorAll("[data-close-modal]");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

if (cursorGlow) {
  let glowX = window.innerWidth / 2;
  let glowY = window.innerHeight / 2;
  let targetX = glowX;
  let targetY = glowY;

  const animateGlow = () => {
    glowX += (targetX - glowX) * 0.12;
    glowY += (targetY - glowY) * 0.12;
    cursorGlow.style.transform = `translate(${glowX}px, ${glowY}px)`;
    requestAnimationFrame(animateGlow);
  };

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
  });

  animateGlow();
}

interactiveCards.forEach((card) => {
  const resetCard = () => {
    card.style.transform =
      "perspective(1400px) rotateX(0deg) rotateY(0deg) translateY(0)";
  };

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const rotateY = ((offsetX / rect.width) - 0.5) * 10;
    const rotateX = (0.5 - offsetY / rect.height) * 10;

    card.style.transform = `perspective(1400px) rotateX(${rotateX.toFixed(
      2
    )}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
  });

  card.addEventListener("pointerleave", resetCard);
  card.addEventListener("pointercancel", resetCard);
});

magneticButtons.forEach((button) => {
  const resetButton = () => {
    button.style.transform = "";
  };

  button.addEventListener("pointermove", (event) => {
    const rect = button.getBoundingClientRect();
    const moveX = (event.clientX - rect.left - rect.width / 2) * 0.12;
    const moveY = (event.clientY - rect.top - rect.height / 2) * 0.12;
    button.style.transform = `translate(${moveX.toFixed(1)}px, ${moveY.toFixed(
      1
    )}px)`;
  });

  button.addEventListener("pointerleave", resetButton);
  button.addEventListener("pointercancel", resetButton);
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

  const points = (card.dataset.points || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  modalPoints.innerHTML = "";
  points.forEach((point) => {
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
  card.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".ghost-btn")) {
      openProjectModal(card);
    }
  });
});

closeModalTargets.forEach((node) => {
  node.addEventListener("click", closeProjectModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProjectModal();
  }
});
