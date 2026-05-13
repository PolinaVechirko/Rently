/**
 * Authentication and user state logic
 */

const RentlyAuthCache = {
  user: "rently_host_data",
  avatar: "rently_host_avatar",
  avatarThumb: "rently_header_avatar_thumb",
};

const RentlyScopedAuthKeys = new Set([
  "auth_token",
  "isLoggedIn",
  "redirectAfterAuth",
  "selectedAccommodationId",
  RentlyAuthCache.user,
  RentlyAuthCache.avatar,
  RentlyAuthCache.avatarThumb,
]);

(function patchScopedAuthStorage() {
  if (typeof window === "undefined") return;
  const local = window.localStorage;
  const session = window.sessionStorage;
  const storageProto = window.Storage && window.Storage.prototype;
  if (!local || !session || !storageProto || storageProto.__rentlyScopedAuthPatched) {
    return;
  }

  const originalGetItem = storageProto.getItem;
  const originalSetItem = storageProto.setItem;
  const originalRemoveItem = storageProto.removeItem;

  for (const key of RentlyScopedAuthKeys) {
    try {
      originalRemoveItem.call(local, key);
    } catch {
      return;
    }
  }

  storageProto.getItem = function getScopedItem(key) {
    const normalizedKey = String(key);
    if (this === local && RentlyScopedAuthKeys.has(normalizedKey)) {
      return originalGetItem.call(session, normalizedKey);
    }
    return originalGetItem.call(this, normalizedKey);
  };

  storageProto.setItem = function setScopedItem(key, value) {
    const normalizedKey = String(key);
    const normalizedValue = String(value);
    if (this === local && RentlyScopedAuthKeys.has(normalizedKey)) {
      originalSetItem.call(session, normalizedKey, normalizedValue);
      return;
    }
    originalSetItem.call(this, normalizedKey, normalizedValue);
  };

  storageProto.removeItem = function removeScopedItem(key) {
    const normalizedKey = String(key);
    if (this === local && RentlyScopedAuthKeys.has(normalizedKey)) {
      originalRemoveItem.call(session, normalizedKey);
      return;
    }
    originalRemoveItem.call(this, normalizedKey);
  };

  Object.defineProperty(storageProto, "__rentlyScopedAuthPatched", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
})();

function isRestrictedHostIdRoute(urlLike = window.location.href) {
  try {
    const url = new URL(urlLike, window.location.href);
    const path = url.pathname || "";
    if (/\/host-mode\/property-dashboard\.html$/i.test(path)) {
      return url.searchParams.has("id");
    }
    if (/\/edit-accommodation\.html$/i.test(path)) {
      return url.searchParams.has("id");
    }
    if (/\/adding-accommodation\.html$/i.test(path)) {
      return url.searchParams.has("id");
    }
    return false;
  } catch {
    return false;
  }
}

function getLoginPageHref() {
  return window.location.pathname.includes("/host-mode/")
    ? "../login.html"
    : "./login.html";
}

function getHostHomeHref() {
  return window.location.pathname.includes("/host-mode/")
    ? "../host-mode.html"
    : "./host-mode.html";
}

function redirectToLoginPreservingCurrentLocation() {
  localStorage.setItem("redirectAfterAuth", window.location.href);
  window.location.href = getLoginPageHref();
}

async function userOwnsAccommodation(token, accommodationId) {
  if (!token || !accommodationId) return false;
  try {
    const resp = await fetch("/api/Accommodations/my", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    if (!Array.isArray(data)) return false;
    return data.some(
      (item) =>
        String(item?.id ?? item?.Id ?? "") === String(accommodationId),
    );
  } catch {
    return false;
  }
}

async function resolvePostAuthRedirect(token, fallbackPath = "./index.html") {
  const fallbackUrl = new URL(fallbackPath, window.location.href).href;
  const rawRedirect = localStorage.getItem("redirectAfterAuth") || "";
  localStorage.removeItem("redirectAfterAuth");

  if (!rawRedirect) return fallbackUrl;

  let targetUrl;
  try {
    targetUrl = new URL(rawRedirect, window.location.href);
  } catch {
    return fallbackUrl;
  }

  if (targetUrl.origin !== window.location.origin) {
    return fallbackUrl;
  }

  if (isRestrictedHostIdRoute(targetUrl.href)) {
    const targetId = targetUrl.searchParams.get("id");
    const ownsAccommodation = await userOwnsAccommodation(token, targetId);
    if (!ownsAccommodation) {
      return new URL("./host-mode.html", window.location.href).href;
    }
  }

  return targetUrl.href;
}

/** Static assets (icons, default avatar) relative to current HTML path */
function getAuthAssetBase() {
  const path = window.location.pathname || "";
  if (path.includes("/host-mode/")) {
    return "../";
  }
  return "./";
}

function defaultUserIconUrl() {
  return `${getAuthAssetBase()}icons/user.svg`;
}

/** Root-absolute URL for same-origin static files (works from any folder) */
function rootStaticUrl(relativeFromWwwroot) {
  const rel = String(relativeFromWwwroot || "").replace(/^\/+/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/${rel}`;
  }
  return `/${rel}`;
}

/** Small header preview — faster than loading full-size originals */
function getHeaderAvatarThumbUrl(resolvedUrl) {
  const u = String(resolvedUrl || "").trim();
  if (!u) return "";
  if (
    u.startsWith("data:") ||
    /^https?:\/\//i.test(u) ||
    u.includes("/api/Images")
  ) {
    return u;
  }
  if (/user\.svg(?:[?#]|$)/i.test(u)) return u;
  if (u.startsWith("/icons/")) return u;
  return `/api/Images/resize?url=${encodeURIComponent(u)}&width=96`;
}

function markAuthReady() {
  if (document.body) {
    document.body.classList.add("auth-ready");
  }
}

let resolveAuthInitPromise = null;
window.rentlyAuthInitPromise =
  window.rentlyAuthInitPromise ||
  new Promise((resolve) => {
    resolveAuthInitPromise = resolve;
  });

function resolveAuthInit(isAuthenticated) {
  if (resolveAuthInitPromise) {
    resolveAuthInitPromise(!!isAuthenticated);
    resolveAuthInitPromise = null;
  }
}

function getCachedAvatarUrl() {
  return (
    localStorage.getItem(RentlyAuthCache.avatarThumb) ||
    localStorage.getItem(RentlyAuthCache.avatar) ||
    ""
  );
}

function cacheUserSnapshot(user) {
  if (!user) return;

  localStorage.setItem(RentlyAuthCache.user, JSON.stringify(user));

  const photo =
    user.profilePhotoUrl ?? user.ProfilePhotoUrl ?? user.profilePhotoURL ?? "";

  if (photo) {
    localStorage.setItem(RentlyAuthCache.avatar, photo);
    localStorage.setItem(
      RentlyAuthCache.avatarThumb,
      getHeaderAvatarThumbUrl(photo),
    );
  } else {
    localStorage.removeItem(RentlyAuthCache.avatar);
    localStorage.removeItem(RentlyAuthCache.avatarThumb);
  }
}

function applyCachedHeaderAvatar() {
  const icon = document.getElementById("header-user-icon");
  if (!icon) return;

  setHeaderUserIconSource(icon, getCachedAvatarUrl() || defaultUserIconUrl());
}

function rememberProfileReturnUrl(profileHref) {
  const href = String(profileHref || "");
  if (!/profile\.html(?:[?#]|$)/i.test(href)) return;
  if (/profile\.html(?:[?#]|$)/i.test(window.location.pathname)) return;

  try {
    sessionStorage.setItem("rently_profile_return_url", window.location.href);
  } catch {
    /* sessionStorage can be unavailable in private contexts */
  }
}

function getProfileReturnUrl(fallbackPath) {
  const fallback = new URL(fallbackPath, window.location.href).href;

  const isUsableReturnUrl = (value) => {
    if (!value) return false;
    try {
      const url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (/profile\.html(?:[?#]|$)/i.test(url.pathname)) return false;
      return true;
    } catch {
      return false;
    }
  };

  let stored = "";
  try {
    stored = sessionStorage.getItem("rently_profile_return_url") || "";
    sessionStorage.removeItem("rently_profile_return_url");
  } catch {
    stored = "";
  }

  if (isUsableReturnUrl(stored)) return stored;
  if (isUsableReturnUrl(document.referrer)) return document.referrer;
  return fallback;
}

/** Before initAuth: if token exists, show user slot immediately (avoid SIGN IN flash) */
function applyLoggedInHeaderShell() {
  const path = window.location.pathname || "";
  if (/login\.html|signup\.html/i.test(path)) return;
  if (!localStorage.getItem("auth_token")) return;
  const signInBtn = document.getElementById("header-signin-btn");
  const userWrapper = document.getElementById("header-user-wrapper");
  if (signInBtn) {
    signInBtn.style.display = "none";
    signInBtn.classList.add("hidden");
  }
  if (userWrapper) {
    userWrapper.classList.remove("hidden");
    userWrapper.style.display = "flex";
  }
  applyCachedHeaderAvatar();
}

function checkAuthState() {
  const isLoggedIn =
    localStorage.getItem("isLoggedIn") === "true" ||
    !!localStorage.getItem("auth_token");

  const isAuthPage =
    window.location.pathname.includes("login.html") ||
    window.location.pathname.includes("signup.html");

  const pathname = window.location.pathname || "";
  const inHostSubfolder = pathname.includes("/host-mode/");
  const isHostMode = inHostSubfolder || pathname.endsWith("/host-mode.html");

  // If NOT logged in and trying to access host mode - redirect to login
  if (!isLoggedIn && isHostMode) {
    redirectToLoginPreservingCurrentLocation();
    return;
  }

  // If logged in and on auth page, redirect to home
  if (isLoggedIn && isAuthPage) {
    window.location.href = "./index.html";
    return;
  }

  // Update header based on auth state
  updateHeaderUI(isLoggedIn, isAuthPage);

  // Intercept dropdown links for non-logged-in users
  if (!isLoggedIn) {
    const dropdown = document.getElementById("user-dropdown");
    if (dropdown) {
      const links = dropdown.querySelectorAll("a");
      links.forEach((link) => {
        const href = link.getAttribute("href");
        if (
          href &&
          !href.includes("index.html") &&
          !href.includes("help-center")
        ) {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.setItem(
              "redirectAfterAuth",
              new URL(href, window.location.href).href,
            );
            window.location.href = getLoginPageHref();
          });
        }
      });
    }
  }
}

function updateHeaderUI(isLoggedIn, isAuthPage) {
  const signInBtn = document.getElementById("header-signin-btn");
  const userWrapper = document.getElementById("header-user-wrapper");

  if (!userWrapper) return;

  if (isAuthPage) {
    // On login/signup page: always show sign in button, hide user profile
    if (signInBtn) {
      signInBtn.style.display = "";
      signInBtn.classList.remove("hidden");
    }
    userWrapper.classList.add("hidden");
    userWrapper.style.display = "none";
  } else {
    // On other pages: show based on auth state
    if (isLoggedIn) {
      if (signInBtn) {
        signInBtn.style.display = "none";
        signInBtn.classList.add("hidden");
      }
      userWrapper.classList.remove("hidden");
      userWrapper.style.display = "flex"; // Ensure it's displayed as flex
    } else {
      if (signInBtn) {
        signInBtn.style.display = "";
        signInBtn.classList.remove("hidden");
      }
      userWrapper.classList.add("hidden");
      userWrapper.style.display = "none";
    }
  }
}

function setHeaderUserIconSource(targetElement, source) {
  if (!targetElement) return;

  const defaultIcon = defaultUserIconUrl();
  const raw = source == null ? "" : String(source).trim();

  // Determine if this is a real photo (not a default user icon)
  const isDefaultIcon =
    !raw ||
    /user\.svg(?:[?#]|$)/i.test(raw) ||
    raw === defaultIcon ||
    raw === "./icons/user.svg" ||
    raw === "../icons/user.svg" ||
    /\/icons\/user\.svg(?:[?#]|$)/i.test(raw);
  const hasPhoto = !isDefaultIcon;

  let finalSrc = raw;

  if (!raw) {
    finalSrc = defaultIcon;
  } else if (raw.startsWith("http://") || raw.startsWith("https://")) {
    finalSrc = raw;
  } else if (raw.startsWith("data:")) {
    finalSrc = raw;
  } else if (raw.startsWith("/")) {
    finalSrc = raw;
  } else if (raw.startsWith("./") && getAuthAssetBase() === "../") {
    finalSrc = "../" + raw.slice(2);
  } else if (raw.startsWith("./") || raw.startsWith("../")) {
    finalSrc = raw;
  } else {
    finalSrc = "/" + raw.replace(/^\/+/, "");
  }

  if (targetElement.id === "header-user-icon" && hasPhoto) {
    finalSrc = getHeaderAvatarThumbUrl(finalSrc);
  }

  targetElement.classList.toggle("user-profile-avatar", hasPhoto);
  if (targetElement.id === "header-user-icon") {
    targetElement.classList.toggle("user-profile-icon--default", !hasPhoto);
  }

  const wrapper = targetElement.closest(
    ".host-photo-wrapper, .user-profile-wrapper",
  );
  if (wrapper) {
    wrapper.classList.toggle("has-profile-photo", hasPhoto);
  }

  if (
    targetElement.tagName === "IMG" &&
    targetElement.id === "header-user-icon"
  ) {
    targetElement.loading = "eager";
    targetElement.decoding = "async";
    try {
      targetElement.fetchPriority = "high";
    } catch {
      /* optional hint */
    }
  }

  targetElement.onerror = function onAvatarError() {
    this.onerror = null;
    this.classList.remove("user-profile-avatar");
    this.classList.add("user-profile-icon--default");
    if (wrapper) wrapper.classList.remove("has-profile-photo");
    this.src = rootStaticUrl("icons/user.svg");
  };

  targetElement.src = finalSrc;
}

/**
 * Updates all identity-related elements on the page (avatars, names, emails)
 */
function syncAllUserData(user) {
  if (!user) {
    setAllAvatars("");
    return;
  }

  const photo =
    user.profilePhotoUrl ?? user.ProfilePhotoUrl ?? user.profilePhotoURL ?? "";
  setAllAvatars(photo);

  // 2. Names
  const name = user.fullName || user.userName || user.email || "";
  const nameEls = [
    document.getElementById("dashboard-host-name"),
    document.getElementById("profile-name"),
  ];
  nameEls.forEach((el) => {
    if (!el) return;
    if (el.tagName === "INPUT") el.value = name;
    else el.textContent = name;
  });

  // 3. Emails
  const email = user.email || "";
  const emailEls = [
    document.getElementById("dashboard-host-email"),
    document.getElementById("profile-email"),
  ];
  emailEls.forEach((el) => {
    if (!el) return;
    if (el.tagName === "INPUT") el.value = email;
    else el.textContent = email;
  });

  // 4. Phone
  const phone = user.phoneNumber || "";
  const phoneEls = [
    document.getElementById("dashboard-host-phone"),
    document.getElementById("profile-phone"),
  ];
  phoneEls.forEach((el) => {
    if (!el) return;
    if (el.tagName === "INPUT") el.value = phone;
    else el.textContent = phone;
  });

  // 5. Bio
  const bio = user.bio || "";
  const bioEl = document.getElementById("profile-bio");
  if (bioEl) {
    if (bioEl.tagName === "TEXTAREA" || bioEl.tagName === "INPUT")
      bioEl.value = bio;
    else bioEl.textContent = bio;
  }
}

/**
 * Updates all avatar-related images on the page
 */
function setAllAvatars(source) {
  const elements = [
    document.getElementById("header-user-icon"),
    document.getElementById("dashboard-host-avatar"),
    document.getElementById("profile-avatar-preview"),
  ];

  // Also catch anything with these classes
  const classed = document.querySelectorAll(".host-photo, .user-profile-icon");
  classed.forEach((el) => elements.push(el));

  const uniqueElements = [...new Set(elements.filter(Boolean))];
  uniqueElements.forEach((el) => setHeaderUserIconSource(el, source));
}

function getStoredHostData() {
  try {
    return JSON.parse(localStorage.getItem(RentlyAuthCache.user) || "{}");
  } catch {
    return {};
  }
}

async function validateAndFetchUser(token) {
  if (!token) {
    syncAllUserData(null);
    resolveAuthInit(false);
    return;
  }

  try {
    const resp = await fetch("/api/Auth/me", {
      headers: { Authorization: "Bearer " + token },
    });

    if (resp.status === 401) {
      // Token is invalid, logout
      localStorage.removeItem("auth_token");
      localStorage.removeItem("isLoggedIn");
      updateHeaderUI(false, false);
      syncAllUserData(null);
      resolveAuthInit(false);
      if (
        window.location.pathname.includes("/host-mode/") ||
        isRestrictedHostIdRoute()
      ) {
        redirectToLoginPreservingCurrentLocation();
      }
      return;
    }

    if (!resp.ok) {
      resolveAuthInit(false);
      return;
    }

    const user = await resp.json();
    if (!user) {
      resolveAuthInit(false);
      return;
    }

    // Token is valid, ensure auth state is set
    localStorage.setItem("isLoggedIn", "true");
    updateHeaderUI(true, false);

    // Update ALL UI elements synchronously
    syncAllUserData(user);

    // Update cache
    cacheUserSnapshot(user);

    // Special handling for dropdown links
    updateDropdownLinks(user);
    resolveAuthInit(true);
  } catch (e) {
    console.error("Auth validation failed:", e);
    resolveAuthInit(false);
  }
}

function updateDropdownLinks(user) {
  const dropdown = document.getElementById("user-dropdown");
  if (!dropdown || !user) return;

  // Better mode detection
  const pathname = window.location.pathname;
  console.log("[Auth] Current pathname:", pathname);
  const isHostMode =
    pathname.includes("/host-mode/") || pathname.includes("host-mode.html");
  const isGuestMode = !isHostMode; // If not host mode, assume guest mode
  console.log("[Auth] isHostMode:", isHostMode, "isGuestMode:", isGuestMode);

  const inHostSubfolder = pathname.includes("/host-mode/");
  const profileHref = isGuestMode
    ? "./profile.html"
    : inHostSubfolder
      ? "./profile.html"
      : "./host-mode/profile.html";
  const favoritesHref = isGuestMode
    ? "./favorites.html"
    : inHostSubfolder
      ? "./favorites.html"
      : "./host-mode/favorites.html";
  console.log("[Auth] profileHref:", profileHref);

  const profileLink = dropdown.querySelector('a[href*="profile"]');
  if (profileLink) profileLink.setAttribute("href", profileHref);

  const favLink = Array.from(dropdown.querySelectorAll("a")).find((a) =>
    /favorite/i.test(a.textContent || ""),
  );
  if (favLink) favLink.setAttribute("href", favoritesHref);
}

function initAuth() {
  // Check basic auth state from localStorage first for fast UI update
  checkAuthState();

  const token = localStorage.getItem("auth_token");
  const cachedHostAvatar = getCachedAvatarUrl();
  const cachedHostData = getStoredHostData();

  // 1. Initial UI update (fast fallback from cache)
  if (token) {
    const initialUser = {
      profilePhotoUrl:
        cachedHostAvatar ||
        cachedHostData.profilePhotoUrl ||
        cachedHostData.ProfilePhotoUrl ||
        rootStaticUrl("icons/user.svg"),
      fullName: cachedHostData.fullName || cachedHostData.name || "",
      email: cachedHostData.email || "",
      phoneNumber: cachedHostData.phoneNumber || cachedHostData.phone || "",
      bio: cachedHostData.bio || "",
    };
    syncAllUserData(initialUser);
    markAuthReady();

    // 2. Validate token and get fresh data asynchronously
    validateAndFetchUser(token);
  } else {
    syncAllUserData(null);
    markAuthReady();
    resolveAuthInit(false);
  }

  // 3. Attach common event listeners
  attachListeners();
}

let _authListenersAttached = false;

function attachListeners() {
  if (_authListenersAttached) return;
  _authListenersAttached = true;

  const signInBtn = document.getElementById("header-signin-btn");
  if (signInBtn) {
    signInBtn.addEventListener("click", () => {
      if (
        !window.location.pathname.includes("login.html") &&
        !window.location.pathname.includes("signup.html")
      ) {
        localStorage.setItem("redirectAfterAuth", window.location.href);
      }
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerText = "Signing in...";

      const emailInput = loginForm.querySelector(
        'input[type="email"], input[type="text"]',
      );
      const passwordInput = loginForm.querySelector('input[type="password"]');

      try {
        const response = await fetch("/api/Auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailInput.value,
            password: passwordInput.value,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Invalid credentials";
          try {
            const err = await response.json();
            errorMessage = err.message || errorMessage;
          } catch {
            const errText = await response.text();
            if (errText) {
              errorMessage = errText;
            }
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const token =
          data?.token ?? data?.Token ?? data?.accessToken ?? data?.AccessToken;
        if (!token) {
          throw new Error(
            "Login succeeded, but the server did not return a token.",
          );
        }
        localStorage.setItem("auth_token", token);
        localStorage.setItem("isLoggedIn", "true");

        // Save user data from login response for immediate use
        if (data.user) {
          cacheUserSnapshot(data.user);
        }

        const redirectUrl = await resolvePostAuthRedirect(token, "./index.html");
        window.location.href = redirectUrl;
      } catch (err) {
        if (localStorage.getItem("auth_token")) {
          return;
        }
        const msg =
          err && typeof err.message === "string"
            ? err.message
            : "Something went wrong. Please try again.";
        alert("Login Error: " + msg);
        submitBtn.disabled = false;
        submitBtn.innerText = "Sign in";
      }
    });
  }

  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const passwords = signupForm.querySelectorAll('input[type="password"]');
      if (passwords[0].value !== passwords[1].value) {
        alert("Passwords do not match!");
        return;
      }

      const emailInput = signupForm.querySelector('input[type="email"]');
      const fullnameInput = signupForm.querySelector('input[name="fullName"]');

      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerText = "Creating account...";

      try {
        const response = await fetch("/api/Auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailInput.value,
            password: passwords[0].value,
            fullName: fullnameInput ? fullnameInput.value : "",
            role: "Host", // Default to host for this requirement
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || "Could not register");
        }

        const data = await response.json();
        localStorage.setItem("auth_token", data.token);
        localStorage.setItem("isLoggedIn", "true");

        // Save user data from signup response for immediate use
        if (data.user) {
          cacheUserSnapshot(data.user);
        }

        const redirectUrl = await resolvePostAuthRedirect(
          data.token,
          "./index.html",
        );
        window.location.href = redirectUrl;
      } catch (err) {
        if (localStorage.getItem("auth_token")) {
          return;
        }
        const msg =
          err && typeof err.message === "string"
            ? err.message
            : "Something went wrong. Please try again.";
        alert("Signup Error: " + msg);
        submitBtn.disabled = false;
        submitBtn.innerText = "Create Account";
      }
    });
  }

  const userWrapperForDropdown = document.getElementById("header-user-wrapper");
  const dropdown = document.getElementById("user-dropdown");

  if (userWrapperForDropdown && dropdown) {
    userWrapperForDropdown.style.cursor = "pointer";

    userWrapperForDropdown.addEventListener("click", (e) => {
      if (dropdown.contains(e.target)) {
        return;
      }
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (userWrapperForDropdown.classList.contains("hidden")) return;
      if (
        dropdown.contains(e.target) ||
        userWrapperForDropdown.contains(e.target)
      ) {
        return;
      }
      dropdown.classList.remove("show");
    });

    // Also close dropdown when any link is clicked
    dropdown.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        rememberProfileReturnUrl(link.getAttribute("href"));
        dropdown.classList.remove("show");
      });
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Clear ALL auth and user related data
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("redirectAfterAuth");
      localStorage.removeItem(RentlyAuthCache.avatar);
      localStorage.removeItem(RentlyAuthCache.avatarThumb);
      localStorage.removeItem(RentlyAuthCache.user);
      localStorage.removeItem("selectedAccommodationId");

      const inHostSubfolder = window.location.pathname.includes("/host-mode/");
      const homePath = inHostSubfolder ? "../index.html" : "./index.html";
      window.location.href = homePath + "?" + new Date().getTime();
    });
  }
}

// Call initAuth when appropriate; shell runs as soon as this script executes (end of body)
if (document.body) {
  applyLoggedInHeaderShell();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth);
} else {
  initAuth();
}
