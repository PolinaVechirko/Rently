(function createHostDashboardBookings(window) {
  const api = window.RentlyHostDashboardApi;
  const { escapeHtml } = window.RentlyRenderHelpers;

  function formatStayNights(checkIn, checkOut) {
    const oneDay = 24 * 60 * 60 * 1000;
    const nights = Math.max(
      1,
      Math.round((new Date(checkOut) - new Date(checkIn)) / oneDay),
    );
    return `${nights} night${nights === 1 ? "" : "s"}`;
  }

  function formatBookingGuest(booking) {
    const guestId = booking.guestId || "";
    return guestId ? `Guest ${guestId.slice(0, 8)}` : "Guest";
  }

  function getSelectedBookings(selectedAccommodationId, bookings) {
    return (bookings || [])
      .filter(
        (booking) =>
          String(booking.accommodationId) ===
          String(selectedAccommodationId),
      )
      .sort(
        (left, right) =>
          new Date(left.checkInDate) -
          new Date(right.checkInDate),
      );
  }

  function buildBookingsRows(bookings, includeActions) {
    return bookings
      .map((booking) => {
        const checkIn = new Date(booking.checkInDate);
        const status = booking.status || "Pending";
        const normalizedStatus = String(status).toLowerCase();
        const statusClass =
          normalizedStatus === "confirmed"
            ? "bg-success-subtle text-success"
            : normalizedStatus === "cancelled"
              ? "bg-danger-subtle text-danger"
              : "bg-warning-subtle text-warning";
        const actions =
          normalizedStatus === "pending"
            ? `
              <button class="btn btn-sm rounded-pill px-3 text-white host-booking-confirm-btn" style="background-color: #2986FE; border-color: #2986FE;" data-booking-id="${booking.id}">Confirm</button>
              <button class="btn btn-sm btn-outline-dark rounded-pill px-3 host-booking-decline-btn" data-booking-id="${booking.id}">Decline</button>
            `
            : "";
        const actionsCell = includeActions
          ? `
          <td>
            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
              ${actions}
            </div>
          </td>`
          : "";

        return `
        <tr>
          <td>
            <div class="fw-bold">${formatBookingGuest(booking)}</div>
            <div class="text-muted small">${booking.guestId || ""}</div>
          </td>
          <td class="fw-bold">${api.dateFormatter.format(checkIn)}</td>
          <td>${formatStayNights(booking.checkInDate, booking.checkOutDate)}</td>
          <td><span class="badge ${statusClass} px-2 py-1">${status}</span></td>
          ${actionsCell}
        </tr>
      `;
      })
      .join("");
  }

  function bindBookingActionButtons(container, callbacks) {
    if (!container) return;

    container.querySelectorAll(".host-booking-confirm-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const bookingId = button.getAttribute("data-booking-id");
        if (!bookingId) return;

        button.disabled = true;
        try {
          await callbacks.onConfirm(bookingId);
        } catch (error) {
          alert(error.message || "Failed to confirm booking.");
          button.disabled = false;
        }
      });
    });

    container.querySelectorAll(".host-booking-decline-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const bookingId = button.getAttribute("data-booking-id");
        if (!bookingId) return;

        button.disabled = true;
        try {
          await callbacks.onDecline(bookingId);
        } catch (error) {
          alert(error.message || "Failed to decline booking.");
          button.disabled = false;
        }
      });
    });
  }

  function renderUpcomingBookings(selectedAccommodationId, bookings, callbacks) {
    const tableBody = document.getElementById("upcoming-bookings-list");
    const emptyState = document.getElementById("upcoming-bookings-empty");
    if (!tableBody || !emptyState) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = getSelectedBookings(selectedAccommodationId, bookings).filter(
      (booking) => {
        const status = String(booking.status || "").toLowerCase();
        const checkIn = api.parseDateOnlyAsLocal(
          booking.checkInDate,
        );
        const checkOut = api.parseDateOnlyAsLocal(
          booking.checkOutDate,
        );
        if (status === "pending") return true;
        return status === "confirmed" && (
          (checkIn && checkIn >= today) ||
          (checkOut && checkOut >= today)
        );
      },
    );

    if (!upcoming.length) {
      tableBody.innerHTML = "";
      emptyState.classList.remove("d-none");
      return;
    }

    emptyState.classList.add("d-none");
    tableBody.innerHTML = buildBookingsRows(upcoming, true);
    bindBookingActionButtons(tableBody, callbacks);
  }

  function renderBookingHistory(selectedAccommodationId, bookings) {
    const tableBody = document.getElementById("booking-history-list");
    const emptyState = document.getElementById("booking-history-empty");
    if (!tableBody || !emptyState) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const history = getSelectedBookings(selectedAccommodationId, bookings).filter(
      (booking) => {
        const status = String(booking.status || "").toLowerCase();
        const checkOut = api.parseDateOnlyAsLocal(
          booking.checkOutDate,
        );
        return status === "cancelled" || (checkOut && checkOut < today);
      },
    );

    if (!history.length) {
      tableBody.innerHTML = "";
      emptyState.classList.remove("d-none");
      return;
    }

    emptyState.classList.add("d-none");
    tableBody.innerHTML = buildBookingsRows(history, false);
  }

  function renderCurrentStay(selectedAccommodationId, bookings) {
    const emptyState = document.getElementById("current-stay-empty");
    const content = document.getElementById("current-stay-content");
    if (!emptyState || !content) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentStay = getSelectedBookings(selectedAccommodationId, bookings).find(
      (booking) => {
        const status = String(booking.status || "").toLowerCase();
        const checkIn = api.parseDateOnlyAsLocal(
          booking.checkInDate,
        );
        const checkOut = api.parseDateOnlyAsLocal(
          booking.checkOutDate,
        );
        if (status !== "confirmed" || !checkIn || !checkOut) return false;
        return checkIn <= today && checkOut >= today;
      },
    );

    if (!currentStay) {
      content.classList.add("d-none");
      emptyState.classList.remove("d-none");
      return;
    }

    const checkout = api.parseDateOnlyAsLocal(
      currentStay.checkOutDate,
    );
    const checkin = api.parseDateOnlyAsLocal(
      currentStay.checkInDate,
    );

    emptyState.classList.add("d-none");
    content.classList.remove("d-none");
    content.innerHTML = `
      <div class="border rounded-4 p-3 bg-light-subtle">
        <div class="fw-bold mb-1">${formatBookingGuest(currentStay)}</div>
        <div class="text-muted small mb-3">${currentStay.guestId || ""}</div>
        <div class="mb-2"><strong>Status:</strong> Currently rented</div>
        <div class="mb-2"><strong>Check-in:</strong> ${checkin ? api.dateFormatter.format(checkin) : "—"}</div>
        <div class="mb-2"><strong>Check-out:</strong> ${checkout ? api.dateFormatter.format(checkout) : "—"}</div>
        <div><strong>Stay:</strong> ${formatStayNights(
          currentStay.checkInDate,
          currentStay.checkOutDate,
        )}</div>
      </div>
    `;
  }

  function renderReviews(selected, callbacks) {
    const reviewsContainer = document.getElementById("reviews-list");
    const emptyState = document.getElementById("reviews-empty");
    if (!reviewsContainer || !emptyState) return;

    const reviews = Array.isArray(selected.reviews) ? selected.reviews : [];
    if (!reviews.length) {
      reviewsContainer.innerHTML = "";
      emptyState.classList.remove("d-none");
      return;
    }

    emptyState.classList.add("d-none");
    reviewsContainer.innerHTML = reviews
      .map((review, index) => {
        const replyValue = review.hostReply || "";
        const replyDate = review.hostReplyCreatedAt;
        const createdAt = review.createdAt;
        const reviewerName =
          review.reviewerName || "Anonymous";
        const rating = Number(review.rating || 0);
        const commentValue = review.comment || "No comment provided.";
        const replyBox = replyValue
          ? `<div class="host-reply bg-light p-3 rounded-3 mb-3"><div class="fw-bold small mb-1 text-primary">Your Reply${replyDate ? " · " + api.dateFormatter.format(new Date(replyDate)) : ""}</div><p class="small mb-0 text-muted">${escapeHtml(replyValue)}</p></div>`
          : "";

        return `
        <div class="review-item mb-4 pb-4 border-bottom" data-review-id="${review.id}">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="fw-bold mb-0">${escapeHtml(reviewerName)}</h6>
              <span class="text-muted small">${createdAt ? api.dateFormatter.format(new Date(createdAt)) : ""}</span>
            </div>
            <span class="d-inline-flex align-items-center gap-1 fw-bold" style="color: #2986FE;">
              <span>${rating.toFixed(1)}</span>
              <img src="../icons/star.svg" alt="star" style="width: 14px; height: 14px;" />
            </span>
          </div>
          <p class="mb-3">${escapeHtml(commentValue)}</p>
          ${replyBox}
          <button class="btn btn-link btn-sm p-0 text-decoration-none fw-bold review-reply-toggle" type="button">${replyValue ? "Edit Reply" : "Reply"}</button>
          <div class="reply-box mt-3 d-none">
            <textarea class="form-control mb-2 review-reply-text" rows="3" placeholder="Write your reply..." data-review-index="${index}"></textarea>
            <button class="btn btn-primary btn-sm rounded-pill px-3 review-reply-submit" type="button">${replyValue ? "Update Reply" : "Send Reply"}</button>
          </div>
        </div>
      `;
      })
      .join("");

    reviewsContainer.querySelectorAll(".review-reply-text").forEach((textarea) => {
      const reviewIndex = Number(textarea.getAttribute("data-review-index"));
      const review = Number.isInteger(reviewIndex) ? reviews[reviewIndex] : null;
      if (!review) return;

      textarea.value = review.hostReply || "";
    });

    reviewsContainer.querySelectorAll(".review-reply-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const reviewItem = button.closest(".review-item");
        const replyBox = reviewItem?.querySelector(".reply-box");
        if (replyBox) {
          replyBox.classList.toggle("d-none");
          const textarea = replyBox.querySelector(".review-reply-text");
          if (!replyBox.classList.contains("d-none") && textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }
      });
    });

    reviewsContainer.querySelectorAll(".review-reply-submit").forEach((button) => {
      button.addEventListener("click", async () => {
        const reviewItem = button.closest(".review-item");
        if (!reviewItem) return;

        const reviewId = reviewItem.getAttribute("data-review-id");
        const textarea = reviewItem.querySelector(".review-reply-text");
        const reply = textarea ? textarea.value.trim() : "";
        if (!reply) return;

        button.disabled = true;
        try {
          await callbacks.onReply(reviewId, reply);
        } catch (error) {
          alert(error.message || "Failed to save reply");
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  window.RentlyHostDashboardBookings = {
    renderBookingHistory,
    renderCurrentStay,
    renderReviews,
    renderUpcomingBookings,
  };
})(window);
