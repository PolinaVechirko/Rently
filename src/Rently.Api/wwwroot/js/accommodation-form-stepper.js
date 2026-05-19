(function createAccommodationFormStepper(window) {
  if (!window) return;

  const stepperModule = window.RentlyAccommodationFormStepper || {};

  stepperModule.createStepperController = function createStepperController(
    options = {},
  ) {
    const totalSteps = Number(options.totalSteps || 1);
    let currentStep = Number(options.initialStep || 1);

    function render() {
      document.querySelectorAll(".step").forEach((step) => {
        const stepNum = parseInt(step.getAttribute("data-step"), 10);
        step.classList.remove("active", "completed");

        if (stepNum === currentStep) {
          step.classList.add("active");
        } else if (stepNum < currentStep) {
          step.classList.add("completed");
        }
      });

      document.querySelectorAll(".form-step").forEach((stepEl) => {
        stepEl.classList.add("d-none");
      });

      const currentForm = document.getElementById(`step-${currentStep}`);
      if (currentForm) {
        currentForm.classList.remove("d-none");
      }

      if (typeof options.onStepChanged === "function") {
        options.onStepChanged(currentStep);
      }
    }

    function setStep(nextStep) {
      currentStep = Math.min(Math.max(Number(nextStep || 1), 1), totalSteps);
      render();
    }

    function validateStep(stepNumber) {
      const currentForm = document.getElementById(`step-${stepNumber}`);
      if (!currentForm) return true;

      let isValid = true;
      currentForm
        .querySelectorAll(
          "input[required], select[required], textarea[required]",
        )
        .forEach((input) => {
          if (!input.value.trim()) {
            isValid = false;
            input.classList.add("is-invalid");
          } else {
            input.classList.remove("is-invalid");
          }
        });

      return isValid;
    }

    function bind() {
      document.querySelectorAll(".step").forEach((stepEl) => {
        stepEl.addEventListener("click", () => {
          const targetStep = parseInt(stepEl.getAttribute("data-step"), 10);
          setStep(targetStep);
          window.scrollTo(0, 0);
        });
      });

      document.querySelectorAll(".next-btn").forEach((button) => {
        button.addEventListener("click", () => {
          if (!validateStep(currentStep)) return;
          if (currentStep < totalSteps) {
            setStep(currentStep + 1);
            window.scrollTo(0, 0);
          }
        });
      });

      document.querySelectorAll(".prev-btn").forEach((button) => {
        button.addEventListener("click", () => {
          if (currentStep > 1) {
            setStep(currentStep - 1);
            window.scrollTo(0, 0);
          }
        });
      });
    }

    return {
      bind,
      render,
      validateStep,
      getCurrentStep: () => currentStep,
      setStep,
    };
  };

  stepperModule.initListingStatusControls = function initListingStatusControls(
    options = {},
  ) {
    const datePickerInput = options.datePickerInput;
    const datePickerContainer = options.datePickerContainer;

    if (datePickerInput && typeof window.flatpickr === "function") {
      window.flatpickr(datePickerInput, {
        dateFormat: "Y-m-d",
        minDate: "today",
        disableMobile: true,
      });
    }

    function syncUi(statusValue) {
      document.querySelectorAll(".custom-radio-card").forEach((card) => {
        card.classList.remove("active");
      });

      Array.from(document.getElementsByName("listing-status")).forEach(
        (radio) => {
          const isSelected = radio.value === statusValue;
          radio.checked = isSelected;
          if (isSelected) {
            radio.closest(".custom-radio-card")?.classList.add("active");
          }
        },
      );

      if (datePickerContainer) {
        datePickerContainer.classList.toggle(
          "d-none",
          statusValue !== "Upcoming",
        );
      }
    }

    Array.from(document.getElementsByName("listing-status")).forEach(
      (radio) => {
        radio.addEventListener("change", (event) => {
          syncUi(event.target.value);
        });
      },
    );

    function applySelection(statusValue, availableFromValue = "") {
      syncUi(statusValue);
      if (datePickerInput) {
        datePickerInput.value = availableFromValue || "";
      }
    }

    function getPayload() {
      const isUpcoming = !!document.querySelector(
        'input[name="listing-status"][value="Upcoming"]',
      )?.checked;
      const availableFromValue = datePickerInput?.value || "";

      if (isUpcoming) {
        return {
          isActive: true,
          visibleFrom: availableFromValue || null,
        };
      }

      const resolveInactiveState = options.resolveInactiveState;
      if (typeof resolveInactiveState === "function") {
        const inactivePayload = resolveInactiveState();
        if (inactivePayload) {
          return inactivePayload;
        }
      }

      return {
        isActive: true,
        visibleFrom: null,
      };
    }

    return {
      applySelection,
      getPayload,
      syncUi,
    };
  };

  window.RentlyAccommodationFormStepper = stepperModule;
})(window);
