(function initFavoritesPage() {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderFavorites === "function") {
      renderFavorites("favorites-track");
    }
  });
})();
