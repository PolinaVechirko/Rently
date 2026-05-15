(function initHomeSearchPanel() {
  window.__rentlyHomeSearchManaged = true;

  function boot() {
    const locInput = document.getElementById("location-input");
    const checkinInput = document.getElementById("checkin-input");
    const checkoutInput = document.getElementById("checkout-input");
    const searchBtn = document.getElementById("search-main-btn");
    const errorMsg = document.getElementById("search-error-msg");
    const datalist = document.getElementById("city-suggestions");

    if (!locInput || !checkinInput || !checkoutInput || !searchBtn) {
      return;
    }

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    const parseIsoDate = (value) => {
      if (!value) return null;
      const parsed = new Date(`${value}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatFlatpickrDate = (date) => {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    const addDays = (date, days) => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    };

    const showError = (message) => {
      if (!errorMsg) return;
      errorMsg.textContent = message;
      errorMsg.classList.add("visible");
      errorMsg.style.display = "block";
    };

    const hideError = () => {
      if (!errorMsg) return;
      errorMsg.classList.remove("visible");
      errorMsg.style.display = "none";
    };

    const setGroupState = (input, isInvalid) => {
      const group = input.closest(".search-input-group");
      if (!group) return;

      group.style.boxShadow = isInvalid
        ? "0 0 10px 3px #D5D5D6, inset 0 0 10px rgba(255, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 0, 0, 0.7)"
        : input.value.trim()
          ? "0 0 10px 3px #D5D5D6"
          : "";
    };

    const clearFieldError = (input) => {
      setGroupState(input, false);
      if ([locInput, checkinInput, checkoutInput].every((field) => field.value.trim())) {
        hideError();
      }
    };

    const setCheckoutMinimum = (baseDate) => {
      const minCheckoutDate = addDays(baseDate, 1);

      if (checkoutInput._flatpickr) {
        checkoutInput._flatpickr.set("minDate", formatFlatpickrDate(minCheckoutDate));
      } else {
        checkoutInput.min = minCheckoutDate.toISOString().slice(0, 10);
        if (checkoutInput.value) {
          const currentCheckout = parseIsoDate(checkoutInput.value);
          if (currentCheckout && currentCheckout <= baseDate) {
            checkoutInput.value = "";
          }
        }
      }
    };

    const openNativePicker = (input) => {
      input.type = "date";
      input.readOnly = false;
      input.placeholder = "";

      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.focus();
        input.click();
      }
    };

    const attachPickerOpen = (input) => {
      const openPicker = () => {
        if (input._flatpickr) {
          input._flatpickr.open();
        } else {
          openNativePicker(input);
        }
      };

      input.addEventListener("click", openPicker);
      input.addEventListener("focus", openPicker);

      const dateHalf = input.closest(".date-half");
      if (dateHalf) {
        dateHalf.addEventListener("click", (event) => {
          if (event.target !== input) {
            openPicker();
          }
        });
      }
    };

    if (typeof flatpickr !== "undefined") {
      flatpickr(checkinInput, {
        dateFormat: "d.m.Y",
        minDate: "today",
        allowInput: true,
        clickOpens: true,
        locale: { firstDayOfWeek: 1 },
        onChange: (selectedDates) => {
          const selectedDate = selectedDates[0];
          if (!selectedDate) return;
          setCheckoutMinimum(selectedDate);
          clearFieldError(checkinInput);
        },
      });

      flatpickr(checkoutInput, {
        dateFormat: "d.m.Y",
        minDate: formatFlatpickrDate(addDays(today, 1)),
        allowInput: true,
        clickOpens: true,
        locale: { firstDayOfWeek: 1 },
        onChange: () => {
          clearFieldError(checkoutInput);
        },
      });
    } else {
      checkinInput.type = "date";
      checkoutInput.type = "date";
      checkinInput.readOnly = false;
      checkoutInput.readOnly = false;
      checkinInput.min = todayIso;
      checkoutInput.min = addDays(today, 1).toISOString().slice(0, 10);

      checkinInput.addEventListener("change", () => {
        const checkinDate = parseIsoDate(checkinInput.value);
        if (checkinDate) {
          setCheckoutMinimum(checkinDate);
        }
        clearFieldError(checkinInput);
      });

      checkoutInput.addEventListener("change", () => {
        clearFieldError(checkoutInput);
      });
    }

    attachPickerOpen(checkinInput);
    attachPickerOpen(checkoutInput);

    [locInput, checkinInput, checkoutInput].forEach((input) => {
      input.addEventListener("input", () => clearFieldError(input));
      input.addEventListener("change", () => clearFieldError(input));
    });

    let dbLocations = [];
    fetch("/api/Accommodations/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        dbLocations = Array.isArray(data) ? data : [];
      })
      .catch((e) => console.error("Failed to load local locations:", e));

    let debounceTimer;
    locInput.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      const query = this.value.trim().toLowerCase();

      if (!datalist) return;
      if (query.length < 2) {
        datalist.innerHTML = "";
        return;
      }

      const localMatches = dbLocations.filter((loc) =>
        String(loc).toLowerCase().includes(query),
      );

      let optionsHtml = localMatches
        .map((loc) => `<option value="${loc}">`)
        .join("");

      debounceTimer = setTimeout(async () => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=10`,
          );
          const results = await resp.json();

          const globalOptions = results
            .map((r) => {
              const addr = r.address || {};
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
              return r.display_name || "";
            })
            .filter((value, index, self) => value && self.indexOf(value) === index)
            .filter((value) => !localMatches.some((loc) => value.includes(loc)))
            .map((value) => `<option value="${value}">`)
            .join("");

          datalist.innerHTML = optionsHtml + globalOptions;
        } catch (e) {
          console.error("Autocomplete error:", e);
          datalist.innerHTML = optionsHtml;
        }
      }, 300);
    });

    searchBtn.addEventListener("click", () => {
      let isValid = true;

      [locInput, checkinInput, checkoutInput].forEach((input) => {
        const isEmpty = !input.value.trim();
        setGroupState(input, isEmpty);
        if (isEmpty) {
          isValid = false;
        }
      });

      if (!isValid) {
        showError("Location, check-in and check-out are required.");
        return;
      }

      const checkinDate = checkinInput._flatpickr
        ? checkinInput._flatpickr.selectedDates[0]
        : parseIsoDate(checkinInput.value);
      const checkoutDate = checkoutInput._flatpickr
        ? checkoutInput._flatpickr.selectedDates[0]
        : parseIsoDate(checkoutInput.value);

      if (
        !checkinDate ||
        !checkoutDate ||
        checkoutDate.getTime() <= checkinDate.getTime()
      ) {
        setGroupState(checkinInput, true);
        setGroupState(checkoutInput, true);
        showError("Choose a stay of at least 1 night.");
        return;
      }

      hideError();

      window.location.href =
        `./search.html?location=${encodeURIComponent(locInput.value)}` +
        `&checkin=${encodeURIComponent(checkinInput.value)}` +
        `&checkout=${encodeURIComponent(checkoutInput.value)}`;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
