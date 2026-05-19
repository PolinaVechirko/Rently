(function createSearchLocationAutocomplete(window) {
  const escapeHtml =
    window.RentlyRenderHelpers?.escapeHtml ||
    function fallbackEscapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    };

  function normalizeLocationLabel(result) {
    const address = result?.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.suburb ||
      "";
    const country = address.country || "";
    if (city && country) return `${city}, ${country}`;
    if (country) return country;
    return result?.display_name || "";
  }

  function buildOptionsHtml(values) {
    return values
      .map((value) => `<option value="${escapeHtml(value)}">`)
      .join("");
  }

  function getAutocompleteState(input) {
    if (!input.__rentlyLocationAutocompleteState) {
      input.__rentlyLocationAutocompleteState = {
        bound: false,
        dbLocations: [],
        debounceTimer: null,
      };
    }

    return input.__rentlyLocationAutocompleteState;
  }

  function initLocationAutocomplete(input, datalist, options = {}) {
    if (!input || !datalist) {
      return;
    }

    const state = getAutocompleteState(input);
    if (state.bound) {
      return;
    }

    state.bound = true;
    const minQueryLength = Number(options.minQueryLength || 2);
    const debounceMs = Number(options.debounceMs || 300);

    fetch("/api/Accommodations/locations")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        state.dbLocations = Array.isArray(data) ? data : [];
      })
      .catch((error) => {
        console.error("Failed to load local locations:", error);
      });

    input.addEventListener("input", function handleAutocompleteInput() {
      clearTimeout(state.debounceTimer);
      const query = this.value.trim().toLowerCase();
      if (query.length < minQueryLength) {
        datalist.innerHTML = "";
        return;
      }

      const localMatches = state.dbLocations.filter((location) =>
        String(location).toLowerCase().includes(query),
      );
      const localOptions = buildOptionsHtml(localMatches);

      state.debounceTimer = window.setTimeout(async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=10`,
          );
          const results = await response.json();

          const globalOptions = results
            .map(normalizeLocationLabel)
            .filter((value, index, values) => {
              return value && values.indexOf(value) === index;
            })
            .filter((value) => !localMatches.some((match) => value.includes(match)))
            .map(String);

          datalist.innerHTML = localOptions + buildOptionsHtml(globalOptions);
        } catch (error) {
          console.error("Autocomplete error:", error);
          datalist.innerHTML = localOptions;
        }
      }, debounceMs);
    });
  }

  function initSearchLocationAutocomplete(input, datalist) {
    initLocationAutocomplete(input, datalist);
  }

  window.RentlySearchLocationAutocomplete = {
    initLocationAutocomplete,
    initSearchLocationAutocomplete,
  };
})(window);
