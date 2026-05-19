(function createHostDashboardStats(window) {
  const api = window.RentlyHostDashboardApi;

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  function computeStats(selected, bookings) {
    const confirmed = (bookings || []).filter(
      (booking) => (booking.status || booking.Status) === "Confirmed",
    );
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);

    const futureConfirmed = confirmed.filter(
      (booking) => new Date(booking.checkInDate || booking.CheckInDate) >= now,
    );

    const alreadyEarned = Number(selected.totalEarnings || 0);
    const pendingEarned = futureConfirmed.reduce((sum, booking) => {
      const checkIn = new Date(booking.checkInDate || booking.CheckInDate);
      const checkOut = new Date(booking.checkOutDate || booking.CheckOutDate);
      const nights = Math.max(
        1,
        Math.round((checkOut - checkIn) / (24 * 60 * 60 * 1000)),
      );
      const price = Number(
        booking.pricePerNight ||
          booking.PricePerNight ||
          selected.pricePerNight ||
          0,
      );
      return sum + nights * price;
    }, 0);

    const occupiedNights = confirmed.reduce((sum, booking) => {
      const checkIn = new Date(booking.checkInDate || booking.CheckInDate);
      const checkOut = new Date(booking.checkOutDate || booking.CheckOutDate);
      if (checkOut < now || checkIn > thirtyDaysLater) return sum;
      const start = checkIn > now ? checkIn : now;
      const end = checkOut < thirtyDaysLater ? checkOut : thirtyDaysLater;
      const nights = Math.max(
        0,
        Math.round((end - start) / (24 * 60 * 60 * 1000)),
      );
      return sum + nights;
    }, 0);

    return {
      alreadyEarned,
      pendingEarned,
      averageRating: Number(selected.averageRating || 0),
      reviewsCount: Number(selected.reviewsCount || 0),
      occupancy: Math.min(100, Math.round((occupiedNights / 30) * 100)),
    };
  }

  function renderStats(selected, bookings) {
    const stats = computeStats(selected, bookings);
    api.setText("earned-value", currencyFormatter.format(stats.alreadyEarned));
    api.setText("pending-value", currencyFormatter.format(stats.pendingEarned));
    api.setText("rating-value", stats.averageRating.toFixed(2));
    api.setText("occupancy-value", `${stats.occupancy}%`);
    api.setText("rating-subtext", `Based on ${stats.reviewsCount} reviews`);
  }

  window.RentlyHostDashboardStats = {
    computeStats,
    renderStats,
  };
})(window);
