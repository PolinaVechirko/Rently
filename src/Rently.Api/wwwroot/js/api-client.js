(function initRentlyApi(root) {
  if (!root) return;

  const api = root.RentlyApi || {};

  api.getAuthToken = function getAuthToken() {
    return root.localStorage?.getItem("auth_token") || "";
  };

  api.createAuthHeaders = function createAuthHeaders(headers = {}) {
    const token = api.getAuthToken();
    if (!token) return { ...headers };

    return {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
  };

  api.fetch = function fetchWithDefaults(url, options = {}) {
    const normalizedOptions = { ...options };
    const requiresAuth = normalizedOptions.auth === true;
    delete normalizedOptions.auth;

    if (requiresAuth) {
      normalizedOptions.headers = api.createAuthHeaders(normalizedOptions.headers);
    }

    return root.fetch(url, normalizedOptions);
  };

  api.fetchJson = async function fetchJson(url, options = {}) {
    const response = await api.fetch(url, options);
    if (!response.ok) {
      const error = new Error(`Request failed with status ${response.status}`);
      error.response = response;
      throw error;
    }

    return response.json();
  };

  root.RentlyApi = api;
})(window);
