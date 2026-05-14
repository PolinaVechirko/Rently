(function () {
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function getToken() {
    return localStorage.getItem("auth_token") || "";
  }

  function redirectToLogin() {
    localStorage.setItem(
      "redirectAfterAuth",
      window.location.pathname + window.location.search,
    );
    window.location.href = "../login.html";
  }

  function redirectToHostHome() {
    window.location.href = "../host-mode.html";
  }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: "Bearer " + token } : {};
  }

  function ensureLoggedIn() {
    if (!getToken()) {
      redirectToLogin();
      return false;
    }
    return true;
  }

  function parseSelectedDates(rangeValue) {
    if (!rangeValue) return null;
    const parts = rangeValue
      .split(" to ")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length !== 2) return null;
    const start = new Date(parts[0]);
    const end = new Date(parts[1]);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return null;
    return { start, end };
  }

  function formatDateOnlyForApi(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(date, days) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const result = new Date(date);
    result.setDate(result.getDate() + Number(days || 0));
    return result;
  }

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

  function buildAvailabilityDisabledRanges(bookings, blocks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingRanges = (Array.isArray(bookings) ? bookings : [])
      .filter((booking) => (booking.status || booking.Status) === "Confirmed")
      .map((booking) => {
        const from = parseDateOnlyAsLocal(
          booking.checkInDate || booking.CheckInDate,
        );
        const to = parseDateOnlyAsLocal(
          booking.checkOutDate || booking.CheckOutDate,
        );
        if (!from || !to) return null;
        if (to < today) return null;
        return { from, to };
      })
      .filter(Boolean);

    const blockRanges = (Array.isArray(blocks) ? blocks : [])
      .map((block) => {
        const from = parseDateOnlyAsLocal(block.startDate || block.StartDate);
        const to = parseDateOnlyAsLocal(block.endDate || block.EndDate);
        if (!from || !to) return null;
        if (to < today) return null;
        return { from, to };
      })
      .filter(Boolean);

    return [...bookingRanges, ...blockRanges];
  }

  function formatStayNights(checkIn, checkOut) {
    const oneDay = 24 * 60 * 60 * 1000;
    const nights = Math.max(
      1,
      Math.round((new Date(checkOut) - new Date(checkIn)) / oneDay),
    );
    return `${nights} night${nights === 1 ? "" : "s"}`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHTML(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function propertyTypeToEnumValue(type) {
    const propertyTypeMap = {
      Apartment: 0,
      House: 1,
      Room: 2,
      Studio: 3,
      Condo: 4,
      Townhouse: 5,
      Guesthouse: 6,
      Villa: 7,
      Cottage: 8,
      Bungalow: 9,
      Cabin: 10,
      Chalet: 11,
      Hotel: 12,
      Hostel: 13,
      Motel: 14,
      Resort: 15,
      Homestay: 16,
      Aparthotel: 17,
      "Farm Stay": 18,
      "Eco-house": 19,
      "Tiny House": 20,
      "Beach House": 21,
      "Lake House": 22,
      "Waterfront Apartment": 23,
      Houseboat: 24,
    };
    return propertyTypeMap[String(type || "").trim()] ?? propertyTypeMap.Apartment;
  }

  function getListingState(selected, bookings = []) {
    const isActive = (selected?.isActive ?? selected?.IsActive ?? false) === true;
    const visibleFromRaw = selected?.visibleFrom ?? selected?.VisibleFrom ?? "";
    const visibleFrom = parseDateOnlyAsLocal(visibleFromRaw);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeBooking = (Array.isArray(bookings) ? bookings : []).find((booking) => {
      const status = String(booking.status || booking.Status || "").toLowerCase();
      const checkIn = parseDateOnlyAsLocal(
        booking.checkInDate || booking.CheckInDate,
      );
      const checkOut = parseDateOnlyAsLocal(
        booking.checkOutDate || booking.CheckOutDate,
      );
      if (status !== "confirmed" || !checkIn || !checkOut) return false;
      return checkIn <= today && checkOut >= today;
    });

    if (!isActive) {
      return {
        key: "hidden",
        note: "This listing is hidden from guests and stored only in your host dashboard.",
        actionLabel: "Make Active",
        nextIsActive: true,
        nextVisibleFrom: null,
        guestViewEnabled: false,
        supportsHideRange: false,
      };
    }

    if (visibleFrom && visibleFrom > today) {
      return {
        key: "upcoming",
        note: `This listing will become visible to guests on ${dateFormatter.format(visibleFrom)}.`,
        actionLabel: "Make Active Now",
        nextIsActive: true,
        nextVisibleFrom: null,
        guestViewEnabled: false,
        supportsHideRange: false,
      };
    }

    const rentedUntil = activeBooking
      ? ` It is currently rented until ${dateFormatter.format(
          parseDateOnlyAsLocal(
            activeBooking.checkOutDate || activeBooking.CheckOutDate,
          ),
        )}.`
      : "";

    return {
      key: "active",
      note: `This listing is active and can appear in guest search results.${rentedUntil}`,
      actionLabel: "Hide Listing",
      nextIsActive: true,
      nextVisibleFrom: null,
      guestViewEnabled: true,
      supportsHideRange: true,
    };
  }

  function formatBookingGuest(booking) {
    const guestId = booking.guestId || booking.GuestId || "";
    return guestId ? `Guest ${guestId.slice(0, 8)}` : "Guest";
  }

  function getAccommodationId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("id");
    const fromStorage = localStorage.getItem("selectedAccommodationId");
    return fromUrl || fromStorage || "";
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...authHeaders(),
      },
    });
    if (response.status === 401) {
      redirectToLogin();
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const fallback = await response.text().catch(() => "");
      throw new Error(
        payload?.message || fallback || `Request failed: ${response.status}`,
      );
    }
    if (response.status === 204) return null;
    return response.json().catch(() => null);
  }

  function computeStats(selected, bookings) {
    const confirmed = (bookings || []).filter(
      (booking) => (booking.status || booking.Status) === "Confirmed",
    );
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);

    const pastConfirmed = confirmed.filter(
      (booking) => new Date(booking.checkInDate || booking.CheckInDate) < now,
    );
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

    const occupancy = Math.min(100, Math.round((occupiedNights / 30) * 100));

    const averageRating = Number(selected.averageRating || 0);
    const reviewsCount = Number(selected.reviewsCount || 0);

    return {
      alreadyEarned,
      pendingEarned,
      averageRating,
      reviewsCount,
      occupancy,
      likes: Number(selected.favoritesCount || 0),
    };
  }

  function renderHero(selected) {
    const photo =
      selected.photos && selected.photos.length > 0
        ? getOptimizedImageUrl(selected.photos[0], 900)
        : "../images/hero2.png";
    const descriptionFallback = (
      selected.description ||
      selected.Description ||
      ""
    ).trim();
    const title = selected.title || selected.Title || "Beautiful Property";
    const pieces = [];
    if (selected.city) pieces.push(selected.city);
    if (selected.country) pieces.push(selected.country);
    if (selected.propertyType) pieces.push(selected.propertyType);
    if (selected.roomsCount || selected.bedsCount) {
      const roomText = `${selected.roomsCount || 0} rooms`;
      const bedText = `${selected.bedsCount || 0} beds`;
      pieces.push(`${roomText} · ${bedText}`);
    }
    setText("dashboard-property-title", title);

    // Format subline as "Type · City, Country"
    const sublineParts = [];
    if (selected.propertyType) sublineParts.push(selected.propertyType);

    const locationParts = [];
    if (selected.city) locationParts.push(selected.city);
    if (selected.country) locationParts.push(selected.country);
    if (locationParts.length > 0) sublineParts.push(locationParts.join(", "));

    setText(
      "dashboard-property-subline",
      sublineParts.join(" · ") || "Property · Location details unknown"
    );
    const heroPhoto = document.getElementById("dashboard-property-photo");
    if (heroPhoto) heroPhoto.src = photo;
    setText(
      "dashboard-saved-count",
      String(selected.favoritesCount ?? selected.FavoritesCount ?? 0),
    );
    setText(
      "dashboard-property-status-note",
      "Loading current listing status...",
    );
  }

  async function updateListingVisibility(selected, nextIsActive, nextVisibleFrom) {
    const accommodationId = selected?.id || selected?.Id;
    if (!accommodationId) return;

    const dto = {
      propertyType: propertyTypeToEnumValue(
        selected.propertyType || selected.PropertyType,
      ),
      pricePerNight: Number(selected.pricePerNight || selected.PricePerNight || 0),
      roomsCount: selected.roomsCount ?? selected.RoomsCount ?? null,
      bedsCount: selected.bedsCount ?? selected.BedsCount ?? null,
      description: selected.description || selected.Description || "",
      title: selected.title || selected.Title || "",
      country: selected.country || selected.Country || "",
      city: selected.city || selected.City || "",
      street: selected.street || selected.Street || "",
      isActive: nextIsActive,
      visibleFrom: nextVisibleFrom,
    };

    await fetchJson(`/api/Accommodations/${encodeURIComponent(accommodationId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
  }

  function initVisibilityControls() {
    const panel = document.getElementById("listing-visibility-panel");
    const input = document.getElementById("listing-hide-until");
    const cancelButton = document.getElementById("listing-hide-cancel-btn");

    if (input && typeof flatpickr === "function") {
      if (input._flatpickr) {
        input._flatpickr.destroy();
      }

      flatpickr(input, {
        dateFormat: "Y-m-d",
        minDate: "today",
        allowInput: true,
        disableMobile: true,
      });
    }

    if (cancelButton && panel) {
      cancelButton.onclick = () => {
        panel.classList.add("d-none");
      };
    }
  }

  function renderStats(selected, bookings) {
    const stats = computeStats(selected, bookings);
    setText("earned-value", currencyFormatter.format(stats.alreadyEarned));
    setText("pending-value", currencyFormatter.format(stats.pendingEarned));
    setText("rating-value", stats.averageRating.toFixed(2));
    setText("occupancy-value", `${stats.occupancy}%`);
    setText("rating-subtext", `Based on ${stats.reviewsCount} reviews`);
  }

  function getSelectedBookings(selectedAccommodationId, bookings) {
    return (bookings || [])
      .filter(
        (booking) =>
          String(booking.accommodationId || booking.AccommodationId) ===
          String(selectedAccommodationId),
      )
      .sort(
        (left, right) =>
          new Date(left.checkInDate || left.CheckInDate) -
          new Date(right.checkInDate || right.CheckInDate),
      );
  }

  function buildBookingsRows(bookings, includeActions) {
    return bookings
      .map((booking) => {
        const checkIn = new Date(booking.checkInDate || booking.CheckInDate);
        const status = booking.status || booking.Status || "Pending";
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
              <button class="btn btn-sm rounded-pill px-3 text-white host-booking-confirm-btn" style="background-color: #2986FE; border-color: #2986FE;" data-booking-id="${booking.id || booking.Id}">Confirm</button>
              <button class="btn btn-sm btn-outline-dark rounded-pill px-3 host-booking-decline-btn" data-booking-id="${booking.id || booking.Id}">Decline</button>
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
            <div class="text-muted small">${booking.guestId || booking.GuestId || ""}</div>
          </td>
          <td class="fw-bold">${dateFormatter.format(checkIn)}</td>
          <td>${formatStayNights(booking.checkInDate || booking.CheckInDate, booking.checkOutDate || booking.CheckOutDate)}</td>
          <td><span class="badge ${statusClass} px-2 py-1">${status}</span></td>
          ${actionsCell}
        </tr>
      `;
      })
      .join("");
  }

  function bindBookingActionButtons(container, reload) {
    if (!container) return;

    container.querySelectorAll(".host-booking-confirm-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const bookingId = button.getAttribute("data-booking-id");
        if (!bookingId) return;

        button.disabled = true;
        try {
          await fetchJson(`/api/Bookings/${encodeURIComponent(bookingId)}/confirm`, {
            method: "PUT",
          });
          await loadDashboard();
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
          await fetchJson(`/api/Bookings/${encodeURIComponent(bookingId)}/decline`, {
            method: "PUT",
          });
          await loadDashboard();
        } catch (error) {
          alert(error.message || "Failed to decline booking.");
          button.disabled = false;
        }
      });
    });
  }

  function renderUpcomingBookings(selectedAccommodationId, bookings) {
    const tableBody = document.getElementById("upcoming-bookings-list");
    const emptyState = document.getElementById("upcoming-bookings-empty");
    if (!tableBody || !emptyState) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = getSelectedBookings(selectedAccommodationId, bookings).filter(
      (booking) => {
        const status = String(booking.status || booking.Status || "").toLowerCase();
        const checkIn = parseDateOnlyAsLocal(
          booking.checkInDate || booking.CheckInDate,
        );
        const checkOut = parseDateOnlyAsLocal(
          booking.checkOutDate || booking.CheckOutDate,
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
    bindBookingActionButtons(tableBody, loadDashboard);
  }

  function renderBookingHistory(selectedAccommodationId, bookings) {
    const tableBody = document.getElementById("booking-history-list");
    const emptyState = document.getElementById("booking-history-empty");
    if (!tableBody || !emptyState) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const history = getSelectedBookings(selectedAccommodationId, bookings).filter(
      (booking) => {
        const status = String(booking.status || booking.Status || "").toLowerCase();
        const checkOut = parseDateOnlyAsLocal(
          booking.checkOutDate || booking.CheckOutDate,
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
        const status = String(booking.status || booking.Status || "").toLowerCase();
        const checkIn = parseDateOnlyAsLocal(
          booking.checkInDate || booking.CheckInDate,
        );
        const checkOut = parseDateOnlyAsLocal(
          booking.checkOutDate || booking.CheckOutDate,
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

    emptyState.classList.add("d-none");
    content.classList.remove("d-none");
    const checkout = parseDateOnlyAsLocal(
      currentStay.checkOutDate || currentStay.CheckOutDate,
    );
    const checkin = parseDateOnlyAsLocal(
      currentStay.checkInDate || currentStay.CheckInDate,
    );
    content.innerHTML = `
      <div class="border rounded-4 p-3 bg-light-subtle">
        <div class="fw-bold mb-1">${formatBookingGuest(currentStay)}</div>
        <div class="text-muted small mb-3">${currentStay.guestId || currentStay.GuestId || ""}</div>
        <div class="mb-2"><strong>Status:</strong> Currently rented</div>
        <div class="mb-2"><strong>Check-in:</strong> ${checkin ? dateFormatter.format(checkin) : "—"}</div>
        <div class="mb-2"><strong>Check-out:</strong> ${checkout ? dateFormatter.format(checkout) : "—"}</div>
        <div><strong>Stay:</strong> ${formatStayNights(
          currentStay.checkInDate || currentStay.CheckInDate,
          currentStay.checkOutDate || currentStay.CheckOutDate,
        )}</div>
      </div>
    `;
  }

  function renderReviews(selected, currentHostName) {
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
      .map((review) => {
        const replyValue = review.hostReply || review.HostReply || "";
        const replyDate =
          review.hostReplyCreatedAt || review.HostReplyCreatedAt;
        const createdAt = review.createdAt || review.CreatedAt;
        const reviewerName =
          review.reviewerName || review.ReviewerName || "Anonymous";
        const rating = Number(review.rating || review.Rating || 0);
        const replyBox = replyValue
          ? `<div class="host-reply bg-light p-3 rounded-3 mb-3"><div class="fw-bold small mb-1 text-primary">Your Reply${replyDate ? " · " + dateFormatter.format(new Date(replyDate)) : ""}</div><p class="small mb-0 text-muted">${replyValue}</p></div>`
          : "";
        return `
        <div class="review-item mb-4 pb-4 border-bottom" data-review-id="${review.id || review.Id}">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="fw-bold mb-0">${reviewerName}</h6>
              <span class="text-muted small">${createdAt ? dateFormatter.format(new Date(createdAt)) : ""}</span>
            </div>
            <span class="d-inline-flex align-items-center gap-1 fw-bold" style="color: #2986FE;">
              <span>${rating.toFixed(1)}</span>
              <img src="../icons/star.svg" alt="star" style="width: 14px; height: 14px;" />
            </span>
          </div>
          <p class="mb-3">${review.comment || review.Comment || "No comment provided."}</p>
          ${replyBox}
          <button class="btn btn-link btn-sm p-0 text-decoration-none fw-bold review-reply-toggle" type="button">${replyValue ? "Edit Reply" : "Reply"}</button>
          <div class="reply-box mt-3 d-none">
            <textarea class="form-control mb-2 review-reply-text" rows="3" placeholder="Write your reply...">${replyValue}</textarea>
            <button class="btn btn-primary btn-sm rounded-pill px-3 review-reply-submit" type="button">${replyValue ? "Update Reply" : "Send Reply"}</button>
          </div>
        </div>
      `;
      })
      .join("");

    reviewsContainer
      .querySelectorAll(".review-reply-toggle")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const reviewItem = button.closest(".review-item");
          const replyBox = reviewItem && reviewItem.querySelector(".reply-box");
          if (replyBox) replyBox.classList.toggle("d-none");
        });
      });

    reviewsContainer
      .querySelectorAll(".review-reply-submit")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const reviewItem = button.closest(".review-item");
          if (!reviewItem) return;
          const reviewId = reviewItem.getAttribute("data-review-id");
          const textarea = reviewItem.querySelector(".review-reply-text");
          const reply = textarea ? textarea.value.trim() : "";
          if (!reply) return;
          button.disabled = true;
          try {
            await fetchJson(`/api/Reviews/${reviewId}/reply`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reply }),
            });
            await loadDashboard();
          } catch (error) {
            alert(error.message || "Failed to save reply");
          } finally {
            button.disabled = false;
          }
        });
      });
  }

  function renderAvailabilityBlocks(blocks) {
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
        const startDate = parseDateOnlyAsLocal(start);
        const endDate = parseDateOnlyAsLocal(end);
        const formattedStart = startDate ? dateFormatter.format(startDate) : start;
        const formattedEnd = endDate ? dateFormatter.format(endDate) : end;
        return `<div class="d-flex justify-content-between align-items-center py-2 border-top gap-3"><div><strong>${formattedStart}</strong> to <strong>${formattedEnd}</strong>${note ? `<div class="text-muted small">${note}</div>` : ""}</div><button class="btn btn-link p-0 text-decoration-none text-danger availability-block-delete-btn d-inline-flex align-items-center justify-content-center" type="button" data-block-id="${blockId}" aria-label="Remove blocked dates" style="width: 32px; height: 32px; font-size: 28px; line-height: 1;">×</button></div>`;
      })
      .join("");

    container
      .querySelectorAll(".availability-block-delete-btn")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const blockId = button.getAttribute("data-block-id");
          const accommodationId = getAccommodationId();
          if (!blockId || !accommodationId) return;

          button.disabled = true;
          try {
            await fetchJson(
              `/api/AvailabilityBlocks/${encodeURIComponent(blockId)}?accommodationId=${encodeURIComponent(accommodationId)}`,
              { method: "DELETE" },
            );
            await loadDashboard();
          } catch (error) {
            alert(error.message || "Failed to remove blocked dates.");
            button.disabled = false;
          }
        });
      });
  }

  async function loadDashboard() {
    if (!ensureLoggedIn()) return;

    const accommodationId = getAccommodationId();
    if (!accommodationId) {
      setHTML("upcoming-bookings-list", "");
      setHTML("booking-history-list", "");
      setHTML("reviews-list", "");
      setHTML("current-stay-content", "");
      return;
    }

    const accommodations = await fetchJson("/api/Accommodations/my");
    let selected = null;

    if (accommodationId) {
      selected = accommodations.find(
        (item) => String(item.id || item.Id) === String(accommodationId),
      );
      if (!selected) {
        redirectToHostHome();
        return;
      }
    }

    if (!selected) {
      selected = accommodations[0];
    }
    if (!selected) {
      redirectToHostHome();
      return;
    }

    localStorage.setItem(
      "selectedAccommodationId",
      String(selected.id || selected.Id),
    );

    renderHero(selected);

    let hostBookings = [];
    try {
      hostBookings = await fetchJson(
        `/api/Bookings/host-bookings?accommodationId=${encodeURIComponent(selected.id || selected.Id)}`,
      );
    } catch (error) {
      console.warn("Host bookings are unavailable for selected accommodation", error);
      hostBookings = [];
    }
    const listingState = getListingState(selected, hostBookings);
    renderStats(selected, hostBookings);
    renderUpcomingBookings(selected.id || selected.Id, hostBookings);
    renderCurrentStay(selected.id || selected.Id, hostBookings);
    renderBookingHistory(selected.id || selected.Id, hostBookings);
    setText("dashboard-property-status-note", listingState.note);

    let blocks = [];
    try {
      blocks = await fetchJson(
        `/api/AvailabilityBlocks?accommodationId=${encodeURIComponent(selected.id || selected.Id)}`,
      );
    } catch (error) {
      console.warn("Availability blocks are unavailable for selected accommodation", error);
      blocks = [];
    }
    renderAvailabilityBlocks(blocks);
    initAvailabilityPicker(selected.id || selected.Id, hostBookings, blocks);

    const hostName = selected.hostName || selected.HostName || "";
    renderReviews(selected, hostName);

    const guestButton = document.getElementById("guest-view-btn");
    if (guestButton) {
      guestButton.disabled = !listingState.guestViewEnabled;
      guestButton.onclick = () => {
        if (!listingState.guestViewEnabled) return;
        window.location.href = `../property.html?id=${selected.id || selected.Id}`;
      };
    }

    const visibilityButton = document.getElementById("listing-visibility-btn");
    const visibilityPanel = document.getElementById("listing-visibility-panel");
    const hideUntilInput = document.getElementById("listing-hide-until");
    const hideApplyButton = document.getElementById("listing-hide-apply-btn");
    const hideCancelButton = document.getElementById("listing-hide-cancel-btn");

    if (visibilityPanel) {
      visibilityPanel.classList.add("d-none");
    }

    if (visibilityButton) {
      visibilityButton.textContent = listingState.actionLabel;
      visibilityButton.onclick = async () => {
        if (listingState.supportsHideRange) {
          if (visibilityPanel) {
            visibilityPanel.classList.remove("d-none");
          }
          if (hideUntilInput) {
            hideUntilInput.value = "";
            hideUntilInput.focus();
          }
          return;
        }

        visibilityButton.disabled = true;
        try {
          await updateListingVisibility(
            selected,
            listingState.nextIsActive,
            listingState.nextVisibleFrom,
          );
          await loadDashboard();
        } catch (error) {
          alert(error.message || "Failed to update listing visibility.");
          visibilityButton.disabled = false;
        }
      };
    }

    if (hideApplyButton) {
      hideApplyButton.onclick = async () => {
        const hideUntil = parseDateOnlyAsLocal(hideUntilInput?.value || "");
        if (!hideUntil) {
          alert("Please select the date until which the listing should stay hidden.");
          return;
        }

        const visibleAgainOn = addDays(hideUntil, 1);
        hideApplyButton.disabled = true;
        if (visibilityButton) {
          visibilityButton.disabled = true;
        }

        try {
          await updateListingVisibility(
            selected,
            true,
            formatDateOnlyForApi(visibleAgainOn),
          );
          if (visibilityPanel) {
            visibilityPanel.classList.add("d-none");
          }
          await loadDashboard();
        } catch (error) {
          alert(error.message || "Failed to hide listing.");
          hideApplyButton.disabled = false;
          if (visibilityButton) {
            visibilityButton.disabled = false;
          }
        }
      };
    }

    if (hideCancelButton && visibilityPanel) {
      hideCancelButton.onclick = () => {
        visibilityPanel.classList.add("d-none");
      };
    }

    const editButton = document.getElementById("edit-listing-btn");
    if (editButton) {
      editButton.onclick = () => {
        window.location.href = `../adding-accommodation.html?id=${selected.id || selected.Id}`;
      };
    }
  }

  function initAvailabilityPicker(selectedAccommodationId, hostBookings, blocks) {
    const input = document.getElementById("availability-range");
    const button = document.getElementById("availability-block-btn");
    const noteInput = document.getElementById("availability-note");
    if (!input || !button || typeof flatpickr !== "function") return;

    if (input._flatpickr) {
      input._flatpickr.destroy();
    }

    const disabledRanges = buildAvailabilityDisabledRanges(hostBookings, blocks);

    const picker = flatpickr(input, {
      mode: "range",
      dateFormat: "Y-m-d",
      minDate: "today",
      allowInput: true,
      disable: disabledRanges,
    });

    button.onclick = async () => {
      const parsed = parseSelectedDates(input.value);
      if (!parsed) {
        alert("Select a valid date range first.");
        return;
      }
      button.disabled = true;
      try {
        await fetchJson(
          `/api/AvailabilityBlocks?accommodationId=${encodeURIComponent(selectedAccommodationId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              startDate: formatDateOnlyForApi(parsed.start),
              endDate: formatDateOnlyForApi(parsed.end),
              note: noteInput ? noteInput.value.trim() : "",
            }),
          },
        );
        picker.clear();
        if (noteInput) noteInput.value = "";
        await loadDashboard();
      } catch (error) {
        alert(error.message || "Failed to block availability.");
      } finally {
        button.disabled = false;
      }
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    initVisibilityControls();
    loadDashboard().catch((error) => {
      console.error("Failed to initialize host dashboard", error);
      const empty = document.getElementById("bookings-empty");
      if (empty) {
        empty.textContent = "Failed to load dashboard data.";
        empty.classList.remove("d-none");
      }
    });
  });
})();
