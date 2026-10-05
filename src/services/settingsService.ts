import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface AppSettings {
  googleDriveFolderUrl: string;
  companyName: string;
}

const SETTINGS_KEY = 'REKAP_BELANJA_SETTINGS';

export function getLocalSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading local settings:', e);
  }
  return {
    googleDriveFolderUrl: '',
    companyName: 'CV KUJANG LUHUR SEKAWAN',
  };
}

export function saveLocalSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getLocalSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving local settings:', e);
  }
  return updated;
}

export async function getUserSettingsOnline(userId: string): Promise<AppSettings> {
  const local = getLocalSettings();
  if (!userId) return local;

  // Set 3s timeout for fetching online settings so UI is never blocked
  const timeoutPromise = new Promise<AppSettings>((resolve) => {
    setTimeout(() => resolve(local), 3000);
  });

  const fetchPromise = (async () => {
    try {
      const docRef = doc(db, 'settings', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<AppSettings>;
        const merged = { ...local, ...data };
        saveLocalSettings(merged);
        return merged;
      }
    } catch (err) {
      console.warn('Error fetching settings online, using local cache:', err);
    }
    return local;
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

export async function saveUserSettingsOnline(
  userId: string,
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  // Save to local storage first for instant response
  const updated = saveLocalSettings(settings);
  if (!userId) return updated;

  // Set 3s timeout for online sync
  const timeoutPromise = new Promise<AppSettings>((resolve) => {
    setTimeout(() => {
      console.warn('Online settings write timed out, saved locally.');
      resolve(updated);
    }, 3000);
  });

  const writePromise = (async () => {
    try {
      const docRef = doc(db, 'settings', userId);
      await setDoc(docRef, updated, { merge: true });
    } catch (err) {
      console.warn('Error saving settings online, saved to local storage:', err);
    }
    return updated;
  })();

  return Promise.race([writePromise, timeoutPromise]);
}
