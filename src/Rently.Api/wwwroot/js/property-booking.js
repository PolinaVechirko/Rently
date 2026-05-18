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

    const normalizedUnavailableRanges = unavailableRanges
      .map((range) => {
        const startDate = parseDateOnlyAsLocal(range.startDate || range.StartDate);
        const endDate = parseDateOnlyAsLocal(range.endDate || range.EndDate);
        if (!startDate || !endDate) return null;
        return { startDate, endDate };
      })
      .filter(Boolean);

    const disabledDates = normalizedUnavailableRanges
      .map((range) => {
        const lastUnavailableDate = new Date(range.endDate);
        lastUnavailableDate.setDate(lastUnavailableDate.getDate() - 1);
        if (lastUnavailableDate < range.startDate) return null;
        return { from: range.startDate, to: lastUnavailableDate };
      })
      .filter(Boolean);

    const checkinDisabledDates = normalizedUnavailableRanges
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
          return new Date(Date.UTC(year, month - 1, day));
        }
      }
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed;
    }

    function toIsoDateString(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
      return date.toISOString();
    }

    if (typeof flatpickr !== "undefined" && checkinInput && checkoutInput) {
      const fpConfig = {
        dateFormat: "d.m.Y",
        minDate: "today",
        locale: { firstDayOfWeek: 1 },
      };
      const fpCheckin = flatpickr(checkinInput, {
        ...fpConfig,
        disable: checkinDisabledDates,
        onChange: (_dates, str) => {
          fpCheckout.set("minDate", str);
          updateAvailabilityHint();
        },
      });
      const fpCheckout = flatpickr(checkoutInput, {
        ...fpConfig,
        disable: disabledDates,
        onChange: (selectedDates) => {
          const selectedCheckInDate = parseBookingDate(checkinInput.value);
          if (
            selectedCheckInDate &&
            selectedDates[0] &&
            rangeOverlapsUnavailable(selectedCheckInDate, selectedDates[0])
          ) {
            fpCheckout.clear();
            alert("These dates overlap with unavailable dates.");
            updateAvailabilityHint();
            return;
          }
          updateAvailabilityHint();
        },
      });
      calendarTrigger?.addEventListener("click", () => fpCheckin.open());

      function updateAvailabilityHint() {
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
      }
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
        authStorage?.setRedirectAfterAuth(window.location.href);
        window.location.href = window.location.pathname.includes("/host-mode/")
          ? "../login.html"
          : "./login.html";
        return false;
      }

      if (!checkInDate || !checkOutDate) {
        throw new Error("Please select valid booking dates.");
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
          checkInDate: toIsoDateString(checkInDate),
          checkOutDate: toIsoDateString(checkOutDate),
        }),
      });

      if (response.status === 401) {
        authStorage?.clearAuthentication();
        authStorage?.setRedirectAfterAuth(window.location.href);
        window.location.href = window.location.pathname.includes("/host-mode/")
          ? "../login.html"
          : "./login.html";
        return false;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const fallback = await response.text().catch(() => "");
        throw new Error(payload?.message || fallback || "Failed to create booking.");
      }

      return true;
    }

    let modalFpCheckin;
    let modalFpCheckout;
    const modalCheckin = document.getElementById("modal-checkin");
    const modalCheckout = document.getElementById("modal-checkout");

    if (typeof flatpickr !== "undefined" && modalCheckin && modalCheckout) {
      const mConfig = {
        dateFormat: "d.m.Y",
        minDate: "today",
        locale: { firstDayOfWeek: 1 },
      };
      modalFpCheckin = flatpickr(modalCheckin, {
        ...mConfig,
        disable: checkinDisabledDates,
        onChange: (_dates, str) => modalFpCheckout.set("minDate", str),
      });
      modalFpCheckout = flatpickr(modalCheckout, {
        ...mConfig,
        disable: disabledDates,
        onChange: (selectedDates) => {
          const selectedCheckInDate = parseBookingDate(modalCheckin.value);
          if (
            selectedCheckInDate &&
            selectedDates[0] &&
            rangeOverlapsUnavailable(selectedCheckInDate, selectedDates[0])
          ) {
            modalFpCheckout.clear();
            alert("These dates overlap with unavailable dates.");
          }
        },
      });
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
          showSuccessModal(modalCheckin.value, modalCheckout.value);
        } catch (error) {
          alert(error.message || "Failed to create booking.");
        } finally {
          resModalOk.disabled = false;
        }
      };
      resModal.classList.add("show");
      document.body.style.overflow = "hidden";
    };

    const showSuccessModal = (from, to) => {
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
      const isLoggedIn = !!authStorage?.getAuthToken();
      if (!isLoggedIn) {
        authStorage?.setRedirectAfterAuth(window.location.href);
        window.location.href = window.location.pathname.includes("/host-mode/")
          ? "../login.html"
          : "./login.html";
        return;
      }
      if (!checkinInput?.value || !checkoutInput?.value) {
        showDateModal();
        return;
      }
      (async () => {
        try {
          reserveBtn.disabled = true;
          const created = await createBooking(checkinInput.value, checkoutInput.value);
          if (!created) return;
          showSuccessModal(checkinInput.value, checkoutInput.value);
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
