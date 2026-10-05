import * as XLSX from 'xlsx';
import { Transaction, NotaPhoto } from '../types';

export function sanitizeFileName(name: string): string {
  if (!name) return 'SATDIK';
  return name.replace(/[\\/:*?"<>|]/g, '').trim().toUpperCase();
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Convert YYYY-MM-DD to DDMMYYYY string (e.g. 2023-05-31 -> 31052023)
export function formatDateCode(dateStr?: string): string {
  if (!dateStr) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}${m}${y}`;
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}${month.padStart(2, '0')}${year}`;
  }

  return dateStr.replace(/\D/g, '');
}

// Format sequence code (e.g. 1 -> "001")
export function formatSeqCode(seqNo?: number, idStr?: string): string {
  if (seqNo) {
    return String(seqNo).padStart(3, '0');
  }
  if (idStr) {
    const digits = idStr.replace(/\D/g, '');
    if (digits.length >= 3) {
      return digits.slice(-3);
    }
  }
  return '001';
}

// Standard base file prefix: [NAMA SATDIK] - [DDMMYYYY] - [001]
export function getStandardFilePrefix(transaction: Transaction): string {
  const cleanSatdik = sanitizeFileName(transaction.satdikName);
  const dateCode = formatDateCode(transaction.date);
  const seqCode = formatSeqCode(transaction.seqNo, transaction.id);
  return `${cleanSatdik} - ${dateCode} - ${seqCode}`;
}

// Generate Excel for SINGLE Transaction
export function generateTransactionExcel(transaction: Transaction) {
  const filePrefix = getStandardFilePrefix(transaction);
  const fileName = `${filePrefix} - REKAP BELANJA.xlsx`;

  // Columns: NO, NAMA BARANG, JUMLAH, HARGA SESUDAH PPN, TOTAL SESUDAH PPN
  const rows: any[] = [];
  transaction.items.forEach((item, index) => {
    rows.push({
      NO: index + 1,
      'NAMA BARANG': item.itemName,
      JUMLAH: item.quantity,
      'HARGA SESUDAH PPN': item.price,
      'TOTAL SESUDAH PPN': item.totalItem,
    });
  });

  // Summary Total Row
  rows.push({
    NO: '',
    'NAMA BARANG': 'TOTAL TRANSAKSI',
    JUMLAH: '',
    'HARGA SESUDAH PPN': '',
    'TOTAL SESUDAH PPN': transaction.totalAmount,
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet['!cols'] = [
    { wch: 6 },  // NO
    { wch: 40 }, // NAMA BARANG
    { wch: 10 }, // JUMLAH
    { wch: 22 }, // HARGA SESUDAH PPN
    { wch: 22 }, // TOTAL SESUDAH PPN
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Belanja');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { blob, fileName };
}

// Generate MASTER Excel for ALL/FILTERED Transactions
export function generateAllTransactionsExcel(transactions: Transaction[]) {
  const todayCode = formatDateCode();
  const fileName = `REKAP KESELURUHAN BELANJA - ${todayCode}.xlsx`;

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Ringkasan Transaksi
  const summaryRows: any[] = transactions.map((tx, idx) => ({
    NO: idx + 1,
    'NAMA SATDIK': tx.satdikName,
    TANGGAL: tx.date,
    'NO INVOICE': tx.invoiceDocNumber || '-',
    'JUMLAH ITEM': tx.items?.length || 0,
    'TOTAL SESUDAH PPN': tx.totalAmount,
    'STATUS NOTA': tx.hasNota && tx.notaFiles?.length > 0 ? 'ADA NOTA' : 'BELUM ADA NOTA',
  }));

  const grandTotal = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  summaryRows.push({
    NO: '',
    'NAMA SATDIK': 'TOTAL KESELURUHAN',
    TANGGAL: '',
    'NO INVOICE': '',
    'JUMLAH ITEM': '',
    'TOTAL SESUDAH PPN': grandTotal,
    'STATUS NOTA': '',
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [
    { wch: 6 },  // NO
    { wch: 35 }, // NAMA SATDIK
    { wch: 14 }, // TANGGAL
    { wch: 25 }, // NO INVOICE
    { wch: 14 }, // JUMLAH ITEM
    { wch: 22 }, // TOTAL SESUDAH PPN
    { wch: 18 }, // STATUS NOTA
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Transaksi');

  // Sheet 2: Rincian Semua Barang
  const detailRows: any[] = [];
  let itemCounter = 1;
  transactions.forEach((tx) => {
    tx.items.forEach((it) => {
      detailRows.push({
        NO: itemCounter++,
        TANGGAL: tx.date,
        'NAMA SATDIK': tx.satdikName,
        'NAMA BARANG': it.itemName,
        JUMLAH: it.quantity,
        'HARGA SESUDAH PPN': it.price,
        'TOTAL SESUDAH PPN': it.totalItem,
      });
    });
  });

  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet['!cols'] = [
    { wch: 6 },  // NO
    { wch: 14 }, // TANGGAL
    { wch: 30 }, // NAMA SATDIK
    { wch: 35 }, // NAMA BARANG
    { wch: 10 }, // JUMLAH
    { wch: 22 }, // HARGA SESUDAH PPN
    { wch: 22 }, // TOTAL SESUDAH PPN
  ];
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Rincian Barang');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { blob, fileName };
}

// Convert Base64 / Data URL to File object
export function dataUrlToFile(dataUrl: string, fileName: string): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}

// Download fallback helper
export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Build formatted text summary for sharing
export function buildTransactionShareText(transaction: Transaction): string {
  const itemsText = (transaction.items || [])
    .map(
      (it, idx) =>
        `${idx + 1}. ${it.itemName}\n   • Qty: ${it.quantity} x ${formatRupiah(it.price)} = ${formatRupiah(it.totalItem)}`
    )
    .join('\n');

  return `📋 *REKAP BELANJA ONLINE*
━━━━━━━━━━━━━━━━━━━━
🏫 *Satdik*: ${transaction.satdikName}
📅 *Tanggal*: ${transaction.date}
📄 *No Invoice*: ${transaction.invoiceDocNumber || '-'}
💰 *TOTAL BELANJA*: ${formatRupiah(transaction.totalAmount)}
━━━━━━━━━━━━━━━━━━━━
*RINCIAN BARANG/JASA*:
${itemsText}

------------------------------------
*Diunggah via Aplikasi Rekap Belanja Online*`;
}

// Share directly to WhatsApp
export function shareToWhatsApp(transaction: Transaction) {
  const text = buildTransactionShareText(transaction);
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
}

// Share directly to Email / Gmail
export function shareToEmail(transaction: Transaction) {
  const subject = `Rekap Belanja - ${transaction.satdikName} (${transaction.date})`;
  const body = buildTransactionShareText(transaction);
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;
}

import { uploadFileToGoogleDrive } from './googleDriveService';

// Share to Google Drive directly without forcing local downloads
export async function shareToGoogleDrive(transaction: Transaction) {
  const { blob, fileName } = generateTransactionExcel(transaction);
  try {
    const result = await uploadFileToGoogleDrive(
      blob,
      fileName,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    window.open(result.webViewLink, '_blank');
    return result;
  } catch (err: any) {
    console.error('Error uploading to Google Drive:', err);
    alert(err?.message || 'Gagal menyimpan file ke Google Drive.');
  }
}

// Android / Native Web Share Sheet Action
export async function shareFilesToAndroid(files: File[], title: string, text: string) {
  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({
        title,
        text,
        files,
      });
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error sharing files:', err);
      }
    }
  }

  // Fallback: Share via WhatsApp web if native file share is unsupported in preview/desktop
  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n${text}`)}`;
  window.open(waUrl, '_blank');
  return false;
}

export async function shareExcelTransaction(transaction: Transaction) {
  const { blob, fileName } = generateTransactionExcel(transaction);
  const file = new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return shareFilesToAndroid(
    [file],
    `Rekap Belanja - ${transaction.satdikName}`,
    `Berikut rekap belanja untuk ${transaction.satdikName} (Total: ${formatRupiah(transaction.totalAmount)})`
  );
}

export async function shareAllTransactionsExcel(transactions: Transaction[]) {
  const { blob, fileName } = generateAllTransactionsExcel(transactions);
  const file = new File([blob], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return shareFilesToAndroid(
    [file],
    `Rekap Keseluruhan Belanja`,
    `Berikut file rekapitulasi keseluruhan transaksi belanja (${transactions.length} transaksi)`
  );
}

export async function shareNotaPhoto(transaction: Transaction, nota: NotaPhoto) {
  const prefix = getStandardFilePrefix(transaction);
  const file = dataUrlToFile(nota.dataUrl, nota.fileName || `${prefix} - NOTA.jpg`);

  return shareFilesToAndroid(
    [file],
    `Nota Asli - ${transaction.satdikName}`,
    `Bukti foto nota asli untuk ${transaction.satdikName}`
  );
}

export async function shareAllNotas(transaction: Transaction) {
  const prefix = getStandardFilePrefix(transaction);
  const files: File[] = transaction.notaFiles.map((nota, idx) => {
    const padNum = String(idx + 1).padStart(2, '0');
    const fName = `${prefix} - NOTA ${padNum}.jpg`;
    return dataUrlToFile(nota.dataUrl, fName);
  });

  return shareFilesToAndroid(
    files,
    `Semua Nota Asli - ${transaction.satdikName}`,
    `Seluruh bukti nota asli untuk ${transaction.satdikName}`
  );
}

export async function shareAllTransactionFiles(transaction: Transaction) {
  const files: File[] = [];
  const prefix = getStandardFilePrefix(transaction);

  // 1. Excel File
  const { blob, fileName } = generateTransactionExcel(transaction);
  files.push(
    new File([blob], fileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  );

  // 2. Nota Photos (JPG)
  transaction.notaFiles.forEach((nota, idx) => {
    const padNum = String(idx + 1).padStart(2, '0');
    const fName = `${prefix} - NOTA ${padNum}.jpg`;
    files.push(dataUrlToFile(nota.dataUrl, fName));
  });

  // 3. Invoice PDF if available
  if (transaction.invoicePdfData) {
    const pdfFileName = `${prefix} - INVOICE.pdf`;
    files.push(dataUrlToFile(transaction.invoicePdfData, pdfFileName));
  }

  return shareFilesToAndroid(
    files,
    `Dokumen Lengkap - ${transaction.satdikName}`,
    `Rekap Belanja, Nota, dan Invoice untuk ${transaction.satdikName}`
  );
}
