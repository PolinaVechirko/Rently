(function initHostDashboardPage() {
  async function boot() {
    const token = localStorage.getItem("auth_token") || "";
    const isLoggedIn =
      localStorage.getItem("isLoggedIn") === "true" || !!token;

    if (!isLoggedIn) {
      window.location.href = "./login.html";
      return;
    }

    const cachedSummary = JSON.parse(
      localStorage.getItem("rently_host_summary") || "{}",
    );

    const formatMoney = (value) => {
      const amount = Number(value || 0);
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `$${Math.round(amount)}`;
      }
    };

    const applySummary = (summary) => {
      if (!summary) return;

      const nameEl = document.getElementById("dashboard-host-name");
      const emailEl = document.getElementById("dashboard-host-email");
      const phoneEl = document.getElementById("dashboard-host-phone");
      const ratingEl = document.getElementById("dashboard-host-rating");
      const earningsEl = document.getElementById("dashboard-host-earnings");
      const responseEl = document.getElementById("dashboard-host-response");
      const reviewsEl = document.getElementById("dashboard-host-reviews");

      if (nameEl) {
        nameEl.textContent = summary.hostName || nameEl.textContent || "Host";
      }
      if (emailEl) {
        emailEl.textContent = summary.email || emailEl.textContent || "—";
      }
      if (phoneEl) {
        phoneEl.textContent = summary.phoneNumber || phoneEl.textContent || "—";
      }

      if (ratingEl) {
        const rating = Number(summary.averageRating || 0);
        ratingEl.textContent = rating > 0 ? `${rating.toFixed(1)}★` : "—";
      }
      if (earningsEl) {
        earningsEl.textContent = formatMoney(summary.earnings);
      }
      if (responseEl) {
        const response = Number(summary.responseRate || 0);
        responseEl.textContent = `${Math.round(response)}%`;
      }
      if (reviewsEl) {
        reviewsEl.textContent = String(summary.reviewsCount || 0);
      }

      localStorage.setItem("rently_host_summary", JSON.stringify(summary));
    };

    if (cachedSummary) {
      applySummary(cachedSummary);
    }

    const loadHostSummary = async () => {
      const authToken = localStorage.getItem("auth_token");
      if (!authToken) return;

      try {
        const resp = await fetch("/api/Analytics/host-summary", {
          headers: { Authorization: "Bearer " + authToken },
        });
        if (resp.ok) {
          const summary = await resp.json();
          applySummary(summary);
        }
      } catch (e) {
        console.error("Failed to load host summary:", e);
      }
    };

    const renderHostSections = async () => {
      const tasks = [];
      if (typeof renderHostListings === "function") {
        tasks.push(
          renderHostListings("active-track", "rented-track", "hidden-track"),
        );
      }

      const inspirationContainer = document.querySelector(
        "#inspiration .horizontal-scroll-container",
      );
      if (typeof renderAccommodations === "function") {
        tasks.push(
          renderAccommodations("inspiration-track", true, false, false, false, 16),
        );
      }

      await Promise.allSettled(tasks);

      if (inspirationContainer && typeof initScrollSnapping === "function") {
        initScrollSnapping(inspirationContainer, ".horizontal-scroll-track");
      }
    };

    document.querySelectorAll("[data-nav-href]").forEach((element) => {
      element.addEventListener("click", () => {
        const href = element.getAttribute("data-nav-href");
        if (href) {
          window.location.href = href;
        }
      });
    });

    await renderHostSections();
    await loadHostSummary();

    if (typeof stabilizeHashScroll === "function") {
      stabilizeHashScroll();
    }

    const avatarInput = document.getElementById("host-photo-input");
    if (avatarInput) {
      avatarInput.addEventListener("change", async (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          if (typeof setAllAvatars === "function") {
            setAllAvatars(dataUrl);
          }
          localStorage.setItem("rently_host_avatar", dataUrl);
          localStorage.setItem("rently_header_avatar_thumb", dataUrl);
        };
        reader.readAsDataURL(file);
      });
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
