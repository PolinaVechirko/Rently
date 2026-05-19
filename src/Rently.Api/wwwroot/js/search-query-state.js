(function createSearchQueryState(window) {
  function getSearchParams() {
    return new URLSearchParams(window.location.search);
  }

  function getDelimitedValues(rawValue) {
    return String(rawValue || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function restoreInputValue(params, key, input, fallback = "") {
    if (!input || !params.has(key)) return;
    input.value = params.get(key) || fallback;
  }

  function restoreCheckboxGroup(selector, values) {
    const selected = new Set(Array.isArray(values) ? values : []);
    document.querySelectorAll(selector).forEach((checkbox) => {
      checkbox.checked = selected.has(checkbox.value);
    });
  }

  function buildSearchQuery(state = {}) {
    const params = new URLSearchParams();

    if (state.location) params.set("location", state.location);
    if (state.checkin) params.set("checkin", state.checkin);
    if (state.checkout) params.set("checkout", state.checkout);
    if (state.sort) params.set("sort", state.sort);
    if (state.minPrice) params.set("minPrice", state.minPrice);
    if (state.maxPrice) params.set("maxPrice", state.maxPrice);
    if (Number(state.rooms) > 0) params.set("rooms", state.rooms);
    if (Number(state.beds) > 0) params.set("beds", state.beds);
    if (Number(state.guests) > 0) params.set("guests", state.guests);
    if (Array.isArray(state.amenities) && state.amenities.length > 0) {
      params.set("amenities", state.amenities.join(","));
    }
    if (Array.isArray(state.types) && state.types.length > 0) {
      params.set("types", state.types.join(","));
    }

    params.set("page", "1");
    return params;
  }

  window.RentlySearchQueryState = {
    buildSearchQuery,
    getDelimitedValues,
    getSearchParams,
    restoreCheckboxGroup,
    restoreInputValue,
  };
})(window);
