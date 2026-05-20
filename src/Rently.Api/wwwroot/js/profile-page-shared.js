(function createProfilePageShared(window) {
  function initProfilePage(options = {}) {
    const authStorage = window.RentlyAuthStorage;
    const profileStorage = window.RentlyProfileStorage;
    const profileElements = {
      avatarInput: document.getElementById("avatar-input"),
      avatarPreview: document.getElementById("profile-avatar-preview"),
      avatarPlaceholder: document.getElementById("avatar-placeholder"),
      changePhotoBadge: document.getElementById("change-photo-badge"),
      nameInput: document.getElementById("profile-name"),
      emailInput: document.getElementById("profile-email"),
      phoneInput: document.getElementById("profile-phone"),
      bioInput: document.getElementById("profile-bio"),
      profileForm: document.getElementById("profile-edit-form"),
      nameFeedback: document.getElementById("profile-name-feedback"),
      emailFeedback: document.getElementById("profile-email-feedback"),
      phoneFeedback: document.getElementById("profile-phone-feedback"),
    };
    const {
      avatarInput,
      avatarPreview,
      avatarPlaceholder,
      changePhotoBadge,
      nameInput,
      emailInput,
      phoneInput,
      bioInput,
      profileForm,
      nameFeedback,
      emailFeedback,
      phoneFeedback,
    } = profileElements;

    if (
      !avatarInput ||
      !avatarPreview ||
      !changePhotoBadge ||
      !nameInput ||
      !emailInput ||
      !phoneInput ||
      !bioInput ||
      !profileForm
    ) {
      return;
    }

    const loginPath = options.loginPath || "./login.html";
    const redirectPath = options.redirectPath || "./index.html";
    const hostModeHref = options.hostModeHref || "./host-mode.html";
    const enableHostModeLinks = options.enableHostModeLinks === true;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[0-9\s\-\(\)]{7,20}$/;

    function unlockProfileInputs() {
      [nameInput, emailInput, phoneInput, bioInput].forEach((input) => {
        if (!input) return;
        input.disabled = false;
        input.readOnly = false;
        input.removeAttribute("disabled");
        input.removeAttribute("readonly");
      });
    }

    function clearValidation() {
      [nameInput, emailInput, phoneInput].forEach((input) => {
        input.classList.remove("is-invalid");
      });
    }

    function showAvatarPreview(src) {
      if (typeof setAllAvatars === "function") {
        setAllAvatars(src);
      }
    }

    function validateProfile() {
      clearValidation();

      let isValid = true;

      if (!nameInput.value.trim()) {
        nameInput.classList.add("is-invalid");
        if (nameFeedback) {
          nameFeedback.textContent = "Please enter your full name.";
        }
        isValid = false;
      }

      const emailValue = emailInput.value.trim();
      if (!emailPattern.test(emailValue)) {
        emailInput.classList.add("is-invalid");
        if (emailFeedback) {
          emailFeedback.textContent = "Please enter a valid email address.";
        }
        isValid = false;
      }

      const phoneValue = phoneInput.value.trim();
      if (phoneValue) {
        const digits = phoneValue.replace(/\D/g, "");
        if (
          !phonePattern.test(phoneValue) ||
          digits.length < 7 ||
          digits.length > 15
        ) {
          phoneInput.classList.add("is-invalid");
          if (phoneFeedback) {
            phoneFeedback.textContent = "Please enter a realistic phone number.";
          }
          isValid = false;
        }
      }

      return isValid;
    }

    function persistAvatar(url) {
      if (!url) return;
      profileStorage?.setAvatarUrls(url);
    }

    function bindHostModeLinks() {
      if (!enableHostModeLinks) {
        return;
      }

      [
        document.getElementById("host-mode-link"),
        document.getElementById("host-mode-link-dropdown"),
      ].forEach((link) => {
        if (!link) return;
        link.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.href = hostModeHref;
        });
      });
    }

    document.addEventListener("DOMContentLoaded", () => {
      unlockProfileInputs();

      const token = authStorage?.getAuthToken() || "";
      if (!token) {
        window.location.href = loginPath;
        return;
      }

      fetch("/api/Auth/me", {
        headers: { Authorization: "Bearer " + token },
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!data) return;

          unlockProfileInputs();

          if (data.fullName) nameInput.value = data.fullName;
          if (data.email) emailInput.value = data.email;
          if (data.phoneNumber) phoneInput.value = data.phoneNumber;
          if (data.bio) bioInput.value = data.bio;
          if (data.profilePhotoUrl && data.profilePhotoUrl !== "./icons/user.svg") {
            avatarPreview.src = data.profilePhotoUrl;
            avatarPreview.classList.remove("hidden");
            avatarPlaceholder?.classList.add("d-none");
          }
        })
        .catch((error) => console.error("Failed to load profile:", error));
    });

    [nameInput, emailInput, phoneInput, bioInput].forEach((input) => {
      input?.addEventListener("focus", unlockProfileInputs);
      input?.addEventListener("pointerdown", unlockProfileInputs);
      input?.addEventListener("click", unlockProfileInputs);
      input?.addEventListener("keydown", unlockProfileInputs);
    });

    avatarPlaceholder?.addEventListener("click", () => {
      avatarInput.click();
    });

    changePhotoBadge.addEventListener("click", () => {
      avatarInput.click();
    });

    avatarInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const base64 = loadEvent.target.result;
        showAvatarPreview(base64);
        persistAvatar(base64);
      };
      reader.readAsDataURL(file);
    });

    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!validateProfile()) {
        return;
      }

      const token = authStorage?.getAuthToken() || "";
      if (!token) {
        alert("Please sign in again.");
        return;
      }

      try {
        const response = await fetch("/api/Auth/me", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            fullName: nameInput.value.trim(),
            email: emailInput.value.trim(),
            bio: bioInput.value.trim() || null,
            phoneNumber: phoneInput.value.trim(),
            profilePhotoUrl: avatarPreview.src,
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload.message || "Could not update profile");
        }

        const updated = await response.json();

        const storedProfileDraft = {
          name: updated.fullName,
          email: updated.email,
          phone: updated.phoneNumber || "",
          bio: updated.bio || bioInput.value.trim(),
        };

        if (typeof profileStorage?.setStoredProfileDraft === "function") {
          profileStorage.setStoredProfileDraft(storedProfileDraft);
        } else if (typeof profileStorage?.setStoredUserData === "function") {
          profileStorage.setStoredUserData(storedProfileDraft);
        }

        persistAvatar(updated.profilePhotoUrl);

        window.location.href =
          typeof getProfileReturnUrl === "function"
            ? getProfileReturnUrl(redirectPath)
            : redirectPath;
      } catch (error) {
        alert("Profile update failed: " + error.message);
      }
    });

    bindHostModeLinks();
  }

  window.RentlyProfilePageShared = {
    initProfilePage,
  };
})(window);
