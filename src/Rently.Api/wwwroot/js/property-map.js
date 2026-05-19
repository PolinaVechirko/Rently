(function createPropertyMap(window) {
  async function initPropertyMap(property) {
    const mapContainer = document.getElementById("property-map");
    if (!mapContainer || !property?.city) {
      return;
    }

    const fullAddress = `${property.street ? `${property.street}, ` : ""}${property.city}, ${property.country}`;

    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&q=${encodeURIComponent(fullAddress)}&limit=1`,
      );
      const geoData = await geoResponse.json();

      if (Array.isArray(geoData) && geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lon = parseFloat(geoData[0].lon);

        mapContainer.classList.remove("skeleton");
        const map = L.map("property-map", {
          center: [lat, lon],
          zoom: 13,
          scrollWheelZoom: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        L.marker([lat, lon]).addTo(map);
        return;
      }

      mapContainer.innerHTML =
        "<p style='padding: 20px;'>Location map unavailable for this address.</p>";
      mapContainer.classList.remove("skeleton");
    } catch (error) {
      console.error("Map initialization failed:", error);
      mapContainer.classList.remove("skeleton");
    }
  }

  window.RentlyPropertyMap = {
    initPropertyMap,
  };
})(window);
