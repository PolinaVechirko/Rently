(function initRentlyAuthRedirects(root) {
  if (!root) return;

  const redirects = root.RentlyAuthRedirects || {};

  redirects.isRestrictedHostIdRoute = function isRestrictedHostIdRoute(
    urlLike = root.location.href,
  ) {
    try {
      const url = new URL(urlLike, root.location.href);
      const path = url.pathname || "";
      if (/\/host-mode\/property-dashboard\.html$/i.test(path)) {
        return url.searchParams.has("id");
      }
      if (/\/edit-accommodation\.html$/i.test(path)) {
        return url.searchParams.has("id");
      }
      if (/\/adding-accommodation\.html$/i.test(path)) {
        return url.searchParams.has("id");
      }
      return false;
    } catch {
      return false;
    }
  };

  redirects.getLoginPageHref = function getLoginPageHref() {
    if (root.RentlyAppContext) {
      return root.RentlyAppContext.getLoginPageHref();
    }

    return root.location.pathname.includes("/host-mode/")
      ? "../login.html"
      : "./login.html";
  };

  redirects.getHostHomeHref = function getHostHomeHref() {
    if (root.RentlyAppContext) {
      return root.RentlyAppContext.getHostHomeHref();
    }

    return root.location.pathname.includes("/host-mode/")
      ? "../host-mode.html"
      : "./host-mode.html";
  };

  redirects.redirectToLoginPreservingCurrentLocation =
    function redirectToLoginPreservingCurrentLocation() {
      root.RentlyAuthStorage?.setRedirectAfterAuth(root.location.href);
      root.location.href = redirects.getLoginPageHref();
    };

  redirects.userOwnsAccommodation = async function userOwnsAccommodation(
    token,
    accommodationId,
  ) {
    if (!token || !accommodationId) return false;
    try {
      const resp = root.RentlyApi
        ? await root.RentlyApi.fetch("/api/Accommodations/my", { auth: true })
        : await root.fetch("/api/Accommodations/my", {
            headers: { Authorization: "Bearer " + token },
          });

      if (!resp.ok) return false;

      const data = await resp.json();
      if (!Array.isArray(data)) return false;

      return data.some(
        (item) =>
          String(item?.id ?? item?.Id ?? "") === String(accommodationId),
      );
    } catch {
      return false;
    }
  };

  redirects.resolvePostAuthRedirect = async function resolvePostAuthRedirect(
    token,
    fallbackPath = "./index.html",
  ) {
    const fallbackUrl = new URL(fallbackPath, root.location.href).href;
    const rawRedirect = root.RentlyAuthStorage?.getRedirectAfterAuth() || "";
    root.RentlyAuthStorage?.clearRedirectAfterAuth();

    if (!rawRedirect) return fallbackUrl;

    let targetUrl;
    try {
      targetUrl = new URL(rawRedirect, root.location.href);
    } catch {
      return fallbackUrl;
    }

    if (targetUrl.origin !== root.location.origin) {
      return fallbackUrl;
    }

    if (redirects.isRestrictedHostIdRoute(targetUrl.href)) {
      const targetId = targetUrl.searchParams.get("id");
      const ownsAccommodation = await redirects.userOwnsAccommodation(token, targetId);
      if (!ownsAccommodation) {
        return new URL("./host-mode.html", root.location.href).href;
      }
    }

    return targetUrl.href;
  };

  root.RentlyAuthRedirects = redirects;
})(window);
