(function createSearchLocationAutocomplete(window) {
  function initSearchLocationAutocomplete(input, datalist) {
    if (!input || !datalist) {
      return;
    }

    let dbLocations = [];
    let debounceTimer = null;

    fetch("/api/Accommodations/locations")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        dbLocations = Array.isArray(data) ? data : [];
      })
      .catch((error) => {
        console.error("Failed to load local locations:", error);
      });

    input.addEventListener("input", function handleAutocompleteInput() {
      clearTimeout(debounceTimer);
      const query = this.value.trim().toLowerCase();
      if (query.length < 2) {
        datalist.innerHTML = "";
        return;
      }

      const localMatches = dbLocations.filter((location) =>
        location.toLowerCase().includes(query),
      );
      const localOptions = localMatches
        .map((location) => `<option value="${location}">`)
        .join("");

      debounceTimer = window.setTimeout(async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=10`,
          );
          const results = await response.json();

          const globalOptions = results
            .map((result) => {
              const address = result.address || {};
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
              return result.display_name;
            })
            .filter((value, index, values) => {
              return value && values.indexOf(value) === index;
            })
            .filter((value) => !localMatches.some((match) => value.includes(match)))
            .map((value) => `<option value="${value}">`)
            .join("");

          datalist.innerHTML = localOptions + globalOptions;
        } catch (error) {
          console.error("Autocomplete error:", error);
          datalist.innerHTML = localOptions;
        }
      }, 600);
    });
  }

  window.RentlySearchLocationAutocomplete = {
    initSearchLocationAutocomplete,
  };
})(window);
