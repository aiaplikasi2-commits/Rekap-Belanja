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
import { db, handleFirestoreError, OperationType } from '../firebase/config';
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
 * If Base64 strings (invoice PDF or nota photos) exceed 300KB, create a lightweight copy for Firestore.
 */
function sanitizeTxForFirestore(tx: Transaction): Transaction {
  const copy = { ...tx };

  // Truncate invoicePdfData if it exceeds 350,000 chars (~260KB)
  if (copy.invoicePdfData && copy.invoicePdfData.length > 350000) {
    copy.invoicePdfData = copy.invoicePdfData.slice(0, 350000);
  }

  // Truncate nota files if total size is huge
  if (copy.notaFiles && copy.notaFiles.length > 0) {
    copy.notaFiles = copy.notaFiles.map((n) => {
      if (n.dataUrl && n.dataUrl.length > 250000) {
        return { ...n, dataUrl: n.dataUrl.slice(0, 250000) };
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

export async function saveTransactionOnline(transaction: Transaction): Promise<void> {
  // Always store locally first for instant availability
  saveLocalCachedTransaction(transaction);

  const path = `transactions/${transaction.id}`;
  const sanitized = sanitizeTxForFirestore(transaction);

  // Set timeout of 6 seconds to prevent perpetual spinning if Firestore network is slow/offline
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.warn('Firestore write timed out, saved locally in cache.');
      resolve();
    }, 6000);
  });

  try {
    const firestoreWrite = setDoc(doc(db, 'transactions', transaction.id), sanitized);
    await Promise.race([firestoreWrite, timeoutPromise]);
  } catch (error) {
    console.warn('Firestore setDoc failed, transaction safely retained in local storage:', error);
  }
}

export async function getUserTransactionsOnline(userId: string): Promise<Transaction[]> {
  const localList = getLocalCachedTransactions(userId);
  const path = 'transactions';

  try {
    const q = query(collection(db, path), where('userId', '==', userId));
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
}

export async function addNotaPhotosOnline(
  transactionId: string,
  newNotas: NotaPhoto[]
): Promise<Transaction | null> {
  const path = `transactions/${transactionId}`;
  try {
    const docRef = doc(db, 'transactions', transactionId);
    const docSnap = await getDoc(docRef);

    let currentTx: Transaction | null = null;
    if (docSnap.exists()) {
      currentTx = docSnap.data() as Transaction;
    } else {
      // Find in local cache
      const localList = getLocalCachedTransactions('');
      currentTx = localList.find((t) => t.id === transactionId) || null;
    }

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
  const path = `transactions/${transactionId}`;
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    console.warn('Error deleting from Firestore:', error);
  }
}
