(function createHostDashboardAvailability(window) {
  const api = window.RentlyHostDashboardApi;
  let availabilityPicker = null;
  let availabilityPickerInput = null;

  function buildAvailabilityDisabledRanges(bookings, blocks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingRanges = (Array.isArray(bookings) ? bookings : [])
      .filter((booking) => (booking.status || booking.Status) === "Confirmed")
      .map((booking) => {
        const from = api.parseDateOnlyAsLocal(
          booking.checkInDate || booking.CheckInDate,
        );
        const to = api.parseDateOnlyAsLocal(
          booking.checkOutDate || booking.CheckOutDate,
        );
        if (!from || !to || to < today) return null;
        return { from, to };
      })
      .filter(Boolean);

    const blockRanges = (Array.isArray(blocks) ? blocks : [])
      .map((block) => {
        const from = api.parseDateOnlyAsLocal(block.startDate || block.StartDate);
        const to = api.parseDateOnlyAsLocal(block.endDate || block.EndDate);
        if (!from || !to || to < today) return null;
        return { from, to };
      })
      .filter(Boolean);

    return [...bookingRanges, ...blockRanges];
  }

  function renderAvailabilityBlocks(blocks, callbacks) {
    const container = document.getElementById("availability-blocks-list");
    if (!container) return;

    if (!Array.isArray(blocks) || !blocks.length) {
      container.innerHTML = "<span>No blocked dates yet.</span>";
      return;
    }

    container.innerHTML = blocks
      .map((block) => {
        const blockId = block.id || block.Id;
        const start = block.startDate || block.StartDate;
        const end = block.endDate || block.EndDate;
        const note = block.note || block.Note || "";
        const startDate = api.parseDateOnlyAsLocal(start);
        const endDate = api.parseDateOnlyAsLocal(end);
        const formattedStart = startDate ? api.dateFormatter.format(startDate) : start;
        const formattedEnd = endDate ? api.dateFormatter.format(endDate) : end;

        return `<div class="d-flex justify-content-between align-items-center py-2 border-top gap-3"><div><strong>${formattedStart}</strong> to <strong>${formattedEnd}</strong>${note ? `<div class="text-muted small">${note}</div>` : ""}</div><button class="btn btn-link p-0 text-decoration-none text-danger availability-block-delete-btn d-inline-flex align-items-center justify-content-center" type="button" data-block-id="${blockId}" aria-label="Remove blocked dates" style="width: 32px; height: 32px; font-size: 28px; line-height: 1;">×</button></div>`;
      })
      .join("");

    container.querySelectorAll(".availability-block-delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const blockId = button.getAttribute("data-block-id");
        if (!blockId) return;

        button.disabled = true;
        try {
          await callbacks.onDelete(blockId);
        } catch (error) {
          alert(error.message || "Failed to remove blocked dates.");
          button.disabled = false;
        }
      });
    });
  }

  function initAvailabilityPicker(selectedAccommodationId, hostBookings, blocks, callbacks) {
    const input = document.getElementById("availability-range");
    const button = document.getElementById("availability-block-btn");
    const noteInput = document.getElementById("availability-note");
    if (!input || !button || typeof flatpickr !== "function") return;

    const disabledRanges = buildAvailabilityDisabledRanges(hostBookings, blocks);

    if (availabilityPicker && availabilityPickerInput === input) {
      availabilityPicker.set("disable", disabledRanges);
      availabilityPicker.clear();
      input.value = "";
      if (noteInput) {
        noteInput.value = "";
      }
    } else {
      if (availabilityPicker && availabilityPickerInput && availabilityPickerInput !== input) {
        availabilityPicker.destroy();
      }

      availabilityPicker = flatpickr(input, {
        mode: "range",
        dateFormat: "Y-m-d",
        minDate: "today",
        allowInput: false,
        disable: disabledRanges,
      });
      availabilityPickerInput = input;
    }

    function resetAvailabilityForm() {
      if (availabilityPicker && availabilityPickerInput === input) {
        availabilityPicker.clear();
      } else {
        input.value = "";
      }

      if (noteInput) {
        noteInput.value = "";
      }
    }

    button.onclick = async () => {
      const parsed = api.parseSelectedDates(input.value);
      if (!parsed) {
        alert("Select a valid date range first.");
        return;
      }

      button.disabled = true;
      try {
        await callbacks.onCreate({
          startDate: api.formatDateOnlyForApi(parsed.start),
          endDate: api.formatDateOnlyForApi(parsed.end),
          note: noteInput ? noteInput.value.trim() : "",
        });
        resetAvailabilityForm();
      } catch (error) {
        alert(error.message || "Failed to block availability.");
      } finally {
        button.disabled = false;
      }
    };
  }

  window.RentlyHostDashboardAvailability = {
    initAvailabilityPicker,
    renderAvailabilityBlocks,
  };
})(window);
