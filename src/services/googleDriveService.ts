import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize or reuse Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let cachedDriveAccessToken: string | null = null;

// Get current cached access token
export function getCachedDriveAccessToken(): string | null {
  return cachedDriveAccessToken;
}

// Sign in with Google to obtain Google Drive access token
export async function connectGoogleDrive(): Promise<{ user: User; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Drive.');
    }

    cachedDriveAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedDriveAccessToken };
  } catch (error: any) {
    console.error('Error connecting Google Drive:', error);
    throw new Error(error.message || 'Gagal terhubung ke Google Drive.');
  }
}

// Find or create a specific folder in Google Drive
export async function getOrCreateDriveFolder(
  folderName: string,
  accessToken: string
): Promise<string> {
  // Search for existing folder
  const queryParam = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${queryParam}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Error creating folder in Drive:', errText);
    throw new Error('Gagal membuat folder di Google Drive.');
  }

  const folderData = await createRes.json();
  return folderData.id;
}

export interface DriveUploadResult {
  fileId: string;
  name: string;
  webViewLink?: string;
  webContentLink?: string;
}

// Upload a Blob/File directly to Google Drive
export async function uploadFileToGoogleDrive({
  blob,
  fileName,
  mimeType,
  folderName = 'REKAP BELANJA ONLINE',
}: {
  blob: Blob;
  fileName: string;
  mimeType: string;
  folderName?: string;
}): Promise<DriveUploadResult> {
  let token = cachedDriveAccessToken;

  // Prompt user to connect Google Drive if token not cached
  if (!token) {
    const connectResult = await connectGoogleDrive();
    token = connectResult.accessToken;
  }

  // Ensure folder exists
  const folderId = await getOrCreateDriveFolder(folderName, token);

  // Prepare multipart upload
  const metadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [folderId],
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', blob);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('Drive Upload Error:', errText);
    // Token might be expired, reset cached token
    if (uploadRes.status === 401) {
      cachedDriveAccessToken = null;
    }
    throw new Error(`Gagal mengunggah file '${fileName}' ke Google Drive: ${errText}`);
  }

  const driveFile: DriveUploadResult = await uploadRes.json();
  return driveFile;
}
