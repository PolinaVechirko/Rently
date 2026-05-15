/**
 * Authentication orchestration and backward-compatible wrappers.
 */

const RentlyAuthCache = window.RentlyAuthStorage
  ? window.RentlyAuthStorage.cacheKeys
  : {
      user: "rently_host_data",
      avatar: "rently_host_avatar",
      avatarThumb: "rently_header_avatar_thumb",
    };

function resolveAuthInit(isAuthenticated) {
  if (window.RentlyAuthInit) {
    window.RentlyAuthInit.resolveAuthInit(isAuthenticated);
  }
}

function getCachedAvatarUrl() {
  return window.RentlyAuthStorage
    ? window.RentlyAuthStorage.getCachedAvatarUrl()
    : localStorage.getItem(RentlyAuthCache.avatarThumb) ||
        localStorage.getItem(RentlyAuthCache.avatar) ||
        "";
}

function cacheUserSnapshot(user) {
  if (window.RentlyAuthStorage) {
    window.RentlyAuthStorage.cacheUserSnapshot(
      user,
      window.RentlyAuthUi?.getHeaderAvatarThumbUrl,
    );
  }
}

function applyCachedHeaderAvatar() {
  window.RentlyAuthUi?.applyCachedHeaderAvatar();
}

function rememberProfileReturnUrl(profileHref) {
  if (window.RentlyAuthProfileReturn) {
    return window.RentlyAuthProfileReturn.rememberProfileReturnUrl(profileHref);
  }
}

function getProfileReturnUrl(fallbackPath) {
  if (window.RentlyAuthProfileReturn) {
    return window.RentlyAuthProfileReturn.getProfileReturnUrl(fallbackPath);
  }
  return new URL(fallbackPath, window.location.href).href;
}

function applyLoggedInHeaderShell() {
  window.RentlyAuthUi?.applyLoggedInHeaderShell();
}

function checkAuthState() {
  if (window.RentlyAuthInit) {
    window.RentlyAuthInit.checkAuthState();
  }
}

function updateHeaderUI(isLoggedIn, isAuthPage) {
  window.RentlyAuthUi?.updateHeaderUI(isLoggedIn, isAuthPage);
}

function setHeaderUserIconSource(targetElement, source) {
  window.RentlyAuthUi?.setHeaderUserIconSource(targetElement, source);
}

function syncAllUserData(user) {
  window.RentlyAuthUi?.syncAllUserData(user);
}

function setAllAvatars(source) {
  window.RentlyAuthUi?.setAllAvatars(source);
}

function getStoredHostData() {
  return window.RentlyAuthStorage
    ? window.RentlyAuthStorage.getStoredUserData()
    : {};
}

async function validateAndFetchUser(token) {
  if (window.RentlyAuthInit) {
    return window.RentlyAuthInit.validateAndFetchUser(token);
  }
}

function updateDropdownLinks(user) {
  if (window.RentlyAuthInit) {
    window.RentlyAuthInit.updateDropdownLinks(user);
  }
}

function initAuth() {
  if (window.RentlyAuthInit) {
    window.RentlyAuthInit.initAuth();
  }
}

function attachListeners() {
  if (window.RentlyAuthInit) {
    window.RentlyAuthInit.attachListeners();
  }
}

window.rememberProfileReturnUrl = rememberProfileReturnUrl;
window.getProfileReturnUrl = getProfileReturnUrl;

if (document.body) {
  applyLoggedInHeaderShell();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}
