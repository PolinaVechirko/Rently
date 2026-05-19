/**
 * Main entry point and global initialization
 */

function getAppContext() {
  return window.RentlyAppContext || null;
}

function getFavoriteInteractions() {
  return window.RentlyFavoriteInteractions || null;
}

function getMainNavigation() {
  return window.RentlyMainNavigation || null;
}

function getLearnMoreModule() {
  return window.RentlyLearnMore || null;
}

/**
 * Helper function to determine if user is in host mode
 */
function isInHostMode() {
  const appContext = getAppContext();
  if (appContext) {
    return appContext.isInHostMode();
  }

  return (
    window.location.pathname.includes("/host-mode/") ||
    window.location.pathname.includes("host-mode.html")
  );
}

function isInHostModeFolder() {
  const appContext = getAppContext();
  if (appContext) {
    return appContext.isInHostModeFolder();
  }

  return window.location.pathname.includes("/host-mode/");
}

function getHostPropertyViewHref(id) {
  const appContext = getAppContext();
  if (appContext) {
    return appContext.getHostPropertyViewHref(id);
  }

  const base = isInHostModeFolder()
    ? "./property-view.html"
    : "./host-mode/property-view.html";
  return id ? `${base}?id=${encodeURIComponent(id)}` : base;
}

function getHostModeHref(path, query = "") {
  const appContext = getAppContext();
  if (appContext) {
    return appContext.getHostModeHref(path, query);
  }

  const cleanPath = String(path || "").replace(/^\/+/, "");
  const base = isInHostModeFolder()
    ? `./${cleanPath}`
    : `./host-mode/${cleanPath}`;
  return query ? `${base}${query}` : base;
}

function getSearchPageHref(query = "") {
  const appContext = getAppContext();
  if (appContext) {
    return appContext.getSearchPageHref(query);
  }

  const base = isInHostModeFolder() ? "../search.html" : "./search.html";
  return query ? `${base}${query}` : base;
}

function rememberFavoriteChange(id, type, isActive) {
  const favoriteInteractions = getFavoriteInteractions();
  if (favoriteInteractions) {
    favoriteInteractions.rememberFavoriteChange(id, type, isActive);
  }
}

function getRememberedFavoriteState(id, type) {
  const favoriteInteractions = getFavoriteInteractions();
  if (favoriteInteractions) {
    return favoriteInteractions.getRememberedFavoriteState(id, type);
  }
  return null;
}

window.rememberFavoriteChange = rememberFavoriteChange;
window.getRememberedFavoriteState = getRememberedFavoriteState;

/**
 * Helper function to get favorite type based on current mode
 */
function getFavoriteType() {
  const favoriteInteractions = getFavoriteInteractions();
  if (favoriteInteractions) {
    return favoriteInteractions.getFavoriteType();
  }
  return isInHostMode() ? "Host" : "Guest";
}

/**
 * Helper function to get the appropriate favorite icon based on mode
 */
function getFavoriteIconSrc(isActive) {
  const favoriteInteractions = getFavoriteInteractions();
  if (favoriteInteractions) {
    return favoriteInteractions.getFavoriteIconSrc(isActive);
  }
  return isActive ? "./icons/favorite-filled.svg" : "./icons/favorite.svg";
}

function scrollToHashTarget(hash = window.location.hash, options = {}) {
  const navigation = getMainNavigation();
  if (navigation) {
    navigation.scrollToHashTarget(hash, options);
  }
}

function stabilizeHashScroll() {
  const navigation = getMainNavigation();
  if (navigation) {
    navigation.stabilizeHashScroll();
  }
}

function navigateToHashUrl(href) {
  const navigation = getMainNavigation();
  if (navigation) {
    navigation.navigateToHashUrl(href);
  }
}

// Function to update all favorite icons with correct paths
function updateAllFavoriteIcons() {
  const favoriteInteractions = getFavoriteInteractions();
  if (favoriteInteractions) {
    favoriteInteractions.updateAllFavoriteIcons();
  }
}

function setFavoriteButtonState(btn, isActive) {
  const favoriteInteractions = getFavoriteInteractions();
  if (favoriteInteractions) {
    favoriteInteractions.setFavoriteButtonState(btn, isActive);
  }
}

async function syncFavoriteButtons() {
  const favoriteInteractions = getFavoriteInteractions();
  if (favoriteInteractions) {
    await favoriteInteractions.syncFavoriteButtons();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const navigation = getMainNavigation();
  if (navigation) {
    navigation.initHashNavigation();
    navigation.initHeroImage();
    navigation.initContentBootstrap();
    navigation.initHomeSectionLinks();
  }

  document.addEventListener("click", (e) => {
    const learnMoreBtn = e.target.closest(".learn-more-btn");
    if (!learnMoreBtn) return;

    e.preventDefault();
    e.stopPropagation();

    const learnMoreModule = getLearnMoreModule();
    if (learnMoreModule) {
      learnMoreModule.handleButtonClick(learnMoreBtn);
      return;
    }

    window.location.href = getSearchPageHref("?page=1");
  });

  document.addEventListener("click", (e) => {
    const favBtn = e.target.closest(".favorite-btn");
    if (favBtn) {
      e.preventDefault();
      e.stopPropagation();

      const favoriteInteractions = getFavoriteInteractions();
      if (favoriteInteractions) {
        favoriteInteractions.handleFavoriteToggle(favBtn, {
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

  const setSearchErrorVisibility = (isVisible) => {
    const errorMsg = document.getElementById("search-error-msg");
    if (!errorMsg) return;
    errorMsg.classList.toggle("visible", isVisible);
    errorMsg.style.display = isVisible ? "block" : "none";
  };

  const setSearchInputState = (input, hasError) => {
    const group = input?.closest(".search-input-group");
    if (!group) return;
    group.style.boxShadow = hasError
      ? "0 0 10px 3px #D5D5D6, inset 0 0 10px rgba(255, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 0, 0, 0.7)"
      : "0 0 10px 3px #D5D5D6";
  };

  if (!homeSearchManaged) {
    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        let isValid = true;

        [locInput, checkinInput, checkoutInput].forEach((inp) => {
          if (inp) {
            if (!inp.value.trim()) {
              setSearchInputState(inp, true);
              isValid = false;
            } else {
              setSearchInputState(inp, false);
            }
          }
        });

        if (!isValid) {
          setSearchErrorVisibility(true);
          return;
        }

        setSearchErrorVisibility(false);
        window.location.href = getSearchPageHref(
          `?location=${encodeURIComponent(locInput.value)}&checkin=${checkinInput.value}&checkout=${checkoutInput.value}`,
        );
      });
    }

    if (locInput) {
      const datalist = document.getElementById("city-suggestions");
      window.RentlySearchLocationAutocomplete?.initLocationAutocomplete?.(
        locInput,
        datalist,
      );
    }

    [locInput, checkinInput, checkoutInput].forEach((inp) => {
      if (inp) {
        const handler = function () {
          if (this.value.trim()) {
            setSearchInputState(this, false);

            const allFilled = [locInput, checkinInput, checkoutInput].every((i) =>
              i.value.trim(),
            );
            if (allFilled) {
              setSearchErrorVisibility(false);
            }
          }
        };
        inp.addEventListener("input", handler);
        inp.addEventListener("change", handler);
      }
    });
  }

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

  document
    .querySelectorAll(".horizontal-scroll-container")
    .forEach((container) => {
      if (typeof initScrollSnapping === "function") {
        initScrollSnapping(container, ".horizontal-scroll-track");
      }
    });

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
      window.location.href = getSearchPageHref(
        `?location=${encodeURIComponent(cityName)}`,
      );
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
