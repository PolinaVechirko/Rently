(function createFavoritesRenderer(window) {
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

  function normalizeAccommodation(item) {
    if (!item || typeof item !== "object") {
      return {};
    }

    return {
      ...item,
      id: item.id ?? item.Id ?? "",
      propertyType: item.propertyType ?? item.PropertyType ?? "Accommodation",
      photos: Array.isArray(item.photos)
        ? item.photos
        : Array.isArray(item.Photos)
          ? item.Photos
          : [],
      country: item.country ?? item.Country ?? "",
      city: item.city ?? item.City ?? "",
      street: item.street ?? item.Street ?? "",
      pricePerNight: item.pricePerNight ?? item.PricePerNight ?? 0,
      averageRating: item.averageRating ?? item.AverageRating ?? 0,
      reviewsCount: item.reviewsCount ?? item.ReviewsCount ?? 0,
      description: item.description ?? item.Description ?? "",
    };
  }

  async function renderFavorites(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const assetBase = renderHelpers.getAssetBase?.() || "./";
    container.innerHTML = `
      <div class="empty-state-card">
          <div class="empty-state-content">
              <span class="empty-state-title">Loading...</span>
              <p class="empty-state-text">Loading your favorites...</p>
          </div>
      </div>
    `;

    try {
      const token = window.RentlyAuthStorage?.getAuthToken?.() || "";
      const response = await fetch("/api/Favorites", {
        headers: { Authorization: "Bearer " + token },
      });

      if (!response.ok) {
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

      const rawData = await response.json();
      const data = Array.isArray(rawData)
        ? rawData.filter((item) =>
            renderHelpers.isInHostMode?.()
              ? item.isHostFavorite === true
              : item.isGuestFavorite === true,
          )
        : [];

      if (data.length === 0) {
        container.innerHTML = renderHelpers.isInHostMode?.()
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
      data.forEach((item) => {
        const displayItem = normalizeAccommodation(
          item.accommodation ? item.accommodation : item,
        );
        const photo = renderHelpers.getCardImageUrl
          ? renderHelpers.getCardImageUrl(displayItem.photos, {
              assetBase,
              fallbackIndex: 0,
              width: 600,
            })
          : `${assetBase}images/hero1.png`;
        const location = renderHelpers.formatLocation
          ? renderHelpers.formatLocation(displayItem)
          : `${displayItem.country || ""}, ${displayItem.city || ""}`;
        const priceDisplay = renderHelpers.formatPrice
          ? renderHelpers.formatPrice(displayItem.pricePerNight || 0)
          : `$${Number(displayItem.pricePerNight || 0).toLocaleString()}`;
        const ratingText = renderHelpers.formatRating
          ? renderHelpers.formatRating(
              displayItem.averageRating,
              displayItem.reviewsCount,
            )
          : `${displayItem.averageRating?.toFixed(2) || "5.00"} (${displayItem.reviewsCount || 0})`;
        const favoriteIconSrc = renderHelpers.getFavoriteIconSrc
          ? renderHelpers.getFavoriteIconSrc(true)
          : `${assetBase}icons/favorite-filled.svg`;
        const propertyId = escapeHtml(displayItem.id);
        const propertyType = escapeHtml(displayItem.propertyType);
        const safeLocation = escapeHtml(location);
        const safeRatingText = escapeHtml(ratingText);
        const safeDescription = escapeHtml(displayItem.description || "");

        html += `
          <div class="accommodation-card type-2 inspiration-clickable-card" data-id="${propertyId}" style="cursor:pointer;">
              <div class="acc-img-wrapper">
                  <img src="${photo}" class="acc-img" alt="${propertyType}">
                  <div class="price-tag-overlay">${priceDisplay}</div>
                  <button class="favorite-btn active" data-id="${propertyId}" aria-label="Remove from favorites"><img src="${favoriteIconSrc}" alt="heart"></button>
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
                      <div class="acc-rating"><img src="${assetBase}icons/star.svg" class="star-icon" alt="star"><span>${safeRatingText}</span></div>
                  </div>
                  <div class="acc-desc">${safeDescription}</div>
              </div>
          </div>
        `;
      });

      container.innerHTML = html;

      if (window.RentlyFavoriteInteractions?.bindTrackFavoriteButtons) {
        window.RentlyFavoriteInteractions.bindTrackFavoriteButtons(container);
      }

      container.querySelectorAll(".inspiration-clickable-card").forEach((card) => {
        card.addEventListener("click", (event) => {
          if (event.target.closest(".favorite-btn")) return;

          const id = card.getAttribute("data-id");
          if (!id) return;

          window.location.href = renderHelpers.getPropertyHref
            ? renderHelpers.getPropertyHref(id)
            : `./property.html?id=${encodeURIComponent(id)}`;
        });
      });
    } catch (error) {
      console.error("Failed to load favorites:", error);
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

  window.RentlyFavoritesRenderer = {
    renderFavorites,
  };
})(window);
