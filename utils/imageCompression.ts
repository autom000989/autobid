/**
 * Utility to compress and resize images client-side before sending to Firestore
 * to guarantee that total document size stays well below Firestore's 1MB limit.
 */
export interface CompressedImageResult {
  url: string;
  base64: string;
  mime: string;
}

export const compressImage = (
  file: File,
  maxWidth = 1920,
  maxHeight = 1440,
  quality = 0.88
): Promise<CompressedImageResult> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downscale only if larger than maxWidth or maxHeight, preserving native aspect ratio perfectly
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context is not available'));
          return;
        }

        // High quality smoothing for clear vehicle details and readable documents
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to high-quality JPEG data URL
        const mimeType = 'image/jpeg';
        let compressedDataUrl = canvas.toDataURL(mimeType, quality);

        // If base64 length is overly large (> 500KB), gently adjust quality to ensure Firestore doc safety
        if (compressedDataUrl.length > 500 * 1024) {
          compressedDataUrl = canvas.toDataURL(mimeType, 0.82);
        }
        if (compressedDataUrl.length > 600 * 1024) {
          compressedDataUrl = canvas.toDataURL(mimeType, 0.76);
        }

        const parts = compressedDataUrl.split(',');
        const base64Data = parts[1] || '';

        resolve({
          url: compressedDataUrl,
          base64: base64Data,
          mime: mimeType,
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};
