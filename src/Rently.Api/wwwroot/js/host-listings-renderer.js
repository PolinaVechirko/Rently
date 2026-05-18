(function createHostListingsRenderer(window) {
  let isDeleteBindingRegistered = false;
  let deleteConfirmationElements = null;
  const renderHelpers = window.RentlyRenderHelpers || {};

  function parseLocalDate(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function getHostListingState(item) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isActive = item.isActive === true;
    const visibleFrom = parseLocalDate(item.visibleFrom || item.VisibleFrom);
    const isUpcoming = isActive && visibleFrom && visibleFrom > today;

    if (!isActive) return { key: "hidden", label: "Hidden" };
    if (isUpcoming) {
      const dateLabel = visibleFrom.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return { key: "upcoming", label: `Upcoming · ${dateLabel}` };
    }

    return { key: "active", label: "Active" };
  }

  function setLoading(trackId) {
    const element = document.getElementById(trackId);
    if (element) {
      element.innerHTML = `<div style="padding:20px;color:#888">Loading...</div>`;
    }
  }

  function buildCard(item, index, assetBase) {
    const photo = renderHelpers.getCardImageUrl
      ? renderHelpers.getCardImageUrl(item.photos, {
          assetBase,
          fallbackIndex: index,
          width: 600,
        })
      : `${assetBase}images/hero${(index % 4) + 1}.png`;
    const location = renderHelpers.formatLocation
      ? renderHelpers.formatLocation(item)
      : `${item.country || ""}, ${item.city || ""}`;
    const ratingText = renderHelpers.formatRating
      ? renderHelpers.formatRating(item.averageRating, item.reviewsCount)
      : `${item.averageRating?.toFixed(2) || "5.00"}(${item.reviewsCount || 0})`;

    return `
      <div class="accommodation-card type-2 host-clickable-card" style="cursor:pointer;" data-id="${item.id}">
        <div class="acc-img-wrapper">
          <img src="${photo}" class="acc-img" alt="${item.propertyType}">
          <div class="host-card-actions">
            <button class="host-action-btn edit-btn" title="Edit Listing" data-id="${item.id}">
              <span style="font-size: 18px;">✎</span>
            </button>
            <button class="host-action-btn delete-btn" title="Delete Listing" data-id="${item.id}">
              <img src="${assetBase}icons/x.svg" alt="delete">
            </button>
          </div>
        </div>
        <div class="acc-info">
          <div class="acc-header">
            <div class="acc-type-group">
              <div class="acc-type">${item.propertyType}</div>
              <div class="acc-location">
                <img src="${assetBase}icons/locationIcon.svg" class="acc-loc-icon" alt="loc">
                <span class="acc-loc-text">${location}</span>
              </div>
            </div>
            <div class="acc-rating">
              <img src="${assetBase}icons/star.svg" class="star-icon" alt="star">
              <span>${ratingText}</span>
            </div>
          </div>
          <div class="acc-desc">${item.description || ""}</div>
        </div>
      </div>
    `;
  }

  function renderTrack(trackId, items, assetBase) {
    const element = document.getElementById(trackId);
    if (!element) return;

    if (items.length === 0) {
      element.innerHTML = `
        <div class="host-empty-card">
          <div class="host-empty-card-content">
            <span class="host-empty-card-title">No listings in this category yet.</span>
          </div>
        </div>
      `;
      return;
    }

    element.innerHTML = items.map((item, index) => buildCard(item, index, assetBase)).join("");
  }

  function getAuthToken() {
    return localStorage.getItem("auth_token") || "";
  }

  function getLoginPath() {
    return window.location.pathname.includes("/host-mode/")
      ? "../login.html"
      : "./login.html";
  }

  function ensureDeleteConfirmationModal() {
    if (deleteConfirmationElements) {
      return deleteConfirmationElements;
    }

    const overlay = document.createElement("div");
    overlay.className = "host-delete-modal-overlay";
    overlay.innerHTML = `
      <div class="host-delete-modal" role="dialog" aria-modal="true" aria-labelledby="host-delete-modal-title">
        <h3 class="host-delete-modal-title" id="host-delete-modal-title">Delete apartment?</h3>
        <p class="host-delete-modal-text">Are you sure you want to delete this apartment?</p>
        <div class="host-delete-modal-actions">
          <button type="button" class="host-delete-modal-btn host-delete-modal-btn-secondary" data-action="cancel">Cancel</button>
          <button type="button" class="host-delete-modal-btn host-delete-modal-btn-danger" data-action="confirm">Delete</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    deleteConfirmationElements = {
      overlay,
      cancelButton: overlay.querySelector('[data-action="cancel"]'),
      confirmButton: overlay.querySelector('[data-action="confirm"]'),
    };

    return deleteConfirmationElements;
  }

  function showDeleteConfirmation() {
    const modal = ensureDeleteConfirmationModal();

    return new Promise((resolve) => {
      let isResolved = false;

      const finish = (result) => {
        if (isResolved) return;
        isResolved = true;

        modal.overlay.classList.remove("is-visible");
        document.removeEventListener("keydown", handleKeyDown);
        modal.overlay.removeEventListener("click", handleOverlayClick);
        modal.cancelButton.removeEventListener("click", handleCancel);
        modal.confirmButton.removeEventListener("click", handleConfirm);
        resolve(result);
      };

      const handleCancel = () => finish(false);
      const handleConfirm = () => finish(true);
      const handleOverlayClick = (event) => {
        if (event.target === modal.overlay) {
          finish(false);
        }
      };
      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          finish(false);
        }
      };

      modal.overlay.classList.add("is-visible");
      modal.cancelButton.addEventListener("click", handleCancel);
      modal.confirmButton.addEventListener("click", handleConfirm);
      modal.overlay.addEventListener("click", handleOverlayClick);
      document.addEventListener("keydown", handleKeyDown);
      modal.cancelButton.focus();
    });
  }

  function clearDeletedAccommodationSelection(accommodationId) {
    const selectedAccommodationId =
      window.RentlyPageStateStorage?.getSelectedAccommodationId() || "";
    if (String(selectedAccommodationId) === String(accommodationId)) {
      window.RentlyPageStateStorage?.clearSelectedAccommodationId();
    }
  }

  async function deleteListing(accommodationId) {
    const token = getAuthToken();
    const response = await fetch(
      `/api/Accommodations/${encodeURIComponent(accommodationId)}`,
      {
        method: "DELETE",
        headers: token ? { Authorization: "Bearer " + token } : {},
      },
    );

    if (response.status === 401) {
      window.location.href = getLoginPath();
      throw new Error("Unauthorized");
    }

    if (!response.ok && response.status !== 204) {
      const payload = await response.json().catch(() => null);
      const fallback = await response.text().catch(() => "");
      throw new Error(
        payload?.message || fallback || "Failed to delete listing.",
      );
    }
  }

  function bindDeleteActions() {
    if (isDeleteBindingRegistered) return;
    isDeleteBindingRegistered = true;

    document.addEventListener("click", async (event) => {
      const deleteButton = event.target.closest(".delete-btn");
      if (!deleteButton) return;

      event.preventDefault();
      event.stopPropagation();

      const accommodationId =
        deleteButton.getAttribute("data-id") ||
        deleteButton.closest("[data-id]")?.getAttribute("data-id");
      if (!accommodationId) return;

      const shouldDelete = await showDeleteConfirmation();
      if (!shouldDelete) return;

      const originalDisabled = deleteButton.disabled;
      deleteButton.disabled = true;

      try {
        await deleteListing(accommodationId);
        clearDeletedAccommodationSelection(accommodationId);
        await renderHostListings("active-track", "rented-track", "hidden-track");
      } catch (error) {
        alert(error.message || "Failed to delete listing.");
        deleteButton.disabled = originalDisabled;
      }
    });
  }

  async function renderHostListings(activeTrackId, rentedTrackId, hiddenTrackId) {
    const assetBase = renderHelpers.getAssetBase?.() || "./";
    const token = getAuthToken();

    [activeTrackId, rentedTrackId, hiddenTrackId].forEach(setLoading);

    try {
      const response = await fetch("/api/Accommodations/my", {
        headers: { Authorization: "Bearer " + token },
      });

      if (response.status === 401) {
        window.location.href = window.location.pathname.includes("/host-mode/")
          ? "../login.html"
          : "./login.html";
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load listings");
      }

      const all = await response.json();
      const active = all.filter((item) => getHostListingState(item).key === "active");
      const hidden = all.filter((item) => {
        const state = getHostListingState(item);
        return state.key === "hidden" || state.key === "upcoming";
      });

      renderTrack(activeTrackId, active, assetBase);
      renderTrack(rentedTrackId, [], assetBase);
      renderTrack(hiddenTrackId, hidden, assetBase);

      [activeTrackId, rentedTrackId, hiddenTrackId].forEach((id) => {
        const element = document.getElementById(id);
        if (element && typeof initScrollSnapping === "function") {
          initScrollSnapping(element, null);
        }
      });

      bindDeleteActions();
    } catch (error) {
      console.error("Failed to load host listings:", error);
    }
  }

  window.RentlyHostListingsRenderer = {
    renderHostListings,
    getHostListingState,
  };
})(window);
