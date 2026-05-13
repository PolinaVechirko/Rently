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

  // Test if we're on edit page
  console.log("[Edit] Page loaded, checking for edit ID");
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");
  if (editId) {
    console.log("[Edit] Edit mode detected for ID:", editId);
  }

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

  // --- ADDRESS AUTOCOMPLETE (Nominatim) ---
  const locInputs = [
    document.getElementById("city"),
    document.getElementById("country"),
    document.getElementById("street"),
  ];
  const datalist = document.getElementById("location-suggestions");

  if (locInputs[0]) {
    let debounceTimer;
    const handleAutocomplete = function () {
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
              .map((r) => {
                const addr = r.address;
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
                return r.display_name;
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

    locInputs.forEach((inp) => {
      if (inp) inp.addEventListener("input", handleAutocomplete);
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

    // Load existing photos when navigating to step 3
    if (currentStep === 3 && existingPhotos.length > 0 && !photosLoaded) {
      photosLoaded = true;
      setTimeout(() => {
        displayExistingPhotos(existingPhotos);
      }, 100);
    }
  };

  // Pre-fill from API if ?id= is present
  const _editUrlParams = new URLSearchParams(window.location.search);
  const _editAccomId = _editUrlParams.get("id");
  const _editToken = localStorage.getItem("auth_token") || "";

  // Store existing photos globally for edit mode
  let existingPhotos = [];
  let photosLoaded = false; // Flag to prevent duplicate loading

  // Photo display will be called after API data is loaded
  // This was moved to the API fetch success callback

  const _amenityNameMap = {
    "Wi-Fi": "Wi-Fi — интернет",
    TV: "TV — телевизор",
    Kitchen: "Kitchen — кухня (важно для длительного жилья)",
    "Air Conditioning": "Air Conditioning — кондиционер",
    Heating: "Heating — отопление",
    "Dedicated Workspace": "Dedicated Workspace — рабочее место",
    Washer: "Washer — стиральная машина",
    "Free Parking": "Free Parking — бесплатная парковка",
    Gym: "Gym — спортзал",
    "Pets Allowed": "Pets Allowed — можно с животными",
    Balcony: "Balcony — балкон или терраса",
    "Self Check-in": "Self Check-in — бесконтактное заселение",
    Crib: "Crib — детская кроватка",
    "Meal Service": "Meal Service — включено питание",
    Pool: "Pool — бассейн (очень популярный фильтр для отдыха)",
    Dryer: "Dryer — сушилка для одежды (часто идет в паре с Washer)",
    Iron: "Iron — утюг (базовая вещь для тех, кто приехал по работе)",
    "Smoke Alarm":
      "Smoke Alarm — датчик дыма (показывает заботу о безопасности, стандарт для Airbnb)",
    "First Aid Kit":
      "First Aid Kit — аптечка (также важный пункт в разделе безопасности)",
  };

  if (_editAccomId && _editToken) {
    fetch("/api/Accommodations/my", {
      headers: {
        Authorization: "Bearer " + _editToken,
      },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("isLoggedIn");
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
              String(item?.id ?? item?.Id ?? "") === String(_editAccomId),
          ) || null
        );
      })
      .then((data) => {
        if (_editAccomId && !data) {
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
        if (bedroomsEl) bedroomsEl.value = data.roomsCount || "";
        if (priceEl) priceEl.value = data.pricePerNight || "";

        // Store existing photos for later use
        if (data.photos && data.photos.length > 0) {
          existingPhotos = data.photos;
          console.log("[Edit] Stored existing photos:", existingPhotos.length);
          
          // Auto-navigate to step 3 and display photos
          console.log("[Edit] Auto-navigating to step 3 to show photos");
          setTimeout(() => {
            currentStep = 3;
            updateStepper();
            // Display photos after navigation
            setTimeout(() => {
              if (existingPhotos.length > 0) {
                console.log("[Edit] Displaying photos after navigation");
                displayExistingPhotos(existingPhotos);
              }
            }, 500);
          }, 1000);
        }

        // Pre-check amenities
        const amenities = data.amenities || data.Amenities || [];
        if (amenities && amenities.length > 0) {
          setTimeout(() => {
            amenities.forEach((name) => {
              const label = _amenityNameMap[name] || name;
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

  // Function to display existing photos in step 3
  function displayExistingPhotos(photos) {
    console.log("[Edit] Displaying existing photos:", photos.length);
    const photoPreviewGrid = document.getElementById("photo-preview-grid");
    const dropZoneEl = document.getElementById("drop-zone");
    
    if (!photoPreviewGrid) {
      console.error("[Edit] photo-preview-grid element not found");
      return;
    }
    
    // Hide drop zone if we have existing photos
    if (dropZoneEl && photos.length > 0) {
      dropZoneEl.classList.add("d-none");
    }
    
    // Clear existing previews first
    photoPreviewGrid.innerHTML = "";
    
    photos.forEach((photoUrl, index) => {
      console.log(`[Edit] Processing photo ${index}`);
      
      // Create simple photo container
      const photoContainer = document.createElement("div");
      photoContainer.style.cssText = `
        position: relative;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        width: 140px;
        height: 140px;
        margin: 8px;
        display: inline-block;
        background: #f8f9fa;
      `;

      // Create image element
      const img = document.createElement("img");
      img.src = photoUrl;
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      `;
      img.alt = `Photo ${index + 1}`;
      
      // Add image to container
      photoContainer.appendChild(img);
      
      // Add "Cover" badge to first photo
      if (index === 0) {
        const badge = document.createElement("span");
        badge.textContent = "Cover";
        badge.style.cssText = `
          position: absolute;
          top: 8px;
          left: 8px;
          background: #2986FE;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
        `;
        photoContainer.appendChild(badge);
      }
      
      // Add delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.innerHTML = "×";
      deleteBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
      `;
      deleteBtn.onclick = () => {
        photoContainer.remove();
        existingPhotos = existingPhotos.filter((_, i) => i !== index);
        if (existingPhotos.length === 0) {
          photosLoaded = false;
          if (dropZoneEl) dropZoneEl.classList.remove("d-none");
        }
      };
      photoContainer.appendChild(deleteBtn);
      
      // Add to grid
      photoPreviewGrid.appendChild(photoContainer);
    });
  }

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

  // Photo drag & drop placeholder logic
  const photoUpload = document.getElementById("photo-upload");
  const photoPreviewGrid = document.getElementById("photo-preview-grid");

  // Simulate image selection
  if (photoUpload) {
    photoUpload.addEventListener("change", (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        const dropZoneEl = document.getElementById("drop-zone");
        if (dropZoneEl) dropZoneEl.classList.add("d-none");
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = (event) => {
          const wrapper = document.createElement("div");
          wrapper.className =
            "position-relative border rounded overflow-hidden shadow-sm";
          wrapper.style.width = "140px";
          wrapper.style.height = "140px";
          wrapper.style.backgroundColor = "#e0e0e0";

          const img = document.createElement("img");
          img.src = event.target.result;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "cover";
          img.alt = file.name;
          
          wrapper.appendChild(img);

          // Add to existing photos array as base64
          existingPhotos.push(event.target.result);

          // First image uploaded becomes Cover if no existing cover
          if (photoPreviewGrid && photoPreviewGrid.children.length === 0) {
            const badge = document.createElement("span");
            badge.className = "badge position-absolute top-0 start-0 m-2";
            badge.style.backgroundColor = "#2986FE";
            badge.textContent = "Cover";
            wrapper.appendChild(badge);
          }

          // Add delete button for new photos
          const deleteBtn = document.createElement("button");
          deleteBtn.className = "btn btn-danger btn-sm position-absolute top-0 end-0 m-2";
          deleteBtn.innerHTML = "×";
          deleteBtn.style.width = "24px";
          deleteBtn.style.height = "24px";
          deleteBtn.style.padding = "0";
          deleteBtn.style.borderRadius = "50%";
          deleteBtn.onclick = () => {
            wrapper.remove();
            const index = existingPhotos.indexOf(event.target.result);
            if (index > -1) {
              existingPhotos.splice(index, 1);
            }
            if (existingPhotos.length === 0 && dropZoneEl) {
              dropZoneEl.classList.remove("d-none");
            }
          };
          wrapper.appendChild(deleteBtn);

          if (photoPreviewGrid) photoPreviewGrid.appendChild(wrapper);
        };
        
        reader.readAsDataURL(file);
      }
    });
  }

  // Final Review Step
  const reviewBtn = document.getElementById("to-preview-btn");
  const addListingForm = document.getElementById("add-listing-form");
  const previewSection = document.getElementById("preview-section");
  const stepperContainer = document.querySelector(".stepper-container");

  if (reviewBtn) {
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
      document.getElementById("preview-prop-price").textContent = `${price}`;
      document.getElementById("preview-prop-status").textContent = statusText;

      // Update preview photo if we have existing photos
      if (existingPhotos.length > 0) {
        const previewMainPhoto = document.getElementById("preview-main-photo");
        if (previewMainPhoto) {
          previewMainPhoto.src = existingPhotos[0].startsWith('data:image/') ? existingPhotos[0] : `/api/Images/resize?url=${encodeURIComponent(existingPhotos[0])}&width=600`;
        }
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

    const editBtn = document.getElementById("edit-btn");
    if (editBtn) {
      editBtn.addEventListener("click", () => {
        stepperContainer.classList.remove("d-none");
        if (addListingForm) addListingForm.classList.remove("d-none");
        if (addListingForm && addListingForm.parentElement)
          addListingForm.parentElement.style.maxWidth = "800px";
        if (previewSection) previewSection.classList.add("d-none");
      });
    }

    const submitListingBtnEl = document.getElementById("submit-listing-btn");
    if (submitListingBtnEl) {
      submitListingBtnEl.addEventListener("click", async () => {
        if (!_editAccomId || !_editToken) {
          alert("No listing ID found. Cannot save.");
          return;
        }

        // Gather form values
        const typeEl = document.getElementById("prop-type");
        const propTypeLabel = typeEl
          ? typeEl.value.split(" — ")[0].trim()
          : "Apartment";
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
        const propType =
          propertyTypeMap[propTypeLabel] ?? propertyTypeMap.Apartment;
        const description = document.getElementById("listing-desc")?.value || "";
        const city = document.getElementById("city")?.value || "";
        const country = document.getElementById("country")?.value || "";
        const street = document.getElementById("street")?.value || "";
        const beds = parseInt(
          document.getElementById("beds-count")?.value || "1",
        );
        const rooms = parseInt(
          document.getElementById("bedrooms-count")?.value || "1",
        );
        const price = parseFloat(
          document.getElementById("price-night")?.value || "0",
        );
        const isActive = !document.querySelector(
          'input[name="listing-status"][value="Upcoming"]',
        )?.checked;

        // Collect selected amenity display names (map back to clean names via reverse lookup)
        const reverseMap = Object.fromEntries(
          Object.entries(_amenityNameMap).map(([k, v]) => [v, k]),
        );
        const selectedAmenityNames = [];
        document.querySelectorAll(".amenity-checkbox:checked").forEach((cb) => {
          const clean = reverseMap[cb.value] || cb.value.split(" — ")[0];
          selectedAmenityNames.push(clean);
        });

        const dto = {
          propertyType: propType,
          pricePerNight: price,
          roomsCount: rooms,
          bedsCount: beds,
          description: description,
          title: document.getElementById("listing-title")?.value || "",
          country: country,
          city: city,
          street: street,
          isActive: isActive,
          photos: existingPhotos, // Include existing and new photos
        };

        try {
          const resp = await fetch(`/api/Accommodations/${_editAccomId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + _editToken,
            },
            body: JSON.stringify(
              Object.assign({}, dto, { propertyType: Number(dto.propertyType) }),
            ),
          });

          if (!resp.ok) {
            if (resp.status === 401) {
              // Token expired or invalid; redirect to login with return URL
              localStorage.setItem("redirectAfterAuth", window.location.href);
              // Clear invalid token
              localStorage.removeItem("auth_token");
              localStorage.removeItem("isLoggedIn");
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
  }
});
