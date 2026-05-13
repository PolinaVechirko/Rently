/**
 * Main entry point and global initialization
 */

/**
 * Helper function to determine if user is in host mode
 */
function isInHostMode() {
  return (
    window.location.pathname.includes("/host-mode/") ||
    window.location.pathname.includes("host-mode.html")
  );
}

/**
 * Helper function to get favorite type based on current mode
 */
function getFavoriteType() {
  return isInHostMode() ? "Host" : "Guest";
}

/**
 * Helper function to get the appropriate favorite icon based on mode
 */
function getFavoriteIconSrc(isActive) {
  const assetBase = getAssetBase();
  if (isInHostMode()) {
    // In host mode, use red filled heart when active
    return isActive
      ? assetBase + "icons/favorite-filled.svg"
      : assetBase + "icons/favorite.svg";
  } else {
    // In guest mode, use outline when inactive, filled when active
    return isActive
      ? assetBase + "icons/favorite-filled.svg"
      : assetBase + "icons/favorite.svg";
  }
}

// Function to update all favorite icons with correct paths
function updateAllFavoriteIcons() {
  document.querySelectorAll(".favorite-btn").forEach(btn => {
    const isActive = btn.classList.contains("active");
    const img = btn.querySelector("img");
    if (img) {
      img.src = getFavoriteIconSrc(isActive);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // --- HERO IMAGE LOGIC ---
  const images = [
    'url("./images/hero1.png")',
    'url("./images/hero2.png")',
    'url("./images/hero3.png")',
    'url("./images/hero4.png")',
  ];

  const heroElement = document.getElementById("hero-image");
  if (heroElement) {
    let savedImage = localStorage.getItem("heroImage_v2");
    if (!savedImage) {
      savedImage = images[Math.floor(Math.random() * images.length)];
      localStorage.setItem("heroImage_v2", savedImage);
    }
    heroElement.style.backgroundImage = savedImage;
    heroElement.style.backgroundSize = "cover";
    heroElement.style.backgroundPosition = "center";
  }

  // --- INITIALIZE MODULES ---
  // initAuth is invoked from auth.js (DOMContentLoaded or immediate); do not call again here
  if (typeof renderAccommodations === "function") {
    renderAccommodations("accommodations-track", true);
    renderAccommodations("most-visited-track-1", true);
    renderAccommodations("most-visited-track-2", true);
  }
  if (typeof renderCities === "function") renderCities();
  if (typeof renderAmenities === "function") renderAmenities();
  
  // Update all favorite icons to ensure correct paths
  setTimeout(updateAllFavoriteIcons, 100);
  if (typeof initAboutSlider === "function") initAboutSlider();
  if (typeof initPropertyPage === "function") initPropertyPage();
  if (typeof initHistoryPage === "function") initHistoryPage();
  if (typeof initSearchPage === "function") initSearchPage();

  // --- HOME SECTION TITLE LINKS ---
  const highestRatedHeading = document.getElementById("highest-rated-heading");
  if (highestRatedHeading) {
    highestRatedHeading.addEventListener("click", () => {
      window.location.href = "./search.html?sort=highest_rated&page=1";
    });
  }
  const mostVisitedHeading = document.getElementById("most-visited-heading");
  if (mostVisitedHeading) {
    mostVisitedHeading.addEventListener("click", () => {
      window.location.href = "./search.html?sort=most_visited&page=1";
    });
  }
  const inspirationTitle = document.getElementById("inspiration-title");
  if (inspirationTitle) {
    inspirationTitle.addEventListener("click", () => {
      if (isInHostMode()) {
        window.location.href = "./host-mode/inspiration.html";
      } else {
        window.location.href = "./search.html?page=1";
      }
    });
    if (isInHostMode()) {
      inspirationTitle.style.cursor = "pointer";
    }
  }

  // --- LEARN MORE BUTTON LOGIC ---
  document.addEventListener("click", (e) => {
    const learnMoreBtn = e.target.closest(".learn-more-btn");
    if (!learnMoreBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const track = learnMoreBtn.closest(".horizontal-scroll-track");
    if (!track) {
      window.location.href = "./search.html?page=1";
      return;
    }

    const trackId = track.id || "";
    if (trackId === "accommodations-track") {
      window.location.href = "./search.html?sort=highest_rated&page=1";
    } else if (trackId.startsWith("most-visited-track")) {
      window.location.href = "./search.html?sort=most_visited&page=1";
    } else if (trackId === "inspiration-track") {
      const inspirationPath = isInHostMode()
        ? "./host-mode/inspiration.html"
        : "./search.html?page=1";
      window.location.href = inspirationPath;
    } else {
      window.location.href = "./search.html?page=1";
    }
  });

  // --- GLOBAL EVENT DELEGATION ---

  
  // Card redirect logic (moved after favorite button logic)
  document.addEventListener("click", (e) => {
    // Check if clicking on favorite button first
    const favBtn = e.target.closest(".favorite-btn");
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();

      const isLoggedIn =
        localStorage.getItem("isLoggedIn") === "true" ||
        !!localStorage.getItem("auth_token");
      if (!isLoggedIn) {
        // If unauthenticated, redirect to login (preserve return path)
        localStorage.setItem("redirectAfterAuth", window.location.href);
        const loginPath = window.location.pathname.includes("/host-mode/")
          ? "../login.html"
          : "./login.html";
        window.location.href = loginPath;
        return;
      }

      // Determine accommodation id from closest card or from the button itself
      const card = favBtn.closest(".accommodation-card");
      let id = card ? card.getAttribute("data-id") : null;
      if (!id) id = favBtn.dataset.id || favBtn.getAttribute("data-id");
      // If there is no id, just toggle visually
      if (!id) {
        favBtn.classList.toggle("active");
        return;
      }

      const token = localStorage.getItem("auth_token") || "";
      const favoriteType = getFavoriteType();

      (async () => {
        try {
          const isActive = favBtn.classList.contains("active");
          if (isActive) {
            // currently active -> remove favorite
            const resp = await fetch(
              `/api/Favorites/${id}?type=${favoriteType}`,
              {
                method: "DELETE",
                headers: { Authorization: "Bearer " + token },
              },
            );
            if (!resp.ok && resp.status !== 204)
              throw new Error("Failed to remove favorite");
            favBtn.classList.remove("active");
            // swap icon back to outline
            try {
              const img = favBtn.querySelector("img");
              if (img) img.src = getFavoriteIconSrc(false);
            } catch {}
          } else {
            const resp = await fetch(
              `/api/Favorites/${id}?type=${favoriteType}`,
              {
                method: "POST",
                headers: { Authorization: "Bearer " + token },
              },
            );
            if (!resp.ok) throw new Error("Failed to add favorite");
            favBtn.classList.add("active");
            // swap icon to filled heart
            try {
              const img = favBtn.querySelector("img");
              if (img) img.src = getFavoriteIconSrc(true);
            } catch {}
          }
        } catch (err) {
          // Fail silently in UI beyond console logging
          console.error("Favorites Error:", err);
        }
      })();
      return; // Stop processing for favorite buttons
    }

    // Card redirect logic
    const card = e.target.closest(".accommodation-card");
    if (
      !card ||
      e.target.closest(".favorite-btn") ||
      e.target.closest(".learn-more-btn") ||
      e.target.closest(".learn-more-card") ||
      e.target.closest(".host-clickable-card") ||
      e.target.closest(".host-action-btn") ||
      e.target.closest(".inspiration-learn-more")
    )
      return;

    const id = card.getAttribute("data-id");
    const inHostModeFolder = isInHostMode();
    if (id) {
      if (inHostModeFolder) {
        window.location.href = `./host-mode/property-view.html?id=${id}`;
      } else {
        window.location.href = `./property.html?id=${id}`;
      }
    } else {
      window.location.href = inHostModeFolder
        ? "./host-mode/property-view.html"
        : "./property.html";
    }
  });

  // About Us smooth scroll (manual to center)
  const aboutLink = document.querySelector('a[href="#about-us"]');
  if (aboutLink) {
    aboutLink.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById("about-us");
      if (target)
        target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  // Search button on home page
  const searchBtn = document.getElementById("search-main-btn");
  const locInput = document.getElementById("location-input");
  const checkinInput = document.getElementById("checkin-input");
  const checkoutInput = document.getElementById("checkout-input");

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const errorMsg = document.getElementById("search-error-msg");
      let isValid = true;

      [locInput, checkinInput, checkoutInput].forEach((inp) => {
        if (inp) {
          const group = inp.closest(".search-input-group");
          if (!inp.value.trim()) {
            if (group) {
              group.style.boxShadow =
                "0 0 10px 3px #D5D5D6, inset 0 0 10px rgba(255, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 0, 0, 0.7)";
            }
            isValid = false;
          } else {
            if (group) {
              group.style.boxShadow = "0 0 10px 3px #D5D5D6";
            }
          }
        }
      });

      if (!isValid) {
        if (errorMsg) {
          errorMsg.classList.add("visible");
          errorMsg.style.display = "block";
        }
        return;
      }

      if (errorMsg) {
        errorMsg.classList.remove("visible");
        errorMsg.style.display = "none";
      }
      window.location.href = `./search.html?location=${encodeURIComponent(locInput.value)}&checkin=${checkinInput.value}&checkout=${checkoutInput.value}`;
    });
  }

  // --- ADDRESS AUTOCOMPLETE (DB + Nominatim) ---
  if (locInput) {
    let dbLocations = [];
    // Fetch DB locations on load
    fetch("/api/Accommodations/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        dbLocations = data;
      })
      .catch((e) => console.error("Failed to load local locations:", e));

    let debounceTimer;
    locInput.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      const query = this.value.trim().toLowerCase();
      const datalist = document.getElementById("city-suggestions");
      if (!datalist) return;

      if (query.length < 2) {
        datalist.innerHTML = "";
        return;
      }

      // 1. Show local DB matches immediately (or as base)
      const localMatches = dbLocations.filter((loc) =>
        loc.toLowerCase().includes(query),
      );
      let optionsHtml = localMatches
        .map((loc) => `<option value="${loc}">`)
        .join("");

      debounceTimer = setTimeout(async () => {
        try {
          // 2. Fetch global matches from Nominatim with address details and force English
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=10`,
          );
          const results = await resp.json();

          const globalOptions = results
            .map((r) => {
              const addr = r.address;
              const city =
                addr.city ||
                addr.town ||
                addr.village ||
                addr.hamlet ||
                addr.suburb ||
                "";
              const country = addr.country || "";
              if (city && country) return `${city}, ${country}`;
              if (country) return country;
              return r.display_name;
            })
            .filter((val, index, self) => val && self.indexOf(val) === index) // Unique formatted strings
            .filter(
              (formatted) => !localMatches.some((lm) => formatted.includes(lm)),
            ) // Avoid duplicates with local
            .map((formatted) => `<option value="${formatted}">`)
            .join("");

          datalist.innerHTML = optionsHtml + globalOptions;
        } catch (e) {
          console.error("Autocomplete error:", e);
          datalist.innerHTML = optionsHtml;
        }
      }, 500);
    });
  }

  // Clear outline on input
  [locInput, checkinInput, checkoutInput].forEach((inp) => {
    if (inp) {
      const handler = function () {
        const group = this.closest(".search-input-group");
        if (this.value.trim() && group) {
          group.style.boxShadow = "0 0 10px 3px #D5D5D6";

          const allFilled = [locInput, checkinInput, checkoutInput].every((i) =>
            i.value.trim(),
          );
          if (allFilled) {
            const errorMsg = document.getElementById("search-error-msg");
            if (errorMsg) {
              errorMsg.classList.remove("visible");
              errorMsg.style.display = "none";
            }
          }
        }
      };
      inp.addEventListener("input", handler);
      inp.addEventListener("change", handler);
    }
  });

  // Become a host redirect helper
  const becomeHostHref = window.location.pathname.includes("/host-mode/")
    ? "../become-host.html"
    : "./become-host.html";
  document.querySelectorAll('a, button, [role="button"]').forEach((el) => {
    if ((el.textContent || "").trim().toLowerCase() === "become a host") {
      if (el.tagName.toLowerCase() === "a") {
        el.setAttribute("href", becomeHostHref);
      } else {
        el.addEventListener(
          "click",
          () => (window.location.href = becomeHostHref),
        );
      }
    }
  });

  // Initialize generic scroll snapping for containers
  document
    .querySelectorAll(".horizontal-scroll-container")
    .forEach((container) => {
      if (typeof initScrollSnapping === "function") {
        initScrollSnapping(container, ".horizontal-scroll-track");
      }
    });

  // Initial check for search page results if needed
  // (Managed by search-logic.js now)

  if (
    typeof flatpickr !== "undefined" &&
    document.getElementById("checkin-input")
  ) {
    const config = {
      dateFormat: "d.m.Y",
      minDate: "today",
      allowInput: true,
      locale: { firstDayOfWeek: 1 },
      onChange: function (d, str) {
        if (this.element.id === "checkin-input") {
          const out = document.querySelector("#checkout-input")._flatpickr;
          if (out) out.set("minDate", str);
        }
      },
    };
    flatpickr("#checkin-input", config);
    flatpickr("#checkout-input", config);
  }

  document.addEventListener("click", (e) => {
    const cityCard = e.target.closest(".city-card");
    if (cityCard) {
      const cityName = cityCard.querySelector(".city-name").innerText;
      window.location.href = `./search.html?location=${encodeURIComponent(cityName)}`;
    }

    const amenityBtn = e.target.closest(".amenity-btn");
    if (amenityBtn) {
      const name =
        amenityBtn.dataset.amenityName ||
        amenityBtn.querySelector(".amenity-label").innerText;
      window.location.href = `./search.html?amenities=${encodeURIComponent(name.trim())}`;
    }
  });
});
