(function createAccommodationFormAmenities(window) {
  if (!window) return;

  const amenitiesModule = window.RentlyAccommodationFormAmenities || {};
  let amenityOptions = [];

  const preferredAmenityOrder = [
    "Wi-Fi",
    "TV",
    "Kitchen",
    "Air Conditioning",
    "Heating",
    "Dedicated Workspace",
    "Washer",
    "Free Parking",
    "Gym",
    "Pets Allowed",
    "Balcony",
    "Self Check-in",
    "Crib",
    "Family Friendly",
    "Meal Service",
    "Pool",
    "Dryer",
    "Iron",
    "Smoke Alarm",
    "First Aid Kit",
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
  amenitiesModule.propertyTypeMap = propertyTypeMap;

  function getAmenityDisplayLabel(name) {
    return amenityDisplayNameMap[name] || name;
  }

  function sortAmenityOptions(options) {
    const orderMap = preferredAmenityOrder.reduce((map, name, index) => {
      map[name] = index;
      return map;
    }, {});

    return [...options].sort((left, right) => {
      const leftOrder = orderMap[left.name] ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap[right.name] ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return String(left.name || "").localeCompare(String(right.name || ""));
    });
  }

  amenitiesModule.fetchAmenitiesCatalog = async function fetchAmenitiesCatalog() {
    const response = await fetch("/api/Accommodations/amenities");
    if (!response.ok) {
      throw new Error("Failed to load amenities catalog.");
    }

    const payload = await response.json();
    const options = (Array.isArray(payload) ? payload : [])
      .map((item) => ({
        id: item.id ?? item.Id,
        name: item.name ?? item.Name,
      }))
      .filter((item) => Number.isInteger(item.id) && item.id > 0 && item.name);

    amenityOptions = sortAmenityOptions(options);
    return [...amenityOptions];
  };

  amenitiesModule.loadAmenitiesCatalog = async function loadAmenitiesCatalog(
    container,
  ) {
    const options = await amenitiesModule.fetchAmenitiesCatalog();
    amenitiesModule.seedAmenitiesList(container, options);
    return options;
  };

  amenitiesModule.seedAmenitiesList = function seedAmenitiesList(
    container,
    amenities = amenityOptions,
  ) {
    if (!container) return;

    container.innerHTML = "";
    (Array.isArray(amenities) ? amenities : []).forEach((item, index) => {
      const amenity =
        typeof item === "string"
          ? { id: index + 1, name: item }
          : { id: item.id, name: item.name };
      const displayLabel = getAmenityDisplayLabel(amenity.name);
      const column = document.createElement("div");
      column.className = "col-md-4 mb-2";
      column.innerHTML = `
        <div class="form-check">
            <input class="form-check-input amenity-checkbox" type="checkbox" value="${amenity.name}" data-amenity-id="${amenity.id}" id="amenity-${index}">
            <label class="form-check-label text-muted" for="amenity-${index}">${displayLabel}</label>
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
    return amenityOptions.reduce((map, amenity) => {
      map[amenity.name] = amenity.id;
      return map;
    }, {});
  };

  amenitiesModule.applySelectedAmenities = function applySelectedAmenities(
    amenityNames,
    selector = ".amenity-checkbox",
  ) {
    const selectedNames = Array.isArray(amenityNames) ? amenityNames : [];

    selectedNames.forEach((name) => {
      const displayValue = name;
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
        .map((checkbox) =>
          amenitiesModule.normalizeAmenityName(checkbox.value),
        )
        .filter(Boolean);
    };

  amenitiesModule.collectSelectedAmenityIds = function collectSelectedAmenityIds(
    selector = ".amenity-checkbox:checked",
  ) {
    return Array.from(document.querySelectorAll(selector))
      .map((checkbox) =>
        Number.parseInt(checkbox.getAttribute("data-amenity-id") || "", 10),
      )
      .filter((id) => Number.isInteger(id) && id > 0);
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
      .map((name) => amenitiesModule.getAmenityIdMap()[name])
      .filter(Boolean);
  };

  window.RentlyAccommodationFormAmenities = amenitiesModule;
})(window);
