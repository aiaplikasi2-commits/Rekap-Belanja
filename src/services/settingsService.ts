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

  // 1s timeout race for fetching online settings so UI is never blocked
  const timeoutPromise = new Promise<AppSettings>((resolve) => {
    setTimeout(() => resolve(local), 1000);
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

/**
 * Save settings instantly to local storage and sync to Firestore asynchronously in background.
 */
export function saveUserSettingsOnline(
  userId: string,
  settings: Partial<AppSettings>
): AppSettings {
  // Save to local storage first for instant 0ms response
  const updated = saveLocalSettings(settings);
  if (!userId) return updated;

  // Non-blocking background sync to Firestore
  const docRef = doc(db, 'settings', userId);
  setDoc(docRef, updated, { merge: true }).catch((err) => {
    console.warn('Background settings write deferred:', err);
  });

  return updated;
}
