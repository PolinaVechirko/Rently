(function createPropertyBooking(window) {
  function initPropertyBooking() {
    const authStorage = window.RentlyAuthStorage;
    const checkinInput = document.getElementById("prop-checkin");
    const checkoutInput = document.getElementById("prop-checkout");
    const calendarTrigger = document.getElementById("calendar-trigger");
    const availabilityHint = document.getElementById("availability-hint");
    const unavailableRanges = Array.isArray(window.__rentlyPropertyUnavailableRanges)
      ? window.__rentlyPropertyUnavailableRanges
      : [];

    function redirectToLogin() {
      authStorage?.setRedirectAfterAuth?.(window.location.href);
      window.location.href = window.location.pathname.includes("/host-mode/")
        ? "../login.html"
        : "./login.html";
    }

    function parseDateOnlyAsLocal(value) {
      const raw = String(value || "").trim();
      if (!raw) return null;
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed;
    }

    function normalizeUnavailableRanges(ranges) {
      return (Array.isArray(ranges) ? ranges : [])
        .map((range) => {
          const startDate = parseDateOnlyAsLocal(range.startDate || range.StartDate);
          const endDate = parseDateOnlyAsLocal(range.endDate || range.EndDate);
          if (!startDate || !endDate) return null;
          return { startDate, endDate };
        })
        .filter(Boolean);
    }

    function buildDisabledDates(ranges) {
      return ranges
        .map((range) => {
          const lastUnavailableDate = new Date(range.endDate);
          lastUnavailableDate.setDate(lastUnavailableDate.getDate() - 1);
          if (lastUnavailableDate < range.startDate) return null;
          return { from: range.startDate, to: lastUnavailableDate };
        })
        .filter(Boolean);
    }

    function buildCheckinDisabledDates(ranges) {
      return ranges
        .map((range) => {
          const firstUnavailableCheckInDate = new Date(range.startDate);
          firstUnavailableCheckInDate.setDate(firstUnavailableCheckInDate.getDate() - 1);
          const lastUnavailableCheckInDate = new Date(range.endDate);
          lastUnavailableCheckInDate.setDate(lastUnavailableCheckInDate.getDate() - 1);
          if (lastUnavailableCheckInDate < firstUnavailableCheckInDate) return null;
          return {
            from: firstUnavailableCheckInDate,
            to: lastUnavailableCheckInDate,
          };
        })
        .filter(Boolean);
    }

    let normalizedUnavailableRanges = normalizeUnavailableRanges(unavailableRanges);
    let disabledDates = buildDisabledDates(normalizedUnavailableRanges);
    let checkinDisabledDates = buildCheckinDisabledDates(normalizedUnavailableRanges);

    function rangeOverlapsUnavailable(checkInDate, checkOutDate) {
      if (!(checkInDate instanceof Date) || !(checkOutDate instanceof Date)) {
        return false;
      }

      return normalizedUnavailableRanges.some(
        (range) => checkInDate < range.endDate && checkOutDate > range.startDate,
      );
    }

    function parseBookingDate(value) {
      const raw = String(value || "").trim();
      if (!raw) return null;
      const parts = raw.split(".");
      if (parts.length === 3) {
        const [day, month, year] = parts.map((part) => Number(part));
        if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
          return new Date(year, month - 1, day);
        }
      }
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed;
    }

    function toApiDateString(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function addDays(date, days) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null;
      }

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + Number(days || 0));
      return nextDate;
    }

    function isAtLeastOneNight(checkInDate, checkOutDate) {
      if (!(checkInDate instanceof Date) || !(checkOutDate instanceof Date)) {
        return false;
      }

      return checkOutDate > checkInDate;
    }

    function buildDatePickerConfig(options = {}) {
      const input = options.input;
      const disable = Array.isArray(options.disable) ? options.disable : [];
      const onSelectionChanged = options.onSelectionChanged;
      const onMinDateChanged = options.onMinDateChanged;

      return {
        dateFormat: "d.m.Y",
        minDate: "today",
        locale: { firstDayOfWeek: 1 },
        disable,
        onChange(selectedDates, dateString) {
          if (typeof onMinDateChanged === "function") {
            onMinDateChanged(dateString);
          }

          if (typeof onSelectionChanged !== "function") {
            return;
          }

          const selectedDate = selectedDates[0] || parseBookingDate(input?.value);
          onSelectionChanged(selectedDate);
        },
      };
    }

    function handleCheckoutSelection(selectedCheckInDate, selectedCheckOutDate, onInvalid) {
      if (
        !selectedCheckInDate ||
        !selectedCheckOutDate ||
        !rangeOverlapsUnavailable(selectedCheckInDate, selectedCheckOutDate)
      ) {
        return false;
      }

      if (typeof onInvalid === "function") {
        onInvalid();
      }

      return true;
    }

    function refreshUnavailableDateState() {
      disabledDates = buildDisabledDates(normalizedUnavailableRanges);
      checkinDisabledDates = buildCheckinDisabledDates(normalizedUnavailableRanges);
    }

    function addUnavailableRange(checkInDate, checkOutDate) {
      if (!checkInDate || !checkOutDate) {
        return;
      }

      normalizedUnavailableRanges = [
        ...normalizedUnavailableRanges,
        {
          startDate: new Date(checkInDate),
          endDate: new Date(checkOutDate),
        },
      ];
      refreshUnavailableDateState();
    }

    let fpCheckin = null;
    let fpCheckout = null;
    let modalFpCheckin = null;
    let modalFpCheckout = null;
    let updateAvailabilityHint = () => {};

    function syncCheckoutMinDate(picker, input) {
      if (!picker) return;

      const selectedCheckInDate = parseBookingDate(input?.value);
      picker.set("minDate", addDays(selectedCheckInDate, 1) || "today");
    }

    function syncBookingPickers() {
      fpCheckin?.set("disable", checkinDisabledDates);
      fpCheckout?.set("disable", disabledDates);
      modalFpCheckin?.set("disable", checkinDisabledDates);
      modalFpCheckout?.set("disable", disabledDates);

      syncCheckoutMinDate(fpCheckout, checkinInput);
      syncCheckoutMinDate(modalFpCheckout, modalCheckin);
      updateAvailabilityHint();
    }

    if (typeof flatpickr !== "undefined" && checkinInput && checkoutInput) {
      fpCheckout = flatpickr(
        checkoutInput,
        buildDatePickerConfig({
          input: checkoutInput,
          disable: disabledDates,
          onSelectionChanged(selectedCheckOutDate) {
            const selectedCheckInDate = parseBookingDate(checkinInput.value);
            const isInvalid = handleCheckoutSelection(
              selectedCheckInDate,
              selectedCheckOutDate,
              () => {
                fpCheckout.clear();
                alert("These dates overlap with unavailable dates.");
              },
            );
            if (!isInvalid) {
              updateAvailabilityHint();
              return;
            }
            updateAvailabilityHint();
          },
        }),
      );
      fpCheckin = flatpickr(
        checkinInput,
        buildDatePickerConfig({
          input: checkinInput,
          disable: checkinDisabledDates,
          onMinDateChanged() {
            syncCheckoutMinDate(fpCheckout, checkinInput);
          },
          onSelectionChanged() {
            updateAvailabilityHint();
          },
        }),
      );
      calendarTrigger?.addEventListener("click", () => fpCheckin.open());

      updateAvailabilityHint = function updateAvailabilityHintImpl() {
        if (checkinInput.value && checkoutInput.value) {
          availabilityHint.textContent = `${checkinInput.value} → ${checkoutInput.value}`;
          availabilityHint.style.cssText =
            "font-style: normal; color: #101010; font-weight: 500;";
        } else if (checkinInput.value) {
          availabilityHint.textContent = "Select check-out date";
        } else {
          const now = new Date();
          const daysLeft =
            new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
          availabilityHint.textContent = `Available ${daysLeft} days in ${now.toLocaleString("en-US", { month: "long" })}`;
        }
      };
      updateAvailabilityHint();
    }

    const reserveBtn = document.getElementById("reserve-btn");
    const resModal = document.getElementById("reservation-modal");
    const resModalOk = document.getElementById("res-modal-ok");
    const resModalDates = document.getElementById("res-modal-dates");
    const resModalTitle = document.getElementById("res-modal-title");
    const resModalText = document.getElementById("res-modal-text");
    const resModalIcon = document.getElementById("res-modal-icon");

    async function createBooking(checkInValue, checkOutValue) {
      const token = authStorage?.getAuthToken() || "";
      const checkInDate = parseBookingDate(checkInValue);
      const checkOutDate = parseBookingDate(checkOutValue);
      const bookingPropertyId = new URLSearchParams(window.location.search).get("id");

      if (!token) {
        redirectToLogin();
        return false;
      }

      if (!checkInDate || !checkOutDate) {
        throw new Error("Please select valid booking dates.");
      }
      if (!isAtLeastOneNight(checkInDate, checkOutDate)) {
        throw new Error("Please choose a stay of at least 1 night.");
      }
      if (rangeOverlapsUnavailable(checkInDate, checkOutDate)) {
        throw new Error("These dates overlap with unavailable dates.");
      }
      if (!bookingPropertyId) {
        throw new Error("Property id is missing.");
      }

      const response = await fetch("/api/Bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          accommodationId: Number(bookingPropertyId),
          checkInDate: toApiDateString(checkInDate),
          checkOutDate: toApiDateString(checkOutDate),
        }),
      });

      if (response.status === 401) {
        authStorage?.clearAuthentication();
        redirectToLogin();
        return false;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const fallback = await response.text().catch(() => "");
        throw new Error(payload?.message || fallback || "Failed to create booking.");
      }

      return true;
    }

    async function reloadUnavailableRangesFromServer() {
      const bookingPropertyId = new URLSearchParams(window.location.search).get("id");
      if (!bookingPropertyId) {
        return;
      }

      try {
        const response = await fetch(
          `/api/Accommodations/${encodeURIComponent(bookingPropertyId)}`,
        );
        if (!response.ok) {
          return;
        }

        const property = await response.json();
        const nextRanges = Array.isArray(property?.unavailableDateRanges)
          ? property.unavailableDateRanges
          : Array.isArray(property?.UnavailableDateRanges)
            ? property.UnavailableDateRanges
            : [];

        window.__rentlyPropertyUnavailableRanges = nextRanges;
        normalizedUnavailableRanges = normalizeUnavailableRanges(nextRanges);
        refreshUnavailableDateState();
        syncBookingPickers();
      } catch (error) {
        console.warn("Failed to refresh unavailable dates after booking", error);
      }
    }

    const modalCheckin = document.getElementById("modal-checkin");
    const modalCheckout = document.getElementById("modal-checkout");

    if (typeof flatpickr !== "undefined" && modalCheckin && modalCheckout) {
      modalFpCheckout = flatpickr(
        modalCheckout,
        buildDatePickerConfig({
          input: modalCheckout,
          disable: disabledDates,
          onSelectionChanged(selectedCheckOutDate) {
            const selectedCheckInDate = parseBookingDate(modalCheckin.value);
            handleCheckoutSelection(selectedCheckInDate, selectedCheckOutDate, () => {
              modalFpCheckout.clear();
              alert("These dates overlap with unavailable dates.");
            });
          },
        }),
      );
      modalFpCheckin = flatpickr(
        modalCheckin,
        buildDatePickerConfig({
          input: modalCheckin,
          disable: checkinDisabledDates,
          onMinDateChanged() {
            syncCheckoutMinDate(modalFpCheckout, modalCheckin);
          },
        }),
      );
    }

    const showDateModal = () => {
      resModalIcon.textContent = "📅";
      resModalTitle.textContent = "Select Your Dates";
      resModalText.textContent = "Please choose check-in and check-out dates to reserve.";
      resModalDates.classList.remove("hidden");
      resModalOk.textContent = "Reserve Now";
      if (modalFpCheckin) modalFpCheckin.clear();
      if (modalFpCheckout) modalFpCheckout.clear();
      resModalOk.onclick = async () => {
        if (!modalCheckin.value || !modalCheckout.value) {
          if (!modalCheckin.value) modalCheckin.style.borderColor = "#ef4444";
          if (!modalCheckout.value) modalCheckout.style.borderColor = "#ef4444";
          setTimeout(() => {
            modalCheckin.style.borderColor = "";
            modalCheckout.style.borderColor = "";
          }, 1500);
          return;
        }
        if (checkinInput) checkinInput.value = modalCheckin.value;
        if (checkoutInput) checkoutInput.value = modalCheckout.value;
        try {
          resModalOk.disabled = true;
          const created = await createBooking(modalCheckin.value, modalCheckout.value);
          if (!created) return;
          await showSuccessModal(modalCheckin.value, modalCheckout.value);
        } catch (error) {
          alert(error.message || "Failed to create booking.");
        } finally {
          resModalOk.disabled = false;
        }
      };
      resModal.classList.add("show");
      document.body.style.overflow = "hidden";
    };

    const showSuccessModal = async (from, to) => {
      addUnavailableRange(parseBookingDate(from), parseBookingDate(to));
      syncBookingPickers();
      await reloadUnavailableRangesFromServer();
      if (checkinInput) checkinInput.value = "";
      if (checkoutInput) checkoutInput.value = "";
      if (modalCheckin) modalCheckin.value = "";
      if (modalCheckout) modalCheckout.value = "";

      resModalIcon.textContent = "🎉";
      resModalTitle.textContent = "Reservation Confirmed!";
      resModalText.textContent = `You have reserved this property from ${from} to ${to}. Check your email for booking details!`;
      resModalDates.classList.add("hidden");
      resModalOk.textContent = "Great!";
      resModalOk.onclick = () => {
        resModal.classList.remove("show");
        document.body.style.overflow = "";
      };
      resModal.classList.add("show");
    };

    reserveBtn?.addEventListener("click", () => {
      if (!checkinInput?.value || !checkoutInput?.value) {
        showDateModal();
        return;
      }
      (async () => {
        try {
          reserveBtn.disabled = true;
          const created = await createBooking(checkinInput.value, checkoutInput.value);
          if (!created) return;
          await showSuccessModal(checkinInput.value, checkoutInput.value);
        } catch (error) {
          alert(error.message || "Failed to create booking.");
        } finally {
          reserveBtn.disabled = false;
        }
      })();
    });

    document.getElementById("res-modal-close")?.addEventListener("click", () => {
      resModal.classList.remove("show");
      document.body.style.overflow = "";
    });
    resModal?.addEventListener("click", (event) => {
      if (event.target === resModal) {
        resModal.classList.remove("show");
        document.body.style.overflow = "";
      }
    });
  }

  window.RentlyPropertyBooking = {
    initPropertyBooking,
  };
})(window);
