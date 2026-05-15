(function initRentlyLearnMore(root) {
  if (!root) return;

  const learnMore = root.RentlyLearnMore || {};

  learnMore.isHostContext = function isHostContext() {
    const pathname = root.location.pathname || "";
    return (
      pathname.includes("host-mode.html") ||
      pathname.includes("/host-mode/")
    );
  };

  learnMore.getTrackLearnMoreHref = function getTrackLearnMoreHref(trackId) {
    const normalizedTrackId = String(trackId || "");

    if (normalizedTrackId === "accommodations-track") {
      return "./search.html?sort=highest_rated&page=1";
    }

    if (normalizedTrackId.startsWith("most-visited-track")) {
      return "./search.html?sort=most_visited&page=1";
    }

    if (normalizedTrackId === "inspiration-track") {
      if (root.RentlyRenderHelpers?.isInHostMode()) {
        return root.RentlyRenderHelpers.getHostModeHref("inspiration.html");
      }
      return "./search.html?page=1";
    }

    return "./search.html?page=1";
  };

  learnMore.handleButtonClick = function handleButtonClick(buttonElement) {
    const track = buttonElement?.closest(".horizontal-scroll-track");
    if (!track) {
      root.location.href = "./search.html?page=1";
      return true;
    }

    root.location.href = learnMore.getTrackLearnMoreHref(track.id || "");
    return true;
  };

  learnMore.handleCardClick = function handleCardClick(cardElement) {
    if (!cardElement) return false;

    if (learnMore.isHostContext()) {
      const inHostModeFolder = (root.location.pathname || "").includes("/host-mode/");
      root.location.href = inHostModeFolder
        ? "./inspiration.html?sort=highest_rated&page=1"
        : "./host-mode/inspiration.html?sort=highest_rated&page=1";
      return true;
    }

    const track = cardElement.closest(".horizontal-scroll-track");
    const trackId = track?.id || "";

    if (
      trackId === "accommodations-track" ||
      trackId === "most-visited-track-1" ||
      trackId === "most-visited-track-2"
    ) {
      root.location.href = learnMore.getTrackLearnMoreHref(trackId);
      return true;
    }

    root.location.href = "./search.html?page=1";
    return true;
  };

  root.RentlyLearnMore = learnMore;
})(window);
