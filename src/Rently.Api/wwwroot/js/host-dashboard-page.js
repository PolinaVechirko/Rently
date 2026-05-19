(function createHostDashboardPage(window) {
  const api = window.RentlyHostDashboardApi;
  const availabilityModule = window.RentlyHostDashboardAvailability;
  const bookingsModule = window.RentlyHostDashboardBookings;
  const statsModule = window.RentlyHostDashboardStats;
  const statusModule = window.RentlyHostDashboardStatus;
  const visibilityModule = window.RentlyHostDashboardVisibility;

  function shouldInitializeDashboardPage() {
    return /\/property-dashboard\.html$/i.test(window.location.pathname);
  }

  function unwrapCollection(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== "object") {
      return [];
    }

    if (Array.isArray(payload.items)) {
      return payload.items;
    }

    if (Array.isArray(payload.Items)) {
      return payload.Items;
    }

    if (Array.isArray(payload.$values)) {
      return payload.$values;
    }

    return [];
  }

  async function fetchAvailabilityBlocksSafe(accommodationId) {
    try {
      return await api.fetchAvailabilityBlocks(accommodationId);
    } catch (error) {
      console.warn(
        "Availability blocks are unavailable for selected accommodation",
        error,
      );
      return [];
    }
  }

  async function refreshAvailabilitySection(selectedAccommodationId, hostBookings) {
    const blocks = await fetchAvailabilityBlocksSafe(selectedAccommodationId);

    availabilityModule.renderAvailabilityBlocks(blocks, {
      async onDelete(blockId) {
        await api.deleteAvailabilityBlock(blockId, selectedAccommodationId);
        await refreshAvailabilitySection(selectedAccommodationId, hostBookings);
      },
    });

    availabilityModule.initAvailabilityPicker(
      selectedAccommodationId,
      hostBookings,
      blocks,
      {
        async onCreate(payload) {
          await api.createAvailabilityBlock(selectedAccommodationId, payload);
          await refreshAvailabilitySection(selectedAccommodationId, hostBookings);
        },
      },
    );
  }

  async function loadDashboard() {
    if (!api.ensureLoggedIn()) return;

    const accommodations = unwrapCollection(await api.fetchMyAccommodations());
    const accommodationId = api.getAccommodationId();
    let selected = accommodations.find(
      (item) => String(item?.id || item?.Id) === String(accommodationId),
    );

    if (!selected && accommodationId) {
      try {
        selected = await api.fetchAccommodationById(accommodationId);
      } catch (error) {
        console.warn(
          "Selected accommodation could not be loaded directly",
          error,
        );
      }
    }

    if (!selected) {
      selected = accommodations[0] || null;
    }
    if (!selected) {
      api.redirectToHostHome();
      return;
    }

    window.RentlyPageStateStorage?.setSelectedAccommodationId(
      String(selected.id || selected.Id),
    );

    statusModule.renderHero(selected);

    let hostBookings = [];
    try {
      hostBookings = await api.fetchHostBookings(selected.id || selected.Id);
    } catch (error) {
      console.warn(
        "Host bookings are unavailable for selected accommodation",
        error,
      );
      hostBookings = [];
    }

    const listingState = statusModule.getListingState(selected, hostBookings);
    statsModule.renderStats(selected, hostBookings);
    bookingsModule.renderUpcomingBookings(selected.id || selected.Id, hostBookings, {
      async onConfirm(bookingId) {
        await api.confirmBooking(bookingId);
        await loadDashboard();
      },
      async onDecline(bookingId) {
        await api.declineBooking(bookingId);
        await loadDashboard();
      },
    });
    bookingsModule.renderCurrentStay(selected.id || selected.Id, hostBookings);
    bookingsModule.renderBookingHistory(selected.id || selected.Id, hostBookings);
    api.setText("dashboard-property-status-note", listingState.note);

    await refreshAvailabilitySection(selected.id || selected.Id, hostBookings);

    bookingsModule.renderReviews(selected, {
      async onReply(reviewId, reply) {
        await api.saveReviewReply(reviewId, reply);
        await loadDashboard();
      },
    });

    visibilityModule.bindGuestViewButton(selected, listingState);
    visibilityModule.bindVisibilityControls(
      selected,
      listingState,
      loadDashboard,
      hostBookings,
    );
    visibilityModule.bindEditListingButton(selected);
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!shouldInitializeDashboardPage()) {
      return;
    }

    loadDashboard().catch((error) => {
      console.error("Failed to initialize host dashboard", error);
      const empty = document.getElementById("bookings-empty");
      if (empty) {
        empty.textContent = "Failed to load dashboard data.";
        empty.classList.remove("d-none");
      }
    });
  });

  window.RentlyHostDashboardPage = {
    loadDashboard,
  };
})(window);
