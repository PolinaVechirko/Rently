(function initRentlyAuthInit(root) {
  if (!root) return;

  const authInit = root.RentlyAuthInit || {};
  let resolveAuthInitPromise = null;

  root.rentlyAuthInitPromise =
    root.rentlyAuthInitPromise ||
    new Promise((resolve) => {
      resolveAuthInitPromise = resolve;
    });

  authInit.resolveAuthInit = function resolveAuthInit(isAuthenticated) {
    if (resolveAuthInitPromise) {
      resolveAuthInitPromise(!!isAuthenticated);
      resolveAuthInitPromise = null;
    }
  };

  authInit.updateDropdownLinks = function updateDropdownLinks(user) {
    root.RentlyAuthUi?.updateDropdownLinks(user);
  };

  authInit.checkAuthState = function checkAuthState() {
    const isLoggedIn = root.RentlyAuthStorage
      ? root.RentlyAuthStorage.isLoggedIn()
      : false;

    const isAuthPage =
      root.location.pathname.includes("login.html") ||
      root.location.pathname.includes("signup.html");

    const pathname = root.location.pathname || "";
    const inHostSubfolder = pathname.includes("/host-mode/");
    const isHostMode = inHostSubfolder || pathname.endsWith("/host-mode.html");

    if (!isLoggedIn && isHostMode) {
      root.RentlyAuthRedirects?.redirectToLoginPreservingCurrentLocation();
      return;
    }

    if (isLoggedIn && isAuthPage) {
      root.location.href = "./index.html";
      return;
    }

    root.RentlyAuthUi?.updateHeaderUI(isLoggedIn, isAuthPage);

    if (!isLoggedIn) {
      const dropdown = document.getElementById("user-dropdown");
      if (dropdown) {
        const links = dropdown.querySelectorAll("a");
        links.forEach((link) => {
          const href = link.getAttribute("href");
          if (
            href &&
            !href.includes("index.html") &&
            !href.includes("help-center")
          ) {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              root.RentlyAuthStorage?.setRedirectAfterAuth(
                new URL(href, root.location.href).href,
              );
              root.location.href =
                root.RentlyAuthRedirects?.getLoginPageHref() || "./login.html";
            });
          }
        });
      }
    }
  };

  authInit.validateAndFetchUser = async function validateAndFetchUser(token) {
    if (!token) {
      root.RentlyAuthUi?.syncAllUserData(null);
      authInit.resolveAuthInit(false);
      return;
    }

    try {
      const resp = root.RentlyAuthApi
        ? await root.RentlyAuthApi.getCurrentUserResponse()
        : await root.fetch("/api/Auth/me", {
            headers: { Authorization: "Bearer " + token },
          });

      if (resp.status === 401) {
      if (root.RentlyAuthStorage) {
        root.RentlyAuthStorage.clearAuthentication();
      }

        root.RentlyAuthUi?.updateHeaderUI(false, false);
        root.RentlyAuthUi?.syncAllUserData(null);
        authInit.resolveAuthInit(false);

        if (
          root.location.pathname.includes("/host-mode/") ||
          root.RentlyAuthRedirects?.isRestrictedHostIdRoute()
        ) {
          root.RentlyAuthRedirects?.redirectToLoginPreservingCurrentLocation();
        }
        return;
      }

      if (!resp.ok) {
        authInit.resolveAuthInit(false);
        return;
      }

      const user = await resp.json();
      if (!user) {
        authInit.resolveAuthInit(false);
        return;
      }

      if (root.RentlyAuthStorage) {
        root.RentlyAuthStorage.setAuthenticated(token);
      }

      root.RentlyAuthUi?.updateHeaderUI(true, false);
      root.RentlyAuthUi?.syncAllUserData(user);
      root.RentlyAuthStorage?.cacheUserSnapshot(
        user,
        root.RentlyAuthUi?.getHeaderAvatarThumbUrl,
      );
      authInit.updateDropdownLinks(user);
      authInit.resolveAuthInit(true);
    } catch (e) {
      console.error("Auth validation failed:", e);
      authInit.resolveAuthInit(false);
    }
  };

  let authListenersAttached = false;
  authInit.attachListeners = function attachListeners() {
    if (authListenersAttached) return;
    authListenersAttached = true;

    const signInBtn = document.getElementById("header-signin-btn");
    if (signInBtn) {
      signInBtn.addEventListener("click", () => {
        if (
          !root.location.pathname.includes("login.html") &&
          !root.location.pathname.includes("signup.html")
        ) {
          root.RentlyAuthStorage?.setRedirectAfterAuth(root.location.href);
        }
      });
    }

    root.RentlyAuthForms?.bindLoginForm(document.getElementById("login-form"));
    root.RentlyAuthForms?.bindSignupForm(document.getElementById("signup-form"));
    root.RentlyAuthDropdown?.bindDropdown(
      document.getElementById("header-user-wrapper"),
      document.getElementById("user-dropdown"),
    );
    root.RentlyAuthDropdown?.bindLogout(document.getElementById("logout-btn"));
  };

  authInit.initAuth = function initAuth() {
    authInit.checkAuthState();

    const token = root.RentlyAuthStorage
      ? root.RentlyAuthStorage.getAuthToken()
      : "";
    const cachedHostAvatar = root.RentlyAuthStorage
      ? root.RentlyAuthStorage.getCachedAvatarUrl()
      : "";
    const cachedHostData = root.RentlyAuthStorage
      ? root.RentlyAuthStorage.getStoredUserData()
      : {};

    if (token) {
      const initialUser = {
        profilePhotoUrl:
          cachedHostAvatar ||
          cachedHostData.profilePhotoUrl ||
          cachedHostData.ProfilePhotoUrl ||
          root.RentlyAuthUi?.rootStaticUrl("icons/user.svg") ||
          "/icons/user.svg",
        fullName: cachedHostData.fullName || cachedHostData.name || "",
        email: cachedHostData.email || "",
        phoneNumber: cachedHostData.phoneNumber || cachedHostData.phone || "",
        bio: cachedHostData.bio || "",
      };
      root.RentlyAuthUi?.syncAllUserData(initialUser);
      root.RentlyAuthUi?.markAuthReady();
      authInit.validateAndFetchUser(token);
    } else {
      root.RentlyAuthUi?.syncAllUserData(null);
      root.RentlyAuthUi?.markAuthReady();
      authInit.resolveAuthInit(false);
    }

    authInit.attachListeners();
  };

  root.RentlyAuthInit = authInit;
})(window);
