import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/api/parse-pdf', async (req, res) => {
  try {
    const { pageImages, totalPages, extractedText } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY tidak dikonfigurasi pada server environment.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Format page image parts for Gemini API
    const imageParts = (pageImages || []).map((dataUrl: string) => {
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      };
    });

    const prompt = `
Anda adalah sistem OCR dan ekstraksi data invoice/SIPLah/Proforma Invoice profesional.
Analisis SELURUH GAMBAR HALAMAN PDF berikut (halaman 1 hingga ${totalPages}) serta teks dokumen berikut:

TEKS DARI DOKUMEN PDF:
${(extractedText || '').slice(0, 6000)}

PETUNJUK EKSTRAKSI SECARA PRESISI:
1. NAMA SATDIK (Sekolah / Satuan Pendidikan):
   - Ambil Nama Satdik dari dokumen (Contoh: "SD NEGERI CIKETING UDIK 4", "SMPIT AL IKHLAS").
   - Jika Nama Satdik berada di halaman 1, gunakan Nama Satdik yang sama untuk seluruh item.

2. NOMOR DOKUMEN / INVOICE:
   - Ambil nomor invoice/proforma jika tersedia (Contoh: "8187426/INV/PO68EC9CE2EAB16/PROFORMA").

3. NAMA BARANG (itemName):
   - Ambil HANYA JUDUL UTAMA BARANG/JASA dari kolom "Barang/jasa" (Contoh: "Kertas Raport", "Sound System Indoor", "Sampul Ijazah", "Foto Siswa", "Kabel Eterna NYM").
   - JANGAN MEMASUKKAN subteks/catatan perkalian seperti "25 X Rp. 200,000 = Rp. 5,000,000" ke dalam Nama Barang! Potong dan ambil nama barangnya saja.

4. JUMLAH (quantity):
   - Gunakan angka dari kolom "Kuantitas Terima" (atau "Kuantitas Pesan" jika Terima tidak ada).
   - Contoh: 25, 2, 92, 82, 120.

5. HARGA (price):
   - Harga yang digunakan WAJIB dari kolom "Harga sebelum PPN" (harga satuan sebelum PPN).
   - Contoh: 180180 (dari Rp. 180,180), 7522523, 45045.
   - JANGAN menggunakan PPN, DPP, atau Grand Total.
   - Masukkan angka murni tanpa simbol 'Rp' atau titik.

6. TOTAL ITEM (totalItem):
   - Gunakan angka dari kolom "Total Harga sebelum PPN" (JUMLAH × HARGA SEBELUM PPN).
   - Contoh: 4504500 (dari Rp. 4,504,500).

Kembalikan HANYA format JSON berikut tanpa markdown atau teks tambahan:
{
  "satdikName": "SD NEGERI CIKETING UDIK 4",
  "docNumber": "8187426/INV/PROFORMA",
  "items": [
    {
      "no": 1,
      "itemName": "Kertas Raport",
      "quantity": 25,
      "price": 180180,
      "totalItem": 4504500,
      "needsReview": false
    }
  ]
}
    `;

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-1.5-flash'];
    let responseText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [...imageParts, prompt],
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed or quota exceeded:`, err?.message || err);
      }
    }

    if (!responseText) {
      return res.status(429).json({
        quotaExceeded: true,
        error: 'Batas kuota harian Gemini AI tercapai. Mengalihkan ke ekstraktor PDF lokal.',
        details: lastError?.message || 'Quota exceeded',
      });
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Output AI tidak menghasilkan format JSON yang dapat dibaca.');
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Server PDF parsing error:', error);
    return res.status(500).json({
      error: error.message || 'Gagal memproses PDF dengan Gemini AI.',
    });
  }
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
