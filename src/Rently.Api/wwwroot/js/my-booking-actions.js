(function createMyBookingActions(window) {
  function initMyBookingPage() {
    const pageRoot = document.querySelector(".my-booking-main");
    if (!pageRoot) return;

    pageRoot.addEventListener("click", async (event) => {
      const cancelBtn = event.target.closest(".booking-cancel-btn");
      if (!cancelBtn) return;

      const bookingId = cancelBtn.getAttribute("data-booking-id");
      if (!bookingId) return;

      try {
        cancelBtn.disabled = true;
        const token = window.RentlyAuthStorage?.getAuthToken() || "";
        const response = await fetch(`/api/Bookings/${encodeURIComponent(bookingId)}/cancel`, {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + token,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Failed to cancel booking.");
        }

        if (window.RentlyMyBookingRenderer) {
          await window.RentlyMyBookingRenderer.renderMyBookingPage(
            "active-bookings-list",
            "upcoming-bookings-list",
            "booking-history-list",
          );
        }
      } catch (error) {
        alert(error.message || "Failed to cancel booking.");
        cancelBtn.disabled = false;
      }
    });
  }

  window.RentlyMyBookingActions = {
    initMyBookingPage,
  };
})(window);
