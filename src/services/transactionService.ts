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
import { sanitizeTransactionForFirestore, compressImageDataUrl } from './imageCompression';

export function generateTransactionId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRX-${dateStr}-${rand}`;
}

export async function checkDuplicatePdf(
  userId: string,
  pdfHash: string,
  docNumber?: string
): Promise<Transaction | null> {
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Transaction;
      if (pdfHash && data.pdfHash === pdfHash) {
        return data;
      }
      if (docNumber && docNumber.trim() !== '' && data.invoiceDocNumber === docNumber) {
        return data;
      }
    }
    return null;
  } catch (error) {
    console.warn('Check duplicate error:', error);
    return null;
  }
}

export async function saveTransactionOnline(transaction: Transaction): Promise<Transaction> {
  const path = `transactions/${transaction.id}`;
  try {
    // Sanitize and compress heavy binary fields so document size is tiny (~30KB)
    const safeTx = await sanitizeTransactionForFirestore(transaction);

    // Save to Firestore (works both online and offline)
    const setPromise = setDoc(doc(db, 'transactions', safeTx.id), safeTx);
    
    // Allow up to 4s for network confirmation, otherwise proceed immediately
    const shortDelay = new Promise((resolve) => setTimeout(resolve, 4000));
    await Promise.race([setPromise, shortDelay]);

    return safeTx;
  } catch (error: any) {
    console.warn('Network sync delayed, proceeding with local saved state:', error);
    return await sanitizeTransactionForFirestore(transaction);
  }
}

export async function getUserTransactionsOnline(userId: string): Promise<Transaction[]> {
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const list: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Transaction);
    });

    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
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
    if (!docSnap.exists()) return null;

    const currentTx = docSnap.data() as Transaction;

    // Compress incoming new photos
    const compressedNewNotas = await Promise.all(
      newNotas.map(async (nota) => ({
        ...nota,
        dataUrl: await compressImageDataUrl(nota.dataUrl, 900, 900, 0.6),
      }))
    );

    const updatedNotas = [...(currentTx.notaFiles || []), ...compressedNewNotas];

    const updatedData = {
      notaFiles: updatedNotas,
      hasNota: updatedNotas.length > 0,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updatedData);
    return { ...currentTx, ...updatedData };
  } catch (error) {
    console.error('Error in addNotaPhotosOnline:', error);
    return null;
  }
}

export async function deleteTransactionOnline(transactionId: string): Promise<void> {
  const path = `transactions/${transactionId}`;
  try {
    await deleteDoc(doc(db, 'transactions', transactionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
