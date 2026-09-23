/**
 * Authentication orchestration and backward-compatible wrappers.
 */

function resolveAuthInit(isAuthenticated) {
  if (window.RentlyAuthInit) {
    window.RentlyAuthInit.resolveAuthInit(isAuthenticated);
  }
}

function getCachedAvatarUrl() {
  return window.RentlyAuthStorage.getCachedAvatarUrl();
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
