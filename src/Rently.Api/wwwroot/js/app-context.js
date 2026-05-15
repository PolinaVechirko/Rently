(function initRentlyAppContext(root) {
  if (!root) return;

  const getPathname = () => root.location?.pathname || "";

  const context = root.RentlyAppContext || {};

  context.isInHostModeFolder = function isInHostModeFolder() {
    return getPathname().includes("/host-mode/");
  };

  context.isInHostMode = function isInHostMode() {
    const pathname = getPathname();
    return (
      context.isInHostModeFolder() || pathname.includes("host-mode.html")
    );
  };

  context.getAssetBase = function getAssetBase() {
    return context.isInHostModeFolder() ? "../" : "./";
  };

  context.getHostModeHref = function getHostModeHref(path, query = "") {
    const cleanPath = String(path || "").replace(/^\/+/, "");
    const base = context.isInHostModeFolder()
      ? `./${cleanPath}`
      : `./host-mode/${cleanPath}`;
    return query ? `${base}${query}` : base;
  };

  context.getHostPropertyViewHref = function getHostPropertyViewHref(id) {
    const query = id ? `?id=${encodeURIComponent(id)}` : "";
    return context.getHostModeHref("property-view.html", query);
  };

  context.getSearchPageHref = function getSearchPageHref(query = "") {
    const base = context.isInHostModeFolder() ? "../search.html" : "./search.html";
    return query ? `${base}${query}` : base;
  };

  context.getLoginPageHref = function getLoginPageHref() {
    return context.isInHostModeFolder() ? "../login.html" : "./login.html";
  };

  context.getHostHomeHref = function getHostHomeHref() {
    return context.isInHostModeFolder() ? "../host-mode.html" : "./host-mode.html";
  };

  root.RentlyAppContext = context;

  root.isInHostMode = context.isInHostMode;
  root.isInHostModeFolder = context.isInHostModeFolder;
  root.getAssetBase = context.getAssetBase;
  root.getHostModeHref = context.getHostModeHref;
  root.getHostPropertyViewHref = context.getHostPropertyViewHref;
  root.getSearchPageHref = context.getSearchPageHref;
  root.getLoginPageHref = context.getLoginPageHref;
  root.getHostHomeHref = context.getHostHomeHref;
})(window);
