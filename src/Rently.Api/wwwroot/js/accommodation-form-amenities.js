(function createAccommodationFormAmenities(window) {
  if (!window) return;

  const amenitiesModule = window.RentlyAccommodationFormAmenities || {};

  const amenitiesCatalog = [
    "Wi-Fi — интернет",
    "TV — телевизор",
    "Kitchen — кухня (важно для длительного жилья)",
    "Air Conditioning — кондиционер",
    "Heating — отопление",
    "Dedicated Workspace — рабочее место",
    "Washer — стиральная машина",
    "Free Parking — бесплатная парковка",
    "Gym — спортзал",
    "Pets Allowed — можно с животными",
    "Balcony — балкон или терраса",
    "Self Check-in — бесконтактное заселение",
    "Crib — детская кроватка",
    "Family Friendly — подойдет семьям",
    "Meal Service — включено питание",
    "Pool — бассейн (очень популярный фильтр для отдыха)",
    "Dryer — сушилка для одежды (часто идет в паре с Washer)",
    "Iron — утюг (базовая вещь для тех, кто приехал по работе)",
    "Smoke Alarm — датчик дыма (показывает заботу о безопасности, стандарт для Airbnb)",
    "First Aid Kit — аптечка (также важный пункт в разделе безопасности)",
  ];

  const propertyTypeMap = {
    Apartment: 0,
    House: 1,
    Room: 2,
    Studio: 3,
    Condo: 4,
    Townhouse: 5,
    Guesthouse: 6,
    Villa: 7,
    Cottage: 8,
    Bungalow: 9,
    Cabin: 10,
    Chalet: 11,
    Hotel: 12,
    Hostel: 13,
    Motel: 14,
    Resort: 15,
    Homestay: 16,
    Aparthotel: 17,
    "Farm Stay": 18,
    "Eco-house": 19,
    "Tiny House": 20,
    "Beach House": 21,
    "Lake House": 22,
    "Waterfront Apartment": 23,
    Houseboat: 24,
  };

  const amenityDisplayNameMap = {
    "Wi-Fi": "Wi-Fi — интернет",
    TV: "TV — телевизор",
    Kitchen: "Kitchen — кухня (важно для длительного жилья)",
    "Air Conditioning": "Air Conditioning — кондиционер",
    Heating: "Heating — отопление",
    "Dedicated Workspace": "Dedicated Workspace — рабочее место",
    Washer: "Washer — стиральная машина",
    "Free Parking": "Free Parking — бесплатная парковка",
    Gym: "Gym — спортзал",
    "Pets Allowed": "Pets Allowed — можно с животными",
    Balcony: "Balcony — балкон или терраса",
    "Self Check-in": "Self Check-in — бесконтактное заселение",
    Crib: "Crib — детская кроватка",
    "Family Friendly": "Family Friendly — подойдет семьям",
    "Meal Service": "Meal Service — включено питание",
    Pool: "Pool — бассейн (очень популярный фильтр для отдыха)",
    Dryer: "Dryer — сушилка для одежды (часто идет в паре с Washer)",
    Iron: "Iron — утюг (базовая вещь для тех, кто приехал по работе)",
    "Smoke Alarm":
      "Smoke Alarm — датчик дыма (показывает заботу о безопасности, стандарт для Airbnb)",
    "First Aid Kit":
      "First Aid Kit — аптечка (также важный пункт в разделе безопасности)",
  };

  const amenityIdMap = {
    TV: 1,
    Kitchen: 2,
    Heating: 3,
    "Dedicated Workspace": 4,
    Washer: 5,
    "Pets Allowed": 6,
    Balcony: 7,
    "Self Check-in": 8,
    Crib: 9,
    Pool: 10,
    Dryer: 11,
    Iron: 12,
    "Smoke Alarm": 13,
    "First Aid Kit": 14,
    "Wi-Fi": 15,
    "Free Parking": 16,
    "Air Conditioning": 17,
    Gym: 18,
    "Meal Service": 19,
  };

  amenitiesModule.amenitiesCatalog = amenitiesCatalog;
  amenitiesModule.propertyTypeMap = propertyTypeMap;

  amenitiesModule.seedAmenitiesList = function seedAmenitiesList(
    container,
    amenities = amenitiesCatalog,
  ) {
    if (!container) return;

    container.innerHTML = "";
    amenities.forEach((item, index) => {
      const column = document.createElement("div");
      column.className = "col-md-4 mb-2";
      column.innerHTML = `
        <div class="form-check">
            <input class="form-check-input amenity-checkbox" type="checkbox" value="${item}" id="amenity-${index}">
            <label class="form-check-label text-muted" for="amenity-${index}">${item}</label>
        </div>
      `;
      container.appendChild(column);
    });
  };

  amenitiesModule.getPropertyTypeLabel = function getPropertyTypeLabel(
    selectElement,
  ) {
    if (!selectElement) return "Apartment";

    const rawValue =
      typeof selectElement.value === "string" && selectElement.value.trim()
        ? selectElement.value
        : selectElement.options?.[selectElement.selectedIndex]?.text || "";

    return String(rawValue).split(" — ")[0].trim() || "Apartment";
  };

  amenitiesModule.propertyTypeToEnumValue =
    function propertyTypeToEnumValue(typeOrLabel) {
      const normalized = String(typeOrLabel || "").split(" — ")[0].trim();
      return propertyTypeMap[normalized] ?? propertyTypeMap.Apartment;
    };

  amenitiesModule.getAmenityDisplayNameMap =
    function getAmenityDisplayNameMap() {
      return { ...amenityDisplayNameMap };
    };

  amenitiesModule.getAmenityIdMap = function getAmenityIdMap() {
    return { ...amenityIdMap };
  };

  amenitiesModule.applySelectedAmenities = function applySelectedAmenities(
    amenityNames,
    selector = ".amenity-checkbox",
  ) {
    const selectedNames = Array.isArray(amenityNames) ? amenityNames : [];

    selectedNames.forEach((name) => {
      const displayValue = amenityDisplayNameMap[name] || name;
      const checkbox = document.querySelector(
        `${selector}[value="${displayValue}"]`,
      );
      if (checkbox) {
        checkbox.checked = true;
      }
    });
  };

  amenitiesModule.normalizeAmenityName = function normalizeAmenityName(value) {
    return String(value || "").split(" — ")[0].trim();
  };

  amenitiesModule.collectSelectedAmenityNames =
    function collectSelectedAmenityNames(
      selector = ".amenity-checkbox:checked",
    ) {
      return Array.from(document.querySelectorAll(selector))
        .map((checkbox) => amenitiesModule.normalizeAmenityName(checkbox.value))
        .filter(Boolean);
    };

  amenitiesModule.collectSelectedAmenityValues =
    function collectSelectedAmenityValues(
      selector = ".amenity-checkbox:checked",
    ) {
      return Array.from(document.querySelectorAll(selector))
        .map((checkbox) => String(checkbox.value || "").trim())
        .filter(Boolean);
    };

  amenitiesModule.mapAmenityNamesToIds = function mapAmenityNamesToIds(names) {
    return (Array.isArray(names) ? names : [])
      .map((name) => amenityIdMap[name])
      .filter(Boolean);
  };

  window.RentlyAccommodationFormAmenities = amenitiesModule;
})(window);
