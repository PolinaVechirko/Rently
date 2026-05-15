/**
 * Main entry point and global initialization
 */

/**
 * Helper function to determine if user is in host mode
 */
function isInHostMode() {
  if (window.RentlyAppContext) {
    return window.RentlyAppContext.isInHostMode();
  }

  return (
    window.location.pathname.includes("/host-mode/") ||
    window.location.pathname.includes("host-mode.html")
  );
}

function isInHostModeFolder() {
  if (window.RentlyAppContext) {
    return window.RentlyAppContext.isInHostModeFolder();
  }

  return window.location.pathname.includes("/host-mode/");
}

function getHostPropertyViewHref(id) {
  if (window.RentlyAppContext) {
    return window.RentlyAppContext.getHostPropertyViewHref(id);
  }

  const base = isInHostModeFolder()
    ? "./property-view.html"
    : "./host-mode/property-view.html";
  return id ? `${base}?id=${encodeURIComponent(id)}` : base;
}

function getHostModeHref(path, query = "") {
  if (window.RentlyAppContext) {
    return window.RentlyAppContext.getHostModeHref(path, query);
  }

  const cleanPath = String(path || "").replace(/^\/+/, "");
  const base = isInHostModeFolder()
    ? `./${cleanPath}`
    : `./host-mode/${cleanPath}`;
  return query ? `${base}${query}` : base;
}

function getSearchPageHref(query = "") {
  if (window.RentlyAppContext) {
    return window.RentlyAppContext.getSearchPageHref(query);
  }

  const base = isInHostModeFolder() ? "../search.html" : "./search.html";
  return query ? `${base}${query}` : base;
}

function rememberFavoriteChange(id, type, isActive) {
  if (window.RentlyFavoriteInteractions) {
    window.RentlyFavoriteInteractions.rememberFavoriteChange(id, type, isActive);
  }
}

function getRememberedFavoriteState(id, type) {
  if (window.RentlyFavoriteInteractions) {
    return window.RentlyFavoriteInteractions.getRememberedFavoriteState(id, type);
  }
  return null;
}

window.rememberFavoriteChange = rememberFavoriteChange;
window.getRememberedFavoriteState = getRememberedFavoriteState;

/**
 * Helper function to get favorite type based on current mode
 */
function getFavoriteType() {
  if (window.RentlyFavoriteInteractions) {
    return window.RentlyFavoriteInteractions.getFavoriteType();
  }
  return isInHostMode() ? "Host" : "Guest";
}

/**
 * Helper function to get the appropriate favorite icon based on mode
 */
function getFavoriteIconSrc(isActive) {
  if (window.RentlyFavoriteInteractions) {
    return window.RentlyFavoriteInteractions.getFavoriteIconSrc(isActive);
  }
  return isActive ? "./icons/favorite-filled.svg" : "./icons/favorite.svg";
}

function scrollToHashTarget(hash = window.location.hash, options = {}) {
  if (window.RentlyMainNavigation) {
    window.RentlyMainNavigation.scrollToHashTarget(hash, options);
  }
}

function stabilizeHashScroll() {
  if (window.RentlyMainNavigation) {
    window.RentlyMainNavigation.stabilizeHashScroll();
  }
}

function navigateToHashUrl(href) {
  if (window.RentlyMainNavigation) {
    window.RentlyMainNavigation.navigateToHashUrl(href);
  }
}

// Function to update all favorite icons with correct paths
function updateAllFavoriteIcons() {
  if (window.RentlyFavoriteInteractions) {
    window.RentlyFavoriteInteractions.updateAllFavoriteIcons();
  }
}

function setFavoriteButtonState(btn, isActive) {
  if (window.RentlyFavoriteInteractions) {
    window.RentlyFavoriteInteractions.setFavoriteButtonState(btn, isActive);
  }
}

async function syncFavoriteButtons() {
  if (window.RentlyFavoriteInteractions) {
    await window.RentlyFavoriteInteractions.syncFavoriteButtons();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (window.RentlyMainNavigation) {
    window.RentlyMainNavigation.initHashNavigation();
    window.RentlyMainNavigation.initHeroImage();
    window.RentlyMainNavigation.initContentBootstrap();
    window.RentlyMainNavigation.initHomeSectionLinks();
  }

  // --- LEARN MORE BUTTON LOGIC ---
  document.addEventListener("click", (e) => {
    const learnMoreBtn = e.target.closest(".learn-more-btn");
    if (!learnMoreBtn) return;

    e.preventDefault();
    e.stopPropagation();

    if (window.RentlyLearnMore) {
      window.RentlyLearnMore.handleButtonClick(learnMoreBtn);
      return;
    }

    window.location.href = "./search.html?page=1";
  });

  // --- GLOBAL EVENT DELEGATION ---

  
  // Card redirect logic (moved after favorite button logic)
  document.addEventListener("click", (e) => {
    // Check if clicking on favorite button first
    const favBtn = e.target.closest(".favorite-btn");
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();

      if (window.RentlyFavoriteInteractions) {
        window.RentlyFavoriteInteractions.handleFavoriteToggle(favBtn, {
          onFavoritesPage: /\/favorites\.html$/i.test(window.location.pathname),
        });
      }
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
