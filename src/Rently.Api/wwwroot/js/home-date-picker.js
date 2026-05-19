(function initHomeDatePicker() {
  function boot() {
    const checkinInput = document.getElementById("checkin-input");
    const checkoutInput = document.getElementById("checkout-input");

    if (!checkinInput || !checkoutInput) {
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);

    const openNativePicker = (input) => {
      input.type = "date";
      input.readOnly = false;
      input.min = input.min || todayIso;
      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.focus();
        input.click();
      }
    };

    const attachOpenHandlers = (input) => {
      const openPicker = () => {
        if (input._flatpickr) {
          input._flatpickr.open();
          return;
        }

        openNativePicker(input);
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

    const syncCheckoutMin = () => {
      if (checkinInput._flatpickr && checkoutInput._flatpickr) {
        const selectedDate =
          checkinInput._flatpickr.input.value || checkinInput.value;
        if (selectedDate) {
          checkoutInput._flatpickr.set("minDate", selectedDate);
        }
        return;
      }

      checkoutInput.min = checkinInput.value || todayIso;
      if (checkoutInput.value && checkoutInput.value < checkoutInput.min) {
        checkoutInput.value = "";
      }
    };

    if (typeof flatpickr !== "undefined") {
      const config = {
        dateFormat: "d.m.Y",
        minDate: "today",
        allowInput: true,
        clickOpens: true,
        locale: { firstDayOfWeek: 1 },
        onChange: function () {
          if (this.element.id === "checkin-input") {
            syncCheckoutMin();
          }
        },
      };

      if (!checkinInput._flatpickr) {
        flatpickr(checkinInput, config);
      }

      if (!checkoutInput._flatpickr) {
        flatpickr(checkoutInput, config);
      }
    } else {
      checkinInput.type = "date";
      checkoutInput.type = "date";
      checkinInput.readOnly = false;
      checkoutInput.readOnly = false;
      checkinInput.min = todayIso;
      checkoutInput.min = todayIso;
      checkinInput.addEventListener("change", syncCheckoutMin);
    }

    attachOpenHandlers(checkinInput);
    attachOpenHandlers(checkoutInput);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
