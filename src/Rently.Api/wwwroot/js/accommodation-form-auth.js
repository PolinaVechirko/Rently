(function createAccommodationFormAuth(window) {
  if (!window) return;

  const auth = window.RentlyAccommodationFormAuth || {};
  const authStorage = window.RentlyAuthStorage || null;

  auth.redirectToLogin = function redirectToLogin(loginPath = "./login.html") {
    authStorage?.setRedirectAfterAuth?.(window.location.href);
    window.location.href = loginPath;
  };

  auth.redirectToHostHome = function redirectToHostHome(
    hostHomePath = "./host-mode.html",
  ) {
    window.location.href = hostHomePath;
  };

  auth.getAuthToken = function getAuthToken() {
    return authStorage?.getAuthToken?.() || "";
  };

  auth.ensureAuthenticated = function ensureAuthenticated(
    loginPath = "./login.html",
  ) {
    const token = auth.getAuthToken();
    if (token) {
      return token;
    }

    auth.redirectToLogin(loginPath);
    return "";
  };

  window.RentlyAccommodationFormAuth = auth;
})(window);
