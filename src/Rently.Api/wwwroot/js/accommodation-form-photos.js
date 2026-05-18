(function createAccommodationFormPhotos(window) {
  if (!window) return;

  const photosModule = window.RentlyAccommodationFormPhotos || {};

  photosModule.setPhotoPickerButtonText = function setPhotoPickerButtonText(
    button,
    hasPhotos,
  ) {
    if (!button) return;
    button.textContent = hasPhotos ? "Add More Photos" : "Select Photos";
  };

  photosModule.togglePhotoDropZone = function togglePhotoDropZone(
    dropZone,
    hasPhotos,
  ) {
    if (!dropZone) return;
    dropZone.classList.toggle("d-none", hasPhotos);
  };

  photosModule.createPhotoPickerButton = function createPhotoPickerButton(
    options = {},
  ) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = options.className || "btn btn-outline-primary mt-3";
    button.textContent = options.emptyText || "Select Photos";
    button.addEventListener("click", () => {
      if (typeof options.onClick === "function") {
        options.onClick();
      }
    });
    return button;
  };

  photosModule.createPhotoTile = function createPhotoTile(
    photoSrc,
    index,
    options = {},
  ) {
    const wrapper = document.createElement("div");
    wrapper.className =
      options.wrapperClassName ||
      "position-relative border rounded overflow-hidden shadow-sm";
    wrapper.style.width = options.width || "140px";
    wrapper.style.height = options.height || "140px";
    wrapper.style.backgroundColor = options.backgroundColor || "#e0e0e0";

    if (options.display === "inline-block") {
      wrapper.style.margin = options.margin || "8px";
      wrapper.style.display = "inline-block";
      wrapper.style.border = options.border || "1px solid #ddd";
      wrapper.style.borderRadius = options.borderRadius || "8px";
      wrapper.style.boxShadow =
        options.boxShadow || "0 2px 4px rgba(0,0,0,0.1)";
      wrapper.style.overflow = "hidden";
    }

    const image = document.createElement("img");
    image.src = photoSrc;
    image.alt = options.alt || `Photo ${index + 1}`;
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    image.style.display = options.imageDisplay || "";
    wrapper.appendChild(image);

    if (index === 0) {
      const badge = document.createElement("span");
      badge.textContent = "Cover";
      if (options.coverBadgeClassName) {
        badge.className = options.coverBadgeClassName;
      } else {
        badge.style.cssText = `
          position: absolute;
          top: 8px;
          left: 8px;
          background: #2986FE;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
        `;
      }
      wrapper.appendChild(badge);
    }

    if (typeof options.onDelete === "function") {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.innerHTML = options.deleteLabel || "×";

      if (options.deleteButtonClassName) {
        deleteButton.className = options.deleteButtonClassName;
      } else {
        deleteButton.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        `;
      }

      if (options.deleteButtonStyle) {
        deleteButton.style.cssText = options.deleteButtonStyle;
      }

      deleteButton.addEventListener("click", (event) => {
        event.preventDefault();
        options.onDelete(index);
      });
      wrapper.appendChild(deleteButton);
    }

    return wrapper;
  };

  photosModule.normalizeImageToDataUrl = async function normalizeImageToDataUrl(
    file,
    targetWidth = 1600,
    targetHeight = 1000,
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Could not create canvas context"));
              return;
            }

            const srcW = img.naturalWidth || img.width;
            const srcH = img.naturalHeight || img.height;
            const targetRatio = targetWidth / targetHeight;
            const srcRatio = srcW / srcH;

            let cropW = srcW;
            let cropH = srcH;
            let cropX = 0;
            let cropY = 0;

            if (srcRatio > targetRatio) {
              cropW = srcH * targetRatio;
              cropX = (srcW - cropW) / 2;
            } else {
              cropH = srcW / targetRatio;
              cropY = (srcH - cropH) / 2;
            }

            ctx.drawImage(
              img,
              cropX,
              cropY,
              cropW,
              cropH,
              0,
              0,
              targetWidth,
              targetHeight,
            );

            resolve(canvas.toDataURL("image/jpeg", 0.9));
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error("Could not decode image"));
        img.src = String(reader.result || "");
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  };

  photosModule.readFileAsDataUrl = async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(String(event.target?.result || ""));
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });
  };

  photosModule.createPhotoCollectionController =
    function createPhotoCollectionController(options = {}) {
      const photoUpload = options.photoUpload;
      const photoPreviewGrid = options.photoPreviewGrid;
      const dropZone = options.dropZone;
      const onPhotosChanged = options.onPhotosChanged;
      const setValidationState = options.setValidationState;
      let photos = (
        Array.isArray(options.initialPhotos) ? options.initialPhotos : []
      ).filter(Boolean);

      const addMorePhotosBtn = photosModule.createPhotoPickerButton({
        className: options.buttonClassName,
        emptyText: options.emptyButtonText,
        onClick() {
          if (!photoUpload) return;
          photoUpload.value = "";
          photoUpload.click();
        },
      });

      function syncActionState() {
        const hasPhotos = photos.length > 0;
        photosModule.togglePhotoDropZone(dropZone, hasPhotos);
        photosModule.setPhotoPickerButtonText(addMorePhotosBtn, hasPhotos);
        if (typeof onPhotosChanged === "function") {
          onPhotosChanged([...photos]);
        }
      }

      function setPhotos(nextPhotos) {
        photos = (Array.isArray(nextPhotos) ? nextPhotos : []).filter(Boolean);
        render();
      }

      function removePhoto(index) {
        photos = photos.filter((_, photoIndex) => photoIndex !== index);
        render();
      }

      function render() {
        if (photoPreviewGrid) {
          photoPreviewGrid.innerHTML = "";

          photos.forEach((photoSrc, index) => {
            const baseTileOptions =
              typeof options.resolveTileOptions === "function"
                ? options.resolveTileOptions(photoSrc, index, {
                    getPhotos: () => [...photos],
                    setPhotos,
                    removePhoto,
                  }) || {}
                : {};

            const wrapper = photosModule.createPhotoTile(photoSrc, index, {
              ...baseTileOptions,
              onDelete() {
                removePhoto(index);
              },
            });

            if (wrapper) {
              photoPreviewGrid.appendChild(wrapper);
            }
          });
        }

        syncActionState();
        if (typeof setValidationState === "function") {
          setValidationState(false);
        }
      }

      async function processFiles(fileList) {
        const files = Array.from(fileList || []);
        for (const file of files) {
          try {
            const normalizedPhoto =
              typeof options.normalizePhoto === "function"
                ? await options.normalizePhoto(file)
                : await photosModule.normalizeImageToDataUrl(file);
            if (!normalizedPhoto) continue;
            photos.push(normalizedPhoto);
          } catch (error) {
            console.error("Photo normalization failed:", error);
          }
        }

        render();

        if (photoUpload) {
          photoUpload.value = "";
        }
      }

      if (photoUpload) {
        photoUpload.addEventListener("change", async (event) => {
          await processFiles(event.target?.files);
        });
      }

      if (dropZone) {
        dropZone.addEventListener("dragover", (event) => {
          event.preventDefault();
          dropZone.style.backgroundColor = "#f0f0f0";
        });

        dropZone.addEventListener("dragleave", () => {
          dropZone.style.backgroundColor = "";
        });

        dropZone.addEventListener("drop", async (event) => {
          event.preventDefault();
          dropZone.style.backgroundColor = "";
          await processFiles(event.dataTransfer?.files);
        });

        const dropZoneButton = dropZone.querySelector("button");
        dropZoneButton?.addEventListener("click", () => {
          if (!photoUpload) return;
          photoUpload.value = "";
          photoUpload.click();
        });
      }

      const photoActionContainer =
        options.photoActionContainer || photoPreviewGrid?.parentElement;
      if (photoActionContainer && !addMorePhotosBtn.isConnected) {
        photoActionContainer.appendChild(addMorePhotosBtn);
      }

      render();

      return {
        getPhotos: () => [...photos],
        processFiles,
        removePhoto,
        setPhotos,
      };
    };

  photosModule.uploadInlinePhotos = async function uploadInlinePhotos(
    token,
    photos,
  ) {
    const normalizedPhotos = Array.isArray(photos) ? photos : [];
    const uploaded = [];

    for (const photo of normalizedPhotos) {
      if (!photo) continue;
      if (!String(photo).startsWith("data:")) {
        uploaded.push(photo);
        continue;
      }

      const response = await fetch("/api/Images/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ dataUrl: photo }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Failed to upload listing photo.");
      }

      const payload = await response.json();
      if (payload?.url) {
        uploaded.push(payload.url);
      }
    }

    return uploaded;
  };

  window.RentlyAccommodationFormPhotos = photosModule;
})(window);
