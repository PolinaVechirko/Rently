(function createPropertyPage(window) {
  const avatarUtils = window.RentlyAvatarUtils;
  const galleryModule = window.RentlyPropertyGallery;
  const mapModule = window.RentlyPropertyMap;
  const reviewsModule = window.RentlyPropertyReviews;
  const renderHelpers = window.RentlyRenderHelpers;

  function getAssetBase() {
    return renderHelpers?.getAssetBase
      ? renderHelpers.getAssetBase()
      : "./";
  }

  function isPropertyPage() {
    return /\/property\.html$/i.test(window.location.pathname) ||
      /\/host-mode\/property-view\.html$/i.test(window.location.pathname);
  }

  function isInHostMode() {
    return renderHelpers?.isInHostMode ? renderHelpers.isInHostMode() : (
      window.location.pathname.includes("/host-mode/") ||
      window.location.pathname.includes("host-mode.html")
    );
  }

  function getPropertyPageElements() {
    return {
      descToggle: document.getElementById("desc-toggle"),
      propertyDescription: document.getElementById("prop-desc"),
      favoriteButton: document.querySelector(".favorite-btn"),
      titleElement: document.querySelector(".property-title"),
      locationElement: document.querySelector(".property-location span"),
      priceElement: document.querySelector(".price-tag"),
      descriptionElement: document.querySelector(".property-desc"),
      ratingHeader: document.querySelector(".reviews-header-row .section-title"),
      amenitiesList: document.querySelector(".amenities-list"),
      hostNameElement: document.querySelector(".host-name"),
      hostLabelElement: document.querySelector(".host-label"),
      hostInfoWrapper: document.querySelector(".host-info"),
      contactHostButton: document.querySelector(".contact-host-btn"),
      mainContainer: document.querySelector(".property-main"),
    };
  }

  function bindDescriptionToggle(pageElements) {
    const { descToggle, propertyDescription } = pageElements;
    if (!descToggle || !propertyDescription) {
      return;
    }

    descToggle.addEventListener("click", () => {
      const isExpanded = propertyDescription.classList.toggle("expanded");
      propertyDescription.classList.toggle("collapsed", !isExpanded);
      descToggle.classList.toggle("expanded", isExpanded);
      descToggle.querySelector("span").textContent = isExpanded
        ? "Show less"
        : "Show more";
    });
  }

  async function renderFavoriteState(propertyId, token, assetBase, pageElements) {
    const { favoriteButton } = pageElements;
    if (!favoriteButton) {
      return;
    }

    favoriteButton.setAttribute("data-id", propertyId);

    const isHostPropertyView =
      window.location.pathname.includes("/host-mode/property-view.html");
    if (!token || isHostPropertyView) {
      return;
    }

    try {
      const favoriteResponse = await fetch(`/api/Favorites/${propertyId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!favoriteResponse.ok) {
        return;
      }

      const favoriteData = await favoriteResponse.json();
      const isFavorited = isInHostMode()
        ? favoriteData.hostFavorited
        : favoriteData.guestFavorited;
      if (!isFavorited) {
        return;
      }

      favoriteButton.classList.add("active");
      const image = favoriteButton.querySelector("img");
      if (image) {
        image.src = `${assetBase}icons/favorite-filled.svg`;
      }
    } catch (error) {
      console.debug("Could not check favorite status:", error);
    }
  }

  function renderPropertyHeader(property, pageElements) {
    const {
      titleElement,
      locationElement,
      priceElement,
      descriptionElement,
      ratingHeader,
    } = pageElements;

    if (titleElement) {
      titleElement.classList.remove("skeleton", "skeleton-title");
      titleElement.textContent = property.propertyType || "Accommodation";
    }

    if (locationElement) {
      locationElement.classList.remove("skeleton", "skeleton-loc");
      locationElement.textContent = `${property.country}, ${property.city}${property.street ? ` - ${property.street}` : ""}`;
    }

    if (priceElement) {
      priceElement.classList.remove("skeleton", "skeleton-price");
      priceElement.innerHTML = `$${property.pricePerNight} <span>/ night</span>`;
    }

    if (descriptionElement) {
      descriptionElement.innerHTML = `<p>${property.description}</p>`;
    }

    if (ratingHeader) {
      ratingHeader.textContent = `${Number(property.averageRating || 0).toFixed(2)} · ${property.reviewsCount} Reviews`;
    }
  }

  function renderAmenities(property, assetBase, pageElements) {
    const { amenitiesList } = pageElements;
    if (!amenitiesList || !Array.isArray(property?.amenities)) {
      return;
    }

    const amenityIconMap = {
      "Wi-Fi": "wifi.svg",
      "Free Parking": "freeParking.svg",
      "Air Conditioning": "airConditioning.svg",
      "Pets Allowed": "pets.svg",
      TV: "tv.svg",
      Kitchen: "kitchen.svg",
      Gym: "gym.svg",
      Iron: "iron.svg",
      "Smoke Alarm": "smokealarm.svg",
      "First Aid Kit": "firstaidkit.svg",
      "Meal Service": "mealService.svg",
      Balcony: "balcony.svg",
      "Self Check-in": "selfcheckin.svg",
      Crib: "crib.svg",
      "Dedicated Workspace": "workspace.svg",
      "Family Friendly": "familyFriendly.svg",
      Pool: "pool.svg",
      Dryer: "dryer.svg",
      Washer: "washer.svg",
      Heating: "heating.svg",
    };

    amenitiesList.innerHTML = property.amenities
      .map((amenity) => {
        const iconName = amenityIconMap[amenity] || "wifi.svg";
        return `
          <div class="amenity-item">
            <img src="${assetBase}icons/${iconName}" onerror="this.src='${assetBase}icons/wifi.svg'; this.onerror=null;" alt="${amenity}">
            <span>${amenity}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderHostProfile(property, assetBase, pageElements) {
    const {
      hostNameElement,
      hostLabelElement,
      hostInfoWrapper,
      contactHostButton,
    } = pageElements;

    if (hostNameElement) {
      hostNameElement.classList.remove("skeleton", "skeleton-text");
      hostNameElement.style.width = "auto";
      hostNameElement.textContent = property.hostName || "Host";
    }

    if (hostInfoWrapper) {
      let image = hostInfoWrapper.querySelector("img.host-avatar");
      if (!image) {
        hostInfoWrapper.querySelector(".skeleton-avatar")?.remove();
        image = document.createElement("img");
        image.className = "host-avatar";
        hostInfoWrapper.prepend(image);
      }

      const avatar = avatarUtils.resolveAvatarUrl(
        property.hostAvatarUrl ||
          property.hostPhoto ||
          property.profilePhotoUrl ||
          property.ProfilePhotoUrl,
        assetBase,
      );
      image.src = avatar.src;
      image.classList.toggle("avatar-fallback", avatar.isFallback);
      image.onerror = function handleHostAvatarError() {
        this.onerror = null;
        avatarUtils.applyAvatarFallback(this, assetBase);
      };
    }

    if (hostLabelElement && property.hostCreatedAt) {
      hostLabelElement.classList.remove("skeleton", "skeleton-text");
      hostLabelElement.style.width = "auto";
      const years = Math.max(
        1,
        new Date().getFullYear() - new Date(property.hostCreatedAt).getFullYear(),
      );
      hostLabelElement.textContent = `Superhost · ${years} ${years === 1 ? "year" : "years"} hosting`;
    }

    if (contactHostButton) {
      contactHostButton.onclick = () => {
        if (property.hostEmail) {
          window.location.href = `mailto:${property.hostEmail}`;
        }
      };
    }
  }

  async function initPropertyPage() {
    if (!isPropertyPage()) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get("id");
    const pageElements = getPropertyPageElements();
    const { mainContainer } = pageElements;
    if (!propertyId || !mainContainer) {
      return;
    }

    try {
      const response = await fetch(`/api/Accommodations/${propertyId}`);
      if (!response.ok) {
        throw new Error("Property not found");
      }

      const property = await response.json();
      const token = window.RentlyAuthStorage?.getAuthToken() || "";
      const assetBase = getAssetBase();
      window.__rentlyPropertyUnavailableRanges =
        property.unavailableDateRanges || [];

      await renderFavoriteState(propertyId, token, assetBase, pageElements);
      renderPropertyHeader(property, pageElements);
      renderAmenities(property, assetBase, pageElements);
      renderHostProfile(property, assetBase, pageElements);
      reviewsModule.renderPropertyReviews(property, assetBase);
      await window.RentlyPropertyReviewComposer?.renderReviewComposer?.(
        propertyId,
        token,
      );
      galleryModule.initPropertyGallery(property);
      await mapModule.initPropertyMap(property);
    } catch (error) {
      console.error(
        "[Property] Error loading property details:",
        error.message,
        error,
      );
    } finally {
      mainContainer.classList.remove("is-loading");
    }

    bindDescriptionToggle(pageElements);
    reviewsModule.bindReviewsToggle();
    window.RentlyPropertyBooking?.initPropertyBooking?.();
  }

  window.RentlyPropertyPage = {
    initPropertyPage,
  };
})(window);
