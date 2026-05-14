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

function isInHostModeFolder() {
  return window.location.pathname.includes("/host-mode/");
}

function getHostPropertyViewHref(id) {
  const base = isInHostModeFolder()
    ? "./property-view.html"
    : "./host-mode/property-view.html";
  return id ? `${base}?id=${encodeURIComponent(id)}` : base;
}

function getHostModeHref(path, query = "") {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const base = isInHostModeFolder()
    ? `./${cleanPath}`
    : `./host-mode/${cleanPath}`;
  return query ? `${base}${query}` : base;
}

function getSearchPageHref(query = "") {
  const base = isInHostModeFolder() ? "../search.html" : "./search.html";
  return query ? `${base}${query}` : base;
}

function rememberFavoriteChange(id, type, isActive) {
  if (!id || !type) return;
  try {
    localStorage.setItem(
      "rently_favorites_changed",
      JSON.stringify({
        id: String(id),
        type: String(type),
        isActive: !!isActive,
        changedAt: Date.now(),
      }),
    );
  } catch {}
}

function getRememberedFavoriteState(id, type) {
  if (!id || !type) return null;
  try {
    const raw = localStorage.getItem("rently_favorites_changed");
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || String(data.id) !== String(id) || String(data.type) !== String(type)) {
      return null;
    }
    return !!data.isActive;
  } catch {
    return null;
  }
}

window.rememberFavoriteChange = rememberFavoriteChange;
window.getRememberedFavoriteState = getRememberedFavoriteState;

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

function scrollToHashTarget(hash = window.location.hash, options = {}) {
  const rawHash = String(hash || "").trim();
  if (!rawHash || rawHash === "#") return;

  const id = decodeURIComponent(rawHash.slice(1));
  const target = document.getElementById(id);
  if (!target) return;

  const header = document.querySelector(".header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const extraOffset = id === "about-us" ? 24 : 100;
  const targetTop =
    target.getBoundingClientRect().top +
    window.pageYOffset -
    headerHeight -
    extraOffset;

  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: options.behavior || "auto",
  });
}

function stabilizeHashScroll() {
  if (!window.location.hash) return;

  const delays = [0, 80, 250, 600, 1000];
  delays.forEach((delay) => {
    window.setTimeout(() => scrollToHashTarget(), delay);
  });
}

function navigateToHashUrl(href) {
  const url = new URL(href, window.location.href);
  const currentPath = window.location.pathname.replace(/\/$/, "");
  const targetPath = url.pathname.replace(/\/$/, "");

  if (currentPath === targetPath && url.hash) {
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    scrollToHashTarget(url.hash, { behavior: "smooth" });
    window.setTimeout(() => scrollToHashTarget(url.hash), 350);
    return;
  }

  window.location.href = url.href;
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

function setFavoriteButtonState(btn, isActive) {
  if (!btn) return;
  btn.classList.toggle("active", isActive);
  btn.setAttribute(
    "aria-label",
    isActive ? "Remove from favorites" : "Add to favorites",
  );
  const img = btn.querySelector("img");
  if (img) img.src = getFavoriteIconSrc(isActive);
}

async function syncFavoriteButtons() {
  const buttons = Array.from(document.querySelectorAll(".favorite-btn[data-id]"));
  if (buttons.length === 0) return;

  const favoriteType = getFavoriteType();
  const rememberedStates = new Map();
  buttons.forEach((btn) => {
    const rememberedState = getRememberedFavoriteState(btn.dataset.id, favoriteType);
    if (rememberedState !== null) {
      rememberedStates.set(String(btn.dataset.id), rememberedState);
      setFavoriteButtonState(btn, rememberedState);
    }
  });

  const token = localStorage.getItem("auth_token") || "";
  if (!token) return;

  try {
    const resp = await fetch(`/api/Favorites?_=${Date.now()}`, {
      headers: {
        Authorization: "Bearer " + token,
        "Cache-Control": "no-cache",
      },
    });
    if (!resp.ok) return;

    const data = await resp.json();
    if (!Array.isArray(data)) return;

    const favoriteIds = new Set(
      data
        .filter((fav) =>
          isInHostMode() ? fav.isHostFavorite === true : fav.isGuestFavorite === true,
        )
        .map((fav) => fav.accommodation?.id ?? fav.accommodation?.Id ?? fav.id ?? fav.Id)
        .filter((id) => id !== null && id !== undefined)
        .map(String),
    );

    buttons.forEach((btn) => {
      const buttonId = String(btn.dataset.id);
      if (rememberedStates.has(buttonId)) {
        return;
      }
      setFavoriteButtonState(btn, favoriteIds.has(buttonId));
    });
  } catch (error) {
    console.debug("Could not sync favorite buttons:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  stabilizeHashScroll();

  window.addEventListener("load", stabilizeHashScroll);
  window.addEventListener("hashchange", stabilizeHashScroll);

  document.addEventListener("click", (e) => {
    const hashLink = e.target.closest(
      'a[href$="#about-us"], a[href$="#your-apartments-title"], a[href$="#inspiration-title"]',
    );
    if (!hashLink) return;

    e.preventDefault();
    navigateToHashUrl(hashLink.getAttribute("href"));
  });

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
  setTimeout(syncFavoriteButtons, 200);
  window.addEventListener("pageshow", syncFavoriteButtons);
  window.addEventListener("focus", syncFavoriteButtons);
  if (typeof initAboutSlider === "function") initAboutSlider();
  if (typeof initPropertyPage === "function") initPropertyPage();
  if (typeof initMyBookingPage === "function") initMyBookingPage();
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
        window.location.href = getHostModeHref("inspiration.html");
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
        ? getHostModeHref("inspiration.html")
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
      const onHostFavoritesPage =
        window.location.pathname.includes("/host-mode/favorites.html");
      const onFavoritesPage = /\/favorites\.html$/i.test(window.location.pathname);

      (async () => {
        try {
          const isActive = favBtn.classList.contains("active");
          if (isActive) {
            if (onFavoritesPage) {
              rememberFavoriteChange(id, favoriteType, false);
            }
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
            rememberFavoriteChange(id, favoriteType, false);
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
            rememberFavoriteChange(id, favoriteType, true);
          }
        } catch (err) {
          if (onFavoritesPage) {
            rememberFavoriteChange(id, favoriteType, true);
          }
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
    const inHostMode = isInHostMode();
    if (id) {
      if (inHostMode) {
        window.location.href = getHostPropertyViewHref(id);
      } else {
        window.location.href = `./property.html?id=${id}`;
      }
    } else {
      window.location.href = inHostMode
        ? getHostPropertyViewHref()
        : "./property.html";
    }
  });

  const homeSearchManaged = !!window.__rentlyHomeSearchManaged;
  const searchBtn = document.getElementById("search-main-btn");
  const locInput = document.getElementById("location-input");
  const checkinInput = document.getElementById("checkin-input");
  const checkoutInput = document.getElementById("checkout-input");

  if (!homeSearchManaged) {
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

    if (locInput) {
      let dbLocations = [];
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

        const localMatches = dbLocations.filter((loc) =>
          loc.toLowerCase().includes(query),
        );
        let optionsHtml = localMatches
          .map((loc) => `<option value="${loc}">`)
          .join("");

        debounceTimer = setTimeout(async () => {
          try {
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
              .filter((val, index, self) => val && self.indexOf(val) === index)
              .filter(
                (formatted) => !localMatches.some((lm) => formatted.includes(lm)),
              )
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
  }

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

  if (!homeSearchManaged) {
    const homeCheckinInput = document.getElementById("checkin-input");
    const homeCheckoutInput = document.getElementById("checkout-input");

    if (typeof flatpickr !== "undefined" && homeCheckinInput && homeCheckoutInput) {
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
    } else if (homeCheckinInput && homeCheckoutInput) {
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);

      const enableNativeDatePicker = (input) => {
        input.type = "date";
        input.readOnly = false;
        input.min = todayIso;
        input.placeholder = "";
      };

      enableNativeDatePicker(homeCheckinInput);
      enableNativeDatePicker(homeCheckoutInput);

      homeCheckinInput.addEventListener("change", () => {
        if (homeCheckinInput.value) {
          homeCheckoutInput.min = homeCheckinInput.value;
          if (
            homeCheckoutInput.value &&
            homeCheckoutInput.value < homeCheckinInput.value
          ) {
            homeCheckoutInput.value = "";
          }
        } else {
          homeCheckoutInput.min = todayIso;
        }
      });
    }
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
      window.location.href = getSearchPageHref(
        `?amenities=${encodeURIComponent(name.trim())}&page=1`,
      );
    }
  });
});
