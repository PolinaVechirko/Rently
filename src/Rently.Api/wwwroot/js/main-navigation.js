(function initRentlyMainNavigation(root) {
  if (!root) return;

  const navigation = root.RentlyMainNavigation || {};

  navigation.scrollToHashTarget = function scrollToHashTarget(
    hash = root.location.hash,
    options = {},
  ) {
    const rawHash = String(hash || "").trim();
    if (!rawHash || rawHash === "#") return;

    const id = decodeURIComponent(rawHash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    const header = document.querySelector(".header");
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const extraOffset = id === "about-us" ? 24 : 100;
    const targetTop =
      target.getBoundingClientRect().top +
      root.pageYOffset -
      headerHeight -
      extraOffset;

    root.scrollTo({
      top: Math.max(0, targetTop),
      behavior: options.behavior || "auto",
    });
  };

  navigation.stabilizeHashScroll = function stabilizeHashScroll() {
    if (!root.location.hash) return;

    const delays = [0, 80, 250, 600, 1000];
    delays.forEach((delay) => {
      root.setTimeout(() => navigation.scrollToHashTarget(), delay);
    });
  };

  navigation.navigateToHashUrl = function navigateToHashUrl(href) {
    const url = new URL(href, root.location.href);
    const currentPath = root.location.pathname.replace(/\/$/, "");
    const targetPath = url.pathname.replace(/\/$/, "");

    if (currentPath === targetPath && url.hash) {
      root.history.pushState(null, "", url.pathname + url.search + url.hash);
      navigation.scrollToHashTarget(url.hash, { behavior: "smooth" });
      root.setTimeout(() => navigation.scrollToHashTarget(url.hash), 350);
      return;
    }

    root.location.href = url.href;
  };

  navigation.initHashNavigation = function initHashNavigation() {
    navigation.stabilizeHashScroll();

    root.addEventListener("load", navigation.stabilizeHashScroll);
    root.addEventListener("hashchange", navigation.stabilizeHashScroll);

    document.addEventListener("click", (e) => {
      const hashLink = e.target.closest(
        'a[href$="#about-us"], a[href$="#your-apartments-title"], a[href$="#inspiration-title"]',
      );
      if (!hashLink) return;

      e.preventDefault();
      navigation.navigateToHashUrl(hashLink.getAttribute("href"));
    });
  };

  navigation.initHeroImage = function initHeroImage() {
    const images = [
      'url("./images/hero1.png")',
      'url("./images/hero2.png")',
      'url("./images/hero3.png")',
      'url("./images/hero4.png")',
    ];

    const heroElement = document.getElementById("hero-image");
    if (!heroElement) return;

    let savedImage = root.localStorage.getItem("heroImage_v2");
    if (!savedImage) {
      savedImage = images[Math.floor(Math.random() * images.length)];
      root.localStorage.setItem("heroImage_v2", savedImage);
    }

    heroElement.style.backgroundImage = savedImage;
    heroElement.style.backgroundSize = "cover";
    heroElement.style.backgroundPosition = "center";
  };

  navigation.initContentBootstrap = function initContentBootstrap() {
    root.RentlyAccommodationsRenderer?.renderAccommodations(
      "accommodations-track",
      true,
    );
    root.RentlyAccommodationsRenderer?.renderAccommodations(
      "most-visited-track-1",
      true,
    );
    root.RentlyAccommodationsRenderer?.renderAccommodations(
      "most-visited-track-2",
      true,
    );
    root.RentlyHomeRenderers?.renderCities?.();
    root.RentlyHomeRenderers?.renderAmenities?.();

    if (root.RentlyFavoriteInteractions?.updateAllFavoriteIcons) {
      root.setTimeout(
        () => root.RentlyFavoriteInteractions.updateAllFavoriteIcons(),
        100,
      );
    }
    if (root.RentlyFavoriteInteractions?.syncFavoriteButtons) {
      const syncFavoriteButtons = () =>
        root.RentlyFavoriteInteractions.syncFavoriteButtons();
      root.setTimeout(syncFavoriteButtons, 200);
      root.addEventListener("pageshow", syncFavoriteButtons);
      root.addEventListener("focus", syncFavoriteButtons);
    }
    root.RentlyUiShared?.initAboutSlider?.();
    root.RentlyPropertyPage?.initPropertyPage?.();
    root.RentlyMyBookingActions?.initMyBookingPage?.();
    root.RentlySearchPage?.initSearchPage?.();

    if (document.getElementById("inspiration-track")) {
      root.RentlyAccommodationsRenderer?.renderAccommodations(
        "inspiration-track",
        true,
      );
    }

    if (
      document.getElementById("active-track") &&
      document.getElementById("hidden-track")
    ) {
      root.RentlyHostListingsRenderer?.renderHostListings(
        "active-track",
        "",
        "hidden-track",
      );
    }
  };

  navigation.initHomeSectionLinks = function initHomeSectionLinks() {
    const highestRatedHeading = document.getElementById("highest-rated-heading");
    if (highestRatedHeading) {
      highestRatedHeading.addEventListener("click", () => {
        root.location.href = "./search.html?sort=highest_rated&page=1";
      });
    }

    const mostVisitedHeading = document.getElementById("most-visited-heading");
    if (mostVisitedHeading) {
      mostVisitedHeading.addEventListener("click", () => {
        root.location.href = "./search.html?sort=most_visited&page=1";
      });
    }

    const inspirationTitle = document.getElementById("inspiration-title");
    if (!inspirationTitle) return;

    inspirationTitle.addEventListener("click", () => {
      if (root.RentlyRenderHelpers?.isInHostMode()) {
        root.location.href =
          root.RentlyRenderHelpers.getHostModeHref("inspiration.html");
      } else {
        root.location.href = "./search.html?page=1";
      }
    });

    if (root.RentlyRenderHelpers?.isInHostMode()) {
      inspirationTitle.style.cursor = "pointer";
    }
  };

  root.RentlyMainNavigation = navigation;
  root.scrollToHashTarget = navigation.scrollToHashTarget;
  root.stabilizeHashScroll = navigation.stabilizeHashScroll;
  root.navigateToHashUrl = navigation.navigateToHashUrl;
})(window);
