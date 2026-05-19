(function createPropertyReviewComposer(window) {
  async function renderReviewComposer(propertyId, token) {
    const container = document.getElementById("review-composer-container");
    if (!container || !token) {
      if (container) container.innerHTML = "";
      return;
    }

    try {
      const response = await fetch(
        `/api/Reviews/eligibility?accommodationId=${encodeURIComponent(propertyId)}`,
        { headers: { Authorization: "Bearer " + token } },
      );

      if (!response.ok) {
        container.innerHTML = "";
        return;
      }

      const eligibility = await response.json();
      if (!eligibility.canReview && !eligibility.hasExistingReview) {
        container.innerHTML = "";
        return;
      }

      const currentRating = Number(eligibility.rating || 5);
      const currentComment = eligibility.comment || "";

      container.innerHTML = `
        <div class="review-composer-card">
          <h4 class="fw-bold mb-2">${eligibility.hasExistingReview ? "Edit your review" : "Share your experience"}</h4>
          <p class="text-muted small mb-3">Your comment will be visible to other guests and to the host.</p>
          <div class="mb-3">
            <label class="form-label fw-semibold">Rating</label>
            <div class="review-composer-stars" id="review-rating-stars" role="radiogroup" aria-label="Rating">
              ${[1, 2, 3, 4, 5]
                .map((value) => `<button class="review-star-btn ${value <= currentRating ? "is-active" : ""}" type="button" data-rating="${value}" aria-label="${value} star${value === 1 ? "" : "s"}">★</button>`)
                .join("")}
              <span class="review-star-label" id="review-rating-label">${currentRating} / 5</span>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Comment</label>
            <textarea id="review-comment-input" class="form-control review-composer-textarea" rows="5" placeholder="Tell others about your stay...">${currentComment}</textarea>
          </div>
          <button id="review-submit-btn" class="btn btn-primary rounded-pill px-4" type="button">${eligibility.hasExistingReview ? "Update review" : "Publish review"}</button>
        </div>
      `;

      let selectedRating = currentRating;
      const ratingButtons = Array.from(container.querySelectorAll(".review-star-btn"));
      const ratingLabel = document.getElementById("review-rating-label");

      const applyRatingState = (rating) => {
        selectedRating = Number(rating) || 0;
        ratingButtons.forEach((button) => {
          const value = Number(button.dataset.rating || 0);
          button.classList.toggle("is-active", value <= selectedRating);
        });
        if (ratingLabel) {
          ratingLabel.textContent = `${selectedRating} / 5`;
        }
      };

      ratingButtons.forEach((button) => {
        button.addEventListener("click", () => {
          applyRatingState(Number(button.dataset.rating || 0));
        });
      });

      const submitBtn = document.getElementById("review-submit-btn");
      submitBtn?.addEventListener("click", async () => {
        const rating = selectedRating;
        const comment = document.getElementById("review-comment-input")?.value?.trim() || "";

        if (!rating || !comment) {
          alert("Please add both rating and comment.");
          return;
        }

        submitBtn.disabled = true;
        try {
          const saveResponse = await fetch("/api/Reviews", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({
              accommodationId: Number(propertyId),
              rating,
              comment,
            }),
          });

          if (!saveResponse.ok) {
            const payload = await saveResponse.json().catch(() => null);
            throw new Error(payload?.message || "Failed to save review.");
          }

          window.location.reload();
        } catch (error) {
          alert(error.message || "Failed to save review.");
        } finally {
          submitBtn.disabled = false;
        }
      });
    } catch (error) {
      console.debug("Could not load review eligibility:", error);
      container.innerHTML = "";
    }
  }

  window.RentlyPropertyReviewComposer = {
    renderReviewComposer,
  };
})(window);
