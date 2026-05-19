(function createSearchDateRange(window) {
  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function isValidDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime());
  }

  function parseSearchDateValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    const dottedMatch = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dottedMatch) {
      const [, day, month, year] = dottedMatch;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      return isValidDate(parsed) ? parsed : null;
    }

    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      return isValidDate(parsed) ? parsed : null;
    }

    const parsed = new Date(raw);
    return isValidDate(parsed) ? parsed : null;
  }

  function formatDateForQuery(date) {
    if (!isValidDate(date)) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function initSearchDateRange(options = {}) {
    const checkinInput = options.checkinInput;
    const checkoutInput = options.checkoutInput;
    const params = options.params;
    let checkinPicker = checkinInput?._flatpickr || null;
    let checkoutPicker = checkoutInput?._flatpickr || null;

    if (
      typeof flatpickr === "undefined" ||
      !checkinInput ||
      !checkoutInput
    ) {
      return {
        getSelectedDates() {
          return {
            checkin: parseSearchDateValue(checkinInput?.value),
            checkout: parseSearchDateValue(checkoutInput?.value),
          };
        },
      };
    }

    const baseConfig = {
      dateFormat: "d.m.Y",
      minDate: "today",
      allowInput: true,
      locale: { firstDayOfWeek: 1 },
    };

    function syncDateConstraints() {
      const selectedCheckin = checkinPicker?.selectedDates?.[0];
      const selectedCheckout = checkoutPicker?.selectedDates?.[0];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      checkinPicker?.set("minDate", today);
      checkinPicker?.set("maxDate", null);
      checkoutPicker?.set("minDate", today);

      if (isValidDate(selectedCheckin)) {
        checkoutPicker?.set("minDate", addDays(selectedCheckin, 1));
      }

      if (isValidDate(selectedCheckout)) {
        checkinPicker?.set("maxDate", addDays(selectedCheckout, -1));
      }

      if (
        isValidDate(selectedCheckin) &&
        isValidDate(selectedCheckout) &&
        selectedCheckout <= selectedCheckin
      ) {
        if (document.activeElement === checkinInput) {
          checkoutPicker?.clear();
          checkoutPicker?.set("minDate", addDays(selectedCheckin, 1));
        } else {
          checkinPicker?.clear();
          checkinPicker?.set("maxDate", addDays(selectedCheckout, -1));
        }
      }
    }

    checkinPicker = flatpickr(checkinInput, {
      ...baseConfig,
      onChange: syncDateConstraints,
    });

    checkoutPicker = flatpickr(checkoutInput, {
      ...baseConfig,
      onChange: syncDateConstraints,
    });

    const initialCheckin = parseSearchDateValue(params?.get("checkin"));
    const initialCheckout = parseSearchDateValue(params?.get("checkout"));
    if (initialCheckin) {
      checkinPicker.setDate(initialCheckin, false);
      checkinInput.value = checkinPicker.formatDate(initialCheckin, "d.m.Y");
    }
    if (initialCheckout) {
      checkoutPicker.setDate(initialCheckout, false);
      checkoutInput.value = checkoutPicker.formatDate(initialCheckout, "d.m.Y");
    }

    syncDateConstraints();

    return {
      getSelectedDates() {
        return {
          checkin:
            parseSearchDateValue(checkinInput.value) ||
            checkinPicker?.selectedDates?.[0] ||
            null,
          checkout:
            parseSearchDateValue(checkoutInput.value) ||
            checkoutPicker?.selectedDates?.[0] ||
            null,
        };
      },
    };
  }

  window.RentlySearchDateRange = {
    formatDateForQuery,
    initSearchDateRange,
    parseSearchDateValue,
  };
})(window);
