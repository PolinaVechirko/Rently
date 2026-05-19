(function createAccommodationFormPreview(window) {
  if (!window) return;

  const preview = window.RentlyAccommodationFormPreview || {};

  preview.buildListingPreviewDescriptionHtml =
    function buildListingPreviewDescriptionHtml(details = {}) {
      const guests = details.guests || 1;
      const bedrooms = details.bedrooms || 1;
      const beds = details.beds || 1;
      const description = details.description || "A very nice place to stay.";

      return `<p class="fw-bold mb-1">${guests} guests · ${bedrooms} bedrooms · ${beds} beds</p><p class="mt-2 text-muted">${description}</p>`;
    };

  preview.buildListingStatusText = function buildListingStatusText(
    isUpcoming,
    activeDate,
  ) {
    if (isUpcoming && activeDate) {
      return `Available from ${activeDate}`;
    }

    if (isUpcoming) {
      return "Upcoming (No date set)";
    }

    return "Active right now";
  };

  preview.renderPreviewBasics = function renderPreviewBasics(details = {}) {
    const previewTitle = document.getElementById("preview-prop-title");
    const previewLocation = document.getElementById("preview-prop-location");
    const previewDescription = document.getElementById("preview-prop-desc");
    const previewPrice = document.getElementById("preview-prop-price");
    const previewStatus = document.getElementById("preview-prop-status");

    if (previewTitle) {
      previewTitle.textContent = details.title || "Beautiful Property";
    }

    if (previewLocation) {
      previewLocation.textContent = `${details.country || "Country"}, ${details.city || "City"} - ${details.type || "Apartment"}`;
    }

    if (previewDescription) {
      previewDescription.innerHTML =
        details.descriptionHtml ||
        preview.buildListingPreviewDescriptionHtml(details);
      if (details.collapsedDescription) {
        previewDescription.classList.add("collapsed");
      } else {
        previewDescription.classList.remove("collapsed");
      }
      previewDescription.classList.remove("expanded");
    }

    if (previewPrice) {
      previewPrice.textContent = `${details.price || "0"}`;
    }

    if (previewStatus) {
      previewStatus.textContent = details.statusText || "Active right now";
    }
  };

  preview.renderPreviewAmenities = function renderPreviewAmenities(
    amenityValues,
    containerId = "preview-prop-amenities",
  ) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const amenities = Array.isArray(amenityValues) ? amenityValues : [];
    container.innerHTML = "";

    if (amenities.length === 0) {
      container.innerHTML = "<p class='text-muted small'>No amenities selected.</p>";
      return;
    }

    const normalizeAmenityName =
      window.RentlyAccommodationFormAmenities?.normalizeAmenityName ||
      ((value) => String(value || "").split(" — ")[0].trim());
    const assetBase = window.RentlyRenderHelpers?.getAssetBase?.() || "./";
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

    amenities.forEach((amenityValue) => {
      const amenityName = normalizeAmenityName(amenityValue);
      const iconName = amenityIconMap[amenityName] || "wifi.svg";
      const amenityElement = document.createElement("div");
      amenityElement.className = "amenity-item";
      amenityElement.innerHTML = `
        <img src="${assetBase}icons/${iconName}" onerror="this.src='${assetBase}icons/wifi.svg'; this.onerror=null;" alt="${amenityName}">
        <span>${amenityName}</span>
      `;
      container.appendChild(amenityElement);
    });
  };

  preview.bindPreviewDescriptionToggle = function bindPreviewDescriptionToggle(
    buttonId = "preview-desc-toggle",
    descriptionId = "preview-prop-desc",
  ) {
    const button = document.getElementById(buttonId);
    const description = document.getElementById(descriptionId);
    if (!button || !description) return;

    button.onclick = () => {
      description.classList.toggle("expanded");
      const span = button.querySelector("span");
      if (!span) return;
      span.textContent = description.classList.contains("expanded")
        ? "Show less"
        : "Show more";
    };
  };

  preview.populatePreviewHostInfoFromStorage =
    function populatePreviewHostInfoFromStorage() {
      const savedData = JSON.parse(
        localStorage.getItem("rently_host_data") || "{}",
      );
      const hostName =
        savedData.fullName ||
        savedData.name ||
        savedData.userName ||
        savedData.email ||
        "Host";
      const hostLabel = savedData.email || "";
      const hostAvatar =
        localStorage.getItem("rently_header_avatar_thumb") ||
        localStorage.getItem("rently_host_avatar") ||
        "./icons/user.svg";

      const hostNameElement = document.querySelector(".host-name");
      if (hostNameElement) {
        hostNameElement.textContent = hostName;
      }

      const hostLabelElement = document.querySelector(".host-label");
      if (hostLabelElement) {
        hostLabelElement.textContent = hostLabel;
        hostLabelElement.style.display = hostLabel ? "" : "none";
      }

      const hostAvatarElement = document.querySelector(".host-avatar");
      if (hostAvatarElement) {
        hostAvatarElement.src = hostAvatar;
        const fallback =
          !hostAvatar || /user\.svg(?:[?#]|$)/i.test(String(hostAvatar));
        hostAvatarElement.classList.toggle("avatar-fallback", fallback);
      }
    };

  preview.togglePreviewMode = function togglePreviewMode(options = {}) {
    const isPreview = options.isPreview === true;
    const stepperContainer = options.stepperContainer;
    const form = options.form;
    const previewSection = options.previewSection;
    const formWrapper = form?.parentElement || null;
    const formMaxWidth = options.formMaxWidth || "800px";

    if (stepperContainer) {
      stepperContainer.classList.toggle("d-none", isPreview);
    }

    if (form) {
      form.classList.toggle("d-none", isPreview);
    }

    if (previewSection) {
      previewSection.classList.toggle("d-none", !isPreview);
    }

    if (formWrapper) {
      formWrapper.style.maxWidth = isPreview ? "100%" : formMaxWidth;
    }
  };

  function validateRequiredFields(form) {
    if (!form) {
      return {
        isValid: true,
        firstInvalidStep: 1,
      };
    }

    let isValid = true;
    let firstInvalidStep = null;

    form
      .querySelectorAll("input[required], select[required], textarea[required]")
      .forEach((input) => {
        if (!String(input.value || "").trim()) {
          isValid = false;
          input.classList.add("is-invalid");

          if (firstInvalidStep === null) {
            const parentStep = input.closest(".form-step");
            const parsedStep = Number(parentStep?.id?.split("-")[1] || "1");
            firstInvalidStep = Number.isFinite(parsedStep) ? parsedStep : 1;
          }
        } else {
          input.classList.remove("is-invalid");
        }
      });

    return {
      isValid,
      firstInvalidStep: firstInvalidStep || 1,
    };
  }

  preview.resolvePreviewPhotoSrc = function resolvePreviewPhotoSrc(
    photoSrc,
    width = 600,
  ) {
    const normalizedSrc = String(photoSrc || "").trim();
    if (!normalizedSrc) return "";

    if (
      normalizedSrc.startsWith("data:") ||
      normalizedSrc.startsWith("blob:") ||
      normalizedSrc.startsWith("./") ||
      normalizedSrc.startsWith("../")
    ) {
      return normalizedSrc;
    }

    return `/api/Images/resize?url=${encodeURIComponent(normalizedSrc)}&width=${width}`;
  };

  preview.createPreviewGalleryController =
    function createPreviewGalleryController(options = {}) {
      const mainPhoto = options.mainPhoto;
      const thumbnailContainer = options.thumbnailContainer;
      const prevButton = options.prevButton;
      const nextButton = options.nextButton;
      const thumbnailClassName = options.thumbnailClassName || "thumb";
      const mainPhotoWidth = Number(options.mainPhotoWidth || 900);
      const thumbnailWidth = Number(options.thumbnailWidth || 160);
      let photos = [];
      let currentPhotoIndex = 0;

      function setActiveThumbnail(activeIndex) {
        if (!thumbnailContainer) return;

        thumbnailContainer
          .querySelectorAll(`.${thumbnailClassName}`)
          .forEach((item, index) => {
            item.classList.toggle("active", index === activeIndex);
          });
      }

      function syncMainPhoto() {
        if (!mainPhoto) return;

        const currentPhoto = photos[currentPhotoIndex] || "";
        mainPhoto.src =
          preview.resolvePreviewPhotoSrc(currentPhoto, mainPhotoWidth) ||
          options.emptyMainPhotoSrc ||
          mainPhoto.getAttribute("src") ||
          "";
      }

      function updateNavigation() {
        const hasMultiplePhotos = photos.length > 1;

        if (prevButton) {
          prevButton.type = "button";
          prevButton.style.display = hasMultiplePhotos ? "block" : "none";
        }

        if (nextButton) {
          nextButton.type = "button";
          nextButton.style.display = hasMultiplePhotos ? "block" : "none";
        }
      }

      function showPhoto(nextIndex) {
        if (!photos.length) {
          currentPhotoIndex = 0;
          syncMainPhoto();
          updateNavigation();
          return;
        }

        currentPhotoIndex = (Number(nextIndex) + photos.length) % photos.length;
        syncMainPhoto();
        setActiveThumbnail(currentPhotoIndex);
        updateNavigation();
      }

      function renderThumbnails() {
        if (!thumbnailContainer) {
          syncMainPhoto();
          updateNavigation();
          return;
        }

        thumbnailContainer.innerHTML = "";

        photos.forEach((photoSrc, index) => {
          const thumbnail = document.createElement("img");
          thumbnail.className = thumbnailClassName;
          thumbnail.src = preview.resolvePreviewPhotoSrc(photoSrc, thumbnailWidth);
          thumbnail.alt = `Photo ${index + 1}`;
          thumbnail.addEventListener("click", () => {
            showPhoto(index);
          });
          thumbnailContainer.appendChild(thumbnail);
        });

        showPhoto(currentPhotoIndex);
      }

      prevButton?.addEventListener("click", () => {
        showPhoto(currentPhotoIndex - 1);
      });

      nextButton?.addEventListener("click", () => {
        showPhoto(currentPhotoIndex + 1);
      });

      function setPhotos(nextPhotos) {
        photos = (Array.isArray(nextPhotos) ? nextPhotos : []).filter(Boolean);
        currentPhotoIndex = 0;
        renderThumbnails();
      }

      return {
        getPhotos: () => [...photos],
        setPhotos,
        showPhoto,
      };
    };

  preview.createPreviewFlowController = function createPreviewFlowController(
    options = {},
  ) {
    const reviewButton = options.reviewButton;
    const editButton = options.editButton;
    const form = options.form;
    const previewSection = options.previewSection;
    const stepperContainer = options.stepperContainer;
    const galleryController = options.galleryController;

    function openPreview(openOptions = {}) {
      const skipValidation = openOptions.skipValidation === true;

      if (!skipValidation) {
        const validationResult = validateRequiredFields(form);
        if (!validationResult.isValid) {
          if (typeof options.setStep === "function") {
            options.setStep(validationResult.firstInvalidStep);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
          return false;
        }
      }

      if (typeof options.validateBeforeOpen === "function") {
        const canOpen = options.validateBeforeOpen();
        if (canOpen === false) {
          return false;
        }
      }

      const previewState =
        typeof options.buildPreviewState === "function"
          ? options.buildPreviewState()
          : {};

      preview.renderPreviewBasics(previewState.basics || {});
      preview.renderPreviewAmenities(
        previewState.amenities || [],
        options.amenitiesContainerId,
      );
      preview.bindPreviewDescriptionToggle(
        options.descriptionToggleButtonId,
        options.descriptionId,
      );
      preview.populatePreviewHostInfoFromStorage();
      galleryController?.setPhotos(previewState.photos || []);

      preview.togglePreviewMode({
        isPreview: true,
        form,
        formMaxWidth: options.formMaxWidth,
        previewSection,
        stepperContainer,
      });

      if (typeof options.onOpen === "function") {
        options.onOpen(previewState, openOptions);
      }

      window.scrollTo(0, 0);
      return true;
    }

    function closePreview() {
      preview.togglePreviewMode({
        isPreview: false,
        form,
        formMaxWidth: options.formMaxWidth,
        previewSection,
        stepperContainer,
      });

      if (typeof options.onClose === "function") {
        options.onClose();
      }

      window.scrollTo(0, 0);
    }

    function bind() {
      reviewButton?.addEventListener("click", () => {
        openPreview();
      });

      editButton?.addEventListener("click", () => {
        closePreview();
      });
    }

    return {
      bind,
      closePreview,
      openPreview,
      validateRequiredFields: () => validateRequiredFields(form),
    };
  };

  window.RentlyAccommodationFormPreview = preview;
})(window);
