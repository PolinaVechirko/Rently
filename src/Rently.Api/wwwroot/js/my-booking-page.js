(function initMyBookingBootstrap() {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof renderMyBookingPage === "function") {
      renderMyBookingPage(
        "active-bookings-list",
        "upcoming-bookings-list",
        "booking-history-list",
      );
    }
  });
})();
