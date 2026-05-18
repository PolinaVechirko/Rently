document.addEventListener("DOMContentLoaded", () => {
  const formShared = window.RentlyAccommodationFormShared;
  const authStorage = window.RentlyAuthStorage;
  const redirectToLogin = () => {
    if (formShared) {
      return formShared.redirectToLogin("./login.html");
    }
    authStorage?.setRedirectAfterAuth(window.location.href);
    window.location.href = "./login.html";
  };

  const redirectToHostHome = () => {
    if (formShared) {
      return formShared.redirectToHostHome("./host-mode.html");
    }
    window.location.href = "./host-mode.html";
  };

  const token = formShared?.ensureAuthenticated("./login.html") || "";
  if (!token) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");

  let currentStep = 1;
  const totalSteps = 5;

  const amenitiesList = document.getElementById("amenities-list");
  if (formShared) {
    formShared.seedAmenitiesList(amenitiesList);
  }

  const locationInputs = [
    document.getElementById("city"),
    document.getElementById("country"),
    document.getElementById("street"),
  ];
  const datalist = document.getElementById("location-suggestions");

  if (locationInputs[0] && formShared) {
    formShared.initLocationAutocomplete({
      datalist,
      definitions: locationInputs
        .filter(Boolean)
        .map((input, index) => ({
          input,
          stateKey: `edit-field-${index}`,
          mapResult(result) {
            const addr = result.address || {};
            const city =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.hamlet ||
              addr.suburb ||
              "";
            const country = addr.country || "";
            if (city && country) return `${city}, ${country}`;
            if (country) return country;
            return result.display_name || "";
          },
        })),
    });
  }

  const editUrlParams = new URLSearchParams(window.location.search);
  const editAccommodationId = editUrlParams.get("id");
  const editToken = formShared?.getAuthToken() || "";
  let loadedVisibilityState = {
    isActive: true,
    visibleFrom: null,
  };

  let existingPhotos = [];

  const amenityNameMap = formShared?.getAmenityDisplayNameMap() || {};

  if (editAccommodationId && editToken) {
    fetch("/api/Accommodations/my", {
      headers: {
        Authorization: "Bearer " + editToken,
      },
    })
      .then((r) => {
        if (r.status === 401) {
          authStorage?.clearAuthentication();
          redirectToLogin();
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((items) => {
        if (!Array.isArray(items)) return null;
        return (
          items.find(
            (item) =>
              String(item?.id ?? item?.Id ?? "") === String(editAccommodationId),
          ) || null
        );
      })
      .then((data) => {
        if (editAccommodationId && !data) {
          redirectToHostHome();
          return;
        }
        if (!data) return;
        const titleEl = document.getElementById("listing-title");
        const descEl = document.getElementById("listing-desc");
        const typeEl = document.getElementById("prop-type");
        const cityEl = document.getElementById("city");
        const countryEl = document.getElementById("country");
        const streetEl = document.getElementById("street");
        const bedsEl = document.getElementById("beds-count");
        const bedroomsEl = document.getElementById("bedrooms-count");
        const priceEl = document.getElementById("price-night");

        if (titleEl) titleEl.value = data.title || data.Title || "";
        if (descEl) descEl.value = data.description || data.Description || "";
        if (typeEl) typeEl.value = data.propertyType || data.PropertyType || "";
        if (cityEl) cityEl.value = data.city || data.City || "";
        if (countryEl) countryEl.value = data.country || data.Country || "";
        if (streetEl) streetEl.value = data.street || data.Street || "";
        if (bedsEl) bedsEl.value = data.bedsCount || data.BedsCount || "";
        if (bedroomsEl)
          bedroomsEl.value = data.roomsCount || data.RoomsCount || "";
        if (priceEl)
          priceEl.value = data.pricePerNight || data.PricePerNight || "";

        const visibleFrom = data.visibleFrom || data.VisibleFrom || "";
        const isActive = (data.isActive ?? data.IsActive ?? true) === true;
        loadedVisibilityState = {
          isActive,
          visibleFrom,
        };
        if (visibleFrom) {
          applyListingStatusSelection(
            "Upcoming",
            String(visibleFrom).slice(0, 10),
          );
        } else {
          applyListingStatusSelection("Active");
        }

        if (data.photos && data.photos.length > 0) {
          existingPhotos = data.photos;
          photoController?.setPhotos(existingPhotos);
        }

        const amenities = data.amenities || data.Amenities || [];
        if (amenities && amenities.length > 0) {
          setTimeout(() => {
            if (formShared?.applySelectedAmenities) {
              formShared.applySelectedAmenities(amenities);
              return;
            }

            amenities.forEach((name) => {
              const label = amenityNameMap[name] || name;
              const cb = document.querySelector(
                `.amenity-checkbox[value="${label}"]`,
              );
              if (cb) cb.checked = true;
            });
          }, 100);
        }
      })
      .catch((e) => console.error("Failed to pre-fill edit form:", e));
  }

  const stepperController = formShared?.createStepperController({
    totalSteps,
    initialStep: currentStep,
    onStepChanged(step) {
      currentStep = step;
    },
  });
  const setCurrentStep = (step) => {
    if (stepperController) {
      stepperController.setStep(step);
      return;
    }
    currentStep = step;
  };
  const updateStepper = () => {
    if (stepperController) {
      stepperController.render();
    }
  };
  stepperController?.bind();

  const datePickerContainer = document.getElementById("date-picker-container");
  const datePickerInput = document.getElementById("available-from");
  const listingStatusControls = formShared?.initListingStatusControls({
    datePickerContainer,
    datePickerInput,
    resolveInactiveState() {
      if (loadedVisibilityState.isActive === false) {
        return {
          isActive: false,
          visibleFrom: null,
        };
      }

      return null;
    },
  });

  function applyListingStatusSelection(statusValue, availableFromValue = "") {
    if (listingStatusControls) {
      listingStatusControls.applySelection(statusValue, availableFromValue);
    }
  }

  function getEditListingVisibilityPayload() {
    if (listingStatusControls) {
      return listingStatusControls.getPayload();
    }

    return {
      isActive: true,
      visibleFrom: null,
    };
  }

  async function uploadInlinePhotos(token, photos) {
    if (window.RentlyAccommodationFormShared) {
      return window.RentlyAccommodationFormShared.uploadInlinePhotos(token, photos);
    }
    return [];
  }

  const photoUpload = document.getElementById("photo-upload");
  const photoPreviewGrid = document.getElementById("photo-preview-grid");
  const dropZoneEl = document.getElementById("drop-zone");
  const setPhotoStepValidationState = (hasError) => {
    if (!dropZoneEl) return;
    dropZoneEl.style.borderColor = hasError ? "#dc3545" : "";
    dropZoneEl.style.boxShadow = hasError
      ? "0 0 0 0.2rem rgba(220, 53, 69, 0.15)"
      : "";
  };

  const photoController = formShared?.createPhotoCollectionController({
    dropZone: dropZoneEl,
    onPhotosChanged(nextPhotos) {
      existingPhotos = [...nextPhotos];
    },
    photoPreviewGrid,
    photoUpload,
    resolveTileOptions() {
      return {
        backgroundColor: "#f8f9fa",
        display: "inline-block",
        imageDisplay: "block",
      };
    },
    setValidationState: setPhotoStepValidationState,
  });

  const reviewBtn = document.getElementById("to-preview-btn");
  const addListingForm = document.getElementById("add-listing-form");
  const previewSection = document.getElementById("preview-section");
  const stepperContainer = document.querySelector(".stepper-container");
  const previewGalleryController = formShared?.createPreviewGalleryController({
    mainPhoto: document.getElementById("preview-main-photo"),
    nextButton: document.getElementById("preview-gallery-next"),
    prevButton: document.getElementById("preview-gallery-prev"),
    thumbnailContainer: document.getElementById("preview-thumbnail-container"),
  });

  const buildPreviewState = () => {
    const typeEl = document.getElementById("prop-type");
    const isUpcoming = document.querySelector(
      'input[name="listing-status"][value="Upcoming"]',
    )?.checked;

    return {
      amenities: formShared ? formShared.collectSelectedAmenityValues() : [],
      basics: {
        title:
          document.getElementById("listing-title")?.value ||
          "Beautiful Property",
        country: document.getElementById("country")?.value || "Country",
        city: document.getElementById("city")?.value || "City",
        type: formShared?.getPropertyTypeLabel(typeEl) || "Apartment",
        guests: document.getElementById("guests-count")?.value || 1,
        bedrooms: document.getElementById("bedrooms-count")?.value || 1,
        beds: document.getElementById("beds-count")?.value || 1,
        description:
          document.getElementById("listing-desc")?.value ||
          "A very nice place to stay.",
        price: document.getElementById("price-night")?.value || "0",
        statusText:
          formShared?.buildListingStatusText(
            isUpcoming,
            document.getElementById("available-from")?.value,
          ) || "Active right now",
      },
      photos: existingPhotos,
    };
  };

  const previewFlowController = formShared?.createPreviewFlowController({
    buildPreviewState,
    editButton: document.getElementById("edit-btn"),
    form: addListingForm,
    formMaxWidth: "800px",
    galleryController: previewGalleryController,
    previewSection,
    reviewButton: reviewBtn,
    setStep: setCurrentStep,
    stepperContainer,
    validateBeforeOpen() {
      if (existingPhotos.length > 0) {
        return true;
      }

      setCurrentStep(3);
      setPhotoStepValidationState(true);
      alert("Please add at least one photo before opening Final Check.");
      dropZoneEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    },
  });
  previewFlowController?.bind();

  const submitListingBtnEl = document.getElementById("submit-listing-btn");
  if (submitListingBtnEl) {
    submitListingBtnEl.addEventListener("click", async () => {
      if (!editAccommodationId || !editToken) {
        alert("No listing ID found. Cannot save.");
        return;
      }

      const visibility = getEditListingVisibilityPayload();
      if (
        document.querySelector(
          'input[name="listing-status"][value="Upcoming"]',
        )?.checked &&
        !visibility.visibleFrom
      ) {
        alert("Choose the date when this listing should become visible.");
        return;
      }

      if (existingPhotos.length === 0) {
        setCurrentStep(3);
        setPhotoStepValidationState(true);
        alert("Please add at least one photo before updating the listing.");
        dropZoneEl?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const typeEl = document.getElementById("prop-type");
      const propTypeLabel = formShared?.getPropertyTypeLabel(typeEl) || "Apartment";
      const propType = formShared?.propertyTypeToEnumValue(propTypeLabel) ?? 0;
      const selectedAmenityNames = formShared
        ? formShared.collectSelectedAmenityNames()
        : [];
      const amenityIds = formShared
        ? formShared.mapAmenityNamesToIds(selectedAmenityNames)
        : [];

      try {
        const photoUrls = await uploadInlinePhotos(editToken, existingPhotos);
        const resp = await fetch(`/api/Accommodations/${editAccommodationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + editToken,
          },
          body: JSON.stringify({
            propertyType: Number(propType),
            pricePerNight: parseFloat(
              document.getElementById("price-night")?.value || "0",
            ),
            roomsCount: parseInt(
              document.getElementById("bedrooms-count")?.value || "1",
              10,
            ),
            bedsCount: parseInt(
              document.getElementById("beds-count")?.value || "1",
              10,
            ),
            description: document.getElementById("listing-desc")?.value || "",
            title: document.getElementById("listing-title")?.value || "",
            country: document.getElementById("country")?.value || "",
            city: document.getElementById("city")?.value || "",
            street: document.getElementById("street")?.value || "",
            isActive: visibility.isActive,
            visibleFrom: visibility.visibleFrom,
            amenityIds,
            photoUrls,
          }),
        });

        if (!resp.ok) {
          if (resp.status === 401) {
            authStorage?.setRedirectAfterAuth(window.location.href);
            authStorage?.clearAuthentication();
            redirectToLogin();
            return;
          }
          if (resp.status === 404) {
            redirectToHostHome();
            return;
          }
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.message || "Failed to update listing");
        }

        window.location.href = "./host-mode.html";
      } catch (e) {
        alert("Save failed: " + e.message);
      }
    });
  }
});
