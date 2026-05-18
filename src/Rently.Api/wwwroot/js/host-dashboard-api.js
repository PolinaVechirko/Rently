(function createHostDashboardApi(window) {
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function getToken() {
    return window.RentlyAuthStorage?.getAuthToken() || "";
  }

  function redirectToLogin() {
    window.RentlyAuthStorage?.setRedirectAfterAuth(
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

  function getAccommodationId() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("id");
    const fromStorage =
      window.RentlyPageStateStorage?.getSelectedAccommodationId() || "";
    return fromUrl || fromStorage || "";
  }

  function parseSelectedDates(rangeValue) {
    if (!rangeValue) return null;

    const parts = String(rangeValue)
      .split(" to ")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length !== 2) return null;

    const start = new Date(parts[0]);
    const end = new Date(parts[1]);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    return { start, end };
  }

  function formatDateOnlyForApi(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function addDays(date, days) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const result = new Date(date);
    result.setDate(result.getDate() + Number(days || 0));
    return result;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function setHTML(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = value;
    }
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

    if (response.status === 204) {
      return null;
    }

    return response.json().catch(() => null);
  }

  function buildVisibilityDto(selected, nextIsActive, nextVisibleFrom) {
    return {
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
  }

  async function fetchMyAccommodations() {
    return fetchJson("/api/Accommodations/my");
  }

  async function fetchHostBookings(accommodationId) {
    return fetchJson(
      `/api/Bookings/host-bookings?accommodationId=${encodeURIComponent(accommodationId)}`,
    );
  }

  async function fetchAvailabilityBlocks(accommodationId) {
    return fetchJson(
      `/api/AvailabilityBlocks?accommodationId=${encodeURIComponent(accommodationId)}`,
    );
  }

  async function updateListingVisibility(selected, nextIsActive, nextVisibleFrom) {
    const accommodationId = selected?.id || selected?.Id;
    if (!accommodationId) return;

    await fetchJson(`/api/Accommodations/${encodeURIComponent(accommodationId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildVisibilityDto(selected, nextIsActive, nextVisibleFrom),
      ),
    });
  }

  async function confirmBooking(bookingId) {
    return fetchJson(`/api/Bookings/${encodeURIComponent(bookingId)}/confirm`, {
      method: "PUT",
    });
  }

  async function declineBooking(bookingId) {
    return fetchJson(`/api/Bookings/${encodeURIComponent(bookingId)}/decline`, {
      method: "PUT",
    });
  }

  async function saveReviewReply(reviewId, reply) {
    return fetchJson(`/api/Reviews/${encodeURIComponent(reviewId)}/reply`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    });
  }

  async function createAvailabilityBlock(accommodationId, payload) {
    return fetchJson(
      `/api/AvailabilityBlocks?accommodationId=${encodeURIComponent(accommodationId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  }

  async function deleteAvailabilityBlock(blockId, accommodationId) {
    return fetchJson(
      `/api/AvailabilityBlocks/${encodeURIComponent(blockId)}?accommodationId=${encodeURIComponent(accommodationId)}`,
      { method: "DELETE" },
    );
  }

  window.RentlyHostDashboardApi = {
    addDays,
    dateFormatter,
    deleteAvailabilityBlock,
    ensureLoggedIn,
    fetchAvailabilityBlocks,
    fetchHostBookings,
    fetchJson,
    fetchMyAccommodations,
    formatDateOnlyForApi,
    getAccommodationId,
    parseDateOnlyAsLocal,
    parseSelectedDates,
    redirectToHostHome,
    redirectToLogin,
    saveReviewReply,
    setHTML,
    setText,
    updateListingVisibility,
    confirmBooking,
    declineBooking,
    createAvailabilityBlock,
  };
})(window);
