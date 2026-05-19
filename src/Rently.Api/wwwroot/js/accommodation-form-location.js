(function createAccommodationFormLocation(window) {
  if (!window) return;

  const locationModule = window.RentlyAccommodationFormLocation || {};

  async function fetchLocationResults(query, definition = {}) {
    const requestQuery = typeof definition.buildQuery === "function"
      ? definition.buildQuery(query)
      : query;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(requestQuery)}&limit=10`,
    );
    return response.json();
  }

  function renderDatalistOptions(datalist, values) {
    if (!datalist) return;

    datalist.innerHTML = values
      .filter((value, index, list) => value && list.indexOf(value) === index)
      .map((value) => `<option value="${value}">`)
      .join("");
  }

  locationModule.initLocationAutocomplete = function initLocationAutocomplete(
    options = {},
  ) {
    const datalist = options.datalist;
    const definitions = Array.isArray(options.definitions)
      ? options.definitions
      : [];
    const minLength = Number(options.minLength || 3);
    const debounceMs = Number(options.debounceMs || 600);
    const state = {};

    definitions.forEach((definition, index) => {
      const input = definition?.input;
      if (!input) return;

      let debounceTimer = null;
      const stateKey = definition.stateKey || `field-${index}`;

      input.addEventListener("input", function handleAutocompleteInput() {
        clearTimeout(debounceTimer);
        const query = this.value.trim();
        if (query.length < minLength) {
          state[stateKey] = [];
          renderDatalistOptions(datalist, []);
          return;
        }

        debounceTimer = window.setTimeout(async () => {
          try {
            const results = await fetchLocationResults(query, definition);
            state[stateKey] = results;
            const values = results
              .map((result) => definition.mapResult(result))
              .filter(Boolean);
            renderDatalistOptions(datalist, values);
          } catch (error) {
            console.error("Autocomplete error:", error);
          }
        }, debounceMs);
      });

      if (typeof definition.onChange === "function") {
        input.addEventListener("change", () => {
          definition.onChange(input.value.trim(), state[stateKey] || []);
        });
      }
    });

    return {
      getResults: (key) => state[key] || [],
    };
  };

  window.RentlyAccommodationFormLocation = locationModule;
})(window);
