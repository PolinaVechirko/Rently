(function initHostInspirationPage() {
  async function boot() {
    const token = localStorage.getItem("auth_token") || "";
    const isLoggedIn =
      localStorage.getItem("isLoggedIn") === "true" || !!token;

    if (!isLoggedIn) {
      window.location.href = "../login.html";
      return;
    }

    if (window.rentlyAuthInitPromise) {
      await window.rentlyAuthInitPromise;
    }

    if (typeof initInspirationMode === "function") {
      initInspirationMode();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void boot();
    });
  } else {
    void boot();
  }
})();
