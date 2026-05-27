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
  const editAccommodationId = urlParams.get("id");
  const viewerMode = urlParams.get("viewer"); // guest or null

  const initAddingAccommodationHeaderFallback = () => {
    const myListingsLink = document.getElementById("adding-nav-my-listings");
    const inspirationLink = document.getElementById("adding-nav-inspiration");
    if (myListingsLink) {
      myListingsLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "./host-mode.html#your-apartments-title";
      });
    }
    if (inspirationLink) {
      inspirationLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "./host-mode.html#inspiration-title";
      });
    }

  };
  initAddingAccommodationHeaderFallback();

  let currentStep = 1;
  const totalSteps = 5;

  // Amenities list setup
  const amenitiesList = document.getElementById("amenities-list");
  if (formShared) {
    formShared.seedAmenitiesList(amenitiesList);
  }

  const editFormTitle = document.querySelector("#step-1 h3");
  const editPreviewButton = document.getElementById("submit-listing-btn");
  if (editAccommodationId) {
    if (editFormTitle) {
      editFormTitle.textContent = "Step 1: Basics & Amenities";
    }
    if (editPreviewButton) {
      editPreviewButton.innerText = "Update listing";
    }

    fetch("/api/Accommodations/my", {
      headers: {
        Authorization: "Bearer " + (authStorage?.getAuthToken() || ""),
      },
    })
      .then((resp) => {
        if (resp.status === 401) {
          authStorage?.clearAuthentication();
          redirectToLogin();
          return null;
        }
        return resp.ok ? resp.json() : null;
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
        const typeEl = document.getElementById("prop-type");
        const countryEl = document.getElementById("country");
        const cityEl = document.getElementById("city");
        const streetEl = document.getElementById("street");
        const guestsEl = document.getElementById("guests-count");
        const bedroomsEl = document.getElementById("bedrooms-count");
        const bedsEl = document.getElementById("beds-count");
        const titleEl = document.getElementById("listing-title");
        const descEl = document.getElementById("listing-desc");
        const priceEl = document.getElementById("price-night");

        if (typeEl && (data.propertyType || data.PropertyType))
          typeEl.value = data.propertyType || data.PropertyType;
        if (countryEl) countryEl.value = data.country || data.Country || "";
        if (cityEl) cityEl.value = data.city || data.City || "";
        if (streetEl) streetEl.value = data.street || data.Street || "";
        if (guestsEl)
          guestsEl.value =
            data.guestsCount ||
            data.GuestsCount ||
            data.maxGuests ||
            data.MaxGuests ||
            1;
        if (bedroomsEl)
          bedroomsEl.value = data.roomsCount ?? data.RoomsCount ?? 0;
        if (bedsEl) bedsEl.value = data.bedsCount ?? data.BedsCount ?? 0;
        if (titleEl) titleEl.value = data.title || data.Title || "";
        if (descEl) descEl.value = data.description || data.Description || "";
        if (priceEl)
          priceEl.value = data.pricePerNight || data.PricePerNight || 0;

        const amenities = data.amenities || data.Amenities || [];
        if (amenities.length > 0) {
          setTimeout(() => {
            if (formShared?.applySelectedAmenities) {
              formShared.applySelectedAmenities(amenities);
            }
          }, 100);
        }

        if (Array.isArray(data.photos) && data.photos.length > 0) {
          uploadedPhotos = [...data.photos];
          photoController?.setPhotos(uploadedPhotos);
        }

        // If in guest view mode, automatically jump to preview
        if (viewerMode === "guest") {
          setTimeout(() => {
            if (!previewFlowController?.openPreview({ skipValidation: true })) {
              return;
            }

            const formSection = document.getElementById("form-section");
            const editBtn = document.getElementById("edit-btn");
            const publishBtn = document.getElementById("submit-listing-btn");
            const backBtn = document.getElementById("back-to-dashboard-btn");
            const previewHeader = document.querySelector("#preview-section h3");

            if (backBtn) {
              backBtn.classList.remove("d-none");
              backBtn.onclick = () => {
                window.location.href = `./host-mode/property-dashboard.html?id=${editAccommodationId}`;
              };
            }

            if (formSection) formSection.classList.add("d-none");
            if (editBtn) editBtn.classList.add("d-none");
            if (publishBtn) publishBtn.classList.add("d-none");
            if (previewHeader) {
              previewHeader.textContent = "Guest View Preview";
            }
          }, 100);
        }
      })
      .catch((error) => console.error("Failed to load edit data:", error));
  }

  const cityInput = document.getElementById("city");
  const countryInput = document.getElementById("country");
  const streetInput = document.getElementById("street");
  const datalist = document.getElementById("location-suggestions");

  if (cityInput && formShared) {
    formShared.initLocationAutocomplete({
      datalist,
      definitions: [
        {
          input: cityInput,
          stateKey: "city",
          mapResult(result) {
            const addr = result.address || {};
            return (
              addr.city ||
              addr.town ||
              addr.village ||
              addr.hamlet ||
              addr.suburb ||
              ""
            );
          },
          onChange(selectedCity, results) {
            if (!selectedCity || !countryInput) return;
            const matching = results.find((result) => {
              const addr = result.address || {};
              const city =
                addr.city ||
                addr.town ||
                addr.village ||
                addr.hamlet ||
                addr.suburb ||
                "";
              return city === selectedCity;
            });
            if (matching) {
              countryInput.value = matching.address?.country || "";
            }
          },
        },
        {
          input: countryInput,
          stateKey: "country",
          buildQuery(query) {
            return `${query} country`;
          },
          mapResult(result) {
            const country = result.address?.country || "";
            const city =
              result.address?.city ||
              result.address?.town ||
              result.address?.village ||
              result.address?.hamlet ||
              result.address?.suburb ||
              "";
            return country && !city ? country : "";
          },
        },
        {
          input: streetInput,
          stateKey: "street",
          buildQuery(query) {
            const city = cityInput?.value?.trim();
            const country = countryInput?.value?.trim();
            return [query, city, country].filter(Boolean).join(", ");
          },
          mapResult(result) {
            const address = result.address || {};
            const road =
              address.road ||
              address.pedestrian ||
              address.footway ||
              address.cycleway ||
              address.path ||
              address.residential ||
              "";
            const houseNumber = address.house_number || "";
            const streetValue = [road, houseNumber].filter(Boolean).join(" ").trim();
            return streetValue || road || "";
          },
        },
      ],
    });
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
  });

  function getListingVisibilityPayload() {
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
  const dropZone = document.getElementById("drop-zone");
  let uploadedPhotos = [];

  const setPhotoStepValidationState = (hasError) => {
    if (!dropZone) return;
    dropZone.style.borderColor = hasError ? "#dc3545" : "";
    dropZone.style.boxShadow = hasError
      ? "0 0 0 0.2rem rgba(220, 53, 69, 0.15)"
      : "";
  };

  const photoController = formShared?.createPhotoCollectionController({
    dropZone,
    onPhotosChanged(nextPhotos) {
      uploadedPhotos = [...nextPhotos];
    },
    photoPreviewGrid,
    photoUpload,
    resolveTileOptions() {
      return {
        coverBadgeClassName: "badge position-absolute top-0 start-0 m-2 z-2",
        deleteButtonClassName:
          "btn btn-sm btn-danger position-absolute bottom-0 end-0 m-2 z-2",
        deleteButtonStyle: "padding: 2px 6px;",
        deleteLabel: "✕",
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
        collapsedDescription: true,
      },
      photos: uploadedPhotos,
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
      if (uploadedPhotos.length > 0) {
        return true;
      }

      setCurrentStep(3);
      setPhotoStepValidationState(true);
      alert("Please add at least one photo before opening Final Check.");
      dropZone?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    },
  });
  previewFlowController?.bind();

  document
    .getElementById("submit-listing-btn")
    .addEventListener("click", async () => {
      const submitBtn = document.getElementById("submit-listing-btn");
      const resetSubmitButton = () => {
        submitBtn.disabled = false;
        submitBtn.innerText = editAccommodationId
          ? "Update listing"
          : "Publish listing";
      };

      submitBtn.disabled = true;
      submitBtn.innerText = "Publishing...";

      const desc =
        document.getElementById("listing-desc").value ||
        "A very nice place to stay.";
      const title =
        document.getElementById("listing-title").value || "Beautiful Property";
      const typeEl = document.getElementById("prop-type");
      const propertyTypeLabel =
        formShared?.getPropertyTypeLabel(typeEl) || "Apartment";
      const propertyTypeValue =
        formShared?.propertyTypeToEnumValue(propertyTypeLabel) ?? 0;

      const city = document.getElementById("city").value || "City";
      const country = document.getElementById("country").value || "Country";
      const street = document.getElementById("street").value || "Main St";
      const beds = parseInt(
        document.getElementById("beds-count").value || "0",
        10,
      );
      const rooms = parseInt(
        document.getElementById("bedrooms-count").value || "0",
        10,
      );
      const price = parseFloat(
        document.getElementById("price-night").value || "0",
      );
      const visibility = getListingVisibilityPayload();

      if (
        document.querySelector('input[name="listing-status"][value="Upcoming"]')
          ?.checked &&
        !visibility.visibleFrom
      ) {
        alert("Choose the date when this listing should become visible.");
        resetSubmitButton();
        return;
      }

      const token = formShared?.getAuthToken() || "";
      const selectedAmenityIds = formShared
        ? formShared.mapAmenityNamesToIds(formShared.collectSelectedAmenityNames())
        : [];

      try {
        const photoUrls = await uploadInlinePhotos(token, uploadedPhotos);
        if (photoUrls.length === 0) {
          setCurrentStep(3);
          setPhotoStepValidationState(true);
          alert("Please add at least one photo before publishing the listing.");
          resetSubmitButton();
          dropZone?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        const isEditMode = Boolean(editAccommodationId);
        const res = await fetch(
          isEditMode
            ? `/api/Accommodations/${editAccommodationId}`
            : "/api/Accommodations",
          {
            method: isEditMode ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
              propertyType: Number(propertyTypeValue),
              pricePerNight: price,
              roomsCount: rooms,
              bedsCount: beds,
              description: desc,
              title: title,
              country: country,
              city: city,
              street: street,
              isActive: visibility.isActive,
              visibleFrom: visibility.visibleFrom,
              photoUrls: photoUrls,
              amenityIds: selectedAmenityIds,
            }),
          },
        );

        if (!res.ok) {
          let errorMsg = "Failed to create property.";
          if (res.status === 401) {
            authStorage?.setRedirectAfterAuth(window.location.href);
            authStorage?.clearAuthentication();
            redirectToLogin();
            return;
          } else if (res.status === 404) {
            redirectToHostHome();
            return;
          } else {
            try {
              const errObj = await res.json();
              const validationErrors = errObj.errors
                ? Object.entries(errObj.errors)
                    .flatMap(([field, messages]) =>
                      (Array.isArray(messages) ? messages : [messages]).map(
                        (message) => `${field}: ${message}`,
                      ),
                    )
                    .join("; ")
                : "";
              errorMsg =
                validationErrors || errObj.title || errObj.message || errorMsg;
            } catch (e) {
              /* ignore */
            }
          }
          throw new Error(errorMsg);
        }

        window.location.href = "./host-mode.html";
      } catch (e) {
        alert(e.message);
        resetSubmitButton();
      }
    });
});
