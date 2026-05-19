(function initProfilePage() {
  window.RentlyProfilePageShared?.initProfilePage({
    enableHostModeLinks: true,
    hostModeHref: "./host-mode.html",
    loginPath: "./login.html",
    redirectPath: "./index.html",
  });
})();
