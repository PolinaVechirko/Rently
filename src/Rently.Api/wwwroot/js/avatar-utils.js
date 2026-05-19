(function createAvatarUtils(window) {
  function isDefaultAvatarUrl(url) {
    if (window.RentlyUiShared) {
      return window.RentlyUiShared.isDefaultAvatarUrl(url);
    }

    return !url || /user\.svg(?:[?#]|$)/i.test(String(url));
  }

  function resolveAvatarUrl(url, assetBase = "./") {
    if (window.RentlyUiShared) {
      return window.RentlyUiShared.resolveAvatarUrl(url, assetBase);
    }

    const raw = String(url || "").trim();
    return { src: raw || `${assetBase}icons/user.svg`, isFallback: !raw };
  }

  function applyAvatarFallback(img, assetBase = "./") {
    if (window.RentlyUiShared) {
      return window.RentlyUiShared.applyAvatarFallback(img, assetBase);
    }
  }

  window.RentlyAvatarUtils = {
    applyAvatarFallback,
    isDefaultAvatarUrl,
    resolveAvatarUrl,
  };
})(window);
