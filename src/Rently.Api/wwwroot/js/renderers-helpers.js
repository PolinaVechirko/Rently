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

  helpers.getPropertyHref = function getPropertyHref(id) {
    if (helpers.isInHostMode()) {
      return helpers.getHostPropertyViewHref(id);
    }

    return id
      ? `./property.html?id=${encodeURIComponent(id)}`
      : "./property.html";
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

  helpers.normalizeLocalImageUrl = function normalizeLocalImageUrl(url, assetBase) {
    const raw = String(url || "").trim();
    const base = assetBase || helpers.getAssetBase();
    if (!raw) return "";

    if (/^(data:|https?:\/\/)/i.test(raw) || raw.includes("/api/Images")) {
      return raw;
    }

    if (
      raw.startsWith("/uploads/") ||
      raw.startsWith("/images/") ||
      raw.startsWith("/icons/")
    ) {
      return raw;
    }

    if (raw.startsWith("./")) {
      return `${base}${raw.slice(2)}`;
    }

    if (raw.startsWith("../")) {
      return raw;
    }

    if (
      raw.startsWith("uploads/") ||
      raw.startsWith("images/") ||
      raw.startsWith("icons/")
    ) {
      return `${base}${raw}`;
    }

    return raw;
  };

  helpers.getOptimizedImageUrl = function getOptimizedImageUrl(url, width = 720) {
    if (!url) return "";

    const normalizedUrl = helpers.normalizeLocalImageUrl(url);
    if (!normalizedUrl) {
      return "";
    }

    if (
      normalizedUrl.startsWith("data:") ||
      /^https?:\/\//i.test(normalizedUrl) ||
      normalizedUrl.includes("/api/Images")
    ) {
      return normalizedUrl;
    }

    if (
      normalizedUrl.startsWith("/uploads/") ||
      normalizedUrl.startsWith("/images/") ||
      normalizedUrl.startsWith("./uploads/") ||
      normalizedUrl.startsWith("./images/") ||
      normalizedUrl.startsWith("../uploads/") ||
      normalizedUrl.startsWith("../images/")
    ) {
      return `/api/Images/resize?url=${encodeURIComponent(normalizedUrl)}&width=${width}&quality=82`;
    }

    return `/api/Images/resize?url=${encodeURIComponent(normalizedUrl)}&width=${width}`;
  };

  helpers.getFallbackHeroImage = function getFallbackHeroImage(index = 0, assetBase) {
    const base = assetBase || helpers.getAssetBase();
    const safeIndex = Math.abs(Number(index) || 0) % 4;
    return `${base}images/hero${safeIndex + 1}.png`;
  };

  helpers.extractPhotoUrl = function extractPhotoUrl(photo) {
    if (!photo) return "";

    if (typeof photo === "string") {
      return photo.trim();
    }

    if (typeof photo !== "object") {
      return "";
    }

    return String(
      photo.url ||
        photo.Url ||
        photo.src ||
        photo.Src ||
        photo.path ||
        photo.Path ||
        "",
    ).trim();
  };

  helpers.getPhotoCandidates = function getPhotoCandidates(photoSource) {
    if (Array.isArray(photoSource)) {
      return photoSource.map(helpers.extractPhotoUrl).filter(Boolean);
    }

    if (photoSource && typeof photoSource === "object") {
      if (Array.isArray(photoSource.photos)) {
        return photoSource.photos.map(helpers.extractPhotoUrl).filter(Boolean);
      }

      if (Array.isArray(photoSource.Photos)) {
        return photoSource.Photos.map(helpers.extractPhotoUrl).filter(Boolean);
      }
    }

    const singlePhoto = helpers.extractPhotoUrl(photoSource);
    return singlePhoto ? [singlePhoto] : [];
  };

  helpers.getCardImageUrl = function getCardImageUrl(photoSource, options = {}) {
    const width = Number(options.width || 600);
    const fallbackIndex = Number(options.fallbackIndex || 0);
    const assetBase = options.assetBase || helpers.getAssetBase();
    const [rawPhoto] = helpers.getPhotoCandidates(photoSource);

    return helpers.getOptimizedImageUrl(
      rawPhoto || helpers.getFallbackHeroImage(fallbackIndex, assetBase),
      width,
    );
  };

  helpers.formatLocation = function formatLocation(locationSource, options = {}) {
    const fallbackCountry = options.fallbackCountry ?? "";
    const fallbackCity = options.fallbackCity ?? "";
    const country = typeof locationSource === "object" && locationSource
      ? locationSource.country || locationSource.Country || fallbackCountry
      : locationSource || fallbackCountry;
    const city = typeof locationSource === "object" && locationSource
      ? locationSource.city || locationSource.City || fallbackCity
      : options.city || fallbackCity;

    return [country, city].map((value) => String(value || "").trim()).join(", ");
  };

  helpers.formatPrice = function formatPrice(value) {
    const numericValue = Number(value || 0);
    return `$${numericValue.toLocaleString()}`;
  };

  helpers.getStayPriceParts = function getStayPriceParts(pricePerNight, nights = 0) {
    const nightlyPrice = Number(pricePerNight || 0);
    const stayNights = Math.max(0, Number(nights || 0));
    const totalPrice = stayNights > 0 ? nightlyPrice * stayNights : nightlyPrice;

    return {
      priceDisplay: helpers.formatPrice(totalPrice),
      priceSubtext:
        stayNights > 0
          ? `<span class="price-tag-total">Total for ${stayNights} ${stayNights === 1 ? "night" : "nights"}</span>`
          : " / night",
    };
  };

  helpers.formatRating = function formatRating(value, reviewsCount) {
    const numericValue = Number(value);
    const rating = Number.isFinite(numericValue) ? numericValue.toFixed(2) : "5.00";
    const reviews = Number(reviewsCount || 0);
    return `${rating}(${reviews})`;
  };

  helpers.getFavoriteIconSrc = function getFavoriteIconSrc(isActive) {
    const assetBase = helpers.getAssetBase();
    return isActive
      ? `${assetBase}icons/favorite-filled.svg`
      : `${assetBase}icons/favorite.svg`;
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

    const photosOf = (item) => helpers.getPhotoCandidates(item);

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
