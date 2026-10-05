export interface TransactionItem {
  no: number;
  itemName: string;
  quantity: number;
  price: number;
  totalItem: number;
  needsReview?: boolean;
}

export interface NotaPhoto {
  id: string;
  fileName: string;
  dataUrl: string;
  uploadedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  satdikName: string;
  invoiceDocNumber?: string;
  date: string;
  year: number;
  month: string;
  seqNo?: number;
  items: TransactionItem[];
  totalAmount: number;
  hasInvoicePdf: boolean;
  invoicePdfData?: string; // base64 or Data URL
  invoiceFileName?: string;
  hasNota: boolean;
  notaFiles: NotaPhoto[];
  pdfHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  companyName?: string;
  createdAt?: string;
}
