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

    const formatQueryDate = (date) => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return "";
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
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

      group.classList.toggle("is-invalid", Boolean(isInvalid));
    };

    const setGroupActive = (input, isActive) => {
      const group = input?.closest(".search-input-group");
      if (!group) return;

      group.classList.toggle("is-active", Boolean(isActive));
    };

    const updateActiveGroups = () => {
      const groups = document.querySelectorAll(".search-input-group");
      groups.forEach((group) => group.classList.remove("is-active"));

      const activeElement = document.activeElement;
      const activeGroup = activeElement?.closest?.(".search-input-group");
      if (activeGroup) {
        activeGroup.classList.add("is-active");
      }
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
        if (document.activeElement === locInput) {
          locInput.blur();
        }

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
      input.addEventListener("focus", updateActiveGroups);
      input.addEventListener("blur", () => {
        window.setTimeout(updateActiveGroups, 0);
      });
    });

    [checkinInput, checkoutInput].forEach((input) => {
      input.addEventListener("pointerdown", () => {
        if (document.activeElement === locInput) {
          locInput.blur();
          updateActiveGroups();
        }
      });
    });

    document.addEventListener("focusin", updateActiveGroups);
    document.addEventListener("click", () => {
      window.setTimeout(updateActiveGroups, 0);
    });

    locInput.style.outline = "none";
    locInput.addEventListener("focus", () => {
      locInput.style.outline = "none";
    });
    locInput.addEventListener("blur", () => {
      locInput.style.outline = "none";
    });

    window.RentlySearchLocationAutocomplete?.initLocationAutocomplete?.(
      locInput,
      datalist,
    );

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
        `&checkin=${encodeURIComponent(formatQueryDate(checkinDate))}` +
        `&checkout=${encodeURIComponent(formatQueryDate(checkoutDate))}`;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
