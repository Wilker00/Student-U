/**
 * Client-side image prep for note photos (orientation, contrast, crop).
 */
(function () {
  async function loadImageSource(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        return { kind: 'bitmap', value: bitmap, width: bitmap.width, height: bitmap.height };
      } catch (_error) {
        // Fall back to HTMLImageElement.
      }
    }

    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ kind: 'image', value: img, width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not load image.'));
      };
      img.src = url;
    });
  }

  function drawSource(ctx, source, width, height) {
    if (source.kind === 'bitmap') {
      ctx.drawImage(source.value, 0, 0, width, height);
      source.value.close?.();
      return;
    }
    ctx.drawImage(source.value, 0, 0, width, height);
  }

  function detectContentBounds(imageData, width, height) {
    let top = height;
    let left = width;
    let bottom = 0;
    let right = 0;
    const data = imageData.data;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (lum < 245) {
          if (y < top) top = y;
          if (x < left) left = x;
          if (y > bottom) bottom = y;
          if (x > right) right = x;
        }
      }
    }

    if (bottom <= top || right <= left) {
      return { x: 0, y: 0, width, height };
    }

    const pad = Math.round(Math.min(width, height) * 0.02);
    return {
      x: Math.max(0, left - pad),
      y: Math.max(0, top - pad),
      width: Math.min(width, right - left + pad * 2),
      height: Math.min(height, bottom - top + pad * 2),
    };
  }

  async function preprocessImageFile(file, options = {}) {
    if (!file || !String(file.type || '').startsWith('image/')) {
      return { file, dataUrl: null, enhanced: false };
    }

    const maxEdge = options.maxEdge || 1800;
    const source = await loadImageSource(file);
    const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { file, dataUrl: null, enhanced: false };

    drawSource(ctx, source, width, height);
    const bounds = detectContentBounds(ctx.getImageData(0, 0, width, height), width, height);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = bounds.width;
    cropCanvas.height = bounds.height;
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });
    cropCtx.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);

    const imageData = cropCtx.getImageData(0, 0, bounds.width, bounds.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const contrast = Math.min(255, Math.max(0, (lum - 128) * 1.35 + 128));
      data[i] = contrast;
      data[i + 1] = contrast;
      data[i + 2] = contrast;
    }
    cropCtx.putImageData(imageData, 0, 0);

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const dataUrl = cropCanvas.toDataURL(outputType, 0.92);
    const blob = await new Promise(resolve => cropCanvas.toBlob(resolve, outputType, 0.92));
    const enhancedFile = blob
      ? new File([blob], file.name, { type: blob.type, lastModified: Date.now() })
      : file;

    return { file: enhancedFile, dataUrl, enhanced: true };
  }

  window.StudentUImagePrep = {
    preprocessImageFile,
  };
})();
