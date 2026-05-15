(function initRentlyAuthDropdown(root) {
  if (!root) return;

  const authDropdown = root.RentlyAuthDropdown || {};

  authDropdown.bindDropdown = function bindDropdown(userWrapperForDropdown, dropdown) {
    if (!userWrapperForDropdown || !dropdown) return;
    if (dropdown.dataset.rentlyDropdownBound === "true") return;
    dropdown.dataset.rentlyDropdownBound = "true";

    userWrapperForDropdown.style.cursor = "pointer";

    userWrapperForDropdown.addEventListener("click", (e) => {
      if (dropdown.contains(e.target)) {
        return;
      }
      e.stopPropagation();
      dropdown.classList.toggle("show");
    });

    document.addEventListener("click", (e) => {
      if (userWrapperForDropdown.classList.contains("hidden")) return;
      if (
        dropdown.contains(e.target) ||
        userWrapperForDropdown.contains(e.target)
      ) {
        return;
      }
      dropdown.classList.remove("show");
    });

    dropdown.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        root.RentlyAuthProfileReturn?.rememberProfileReturnUrl(
          link.getAttribute("href"),
        );
        dropdown.classList.remove("show");
      });
    });
  };

  authDropdown.bindLogout = function bindLogout(logoutBtn) {
    if (!logoutBtn || logoutBtn.dataset.rentlyLogoutBound === "true") return;
    logoutBtn.dataset.rentlyLogoutBound = "true";

    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (root.RentlyAuthStorage) {
        root.RentlyAuthStorage.clearAuthentication();
      } else {
        root.localStorage.removeItem("isLoggedIn");
        root.localStorage.removeItem("auth_token");
      }

      root.localStorage.removeItem("redirectAfterAuth");

      if (root.RentlyAuthStorage) {
        root.RentlyAuthStorage.clearUserSnapshot();
      }

      root.localStorage.removeItem("selectedAccommodationId");

      const inHostSubfolder = (root.location.pathname || "").includes("/host-mode/");
      const homePath = inHostSubfolder ? "../index.html" : "./index.html";
      root.location.href = homePath;
    });
  };

  root.RentlyAuthDropdown = authDropdown;
})(window);
