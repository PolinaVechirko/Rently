/**
 * UI Utilities and component initialization
 */

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

    const track = trackSelector
      ? container.querySelector(trackSelector)
      : container;
    if (!track || track.children.length === 0) return;

    const children = Array.from(track.children);
    if (children.length === 0) return;

    // Get the first child's properties
    const firstChild = children[0];
    const firstChildWidth = firstChild.offsetWidth;
    const trackGap = 20; // Gap between cards from CSS

    // Calculate snap positions where carousel shows 4 cards aligned
    // Each position moves by (cardWidth + gap)
    const cardAndGap = firstChildWidth + trackGap;
    const containerWidth = container.clientWidth;
    const maxScroll = Math.max(0, container.scrollWidth - containerWidth);
    const currentScrollLeft = container.scrollLeft;

    // Get all possible snap positions (multiples of cardAndGap)
    const numCards = children.length;
    const snapPositions = [];

    for (let i = 0; i < numCards; i++) {
      const snapPos = i * cardAndGap;
      if (snapPos <= maxScroll) {
        snapPositions.push(snapPos);
      }
    }

    // Always allow scrolling to the end
    if (
      maxScroll > 0 &&
      (snapPositions.length === 0 ||
        snapPositions[snapPositions.length - 1] < maxScroll)
    ) {
      snapPositions.push(maxScroll);
    }

    // Find the closest snap position to current scroll
    let targetScrollLeft = currentScrollLeft;
    if (snapPositions.length > 0) {
      const closest = snapPositions.reduce((prev, curr) => {
        return Math.abs(curr - currentScrollLeft) <
          Math.abs(prev - currentScrollLeft)
          ? curr
          : prev;
      });
      targetScrollLeft = closest;
    }

    targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));

    // Smooth scroll to snap position
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
  container.addEventListener("updateStartScroll", (e) => {
    startScrollLeft = e.detail !== undefined ? e.detail : container.scrollLeft;
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
      (e) => {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5) {
          e.preventDefault();
          if (isTransitioning) return;
          const isAtStart = sliderWrapper.scrollLeft <= 5;
          const isAtEnd =
            sliderWrapper.scrollLeft + sliderWrapper.offsetWidth >=
            sliderWrapper.scrollWidth - 5;
          const direction = e.deltaX > 0 ? 1 : -1;
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
        sliderWrapper.scrollLeft + sliderWrapper.offsetWidth >=
        sliderWrapper.scrollWidth - 5;
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

async function initPropertyPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get("id");
  const mainContainer = document.querySelector(".property-main");
  console.log("[Property] ID:", propertyId, "Container:", !!mainContainer);
  if (!propertyId || !mainContainer) return;

  function getOptUrl(url, w = 1080) {
    if (!url) return "";
    
    // Check if the URL is base64 encoded data
    if (url.startsWith('data:image/')) {
      // For base64 images, return the URL directly
      // Note: We can't resize base64 images on the server, so return original
      return url;
    }
    
    // Pass relative paths directly to API
    // API expects paths like "./images/photo.jpg" or "images/photo.jpg"
    return `/api/Images/resize?url=${encodeURIComponent(url)}&width=${w}`;
  }

  function isInHostMode() {
    return (
      window.location.pathname.includes("/host-mode/") ||
      window.location.pathname.includes("host-mode.html")
    );
  }

  try {
    console.log("[Property] Fetching data for ID:", propertyId);
    const response = await fetch(`/api/Accommodations/${propertyId}`);
    console.log("[Property] API response:", response.status);
    if (!response.ok) throw new Error("Property not found");
    const property = await response.json();
    console.log("[Property] Data loaded:", {
      type: property.propertyType,
      country: property.country,
      city: property.city,
    });

    // Set favorite button data-id
    const favBtn = document.querySelector(".favorite-btn");
    const assetBase = getAssetBase();
    if (favBtn) {
      favBtn.setAttribute("data-id", propertyId);

      const isHostPropertyView =
        window.location.pathname.includes("/host-mode/property-view.html");
      if (!isHostPropertyView) {
        // Check if property is favorited
        const token = localStorage.getItem("auth_token") || "";
        if (token) {
          try {
            const favResp = await fetch(`/api/Favorites/${propertyId}`, {
              headers: { Authorization: "Bearer " + token },
            });
            if (favResp.ok) {
              const favData = await favResp.json();
              const inHostMode = isInHostMode();
              const isFavorited = inHostMode
                ? favData.hostFavorited
                : favData.guestFavorited;
              if (isFavorited) {
                favBtn.classList.add("active");
                const img = favBtn.querySelector("img");
                if (img) img.src = `${assetBase}icons/favorite-filled.svg`;
              }
            }
          } catch (favErr) {
            console.debug("Could not check favorite status:", favErr);
          }
        }
      }
    }

    // Remove skeleton classes from simple text fields immediately
    const titleEl = document.querySelector(".property-title");
    const locEl = document.querySelector(".property-location span");
    const priceEl = document.querySelector(".price-tag");
    const descEl = document.querySelector(".property-desc");

    if (titleEl) {
      titleEl.classList.remove("skeleton", "skeleton-title");
      titleEl.textContent = property.propertyType || "Accommodation";
    }

    if (locEl) {
      locEl.classList.remove("skeleton", "skeleton-loc");
      locEl.textContent = `${property.country}, ${property.city}${property.street ? " - " + property.street : ""}`;
    }

    if (priceEl) {
      priceEl.classList.remove("skeleton", "skeleton-price");
      priceEl.innerHTML = `$${property.pricePerNight} <span>/ night</span>`;
    }

    if (descEl) {
      descEl.innerHTML = `<p>${property.description}</p>`;
    }

    // Update Rating Header
    const ratingHeader = document.querySelector(
      ".reviews-header-row .section-title",
    );
    if (ratingHeader) {
      ratingHeader.textContent = `${property.averageRating.toFixed(2)} · ${property.reviewsCount} Reviews`;
    }

    // Update Amenities
    const amenitiesList = document.querySelector(".amenities-list");
    if (amenitiesList && property.amenities) {
      // Proper amenity icon mapping
      const amenityIconMap = {
        "Wi-Fi": "wifi.svg",
        "Free Parking": "freeParking.svg", 
        "Air Conditioning": "airConditioning.svg",
        "Pets Allowed": "pets.svg",
        "TV": "tv.svg",
        "Kitchen": "kitchen.svg",
        "Gym": "gym.svg",
        "Iron": "iron.svg",
        "Smoke Alarm": "smokealarm.svg",
        "First Aid Kit": "firstaidkit.svg",
        "Meal Service": "mealService.svg",
        "Balcony": "balcony.svg",
        "Self Check-in": "selfcheckin.svg",
        "Crib": "crib.svg",
        "Dedicated Workspace": "workspace.svg",
        "Family Friendly": "familyFriendly.svg",
        "Pool": "pool.svg",
        "Dryer": "dryer.svg",
        "Washer": "washer.svg",
        "Heating": "heating.svg"
      };
      
      amenitiesList.innerHTML = property.amenities
        .map(
          (a) => {
            const iconName = amenityIconMap[a] || "wifi.svg"; // fallback to wifi icon
            return `
                <div class="amenity-item">
                    <img src="${assetBase}icons/${iconName}" onerror="this.src='${assetBase}icons/wifi.svg'; this.onerror=null;" alt="${a}">
                    <span>${a}</span>
                </div>
            `;
          },
        )
        .join("");
    }

    // Update Host Profile
    const hostNameEl = document.querySelector(".host-name");
    const hostAvatarEl = document.querySelector(".host-avatar");
    const hostLabelEl = document.querySelector(".host-label");
    const hostInfoWrapper = document.querySelector(".host-info");

    if (hostNameEl) {
      hostNameEl.classList.remove("skeleton", "skeleton-text");
      hostNameEl.style.width = "auto";
      hostNameEl.textContent = property.hostName || "Host";
    }

    if (hostInfoWrapper) {
      let img = hostInfoWrapper.querySelector("img.host-avatar");
      if (!img) {
        const skeletonAvatar =
          hostInfoWrapper.querySelector(".skeleton-avatar");
        if (skeletonAvatar) skeletonAvatar.remove();
        img = document.createElement("img");
        img.className = "host-avatar";
        hostInfoWrapper.prepend(img);
      }
            
      const avatar = resolveAvatarUrl(
        property.hostAvatarUrl ||
          property.hostPhoto ||
          property.profilePhotoUrl ||
          property.ProfilePhotoUrl,
        assetBase,
      );
      img.src = avatar.src;
      img.classList.toggle("avatar-fallback", avatar.isFallback);
      img.onerror = function() {
        this.onerror = null;
        applyAvatarFallback(this, assetBase);
      };
    }
    if (hostLabelEl && property.hostCreatedAt) {
      hostLabelEl.classList.remove("skeleton", "skeleton-text");
      hostLabelEl.style.width = "auto";
      const years = Math.max(
        1,
        new Date().getFullYear() -
          new Date(property.hostCreatedAt).getFullYear(),
      );
      hostLabelEl.textContent = `Superhost · ${years} ${years === 1 ? "year" : "years"} hosting`;
    }

    const contactHostBtn = document.querySelector(".contact-host-btn");
    if (contactHostBtn) {
      contactHostBtn.onclick = () => {
        if (property.hostEmail) {
          window.location.href = `mailto:${property.hostEmail}`;
        }
      };
    }

    // Update Reviews List
    const reviewsGrid = document.querySelector(".reviews-grid");
    if (reviewsGrid && property.reviews) {
            
      reviewsGrid.innerHTML = property.reviews
        .map(
          (r, i) => {
            const avatar = resolveAvatarUrl(
              r.reviewerAvatarUrl ||
                r.profilePhotoUrl ||
                r.ProfilePhotoUrl ||
                r.reviewerPhotoUrl ||
                r.userAvatarUrl,
              assetBase,
            );
            
            const reviewId = `review-avatar-${i}`;
            return `
                <div class="review-item ${i >= 4 ? "extra-review" : ""}">
                    <div class="review-header">
                        <img id="${reviewId}" src="${avatar.src}" alt="User" class="${avatar.isFallback ? "avatar-fallback" : ""}">
                        <div>
                            <div class="reviewer-name">${r.reviewerName || "Anonymous"}</div>
                            <div class="review-date">${new Date(r.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
                        </div>
                        <div class="review-rating"><img src="../icons/star.svg" alt="star"> ${r.rating.toFixed(1)}</div>
                    </div>
                    <p class="review-text">${r.comment || "No comment left."}</p>
                </div>
            `;
          },
        )
        .join("");

      const reviewsToggle = document.getElementById("reviews-toggle");
      if (reviewsToggle) {
        reviewsToggle.style.display =
          property.reviewsCount <= 4 ? "none" : "flex";
      }
      
      // Add error handling for review avatars
      property.reviews.forEach((r, i) => {
        const reviewAvatar = document.getElementById(`review-avatar-${i}`);
        if (reviewAvatar) {
          reviewAvatar.onerror = function() {
            this.onerror = null;
            applyAvatarFallback(this, assetBase);
          };
        }
      });
    }

    // Update Photos & Gallery
    const mainPhoto = document.getElementById("main-photo");
    const thumbnailContainer = document.getElementById("thumbnail-container");
    const photoWrapper = document.querySelector(".main-photo-wrapper");

    if (property.photos && property.photos.length > 0) {
      const photos = property.photos;
      let currentIndex = 0;

      // Load main photo with transition
      const mainImg = new Image();
      mainImg.src = getOptUrl(photos[0], 1080);
      mainImg.onload = () => {
        mainPhoto.src = mainImg.src;
        photoWrapper.classList.remove("skeleton");
      };

      // Load thumbnails (optimized at 200px)
      thumbnailContainer.innerHTML = photos
        .map(
          (p, i) => `
                <img src="${getOptUrl(p, 200)}" class="thumb ${i === 0 ? "active" : ""}" data-index="${i}" alt="property thumb">
            `,
        )
        .join("");

      // Gallery Interactivity
      const thumbnails = document.querySelectorAll(".thumb");
      const prevBtn = document.getElementById("gallery-prev");
      const nextBtn = document.getElementById("gallery-next");
      const lightbox = document.getElementById("lightbox");
      const lightboxImg = document.getElementById("lightbox-img");
      const lightboxClose = document.getElementById("lightbox-close");
      const lightboxPrev = document.getElementById("lightbox-prev");
      const lightboxNext = document.getElementById("lightbox-next");
      const lightboxCarousel = document.getElementById("lightbox-carousel");

      const updateGallery = (index) => {
        currentIndex = index;
        mainPhoto.src = getOptUrl(photos[currentIndex], 1080);
        thumbnails.forEach((t, i) =>
          t.classList.toggle("active", i === currentIndex),
        );
      };

      thumbnails.forEach((thumb, index) =>
        thumb.addEventListener("click", () => updateGallery(index)),
      );
      prevBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        updateGallery((currentIndex - 1 + photos.length) % photos.length);
      });
      nextBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        updateGallery((currentIndex + 1) % photos.length);
      });

      const openLightbox = (index) => {
        currentIndex = index;
        lightboxImg.src = getOptUrl(photos[currentIndex], 1600); // Higher res for lightbox
        renderLightboxCarousel();
        lightbox.classList.add("show");
        document.body.style.overflow = "hidden";
      };

      const closeLightbox = () => {
        lightbox.classList.remove("show");
        document.body.style.overflow = "";
      };

      const renderLightboxCarousel = () => {
        let html = "";
        photos.forEach((p, i) => {
          html += `<img src="${getOptUrl(p, 200)}" class="lightbox-thumb ${i === currentIndex ? "active" : ""}" data-index="${i}">`;
        });
        lightboxCarousel.innerHTML = html;
        lightboxCarousel.querySelectorAll(".lightbox-thumb").forEach((lt) => {
          lt.addEventListener("click", (e) =>
            updateLightbox(parseInt(e.target.dataset.index)),
          );
        });
      };

      const updateLightbox = (index) => {
        currentIndex = index;
        lightboxImg.src = getOptUrl(photos[currentIndex], 1600);
        lightboxCarousel
          .querySelectorAll(".lightbox-thumb")
          .forEach((lt, i) =>
            lt.classList.toggle("active", i === currentIndex),
          );
        updateGallery(currentIndex);
      };

      mainPhoto.addEventListener("click", () => openLightbox(currentIndex));
      lightboxClose?.addEventListener("click", closeLightbox);
      lightbox?.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      lightboxPrev?.addEventListener("click", () =>
        updateLightbox((currentIndex - 1 + photos.length) % photos.length),
      );
      lightboxNext?.addEventListener("click", () =>
        updateLightbox((currentIndex + 1) % photos.length),
      );

      document.addEventListener("keydown", (e) => {
        if (!lightbox.classList.contains("show")) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft") lightboxPrev?.click();
        if (e.key === "ArrowRight") lightboxNext?.click();
      });

      // Initialize Map
      const mapContainer = document.getElementById("property-map");
      if (mapContainer && property.city) {
        const fullAddress = `${property.street ? property.street + ", " : ""}${property.city}, ${property.country}`;

        try {
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(fullAddress)}&limit=1`,
          );
          const geoData = await geoResponse.json();

          if (geoData && geoData.length > 0) {
            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);

            mapContainer.classList.remove("skeleton");
            const map = L.map("property-map", {
              center: [lat, lon],
              zoom: 13,
              scrollWheelZoom: false,
            });

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution: "© OpenStreetMap contributors",
            }).addTo(map);

            L.marker([lat, lon]).addTo(map);
          } else {
            mapContainer.innerHTML =
              "<p style='padding: 20px;'>Location map unavailable for this address.</p>";
            mapContainer.classList.remove("skeleton");
          }
        } catch (mapErr) {
          console.error("Map initialization failed:", mapErr);
          mapContainer.classList.remove("skeleton");
        }
      }
    }

    // Remove loading class - must happen regardless of photos
    mainContainer.classList.remove("is-loading");
    console.log("[Property] Removed is-loading class, page ready");
  } catch (err) {
    console.error(
      "[Property] Error loading property details:",
      err.message,
      err,
    );
    mainContainer.classList.remove("is-loading");
  }

  // Common UI Toggles
  const descToggle = document.getElementById("desc-toggle");
  const propDesc = document.getElementById("prop-desc");
  if (descToggle && propDesc) {
    descToggle.addEventListener("click", () => {
      const isExpanded = propDesc.classList.toggle("expanded");
      propDesc.classList.toggle("collapsed", !isExpanded);
      descToggle.classList.toggle("expanded", isExpanded);
      descToggle.querySelector("span").textContent = isExpanded
        ? "Show less"
        : "Show more";
    });
  }

  const reviewsToggle = document.getElementById("reviews-toggle");
  const reviewsGrid = document.getElementById("reviews-grid");
  if (reviewsToggle && reviewsGrid) {
    reviewsToggle.addEventListener("click", () => {
      const currentlyCollapsed = reviewsGrid.classList.contains("collapsed");
      if (currentlyCollapsed) {
        reviewsGrid.classList.remove("collapsed");
        reviewsToggle.classList.add("expanded");
        reviewsToggle.querySelector("span").textContent = "Hide reviews";
      } else {
        reviewsGrid.classList.add("collapsed");
        reviewsToggle.classList.remove("expanded");
        reviewsToggle.querySelector("span").textContent = "Show all reviews";
      }
    });
  }

  // Reservation & Calendar
  initPropertyBooking();
}

function initPropertyBooking() {
  const checkinInput = document.getElementById("prop-checkin");
  const checkoutInput = document.getElementById("prop-checkout");
  const calendarTrigger = document.getElementById("calendar-trigger");
  const availabilityHint = document.getElementById("availability-hint");

  if (typeof flatpickr !== "undefined" && checkinInput && checkoutInput) {
    const fpConfig = {
      dateFormat: "d.m.Y",
      minDate: "today",
      locale: { firstDayOfWeek: 1 },
    };
    const fpCheckin = flatpickr(checkinInput, {
      ...fpConfig,
      onChange: (d, str) => {
        fpCheckout.set("minDate", str);
        updateAvailabilityHint();
      },
    });
    const fpCheckout = flatpickr(checkoutInput, {
      ...fpConfig,
      onChange: updateAvailabilityHint,
    });
    calendarTrigger?.addEventListener("click", () => fpCheckin.open());

    function updateAvailabilityHint() {
      if (checkinInput.value && checkoutInput.value) {
        availabilityHint.textContent = `${checkinInput.value} → ${checkoutInput.value}`;
        availabilityHint.style.cssText =
          "font-style: normal; color: #101010; font-weight: 500;";
      } else if (checkinInput.value) {
        availabilityHint.textContent = "Select check-out date";
      } else {
        const now = new Date();
        const daysLeft =
          new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() -
          now.getDate();
        availabilityHint.textContent = `Available ${daysLeft} days in ${now.toLocaleString("en-US", { month: "long" })}`;
      }
    }
    updateAvailabilityHint();
  }

  const reserveBtn = document.getElementById("reserve-btn");
  const resModal = document.getElementById("reservation-modal");
  const resModalOk = document.getElementById("res-modal-ok");
  const resModalDates = document.getElementById("res-modal-dates");
  const resModalTitle = document.getElementById("res-modal-title");
  const resModalText = document.getElementById("res-modal-text");
  const resModalIcon = document.getElementById("res-modal-icon");

  let modalFpCheckin, modalFpCheckout;
  const modalCheckin = document.getElementById("modal-checkin");
  const modalCheckout = document.getElementById("modal-checkout");

  if (typeof flatpickr !== "undefined" && modalCheckin && modalCheckout) {
    const mConfig = {
      dateFormat: "d.m.Y",
      minDate: "today",
      locale: { firstDayOfWeek: 1 },
    };
    modalFpCheckin = flatpickr(modalCheckin, {
      ...mConfig,
      onChange: (d, str) => modalFpCheckout.set("minDate", str),
    });
    modalFpCheckout = flatpickr(modalCheckout, mConfig);
  }

  const showDateModal = () => {
    resModalIcon.textContent = "📅";
    resModalTitle.textContent = "Select Your Dates";
    resModalText.textContent =
      "Please choose check-in and check-out dates to reserve.";
    resModalDates.classList.remove("hidden");
    resModalOk.textContent = "Reserve Now";
    if (modalFpCheckin) modalFpCheckin.clear();
    if (modalFpCheckout) modalFpCheckout.clear();
    resModalOk.onclick = () => {
      if (!modalCheckin.value || !modalCheckout.value) {
        if (!modalCheckin.value) modalCheckin.style.borderColor = "#ef4444";
        if (!modalCheckout.value) modalCheckout.style.borderColor = "#ef4444";
        setTimeout(() => {
          modalCheckin.style.borderColor = "";
          modalCheckout.style.borderColor = "";
        }, 1500);
        return;
      }
      if (checkinInput) checkinInput.value = modalCheckin.value;
      if (checkoutInput) checkoutInput.value = modalCheckout.value;
      updateAvailabilityHint();
      showSuccessModal(modalCheckin.value, modalCheckout.value);
    };
    resModal.classList.add("show");
    document.body.style.overflow = "hidden";
  };

  const showSuccessModal = (from, to) => {
    resModalIcon.textContent = "🎉";
    resModalTitle.textContent = "Reservation Confirmed!";
    resModalText.textContent = `You have reserved this property from ${from} to ${to}. Check your email for booking details!`;
    resModalDates.classList.add("hidden");
    resModalOk.textContent = "Great!";
    resModalOk.onclick = () => {
      resModal.classList.remove("show");
      document.body.style.overflow = "";
    };
    resModal.classList.add("show");
  };

  reserveBtn?.addEventListener("click", () => {
    const isLoggedIn =
      !!localStorage.getItem("auth_token");
    if (!isLoggedIn) {
      localStorage.setItem("redirectAfterAuth", window.location.href);
      window.location.href = window.location.pathname.includes("/host-mode/")
        ? "../login.html"
        : "./login.html";
      return;
    }
    if (!checkinInput?.value || !checkoutInput?.value) {
      showDateModal();
      return;
    }
    showSuccessModal(checkinInput.value, checkoutInput.value);
  });

  document.getElementById("res-modal-close")?.addEventListener("click", () => {
    resModal.classList.remove("show");
    document.body.style.overflow = "";
  });
  resModal?.addEventListener("click", (e) => {
    if (e.target === resModal) {
      resModal.classList.remove("show");
      document.body.style.overflow = "";
    }
  });
}

function initHistoryPage() {
  const historyList = document.getElementById("history-list");
  if (!historyList) return;

  historyList.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".add-comment-btn");
    if (addBtn) {
      const commentArea = addBtn.closest(".history-comment-area");
      const existingForm = commentArea.querySelector(".comment-form");
      if (existingForm) {
        existingForm.remove();
        addBtn.classList.remove("expanded");
        addBtn.querySelector("span").textContent = "Add a review";
      } else {
        addBtn.classList.add("expanded");
        addBtn.querySelector("span").textContent = "Cancel";
        const form = document.createElement("div");
        form.className = "comment-form";
        form.innerHTML = `<textarea class="comment-textarea" placeholder="Write your review here..." maxlength="500"></textarea><button class="comment-submit-btn">Submit Review</button>`;
        commentArea.appendChild(form);
        form.querySelector(".comment-textarea").focus();
      }
      return;
    }

    const submitBtn = e.target.closest(".comment-submit-btn");
    if (submitBtn) {
      const form = submitBtn.closest(".comment-form");
      const text = form.querySelector(".comment-textarea").value.trim();
      if (!text) {
        form.querySelector(".comment-textarea").style.borderColor = "#ef4444";
        setTimeout(() => {
          form.querySelector(".comment-textarea").style.borderColor = "";
        }, 1500);
        return;
      }
      const commentArea = submitBtn.closest(".history-comment-area");
      commentArea.innerHTML = `<div class="history-existing-review"><div class="existing-review-label">Your review:</div><p class="existing-review-text">"${text}"</p></div>`;
    }
  });
}
