(function initRentlyFavoriteInteractions(root) {
  if (!root) return;

  const favorites = root.RentlyFavoriteInteractions || {};

  favorites.rememberFavoriteChange = function rememberFavoriteChange(id, type, isActive) {
    if (!id || !type) return;
    try {
      root.RentlyPageStateStorage?.setFavoritesChanged({
        id: String(id),
        type: String(type),
        isActive: !!isActive,
        changedAt: Date.now(),
      });
    } catch {}
  };

  favorites.getRememberedFavoriteState = function getRememberedFavoriteState(id, type) {
    if (!id || !type) return null;
    try {
      const data = root.RentlyPageStateStorage?.getFavoritesChanged();
      if (!data || String(data.id) !== String(id) || String(data.type) !== String(type)) {
        return null;
      }
      return !!data.isActive;
    } catch {
      return null;
    }
  };

  favorites.getFavoriteType = function getFavoriteType() {
    return root.RentlyRenderHelpers?.isInHostMode() ? "Host" : "Guest";
  };

  favorites.getFavoriteIconSrc = function getFavoriteIconSrc(isActive) {
    const assetBase = root.RentlyRenderHelpers?.getAssetBase() || "./";
    return isActive
      ? assetBase + "icons/favorite-filled.svg"
      : assetBase + "icons/favorite.svg";
  };

  favorites.updateAllFavoriteIcons = function updateAllFavoriteIcons() {
    document.querySelectorAll(".favorite-btn").forEach((btn) => {
      const isActive = btn.classList.contains("active");
      const img = btn.querySelector("img");
      if (img) {
        img.src = favorites.getFavoriteIconSrc(isActive);
      }
    });
  };

  favorites.setFavoriteButtonState = function setFavoriteButtonState(btn, isActive) {
    if (!btn) return;
    btn.classList.toggle("active", isActive);
    btn.setAttribute(
      "aria-label",
      isActive ? "Remove from favorites" : "Add to favorites",
    );
    const img = btn.querySelector("img");
    if (img) img.src = favorites.getFavoriteIconSrc(isActive);
  };

  favorites.syncFavoriteButtons = async function syncFavoriteButtons() {
    const buttons = Array.from(document.querySelectorAll(".favorite-btn[data-id]"));
    if (buttons.length === 0) return;

    const favoriteType = favorites.getFavoriteType();
    const rememberedStates = new Map();
    buttons.forEach((btn) => {
      const rememberedState = favorites.getRememberedFavoriteState(btn.dataset.id, favoriteType);
      if (rememberedState !== null) {
        rememberedStates.set(String(btn.dataset.id), rememberedState);
        favorites.setFavoriteButtonState(btn, rememberedState);
      }
    });

    const token =
      root.RentlyApi?.getAuthToken() ||
      root.RentlyAuthStorage?.getAuthToken() ||
      "";
    if (!token) return;

    try {
      const resp = root.RentlyFavoritesApi
        ? await root.RentlyFavoritesApi.listResponse({ cacheBust: true })
        : await root.fetch(`/api/Favorites?_=${Date.now()}`, {
            headers: {
              Authorization: "Bearer " + token,
              "Cache-Control": "no-cache",
            },
          });
      if (!resp.ok) return;

      const data = await resp.json();
      if (!Array.isArray(data)) return;

      const favoriteIds = new Set(
        data
          .filter((fav) =>
            root.RentlyRenderHelpers?.isInHostMode()
              ? fav.isHostFavorite === true
              : fav.isGuestFavorite === true,
          )
          .map((fav) => fav.accommodation?.id ?? fav.accommodation?.Id ?? fav.id ?? fav.Id)
          .filter((id) => id !== null && id !== undefined)
          .map(String),
      );

      buttons.forEach((btn) => {
        const buttonId = String(btn.dataset.id);
        if (rememberedStates.has(buttonId)) {
          return;
        }
        favorites.setFavoriteButtonState(btn, favoriteIds.has(buttonId));
      });
    } catch (error) {
      console.debug("Could not sync favorite buttons:", error);
    }
  };

  favorites.redirectUnauthenticated = function redirectUnauthenticated() {
    root.RentlyAuthStorage?.setRedirectAfterAuth(root.location.href);
    const loginPath = (root.location.pathname || "").includes("/host-mode/")
      ? "../login.html"
      : "./login.html";
    root.location.href = loginPath;
  };

  favorites.resolveButtonId = function resolveButtonId(btn) {
    const card = btn?.closest(".accommodation-card");
    let id = card ? card.getAttribute("data-id") : null;
    if (!id) id = btn?.dataset.id || btn?.getAttribute("data-id");
    return id;
  };

  favorites.handleFavoriteToggle = async function handleFavoriteToggle(
    btn,
    options = {},
  ) {
    if (!btn) return false;

    const isLoggedIn =
      root.RentlyAuthStorage?.isLoggedIn() === true ||
      !!(root.RentlyApi?.getAuthToken() || root.RentlyAuthStorage?.getAuthToken());
    if (!isLoggedIn) {
      favorites.redirectUnauthenticated();
      return true;
    }

    const id = favorites.resolveButtonId(btn);
    if (!id) {
      btn.classList.toggle("active");
      return true;
    }

    const favoriteType = favorites.getFavoriteType();
    const onFavoritesPage =
      options.onFavoritesPage ?? /\/favorites\.html$/i.test(root.location.pathname);
    const allowConflictOnAdd = options.allowConflictOnAdd === true;
    const allowNotFoundOnRemove = options.allowNotFoundOnRemove === true;
    const checkExistingBeforeAdd = options.checkExistingBeforeAdd === true;

    try {
      const isActive = btn.classList.contains("active");
      if (isActive) {
        if (onFavoritesPage) {
          favorites.rememberFavoriteChange(id, favoriteType, false);
        }

        const removeResp = root.RentlyFavoritesApi
          ? await root.RentlyFavoritesApi.removeResponse(id, favoriteType)
          : await root.fetch(`/api/Favorites/${id}?type=${favoriteType}`, {
              method: "DELETE",
              headers: {
                Authorization:
                  "Bearer " + (root.RentlyApi?.getAuthToken() || root.RentlyAuthStorage?.getAuthToken() || ""),
              },
            });

        if (
          !removeResp.ok &&
          removeResp.status !== 204 &&
          !(allowNotFoundOnRemove && removeResp.status === 404)
        ) {
          throw new Error("Failed to remove favorite");
        }

        favorites.setFavoriteButtonState(btn, false);
        favorites.rememberFavoriteChange(id, favoriteType, false);
        return true;
      }

      if (checkExistingBeforeAdd) {
        const stateResp = root.RentlyFavoritesApi
          ? await root.RentlyFavoritesApi.getStateResponse(id)
          : await root.fetch(`/api/Favorites/${id}`, {
              headers: {
                Authorization:
                  "Bearer " + (root.RentlyApi?.getAuthToken() || root.RentlyAuthStorage?.getAuthToken() || ""),
              },
            });

        if (stateResp.ok) {
          const stateData = await stateResp.json();
          const alreadyActive =
            favoriteType === "Host"
              ? stateData?.hostFavorited === true
              : stateData?.guestFavorited === true;

          if (alreadyActive) {
            favorites.setFavoriteButtonState(btn, true);
            favorites.rememberFavoriteChange(id, favoriteType, true);
            return true;
          }
        }
      }

      const addResp = root.RentlyFavoritesApi
        ? await root.RentlyFavoritesApi.addResponse(id, favoriteType)
        : await root.fetch(`/api/Favorites/${id}?type=${favoriteType}`, {
            method: "POST",
            headers: {
              Authorization:
                "Bearer " + (root.RentlyApi?.getAuthToken() || root.RentlyAuthStorage?.getAuthToken() || ""),
            },
          });

      if (!addResp.ok && !(allowConflictOnAdd && addResp.status === 409)) {
        throw new Error("Failed to add favorite");
      }

      favorites.setFavoriteButtonState(btn, true);
      favorites.rememberFavoriteChange(id, favoriteType, true);
      return true;
    } catch (err) {
      if (onFavoritesPage) {
        favorites.rememberFavoriteChange(id, favoriteType, true);
      }
      console.error("Favorites Error:", err);
      return false;
    }
  };

  favorites.bindTrackFavoriteButtons = function bindTrackFavoriteButtons(track) {
    if (!track) return;

    setTimeout(() => {
      track.querySelectorAll(".favorite-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          await favorites.handleFavoriteToggle(btn, {
            allowConflictOnAdd: true,
            allowNotFoundOnRemove: true,
            checkExistingBeforeAdd: true,
          });
        });
      });
    }, 100);
  };

  root.RentlyFavoriteInteractions = favorites;
  root.rememberFavoriteChange = favorites.rememberFavoriteChange;
  root.getRememberedFavoriteState = favorites.getRememberedFavoriteState;
})(window);
