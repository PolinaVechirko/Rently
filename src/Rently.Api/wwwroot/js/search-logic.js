/**
 * Search page specific logic
 */

function initSearchPage() {
    const resultsContainer = document.getElementById("search-results-container");
    if (resultsContainer && typeof renderSearchResultsRows === 'function') {
        renderSearchResultsRows("search-results-container", 8, 6);
    }

    const moreFiltersBtn = document.getElementById("more-filters-btn");
    const advFilters = document.getElementById("advanced-filters");
    const filtersArrow = document.getElementById("filters-arrow");

    if (moreFiltersBtn && advFilters) {
        moreFiltersBtn.addEventListener("click", () => {
            const isShowing = advFilters.classList.toggle("show");
            const span = moreFiltersBtn.querySelector("span");
            span.innerText = isShowing ? "Less Filters" : "More Filters";
            filtersArrow.src = isShowing ? "./icons/arrowUp.svg" : "./icons/arrowDown.svg";
        });
    }

    document.querySelectorAll(".cnt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.getAttribute("data-target"));
            let val = parseInt(input.value);
            if (btn.classList.contains("plus")) val++;
            else if (btn.classList.contains("minus") && val > 0) val--;
            input.value = val;
        });
    });

    document.querySelectorAll(".price-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.getAttribute("data-target"));
            let val = parseInt(input.value) || 0;
            if (btn.classList.contains("up")) val += 100;
            else if (btn.classList.contains("down")) val = Math.max(0, val - 100);
            input.value = val;
            validatePriceRange();
        });
    });

    const minPriceInput = document.getElementById("min-price");
    const maxPriceInput = document.getElementById("max-price");
    if (minPriceInput && maxPriceInput) {
        minPriceInput.addEventListener("change", validatePriceRange);
        maxPriceInput.addEventListener("change", validatePriceRange);
    }

    function validatePriceRange() {
        const minVal = parseInt(minPriceInput.value) || 0;
        const maxVal = parseInt(maxPriceInput.value) || 0;
        if (minVal < 0) minPriceInput.value = 0;
        if (maxVal < 0) maxPriceInput.value = 0;
        maxPriceInput.style.borderColor = minVal > maxVal ? "red" : "#ddd";
    }

    if (typeof flatpickr !== "undefined" && document.getElementById("search-checkin")) {
        const config = {
            dateFormat: "d.m.Y", minDate: "today", allowInput: true, locale: { firstDayOfWeek: 1 },
            onChange: function (d, str) {
                if (this.element.id === "search-checkin") {
                    const out = document.querySelector("#search-checkout")._flatpickr;
                    if (out) out.set("minDate", str);
                }
            }
        };
        flatpickr("#search-checkin", config);
        flatpickr("#search-checkout", config);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.has("location")) document.getElementById("search-loc").value = params.get("location");
    if (params.has("checkin") && document.getElementById("search-checkin")._flatpickr) {
        document.getElementById("search-checkin")._flatpickr.setDate(params.get("checkin"));
    }
    if (params.has("checkout") && document.getElementById("search-checkout")._flatpickr) {
        document.getElementById("search-checkout")._flatpickr.setDate(params.get("checkout"));
    }
    if (params.has("sort")) {
        let sortVal = params.get("sort") || "";
        const norm = sortVal.toLowerCase().replace(/\+/g, " ").trim();
        if (norm === "top rated") sortVal = "highest_rated";
        else if (norm === "popularity" || norm === "most visited") sortVal = "most_visited";

        const sortSelect = document.getElementById("search-sort");
        if (sortSelect) {
            sortSelect.value = sortVal;
        }
    }

    // Restore property type selections (types CSV)
    if (params.has("types")) {
        const selected = new Set(params.get("types").split(",").map(x => x.trim()).filter(Boolean));
        document.querySelectorAll(".property-types-grid input[type='checkbox']").forEach(cb => {
            cb.checked = selected.has(cb.value);
        });
    }

    // Restore amenities selections (amenities CSV)
    const rawAmenities = params.get("amenities") || params.get("amenity") || "";
    if (rawAmenities) {
        const selected = new Set(rawAmenities.split(",").map(x => x.trim()).filter(Boolean));
        document.querySelectorAll(".amenities-check-grid input[type='checkbox']").forEach(cb => {
            cb.checked = selected.has(cb.value);
        });
    }

    const searchApplyBtn = document.getElementById("search-apply-btn");
    if (searchApplyBtn) {
        searchApplyBtn.addEventListener("click", () => {
            const loc = document.getElementById("search-loc").value;
            const checkinPicker = document.getElementById("search-checkin")._flatpickr;
            const checkoutPicker = document.getElementById("search-checkout")._flatpickr;
            const cin = checkinPicker && checkinPicker.selectedDates && checkinPicker.selectedDates[0]
                ? checkinPicker.formatDate(checkinPicker.selectedDates[0], "Y-m-d")
                : "";
            const cout = checkoutPicker && checkoutPicker.selectedDates && checkoutPicker.selectedDates[0]
                ? checkoutPicker.formatDate(checkoutPicker.selectedDates[0], "Y-m-d")
                : "";
            const sort = document.getElementById("search-sort").value;
            const minP = document.getElementById("min-price").value;
            const maxP = document.getElementById("max-price").value;
            const rooms = document.getElementById("cnt-bedrooms").value;
            const beds = document.getElementById("cnt-beds").value;
            const guests = document.getElementById("search-guests").value;

            const selectedTypes = [];
            document.querySelectorAll(".property-types-grid input:checked").forEach(cb => {
                selectedTypes.push(cb.value.trim());
            });

            const selectedAmenities = [];
            document.querySelectorAll(".amenities-check-grid input:checked").forEach(cb => {
                selectedAmenities.push(cb.value.trim());
            });

            const newParams = new URLSearchParams();
            if (loc) newParams.set("location", loc);
            if (cin) newParams.set("checkin", cin);
            if (cout) newParams.set("checkout", cout);
            if (sort) newParams.set("sort", sort);
            if (minP) newParams.set("minPrice", minP);
            if (maxP) newParams.set("maxPrice", maxP);
            if (rooms > 0) newParams.set("rooms", rooms);
            if (beds > 0) newParams.set("beds", beds);
            if (guests > 0) newParams.set("guests", guests);
            if (selectedAmenities.length > 0) newParams.set("amenities", selectedAmenities.join(","));
            if (selectedTypes.length > 0) newParams.set("types", selectedTypes.join(","));

            newParams.set("page", "1"); // Reset to page 1 on new search

            window.location.search = newParams.toString();
        });
    }

    // --- ADDRESS AUTOCOMPLETE (DB + Nominatim) ---
    const locInput = document.getElementById("search-loc");
    const datalist = document.getElementById("search-loc-suggestions");

    if (locInput) {
        let dbLocations = [];
        fetch("/api/Accommodations/locations")
            .then(r => r.ok ? r.json() : [])
            .then(data => { dbLocations = data; })
            .catch(e => console.error("Failed to load local locations:", e));

        let debounceTimer;
        locInput.addEventListener("input", function () {
            clearTimeout(debounceTimer);
            const query = this.value.trim().toLowerCase();
            if (!datalist) return;

            if (query.length < 2) {
                datalist.innerHTML = "";
                return;
            }

            const localMatches = dbLocations.filter(loc => loc.toLowerCase().includes(query));
            let optionsHtml = localMatches.map(loc => `<option value="${loc}">`).join('');

            debounceTimer = setTimeout(async () => {
                try {
                    const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&accept-language=en&q=${encodeURIComponent(query)}&limit=10`);
                    const results = await resp.json();

                    const globalOptions = results
                        .map(r => {
                            const addr = r.address;
                            const city = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || "";
                            const country = addr.country || "";
                            if (city && country) return `${city}, ${country}`;
                            if (country) return country;
                            return r.display_name;
                        })
                        .filter((val, index, self) => val && self.indexOf(val) === index)
                        .filter(formatted => !localMatches.some(lm => formatted.includes(lm)))
                        .map(formatted => `<option value="${formatted}">`)
                        .join('');

                    datalist.innerHTML = optionsHtml + globalOptions;
                } catch (e) {
                    console.error("Autocomplete error:", e);
                    datalist.innerHTML = optionsHtml;
                }
            }, 600);
        });
    }
}
