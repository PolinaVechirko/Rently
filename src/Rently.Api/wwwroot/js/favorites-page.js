(function initFavoritesPage() {
  document.addEventListener("DOMContentLoaded", () => {
    if (window.RentlyFavoritesRenderer) {
      window.RentlyFavoritesRenderer.renderFavorites("favorites-track");
    }

    if (window.RentlyFavoriteInteractions?.syncFavoriteButtons) {
      window.RentlyFavoriteInteractions.syncFavoriteButtons();
    }
  });
})();
