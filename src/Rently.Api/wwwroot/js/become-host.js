(() => {
  const slider = document.getElementById("host-slider");
  const prevBtn = document.getElementById("host-prev");
  const nextBtn = document.getElementById("host-next");

  if (!slider || !prevBtn || !nextBtn) return;

  const getStep = () => slider.clientWidth;

  const updateArrows = () => {
    const isAtStart = slider.scrollLeft <= 5;
    const isAtEnd =
      slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 5;

    prevBtn.style.visibility = isAtStart ? "hidden" : "";
    nextBtn.style.visibility = isAtEnd ? "hidden" : "";

    prevBtn.style.opacity = "";
    nextBtn.style.opacity = "";
    prevBtn.style.pointerEvents = "";
    nextBtn.style.pointerEvents = "";
  };

  slider.addEventListener("scroll", updateArrows);
  window.addEventListener("resize", updateArrows);
  setTimeout(updateArrows, 50);

  prevBtn.addEventListener("click", () => {
    slider.scrollBy({ left: -getStep(), behavior: "smooth" });
  });

  nextBtn.addEventListener("click", () => {
    slider.scrollBy({ left: getStep(), behavior: "smooth" });
  });

  const startHostingBtn = document.getElementById("start-hosting-btn");
  if (startHostingBtn) {
    startHostingBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isLoggedIn =
        localStorage.getItem("isLoggedIn") === "true" ||
        !!localStorage.getItem("auth_token");

      if (isLoggedIn) {
        window.location.href = "./host-mode.html";
      } else {
        localStorage.setItem("redirectAfterAuth", window.location.href);
        window.location.href = "./login.html";
      }
    });
  }

  // Drag scroll (мышь + touch)
  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;

  const dragStart = (x) => {
    isDown = true;
    slider.classList.add("dragging");
    startX = x;
    startScrollLeft = slider.scrollLeft;
  };

  const dragMove = (x) => {
    if (!isDown) return;
    const delta = x - startX;
    slider.scrollLeft = startScrollLeft - delta;
  };

  const dragEnd = () => {
    isDown = false;
    slider.classList.remove("dragging");
  };

  slider.addEventListener("mousedown", (e) => dragStart(e.clientX));
  window.addEventListener("mousemove", (e) => dragMove(e.clientX));
  window.addEventListener("mouseup", dragEnd);
  slider.addEventListener("mouseleave", dragEnd);

  slider.addEventListener(
    "touchstart",
    (e) => dragStart(e.touches[0].clientX),
    { passive: true },
  );
  slider.addEventListener("touchmove", (e) => dragMove(e.touches[0].clientX), {
    passive: true,
  });
  slider.addEventListener("touchend", dragEnd);
})();
