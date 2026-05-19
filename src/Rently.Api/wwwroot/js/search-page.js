(function createSearchPage(window) {
  let hasInitializedSearchPage = false;

  function shouldInitializeSearchPage() {
    return /\/search\.html$/i.test(window.location.pathname);
  }

  function initSearchPage() {
    if (hasInitializedSearchPage) {
      return;
    }

    if (!shouldInitializeSearchPage()) {
      return;
    }

    const advancedFilters = window.RentlySearchAdvancedFilters || null;
    const dateRange = window.RentlySearchDateRange || null;
    const locationAutocomplete = window.RentlySearchLocationAutocomplete || null;
    const priceFilters = window.RentlySearchPriceFilters || null;
    const queryState = window.RentlySearchQueryState || null;
    const params =
      queryState?.getSearchParams?.() ||
      new URLSearchParams(window.location.search);
    const pageElements = {
      resultsContainer: document.getElementById("search-results-container"),
      locationInput: document.getElementById("search-loc"),
      checkinInput: document.getElementById("search-checkin"),
      checkoutInput: document.getElementById("search-checkout"),
      sortSelect: document.getElementById("search-sort"),
      minPriceInput: document.getElementById("min-price"),
      maxPriceInput: document.getElementById("max-price"),
      roomsInput: document.getElementById("cnt-bedrooms"),
      bedsInput: document.getElementById("cnt-beds"),
      guestsInput: document.getElementById("search-guests"),
      locationSuggestions: document.getElementById("search-loc-suggestions"),
      searchApplyButton: document.getElementById("search-apply-btn"),
    };
    const {
      resultsContainer,
      locationInput,
      checkinInput,
      checkoutInput,
      sortSelect,
      minPriceInput,
      maxPriceInput,
      roomsInput,
      bedsInput,
      guestsInput,
      locationSuggestions,
      searchApplyButton,
    } = pageElements;
    if (resultsContainer && window.RentlySearchResultsRenderer) {
      window.RentlySearchResultsRenderer.renderSearchResultsRows(
        "search-results-container",
        8,
        6,
      );
    }

    if (!locationInput || !checkinInput || !checkoutInput || !sortSelect) {
      hasInitializedSearchPage = true;
      return;
    }

    advancedFilters?.initAdvancedFiltersToggle?.();
    advancedFilters?.initCounterButtons?.();
    priceFilters?.initSearchPriceFilters?.({
      minPriceInput,
      maxPriceInput,
    });

    const dateController = dateRange?.initSearchDateRange?.({
      checkinInput,
      checkoutInput,
      params,
    }) || {
      getSelectedDates() {
        return { checkin: null, checkout: null };
      },
    };

    queryState?.restoreInputValue?.(params, "location", locationInput);
    queryState?.restoreInputValue?.(params, "minPrice", minPriceInput, "0");
    queryState?.restoreInputValue?.(params, "maxPrice", maxPriceInput, "1000");
    queryState?.restoreInputValue?.(params, "rooms", roomsInput, "0");
    queryState?.restoreInputValue?.(params, "beds", bedsInput, "0");
    queryState?.restoreInputValue?.(params, "guests", guestsInput, "1");

    if (params.has("sort")) {
      let sortValue = params.get("sort") || "";
      const normalized = sortValue.toLowerCase().replace(/\+/g, " ").trim();
      if (normalized === "top rated") sortValue = "highest_rated";
      if (normalized === "popularity" || normalized === "most visited") {
        sortValue = "most_visited";
      }
      sortSelect.value = sortValue;
    }

    queryState?.restoreCheckboxGroup?.(
      ".property-types-grid input[type='checkbox']",
      queryState?.getDelimitedValues?.(params.get("types")) || [],
    );
    queryState?.restoreCheckboxGroup?.(
      ".amenities-check-grid input[type='checkbox']",
      queryState?.getDelimitedValues?.(
        params.get("amenities") || params.get("amenity"),
      ) || [],
    );

    locationAutocomplete?.initSearchLocationAutocomplete?.(
      locationInput,
      locationSuggestions,
    );

    searchApplyButton?.addEventListener("click", (event) => {
      event.preventDefault();

      const selectedDates = dateController.getSelectedDates();
      if (
        selectedDates.checkin &&
        selectedDates.checkout &&
        selectedDates.checkout <= selectedDates.checkin
      ) {
        alert("Check-out date must be at least one night after check-in.");
        return;
      }

      const nextParams =
        queryState?.buildSearchQuery?.({
          location: locationInput.value,
          checkin: dateRange?.formatDateForQuery?.(selectedDates.checkin) || "",
          checkout:
            dateRange?.formatDateForQuery?.(selectedDates.checkout) || "",
          sort: sortSelect.value,
          minPrice: minPriceInput?.value,
          maxPrice: maxPriceInput?.value,
          rooms: roomsInput?.value,
          beds: bedsInput?.value,
          guests: guestsInput?.value,
          amenities:
            advancedFilters?.getCheckedValues?.(
              ".amenities-check-grid input:checked",
            ) || [],
          types:
            advancedFilters?.getCheckedValues?.(
              ".property-types-grid input:checked",
            ) || [],
        }) ||
        new URLSearchParams(window.location.search);

      window.location.search = nextParams.toString();
    });

    hasInitializedSearchPage = true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    try {
      initSearchPage();
    } catch (error) {
      console.error("Failed to initialize search page", error);
    }
  });

  window.RentlySearchPage = {
    initSearchPage,
  };
})(window);
