/**
 * Inspiration mode for host - similar to search-logic but for host mode
 */

function initInspirationMode() {
  const resultsContainer = document.getElementById("search-results-container");
  if (resultsContainer && typeof renderInspirationResultsRows === "function") {
    renderInspirationResultsRows("search-results-container", 8, 6);
  }

  const moreFiltersBtn = document.getElementById("more-filters-btn");
  const advFilters = document.getElementById("advanced-filters");
  const filtersArrow = document.getElementById("filters-arrow");

  if (moreFiltersBtn && advFilters) {
    moreFiltersBtn.addEventListener("click", () => {
      const isShowing = advFilters.classList.toggle("show");
      const span = moreFiltersBtn.querySelector("span");
      span.innerText = isShowing ? "Less Filters" : "More Filters";
      filtersArrow.src = isShowing
        ? "../icons/arrowUp.svg"
        : "../icons/arrowDown.svg";
    });
  }

  document.querySelectorAll(".cnt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("data-target"));
      let val = parseInt(input.value);
      if (btn.classList.contains("plus")) val++;
      else if (btn.classList.contains("minus") && val > 0) val--;
      input.value = val;
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.has("location"))
    document.getElementById("search-loc").value = params.get("location");
  if (params.has("sort")) {
    let sortVal = params.get("sort") || "";
    const norm = sortVal.toLowerCase().replace(/\+/g, " ").trim();
    if (norm === "top rated") sortVal = "highest_rated";
    else if (norm === "popularity" || norm === "most visited")
      sortVal = "most_visited";

    const sortSelect = document.getElementById("search-sort");
    if (sortSelect) {
      sortSelect.value = sortVal;
    }
  }

  // Restore property type selections (types CSV)
  if (params.has("types")) {
    const selected = new Set(
      params
        .get("types")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    );
    document
      .querySelectorAll(".property-types-grid input[type='checkbox']")
      .forEach((cb) => {
        cb.checked = selected.has(cb.value);
      });
  }

  const searchApplyBtn = document.getElementById("search-apply-btn");
  if (searchApplyBtn) {
    searchApplyBtn.addEventListener("click", () => {
      const loc = document.getElementById("search-loc").value;
      const sort = document.getElementById("search-sort").value;
      const rooms = document.getElementById("cnt-bedrooms").value;
      const beds = document.getElementById("cnt-beds").value;

      const selectedTypes = [];
      document
        .querySelectorAll(".property-types-grid input:checked")
        .forEach((cb) => {
          selectedTypes.push(cb.value.trim());
        });

      const newParams = new URLSearchParams();
      if (loc) newParams.set("location", loc);
      if (sort) newParams.set("sort", sort);
      if (rooms > 0) newParams.set("rooms", rooms);
      if (beds > 0) newParams.set("beds", beds);
      if (selectedTypes.length > 0)
        newParams.set("types", selectedTypes.join(","));

      newParams.set("page", "1"); // Reset to page 1 on new search

      window.location.search = newParams.toString();
    });
  }

  // --- ADDRESS AUTOCOMPLETE (DB + Nominatim) ---
  const locInput = document.getElementById("search-loc");
  const datalist = document.getElementById("search-loc-suggestions");

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
            .map((formatted) => `<option value="${formatted}">`);

          optionsHtml += globalOptions.join("");
          datalist.innerHTML = optionsHtml;
        } catch (e) {
          console.error("Nominatim lookup failed:", e);
        }
      }, 300);
    });
  }
}

function getHostInspirationPropertyHref(id) {
  const base = window.location.pathname.includes("/host-mode/")
    ? "./property-view.html"
    : "./host-mode/property-view.html";
  return id ? `${base}?id=${encodeURIComponent(id)}` : base;
}

async function renderInspirationResultsRows(
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

  // Load favorite IDs for like functionality
  const favoriteIds = await getFavoriteIds();

  try {
    const rooms = params.get("rooms") || "";
    const beds = params.get("beds") || "";
    const types = params.get("types") || (type ? type : "");

    let apiUrl = `/api/Accommodations/search?limit=${limit}&skip=${skip}`;
    if (location) apiUrl += `&location=${encodeURIComponent(location)}`;
    if (rooms) apiUrl += `&rooms=${rooms}`;
    if (beds) apiUrl += `&beds=${beds}`;
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

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);

    html += `
            <div class="mt-4">
                <h4 class="search-row-title" style="font-size: 24px; margin-top: 30px; margin-bottom: 20px; font-weight: 700;">
                    Properties for Inspiration <span style="color:#6b7280; font-weight:500; font-size:16px;">(${total})</span>
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
        let title = item.title || item.propertyType || "Property";
        let description =
          item.description ||
          "Beautiful and cozy place to stay with amazing view and top-notch amenities.";
        let housingType = item.propertyType;

        const priceVal = item.pricePerNight || 0;
        const priceDisplay = `$${priceVal.toLocaleString()}`;
        const priceSubtext = " / night";

        // Check if this property is in favorites
        const isFavorite = favoriteIds.includes(item.id);

        html += `
                    <div class="accommodation-card type-2 inspiration-clickable-card" data-id="${item.id}" style="cursor: pointer;">
                        <div class="acc-img-wrapper">
                            <img src="${photo}" class="acc-img" alt="${title}">
                            <div class="price-tag-overlay">
                                ${priceDisplay}
                                ${priceSubtext}
                            </div>
                            <button class="favorite-btn ${isFavorite ? "active" : ""}" data-id="${item.id}" aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}">
                                <img src="${getFavoriteIconSrc(isFavorite)}" alt="heart">
                            </button>
                        </div>
                        <div class="acc-info">
                            <div class="acc-header">
                                <div class="acc-type-group">
                                    <div class="acc-type">${housingType}</div>
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
                            <div class="acc-desc">${description}</div>
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
            <div class="pagination-container" style="text-align: center; margin: 40px 0; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
        `;

    if (safePage > 1) {
      html += `<a href="?${new URLSearchParams({ ...Object.fromEntries(params), page: safePage - 1 }).toString()}" class="pagination-btn">← Previous</a>`;
    }

    const startPage = Math.max(1, safePage - 2);
    const endPage = Math.min(totalPages, safePage + 2);
    if (startPage > 1) html += `<a href="?page=1" class="pagination-btn">1</a>`;
    if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;

    for (let p = startPage; p <= endPage; p++) {
      const active = p === safePage ? "active" : "";
      html += `<a href="?${new URLSearchParams({ ...Object.fromEntries(params), page: p }).toString()}" class="pagination-btn ${active}">${p}</a>`;
    }

    if (endPage < totalPages - 1)
      html += `<span class="pagination-ellipsis">...</span>`;
    if (endPage < totalPages)
      html += `<a href="?${new URLSearchParams({ ...Object.fromEntries(params), page: totalPages }).toString()}" class="pagination-btn">${totalPages}</a>`;

    if (safePage < totalPages) {
      html += `<a href="?${new URLSearchParams({ ...Object.fromEntries(params), page: safePage + 1 }).toString()}" class="pagination-btn">Next →</a>`;
    }

    html += `
            </div>
            </div>
        `;

    container.innerHTML = html;

    // Add direct event listeners to favorite buttons
    container.querySelectorAll(".favorite-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("Inspiration favorite button click", btn);
        
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true" || !!localStorage.getItem("auth_token");
        if (!isLoggedIn) {
          window.location.href = "../login.html";
          return;
        }

        const id = btn.dataset.id || btn.getAttribute("data-id");
        if (!id) {
          btn.classList.toggle("active");
          return;
        }

        const token = localStorage.getItem("auth_token") || "";
        const favoriteType = "Host"; // Always host mode in inspiration page
        
        try {
          const isActive = btn.classList.contains("active");
          console.log("Inspiration favorite toggle:", { id, isActive, favoriteType });
          
          if (isActive) {
            const resp = await fetch(`/api/Favorites/${id}?type=${favoriteType}`, {
              method: "DELETE",
              headers: { 
                "Authorization": "Bearer " + token
              }
            });
            console.log("Inspiration remove response:", resp.status);
            if (!resp.ok && resp.status !== 204 && resp.status !== 404) throw new Error("Failed to remove favorite");
            btn.classList.remove("active");
            const img = btn.querySelector("img");
            if (img) img.src = "../icons/favorite.svg";
          } else {
            const resp = await fetch(`/api/Favorites/${id}?type=${favoriteType}`, {
              method: "POST",
              headers: { 
                "Authorization": "Bearer " + token
              }
            });
            console.log("Inspiration add response:", resp.status);
            if (!resp.ok && resp.status !== 409) throw new Error("Failed to add favorite");
            btn.classList.add("active");
            const img = btn.querySelector("img");
            if (img) img.src = "../icons/favorite-filled.svg";
          }
        } catch (err) {
          console.error("Inspiration favorite error:", err);
        }
      });
    });

    // Attach click handlers for inspiration mode cards
    document.querySelectorAll(".inspiration-clickable-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        e.stopPropagation();
        // Don't navigate if clicking on favorite button
        if (e.target.closest(".favorite-btn")) return;
        
        const id = card.getAttribute("data-id");
        if (id) {
          // Open in property-view (host mode view)
          window.location.href = getHostInspirationPropertyHref(id);
        }
      });
    });
  } catch (error) {
    console.error("Failed to load inspiration results:", error);
    container.innerHTML = `
            <div class="error-placeholder" style="text-align: center; padding: 100px 0;">
                <h2>Failed to load properties</h2>
                <p>Please try again later.</p>
            </div>
        `;
  }
}
