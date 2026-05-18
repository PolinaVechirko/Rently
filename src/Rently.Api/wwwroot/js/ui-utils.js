/**
 * Transitional UI facade.
 * Keeps only compatibility globals still referenced outside the page modules.
 */

function isDefaultAvatarUrl(url) {
  if (window.RentlyAvatarUtils) {
    return window.RentlyAvatarUtils.isDefaultAvatarUrl(url);
  }

  if (window.RentlyUiShared) {
    return window.RentlyUiShared.isDefaultAvatarUrl(url);
  }

  return !url || /user\.svg(?:[?#]|$)/i.test(String(url));
}

function resolveAvatarUrl(url, assetBase = "./") {
  if (window.RentlyAvatarUtils) {
    return window.RentlyAvatarUtils.resolveAvatarUrl(url, assetBase);
  }

  if (window.RentlyUiShared) {
    return window.RentlyUiShared.resolveAvatarUrl(url, assetBase);
  }

  const raw = String(url || "").trim();
  return { src: raw || `${assetBase}icons/user.svg`, isFallback: !raw };
}

function applyAvatarFallback(img, assetBase = "./") {
  if (window.RentlyAvatarUtils) {
    return window.RentlyAvatarUtils.applyAvatarFallback(img, assetBase);
  }

  if (window.RentlyUiShared) {
    return window.RentlyUiShared.applyAvatarFallback(img, assetBase);
  }
}

function initScrollSnapping(container, trackSelector) {
  return window.RentlyUiShared?.initScrollSnapping?.(container, trackSelector);
}

function initAboutSlider() {
  return window.RentlyUiShared?.initAboutSlider?.();
}
