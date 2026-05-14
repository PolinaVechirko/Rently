/**
 * Rendering functions for dynamic content
 */

async function renderCities() {
  const grid = document.getElementById("cities-grid");
  if (!grid) return;

  const assetBase = getAssetBase();
  const cityImages = {
    Bangkok: `${assetBase}images/cities/Bangkok.png`,
    Dubai: `${assetBase}images/cities/Dubai.png`,
    Istanbul: `${assetBase}images/cities/Istanbul.png`,
    London: `${assetBase}images/cities/London.png`,
    Madrid: `${assetBase}images/cities/Madrid.png`,
    Milan: `${assetBase}images/cities/Milan.png`,
    Paris: `${assetBase}images/cities/Paris.png`,
    Rome: `${assetBase}images/cities/Rome.png`,
    Seoul: `${assetBase}images/cities/Seoul.png`,
    Singapore: `${assetBase}images/cities/Singapore.png`,
  };

  const citiesOrder = Object.keys(cityImages);

  // Lightweight placeholder while loading
  grid.innerHTML = citiesOrder
    .map(() => `<div class="city-card" style="background:#d3d3d3"></div>`)
    .join("");

  const formatCompact = (value) => {
    const n = Number(value || 0);
    try {
      return new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
    } catch {
      if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
      if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
      return String(n);
    }
  };

  let stats = [];
  try {
    const resp = await fetch(`/api/Analytics/city-stats?count=50`);
    if (resp.ok) stats = await resp.json();
  } catch (e) {
    console.error("Failed to load city stats:", e);
  }

  const byCity = new Map((stats || []).map((s) => [s.city || s.City, s]));

  let html = "";
  citiesOrder.forEach((name) => {
    const s = byCity.get(name) || {};
    const homes = s.activeHomesCount ?? s.ActiveHomesCount ?? 0;
    const visitors = s.visitorsCount ?? s.VisitorsCount ?? 0;

    html += `
            <div class="city-card" style="background-image: url('${cityImages[name]}')">
                <h4 class="city-name">${name}</h4>
                <div class="city-stat-home city-stat-group">
                    <img src="${assetBase}icons/home.svg" alt="home" class="city-stat-icon">
                    <span class="city-stat-value">${formatCompact(homes)}</span>
                </div>
                <div class="city-stat-users city-stat-group">
                    <span class="city-stat-value">${formatCompact(visitors)}</span>
                    <img src="${assetBase}icons/users.svg" alt="users" class="city-stat-icon">
                </div>
            </div>
        `;
  });
  grid.innerHTML = html;
}

async function renderAmenities() {
  const grid = document.querySelector(".amenities-grid");
  if (!grid) return;

  const assetBase = getAssetBase();

  // Icon mapping based on amenity names from SeedData.cs
  const iconMap = {
    TV: "tv.svg",
    Kitchen: "kitchen.svg",
    Heating: "heating.svg",
    "Dedicated Workspace": "workspace.svg",
    Washer: "washer.svg",
    "Pets Allowed": "pets.svg",
    Balcony: "balcony.svg",
    "Self Check-in": "selfcheckin.svg",
    Crib: "crib.svg",
    Pool: "pool.svg",
    Dryer: "dryer.svg",
    Iron: "iron.svg",
    "Smoke Alarm": "smokealarm.svg",
    "First Aid Kit": "firstaidkit.svg",
    "Wi-Fi": "wifi.svg",
    "Free Parking": "freeParking.svg",
    "Air Conditioning": "airConditioning.svg",
    Gym: "gym.svg",
    "Meal Service": "mealService.svg",
  };

  try {
    const response = await fetch("/api/Analytics/top-amenities?count=6");
    if (!response.ok) throw new Error("API error");
    const topAmenities = (await response.json()).slice(0, 6);

    let html = "";
    topAmenities.forEach((item) => {
      const iconFile = iconMap[item.name] || "wifi.svg";
      html += `
                <button class="amenity-btn" data-amenity-name="${item.name}">
                    <img src="${assetBase}icons/${iconFile}" alt="${item.name}" class="amenity-icon">
                    <span class="amenity-label">${item.name}</span>
                </button>
            `;
    });

    if (html) {
      grid.innerHTML = html;
    }
  } catch (err) {
    console.error("Failed to fetch top amenities:", err);
    // Fallback or handle error
  }
}

function getAssetBase() {
  const isSubfolder =
    window.location.pathname.includes("/host-mode/") &&
    !window.location.pathname.includes("host-mode.html");
  return isSubfolder ? "../" : "./";
}

function isInHostMode() {
  return (
    window.location.pathname.includes("/host-mode/") ||
    window.location.pathname.includes("host-mode.html")
  );
}

function isInHostModeFolder() {
  return window.location.pathname.includes("/host-mode/");
}

function getHostModeHref(path, query = "") {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const base = isInHostModeFolder()
    ? `./${cleanPath}`
    : `./host-mode/${cleanPath}`;
  return query ? `${base}${query}` : base;
}

function getHostPropertyViewHref(id) {
  const query = id ? `?id=${encodeURIComponent(id)}` : "";
  return getHostModeHref("property-view.html", query);
}

async function getFavoriteIds() {
  try {
    const token = localStorage.getItem("auth_token") || "";
    if (!token) return [];

    const resp = await fetch("/api/Favorites", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!resp.ok) return [];

    const data = await resp.json();
    if (!Array.isArray(data)) return [];

    const inHostMode = isInHostMode();

    // Filter favorites based on current mode
    return data
      .filter((fav) => {
        // Support both old format (accommodation object) and new format (with types)
        if (inHostMode) {
          return (
            fav.isHostFavorite === true || (fav.accommodation && !fav.types)
          );
        } else {
          return (
            fav.isGuestFavorite === true || (fav.accommodation && !fav.types)
          );
        }
      })
      .map((fav) => {
        // Handle new format with nested accommodation
        if (fav.accommodation) {
          return fav.accommodation.id ?? fav.accommodation.Id;
        }
        // Handle old format
        return fav.id ?? fav.Id;
      })
      .filter((value) => value !== null && value !== undefined);
  } catch (error) {
    console.debug("Could not load favorite ids:", error);
    return [];
  }
}

function getOptimizedImageUrl(url, width = 720) {
  if (!url) return "";
  if (
    url.startsWith("data:") ||
    /^https?:\/\//i.test(url) ||
    url.includes("/api/Images")
  )
    return url;
  return `/api/Images/resize?url=${encodeURIComponent(url)}&width=${width}`;
}

let _learnMoreCollageInFlight = null;

async function getLearnMoreCollageImages(assetBase) {
  const storageKey = "rently_learn_more_collage_v2";
  try {
    const cached = sessionStorage.getItem(storageKey);
    if (cached) {
      const images = JSON.parse(cached);
      if (Array.isArray(images) && images.length === 4) {
        return images.map((img) => getOptimizedImageUrl(img, 400));
      }
    }
  } catch {
    sessionStorage.removeItem(storageKey);
  }

  const photosOf = (item) => {
    const raw = item.photos || item.Photos || [];
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  };

  const runFetch = async () => {
    try {
      const response = await fetch(
        "/api/Accommodations/homepage/highest-rated?count=32",
      );
      if (!response.ok) throw new Error("collage api");
      const data = await response.json();
      const listings = (Array.isArray(data) ? data : []).filter(
        (item) => photosOf(item).length > 0,
      );

      for (let i = listings.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [listings[i], listings[j]] = [listings[j], listings[i]];
      }

      const picked = [];
      const seen = new Set();
      for (const item of listings) {
        for (const url of photosOf(item)) {
          if (!seen.has(url)) {
            seen.add(url);
            picked.push(url);
            if (picked.length >= 4) break;
          }
        }
        if (picked.length >= 4) break;
      }

      while (picked.length < 4) {
        picked.push(`${assetBase}images/hero${picked.length + 1}.png`);
      }

      const four = picked.slice(0, 4);
      sessionStorage.setItem(storageKey, JSON.stringify(four));
      return four.map((img) => getOptimizedImageUrl(img, 400));
    } catch {
      const fallbacks = [
        `${assetBase}images/hero1.png`,
        `${assetBase}images/hero2.png`,
        `${assetBase}images/hero3.png`,
        `${assetBase}images/hero4.png`,
      ];
      return fallbacks.map((img) => getOptimizedImageUrl(img, 400));
    }
  };

  if (!_learnMoreCollageInFlight) {
    _learnMoreCollageInFlight = runFetch().finally(() => {
      _learnMoreCollageInFlight = null;
    });
  }
  return _learnMoreCollageInFlight;
}

async function renderAccommodations(
  trackId,
  useType2 = false,
  hideHeart = false,
  showHostActions = false,
  isGrid = false,
  count = 16,
) {
  const track = document.getElementById(trackId);
  if (!track) return;

  const assetBase = getAssetBase();
  const favoriteIds = await getFavoriteIds();

  // Price calculation logic
  const searchParams = new URLSearchParams(window.location.search);
  const checkinData =
    searchParams.get("checkin") || searchParams.get("checkIn") || "";
  const checkoutData =
    searchParams.get("checkout") || searchParams.get("checkOut") || "";
  let nights = 0;
  if (checkinData && checkoutData) {
    const start = new Date(checkinData);
    const end = new Date(checkoutData);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
      nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
  }

  track.innerHTML = Array.from({ length: isGrid ? 8 : 4 })
    .map(
      () => `
            <div class="accommodation-card skeleton-card">
                <div class="skeleton-box skeleton-img"></div>
                <div class="acc-info">
                    <div class="skeleton-box skeleton-title"></div>
                    <div class="skeleton-box skeleton-desc"></div>
                    <div class="skeleton-box skeleton-desc short"></div>
                </div>
            </div>
        `,
    )
    .join("");

  try {
    let apiUrl = `/api/Accommodations?limit=${count}`;
    if (trackId === "inspiration-track") {
      apiUrl = `/api/Accommodations/homepage/most-visited?count=${count}`;
    }
    if (trackId === "accommodations-track") {
      apiUrl = `/api/Accommodations/homepage/highest-rated?count=${count}`;
    } else if (trackId === "most-visited-track-1") {
      apiUrl = `/api/Accommodations/homepage/most-visited?count=${count}&skip=0`;
    } else if (trackId === "most-visited-track-2") {
      apiUrl = `/api/Accommodations/homepage/most-visited?count=${count}&skip=16`;
    }

    const response = await fetch(apiUrl);
    const apiData = await response.json();

    if (apiData.length === 0 && count === 0) {
      track.innerHTML = `
                <div class="empty-state-placeholder">
                    <p>You don't have any apartments for this section yet.</p>
                </div>
            `;
      return;
    }

    let html = "";
    apiData.forEach((item, index) => {
      const displayRating = item.averageRating
        ? item.averageRating.toFixed(2)
        : "5.00";
      const reviewsCount = item.reviewsCount || 0;
      const housingType = item.propertyType;
      const rawPhoto =
        item.photos && item.photos.length > 0
          ? item.photos[0]
          : `${assetBase}images/hero${(index % 4) + 1}.png`;
      const photo = getOptimizedImageUrl(rawPhoto, 600);
      const location = `${item.country || "Unknown"}, ${item.city || "City"}`;
      const title = item.title || item.propertyType || "Property";
      const description =
        item.description ||
        "Beautiful and cozy place to stay with amazing view and top-notch amenities.";
      const isFavorite = favoriteIds.includes(item.id);
      const cardClass = useType2
        ? "accommodation-card type-2"
        : "accommodation-card";

      const priceVal = item.pricePerNight || 0;
      const totalPrice = nights > 0 ? priceVal * nights : priceVal;
      const priceDisplay =
        nights > 0
          ? `$${totalPrice.toLocaleString()}`
          : `$${priceVal.toLocaleString()}`;
      const priceSubtext =
        nights > 0
          ? `<span class="price-tag-total">Total for ${nights} ${nights === 1 ? "night" : "nights"}</span>`
          : " / night";

      html += `
                <div class="${cardClass}${showHostActions ? " host-clickable-card" : " inspiration-clickable-card"}"${showHostActions || !showHostActions ? ' style="cursor:pointer;"' : ""} data-id="${item.id}">
                    <div class="acc-img-wrapper">
                        <img src="${photo}" class="acc-img" alt="${housingType}">
                        <div class="price-tag-overlay">
                            ${priceDisplay}
                            ${nights > 0 ? priceSubtext : ""}
                        </div>
                        ${
                          showHostActions
                            ? `
                        <div class="host-card-actions">
                            <button class="host-action-btn edit-btn" title="Edit Listing" data-id="${item.id}">
                                <span style="font-size: 18px;">✎</span>
                            </button>
                            <button class="host-action-btn delete-btn" title="Delete Listing" data-id="${item.id}">
                                <img src="${assetBase}icons/x.svg" alt="delete">
                            </button>
                        </div>
                        `
                            : ""
                        }
                        ${
                          !hideHeart && !showHostActions
                            ? `
                        <button class="favorite-btn ${isFavorite ? "active" : ""}" data-id="${item.id || item.Id}" aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}">
                            <img src="${getFavoriteIconSrc(isFavorite)}" alt="heart">
                        </button>
                        `
                            : ""
                        }
                    </div>
                    <div class="acc-info">
                        <div class="acc-header">
                            <div class="acc-type-group">
                                <div class="acc-type">${housingType}</div>
                                ${
                                  useType2
                                    ? `
                                <div class="acc-location">
                                    <img src="${assetBase}icons/locationIcon.svg" class="acc-loc-icon" alt="loc">
                                    <span class="acc-loc-text">${location}</span>
                                </div>
                                `
                                    : ""
                                }
                            </div>
                            <div class="acc-rating">
                                <img src="${assetBase}icons/star.svg" class="star-icon" alt="star">
                                <span>${displayRating}(${reviewsCount})</span>
                            </div>
                        </div>
                        ${useType2 ? `<div class="acc-desc">${description}</div>` : ""}
                    </div>
                </div>
            `;
    });

    if (!isGrid) {
      const collageImages = await getLearnMoreCollageImages(assetBase);
      html += `
            <div class="accommodation-card learn-more-card inspiration-learn-more">
                <div class="acc-img-wrapper learn-more-photo-wrapper">
                    <div class="learn-more-collage">
                        <img src="${collageImages[0]}" alt="">
                        <img src="${collageImages[1]}" alt="">
                        <img src="${collageImages[2]}" alt="">
                        <img src="${collageImages[3]}" alt="">
                    </div>
                    <button type="button" class="learn-more-btn">Learn more</button>
                </div>
            </div>
        `;
    }

    track.innerHTML = html;
    
    // Add direct event listeners to favorite buttons with small delay to ensure DOM is ready
    setTimeout(() => {
      track.querySelectorAll(".favorite-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Direct favorite button click", btn);
        
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true" || !!localStorage.getItem("auth_token");
        if (!isLoggedIn) {
          const loginPath = window.location.pathname.includes("/host-mode/")
            ? "../login.html"
            : "./login.html";
          window.location.href = loginPath;
          return;
        }

        const id = btn.dataset.id || btn.getAttribute("data-id");
        if (!id) {
          btn.classList.toggle("active");
          return;
        }

        const token = localStorage.getItem("auth_token") || "";
        const isHostMode = window.location.pathname.includes("/host-mode/") || window.location.pathname.includes("host-mode.html");
        const favoriteType = isHostMode ? "Host" : "Guest";
        
        try {
          const isActive = btn.classList.contains("active");
          console.log("Direct favorite toggle:", { id, isActive, favoriteType, pathname: window.location.pathname });
          
          if (isActive) {
            const resp = await fetch(`/api/Favorites/${id}?type=${favoriteType}`, {
              method: "DELETE",
              headers: { 
                "Authorization": "Bearer " + token
              }
            });
            console.log("Direct remove response:", resp.status);
            if (!resp.ok && resp.status !== 204 && resp.status !== 404) throw new Error("Failed to remove favorite");
            btn.classList.remove("active");
            const img = btn.querySelector("img");
            if (img) img.src = getFavoriteIconSrc(false);
            if (typeof window.rememberFavoriteChange === "function") {
              window.rememberFavoriteChange(id, favoriteType, false);
            }
          } else {
            const stateResp = await fetch(`/api/Favorites/${id}`, {
              headers: {
                "Authorization": "Bearer " + token
              }
            });
            if (stateResp.ok) {
              const stateData = await stateResp.json();
              const alreadyActive = favoriteType === "Host"
                ? stateData?.hostFavorited === true
                : stateData?.guestFavorited === true;
              if (alreadyActive) {
                btn.classList.add("active");
                const img = btn.querySelector("img");
                if (img) img.src = getFavoriteIconSrc(true);
                if (typeof window.rememberFavoriteChange === "function") {
                  window.rememberFavoriteChange(id, favoriteType, true);
                }
                return;
              }
            }

            const resp = await fetch(`/api/Favorites/${id}?type=${favoriteType}`, {
              method: "POST",
              headers: { 
                "Authorization": "Bearer " + token
              }
            });
            console.log("Direct add response:", resp.status);
            if (!resp.ok && resp.status !== 409) throw new Error("Failed to add favorite");
            btn.classList.add("active");
            const img = btn.querySelector("img");
            if (img) img.src = getFavoriteIconSrc(true);
            if (typeof window.rememberFavoriteChange === "function") {
              window.rememberFavoriteChange(id, favoriteType, true);
            }
          }
        } catch (err) {
          console.error("Direct favorite error:", err);
        }
      });
      });
    }, 100);
  } catch (error) {
    console.error("Failed to render accommodations:", error);
  }
}

async function renderMyBookingPage(
  activeContainerId,
  upcomingContainerId,
  historyContainerId,
) {
  const activeContainer = document.getElementById(activeContainerId);
  const upcomingContainer = document.getElementById(upcomingContainerId);
  const historyContainer = document.getElementById(historyContainerId);
  if (!activeContainer || !upcomingContainer || !historyContainer) return;

  const assetBase = getAssetBase();
  const loadingState = `
        <div class="empty-state-card">
            <div class="empty-state-content">
                <span class="empty-state-title">Loading...</span>
                <p class="empty-state-text">Loading your bookings...</p>
            </div>
        </div>
  `;
  activeContainer.innerHTML = loadingState;
  upcomingContainer.innerHTML = loadingState;
  historyContainer.innerHTML = loadingState;

  const buildEmptyState = (title, text) => `
        <div class="empty-state-card">
            <div class="empty-state-content">
                <span class="empty-state-title">${title}</span>
                <p class="empty-state-text">${text}</p>
            </div>
        </div>
  `;

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const statusClassMap = {
    Pending: "status-pending",
    Confirmed: "status-confirmed",
    Cancelled: "status-cancelled",
    Completed: "status-completed",
  };

  const renderBookingsGroup = (container, bookings, emptyTitle, emptyText) => {
    if (!Array.isArray(bookings) || bookings.length === 0) {
      container.innerHTML = buildEmptyState(emptyTitle, emptyText);
      return;
    }

    let html = "";
    bookings.forEach((booking, index) => {
      const photo = booking.accommodationPhotoUrl
        ? getOptimizedImageUrl(booking.accommodationPhotoUrl, 700)
        : `${assetBase}images/hero${(index % 4) + 1}.png`;
      const place = [booking.accommodationCountry, booking.accommodationCity]
        .filter(Boolean)
        .join(", ");
      const pricePerNight = booking.pricePerNight
        ? Number(booking.pricePerNight).toFixed(2)
        : "0.00";
      const stayNights = Math.max(
        1,
        Math.ceil(
          (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const totalPrice = (Number(pricePerNight) * stayNights).toFixed(2);
      const status = booking.status || "Pending";
      const statusClass = statusClassMap[status] || "status-pending";
      const isPending = status === "Pending";
      const cardClass = booking.__section === "history"
        ? "history-card history-card-muted"
        : "history-card";
      const actionButton = isPending && booking.__section === "upcoming"
        ? `
                            <button class="booking-cancel-btn" data-booking-id="${booking.id}">
                                <span>Cancel booking</span>
                            </button>
                            <a class="add-comment-btn" href="./property.html?id=${booking.accommodationId}">
                                <span>View stay</span>
                                <img src="${assetBase}icons/arrowDown.svg" alt="go">
                            </a>
                          `
        : `
                            <a class="add-comment-btn" href="./property.html?id=${booking.accommodationId}">
                                <span>View stay</span>
                                <img src="${assetBase}icons/arrowDown.svg" alt="go">
                            </a>
                          `;

      html += `
            <div class="${cardClass}">
                <div class="history-card-img">
                    <img src="${photo}" alt="${booking.accommodationType || "Property"}">
                </div>
                <div class="history-card-info">
                    <div class="history-card-top">
                        <h3 class="history-card-name">${booking.accommodationType || "Booked stay"}</h3>
                        <div class="history-card-location">
                            <img src="${assetBase}icons/locationIcon.svg" alt="loc">
                            <span>${place || booking.accommodationTitle || "Unknown location"}</span>
                        </div>
                        <div class="history-dates">
                            <img src="${assetBase}icons/calendar.svg" alt="cal" class="history-cal-icon">
                            <span>${formatDate(booking.checkInDate)} — ${formatDate(booking.checkOutDate)}</span>
                        </div>
                        <div class="history-price">${pricePerNight} / night · Total: ${totalPrice}</div>
                        <div class="mt-2"><span class="booking-status ${statusClass}">${status}</span></div>
                    </div>
                    <div class="history-card-bottom">
                        <div class="history-comment-area">
                            ${actionButton}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
  };

  try {
    const token = localStorage.getItem("auth_token") || "";
    const response = await fetch("/api/Bookings/my-bookings", {
      headers: { Authorization: "Bearer " + token },
    });

    if (response.status === 401) {
      const unauthorizedState = buildEmptyState(
        "Sign In Required",
        "Sign in to see your bookings.",
      );
      activeContainer.innerHTML = unauthorizedState;
      upcomingContainer.innerHTML = unauthorizedState;
      historyContainer.innerHTML = unauthorizedState;
      return;
    }

    if (!response.ok) {
      const errorState = buildEmptyState(
        "An issue occurred",
        "Could not load your bookings.",
      );
      activeContainer.innerHTML = errorState;
      upcomingContainer.innerHTML = errorState;
      historyContainer.innerHTML = errorState;
      return;
    }

    const bookings = await response.json();
    const safeBookings = Array.isArray(bookings) ? bookings : [];
    const now = new Date();
    const activeBookings = safeBookings.filter((booking) => {
      const status = String(booking.status || "");
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      if (status !== "Confirmed") return false;
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
        return false;
      }
      return checkIn <= now && checkOut >= now;
    });
    const upcomingBookings = safeBookings.filter((booking) => {
      if (activeBookings.includes(booking)) return false;
      const status = String(booking.status || "");
      const checkIn = new Date(booking.checkInDate);
      if (status === "Pending") return true;
      if (status === "Confirmed") {
        return !Number.isNaN(checkIn.getTime()) && checkIn > now;
      }
      return false;
    });
    const historyBookings = safeBookings.filter((booking) => {
      return !activeBookings.includes(booking) && !upcomingBookings.includes(booking);
    });

    activeBookings.forEach((booking) => {
      booking.__section = "active";
    });
    upcomingBookings.forEach((booking) => {
      booking.__section = "upcoming";
    });
    historyBookings.forEach((booking) => {
      booking.__section = "history";
    });

    renderBookingsGroup(
      activeContainer,
      activeBookings,
      "No active bookings yet.",
      "There are no apartment cards in this section yet.",
    );
    renderBookingsGroup(
      upcomingContainer,
      upcomingBookings,
      "No upcoming bookings yet.",
      "There are no apartment cards in this section yet.",
    );
    renderBookingsGroup(
      historyContainer,
      historyBookings,
      "No booking history yet.",
      "There are no apartment cards in this section yet.",
    );
  } catch (error) {
    console.error("Failed to load booking history:", error);
    const failureState = buildEmptyState(
      "Error",
      "Error loading your bookings.",
    );
    activeContainer.innerHTML = failureState;
    upcomingContainer.innerHTML = failureState;
    historyContainer.innerHTML = failureState;
  }
}

// Render user's favorites by fetching from API
async function renderFavorites(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const assetBase = getAssetBase();
  container.innerHTML = `
        <div class="empty-state-card">
            <div class="empty-state-content">
                <span class="empty-state-title">Loading...</span>
                <p class="empty-state-text">Loading your favorites...</p>
            </div>
        </div>
  `;
  try {
    const token = localStorage.getItem("auth_token") || "";
    const resp = await fetch("/api/Favorites", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!resp.ok) {
      container.innerHTML = `
        <div class="empty-state-card">
            <div class="empty-state-content">
                <span class="empty-state-title">Could not load favorites</span>
                <p class="empty-state-text">Please sign in or try again later.</p>
            </div>
        </div>
      `;
      return;
    }
    const rawData = await resp.json();
    const data = Array.isArray(rawData)
      ? rawData.filter((item) =>
          isInHostMode()
            ? item.isHostFavorite === true
            : item.isGuestFavorite === true,
        )
      : [];
    if (data.length === 0) {
      container.innerHTML = isInHostMode()
        ? `
        <div class="host-empty-card">
            <div class="host-empty-card-content">
                <span class="host-empty-card-title">No favorites yet.</span>
            </div>
        </div>
      `
        : `
        <div class="empty-state-card">
            <div class="empty-state-content">
                <span class="empty-state-title">You have no favorites yet.</span>
                <p class="empty-state-text">Find places you love and add them to your favorites to easily access them later.</p>
            </div>
        </div>
      `;
      return;
    }

    let html = "";
    data.forEach((item, i) => {
      const displayItem = item.accommodation ? item.accommodation : item;
      const photo =
        displayItem.photos && displayItem.photos.length > 0
          ? getOptimizedImageUrl(displayItem.photos[0], 600)
          : `${assetBase}images/hero1.png`;
      const loc = `${displayItem.country || ""}, ${displayItem.city || ""}`;
      const priceVal = displayItem.pricePerNight || 0;
      const priceDisplay = `$${priceVal.toLocaleString()}`;

      html += `
                <div class="accommodation-card type-2 inspiration-clickable-card" data-id="${displayItem.id}" style="cursor:pointer;">
                    <div class="acc-img-wrapper">
                        <img src="${photo}" class="acc-img" alt="${displayItem.propertyType}">
                        <div class="price-tag-overlay">${priceDisplay}</div>
                        <button class="favorite-btn active" data-id="${displayItem.id}" aria-label="Remove from favorites"><img src="${getFavoriteIconSrc(true)}" alt="heart"></button>
                    </div>
                    <div class="acc-info">
                        <div class="acc-header">
                            <div class="acc-type-group">
                                <div class="acc-type">${displayItem.propertyType}</div>
                                <div class="acc-location">
                                    <img src="${assetBase}icons/locationIcon.svg" class="acc-loc-icon" alt="loc">
                                    <span class="acc-loc-text">${loc}</span>
                                </div>
                            </div>
                            <div class="acc-rating"><img src="${assetBase}icons/star.svg" class="star-icon" alt="star"><span>${displayItem.averageRating?.toFixed(2) || "5.00"} (${displayItem.reviewsCount || 0})</span></div>
                        </div>
                        <div class="acc-desc">${displayItem.description || ""}</div>
                    </div>
                </div>
              `;
    });
    container.innerHTML = html;
    
    // Add click handlers for cards (but not for favorite buttons)
    container.querySelectorAll(".inspiration-clickable-card").forEach(card => {
      card.addEventListener("click", (e) => {
        // Don't navigate if clicking on favorite button
        if (e.target.closest(".favorite-btn")) return;
        
        const id = card.getAttribute("data-id");
        if (id) {
          // Open in property-view (host mode view)
          window.location.href = isInHostMode()
            ? getHostPropertyViewHref(id)
            : `./property.html?id=${encodeURIComponent(id)}`;
        }
      });
    });
  } catch (e) {
    console.error("Failed to load favorites:", e);
    container.innerHTML = `
        <div class="empty-state-card">
            <div class="empty-state-content">
                <span class="empty-state-title">Error</span>
                <p class="empty-state-text">Error loading favorites</p>
            </div>
        </div>
    `;
  }
}

async function renderSearchResultsRows(
  containerId,
  rowsCount = 8,
  cardsPerRow = 6,
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const location = params.get("location") || "";
  const type = params.get("type") || "";
  let sortBy = params.get("sort") || "";
  const sortNorm = sortBy.toLowerCase().replace(/\+/g, " ").trim();
  if (sortNorm === "top rated") sortBy = "highest_rated";
  else if (sortNorm === "popularity" || sortNorm === "most visited") {
    sortBy = "most_visited";
  }
  const page = parseInt(params.get("page") || "1");
  const limit = rowsCount * cardsPerRow;
  const skip = (page - 1) * limit;

  // Show loading placeholder
  container.innerHTML = `<div class="results-loading-placeholder" style="padding: 50px; text-align: center;"><h3>Finding perfect places for you...</h3></div>`;

  try {
    const minPrice = params.get("minPrice") || "";
    const maxPrice = params.get("maxPrice") || "";
    const rooms = params.get("rooms") || "";
    const beds = params.get("beds") || "";
    const amenities = params.get("amenities") || "";
    const types = params.get("types") || (type ? type : "");
    const checkin = params.get("checkin") || params.get("checkIn") || "";
    const checkout = params.get("checkout") || params.get("checkOut") || "";
    const guests = params.get("guests") || "";

    let apiUrl = `/api/Accommodations/search?limit=${limit}&skip=${skip}`;
    if (location) apiUrl += `&location=${encodeURIComponent(location)}`;
    if (minPrice) apiUrl += `&minPrice=${minPrice}`;
    if (maxPrice) apiUrl += `&maxPrice=${maxPrice}`;
    if (rooms) apiUrl += `&rooms=${rooms}`;
    if (beds) apiUrl += `&beds=${beds}`;
    if (checkin) apiUrl += `&checkIn=${checkin}`;
    if (checkout) apiUrl += `&checkOut=${checkout}`;
    if (guests) apiUrl += `&guests=${guests}`;
    if (amenities) apiUrl += `&amenities=${encodeURIComponent(amenities)}`;
    if (types) apiUrl += `&types=${encodeURIComponent(types)}`;

    if (sortBy) apiUrl += `&sortBy=${encodeURIComponent(sortBy)}`;

    const response = await fetch(apiUrl);
    const payload = await response.json();
    const data = payload.items || payload.Items || [];
    const total = payload.total ?? payload.Total ?? 0;

    if (!data || data.length === 0) {
      container.innerHTML = `
                <div class="no-results-placeholder" style="text-align: center; padding: 100px 0;">
                    <h2>No accommodations found</h2>
                    <p>Try adjusting your filters or location to find more results.</p>
                </div>
            `;
      return;
    }

    let html = "";
    const assetBase = getAssetBase();
    const favoriteIds = await getFavoriteIds();

    let nights = 0;
    if (checkin && checkout) {
      const start = new Date(checkin);
      const end = new Date(checkout);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      }
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);

    html += `
            <div class="mt-4">
                <h4 class="search-row-title" style="font-size: 24px; margin-top: 30px; margin-bottom: 20px; font-weight: 700;">
                    Search Results <span style="color:#6b7280; font-weight:500; font-size:16px;">(${total})</span>
                </h4>
        `;

    for (let r = 0; r < rowsCount; r++) {
      const rowData = data.slice(r * cardsPerRow, (r + 1) * cardsPerRow);
      if (rowData.length === 0) break;

      const mtClass = r === 0 ? "mt-3" : "mt-3";

      html += `
                <div class="${mtClass}">
                    <div class="horizontal-scroll-container">
                        <div class="horizontal-scroll-track results-grid">
            `;

      rowData.forEach((item, i) => {
        let displayRating = item.averageRating
          ? item.averageRating.toFixed(2)
          : "5.00";
        let reviewsCount = item.reviewsCount || 0;
        let rawPhoto =
          item.photos && item.photos.length > 0
            ? item.photos[0]
            : `${assetBase}images/hero${(i % 4) + 1}.png`;
        let photo = getOptimizedImageUrl(rawPhoto, 600);
        let loc = `${item.country || ""}, ${item.city || ""}`;

        const isFavorite = favoriteIds.includes(item.id);

        const priceVal = item.pricePerNight || 0;
        const totalPrice = nights > 0 ? priceVal * nights : priceVal;
        const priceDisplay =
          nights > 0
            ? `$${totalPrice.toLocaleString()}`
            : `$${priceVal.toLocaleString()}`;
        const priceSubtext =
          nights > 0
            ? `<span class="price-tag-total">Total for ${nights} ${nights === 1 ? "night" : "nights"}</span>`
            : " / night";

        html += `
                    <div class="accommodation-card type-2 inspiration-clickable-card" data-id="${item.id}" style="cursor:pointer;">
                        <div class="acc-img-wrapper">
                            <img src="${photo}" class="acc-img" alt="${item.propertyType}">
                            <div class="price-tag-overlay">
                                ${priceDisplay}
                                ${nights > 0 ? priceSubtext : ""}
                            </div>
                            <button class="favorite-btn ${isFavorite ? "active" : ""}" data-id="${item.id || item.Id}" aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}">
                                <img src="${assetBase}icons/favorite.svg" alt="heart">
                            </button>
                        </div>
                        <div class="acc-info">
                            <div class="acc-header">
                                <div class="acc-type-group">
                                    <div class="acc-type">${item.propertyType}</div>
                                    <div class="acc-location">
                                        <img src="${assetBase}icons/locationIcon.svg" class="acc-loc-icon" alt="loc">
                                        <span class="acc-loc-text">${loc}</span>
                                    </div>
                                </div>
                                <div class="acc-rating">
                                    <img src="${assetBase}icons/star.svg" class="star-icon" alt="star">
                                    <span>${displayRating}(${reviewsCount})</span>
                                </div>
                            </div>
                            <div class="acc-desc">${item.description || ""}</div>
                        </div>
                    </div>
                `;
      });

      html += `
                        </div>
                    </div>
                </div>
            `;
    }

    html += `
            </div>
        `;

    const buildPageItems = () => {
      const items = [];
      const push = (p, label = null, isActive = false, isDisabled = false) => {
        items.push({ p, label: label ?? String(p), isActive, isDisabled });
      };
      const pushEllipsis = () =>
        items.push({ p: null, label: "…", isActive: false, isDisabled: true });

      const windowSize = 2;
      const start = Math.max(2, safePage - windowSize);
      const end = Math.min(totalPages - 1, safePage + windowSize);

      push(1, "1", safePage === 1);
      if (start > 2) pushEllipsis();
      for (let p = start; p <= end; p++) push(p, String(p), safePage === p);
      if (end < totalPages - 1) pushEllipsis();
      if (totalPages > 1)
        push(totalPages, String(totalPages), safePage === totalPages);

      return items;
    };

    const pageItems = buildPageItems();

    html += `
            <div class="pagination-footer">
                <button class="pagination-btn prev-btn" ${safePage <= 1 ? "disabled" : ""} aria-label="Previous page">←</button>
                <div class="pagination-pages">
                    ${pageItems
                      .map(
                        (it) => `
                        <button class="pagination-btn page-btn ${it.isActive ? "active" : ""}" ${it.isDisabled ? "disabled" : ""} data-page="${it.p ?? ""}">
                            ${it.label}
                        </button>
                    `,
                      )
                      .join("")}
                </div>
                <button class="pagination-btn next-btn" ${safePage >= totalPages ? "disabled" : ""} aria-label="Next page">→</button>
            </div>
        `;

    container.innerHTML = html;

    // Attach scroll snapping to all newly generated carousels
    if (typeof initScrollSnapping === "function") {
      container.querySelectorAll(".horizontal-scroll-track").forEach((el) => {
        initScrollSnapping(el, null);
      });
    }

    // Attach pagination listeners
    const goToPage = (newPage) => {
      const target = Math.min(Math.max(1, newPage), totalPages);
      params.set("page", String(target));
      window.location.search = params.toString();
    };

    const prev = container.querySelector(".prev-btn");
    const next = container.querySelector(".next-btn");
    if (prev) prev.addEventListener("click", () => goToPage(safePage - 1));
    if (next) next.addEventListener("click", () => goToPage(safePage + 1));

    container.querySelectorAll(".page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = parseInt(btn.getAttribute("data-page"));
        if (!isNaN(p)) goToPage(p);
      });
    });
  } catch (e) {
    console.error("Search failed:", e);
    container.innerHTML = `<div class="error-placeholder" style="text-align: center; padding: 100px 0;"><h2>Search Service Unavailable</h2><p>Please try again later.</p></div>`;
  }
}

function renderGenericCards(
  containerId,
  count,
  showHostActions = false,
  hideHeart = false,
  useType2 = false,
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const assetBase = getAssetBase();
  let html = "";
  const locations = [
    "France, Paris",
    "Italy, Rome",
    "UAE, Dubai",
    "Thailand, Bangkok",
    "UK, London",
    "USA, New York",
    "Japan, Tokyo",
    "Spain, Madrid",
  ];

  // INJECT CUSTOM APARTMENTS
  if (containerId === "most-visited-track-1") {
    const customProps = JSON.parse(
      localStorage.getItem("rently_custom_apartments") || "[]",
    );
    customProps.forEach((prop) => {
      let housingType = prop.type;
      let photo = `${assetBase}images/hero1.png`;
      let location = `${prop.country}, ${prop.city}`;

      const cardClass = useType2
        ? "accommodation-card type-2"
        : "accommodation-card";
      html += `
                <div class="${cardClass}${showHostActions ? " host-clickable-card" : " inspiration-clickable-card"}"${showHostActions || !showHostActions ? ' style="cursor:pointer;"' : ""}>
                    <div class="acc-img-wrapper">
                        <img src="${photo}" class="acc-img" alt="${housingType}">
                        ${
                          showHostActions
                            ? `
                        <div class="host-card-actions">
                            <button class="host-action-btn edit-btn" title="Edit Listing">
                                <span style="font-size: 18px;">✎</span>
                            </button>
                            <button class="host-action-btn delete-btn" title="Delete Listing">
                                <img src="${assetBase}icons/x.svg" alt="delete">
                            </button>
                        </div>
                        `
                            : ""
                        }
                        ${
                          !hideHeart && !showHostActions
                            ? `
                        <button class="favorite-btn" data-id="${prop.id || ""}" aria-label="Add to favorites">
                            <img src="${assetBase}icons/favorite.svg" alt="heart">
                        </button>
                        `
                            : ""
                        }
                    </div>
                    <div class="acc-info">
                        <div class="acc-header">
                            <div class="acc-type-group">
                                <div class="acc-type">${housingType}</div>
                                <div class="acc-location">
                                    <img src="${assetBase}icons/locationIcon.svg" class="acc-loc-icon" alt="loc">
                                    <span class="acc-loc-text">${location}</span>
                                </div>
                            </div>
                            <div class="acc-rating">
                                <img src="${assetBase}icons/star.svg" class="star-icon" alt="star">
                                <span>5.0(0)</span>
                            </div>
                        </div>
                        <div class="acc-desc">${prop.desc}</div>
                    </div>
                </div>
            `;
    });
  }

  for (let i = 0; i < count; i++) {
    let rawRating = [5, 4.99, 4.8, 4.95, 5][i % 5];
    let displayRating = parseFloat(rawRating.toFixed(2));
    let reviewsCount = Math.floor(Math.random() * (2000 - 10) + 10);
    const types = [
      "Apartment",
      "House",
      "Villa",
      "Chalet",
      "Studio",
      "Tiny House",
    ];
    let housingType = types[i % types.length];
    let photo = `${assetBase}images/hero${(i % 4) + 1}.png`;
    const location = locations[i % locations.length];

    const cardClass = useType2
      ? "accommodation-card type-2"
      : "accommodation-card";
    html += `
            <div class="${cardClass}${showHostActions ? " host-clickable-card" : " inspiration-clickable-card"}"${showHostActions || !showHostActions ? ' style="cursor:pointer;"' : ""}>
                <div class="acc-img-wrapper">
                    <img src="${photo}" class="acc-img" alt="${housingType}">
                    ${
                      showHostActions
                        ? `
                    <div class="host-card-actions">
                        <button class="host-action-btn edit-btn" title="Edit Listing">
                            <span style="font-size: 18px;">✎</span>
                        </button>
                        <button class="host-action-btn delete-btn" title="Delete Listing">
                            <img src="${assetBase}icons/x.svg" alt="delete">
                        </button>
                    </div>
                    `
                        : ""
                    }
                    ${
                      !hideHeart && !showHostActions
                        ? `
                    <button class="favorite-btn" aria-label="Add to favorites">
                        <img src="${assetBase}icons/favorite.svg" alt="heart">
                    </button>
                    `
                        : ""
                    }
                </div>
                <div class="acc-info">
                    <div class="acc-header">
                        <div class="acc-type-group">
                            <div class="acc-type">${housingType}</div>
                            <div class="acc-location">
                                <img src="${assetBase}icons/locationIcon.svg" class="acc-loc-icon" alt="loc">
                                <span class="acc-loc-text">${location}</span>
                            </div>
                        </div>
                        <div class="acc-rating">
                            <img src="${assetBase}icons/star.svg" class="star-icon" alt="star">
                            <span>${displayRating}(${reviewsCount})</span>
                        </div>
                    </div>
                    <div class="acc-desc">Beautiful and cozy place to stay with amazing view and top-notch amenities. Close to the city center, walking distance to all major attractions.</div>
                </div>
            </div>
        `;
  }
  container.innerHTML = html;
}

// Render host's own listings from API
async function renderHostListings(activeTrackId, rentedTrackId, hiddenTrackId) {
  const assetBase = getAssetBase();
  const token = localStorage.getItem("auth_token") || "";

  const parseLocalDate = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getHostListingState = (item) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isActive = item.isActive === true;
    const visibleFrom = parseLocalDate(item.visibleFrom || item.VisibleFrom);
    const isUpcoming = isActive && visibleFrom && visibleFrom > today;

    if (!isActive) return { key: "hidden", label: "Hidden" };
    if (isUpcoming) {
      const dateLabel = visibleFrom.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return { key: "upcoming", label: `Upcoming · ${dateLabel}` };
    }
    return { key: "active", label: "Active" };
  };

  const setLoading = (trackId) => {
    const el = document.getElementById(trackId);
    if (el)
      el.innerHTML = `<div style="padding:20px;color:#888">Loading...</div>`;
  };
  [activeTrackId, rentedTrackId, hiddenTrackId].forEach(setLoading);

  try {
    const resp = await fetch("/api/Accommodations/my", {
      headers: { Authorization: "Bearer " + token },
    });
    if (resp.status === 401) {
      window.location.href = window.location.pathname.includes("/host-mode/")
        ? "../login.html"
        : "./login.html";
      return;
    }
    if (!resp.ok) throw new Error("Failed to load listings");

    const all = await resp.json();
    const active = all.filter((a) => getHostListingState(a).key === "active");
    const hidden = all.filter((a) => {
      const state = getHostListingState(a);
      return state.key === "hidden" || state.key === "upcoming";
    });

    const buildCard = (item, index) => {
      const photo =
        item.photos && item.photos.length > 0
          ? getOptimizedImageUrl(item.photos[0], 600)
          : `${assetBase}images/hero${(index % 4) + 1}.png`;
      const location = `${item.country || ""}, ${item.city || ""}`;
      const rating = item.averageRating
        ? item.averageRating.toFixed(2)
        : "5.00";
      const reviewsCount = item.reviewsCount || 0;
      return `
        <div class="accommodation-card type-2 host-clickable-card" style="cursor:pointer;" data-id="${item.id}">
          <div class="acc-img-wrapper">
            <img src="${photo}" class="acc-img" alt="${item.propertyType}">
            <div class="host-card-actions">
              <button class="host-action-btn edit-btn" title="Edit Listing" data-id="${item.id}">
                <span style="font-size: 18px;">✎</span>
              </button>
              <button class="host-action-btn delete-btn" title="Delete Listing" data-id="${item.id}">
                <img src="${assetBase}icons/x.svg" alt="delete">
              </button>
            </div>
          </div>
          <div class="acc-info">
            <div class="acc-header">
              <div class="acc-type-group">
                <div class="acc-type">${item.propertyType}</div>
                <div class="acc-location">
                  <img src="${assetBase}icons/locationIcon.svg" class="acc-loc-icon" alt="loc">
                  <span class="acc-loc-text">${location}</span>
                </div>
              </div>
              <div class="acc-rating">
                <img src="${assetBase}icons/star.svg" class="star-icon" alt="star">
                <span>${rating}(${reviewsCount})</span>
              </div>
            </div>
            <div class="acc-desc">${item.description || ""}</div>
          </div>
        </div>
      `;
    };

    const renderTrack = (trackId, items) => {
      const el = document.getElementById(trackId);
      if (!el) return;
      if (items.length === 0) {
        el.innerHTML = `
          <div class="host-empty-card">
            <div class="host-empty-card-content">
              <span class="host-empty-card-title">No listings in this category yet.</span>
            </div>
          </div>
        `;
      } else {
        el.innerHTML = items.map((item, i) => buildCard(item, i)).join("");
      }
    };

    renderTrack(activeTrackId, active);
    renderTrack(hiddenTrackId, hidden);

    [activeTrackId, hiddenTrackId].forEach((id) => {
      const el = document.getElementById(id);
      if (el && typeof initScrollSnapping === "function")
        initScrollSnapping(el, null);
    });
  } catch (err) {
    console.error("Failed to load host listings:", err);
  }
}

// Global click delegation for host mode cards
document.addEventListener("click", function (e) {
  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const id = editBtn.dataset.id || editBtn.closest("[data-id]")?.dataset.id;
    const inHostModeFolder = window.location.pathname.includes("/host-mode/");
    const base = inHostModeFolder
      ? "../edit-accommodation.html"
      : "./edit-accommodation.html";
    window.location.href = id ? `${base}?id=${id}` : base;
    return;
  }

  const hostCard = e.target.closest(".host-clickable-card");
  if (hostCard) {
    if (
      e.target.closest(".favorite-btn") ||
      e.target.closest(".host-action-btn")
    )
      return;
    const id = hostCard.dataset.id;
    const inHostModeFolder = window.location.pathname.includes("/host-mode/");
    window.location.href = inHostModeFolder
      ? `./property-dashboard.html${id ? "?id=" + id : ""}`
      : `./host-mode/property-dashboard.html${id ? "?id=" + id : ""}`;
    return;
  }

  const inspirationCard = e.target.closest(".inspiration-clickable-card");
  if (inspirationCard) {
    if (
      e.target.closest(".favorite-btn") ||
      e.target.closest(".host-action-btn")
    )
      return;
    const id = inspirationCard.dataset.id;
    const isHostContext =
      window.location.pathname.includes("host-mode.html") ||
      window.location.pathname.includes("/host-mode/");
    if (isHostContext) {
      window.location.href = getHostPropertyViewHref(id);
    } else {
      window.location.href = `./property.html${id ? "?id=" + id : ""}`;
    }
    return;
  }

  const learnMoreHost = e.target.closest(".inspiration-learn-more");
  if (learnMoreHost) {
    if (e.target.closest(".learn-more-btn")) return;

    const isHostMode =
      window.location.pathname.includes("host-mode.html") ||
      window.location.pathname.includes("/host-mode/");
    if (isHostMode) {
      const inHostModeFolder = window.location.pathname.includes("/host-mode/");
      window.location.href = inHostModeFolder
        ? "./inspiration.html?sort=highest_rated&page=1"
        : "./host-mode/inspiration.html?sort=highest_rated&page=1";
    } else {
      const track = learnMoreHost.closest(".horizontal-scroll-track");
      if (track && track.id === "accommodations-track") {
        window.location.href = "./search.html?sort=highest_rated&page=1";
      } else if (
        track &&
        (track.id === "most-visited-track-1" ||
          track.id === "most-visited-track-2")
      ) {
        window.location.href = "./search.html?sort=most_visited&page=1";
      } else {
        window.location.href = "./search.html?page=1";
      }
    }
    return;
  }
});
