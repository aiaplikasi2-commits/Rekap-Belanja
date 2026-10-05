import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase/config';

// In-memory token cache (never stored in localStorage/sessionStorage per skill directives)
let cachedDriveAccessToken: string | null = null;

export function setCachedDriveToken(token: string | null) {
  cachedDriveAccessToken = token;
}

export function getCachedDriveToken(): string | null {
  return cachedDriveAccessToken;
}

/**
 * Request Google Drive OAuth permission from user via popup
 */
export async function authenticateGoogleDrive(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google.');
    }

    cachedDriveAccessToken = credential.accessToken;
    return cachedDriveAccessToken;
  } catch (error: any) {
    console.error('Error authenticating Google Drive:', error);
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Proses login Google dibatalkan.');
    }
    if (error?.code === 'auth/access-denied') {
      throw new Error('Izin akses Google Drive ditolak oleh pengguna.');
    }
    throw new Error(error?.message || 'Gagal melakukan otorisasi akun Google.');
  }
}

export interface DriveUploadResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

/**
 * Upload a Blob or File directly to Google Drive using Drive v3 API
 */
export async function uploadFileToGoogleDrive(
  fileBlob: Blob,
  fileName: string,
  mimeType: string,
  onProgress?: (progressPercent: number) => void
): Promise<DriveUploadResult> {
  let token = getCachedDriveToken();

  if (!token) {
    token = await authenticateGoogleDrive();
  }

  try {
    return await doDriveMultipartUpload(fileBlob, fileName, mimeType, token, onProgress);
  } catch (err: any) {
    // If token expired (401), re-authenticate once and retry
    if (err?.status === 401 || err?.message?.includes('401')) {
      console.warn('Google Drive token expired, re-authenticating...');
      token = await authenticateGoogleDrive();
      return await doDriveMultipartUpload(fileBlob, fileName, mimeType, token, onProgress);
    }
    throw err;
  }
}

async function doDriveMultipartUpload(
  fileBlob: Blob,
  fileName: string,
  mimeType: string,
  accessToken: string,
  onProgress?: (progressPercent: number) => void
): Promise<DriveUploadResult> {
  onProgress?.(10);

  const metadata = {
    name: fileName,
    mimeType: mimeType,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataHeaders = 'Content-Type: application/json; charset=UTF-8\r\n\r\n';
  const fileHeaders = `Content-Type: ${mimeType}\r\n\r\n`;

  // Read file data as ArrayBuffer
  const fileArrayBuffer = await fileBlob.arrayBuffer();
  const fileUint8 = new Uint8Array(fileArrayBuffer);

  const metadataString = delimiter + metadataHeaders + JSON.stringify(metadata) + delimiter + fileHeaders;
  const metadataBytes = new TextEncoder().encode(metadataString);
  const closeBytes = new TextEncoder().encode(closeDelimiter);

  // Combine into a single ArrayBuffer payload
  const payloadLength = metadataBytes.length + fileUint8.length + closeBytes.length;
  const payload = new Uint8Array(payloadLength);
  payload.set(metadataBytes, 0);
  payload.set(fileUint8, metadataBytes.length);
  payload.set(closeBytes, metadataBytes.length + fileUint8.length);

  onProgress?.(40);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: payload,
  });

  onProgress?.(90);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Drive API upload error response:', errorText);

    if (response.status === 401) {
      const err = new Error('Akses token Google telah kedaluwarsa.');
      (err as any).status = 401;
      throw err;
    }
    if (response.status === 403) {
      throw new Error('Izin mengunggah file ke Google Drive tidak mencukupi atau kuota habis.');
    }
    throw new Error(`Gagal mengunggah file ke Google Drive (Status ${response.status}).`);
  }

  const data = await response.json();
  onProgress?.(100);

  const webViewLink = data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`;

  return {
    id: data.id,
    name: data.name || fileName,
    mimeType: data.mimeType || mimeType,
    webViewLink,
  };
}
