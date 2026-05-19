(function createPropertyReviews(window) {
  const avatarUtils = window.RentlyAvatarUtils;

  function renderPropertyReviews(property, assetBase = "./") {
    const reviewsGrid = document.querySelector(".reviews-grid");
    if (!reviewsGrid) {
      return;
    }

    const reviews = Array.isArray(property?.reviews) ? property.reviews : [];
    if (!reviews.length) {
      reviewsGrid.innerHTML = `
        <div class="review-item">
          <p class="review-text">There are no reviews yet.</p>
        </div>
      `;
      return;
    }

    reviewsGrid.innerHTML = reviews
      .map((review, index) => {
        const avatar = avatarUtils.resolveAvatarUrl(
          review.reviewerAvatarUrl ||
            review.profilePhotoUrl ||
            review.ProfilePhotoUrl ||
            review.reviewerPhotoUrl ||
            review.userAvatarUrl,
          assetBase,
        );
        const hostAvatar = avatarUtils.resolveAvatarUrl(
          property.hostAvatarUrl ||
            property.hostPhoto ||
            property.profilePhotoUrl ||
            property.ProfilePhotoUrl,
          assetBase,
        );
        const reviewId = `review-avatar-${index}`;
        const hostReplyAvatarId = `host-reply-avatar-${index}`;

        return `
          <div class="review-item ${index >= 4 ? "extra-review" : ""}">
            <div class="review-header">
              <img id="${reviewId}" src="${avatar.src}" alt="User" class="${avatar.isFallback ? "avatar-fallback" : ""}">
              <div class="review-meta">
                <div class="reviewer-name">${review.reviewerName || "Anonymous"}</div>
                <div class="review-date">${new Date(review.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
              </div>
              <div class="review-rating"><img src="${assetBase}icons/star.svg" alt="star"> ${Number(review.rating || 0).toFixed(1)}</div>
            </div>
            <p class="review-text">${review.comment || "No comment left."}</p>
            ${review.hostReply ? `
              <div class="host-reply-card">
                <div class="review-header">
                  <img id="${hostReplyAvatarId}" src="${hostAvatar.src}" alt="Host" class="${hostAvatar.isFallback ? "avatar-fallback" : ""}">
                  <div class="review-meta">
                    <div class="reviewer-name">${property.hostName || "Host"}<span class="review-role">Host</span></div>
                    <div class="review-date">${review.hostReplyCreatedAt ? new Date(review.hostReplyCreatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : ""}</div>
                  </div>
                </div>
                <p class="review-text">${review.hostReply}</p>
              </div>
            ` : ""}
          </div>
        `;
      })
      .join("");

    const reviewsToggle = document.getElementById("reviews-toggle");
    if (reviewsToggle) {
      reviewsToggle.style.display = Number(property.reviewsCount || 0) <= 4 ? "none" : "flex";
    }

    reviews.forEach((review, index) => {
      const reviewAvatar = document.getElementById(`review-avatar-${index}`);
      if (reviewAvatar) {
        reviewAvatar.onerror = function handleReviewAvatarError() {
          this.onerror = null;
          avatarUtils.applyAvatarFallback(this, assetBase);
        };
      }

      const hostReplyAvatar = document.getElementById(`host-reply-avatar-${index}`);
      if (hostReplyAvatar) {
        hostReplyAvatar.onerror = function handleHostReplyAvatarError() {
          this.onerror = null;
          avatarUtils.applyAvatarFallback(this, assetBase);
        };
      }
    });
  }

  function bindReviewsToggle() {
    const reviewsToggle = document.getElementById("reviews-toggle");
    const reviewsGrid = document.getElementById("reviews-grid");
    if (!reviewsToggle || !reviewsGrid) {
      return;
    }

    reviewsToggle.addEventListener("click", () => {
      const currentlyCollapsed = reviewsGrid.classList.contains("collapsed");
      if (currentlyCollapsed) {
        reviewsGrid.classList.remove("collapsed");
        reviewsToggle.classList.add("expanded");
        reviewsToggle.querySelector("span").textContent = "Hide reviews";
        return;
      }

      reviewsGrid.classList.add("collapsed");
      reviewsToggle.classList.remove("expanded");
      reviewsToggle.querySelector("span").textContent = "Show all reviews";
    });
  }

  window.RentlyPropertyReviews = {
    bindReviewsToggle,
    renderPropertyReviews,
  };
})(window);
