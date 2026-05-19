(function createSearchAdvancedFilters(window) {
  function initCounterButtons() {
    document.querySelectorAll(".cnt-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const input = document.getElementById(button.getAttribute("data-target"));
        let value = parseInt(input?.value || "0", 10) || 0;
        if (button.classList.contains("plus")) value += 1;
        if (button.classList.contains("minus") && value > 0) value -= 1;
        if (input) input.value = String(value);
      });
    });
  }

  function initAdvancedFiltersToggle() {
    const moreFiltersButton = document.getElementById("more-filters-btn");
    const advancedFilters = document.getElementById("advanced-filters");
    const filtersArrow = document.getElementById("filters-arrow");

    if (!moreFiltersButton || !advancedFilters) {
      return;
    }

    moreFiltersButton.addEventListener("click", () => {
      const isShowing = advancedFilters.classList.toggle("show");
      const text = moreFiltersButton.querySelector("span");
      if (text) {
        text.innerText = isShowing ? "Less Filters" : "More Filters";
      }
      if (filtersArrow) {
        filtersArrow.src = isShowing
          ? "./icons/arrowUp.svg"
          : "./icons/arrowDown.svg";
      }
    });
  }

  function getCheckedValues(selector) {
    return Array.from(document.querySelectorAll(selector))
      .map((checkbox) => String(checkbox.value || "").trim())
      .filter(Boolean);
  }

  window.RentlySearchAdvancedFilters = {
    getCheckedValues,
    initAdvancedFiltersToggle,
    initCounterButtons,
  };
})(window);
