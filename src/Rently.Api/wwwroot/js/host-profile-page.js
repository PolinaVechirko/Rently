(function initHostProfilePage() {
  const avatarInput = document.getElementById("avatar-input");
  const avatarPreview = document.getElementById("profile-avatar-preview");
  const avatarPlaceholder = document.getElementById("avatar-placeholder");
  const changePhotoBadge = document.getElementById("change-photo-badge");

  const nameInput = document.getElementById("profile-name");
  const emailInput = document.getElementById("profile-email");
  const phoneInput = document.getElementById("profile-phone");
  const bioInput = document.getElementById("profile-bio");
  const profileForm = document.getElementById("profile-edit-form");
  const nameFeedback = document.getElementById("profile-name-feedback");
  const emailFeedback = document.getElementById("profile-email-feedback");
  const phoneFeedback = document.getElementById("profile-phone-feedback");

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

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^\+?[0-9\s\-\(\)]{7,20}$/;

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

  document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = "../login.html";
      return;
    }

    fetch("/api/Auth/me", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;

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
      .catch((e) => console.error("Failed to load profile:", e));
  });

  if (avatarPlaceholder) {
    avatarPlaceholder.addEventListener("click", () => {
      avatarInput.click();
    });
  }

  changePhotoBadge.addEventListener("click", () => {
    avatarInput.click();
  });

  avatarInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        showAvatarPreview(base64);
        localStorage.setItem("rently_avatar", base64);
        localStorage.setItem("rently_host_avatar", base64);
        localStorage.setItem("rently_header_avatar_thumb", base64);
      };
      reader.readAsDataURL(file);
    }
  });

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateProfile()) {
      return;
    }

    const token = localStorage.getItem("auth_token") || "";
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
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Could not update profile");
      }

      const updated = await response.json();

      localStorage.setItem(
        "rently_user_data",
        JSON.stringify({
          name: updated.fullName,
          email: updated.email,
          phone: updated.phoneNumber || "",
          bio: updated.bio || bioInput.value.trim(),
        }),
      );

      if (updated.profilePhotoUrl) {
        localStorage.setItem("rently_avatar", updated.profilePhotoUrl);
        localStorage.setItem("rently_host_avatar", updated.profilePhotoUrl);
        localStorage.setItem(
          "rently_header_avatar_thumb",
          updated.profilePhotoUrl,
        );
      }

      window.location.href =
        typeof getProfileReturnUrl === "function"
          ? getProfileReturnUrl("../host-mode.html")
          : "../host-mode.html";
    } catch (error) {
      alert("Profile update failed: " + error.message);
    }
  });
})();
