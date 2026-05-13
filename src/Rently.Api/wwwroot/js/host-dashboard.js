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
      const fallback = await response.text().catch(() => "");
      throw new Error(fallback || `Request failed: ${response.status}`);
    }
    return response.json();
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
  }

  function renderStats(selected, bookings) {
    const stats = computeStats(selected, bookings);
    setText("earned-value", currencyFormatter.format(stats.alreadyEarned));
    setText("pending-value", currencyFormatter.format(stats.pendingEarned));
    setText("rating-value", stats.averageRating.toFixed(2));
    setText("occupancy-value", `${stats.occupancy}%`);
    setText("rating-subtext", `Based on ${stats.reviewsCount} reviews`);
  }

  function renderBookings(selectedAccommodationId, bookings) {
    const tableBody = document.getElementById("bookings-list");
    const emptyState = document.getElementById("bookings-empty");
    if (!tableBody || !emptyState) return;

    const selectedBookings = (bookings || [])
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

    if (!selectedBookings.length) {
      tableBody.innerHTML = "";
      emptyState.classList.remove("d-none");
      return;
    }

    emptyState.classList.add("d-none");
    tableBody.innerHTML = selectedBookings
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
        return `
        <tr>
          <td>
            <div class="fw-bold">${formatBookingGuest(booking)}</div>
            <div class="text-muted small">${booking.guestId || booking.GuestId || ""}</div>
          </td>
          <td class="fw-bold">${dateFormatter.format(checkIn)}</td>
          <td>${formatStayNights(booking.checkInDate || booking.CheckInDate, booking.checkOutDate || booking.CheckOutDate)}</td>
          <td><span class="badge ${statusClass} px-2 py-1">${status}</span></td>
          <td>
            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
              ${actions}
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    tableBody.querySelectorAll(".host-booking-confirm-btn").forEach((button) => {
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

    tableBody.querySelectorAll(".host-booking-decline-btn").forEach((button) => {
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
        const stars =
          "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, Math.max(0, 5 - rating));
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
            <span class="text-warning">${stars}</span>
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
        const start = block.startDate || block.StartDate;
        const end = block.endDate || block.EndDate;
        const note = block.note || block.Note || "";
        return `<div class="d-flex justify-content-between align-items-center py-2 border-top"><div><strong>${dateFormatter.format(new Date(start))}</strong> to <strong>${dateFormatter.format(new Date(end))}</strong>${note ? `<div class="text-muted small">${note}</div>` : ""}</div></div>`;
      })
      .join("");
  }

  async function loadDashboard() {
    if (!ensureLoggedIn()) return;

    const accommodationId = getAccommodationId();
    if (!accommodationId) {
      setHTML("bookings-list", "");
      setHTML("reviews-list", "");
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
    renderStats(selected, hostBookings);
    renderBookings(selected.id || selected.Id, hostBookings);

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
    initAvailabilityPicker(selected.id || selected.Id);

    const hostName = selected.hostName || selected.HostName || "";
    renderReviews(selected, hostName);

    const guestButton = document.getElementById("guest-view-btn");
    if (guestButton) {
      guestButton.onclick = () => {
        window.location.href = `../adding-accommodation.html?id=${selected.id || selected.Id}&viewer=guest`;
      };
    }

    const editButton = document.getElementById("edit-listing-btn");
    if (editButton) {
      editButton.onclick = () => {
        window.location.href = `../adding-accommodation.html?id=${selected.id || selected.Id}`;
      };
    }
  }

  function initAvailabilityPicker(selectedAccommodationId) {
    const input = document.getElementById("availability-range");
    const button = document.getElementById("availability-block-btn");
    const noteInput = document.getElementById("availability-note");
    if (!input || !button || typeof flatpickr !== "function") return;

    const picker = flatpickr(input, {
      mode: "range",
      dateFormat: "Y-m-d",
      minDate: "today",
      allowInput: true,
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
              startDate: parsed.start.toISOString(),
              endDate: parsed.end.toISOString(),
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
