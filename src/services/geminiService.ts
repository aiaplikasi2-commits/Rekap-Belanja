import { GoogleGenAI } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';
import { TransactionItem } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ExtractionProgress {
  currentPage: number;
  totalPages: number;
  statusText: string;
}

export interface ExtractionResult {
  satdikName: string;
  docNumber?: string;
  items: TransactionItem[];
  pdfHash: string;
}

export function calculatePdfHash(fileBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(fileBuffer);
  let hash = 0;
  for (let i = 0; i < bytes.length; i += 100) {
    hash = (hash << 5) - hash + bytes[i];
    hash |= 0;
  }
  return `HASH-${Math.abs(hash)}-${bytes.length}`;
}

export function cleanItemName(rawName: string): string {
  if (!rawName) return 'PERLU DIPERIKSA';
  let cleaned = rawName
    .replace(/\d+\s*[xX×]\s*Rp\.?\s*[\d.,\s]+/gi, '')
    .replace(/=\s*Rp\.?\s*[\d.,\s]+/gi, '')
    .trim();

  if (!cleaned) {
    cleaned = rawName.trim();
  }
  return cleaned;
}

export async function processPdfWithGemini(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractionResult> {
  const fileArrayBuffer = await file.arrayBuffer();
  const pdfHash = calculatePdfHash(fileArrayBuffer);

  const loadingTask = pdfjsLib.getDocument({ data: fileArrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  onProgress?.({
    currentPage: 0,
    totalPages,
    statusText: `Membuka PDF (${totalPages} halaman)...`,
  });

  const pageImages: string[] = [];
  let fullPdfText = '';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.({
      currentPage: pageNum,
      totalPages,
      statusText: `Membaca Halaman ${pageNum} dari ${totalPages}...`,
    });

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({
        canvasContext: context,
        viewport,
        canvas: canvas as any,
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      pageImages.push(dataUrl);
    }

    try {
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullPdfText += `\n--- HALAMAN ${pageNum} ---\n` + pageText;
    } catch (e) {
      console.warn(`Text extraction warning on page ${pageNum}:`, e);
    }
  }

  onProgress?.({
    currentPage: totalPages,
    totalPages,
    statusText: `Semua ${totalPages} halaman berhasil dibaca. Mengekstrak data dengan AI...`,
  });

  // Server API Proxy Call
  try {
    const res = await fetch('/api/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageImages,
        totalPages,
        extractedText: fullPdfText,
      }),
    });

    if (res.ok) {
      const parsedData = await res.json();
      const items: TransactionItem[] = (parsedData.items || []).map((it: any, index: number) => {
        const qty = Number(it.quantity) || 0;
        const prc = Number(it.price) || 0;
        const tot = Number(it.totalItem) || qty * prc;
        const cleanName = cleanItemName(it.itemName || '');

        return {
          no: index + 1,
          itemName: cleanName,
          quantity: qty,
          price: prc,
          totalItem: tot,
          needsReview: !!it.needsReview || !cleanName || cleanName === 'PERLU DIPERIKSA',
        };
      });

      return {
        satdikName: parsedData.satdikName || 'SATDIK UNKNOWN',
        docNumber: parsedData.docNumber || '',
        items,
        pdfHash,
      };
    }
  } catch (serverErr) {
    console.warn('Server proxy error, attempting fallback:', serverErr);
  }

  // Client Fallback
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY || '';

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      const imageParts = pageImages.map((dataUrl) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: dataUrl.split(',')[1],
        },
      }));

      const prompt = `
Ekstrak data dari PDF Invoice ini:
satdikName, docNumber, items: [ { no, itemName, quantity, price, totalItem, needsReview } ].
Format JSON saja. untuk itemName ambil nama utamanya saja, abaikan rincian perkaliannya.
      `;

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [...imageParts, prompt],
        });
        responseText = response.text || '';
      } catch (clientModelErr) {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: [...imageParts, prompt],
        });
        responseText = fallbackRes.text || '';
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        const items: TransactionItem[] = (parsedData.items || []).map((it: any, index: number) => {
          const qty = Number(it.quantity) || 0;
          const prc = Number(it.price) || 0;
          const tot = Number(it.totalItem) || qty * prc;
          const cleanName = cleanItemName(it.itemName || '');

          return {
            no: index + 1,
            itemName: cleanName,
            quantity: qty,
            price: prc,
            totalItem: tot,
            needsReview: !!it.needsReview || !cleanName || cleanName === 'PERLU DIPERIKSA',
          };
        });

        return {
          satdikName: parsedData.satdikName || 'SATDIK UNKNOWN',
          docNumber: parsedData.docNumber || '',
          items,
          pdfHash,
        };
      }
    } catch (e) {
      console.warn('Client gemini fallback error:', e);
    }
  }

  return fallbackTextExtraction(fullPdfText, pdfHash);
}

function fallbackTextExtraction(pdfText: string, pdfHash: string): ExtractionResult {
  let satdikName = 'PERLU DIPERIKSA';
  let docNumber = '';

  const satdikMatch = pdfText.match(/Nama\s*Satdik\s*:\s*([^\r\n]+)/i) ||
                      pdfText.match(/Perwakilan\s*Satdik\s*:\s*([^\r\n]+)/i) ||
                      pdfText.match(/Untuk\s*:?\s*([^\r\n]+)/i);
  if (satdikMatch) {
    satdikName = satdikMatch[1].trim();
  }

  const docMatch = pdfText.match(/NO\s*:\s*([^\r\n]+)/i);
  if (docMatch) {
    docNumber = docMatch[1].trim();
  }

  const items: TransactionItem[] = [];
  const lines = pdfText.split('\n');
  let itemCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const numMatch = line.match(/^(\d+)\s+(.+)/);
    if (numMatch && !line.includes('HALAMAN') && !line.includes('PROFORMA')) {
      items.push({
        no: itemCounter++,
        itemName: cleanItemName(numMatch[2].slice(0, 50)),
        quantity: 1,
        price: 0,
        totalItem: 0,
        needsReview: true,
      });
    }
  }

  if (items.length === 0) {
    items.push({
      no: 1,
      itemName: 'PERLU DIPERIKSA',
      quantity: 1,
      price: 0,
      totalItem: 0,
      needsReview: true,
    });
  }

  return {
    satdikName,
    docNumber,
    items,
    pdfHash,
  };
}
