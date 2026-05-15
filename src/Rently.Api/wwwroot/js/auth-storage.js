(function initRentlyAuthStorage(root) {
  if (!root) return;

  const storage = root.RentlyAuthStorage || {};

  storage.cacheKeys = {
    user: "rently_host_data",
    avatar: "rently_host_avatar",
    avatarThumb: "rently_header_avatar_thumb",
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

  storage.patchScopedAuthStorage();
  root.RentlyAuthStorage = storage;
})(window);
