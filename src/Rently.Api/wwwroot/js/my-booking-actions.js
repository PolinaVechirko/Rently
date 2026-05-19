(function createMyBookingActions(window) {
  let hasBoundCancelHandler = false;

  async function handleCancelBooking(cancelBtn) {
    const bookingId = cancelBtn?.getAttribute("data-booking-id");
    if (!bookingId) return;

    const originalDisabled = cancelBtn.disabled;

    try {
      cancelBtn.disabled = true;
      const token = window.RentlyAuthStorage?.getAuthToken() || "";
      const response = await fetch(
        `/api/Bookings/${encodeURIComponent(bookingId)}/cancel`,
        {
          method: "PUT",
          headers: token
            ? {
                Authorization: "Bearer " + token,
              }
            : {},
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const fallback = await response.text().catch(() => "");
        throw new Error(
          payload?.message || fallback || "Failed to cancel booking.",
        );
      }

      if (window.RentlyMyBookingRenderer?.renderMyBookingPage) {
        await window.RentlyMyBookingRenderer.renderMyBookingPage(
          "active-bookings-list",
          "upcoming-bookings-list",
          "booking-history-list",
        );
        return;
      }

      window.location.reload();
    } catch (error) {
      alert(error.message || "Failed to cancel booking.");
      cancelBtn.disabled = originalDisabled;
    }
  }

  function initMyBookingPage() {
    if (hasBoundCancelHandler || !document.querySelector(".my-booking-main")) {
      return;
    }

    hasBoundCancelHandler = true;

    document.addEventListener("click", async (event) => {
      const cancelBtn = event.target.closest(".booking-cancel-btn");
      if (!cancelBtn) return;
      if (!cancelBtn.closest(".my-booking-main")) return;

      await handleCancelBooking(cancelBtn);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMyBookingPage();
  });

  window.RentlyMyBookingActions = {
    initMyBookingPage,
  };
})(window);
