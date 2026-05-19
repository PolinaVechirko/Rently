(function initRentlyAuthForms(root) {
  if (!root) return;

  const authForms = root.RentlyAuthForms || {};

  const cacheUserSnapshot = (user) => {
    if (!user) return;
    root.RentlyAuthStorage?.cacheUserSnapshot(
      user,
      root.RentlyAuthUi?.getHeaderAvatarThumbUrl,
    );
  };

  async function rememberBrowserCredentials(email, password) {
    if (
      !root.navigator?.credentials?.store ||
      typeof PasswordCredential === "undefined"
    ) {
      return;
    }

    try {
      await root.navigator.credentials.store(
        new PasswordCredential({
          id: String(email || "").trim(),
          password: String(password || ""),
          name: String(email || "").trim(),
        }),
      );
    } catch {
      // Browser-managed credential storage is best-effort only.
    }
  }

  authForms.bindLoginForm = function bindLoginForm(loginForm) {
    if (!loginForm || loginForm.dataset.rentlyAuthBound === "true") return;
    loginForm.dataset.rentlyAuthBound = "true";

    const emailInput = loginForm.querySelector(
      'input[type="email"], input[type="text"]',
    );
    const passwordInput = loginForm.querySelector('input[type="password"]');
    const rememberCheckbox = loginForm.querySelector("#remember");
    const rememberedEmail = root.RentlyAuthStorage?.getRememberedLoginEmail?.() || "";

    if (emailInput && rememberedEmail) {
      emailInput.value = rememberedEmail;
    }
    if (rememberCheckbox) {
      rememberCheckbox.checked = rememberedEmail.length > 0;
    }

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerText = "Signing in...";

      try {
        const response = root.RentlyAuthApi
          ? await root.RentlyAuthApi.login({
              email: emailInput.value,
              password: passwordInput.value,
            })
          : await root.fetch("/api/Auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value,
              }),
            });

        if (!response.ok) {
          let errorMessage = "Invalid credentials";
          try {
            const err = await response.json();
            errorMessage = err.message || errorMessage;
          } catch {
            const errText = await response.text();
            if (errText) {
              errorMessage = errText;
            }
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        const token =
          data?.token ?? data?.Token ?? data?.accessToken ?? data?.AccessToken;
        if (!token) {
          throw new Error(
            "Login succeeded, but the server did not return a token.",
          );
        }

        if (root.RentlyAuthStorage) {
          root.RentlyAuthStorage.setAuthenticated(token);
        } else {
          root.localStorage?.setItem("auth_token", token);
          root.localStorage?.setItem("isLoggedIn", "true");
        }

        cacheUserSnapshot(data.user);

        if (rememberCheckbox?.checked) {
          root.RentlyAuthStorage?.setRememberedLoginEmail?.(emailInput.value);
          await rememberBrowserCredentials(emailInput.value, passwordInput.value);
        } else {
          root.RentlyAuthStorage?.clearRememberedLoginEmail?.();
        }

        const redirectUrl = root.RentlyAuthRedirects
          ? await root.RentlyAuthRedirects.resolvePostAuthRedirect(
              token,
              "./index.html",
            )
          : new URL("./index.html", root.location.href).href;
        root.location.href = redirectUrl;
      } catch (err) {
        if (root.RentlyAuthStorage?.getAuthToken()) {
          return;
        }
        const msg =
          err && typeof err.message === "string"
            ? err.message
            : "Something went wrong. Please try again.";
        alert("Login Error: " + msg);
        submitBtn.disabled = false;
        submitBtn.innerText = "Sign in";
      }
    });
  };

  authForms.bindSignupForm = function bindSignupForm(signupForm) {
    if (!signupForm || signupForm.dataset.rentlyAuthBound === "true") return;
    signupForm.dataset.rentlyAuthBound = "true";

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const passwords = signupForm.querySelectorAll('input[type="password"]');
      if (passwords[0].value !== passwords[1].value) {
        alert("Passwords do not match!");
        return;
      }

      const emailInput = signupForm.querySelector('input[type="email"]');
      const fullnameInput = signupForm.querySelector('input[name="fullName"]');

      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerText = "Creating account...";

      try {
        const response = root.RentlyAuthApi
          ? await root.RentlyAuthApi.register({
              email: emailInput.value,
              password: passwords[0].value,
              fullName: fullnameInput ? fullnameInput.value : "",
              role: "Host",
            })
          : await root.fetch("/api/Auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: emailInput.value,
                password: passwords[0].value,
                fullName: fullnameInput ? fullnameInput.value : "",
                role: "Host",
              }),
            });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || "Could not register");
        }

        const data = await response.json();
        if (root.RentlyAuthStorage) {
          root.RentlyAuthStorage.setAuthenticated(data.token);
        } else {
          root.localStorage?.setItem("auth_token", data.token);
          root.localStorage?.setItem("isLoggedIn", "true");
        }

        cacheUserSnapshot(data.user);

        const redirectUrl = root.RentlyAuthRedirects
          ? await root.RentlyAuthRedirects.resolvePostAuthRedirect(
              data.token,
              "./index.html",
            )
          : new URL("./index.html", root.location.href).href;
        root.location.href = redirectUrl;
      } catch (err) {
        if (root.RentlyAuthStorage?.getAuthToken()) {
          return;
        }
        const msg =
          err && typeof err.message === "string"
            ? err.message
            : "Something went wrong. Please try again.";
        alert("Signup Error: " + msg);
        submitBtn.disabled = false;
        submitBtn.innerText = "Create Account";
      }
    });
  };

  root.RentlyAuthForms = authForms;
})(window);
