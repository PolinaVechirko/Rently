(function initRentlyAuthApi(root) {
  if (!root) return;

  const api = root.RentlyAuthApi || {};
  const client = root.RentlyApi;

  api.getCurrentUserResponse = function getCurrentUserResponse() {
    if (!client) {
      return root.fetch("/api/Auth/me");
    }

    return client.fetch("/api/Auth/me", { auth: true });
  };

  api.login = function login(payload) {
    if (!client) {
      return root.fetch("/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    return client.fetch("/api/Auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  api.register = function register(payload) {
    if (!client) {
      return root.fetch("/api/Auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    return client.fetch("/api/Auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  };

  root.RentlyAuthApi = api;
})(window);
