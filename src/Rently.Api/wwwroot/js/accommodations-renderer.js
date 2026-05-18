(function createAccommodationsRenderer(window) {
  const renderHelpers = window.RentlyRenderHelpers || {};

  function getNightsFromSearch() {
    const searchParams = new URLSearchParams(window.location.search);
    const checkinData = searchParams.get("checkin") || searchParams.get("checkIn") || "";
    const checkoutData = searchParams.get("checkout") || searchParams.get("checkOut") || "";

    if (!checkinData || !checkoutData) {
      return 0;
    }

    const start = new Date(checkinData);
    const end = new Date(checkoutData);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return 0;
    }

    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  function buildSkeletonHtml(isGrid) {
    return Array.from({ length: isGrid ? 8 : 4 })
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
  }

  function buildApiUrl(trackId, count) {
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

    return apiUrl;
  }

  function buildAccommodationCard(item, index, options) {
    const {
      assetBase,
      favoriteIds,
      useType2,
      hideHeart,
      showHostActions,
      nights,
    } = options;

    const housingType = item.propertyType;
    const photo = renderHelpers.getCardImageUrl
      ? renderHelpers.getCardImageUrl(item.photos, {
          assetBase,
          fallbackIndex: index,
          width: 600,
        })
      : `${assetBase}images/hero${(index % 4) + 1}.png`;
    const location = renderHelpers.formatLocation
      ? renderHelpers.formatLocation(item, {
          fallbackCountry: "Unknown",
          fallbackCity: "City",
        })
      : `${item.country || "Unknown"}, ${item.city || "City"}`;
    const description =
      item.description ||
      "Beautiful and cozy place to stay with amazing view and top-notch amenities.";
    const isFavorite = favoriteIds.includes(item.id);
    const cardClass = useType2 ? "accommodation-card type-2" : "accommodation-card";
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

    return `
      <div class="${cardClass}${showHostActions ? " host-clickable-card" : " inspiration-clickable-card"}" style="cursor:pointer;" data-id="${item.id}">
          <div class="acc-img-wrapper">
              <img src="${photo}" class="acc-img" alt="${housingType}">
              <div class="price-tag-overlay">
                  ${priceParts.priceDisplay}
                  ${nights > 0 ? priceParts.priceSubtext : ""}
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
                    <img src="${favoriteIconSrc}" alt="heart">
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
                      <span>${ratingText}</span>
                  </div>
              </div>
              ${useType2 ? `<div class="acc-desc">${description}</div>` : ""}
          </div>
      </div>
    `;
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

    const assetBase = renderHelpers.getAssetBase?.() || "./";
    const favoriteIds = renderHelpers.getFavoriteIds
      ? await renderHelpers.getFavoriteIds()
      : [];
    const nights = getNightsFromSearch();

    track.innerHTML = buildSkeletonHtml(isGrid);

    try {
      const response = await fetch(buildApiUrl(trackId, count));
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
        html += buildAccommodationCard(item, index, {
          assetBase,
          favoriteIds,
          useType2,
          hideHeart,
          showHostActions,
          nights,
        });
      });

      if (!isGrid) {
        const collageImages = renderHelpers.getLearnMoreCollageImages
          ? await renderHelpers.getLearnMoreCollageImages(assetBase)
          : [];
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

      if (window.RentlyFavoriteInteractions) {
        window.RentlyFavoriteInteractions.bindTrackFavoriteButtons(track);
      }
    } catch (error) {
      console.error("Failed to render accommodations:", error);
    }
  }

  window.RentlyAccommodationsRenderer = {
    renderAccommodations,
  };
})(window);
