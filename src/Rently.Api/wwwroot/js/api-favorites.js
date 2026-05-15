(function initRentlyFavoritesApi(root) {
  if (!root) return;

  const api = root.RentlyFavoritesApi || {};
  const client = root.RentlyApi;

  api.listResponse = function listResponse(options = {}) {
    const cacheBust = options.cacheBust ? `?_=${Date.now()}` : "";
    const requestOptions = options.cacheBust
      ? {
          auth: true,
          headers: {
            "Cache-Control": "no-cache",
          },
        }
      : { auth: true };

    if (!client) {
      return root.fetch(`/api/Favorites${cacheBust}`, {
        headers: {
          Authorization: `Bearer ${root.localStorage?.getItem("auth_token") || ""}`,
          ...(options.cacheBust ? { "Cache-Control": "no-cache" } : {}),
        },
      });
    }

    return client.fetch(`/api/Favorites${cacheBust}`, requestOptions);
  };

  api.getStateResponse = function getStateResponse(id) {
    if (!client) {
      return root.fetch(`/api/Favorites/${encodeURIComponent(id)}`, {
        headers: {
          Authorization: `Bearer ${root.localStorage?.getItem("auth_token") || ""}`,
        },
      });
    }

    return client.fetch(`/api/Favorites/${encodeURIComponent(id)}`, { auth: true });
  };

  api.addResponse = function addResponse(id, favoriteType) {
    if (!client) {
      return root.fetch(
        `/api/Favorites/${encodeURIComponent(id)}?type=${encodeURIComponent(favoriteType)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${root.localStorage?.getItem("auth_token") || ""}`,
          },
        },
      );
    }

    return client.fetch(
      `/api/Favorites/${encodeURIComponent(id)}?type=${encodeURIComponent(favoriteType)}`,
      {
        method: "POST",
        auth: true,
      },
    );
  };

  api.removeResponse = function removeResponse(id, favoriteType) {
    if (!client) {
      return root.fetch(
        `/api/Favorites/${encodeURIComponent(id)}?type=${encodeURIComponent(favoriteType)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${root.localStorage?.getItem("auth_token") || ""}`,
          },
        },
      );
    }

    return client.fetch(
      `/api/Favorites/${encodeURIComponent(id)}?type=${encodeURIComponent(favoriteType)}`,
      {
        method: "DELETE",
        auth: true,
      },
    );
  };

  root.RentlyFavoritesApi = api;
})(window);
