(function createSearchResultsRenderer(window) {
  const renderHelpers = window.RentlyRenderHelpers || {};
  const escapeHtml =
    renderHelpers.escapeHtml ||
    function fallbackEscapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

  async function renderSearchResultsRows(containerId, rowsCount = 8, cardsPerRow = 6) {
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
    const page = parseInt(params.get("page") || "1", 10);
    const limit = rowsCount * cardsPerRow;
    const skip = (page - 1) * limit;

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
      const assetBase = renderHelpers.getAssetBase?.() || "./";
      const favoriteIds = renderHelpers.getFavoriteIds
        ? await renderHelpers.getFavoriteIds()
        : [];

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

        html += `
          <div class="mt-3">
              <div class="horizontal-scroll-container">
                  <div class="horizontal-scroll-track results-grid">
        `;

        rowData.forEach((item, i) => {
          const photo = renderHelpers.getCardImageUrl
            ? renderHelpers.getCardImageUrl(item.photos, {
                assetBase,
                fallbackIndex: i,
                width: 600,
              })
            : `${assetBase}images/hero${(i % 4) + 1}.png`;
          const loc = renderHelpers.formatLocation
            ? renderHelpers.formatLocation(item)
            : `${item.country || ""}, ${item.city || ""}`;
          const isFavorite = favoriteIds.includes(item.id);
          const priceParts = renderHelpers.getStayPriceParts
            ? renderHelpers.getStayPriceParts(item.pricePerNight, nights)
            : {
                priceDisplay: `$${Number(item.pricePerNight || 0).toLocaleString()}`,
                priceSubtext: " / night",
              };
          const ratingText = renderHelpers.formatRating
            ? renderHelpers.formatRating(item.averageRating, item.reviewsCount)
            : `${item.averageRating?.toFixed(2) || "5.00"}(${item.reviewsCount || 0})`;
          const favoriteIconSrc = renderHelpers.getFavoriteIconSrc
            ? renderHelpers.getFavoriteIconSrc(isFavorite)
            : `${assetBase}icons/${isFavorite ? "favorite-filled" : "favorite"}.svg`;
          const propertyId = escapeHtml(item.id || item.Id || "");
          const altText = escapeHtml(item.propertyType || "Accommodation");
          const propertyType = escapeHtml(item.propertyType || "Accommodation");
          const safeLocation = escapeHtml(loc);
          const safeRatingText = escapeHtml(ratingText);
          const safeDescription = escapeHtml(item.description || "");
          const favoriteLabel = escapeHtml(
            isFavorite ? "Remove from favorites" : "Add to favorites",
          );

          html += `
            <div class="accommodation-card type-2 inspiration-clickable-card" data-id="${propertyId}" style="cursor:pointer;">
                <div class="acc-img-wrapper">
                    <img src="${photo}" class="acc-img" alt="${altText}">
                    <div class="price-tag-overlay">
                        ${priceParts.priceDisplay}
                        ${nights > 0 ? priceParts.priceSubtext : ""}
                    </div>
                    <button class="favorite-btn ${isFavorite ? "active" : ""}" data-id="${propertyId}" aria-label="${favoriteLabel}">
                        <img src="${favoriteIconSrc}" alt="heart">
                    </button>
                </div>
                <div class="acc-info">
                    <div class="acc-header">
                        <div class="acc-type-group">
                            <div class="acc-type">${propertyType}</div>
                            <div class="acc-location">
                                <img src="${assetBase}icons/locationIcon.svg" class="acc-loc-icon" alt="loc">
                                <span class="acc-loc-text">${safeLocation}</span>
                            </div>
                        </div>
                        <div class="acc-rating">
                            <img src="${assetBase}icons/star.svg" class="star-icon" alt="star">
                            <span>${safeRatingText}</span>
                        </div>
                    </div>
                    <div class="acc-desc">${safeDescription}</div>
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

      html += `</div>`;

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
        if (totalPages > 1) push(totalPages, String(totalPages), safePage === totalPages);

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

      if (typeof initScrollSnapping === "function") {
        container.querySelectorAll(".horizontal-scroll-track").forEach((el) => {
          initScrollSnapping(el, null);
        });
      }

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
          const targetPage = parseInt(btn.getAttribute("data-page"), 10);
          if (!isNaN(targetPage)) goToPage(targetPage);
        });
      });
    } catch (error) {
      console.error("Search failed:", error);
      container.innerHTML = `<div class="error-placeholder" style="text-align: center; padding: 100px 0;"><h2>Search Service Unavailable</h2><p>Please try again later.</p></div>`;
    }
  }

  window.RentlySearchResultsRenderer = {
    renderSearchResultsRows,
  };
})(window);
