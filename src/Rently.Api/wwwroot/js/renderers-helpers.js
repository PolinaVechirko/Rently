(function initRentlyRenderHelpers(root) {
  if (!root) return;

  const helpers = root.RentlyRenderHelpers || {};
  let learnMoreCollageInFlight = null;

  helpers.getAssetBase = function getAssetBase() {
    if (root.RentlyAppContext) {
      return root.RentlyAppContext.getAssetBase();
    }

    const isSubfolder =
      root.location.pathname.includes("/host-mode/") &&
      !root.location.pathname.includes("host-mode.html");
    return isSubfolder ? "../" : "./";
  };

  helpers.isInHostMode = function isInHostMode() {
    if (root.RentlyAppContext) {
      return root.RentlyAppContext.isInHostMode();
    }

    return (
      root.location.pathname.includes("/host-mode/") ||
      root.location.pathname.includes("host-mode.html")
    );
  };

  helpers.isInHostModeFolder = function isInHostModeFolder() {
    if (root.RentlyAppContext) {
      return root.RentlyAppContext.isInHostModeFolder();
    }

    return root.location.pathname.includes("/host-mode/");
  };

  helpers.getHostModeHref = function getHostModeHref(path, query = "") {
    if (root.RentlyAppContext) {
      return root.RentlyAppContext.getHostModeHref(path, query);
    }

    const cleanPath = String(path || "").replace(/^\/+/, "");
    const base = helpers.isInHostModeFolder()
      ? `./${cleanPath}`
      : `./host-mode/${cleanPath}`;
    return query ? `${base}${query}` : base;
  };

  helpers.getHostPropertyViewHref = function getHostPropertyViewHref(id) {
    if (root.RentlyAppContext) {
      return root.RentlyAppContext.getHostPropertyViewHref(id);
    }

    const query = id ? `?id=${encodeURIComponent(id)}` : "";
    return helpers.getHostModeHref("property-view.html", query);
  };

  helpers.getFavoriteIds = async function getFavoriteIds() {
    try {
      const token = root.RentlyApi
        ? root.RentlyApi.getAuthToken()
        : root.localStorage.getItem("auth_token") || "";
      if (!token) return [];

      const resp = root.RentlyFavoritesApi
        ? await root.RentlyFavoritesApi.listResponse()
        : await root.fetch("/api/Favorites", {
            headers: { Authorization: "Bearer " + token },
          });
      if (!resp.ok) return [];

      const data = await resp.json();
      if (!Array.isArray(data)) return [];

      const inHostMode = helpers.isInHostMode();

      return data
        .filter((fav) => {
          if (inHostMode) {
            return (
              fav.isHostFavorite === true || (fav.accommodation && !fav.types)
            );
          }
          return (
            fav.isGuestFavorite === true || (fav.accommodation && !fav.types)
          );
        })
        .map((fav) => {
          if (fav.accommodation) {
            return fav.accommodation.id ?? fav.accommodation.Id;
          }
          return fav.id ?? fav.Id;
        })
        .filter((value) => value !== null && value !== undefined);
    } catch (error) {
      console.debug("Could not load favorite ids:", error);
      return [];
    }
  };

  helpers.getOptimizedImageUrl = function getOptimizedImageUrl(url, width = 720) {
    if (!url) return "";
    if (
      url.startsWith("data:") ||
      /^https?:\/\//i.test(url) ||
      url.includes("/api/Images")
    ) {
      return url;
    }
    return `/api/Images/resize?url=${encodeURIComponent(url)}&width=${width}`;
  };

  helpers.getLearnMoreCollageImages = async function getLearnMoreCollageImages(assetBase) {
    const storageKey = "rently_learn_more_collage_v2";
    try {
      const cached = root.sessionStorage.getItem(storageKey);
      if (cached) {
        const images = JSON.parse(cached);
        if (Array.isArray(images) && images.length === 4) {
          return images.map((img) => helpers.getOptimizedImageUrl(img, 400));
        }
      }
    } catch {
      root.sessionStorage.removeItem(storageKey);
    }

    const photosOf = (item) => {
      const raw = item.photos || item.Photos || [];
      return Array.isArray(raw) ? raw.filter(Boolean) : [];
    };

    const runFetch = async () => {
      try {
        const response = await root.fetch(
          "/api/Accommodations/homepage/highest-rated?count=32",
        );
        if (!response.ok) throw new Error("collage api");
        const data = await response.json();
        const listings = (Array.isArray(data) ? data : []).filter(
          (item) => photosOf(item).length > 0,
        );

        for (let i = listings.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [listings[i], listings[j]] = [listings[j], listings[i]];
        }

        const picked = [];
        const seen = new Set();
        for (const item of listings) {
          for (const url of photosOf(item)) {
            if (!seen.has(url)) {
              seen.add(url);
              picked.push(url);
              if (picked.length >= 4) break;
            }
          }
          if (picked.length >= 4) break;
        }

        while (picked.length < 4) {
          picked.push(`${assetBase}images/hero${picked.length + 1}.png`);
        }

        const four = picked.slice(0, 4);
        root.sessionStorage.setItem(storageKey, JSON.stringify(four));
        return four.map((img) => helpers.getOptimizedImageUrl(img, 400));
      } catch {
        const fallbacks = [
          `${assetBase}images/hero1.png`,
          `${assetBase}images/hero2.png`,
          `${assetBase}images/hero3.png`,
          `${assetBase}images/hero4.png`,
        ];
        return fallbacks.map((img) => helpers.getOptimizedImageUrl(img, 400));
      }
    };

    if (!learnMoreCollageInFlight) {
      learnMoreCollageInFlight = runFetch().finally(() => {
        learnMoreCollageInFlight = null;
      });
    }
    return learnMoreCollageInFlight;
  };

  root.RentlyRenderHelpers = helpers;
})(window);
