(function initRentlyAuthProfileReturn(root) {
  if (!root) return;

  const profileReturn = root.RentlyAuthProfileReturn || {};

  profileReturn.rememberProfileReturnUrl = function rememberProfileReturnUrl(profileHref) {
    const href = String(profileHref || "");
    if (!/profile\.html(?:[?#]|$)/i.test(href)) return;
    if (/profile\.html(?:[?#]|$)/i.test(root.location.pathname)) return;

    try {
      root.sessionStorage.setItem("rently_profile_return_url", root.location.href);
    } catch {
      /* sessionStorage can be unavailable in private contexts */
    }
  };

  profileReturn.getProfileReturnUrl = function getProfileReturnUrl(fallbackPath) {
    const fallback = new URL(fallbackPath, root.location.href).href;

    const isUsableReturnUrl = (value) => {
      if (!value) return false;
      try {
        const url = new URL(value, root.location.href);
        if (url.origin !== root.location.origin) return false;
        if (/profile\.html(?:[?#]|$)/i.test(url.pathname)) return false;
        return true;
      } catch {
        return false;
      }
    };

    let stored = "";
    try {
      stored = root.sessionStorage.getItem("rently_profile_return_url") || "";
      root.sessionStorage.removeItem("rently_profile_return_url");
    } catch {
      stored = "";
    }

    if (isUsableReturnUrl(stored)) return stored;
    if (isUsableReturnUrl(document.referrer)) return document.referrer;
    return fallback;
  };

  root.RentlyAuthProfileReturn = profileReturn;
  root.rememberProfileReturnUrl = profileReturn.rememberProfileReturnUrl;
  root.getProfileReturnUrl = profileReturn.getProfileReturnUrl;
})(window);
