(function createAccommodationFormShared(window) {
  if (!window) return;

  const auth = window.RentlyAccommodationFormAuth || {};
  const amenities = window.RentlyAccommodationFormAmenities || {};
  const preview = window.RentlyAccommodationFormPreview || {};
  const photos = window.RentlyAccommodationFormPhotos || {};
  const location = window.RentlyAccommodationFormLocation || {};
  const stepper = window.RentlyAccommodationFormStepper || {};

  window.RentlyAccommodationFormShared = {
    ...auth,
    ...amenities,
    ...preview,
    ...photos,
    ...location,
    ...stepper,
  };
})(window);
