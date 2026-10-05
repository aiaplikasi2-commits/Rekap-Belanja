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
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
}

export async function saveTransactionOnline(transaction: Transaction): Promise<void> {
  const path = `transactions/${transaction.id}`;
  try {
    await setDoc(doc(db, 'transactions', transaction.id), transaction);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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
    const updatedNotas = [...(currentTx.notaFiles || []), ...newNotas];

    const updatedData = {
      notaFiles: updatedNotas,
      hasNota: updatedNotas.length > 0,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(docRef, updatedData);
    return { ...currentTx, ...updatedData };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
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
