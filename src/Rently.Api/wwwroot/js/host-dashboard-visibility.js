(function createHostDashboardVisibility(window) {
  const api = window.RentlyHostDashboardApi;
  const statusModule = window.RentlyHostDashboardStatus;

  function bindGuestViewButton(selected, listingState) {
    const guestButton = document.getElementById("guest-view-btn");
    if (!guestButton) return;

    guestButton.disabled = !listingState.guestViewEnabled;
    guestButton.onclick = () => {
      if (!listingState.guestViewEnabled) return;
      window.location.href = `../property.html?id=${selected.id || selected.Id}`;
    };
  }

  function bindEditListingButton(selected) {
    const editButton = document.getElementById("edit-listing-btn");
    if (!editButton) return;

    editButton.onclick = () => {
      window.location.href = `../adding-accommodation.html?id=${selected.id || selected.Id}`;
    };
  }

  function hasConfirmedBookingDuringHiddenPeriod(bookings, hiddenUntilDate) {
    if (!(hiddenUntilDate instanceof Date) || Number.isNaN(hiddenUntilDate.getTime())) {
      return false;
    }

    const hiddenStart = new Date();
    hiddenStart.setHours(0, 0, 0, 0);

    const hiddenEnd = new Date(hiddenUntilDate);
    hiddenEnd.setHours(0, 0, 0, 0);

    return (Array.isArray(bookings) ? bookings : []).some((booking) => {
      const status = String(booking.status || booking.Status || "").toLowerCase();
      if (status !== "confirmed") {
        return false;
      }

      const checkIn = api.parseDateOnlyAsLocal(
        booking.checkInDate || booking.CheckInDate,
      );
      const checkOut = api.parseDateOnlyAsLocal(
        booking.checkOutDate || booking.CheckOutDate,
      );
      if (!checkIn || !checkOut) {
        return false;
      }

      return checkIn <= hiddenEnd && checkOut >= hiddenStart;
    });
  }

  function bindVisibilityControls(selected, listingState, reloadDashboard, hostBookings = []) {
    const visibilityButton = document.getElementById("listing-visibility-btn");
    const hideUntilInput = document.getElementById("listing-hide-until");

    const visibilityPicker = statusModule.initListingVisibilityPicker(
      hideUntilInput,
      visibilityButton,
      async (hiddenUntilDate, pickerInstance) => {
        if (!visibilityButton || visibilityButton.disabled) {
          return;
        }

        if (
          hasConfirmedBookingDuringHiddenPeriod(hostBookings, hiddenUntilDate)
        ) {
          alert(
            "You cannot hide this listing for a period that overlaps with a confirmed booking.",
          );
          pickerInstance.clear();
          return;
        }

        const visibleAgainOn = api.addDays(hiddenUntilDate, 1);
        if (!visibleAgainOn) {
          pickerInstance.clear();
          return;
        }

        hideUntilInput.value = "";
        visibilityButton.disabled = true;

        try {
          await api.updateListingVisibility(
            selected,
            true,
            api.formatDateOnlyForApi(visibleAgainOn),
          );
          pickerInstance.close();
          await reloadDashboard();
        } catch (error) {
          alert(error.message || "Failed to hide listing.");
          visibilityButton.disabled = false;
          pickerInstance.clear();
        }
      },
    );

    if (!visibilityButton) return;

    visibilityButton.disabled = false;
    visibilityButton.textContent = listingState.actionLabel;
    visibilityButton.onclick = async () => {
      if (listingState.supportsHideRange) {
        if (visibilityPicker) {
          visibilityPicker.clear();
          visibilityPicker.open();
        }
        return;
      }

      visibilityButton.disabled = true;
      try {
        await api.updateListingVisibility(
          selected,
          listingState.nextIsActive,
          listingState.nextVisibleFrom,
        );
        await reloadDashboard();
      } catch (error) {
        alert(error.message || "Failed to update listing visibility.");
        visibilityButton.disabled = false;
      }
    };
  }

  window.RentlyHostDashboardVisibility = {
    bindEditListingButton,
    bindGuestViewButton,
    bindVisibilityControls,
  };
})(window);
