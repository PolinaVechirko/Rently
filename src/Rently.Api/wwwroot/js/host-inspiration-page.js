(function initHostInspirationPage() {
  async function boot() {
    const isLoggedIn = window.RentlyAuthStorage?.isLoggedIn?.() || false;

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
