/**
 * Transitional renderer facade.
 * Keeps a small compatibility surface while pages move to direct module usage.
 */

function getRenderHelpers() {
  return window.RentlyRenderHelpers || null;
}

function getHomeRenderers() {
  return window.RentlyHomeRenderers || null;
}

async function renderCities() {
  return getHomeRenderers()?.renderCities?.();
}

async function renderAmenities() {
  return getHomeRenderers()?.renderAmenities?.();
}

function getAssetBase() {
  return getRenderHelpers()?.getAssetBase?.() || "./";
}

function isInHostMode() {
  return getRenderHelpers()?.isInHostMode?.() || false;
}

function isInHostModeFolder() {
  return getRenderHelpers()?.isInHostModeFolder?.() || false;
}

function getHostModeHref(path, query = "") {
  return getRenderHelpers()?.getHostModeHref?.(path, query) || String(path || "");
}

function getHostPropertyViewHref(id) {
  return (
    getRenderHelpers()?.getHostPropertyViewHref?.(id) ||
    (id
      ? `./property-view.html?id=${encodeURIComponent(id)}`
      : "./property-view.html")
  );
}

async function getFavoriteIds() {
  return getRenderHelpers()?.getFavoriteIds?.() || [];
}

function getOptimizedImageUrl(url, width = 720) {
  return getRenderHelpers()?.getOptimizedImageUrl?.(url, width) || url || "";
}

async function getLearnMoreCollageImages(assetBase) {
  return getRenderHelpers()?.getLearnMoreCollageImages?.(assetBase) || [];
}

async function renderAccommodations(
  trackId,
  useType2 = false,
  hideHeart = false,
  showHostActions = false,
  isGrid = false,
  count = 16,
) {
  return window.RentlyAccommodationsRenderer?.renderAccommodations?.(
    trackId,
    useType2,
    hideHeart,
    showHostActions,
    isGrid,
    count,
  );
}

async function renderMyBookingPage(
  activeContainerId,
  upcomingContainerId,
  historyContainerId,
) {
  return window.RentlyMyBookingRenderer?.renderMyBookingPage?.(
    activeContainerId,
    upcomingContainerId,
    historyContainerId,
  );
}

async function renderFavorites(containerId) {
  return window.RentlyFavoritesRenderer?.renderFavorites?.(containerId);
}

async function renderSearchResultsRows(containerId, rowsCount = 8, cardsPerRow = 6) {
  return window.RentlySearchResultsRenderer?.renderSearchResultsRows?.(
    containerId,
    rowsCount,
    cardsPerRow,
  );
}

async function renderHostListings(activeTrackId, rentedTrackId, hiddenTrackId) {
  return window.RentlyHostListingsRenderer?.renderHostListings?.(
    activeTrackId,
    rentedTrackId,
    hiddenTrackId,
  );
}

document.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-btn");
  if (editButton) {
    const id = editButton.dataset.id || editButton.closest("[data-id]")?.dataset.id;
    const base = isInHostModeFolder()
      ? "../edit-accommodation.html"
      : "./edit-accommodation.html";
    window.location.href = id ? `${base}?id=${id}` : base;
    return;
  }

  const hostCard = event.target.closest(".host-clickable-card");
  if (hostCard) {
    if (
      event.target.closest(".favorite-btn") ||
      event.target.closest(".host-action-btn")
    ) {
      return;
    }
    const id = hostCard.dataset.id;
    window.location.href = getHostModeHref(
      "property-dashboard.html",
      id ? `?id=${encodeURIComponent(id)}` : "",
    );
    return;
  }

  const learnMoreHost = event.target.closest(".inspiration-learn-more");
  if (learnMoreHost) {
    if (event.target.closest(".learn-more-btn")) return;

    if (window.RentlyLearnMore) {
      window.RentlyLearnMore.handleCardClick(learnMoreHost);
      return;
    }

    window.location.href = "./search.html?page=1";
  }
});
