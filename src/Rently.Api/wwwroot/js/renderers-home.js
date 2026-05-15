(function initRentlyHomeRenderers(root) {
  if (!root) return;

  const homeRenderers = root.RentlyHomeRenderers || {};

  homeRenderers.renderCities = async function renderCities() {
    const grid = document.getElementById("cities-grid");
    if (!grid) return;

    const assetBase = root.RentlyRenderHelpers
      ? root.RentlyRenderHelpers.getAssetBase()
      : "./";

    const cityImages = {
      Bangkok: `${assetBase}images/cities/Bangkok.png`,
      Dubai: `${assetBase}images/cities/Dubai.png`,
      Istanbul: `${assetBase}images/cities/Istanbul.png`,
      London: `${assetBase}images/cities/London.png`,
      Madrid: `${assetBase}images/cities/Madrid.png`,
      Milan: `${assetBase}images/cities/Milan.png`,
      Paris: `${assetBase}images/cities/Paris.png`,
      Rome: `${assetBase}images/cities/Rome.png`,
      Seoul: `${assetBase}images/cities/Seoul.png`,
      Singapore: `${assetBase}images/cities/Singapore.png`,
    };

    const citiesOrder = Object.keys(cityImages);

    grid.innerHTML = citiesOrder
      .map(() => `<div class="city-card" style="background:#d3d3d3"></div>`)
      .join("");

    const formatCompact = (value) => {
      const n = Number(value || 0);
      try {
        return new Intl.NumberFormat("en", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(n);
      } catch {
        if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
        if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
        return String(n);
      }
    };

    let stats = [];
    try {
      const resp = await root.fetch(`/api/Analytics/city-stats?count=50`);
      if (resp.ok) stats = await resp.json();
    } catch (e) {
      console.error("Failed to load city stats:", e);
    }

    const byCity = new Map((stats || []).map((s) => [s.city || s.City, s]));

    let html = "";
    citiesOrder.forEach((name) => {
      const s = byCity.get(name) || {};
      const homes = s.activeHomesCount ?? s.ActiveHomesCount ?? 0;
      const visitors = s.visitorsCount ?? s.VisitorsCount ?? 0;

      html += `
            <div class="city-card" style="background-image: url('${cityImages[name]}')">
                <h4 class="city-name">${name}</h4>
                <div class="city-stat-home city-stat-group">
                    <img src="${assetBase}icons/home.svg" alt="home" class="city-stat-icon">
                    <span class="city-stat-value">${formatCompact(homes)}</span>
                </div>
                <div class="city-stat-users city-stat-group">
                    <span class="city-stat-value">${formatCompact(visitors)}</span>
                    <img src="${assetBase}icons/users.svg" alt="users" class="city-stat-icon">
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
  };

  homeRenderers.renderAmenities = async function renderAmenities() {
    const grid = document.querySelector(".amenities-grid");
    if (!grid) return;

    const assetBase = root.RentlyRenderHelpers
      ? root.RentlyRenderHelpers.getAssetBase()
      : "./";

    const iconMap = {
      TV: "tv.svg",
      Kitchen: "kitchen.svg",
      Heating: "heating.svg",
      "Dedicated Workspace": "workspace.svg",
      Washer: "washer.svg",
      "Pets Allowed": "pets.svg",
      Balcony: "balcony.svg",
      "Self Check-in": "selfcheckin.svg",
      Crib: "crib.svg",
      Pool: "pool.svg",
      Dryer: "dryer.svg",
      Iron: "iron.svg",
      "Smoke Alarm": "smokealarm.svg",
      "First Aid Kit": "firstaidkit.svg",
      "Wi-Fi": "wifi.svg",
      "Free Parking": "freeParking.svg",
      "Air Conditioning": "airConditioning.svg",
      Gym: "gym.svg",
      "Meal Service": "mealService.svg",
    };

    try {
      const response = await root.fetch("/api/Analytics/top-amenities?count=6");
      if (!response.ok) throw new Error("API error");
      const topAmenities = (await response.json()).slice(0, 6);

      let html = "";
      topAmenities.forEach((item) => {
        const iconFile = iconMap[item.name] || "wifi.svg";
        html += `
                <button class="amenity-btn" data-amenity-name="${item.name}">
                    <img src="${assetBase}icons/${iconFile}" alt="${item.name}" class="amenity-icon">
                    <span class="amenity-label">${item.name}</span>
                </button>
            `;
      });

      if (html) {
        grid.innerHTML = html;
      }
    } catch (err) {
      console.error("Failed to fetch top amenities:", err);
    }
  };

  root.RentlyHomeRenderers = homeRenderers;
})(window);
