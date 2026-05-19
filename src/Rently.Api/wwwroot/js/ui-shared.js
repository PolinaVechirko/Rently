(function createUiShared(window) {
  function isDefaultAvatarUrl(url) {
    return !url || /user\.svg(?:[?#]|$)/i.test(String(url));
  }

  function resolveAvatarUrl(url, assetBase = "./") {
    const raw = String(url || "").trim();
    const fallback = `${assetBase}icons/user.svg`;

    if (!raw || isDefaultAvatarUrl(raw)) {
      return { src: fallback, isFallback: true };
    }

    if (/^(data:|https?:\/\/|\/)/i.test(raw)) {
      return { src: raw, isFallback: false };
    }

    if (raw.startsWith("./")) {
      return {
        src: assetBase === "../" ? `../${raw.slice(2)}` : raw,
        isFallback: false,
      };
    }

    if (raw.startsWith("../")) {
      return { src: raw, isFallback: false };
    }

    return {
      src: `${assetBase}${raw.replace(/^\/+/, "")}`,
      isFallback: false,
    };
  }

  function applyAvatarFallback(img, assetBase = "./") {
    if (!img) return;
    img.src = `${assetBase}icons/user.svg`;
    img.classList.add("avatar-fallback");
  }

  function initScrollSnapping(container, trackSelector) {
    let isScrolling;
    let startScrollLeft = container.scrollLeft;
    let isTouching = false;
    let lastSnapTime = 0;

    const performSnap = () => {
      if (isTouching) return;
      const now = Date.now();
      if (now - lastSnapTime < 50) return;
      lastSnapTime = now;

      const track = trackSelector ? container.querySelector(trackSelector) : container;
      if (!track || track.children.length === 0) return;

      const children = Array.from(track.children);
      if (children.length === 0) return;

      const firstChild = children[0];
      const firstChildWidth = firstChild.offsetWidth;
      const trackGap = 20;
      const cardAndGap = firstChildWidth + trackGap;
      const containerWidth = container.clientWidth;
      const maxScroll = Math.max(0, container.scrollWidth - containerWidth);
      const currentScrollLeft = container.scrollLeft;

      const snapPositions = [];
      for (let i = 0; i < children.length; i++) {
        const snapPos = i * cardAndGap;
        if (snapPos <= maxScroll) {
          snapPositions.push(snapPos);
        }
      }

      if (
        maxScroll > 0 &&
        (snapPositions.length === 0 || snapPositions[snapPositions.length - 1] < maxScroll)
      ) {
        snapPositions.push(maxScroll);
      }

      let targetScrollLeft = currentScrollLeft;
      if (snapPositions.length > 0) {
        targetScrollLeft = snapPositions.reduce((prev, curr) => {
          return Math.abs(curr - currentScrollLeft) < Math.abs(prev - currentScrollLeft)
            ? curr
            : prev;
        });
      }

      targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));

      if (Math.abs(container.scrollLeft - targetScrollLeft) > 0.5) {
        container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
        startScrollLeft = targetScrollLeft;
      } else {
        startScrollLeft = container.scrollLeft;
      }
    };

    container.addEventListener(
      "touchstart",
      () => {
        isTouching = true;
        startScrollLeft = container.scrollLeft;
      },
      { passive: true },
    );
    container.addEventListener("mousedown", () => {
      isTouching = true;
      startScrollLeft = container.scrollLeft;
    });
    const endHandler = () => {
      isTouching = false;
      window.clearTimeout(isScrolling);
      isScrolling = setTimeout(performSnap, 50);
    };
    container.addEventListener("touchend", endHandler, { passive: true });
    container.addEventListener("mouseup", endHandler);
    container.addEventListener("mouseleave", endHandler);
    container.addEventListener("updateStartScroll", (event) => {
      startScrollLeft = event.detail !== undefined ? event.detail : container.scrollLeft;
    });
    container.addEventListener("scrollend", performSnap);
    let scrollStarted = false;
    container.addEventListener(
      "scroll",
      () => {
        if (!scrollStarted && !isTouching) {
          startScrollLeft = container.scrollLeft;
          scrollStarted = true;
        }
        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(() => {
          scrollStarted = false;
          performSnap();
        }, 100);
      },
      { passive: true },
    );
  }

  function initAboutSlider() {
    const sliderWrapper = document.querySelector(".about-slider-wrapper");
    const arrowLeft = document.querySelector(".about-arrow-left");
    const arrowRight = document.querySelector(".about-arrow-right");
    const sliderContainer = document.querySelector(".about-slider-container");

    if (sliderWrapper && arrowLeft && arrowRight) {
      let isTransitioning = false;
      let shadowTimeout;

      arrowLeft.addEventListener("click", () => {
        if (isTransitioning) return;
        sliderWrapper.scrollBy({
          left: -sliderWrapper.offsetWidth,
          behavior: "smooth",
        });
      });

      arrowRight.addEventListener("click", () => {
        if (isTransitioning) return;
        sliderWrapper.dispatchEvent(
          new CustomEvent("updateStartScroll", {
            detail: sliderWrapper.scrollLeft + sliderWrapper.offsetWidth,
          }),
        );
        sliderWrapper.scrollBy({
          left: sliderWrapper.offsetWidth,
          behavior: "smooth",
        });
      });

      function showTempShadow(side) {
        const sideClass = `edge-${side}`;
        sliderContainer.parentElement.classList.add(sideClass);
        clearTimeout(shadowTimeout);
        shadowTimeout = setTimeout(() => {
          sliderContainer.parentElement.classList.remove(sideClass);
        }, 500);
      }

      sliderWrapper.addEventListener(
        "wheel",
        (event) => {
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 5) {
            event.preventDefault();
            if (isTransitioning) return;
            const isAtStart = sliderWrapper.scrollLeft <= 5;
            const isAtEnd =
              sliderWrapper.scrollLeft + sliderWrapper.offsetWidth >= sliderWrapper.scrollWidth - 5;
            const direction = event.deltaX > 0 ? 1 : -1;
            if (direction === 1 && !isAtEnd) {
              isTransitioning = true;
              sliderWrapper.scrollBy({
                left: sliderWrapper.offsetWidth,
                behavior: "smooth",
              });
            } else if (direction === -1 && !isAtStart) {
              isTransitioning = true;
              sliderWrapper.scrollBy({
                left: -sliderWrapper.offsetWidth,
                behavior: "smooth",
              });
            } else {
              showTempShadow(direction === 1 ? "right" : "left");
            }
          }
        },
        { passive: false },
      );

      sliderWrapper.addEventListener("scroll", () => {
        const isAtStart = sliderWrapper.scrollLeft <= 5;
        const isAtEnd =
          sliderWrapper.scrollLeft + sliderWrapper.offsetWidth >= sliderWrapper.scrollWidth - 5;
        if (isAtStart) arrowLeft.classList.add("is-hidden");
        else arrowLeft.classList.remove("is-hidden");
        if (isAtEnd) arrowRight.classList.add("is-hidden");
        else arrowRight.classList.remove("is-hidden");
      });

      let scrollTimeout;
      sliderWrapper.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          isTransitioning = false;
        }, 50);
      });

      arrowLeft.classList.add("is-hidden");
      initScrollSnapping(sliderWrapper, null);
    }
  }

  window.RentlyUiShared = {
    isDefaultAvatarUrl,
    resolveAvatarUrl,
    applyAvatarFallback,
    initScrollSnapping,
    initAboutSlider,
  };
})(window);
