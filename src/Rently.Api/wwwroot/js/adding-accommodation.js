document.addEventListener("DOMContentLoaded", () => {
  const redirectToLogin = () => {
    localStorage.setItem("redirectAfterAuth", window.location.href);
    window.location.href = "./login.html";
  };

  const redirectToHostHome = () => {
    window.location.href = "./host-mode.html";
  };

  // Check if user is logged in at page load
  // If not logged in, redirect to login with return URL
  const token = localStorage.getItem("auth_token");
  if (!token) {
    redirectToLogin();
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
  const amenities = [
    "Wi-Fi — интернет",
    "TV — телевизор",
    "Kitchen — кухня (важно для длительного жилья)",
    "Air Conditioning — кондиционер",
    "Heating — отопление",
    "Dedicated Workspace — рабочее место",
    "Washer — стиральная машина",
    "Free Parking — бесплатная парковка",
    "Gym — спортзал",
    "Pets Allowed — можно с животными",
    "Balcony — балкон или терраса",
    "Self Check-in — бесконтактное заселение",
    "Crib — детская кроватка",
    "Family Friendly — подойдет семьям",
    "Meal Service — включено питание",
    "Pool — бассейн (очень популярный фильтр для отдыха)",
    "Dryer — сушилка для одежды (часто идет в паре с Washer)",
    "Iron — утюг (базовая вещь для тех, кто приехал по работе)",
    "Smoke Alarm — датчик дыма (показывает заботу о безопасности, стандарт для Airbnb)",
    "First Aid Kit — аптечка (также важный пункт в разделе безопасности)",
  ];

  const amenitiesList = document.getElementById("amenities-list");
  amenities.forEach((item, index) => {
    const col = document.createElement("div");
    col.className = "col-md-4 mb-2";
    col.innerHTML = `
            <div class="form-check">
                <input class="form-check-input amenity-checkbox" type="checkbox" value="${item}" id="amenity-${index}">
                <label class="form-check-label text-muted" for="amenity-${index}">${item}</label>
            </div>
        `;
    amenitiesList.appendChild(col);
  });

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
        Authorization: "Bearer " + (localStorage.getItem("auth_token") || ""),
      },
    })
      .then((resp) => {
        if (resp.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("isLoggedIn");
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
          bedroomsEl.value = data.roomsCount || data.RoomsCount || 1;
        if (bedsEl) bedroomsEl.value = data.bedsCount || data.BedsCount || 1;
        if (titleEl) titleEl.value = data.title || data.Title || "";
        if (descEl) descEl.value = data.description || data.Description || "";
        if (priceEl)
          priceEl.value = data.pricePerNight || data.PricePerNight || 0;

        if (Array.isArray(data.photos) && data.photos.length > 0) {
          uploadedPhotos = [...data.photos];
          updatePhotoGrid();
        }

        // If in guest view mode, automatically jump to preview
        if (viewerMode === "guest") {
          const previewBtn = document.getElementById("to-preview-btn");
          if (previewBtn) {
            // Small delay to ensure DOM is ready and populated
            setTimeout(() => {
              previewBtn.click();
              // Hide editor elements
              const stepperContainer =
                document.querySelector(".stepper-container");
              const formSection = document.getElementById("form-section");
              const editBtn = document.getElementById("edit-btn");
              const publishBtn = document.getElementById("submit-listing-btn");

              const backBtn = document.getElementById("back-to-dashboard-btn");
              if (backBtn) {
                backBtn.classList.remove("d-none");
                backBtn.onclick = () => {
                  window.location.href = `./host-mode/property-dashboard.html?id=${editAccommodationId}`;
                };
              }

              if (stepperContainer) stepperContainer.classList.add("d-none");
              if (formSection) formSection.classList.add("d-none");
              if (editBtn) editBtn.classList.add("d-none");
              // Also hide the publish button to make it read-only
              if (publishBtn) publishBtn.classList.add("d-none");

              // Change "Final Review" title to "Property Preview" if preferred,
              // but user said "exactly like", so we keep it or refine slightly.
              const previewHeader = document.querySelector(
                "#preview-section h3",
              );
              if (previewHeader)
                previewHeader.textContent = "Guest View Preview";
            }, 100);
          }
        }
      })
      .catch((error) => console.error("Failed to load edit data:", error));
  }

  // --- ADDRESS AUTOCOMPLETE (Nominatim) ---
  const cityInput = document.getElementById("city");
  const countryInput = document.getElementById("country");
  const streetInput = document.getElementById("street");
  const datalist = document.getElementById("location-suggestions");

  let autocompleteData = []; // Store full data for parsing

  if (cityInput) {
    let debounceTimer;

    // City autocomplete
    const handleCityAutocomplete = async function () {
      clearTimeout(debounceTimer);
      const query = this.value.trim();
      if (query.length < 3) {
        if (datalist) datalist.innerHTML = "";
        autocompleteData = [];
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=10`,
          );
          const results = await resp.json();
          if (datalist) {
            autocompleteData = results;
            const formatted = results
              .map((r) => {
                const addr = r.address;
                const city =
                  addr.city ||
                  addr.town ||
                  addr.village ||
                  addr.hamlet ||
                  addr.suburb ||
                  "";
                return city;
              })
              .filter((val, index, self) => val && self.indexOf(val) === index);

            datalist.innerHTML = formatted
              .map((f) => `<option value="${f}">`)
              .join("");
          }
        } catch (e) {
          console.error("Autocomplete error:", e);
        }
      }, 600);
    };

    // Country autocomplete
    const handleCountryAutocomplete = async function () {
      clearTimeout(debounceTimer);
      const query = this.value.trim();
      if (query.length < 3) {
        if (datalist) datalist.innerHTML = "";
        autocompleteData = [];
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=10`,
          );
          const results = await resp.json();
          if (datalist) {
            autocompleteData = results;
            const formatted = results
              .map((r) => {
                const addr = r.address;
                const country = addr.country || "";
                return country;
              })
              .filter((val, index, self) => val && self.indexOf(val) === index);

            datalist.innerHTML = formatted
              .map((f) => `<option value="${f}">`)
              .join("");
          }
        } catch (e) {
          console.error("Autocomplete error:", e);
        }
      }, 600);
    };

    // Street autocomplete
    const handleStreetAutocomplete = async function () {
      clearTimeout(debounceTimer);
      const query = this.value.trim();
      if (query.length < 3) {
        if (datalist) datalist.innerHTML = "";
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=10`,
          );
          const results = await resp.json();
          if (datalist) {
            const formatted = results
              .map((r) => r.display_name)
              .filter((val, index, self) => val && self.indexOf(val) === index);

            datalist.innerHTML = formatted
              .map((f) => `<option value="${f}">`)
              .join("");
          }
        } catch (e) {
          console.error("Autocomplete error:", e);
        }
      }, 600);
    };

    cityInput.addEventListener("input", handleCityAutocomplete);
    if (countryInput)
      countryInput.addEventListener("input", handleCountryAutocomplete);
    if (streetInput)
      streetInput.addEventListener("input", handleStreetAutocomplete);

    // When city changes, auto-fill country if available
    cityInput.addEventListener("change", function () {
      const selectedCity = this.value.trim();
      if (selectedCity && autocompleteData.length > 0) {
        const matching = autocompleteData.find((r) => {
          const addr = r.address;
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.hamlet ||
            addr.suburb ||
            "";
          return city === selectedCity;
        });
        if (matching && countryInput) {
          countryInput.value = matching.address.country || "";
        }
      }
    });
  }

  // Navigation logic
  const updateStepper = () => {
    // Update Step circles
    document.querySelectorAll(".step").forEach((step) => {
      const stepNum = parseInt(step.getAttribute("data-step"));
      step.classList.remove("active", "completed");

      if (stepNum === currentStep) {
        step.classList.add("active");
      } else if (stepNum < currentStep) {
        step.classList.add("completed");
      }
    });

    // Show relevant form section
    document.querySelectorAll(".form-step").forEach((stepEl) => {
      stepEl.classList.add("d-none");
    });
    const currentForm = document.getElementById(`step-${currentStep}`);
    if (currentForm) {
      currentForm.classList.remove("d-none");
    }
  };

  // Stepper dots clickable bindings
  document.querySelectorAll(".step").forEach((stepEl) => {
    stepEl.addEventListener("click", () => {
      const targetStep = parseInt(stepEl.getAttribute("data-step"), 10);
      currentStep = targetStep;
      updateStepper();
      window.scrollTo(0, 0);
    });
  });

  // Buttons bindings
  document.querySelectorAll(".next-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const currentForm = document.getElementById(`step-${currentStep}`);
      let isValid = true;

      // Validate required inputs
      currentForm
        .querySelectorAll(
          "input[required], select[required], textarea[required]",
        )
        .forEach((input) => {
          if (!input.value.trim()) {
            isValid = false;
            input.classList.add("is-invalid");
          } else {
            input.classList.remove("is-invalid");
          }
        });

      if (!isValid) return;

      if (currentStep < totalSteps) {
        currentStep++;
        updateStepper();
        window.scrollTo(0, 0);
      }
    });
  });

  document.querySelectorAll(".prev-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentStep > 1) {
        currentStep--;
        updateStepper();
        window.scrollTo(0, 0);
      }
    });
  });

  // Listing Status radio buttons logic
  const datePickerContainer = document.getElementById("date-picker-container");
  const datePickerInput = document.getElementById("available-from");

  // Initialize flatpickr
  flatpickr(datePickerInput, {
    dateFormat: "Y-m-d",
    minDate: "today",
    disableMobile: "true",
  });

  Array.from(document.getElementsByName("listing-status")).forEach((radio) => {
    radio.addEventListener("change", (e) => {
      // Update UI card logic manually for styling
      document
        .querySelectorAll(".custom-radio-card")
        .forEach((card) => card.classList.remove("active"));
      e.target.closest(".custom-radio-card").classList.add("active");

      if (e.target.value === "Upcoming") {
        datePickerContainer.classList.remove("d-none");
      } else {
        datePickerContainer.classList.add("d-none");
      }
    });
  });

  function getListingVisibilityPayload() {
    const isUpcoming = !!document.querySelector(
      'input[name="listing-status"][value="Upcoming"]',
    )?.checked;
    const availableFromValue =
      document.getElementById("available-from")?.value || "";

    if (isUpcoming) {
      return {
        isActive: true,
        visibleFrom: availableFromValue || null,
      };
    }

    return {
      isActive: true,
      visibleFrom: null,
    };
  }

  async function uploadInlinePhotos(token, photos) {
    const normalizedPhotos = Array.isArray(photos) ? photos : [];
    const uploaded = [];

    for (const photo of normalizedPhotos) {
      if (!photo) continue;
      if (!String(photo).startsWith("data:")) {
        uploaded.push(photo);
        continue;
      }

      const response = await fetch("/api/Images/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ dataUrl: photo }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to upload listing photo.");
      }

      const payload = await response.json();
      if (payload?.url) {
        uploaded.push(payload.url);
      }
    }

    return uploaded;
  }

  // Photo drag & drop placeholder logic
  const photoUpload = document.getElementById("photo-upload");
  const photoPreviewGrid = document.getElementById("photo-preview-grid");
  const dropZone = document.getElementById("drop-zone");

  let uploadedPhotos = []; // Store all uploaded photos as base64

  const updatePhotoGrid = () => {
    photoPreviewGrid.innerHTML = "";
    uploadedPhotos.forEach((photoData, index) => {
      const wrapper = document.createElement("div");
      wrapper.className =
        "position-relative border rounded overflow-hidden shadow-sm";
      wrapper.style.width = "140px";
      wrapper.style.height = "140px";
      wrapper.style.backgroundColor = "#e0e0e0";

      const imgPreview = document.createElement("img");
      imgPreview.src = photoData;
      imgPreview.style.width = "100%";
      imgPreview.style.height = "100%";
      imgPreview.style.objectFit = "cover";

      // First image is Cover
      if (index === 0) {
        const badge = document.createElement("span");
        badge.className = "badge position-absolute top-0 start-0 m-2 z-2";
        badge.style.backgroundColor = "#2986FE";
        badge.textContent = "Cover";
        wrapper.appendChild(badge);
      }

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className =
        "btn btn-sm btn-danger position-absolute bottom-0 end-0 m-2 z-2";
      deleteBtn.style.padding = "2px 6px";
      deleteBtn.innerHTML = "✕";
      deleteBtn.addEventListener("click", (e) => {
        e.preventDefault();
        uploadedPhotos.splice(index, 1);
        updatePhotoGrid();
      });
      wrapper.appendChild(deleteBtn);

      wrapper.appendChild(imgPreview);
      photoPreviewGrid.appendChild(wrapper);
    });

    updatePhotoActionState();
  };

  const updatePhotoActionState = () => {
    if (uploadedPhotos.length > 0) {
      dropZone.classList.add("d-none");
      addMorePhotosBtn.textContent = "Add More Photos";
    } else {
      dropZone.classList.remove("d-none");
      addMorePhotosBtn.textContent = "Select Photos";
    }
  };

  // Handle file selection
  const normalizeImageToDataUrl = (
    file,
    targetWidth = 1600,
    targetHeight = 1000,
  ) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Could not create canvas context"));
              return;
            }

            const srcW = img.naturalWidth || img.width;
            const srcH = img.naturalHeight || img.height;
            const targetRatio = targetWidth / targetHeight;
            const srcRatio = srcW / srcH;

            let cropW = srcW;
            let cropH = srcH;
            let cropX = 0;
            let cropY = 0;

            if (srcRatio > targetRatio) {
              cropW = srcH * targetRatio;
              cropX = (srcW - cropW) / 2;
            } else {
              cropH = srcW / targetRatio;
              cropY = (srcH - cropH) / 2;
            }

            ctx.drawImage(
              img,
              cropX,
              cropY,
              cropW,
              cropH,
              0,
              0,
              targetWidth,
              targetHeight,
            );

            resolve(canvas.toDataURL("image/jpeg", 0.9));
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("Could not decode image"));
        img.src = String(reader.result || "");
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });

  const processFiles = async (files) => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const normalizedPhoto = await normalizeImageToDataUrl(file);
        uploadedPhotos.push(normalizedPhoto);
        updatePhotoGrid();
      } catch (err) {
        console.error("Photo normalization failed:", err);
      }
    }
  };

  // File input change
  photoUpload.addEventListener("change", async (e) => {
    const files = e.target.files;
    await processFiles(files);
    photoUpload.value = "";
  });

  // Drag and drop
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = "#f0f0f0";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.backgroundColor = "";
  });

  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropZone.style.backgroundColor = "";
    const files = e.dataTransfer.files;
    await processFiles(files);
  });

  // Add button to re-open file picker
  const dropZoneBtn = dropZone.querySelector("button");
  if (dropZoneBtn) {
    dropZoneBtn.addEventListener("click", () => {
      photoUpload.value = ""; // Reset to allow selecting same files again
      photoUpload.click();
    });
  }

  // Create "Add More Photos" button
  const addMorePhotosBtn = document.createElement("button");
  addMorePhotosBtn.type = "button";
  addMorePhotosBtn.className = "btn btn-outline-primary mt-3";
  addMorePhotosBtn.textContent = "Select Photos";
  addMorePhotosBtn.addEventListener("click", () => {
    photoUpload.value = ""; // Reset to allow selecting same files again
    photoUpload.click();
  });
  photoPreviewGrid.parentElement.appendChild(addMorePhotosBtn);
  updatePhotoActionState();

  // Final Review Step
  const reviewBtn = document.getElementById("to-preview-btn");
  const addListingForm = document.getElementById("add-listing-form");
  const previewSection = document.getElementById("preview-section");
  const stepperContainer = document.querySelector(".stepper-container");

  reviewBtn.addEventListener("click", () => {
    // Validation across all steps
    let isValid = true;
    let firstInvalidStep = -1;

    const allRequired = addListingForm.querySelectorAll(
      "input[required], select[required], textarea[required]",
    );
    allRequired.forEach((input) => {
      if (!input.value.trim()) {
        isValid = false;
        input.classList.add("is-invalid");
        if (firstInvalidStep === -1) {
          let parent = input.closest(".form-step");
          if (parent)
            firstInvalidStep = parseInt(parent.id.split("-")[1] || "1", 10);
        }
      } else {
        input.classList.remove("is-invalid");
      }
    });

    if (!isValid) {
      currentStep = firstInvalidStep;
      updateStepper();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Gather data
    const title =
      document.getElementById("listing-title").value || "Beautiful Property";
    const desc =
      document.getElementById("listing-desc").value ||
      "A very nice place to stay.";
    const typeEl = document.getElementById("prop-type");
    const typeStr = typeEl.options[typeEl.selectedIndex].text.split(" — ")[0];
    const type = typeStr || "Apartment";
    const city = document.getElementById("city").value || "City";
    const country = document.getElementById("country").value || "Country";
    const guests = document.getElementById("guests-count").value || 1;
    const beds = document.getElementById("beds-count").value || 1;
    const bedrooms = document.getElementById("bedrooms-count").value || 1;
    const price = document.getElementById("price-night").value || "0";
    const currency = document.getElementById("currency").value;

    const isUpcoming = document.querySelector(
      'input[name="listing-status"][value="Upcoming"]',
    ).checked;
    const activeDate = document.getElementById("available-from").value;

    let statusText = "Active right now";
    if (isUpcoming && activeDate) {
      statusText = `Available from ${activeDate}`;
    } else if (isUpcoming) {
      statusText = "Upcoming (No date set)";
    }

    // Selected Amenities
    const selectedAmenities = [];
    document.querySelectorAll(".amenity-checkbox:checked").forEach((cb) => {
      selectedAmenities.push(cb.value);
    });

    // Populate Preview
    document.getElementById("preview-prop-title").textContent = title;
    document.getElementById("preview-prop-location").textContent =
      `${country}, ${city} - ${type}`;

    document.getElementById("preview-prop-desc").innerHTML =
      `<p class="fw-bold mb-1">${guests} guests · ${bedrooms} bedrooms · ${beds} beds</p><p class="mt-2 text-muted">${desc}</p>`;
    document.getElementById("preview-prop-desc").classList.add("collapsed");
    document.getElementById("preview-prop-price").textContent = `${price}`;
    document.getElementById("preview-prop-status").textContent = statusText;

    // Use first uploaded photo if available, otherwise use demo
    let currentPhotoIndex = 0;
    let previewPhotos =
      uploadedPhotos.length > 0
        ? uploadedPhotos
        : ["./images/hero1.png", "./images/hero2.png", "./images/hero3.png"];

    const previewMainPhoto = document.getElementById("preview-main-photo");
    if (previewPhotos.length > 0 && previewMainPhoto) {
      previewMainPhoto.src = previewPhotos[0];
    }

    // Populate thumbnails gallery
    const thumbnailContainer = document.getElementById(
      "preview-thumbnail-container",
    );
    thumbnailContainer.innerHTML = "";
    const setActiveThumbnail = (activeIndex) => {
      thumbnailContainer.querySelectorAll(".thumb").forEach((img, i) => {
        img.classList.toggle("active", i === activeIndex);
      });
    };

    const updatePreviewGallery = (nextIndex) => {
      currentPhotoIndex = nextIndex;
      if (previewMainPhoto) {
        previewMainPhoto.src = previewPhotos[currentPhotoIndex];
      }
      setActiveThumbnail(currentPhotoIndex);
    };

    previewPhotos.forEach((photoSrc, index) => {
      const thumbnail = document.createElement("img");
      thumbnail.classList.add("thumb");
      thumbnail.src = photoSrc;
      thumbnail.alt = `Photo ${index + 1}`;
      thumbnail.classList.toggle("active", index === 0);
      thumbnail.addEventListener("click", () => {
        updatePreviewGallery(index);
      });
      thumbnailContainer.appendChild(thumbnail);
    });

    // Show/hide gallery nav buttons if multiple photos
    const previewPrevBtn = document.getElementById("preview-gallery-prev");
    const previewNextBtn = document.getElementById("preview-gallery-next");
    if (previewPhotos.length > 1) {
      previewPrevBtn.style.display = "block";
      previewNextBtn.style.display = "block";

      previewPrevBtn.onclick = () => {
        const prevIndex =
          (currentPhotoIndex - 1 + previewPhotos.length) % previewPhotos.length;
        updatePreviewGallery(prevIndex);
      };

      previewNextBtn.onclick = () => {
        const nextIndex = (currentPhotoIndex + 1) % previewPhotos.length;
        updatePreviewGallery(nextIndex);
      };
    } else {
      previewPrevBtn.style.display = "none";
      previewNextBtn.style.display = "none";
      previewPrevBtn.onclick = null;
      previewNextBtn.onclick = null;
    }

    // Setup "Show more" toggle for description
    const descToggleBtn = document.getElementById("preview-desc-toggle");
    const propDesc = document.getElementById("preview-prop-desc");
    if (descToggleBtn) {
      descToggleBtn.addEventListener("click", () => {
        propDesc.classList.toggle("expanded");
        const span = descToggleBtn.querySelector("span");
        if (propDesc.classList.contains("expanded")) {
          span.textContent = "Show less";
        } else {
          span.textContent = "Show more";
        }
      });
    }

    const savedData = JSON.parse(
      localStorage.getItem("rently_host_data") || "{}",
    );
    const hostName = savedData.name || "Host Name";
    const hostAvatar =
      localStorage.getItem("rently_header_avatar_thumb") ||
      localStorage.getItem("rently_host_avatar") ||
      "./icons/user.svg";

    const hostNameElem = document.querySelector(".host-name");
    if (hostNameElem) hostNameElem.textContent = hostName;

    const hostAvatarElem = document.querySelector(".host-avatar");
    if (hostAvatarElem) {
      hostAvatarElem.src = hostAvatar;
      const fallback =
        !hostAvatar || /user\.svg(?:[?#]|$)/i.test(String(hostAvatar));
      hostAvatarElem.classList.toggle("avatar-fallback", fallback);
    }

    const previewAmenitiesBox = document.getElementById(
      "preview-prop-amenities",
    );
    previewAmenitiesBox.innerHTML = "";
    if (selectedAmenities.length > 0) {
      selectedAmenities.forEach((am) => {
        const arr = am.split(" — ");
        const cleanName = arr[0];
        const ac = document.createElement("div");
        ac.className = "amenity-item mb-2";
        ac.innerHTML = `<span class="text-muted">• ${cleanName}</span>`;
        previewAmenitiesBox.appendChild(ac);
      });
    } else {
      previewAmenitiesBox.innerHTML =
        "<p class='text-muted small'>No amenities selected.</p>";
    }

    // Hide form and stepper, show preview
    stepperContainer.classList.add("d-none");
    addListingForm.parentElement.style.maxWidth = "100%";
    addListingForm.classList.add("d-none");
    previewSection.classList.remove("d-none");
    window.scrollTo(0, 0);
  });

  document.getElementById("edit-btn").addEventListener("click", () => {
    stepperContainer.classList.remove("d-none");
    addListingForm.classList.remove("d-none");
    addListingForm.parentElement.style.maxWidth = "800px";
    previewSection.classList.add("d-none");
  });

  document
    .getElementById("submit-listing-btn")
    .addEventListener("click", async () => {
      const submitBtn = document.getElementById("submit-listing-btn");
      submitBtn.disabled = true;
      submitBtn.innerText = "Publishing...";

      const desc =
        document.getElementById("listing-desc").value ||
        "A very nice place to stay.";
      const title =
        document.getElementById("listing-title").value || "Beautiful Property";
      const typeEl = document.getElementById("prop-type");
      const typeStr =
        typeEl.options[typeEl.selectedIndex]?.text.split(" — ")[0] ||
        "Apartment";

      // Send the enum numeric value expected by the backend.
      const propertyTypeMap = {
        Apartment: 0,
        House: 1,
        Room: 2,
        Studio: 3,
        Condo: 4,
        Townhouse: 5,
        Guesthouse: 6,
        Villa: 7,
        Cottage: 8,
        Bungalow: 9,
        Cabin: 10,
        Chalet: 11,
        Hotel: 12,
        Hostel: 13,
        Motel: 14,
        Resort: 15,
        Homestay: 16,
        Aparthotel: 17,
        "Farm Stay": 18,
        "Eco-house": 19,
        "Tiny House": 20,
        "Beach House": 21,
        "Lake House": 22,
        "Waterfront Apartment": 23,
        Houseboat: 24,
      };
      const properType = propertyTypeMap[typeStr] ?? propertyTypeMap.Apartment;

      const city = document.getElementById("city").value || "City";
      const country = document.getElementById("country").value || "Country";
      const street = document.getElementById("street").value || "Main St";
      const beds = parseInt(
        document.getElementById("beds-count").value || "1",
        10,
      );
      const rooms = parseInt(
        document.getElementById("bedrooms-count").value || "1",
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
        return;
      }

      const token = localStorage.getItem("auth_token") || "";

      // Map amenities
      const amenitiesMap = {
        TV: 1,
        Kitchen: 2,
        Heating: 3,
        "Dedicated Workspace": 4,
        Washer: 5,
        "Pets Allowed": 6,
        Balcony: 7,
        "Self Check-in": 8,
        Crib: 9,
        Pool: 10,
        Dryer: 11,
        Iron: 12,
        "Smoke Alarm": 13,
        "First Aid Kit": 14,
        "Wi-Fi": 15,
        "Free Parking": 16,
        "Air Conditioning": 17,
        Gym: 18,
        "Meal Service": 19,
      };
      const selectedAmenityIds = [];
      document.querySelectorAll(".amenity-checkbox:checked").forEach((cb) => {
        const cleanName = cb.value.split(" — ")[0].trim();
        if (amenitiesMap[cleanName]) {
          selectedAmenityIds.push(amenitiesMap[cleanName]);
        }
      });

      try {
        const photoUrls = await uploadInlinePhotos(token, uploadedPhotos);
        if (photoUrls.length === 0) {
          photoUrls.push("./images/hero1.png");
          photoUrls.push("./images/hero2.png");
          photoUrls.push("./images/hero3.png");
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
              propertyType: Number(properType),
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
            // Token expired or invalid; redirect to login with return URL
            localStorage.setItem("redirectAfterAuth", window.location.href);
            // Clear invalid token
            localStorage.removeItem("auth_token");
            localStorage.removeItem("isLoggedIn");
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
        submitBtn.disabled = false;
        submitBtn.innerText = editAccommodationId
          ? "Update listing"
          : "Publish listing";
      }
    });
});
