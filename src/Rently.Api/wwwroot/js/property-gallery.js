(function createPropertyGallery(window) {
  function getPropertyImageUrl(url, width = 1080) {
    if (window.RentlyRenderHelpers?.getOptimizedImageUrl) {
      return window.RentlyRenderHelpers.getOptimizedImageUrl(url, width);
    }

    const raw = String(url || "").trim();
    if (!raw) return "";
    if (raw.startsWith("data:image/")) return raw;
    return `/api/Images/resize?url=${encodeURIComponent(raw)}&width=${width}`;
  }

  function initPropertyGallery(property) {
    const mainPhoto = document.getElementById("main-photo");
    const thumbnailContainer = document.getElementById("thumbnail-container");
    const photoWrapper = document.querySelector(".main-photo-wrapper");

    if (!mainPhoto || !thumbnailContainer || !photoWrapper) {
      return;
    }

    const photos = Array.isArray(property?.photos) ? property.photos.filter(Boolean) : [];
    if (!photos.length) {
      photoWrapper.classList.remove("skeleton");
      return;
    }

    let currentIndex = 0;
    const prevBtn = document.getElementById("gallery-prev");
    const nextBtn = document.getElementById("gallery-next");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");
    const lightboxClose = document.getElementById("lightbox-close");
    const lightboxPrev = document.getElementById("lightbox-prev");
    const lightboxNext = document.getElementById("lightbox-next");
    const lightboxCarousel = document.getElementById("lightbox-carousel");

    const firstImage = new Image();
    firstImage.src = getPropertyImageUrl(photos[0], 1080);
    firstImage.onload = () => {
      mainPhoto.src = firstImage.src;
      photoWrapper.classList.remove("skeleton");
    };

    thumbnailContainer.innerHTML = photos
      .map(
        (photo, index) => `
          <img src="${getPropertyImageUrl(photo, 200)}" class="thumb ${index === 0 ? "active" : ""}" data-index="${index}" alt="property thumb">
        `,
      )
      .join("");

    const thumbnails = Array.from(document.querySelectorAll(".thumb"));

    const updateGallery = (index) => {
      currentIndex = index;
      mainPhoto.src = getPropertyImageUrl(photos[currentIndex], 1080);
      thumbnails.forEach((thumb, thumbIndex) => {
        thumb.classList.toggle("active", thumbIndex === currentIndex);
      });
    };

    const updateLightbox = (index) => {
      currentIndex = index;
      if (lightboxImg) {
        lightboxImg.src = getPropertyImageUrl(photos[currentIndex], 1600);
      }
      lightboxCarousel?.querySelectorAll(".lightbox-thumb").forEach((thumb, thumbIndex) => {
        thumb.classList.toggle("active", thumbIndex === currentIndex);
      });
      updateGallery(currentIndex);
    };

    const renderLightboxCarousel = () => {
      if (!lightboxCarousel) return;

      lightboxCarousel.innerHTML = photos
        .map(
          (photo, index) => `
            <img src="${getPropertyImageUrl(photo, 200)}" class="lightbox-thumb ${index === currentIndex ? "active" : ""}" data-index="${index}">
          `,
        )
        .join("");

      lightboxCarousel.querySelectorAll(".lightbox-thumb").forEach((thumb) => {
        thumb.addEventListener("click", (event) => {
          updateLightbox(parseInt(event.target.dataset.index || "0", 10));
        });
      });
    };

    const openLightbox = (index) => {
      currentIndex = index;
      if (lightboxImg) {
        lightboxImg.src = getPropertyImageUrl(photos[currentIndex], 1600);
      }
      renderLightboxCarousel();
      lightbox?.classList.add("show");
      document.body.style.overflow = "hidden";
    };

    const closeLightbox = () => {
      lightbox?.classList.remove("show");
      document.body.style.overflow = "";
    };

    thumbnails.forEach((thumb, index) => {
      thumb.addEventListener("click", () => updateGallery(index));
    });

    prevBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      updateGallery((currentIndex - 1 + photos.length) % photos.length);
    });

    nextBtn?.addEventListener("click", (event) => {
      event.stopPropagation();
      updateGallery((currentIndex + 1) % photos.length);
    });

    mainPhoto.addEventListener("click", () => openLightbox(currentIndex));
    lightboxClose?.addEventListener("click", closeLightbox);
    lightbox?.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
    lightboxPrev?.addEventListener("click", () => {
      updateLightbox((currentIndex - 1 + photos.length) % photos.length);
    });
    lightboxNext?.addEventListener("click", () => {
      updateLightbox((currentIndex + 1) % photos.length);
    });

    document.addEventListener("keydown", (event) => {
      if (!lightbox?.classList.contains("show")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") lightboxPrev?.click();
      if (event.key === "ArrowRight") lightboxNext?.click();
    });
  }

  window.RentlyPropertyGallery = {
    getPropertyImageUrl,
    initPropertyGallery,
  };
})(window);
