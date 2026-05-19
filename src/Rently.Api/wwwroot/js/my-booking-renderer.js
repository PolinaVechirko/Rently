(function createMyBookingRenderer(window) {
  const renderHelpers = window.RentlyRenderHelpers || {};

  function buildEmptyState(title, text) {
    return `
      <div class="empty-state-card">
          <div class="empty-state-content">
              <span class="empty-state-title">${title}</span>
              <p class="empty-state-text">${text}</p>
          </div>
      </div>
    `;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "";

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function normalizeBookingStatus(status) {
    const normalized = String(status || "").trim().toLowerCase();

    switch (normalized) {
      case "confirmed":
        return "Confirmed";
      case "cancelled":
      case "canceled":
        return "Cancelled";
      case "completed":
        return "Completed";
      case "pending":
      default:
        return "Pending";
    }
  }

  function renderBookingsGroup(container, bookings, emptyTitle, emptyText, assetBase) {
    if (!Array.isArray(bookings) || bookings.length === 0) {
      container.innerHTML = buildEmptyState(emptyTitle, emptyText);
      return;
    }

    const statusClassMap = {
      Pending: "status-pending",
      Confirmed: "status-confirmed",
      Cancelled: "status-cancelled",
      Completed: "status-completed",
    };

    let html = "";
    bookings.forEach((booking, index) => {
      const accommodationPhotoUrl =
        booking.accommodationPhotoUrl || booking.AccommodationPhotoUrl || "";
      const photo = renderHelpers.getCardImageUrl
        ? renderHelpers.getCardImageUrl(accommodationPhotoUrl, {
            assetBase,
            fallbackIndex: index,
            width: 700,
          })
        : `${assetBase}images/hero${(index % 4) + 1}.png`;
      const place = [booking.accommodationCountry, booking.accommodationCity]
        .filter(Boolean)
        .join(", ");
      const pricePerNight = booking.pricePerNight
        ? Number(booking.pricePerNight).toFixed(2)
        : "0.00";
      const stayNights = Math.max(
        1,
        Math.ceil(
          (new Date(booking.checkOutDate) - new Date(booking.checkInDate)) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const totalPrice = (Number(pricePerNight) * stayNights).toFixed(2);
      const status = normalizeBookingStatus(booking.status || booking.Status);
      const statusClass = statusClassMap[status] || "status-pending";
      const isPending = status === "Pending";
      const cardClass = booking.__section === "history"
        ? "history-card history-card-muted"
        : "history-card";
      const stayHref = renderHelpers.getPropertyHref
        ? renderHelpers.getPropertyHref(booking.accommodationId)
        : `./property.html?id=${booking.accommodationId}`;
      const priceLine = `$${pricePerNight} / night · Total: $${totalPrice}`;
      const actionButton = isPending && booking.__section === "upcoming"
        ? `
          <button class="booking-cancel-btn" data-booking-id="${booking.id}">
              <span>Cancel booking</span>
          </button>
          <a class="add-comment-btn" href="${stayHref}">
              <span>View stay</span>
              <img src="${assetBase}icons/arrowDown.svg" alt="go">
          </a>
        `
        : `
          <a class="add-comment-btn" href="${stayHref}">
              <span>View stay</span>
              <img src="${assetBase}icons/arrowDown.svg" alt="go">
          </a>
        `;

      html += `
        <div class="${cardClass}">
            <div class="history-card-img">
                <img src="${photo}" alt="${booking.accommodationType || "Property"}">
            </div>
            <div class="history-card-info">
                <div class="history-card-top">
                    <h3 class="history-card-name">${booking.accommodationType || "Booked stay"}</h3>
                    <div class="history-card-location">
                        <img src="${assetBase}icons/locationIcon.svg" alt="loc">
                        <span>${place || booking.accommodationTitle || "Unknown location"}</span>
                    </div>
                    <div class="history-dates">
                        <img src="${assetBase}icons/calendar.svg" alt="cal" class="history-cal-icon">
                        <span>${formatDate(booking.checkInDate)} — ${formatDate(booking.checkOutDate)}</span>
                    </div>
                    <div class="history-price">${priceLine}</div>
                    <div class="mt-2"><span class="booking-status ${statusClass}">${status}</span></div>
                </div>
                <div class="history-card-bottom">
                    <div class="history-comment-area">
                        ${actionButton}
                    </div>
                </div>
            </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  async function renderMyBookingPage(activeContainerId, upcomingContainerId, historyContainerId) {
    const activeContainer = document.getElementById(activeContainerId);
    const upcomingContainer = document.getElementById(upcomingContainerId);
    const historyContainer = document.getElementById(historyContainerId);
    if (!activeContainer || !upcomingContainer || !historyContainer) return;

    const loadingState = buildEmptyState("Loading...", "Loading your bookings...");
    activeContainer.innerHTML = loadingState;
    upcomingContainer.innerHTML = loadingState;
    historyContainer.innerHTML = loadingState;

    try {
      const token = localStorage.getItem("auth_token") || "";
      const response = await fetch("/api/Bookings/my-bookings", {
        headers: { Authorization: "Bearer " + token },
      });

      if (response.status === 401) {
        const unauthorizedState = buildEmptyState(
          "Sign In Required",
          "Sign in to see your bookings.",
        );
        activeContainer.innerHTML = unauthorizedState;
        upcomingContainer.innerHTML = unauthorizedState;
        historyContainer.innerHTML = unauthorizedState;
        return;
      }

      if (!response.ok) {
        const errorState = buildEmptyState(
          "An issue occurred",
          "Could not load your bookings.",
        );
        activeContainer.innerHTML = errorState;
        upcomingContainer.innerHTML = errorState;
        historyContainer.innerHTML = errorState;
        return;
      }

      const bookings = await response.json();
      const safeBookings = Array.isArray(bookings) ? bookings : [];
      const now = new Date();
      const assetBase = renderHelpers.getAssetBase?.() || "./";

      const activeBookings = safeBookings.filter((booking) => {
        const status = normalizeBookingStatus(booking.status || booking.Status);
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        if (status !== "Confirmed") return false;
        if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
          return false;
        }
        return checkIn <= now && checkOut >= now;
      });

      const upcomingBookings = safeBookings.filter((booking) => {
        if (activeBookings.includes(booking)) return false;
        const status = normalizeBookingStatus(booking.status || booking.Status);
        const checkIn = new Date(booking.checkInDate);
        if (status === "Pending") return true;
        if (status === "Confirmed") {
          return !Number.isNaN(checkIn.getTime()) && checkIn > now;
        }
        return false;
      });

      const historyBookings = safeBookings.filter((booking) => {
        return !activeBookings.includes(booking) && !upcomingBookings.includes(booking);
      });

      activeBookings.forEach((booking) => {
        booking.__section = "active";
      });
      upcomingBookings.forEach((booking) => {
        booking.__section = "upcoming";
      });
      historyBookings.forEach((booking) => {
        booking.__section = "history";
      });

      renderBookingsGroup(
        activeContainer,
        activeBookings,
        "No active bookings yet.",
        "There are no apartment cards in this section yet.",
        assetBase,
      );
      renderBookingsGroup(
        upcomingContainer,
        upcomingBookings,
        "No upcoming bookings yet.",
        "There are no apartment cards in this section yet.",
        assetBase,
      );
      renderBookingsGroup(
        historyContainer,
        historyBookings,
        "No booking history yet.",
        "There are no apartment cards in this section yet.",
        assetBase,
      );
    } catch (error) {
      console.error("Failed to load booking history:", error);
      const failureState = buildEmptyState(
        "Error",
        "Error loading your bookings.",
      );
      activeContainer.innerHTML = failureState;
      upcomingContainer.innerHTML = failureState;
      historyContainer.innerHTML = failureState;
    }
  }

  window.RentlyMyBookingRenderer = {
    renderMyBookingPage,
  };
})(window);
