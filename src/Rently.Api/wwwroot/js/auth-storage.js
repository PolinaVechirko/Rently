(function initRentlyAuthStorage(root) {
  if (!root) return;

  const storage = root.RentlyAuthStorage || {};
  const profileStorage = root.RentlyProfileStorage || {};
  const pageState = root.RentlyPageStateStorage || {};

  storage.cacheKeys = {
    user: "rently_host_data",
    avatar: "rently_host_avatar",
    avatarThumb: "rently_header_avatar_thumb",
    profileDraft: "rently_user_data",
    rememberedLoginEmail: "rently_remembered_login_email",
  };

  pageState.keys = {
    selectedAccommodationId: "selectedAccommodationId",
    favoritesChanged: "rently_favorites_changed",
  };

  storage.scopedKeys = new Set([
    "auth_token",
    "isLoggedIn",
    "redirectAfterAuth",
    "selectedAccommodationId",
    storage.cacheKeys.user,
    storage.cacheKeys.avatar,
    storage.cacheKeys.avatarThumb,
  ]);

  storage.patchScopedAuthStorage = function patchScopedAuthStorage() {
    const local = root.localStorage;
    const session = root.sessionStorage;
    const storageProto = root.Storage && root.Storage.prototype;
    if (
      !local ||
      !session ||
      !storageProto ||
      storageProto.__rentlyScopedAuthPatched
    ) {
      return;
    }

    const originalGetItem = storageProto.getItem;
    const originalSetItem = storageProto.setItem;
    const originalRemoveItem = storageProto.removeItem;

    for (const key of storage.scopedKeys) {
      try {
        originalRemoveItem.call(local, key);
      } catch {
        return;
      }
    }

    storageProto.getItem = function getScopedItem(key) {
      const normalizedKey = String(key);
      if (this === local && storage.scopedKeys.has(normalizedKey)) {
        return originalGetItem.call(session, normalizedKey);
      }
      return originalGetItem.call(this, normalizedKey);
    };

    storageProto.setItem = function setScopedItem(key, value) {
      const normalizedKey = String(key);
      const normalizedValue = String(value);
      if (this === local && storage.scopedKeys.has(normalizedKey)) {
        originalSetItem.call(session, normalizedKey, normalizedValue);
        return;
      }
      originalSetItem.call(this, normalizedKey, normalizedValue);
    };

    storageProto.removeItem = function removeScopedItem(key) {
      const normalizedKey = String(key);
      if (this === local && storage.scopedKeys.has(normalizedKey)) {
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
  };

  storage.getAuthToken = function getAuthToken() {
    return root.localStorage?.getItem("auth_token") || "";
  };

  storage.isLoggedIn = function isLoggedIn() {
    return (
      root.localStorage?.getItem("isLoggedIn") === "true" ||
      !!storage.getAuthToken()
    );
  };

  storage.setAuthenticated = function setAuthenticated(token) {
    if (token) {
      root.localStorage?.setItem("auth_token", token);
    }
    root.localStorage?.setItem("isLoggedIn", "true");
  };

  storage.clearAuthentication = function clearAuthentication() {
    root.localStorage?.removeItem("auth_token");
    root.localStorage?.removeItem("isLoggedIn");
  };

  storage.setRedirectAfterAuth = function setRedirectAfterAuth(url) {
    if (!url) return;
    root.localStorage?.setItem("redirectAfterAuth", String(url));
  };

  storage.getRedirectAfterAuth = function getRedirectAfterAuth() {
    return root.localStorage?.getItem("redirectAfterAuth") || "";
  };

  storage.clearRedirectAfterAuth = function clearRedirectAfterAuth() {
    root.localStorage?.removeItem("redirectAfterAuth");
  };

  storage.getRememberedLoginEmail = function getRememberedLoginEmail() {
    return root.localStorage?.getItem(storage.cacheKeys.rememberedLoginEmail) || "";
  };

  storage.setRememberedLoginEmail =
    function setRememberedLoginEmail(email) {
      const normalizedEmail = String(email || "").trim();
      if (!normalizedEmail) return;
      root.localStorage?.setItem(
        storage.cacheKeys.rememberedLoginEmail,
        normalizedEmail,
      );
    };

  storage.clearRememberedLoginEmail =
    function clearRememberedLoginEmail() {
      root.localStorage?.removeItem(storage.cacheKeys.rememberedLoginEmail);
    };

  storage.getStoredUserData = function getStoredUserData() {
    try {
      return JSON.parse(
        root.localStorage?.getItem(storage.cacheKeys.user) || "{}",
      );
    } catch {
      return {};
    }
  };

  storage.getCachedAvatarUrl = function getCachedAvatarUrl() {
    return (
      root.localStorage?.getItem(storage.cacheKeys.avatarThumb) ||
      root.localStorage?.getItem(storage.cacheKeys.avatar) ||
      ""
    );
  };

  storage.cacheUserSnapshot = function cacheUserSnapshot(
    user,
    thumbUrlFactory,
  ) {
    if (!user) return;

    root.localStorage?.setItem(storage.cacheKeys.user, JSON.stringify(user));

    const photo =
      user.profilePhotoUrl ??
      user.ProfilePhotoUrl ??
      user.profilePhotoURL ??
      "";

    if (photo) {
      root.localStorage?.setItem(storage.cacheKeys.avatar, photo);
      root.localStorage?.setItem(
        storage.cacheKeys.avatarThumb,
        typeof thumbUrlFactory === "function" ? thumbUrlFactory(photo) : photo,
      );
      return;
    }

    root.localStorage?.removeItem(storage.cacheKeys.avatar);
    root.localStorage?.removeItem(storage.cacheKeys.avatarThumb);
  };

  storage.clearUserSnapshot = function clearUserSnapshot() {
    root.localStorage?.removeItem(storage.cacheKeys.avatar);
    root.localStorage?.removeItem(storage.cacheKeys.avatarThumb);
    root.localStorage?.removeItem(storage.cacheKeys.user);
  };

  profileStorage.getStoredUserData = function getStoredUserData() {
    return storage.getStoredUserData();
  };

  profileStorage.setStoredUserData = function setStoredUserData(userData) {
    root.localStorage?.setItem(
      storage.cacheKeys.profileDraft,
      JSON.stringify(userData || {}),
    );
  };

  profileStorage.getStoredProfileDraft = function getStoredProfileDraft() {
    try {
      return JSON.parse(
        root.localStorage?.getItem(storage.cacheKeys.profileDraft) || "{}",
      );
    } catch {
      return {};
    }
  };

  profileStorage.clearStoredProfileDraft = function clearStoredProfileDraft() {
    root.localStorage?.removeItem(storage.cacheKeys.profileDraft);
  };

  profileStorage.getAvatarUrl = function getAvatarUrl() {
    return (
      root.localStorage?.getItem("rently_avatar") ||
      storage.getCachedAvatarUrl()
    );
  };

  profileStorage.setAvatarUrls = function setAvatarUrls(url, thumbUrl = "") {
    if (!url) return;
    root.localStorage?.setItem("rently_avatar", url);
    root.localStorage?.setItem(storage.cacheKeys.avatar, url);
    root.localStorage?.setItem(
      storage.cacheKeys.avatarThumb,
      thumbUrl || url,
    );
  };

  profileStorage.clearAvatarUrls = function clearAvatarUrls() {
    root.localStorage?.removeItem("rently_avatar");
    root.localStorage?.removeItem(storage.cacheKeys.avatar);
    root.localStorage?.removeItem(storage.cacheKeys.avatarThumb);
  };

  pageState.getSelectedAccommodationId = function getSelectedAccommodationId() {
    return root.localStorage?.getItem(pageState.keys.selectedAccommodationId) || "";
  };

  pageState.setSelectedAccommodationId = function setSelectedAccommodationId(id) {
    if (id === null || id === undefined || id === "") return;
    root.localStorage?.setItem(
      pageState.keys.selectedAccommodationId,
      String(id),
    );
  };

  pageState.clearSelectedAccommodationId =
    function clearSelectedAccommodationId() {
      root.localStorage?.removeItem(pageState.keys.selectedAccommodationId);
    };

  pageState.setFavoritesChanged = function setFavoritesChanged(payload) {
    if (!payload) return;
    root.localStorage?.setItem(
      pageState.keys.favoritesChanged,
      JSON.stringify(payload),
    );
  };

  pageState.getFavoritesChanged = function getFavoritesChanged() {
    try {
      return JSON.parse(
        root.localStorage?.getItem(pageState.keys.favoritesChanged) || "null",
      );
    } catch {
      return null;
    }
  };

  pageState.clearFavoritesChanged = function clearFavoritesChanged() {
    root.localStorage?.removeItem(pageState.keys.favoritesChanged);
  };

  storage.patchScopedAuthStorage();
  root.RentlyAuthStorage = storage;
  root.RentlyProfileStorage = profileStorage;
  root.RentlyPageStateStorage = pageState;
})(window);
