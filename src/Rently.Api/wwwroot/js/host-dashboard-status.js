(function createHostDashboardStatus(window) {
  const api = window.RentlyHostDashboardApi;
  const listingHideCalendarHeadingText = "Hide from guests from today until this date";

  function getListingState(selected, bookings = []) {
    const isActive = (selected?.isActive ?? selected?.IsActive ?? false) === true;
    const visibleFromRaw = selected?.visibleFrom ?? selected?.VisibleFrom ?? "";
    const visibleFrom = api.parseDateOnlyAsLocal(visibleFromRaw);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeBooking = (Array.isArray(bookings) ? bookings : []).find((booking) => {
      const status = String(booking.status || booking.Status || "").toLowerCase();
      const checkIn = api.parseDateOnlyAsLocal(
        booking.checkInDate || booking.CheckInDate,
      );
      const checkOut = api.parseDateOnlyAsLocal(
        booking.checkOutDate || booking.CheckOutDate,
      );
      if (status !== "confirmed" || !checkIn || !checkOut) return false;
      return checkIn <= today && checkOut >= today;
    });

    if (!isActive) {
      return {
        key: "hidden",
        note: "This listing is hidden from guests and stored only in your host dashboard.",
        actionLabel: "Make Active",
        nextIsActive: true,
        nextVisibleFrom: null,
        guestViewEnabled: false,
        supportsHideRange: false,
      };
    }

    if (visibleFrom && visibleFrom > today) {
      return {
        key: "upcoming",
        note: `This listing will become visible to guests on ${api.dateFormatter.format(visibleFrom)}.`,
        actionLabel: "Make Active Now",
        nextIsActive: true,
        nextVisibleFrom: null,
        guestViewEnabled: false,
        supportsHideRange: false,
      };
    }

    const rentedUntil = activeBooking
      ? ` It is currently rented until ${api.dateFormatter.format(
          api.parseDateOnlyAsLocal(
            activeBooking.checkOutDate || activeBooking.CheckOutDate,
          ),
        )}.`
      : "";

    return {
      key: "active",
      note: `This listing is active and can appear in guest search results.${rentedUntil}`,
      actionLabel: "Hide Listing",
      nextIsActive: true,
      nextVisibleFrom: null,
      guestViewEnabled: true,
      supportsHideRange: true,
    };
  }

  function getPhotoUrl(photo) {
    if (!photo) return "";
    if (typeof photo === "string") return photo;
    if (typeof photo === "object") {
      return photo.url || photo.Url || "";
    }

    return "";
  }

  function getHeroPhotoUrl(photos) {
    const primaryPhoto = getPhotoUrl(Array.isArray(photos) ? photos[0] : null);
    if (!primaryPhoto) {
      return "../images/hero2.png";
    }

    if (typeof window.getOptimizedImageUrl === "function") {
      return window.getOptimizedImageUrl(primaryPhoto, 900);
    }

    return (
      window.RentlyRenderHelpers?.getOptimizedImageUrl?.(primaryPhoto, 900) ||
      primaryPhoto
    );
  }

  function renderHero(selected) {
    const photos = Array.isArray(selected?.photos)
      ? selected.photos
      : Array.isArray(selected?.Photos)
        ? selected.Photos
        : [];
    const propertyType =
      selected?.propertyType || selected?.PropertyType || "Property";
    const city = selected?.city || selected?.City || "";
    const country = selected?.country || selected?.Country || "";
    const title = selected.title || selected.Title || "Beautiful Property";

    api.setText("dashboard-property-title", title);

    const sublineParts = [];
    if (propertyType) {
      sublineParts.push(propertyType);
    }

    const locationParts = [];
    if (city) locationParts.push(city);
    if (country) locationParts.push(country);
    if (locationParts.length > 0) {
      sublineParts.push(locationParts.join(", "));
    }

    api.setText(
      "dashboard-property-subline",
      sublineParts.join(" · ") || "Property · Location details unknown",
    );

    const heroPhoto = document.getElementById("dashboard-property-photo");
    if (heroPhoto) {
      heroPhoto.src = getHeroPhotoUrl(photos);
    }

    api.setText(
      "dashboard-saved-count",
      String(selected.favoritesCount ?? selected.FavoritesCount ?? 0),
    );
    api.setText(
      "dashboard-property-status-note",
      "Loading current listing status...",
    );
  }

  function ensureListingHideCalendarHeading(calendarContainer) {
    if (!calendarContainer) return;

    let heading = calendarContainer.querySelector(".listing-hide-calendar-heading");
    if (!heading) {
      heading = document.createElement("div");
      heading.className = "listing-hide-calendar-heading";
      calendarContainer.insertBefore(heading, calendarContainer.firstChild || null);
    }

    heading.textContent = listingHideCalendarHeadingText;
  }

  function initListingVisibilityPicker(anchorInput, triggerButton, onDateSelected) {
    if (!anchorInput || !triggerButton || typeof flatpickr !== "function") {
      return null;
    }

    if (anchorInput._flatpickr) {
      anchorInput._flatpickr.destroy();
    }

    return flatpickr(anchorInput, {
      mode: "single",
      dateFormat: "Y-m-d",
      minDate: "today",
      allowInput: false,
      clickOpens: false,
      disableMobile: true,
      positionElement: triggerButton,
      onReady(_selectedDates, _dateStr, instance) {
        ensureListingHideCalendarHeading(instance.calendarContainer);
      },
      onOpen(_selectedDates, _dateStr, instance) {
        ensureListingHideCalendarHeading(instance.calendarContainer);
      },
      onChange(selectedDates, _dateStr, instance) {
        if (selectedDates.length !== 1 || typeof onDateSelected !== "function") {
          return;
        }

        void onDateSelected(selectedDates[0], instance);
      },
    });
  }

  window.RentlyHostDashboardStatus = {
    getListingState,
    initListingVisibilityPicker,
    renderHero,
  };
})(window);
