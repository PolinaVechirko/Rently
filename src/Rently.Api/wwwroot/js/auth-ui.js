(function initRentlyAuthUi(root) {
  if (!root) return;

  const authUi = root.RentlyAuthUi || {};

  authUi.getAuthAssetBase = function getAuthAssetBase() {
    if (root.RentlyAppContext) {
      return root.RentlyAppContext.getAssetBase();
    }

    const path = root.location.pathname || "";
    return path.includes("/host-mode/") ? "../" : "./";
  };

  authUi.defaultUserIconUrl = function defaultUserIconUrl() {
    return `${authUi.getAuthAssetBase()}icons/user.svg`;
  };

  authUi.rootStaticUrl = function rootStaticUrl(relativeFromWwwroot) {
    const rel = String(relativeFromWwwroot || "").replace(/^\/+/, "");
    if (typeof root !== "undefined" && root.location?.origin) {
      return `${root.location.origin}/${rel}`;
    }
    return `/${rel}`;
  };

  authUi.getHeaderAvatarThumbUrl = function getHeaderAvatarThumbUrl(resolvedUrl) {
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
  };

  authUi.markAuthReady = function markAuthReady() {
    if (document.body) {
      document.body.classList.add("auth-ready");
    }
  };

  authUi.setHeaderUserIconSource = function setHeaderUserIconSource(targetElement, source) {
    if (!targetElement) return;

    const defaultIcon = authUi.defaultUserIconUrl();
    const raw = source == null ? "" : String(source).trim();

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
    } else if (raw.startsWith("./") && authUi.getAuthAssetBase() === "../") {
      finalSrc = "../" + raw.slice(2);
    } else if (raw.startsWith("./") || raw.startsWith("../")) {
      finalSrc = raw;
    } else {
      finalSrc = "/" + raw.replace(/^\/+/, "");
    }

    if (targetElement.id === "header-user-icon" && hasPhoto) {
      finalSrc = authUi.getHeaderAvatarThumbUrl(finalSrc);
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
      this.src = authUi.rootStaticUrl("icons/user.svg");
    };

    targetElement.src = finalSrc;
  };

  authUi.getCachedAvatarUrl = function getCachedAvatarUrl() {
    return root.RentlyAuthStorage
      ? root.RentlyAuthStorage.getCachedAvatarUrl()
      : "";
  };

  authUi.applyCachedHeaderAvatar = function applyCachedHeaderAvatar() {
    const icon = document.getElementById("header-user-icon");
    if (!icon) return;

    authUi.setHeaderUserIconSource(
      icon,
      authUi.getCachedAvatarUrl() || authUi.defaultUserIconUrl(),
    );
  };

  authUi.updateHeaderUI = function updateHeaderUI(isLoggedIn, isAuthPage) {
    const signInBtn = document.getElementById("header-signin-btn");
    const userWrapper = document.getElementById("header-user-wrapper");

    if (!userWrapper) return;

    if (isAuthPage) {
      if (signInBtn) {
        signInBtn.style.display = "";
        signInBtn.classList.remove("hidden");
      }
      userWrapper.classList.add("hidden");
      userWrapper.style.display = "none";
      return;
    }

    if (isLoggedIn) {
      if (signInBtn) {
        signInBtn.style.display = "none";
        signInBtn.classList.add("hidden");
      }
      userWrapper.classList.remove("hidden");
      userWrapper.style.display = "flex";
      return;
    }

    if (signInBtn) {
      signInBtn.style.display = "";
      signInBtn.classList.remove("hidden");
    }
    userWrapper.classList.add("hidden");
    userWrapper.style.display = "none";
  };

  authUi.setAllAvatars = function setAllAvatars(source) {
    const elements = [
      document.getElementById("header-user-icon"),
      document.getElementById("dashboard-host-avatar"),
      document.getElementById("profile-avatar-preview"),
    ];

    const classed = document.querySelectorAll(".host-photo, .user-profile-icon");
    classed.forEach((el) => elements.push(el));

    const uniqueElements = [...new Set(elements.filter(Boolean))];
    uniqueElements.forEach((el) => authUi.setHeaderUserIconSource(el, source));
  };

  authUi.syncAllUserData = function syncAllUserData(user) {
    if (!user) {
      authUi.setAllAvatars("");
      return;
    }

    const photo =
      user.profilePhotoUrl ?? user.ProfilePhotoUrl ?? user.profilePhotoURL ?? "";
    authUi.setAllAvatars(photo);

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

    const bio = user.bio || "";
    const bioEl = document.getElementById("profile-bio");
    if (bioEl) {
      if (bioEl.tagName === "TEXTAREA" || bioEl.tagName === "INPUT") {
        bioEl.value = bio;
      } else {
        bioEl.textContent = bio;
      }
    }
  };

  authUi.updateDropdownLinks = function updateDropdownLinks(user) {
    const dropdown = document.getElementById("user-dropdown");
    if (!dropdown || !user) return;

    const pathname = root.location.pathname;
    const isHostMode =
      pathname.includes("/host-mode/") || pathname.includes("host-mode.html");
    const isGuestMode = !isHostMode;
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

    const profileLink = dropdown.querySelector('a[href*="profile"]');
    if (profileLink) profileLink.setAttribute("href", profileHref);

    const favLink = Array.from(dropdown.querySelectorAll("a")).find((a) =>
      /favorite/i.test(a.textContent || ""),
    );
    if (favLink) favLink.setAttribute("href", favoritesHref);
  };

  authUi.applyLoggedInHeaderShell = function applyLoggedInHeaderShell() {
    const path = root.location.pathname || "";
    if (/login\.html|signup\.html/i.test(path)) return;
    if (!root.localStorage?.getItem("auth_token")) return;

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
    authUi.applyCachedHeaderAvatar();
  };

  root.RentlyAuthUi = authUi;
})(window);
