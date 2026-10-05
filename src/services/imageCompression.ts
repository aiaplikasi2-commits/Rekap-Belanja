// Helper to compress Base64 image data URL to ensure document fits within Firestore limits (< 1MB)
export async function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.55
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length < 30000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

// Safely sanitize transaction payload for ultra-fast Firestore online sync (< 200KB)
export async function sanitizeTransactionForFirestore(transaction: any): Promise<any> {
  const sanitized = { ...transaction };

  // 1. Omit raw heavy PDF dataUrl string from Firestore document payload
  // We keep hasInvoicePdf and invoiceFileName so metadata and exports remain intact
  if (sanitized.invoicePdfData) {
    delete sanitized.invoicePdfData;
    sanitized.hasInvoicePdf = true;
  }

  // 2. Aggressively compress Nota Photos if present
  if (sanitized.notaFiles && Array.isArray(sanitized.notaFiles)) {
    sanitized.notaFiles = await Promise.all(
      sanitized.notaFiles.map(async (nota: any) => {
        if (nota.dataUrl && nota.dataUrl.length > 30000) {
          const tinyUrl = await compressImageDataUrl(nota.dataUrl, 800, 800, 0.55);
          return { ...nota, dataUrl: tinyUrl };
        }
        return nota;
      })
    );
  }

  return sanitized;
}
