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

  async function loadDashboard() {
    if (!api.ensureLoggedIn()) return;

    const accommodationId = api.getAccommodationId();
    if (!accommodationId) {
      api.setHTML("upcoming-bookings-list", "");
      api.setHTML("booking-history-list", "");
      api.setHTML("reviews-list", "");
      api.setHTML("current-stay-content", "");
      return;
    }

    const accommodations = await api.fetchMyAccommodations();
    let selected = Array.isArray(accommodations)
      ? accommodations.find(
          (item) => String(item.id || item.Id) === String(accommodationId),
        )
      : null;

    if (!selected) {
      selected = Array.isArray(accommodations) ? accommodations[0] : null;
    }
    if (!selected) {
      api.redirectToHostHome();
      return;
    }

    if (
      accommodationId &&
      String(selected.id || selected.Id) !== String(accommodationId)
    ) {
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

    let blocks = [];
    try {
      blocks = await api.fetchAvailabilityBlocks(selected.id || selected.Id);
    } catch (error) {
      console.warn(
        "Availability blocks are unavailable for selected accommodation",
        error,
      );
      blocks = [];
    }

    availabilityModule.renderAvailabilityBlocks(blocks, {
      async onDelete(blockId) {
        await api.deleteAvailabilityBlock(blockId, selected.id || selected.Id);
        await loadDashboard();
      },
    });
    availabilityModule.initAvailabilityPicker(
      selected.id || selected.Id,
      hostBookings,
      blocks,
      {
        async onCreate(payload) {
          await api.createAvailabilityBlock(selected.id || selected.Id, payload);
          await loadDashboard();
        },
      },
    );

    bookingsModule.renderReviews(selected, {
      async onReply(reviewId, reply) {
        await api.saveReviewReply(reviewId, reply);
        await loadDashboard();
      },
    });

    visibilityModule.bindGuestViewButton(selected, listingState);
    visibilityModule.bindVisibilityControls(selected, listingState, loadDashboard);
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
