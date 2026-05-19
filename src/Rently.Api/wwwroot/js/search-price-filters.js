(function createSearchPriceFilters(window) {
  function initSearchPriceFilters(options = {}) {
    const minPriceInput = options.minPriceInput;
    const maxPriceInput = options.maxPriceInput;

    function validatePriceRange() {
      const minValue = parseInt(minPriceInput?.value || "0", 10) || 0;
      const maxValue = parseInt(maxPriceInput?.value || "0", 10) || 0;

      if (minPriceInput && minValue < 0) {
        minPriceInput.value = "0";
      }
      if (maxPriceInput && maxValue < 0) {
        maxPriceInput.value = "0";
      }
      if (maxPriceInput) {
        maxPriceInput.style.borderColor = minValue > maxValue ? "red" : "#ddd";
      }
    }

    document.querySelectorAll(".price-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.getAttribute("data-target"));
        let value = parseInt(input?.value || "0", 10) || 0;
        if (button.classList.contains("up")) value += 100;
        if (button.classList.contains("down")) value = Math.max(0, value - 100);
        if (input) input.value = String(value);
        validatePriceRange();
      });
    });

    minPriceInput?.addEventListener("change", validatePriceRange);
    maxPriceInput?.addEventListener("change", validatePriceRange);

    validatePriceRange();

    return {
      validatePriceRange,
    };
  }

  window.RentlySearchPriceFilters = {
    initSearchPriceFilters,
  };
})(window);
