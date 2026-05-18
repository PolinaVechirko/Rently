(function initFavoritesPage() {
  document.addEventListener("DOMContentLoaded", () => {
    if (window.RentlyFavoritesRenderer) {
      window.RentlyFavoritesRenderer.renderFavorites("favorites-track");
    }
  });
})();
