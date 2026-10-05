import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transaction, NotaPhoto } from '../types';

export function generateTransactionId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRX-${dateStr}-${rand}`;
}

// Local Storage Cache Helpers
function getTxCacheKey(userId: string): string {
  return `REKAP_TX_CACHE_${userId}`;
}

export function getLocalCachedTransactions(userId: string): Transaction[] {
  try {
    const raw = localStorage.getItem(getTxCacheKey(userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local tx cache:', e);
  }
  return [];
}

export function saveLocalCachedTransaction(transaction: Transaction): void {
  try {
    const list = getLocalCachedTransactions(transaction.userId);
    const existingIndex = list.findIndex((t) => t.id === transaction.id);
    if (existingIndex >= 0) {
      list[existingIndex] = transaction;
    } else {
      list.unshift(transaction);
    }
    localStorage.setItem(getTxCacheKey(transaction.userId), JSON.stringify(list));
  } catch (e) {
    console.warn('Error saving local tx cache:', e);
  }
}

export function removeLocalCachedTransaction(userId: string, transactionId: string): void {
  try {
    const list = getLocalCachedTransactions(userId).filter((t) => t.id !== transactionId);
    localStorage.setItem(getTxCacheKey(userId), JSON.stringify(list));
  } catch (e) {
    console.warn('Error removing local tx cache:', e);
  }
}

/**
 * Sanitize transaction payload to prevent Firestore 1MB document size limit errors.
 * If Base64 strings exceed 300KB, create a lightweight copy for Firestore.
 */
function sanitizeTxForFirestore(tx: Transaction): Transaction {
  const copy = { ...tx };

  // Truncate invoicePdfData if it exceeds 300,000 chars (~220KB)
  if (copy.invoicePdfData && copy.invoicePdfData.length > 300000) {
    copy.invoicePdfData = copy.invoicePdfData.slice(0, 300000);
  }

  // Truncate nota files if total size is huge
  if (copy.notaFiles && copy.notaFiles.length > 0) {
    copy.notaFiles = copy.notaFiles.map((n) => {
      if (n.dataUrl && n.dataUrl.length > 200000) {
        return { ...n, dataUrl: n.dataUrl.slice(0, 200000) };
      }
      return n;
    });
  }

  return copy;
}

export async function checkDuplicatePdf(
  userId: string,
  pdfHash: string,
  docNumber?: string
): Promise<Transaction | null> {
  const localList = getLocalCachedTransactions(userId);
  for (const data of localList) {
    if (pdfHash && data.pdfHash === pdfHash) return data;
    if (docNumber && docNumber.trim() !== '' && data.invoiceDocNumber === docNumber) return data;
  }

  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Transaction;
      if (pdfHash && data.pdfHash === pdfHash) return data;
      if (docNumber && docNumber.trim() !== '' && data.invoiceDocNumber === docNumber) return data;
    }
    return null;
  } catch (error) {
    console.warn('Duplicate check online error, using local result:', error);
    return null;
  }
}

/**
 * Save transaction instantly to local storage and sync to Firestore in background (non-blocking).
 */
export function saveTransactionOnline(transaction: Transaction): void {
  // Always store locally first for instant availability (0ms)
  saveLocalCachedTransaction(transaction);

  if (!transaction.userId) return;

  const sanitized = sanitizeTxForFirestore(transaction);
  const docRef = doc(db, 'transactions', transaction.id);

  // Background non-blocking write to Firestore
  setDoc(docRef, sanitized).catch((error) => {
    console.warn('Background transaction setDoc deferred:', error);
  });
}

export async function getUserTransactionsOnline(userId: string): Promise<Transaction[]> {
  const localList = getLocalCachedTransactions(userId);
  if (!userId) return localList;

  // 1.5s timeout race for fetching online transactions
  const timeoutPromise = new Promise<Transaction[]>((resolve) => {
    setTimeout(() => resolve(localList), 1500);
  });

  const fetchPromise = (async () => {
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const onlineList: Transaction[] = [];

      snapshot.forEach((docSnap) => {
        onlineList.push(docSnap.data() as Transaction);
      });

      // Merge online transactions with local cache (avoid duplicates by ID)
      const txMap = new Map<string, Transaction>();
      localList.forEach((t) => txMap.set(t.id, t));
      onlineList.forEach((t) => txMap.set(t.id, t));

      const combined = Array.from(txMap.values());
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Update local cache
      try {
        localStorage.setItem(getTxCacheKey(userId), JSON.stringify(combined));
      } catch (e) {}

      return combined;
    } catch (error) {
      console.warn('Fetching online transactions failed, returning local cache:', error);
      return localList;
    }
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

export async function addNotaPhotosOnline(
  transactionId: string,
  newNotas: NotaPhoto[]
): Promise<Transaction | null> {
  try {
    const docRef = doc(db, 'transactions', transactionId);
    const localList = getLocalCachedTransactions('');
    const currentTx = localList.find((t) => t.id === transactionId) || null;

    if (!currentTx) return null;

    const updatedNotas = [...(currentTx.notaFiles || []), ...newNotas];
    const updatedData = {
      notaFiles: updatedNotas,
      hasNota: updatedNotas.length > 0,
      updatedAt: new Date().toISOString(),
    };

    const fullUpdated = { ...currentTx, ...updatedData };
    saveLocalCachedTransaction(fullUpdated);

    // Async write to Firestore
    updateDoc(docRef, updatedData).catch((err) =>
      console.warn('Background updateDoc failed:', err)
    );

    return fullUpdated;
  } catch (error) {
    console.warn('Error adding nota photos:', error);
    return null;
  }
}

export async function deleteTransactionOnline(transactionId: string): Promise<void> {
  try {
    // Delete from Firestore
    deleteDoc(doc(db, 'transactions', transactionId)).catch((err) => console.warn('Background delete failed:', err));
  } catch (error) {
    console.warn('Error deleting from Firestore:', error);
  }
}
