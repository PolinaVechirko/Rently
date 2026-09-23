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

  // Sign-in state lives in sessionStorage (per tab); other preferences stay in localStorage.
  function storageFor(key) {
    return storage.scopedKeys.has(key) ? root.sessionStorage : root.localStorage;
  }

  function read(key) {
    try {
      return storageFor(key)?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      storageFor(key)?.setItem(key, String(value));
    } catch {
      /* storage can be unavailable in private contexts */
    }
  }

  function remove(key) {
    try {
      storageFor(key)?.removeItem(key);
    } catch {
      /* storage can be unavailable in private contexts */
    }
  }

  // Older versions kept sign-in data in localStorage; drop it so it cannot leak into new tabs.
  function removeLegacyLocalAuthKeys() {
    try {
      for (const key of storage.scopedKeys) {
        root.localStorage?.removeItem(key);
      }
    } catch {
      /* storage can be unavailable in private contexts */
    }
  }

  storage.getAuthToken = function getAuthToken() {
    return read("auth_token") || "";
  };

  storage.isLoggedIn = function isLoggedIn() {
    return (
      read("isLoggedIn") === "true" ||
      !!storage.getAuthToken()
    );
  };

  storage.setAuthenticated = function setAuthenticated(token) {
    if (token) {
      write("auth_token", token);
    }
    write("isLoggedIn", "true");
  };

  storage.clearAuthentication = function clearAuthentication() {
    remove("auth_token");
    remove("isLoggedIn");
  };

  storage.setRedirectAfterAuth = function setRedirectAfterAuth(url) {
    if (!url) return;
    write("redirectAfterAuth", String(url));
  };

  storage.getRedirectAfterAuth = function getRedirectAfterAuth() {
    return read("redirectAfterAuth") || "";
  };

  storage.clearRedirectAfterAuth = function clearRedirectAfterAuth() {
    remove("redirectAfterAuth");
  };

  storage.getRememberedLoginEmail = function getRememberedLoginEmail() {
    return read(storage.cacheKeys.rememberedLoginEmail) || "";
  };

  storage.setRememberedLoginEmail =
    function setRememberedLoginEmail(email) {
      const normalizedEmail = String(email || "").trim();
      if (!normalizedEmail) return;
      write(
        storage.cacheKeys.rememberedLoginEmail,
        normalizedEmail,
      );
    };

  storage.clearRememberedLoginEmail =
    function clearRememberedLoginEmail() {
      remove(storage.cacheKeys.rememberedLoginEmail);
    };

  storage.getStoredUserData = function getStoredUserData() {
    try {
      return JSON.parse(
        read(storage.cacheKeys.user) || "{}",
      );
    } catch {
      return {};
    }
  };

  storage.getCachedAvatarUrl = function getCachedAvatarUrl() {
    return (
      read(storage.cacheKeys.avatarThumb) ||
      read(storage.cacheKeys.avatar) ||
      ""
    );
  };

  storage.cacheUserSnapshot = function cacheUserSnapshot(
    user,
    thumbUrlFactory,
  ) {
    if (!user) return;

    write(storage.cacheKeys.user, JSON.stringify(user));

    const photo =
      user.profilePhotoUrl ??
      user.profilePhotoURL ??
      "";

    if (photo) {
      write(storage.cacheKeys.avatar, photo);
      write(
        storage.cacheKeys.avatarThumb,
        typeof thumbUrlFactory === "function" ? thumbUrlFactory(photo) : photo,
      );
      return;
    }

    remove(storage.cacheKeys.avatar);
    remove(storage.cacheKeys.avatarThumb);
  };

  storage.clearUserSnapshot = function clearUserSnapshot() {
    remove(storage.cacheKeys.avatar);
    remove(storage.cacheKeys.avatarThumb);
    remove(storage.cacheKeys.user);
  };

  profileStorage.getStoredUserData = function getStoredUserData() {
    return storage.getStoredUserData();
  };

  profileStorage.setStoredUserData = function setStoredUserData(userData) {
    write(
      storage.cacheKeys.profileDraft,
      JSON.stringify(userData || {}),
    );
  };

  profileStorage.setStoredProfileDraft = function setStoredProfileDraft(draft) {
    profileStorage.setStoredUserData(draft);
  };

  profileStorage.getStoredProfileDraft = function getStoredProfileDraft() {
    try {
      return JSON.parse(
        read(storage.cacheKeys.profileDraft) || "{}",
      );
    } catch {
      return {};
    }
  };

  profileStorage.clearStoredProfileDraft = function clearStoredProfileDraft() {
    remove(storage.cacheKeys.profileDraft);
  };

  profileStorage.getAvatarUrl = function getAvatarUrl() {
    return (
      read("rently_avatar") ||
      storage.getCachedAvatarUrl()
    );
  };

  profileStorage.setAvatarUrls = function setAvatarUrls(url, thumbUrl = "") {
    if (!url) return;
    write("rently_avatar", url);
    write(storage.cacheKeys.avatar, url);
    write(
      storage.cacheKeys.avatarThumb,
      thumbUrl || url,
    );
  };

  profileStorage.clearAvatarUrls = function clearAvatarUrls() {
    remove("rently_avatar");
    remove(storage.cacheKeys.avatar);
    remove(storage.cacheKeys.avatarThumb);
  };

  pageState.getSelectedAccommodationId = function getSelectedAccommodationId() {
    return read(pageState.keys.selectedAccommodationId) || "";
  };

  pageState.setSelectedAccommodationId = function setSelectedAccommodationId(id) {
    if (id === null || id === undefined || id === "") return;
    write(
      pageState.keys.selectedAccommodationId,
      String(id),
    );
  };

  pageState.clearSelectedAccommodationId =
    function clearSelectedAccommodationId() {
      remove(pageState.keys.selectedAccommodationId);
    };

  pageState.setFavoritesChanged = function setFavoritesChanged(payload) {
    if (!payload) return;
    write(
      pageState.keys.favoritesChanged,
      JSON.stringify(payload),
    );
  };

  pageState.getFavoritesChanged = function getFavoritesChanged() {
    try {
      return JSON.parse(
        read(pageState.keys.favoritesChanged) || "null",
      );
    } catch {
      return null;
    }
  };

  pageState.clearFavoritesChanged = function clearFavoritesChanged() {
    remove(pageState.keys.favoritesChanged);
  };

  removeLegacyLocalAuthKeys();
  root.RentlyAuthStorage = storage;
  root.RentlyProfileStorage = profileStorage;
  root.RentlyPageStateStorage = pageState;
})(window);
