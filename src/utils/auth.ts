import { AuthUser, Penguji } from '../types';
import { DAFTAR_KWARRAN_BANYUMAS } from './golongan';

const AUTH_STORAGE_KEY = 'pg_banyumas_auth_user_v1';

/**
 * Normalizes text: lowercase and removes non-alphanumeric characters
 */
export function cleanString(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts possible password variants from an examiner's full name.
 * e.g., "Kak Sugeng Priyono, S.Pd., M.Si." ->
 * ["sugengpriyono", "kaksugengpriyono", "kaksugengpriyonospdmsi"]
 */
export function getPengujiPasswordCandidates(fullName: string): string[] {
  const candidates: Set<string> = new Set();

  // Variant 1: Complete raw string stripped
  const rawClean = cleanString(fullName);
  if (rawClean) candidates.add(rawClean);

  // Variant 2: Remove common Indonesian Scout prefixes like "kak", "kakak", "drs", "dr", "haji", "hj"
  // and common academic titles like "s.pd", "m.pd", "m.si", "s.sos", "s.ag", "s.t", "m.m"
  const strippedTitle = fullName
    .replace(/\b(kak|kakak|drs|dr|dra|h|hj|prof|ir)\b\.?/gi, '')
    .replace(/,\s*(s\.pd|m\.pd|m\.si|s\.sos|s\.ag|s\.t|m\.m|m\.kom|s\.kom|s\.e|s\.ip|s\.psi).*$/gi, '')
    .trim();

  const coreClean = cleanString(strippedTitle);
  if (coreClean) candidates.add(coreClean);

  // Variant 3: With "kak" prefix attached to the core name
  if (coreClean) {
    candidates.add(`kak${coreClean}`);
  }

  // Variant 4: First two words combined (often first name + last name)
  const words = fullName
    .replace(/[,.]/g, '')
    .split(/\s+/)
    .filter((w) => !['kak', 'kakak', 's.pd', 'm.pd', 'm.si', 's.sos'].includes(w.toLowerCase()));

  if (words.length >= 2) {
    candidates.add(cleanString(`${words[0]}${words[1]}`));
  } else if (words.length === 1) {
    candidates.add(cleanString(words[0]));
  }

  return Array.from(candidates);
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

const PASSWORDS_STORAGE_KEY = 'pg_banyumas_custom_passwords_v2';

export interface CustomPasswords {
  adminKwarcab?: string; // default: "admin"
  adminKwarran?: Record<string, string>; // kwarran normalized -> custom password
  penguji?: Record<string, string>; // pengujiId -> custom password
}

export function loadCustomPasswords(): CustomPasswords {
  try {
    const raw = localStorage.getItem(PASSWORDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        adminKwarcab: parsed.adminKwarcab,
        adminKwarran: parsed.adminKwarran || {},
        penguji: parsed.penguji || {},
      };
    }
  } catch (err) {
    console.error('Failed to load custom passwords', err);
  }
  return { adminKwarran: {}, penguji: {} };
}

export function saveCustomPasswords(passwords: CustomPasswords): void {
  try {
    localStorage.setItem(PASSWORDS_STORAGE_KEY, JSON.stringify(passwords));
  } catch (err) {
    console.error('Failed to save custom passwords', err);
  }
}

/**
 * Cek apakah user saat ini sedang menggunakan password custom
 */
export function hasCustomPassword(user: AuthUser): boolean {
  const custom = loadCustomPasswords();
  if (user.role === 'admin') {
    return Boolean(custom.adminKwarcab);
  }
  if (user.role === 'admin_kwarran' && user.kwarran) {
    const kwKey = cleanString(user.kwarran);
    return Boolean(custom.adminKwarran?.[kwKey]);
  }
  if (user.role === 'penguji' && user.pengujiId) {
    return Boolean(custom.penguji?.[user.pengujiId]);
  }
  return false;
}

/**
 * Ubah password untuk user yang sedang aktif (Admin Kwarcab, Admin Kwarran, atau Penguji)
 */
export function changeUserPassword(
  user: AuthUser,
  oldPasswordInput: string,
  newPasswordInput: string,
  pengujiList: Penguji[]
): { success: boolean; error?: string } {
  const oldPass = oldPasswordInput.trim();
  const newPass = newPasswordInput.trim();

  if (!oldPass) {
    return { success: false, error: 'Password lama / saat ini wajib diisi.' };
  }
  if (!newPass) {
    return { success: false, error: 'Password baru wajib diisi.' };
  }
  if (newPass.length < 4) {
    return { success: false, error: 'Password baru minimal harus 4 karakter.' };
  }

  const custom = loadCustomPasswords();

  // 1. Admin Kwarcab
  if (user.role === 'admin') {
    const currentExpected = custom.adminKwarcab || 'admin';
    if (oldPass !== currentExpected) {
      return { success: false, error: 'Password lama tidak sesuai.' };
    }
    custom.adminKwarcab = newPass;
    saveCustomPasswords(custom);
    return { success: true };
  }

  // 2. Admin Kwarran
  if (user.role === 'admin_kwarran') {
    const kwKey = cleanString(user.kwarran || '');
    const currentExpected = custom.adminKwarran?.[kwKey] || kwKey;
    const isOldMatch =
      oldPass === currentExpected || cleanString(oldPass) === kwKey;
    if (!isOldMatch) {
      return { success: false, error: 'Password lama tidak sesuai.' };
    }
    if (!custom.adminKwarran) custom.adminKwarran = {};
    custom.adminKwarran[kwKey] = newPass;
    saveCustomPasswords(custom);
    return { success: true };
  }

  // 3. Penguji
  if (user.role === 'penguji') {
    const pengujiId = user.pengujiId;
    const currentCustom = pengujiId ? custom.penguji?.[pengujiId] : undefined;
    let isOldValid = false;

    if (currentCustom) {
      isOldValid = oldPass === currentCustom;
    } else {
      // Bandingkan dengan variasi nama penguji
      const pData =
        user.pengujiData || pengujiList.find((p) => p.id === user.pengujiId);
      const candidates = getPengujiPasswordCandidates(
        pData?.nama || user.displayName
      );
      isOldValid = candidates.includes(cleanString(oldPass));
    }

    if (!isOldValid) {
      return { success: false, error: 'Password lama tidak sesuai.' };
    }

    if (!pengujiId) {
      return {
        success: false,
        error: 'Identitas penguji tidak ditemukan dalam sesi.',
      };
    }

    if (!custom.penguji) custom.penguji = {};
    custom.penguji[pengujiId] = newPass;
    saveCustomPasswords(custom);
    return { success: true };
  }

  return { success: false, error: 'Role pengguna tidak dikenali.' };
}

/**
 * Kembalikan password ke default awal
 */
export function resetUserPasswordToDefault(user: AuthUser): {
  success: boolean;
  message: string;
} {
  const custom = loadCustomPasswords();
  if (user.role === 'admin') {
    delete custom.adminKwarcab;
    saveCustomPasswords(custom);
    return { success: true, message: 'Password Admin Kwarcab direset ke default ("admin").' };
  }
  if (user.role === 'admin_kwarran' && user.kwarran) {
    const kwKey = cleanString(user.kwarran);
    if (custom.adminKwarran) {
      delete custom.adminKwarran[kwKey];
      saveCustomPasswords(custom);
    }
    return {
      success: true,
      message: `Password Admin Kwarran ${user.kwarran} direset ke default (nama kwarran).`,
    };
  }
  if (user.role === 'penguji' && user.pengujiId) {
    if (custom.penguji) {
      delete custom.penguji[user.pengujiId];
      saveCustomPasswords(custom);
    }
    return {
      success: true,
      message: 'Password penguji direset ke default (nama penguji).',
    };
  }
  return { success: false, message: 'Gagal mereset password.' };
}

export function attemptLogin(
  usernameInput: string,
  passwordInput: string,
  pengujiList: Penguji[],
  selectedGolongan?: 'Siaga' | 'Penggalang' | 'Penegak' | 'Pandega',
  targetKwarran?: string
): LoginResult {
  const username = usernameInput.trim().toLowerCase();
  const password = passwordInput.trim();
  const passwordClean = cleanString(password);

  if (!username) {
    return { success: false, error: 'Username wajib diisi.' };
  }

  if (!password) {
    return { success: false, error: 'Password wajib diisi.' };
  }

  const custom = loadCustomPasswords();

  // ================= 1. ADMIN (KWARCAB ATAU KWARRAN) =================
  if (username === 'admin') {
    // 1a. Super Admin Kwarcab (password custom atau default: "admin")
    const adminExpected = custom.adminKwarcab || 'admin';
    if (password === adminExpected) {
      return {
        success: true,
        user: {
          role: 'admin',
          username: 'admin',
          displayName: 'Administrator Kwarcab',
          avatarUrl: '/bawor.png',
          selectedGolongan: selectedGolongan || undefined,
        },
      };
    }

    // 1b. Jika targetKwarran diberikan secara spesifik (misal dipilih dari tab/dropdown)
    if (targetKwarran) {
      const kwKey = cleanString(targetKwarran);
      const customKwPass = custom.adminKwarran?.[kwKey];
      const isKwMatch =
        (customKwPass && password === customKwPass) ||
        passwordClean === kwKey ||
        passwordClean === kwKey.replace(/^kwarran/, '');

      if (isKwMatch) {
        return {
          success: true,
          user: {
            role: 'admin_kwarran',
            username: 'admin',
            displayName: `Admin Kwarran ${targetKwarran}`,
            kwarran: targetKwarran,
            avatarUrl: '/bawor.png',
            selectedGolongan: selectedGolongan || undefined,
          },
        };
      }
    }

    // 1c. Cek semua Kwarran di Kabupaten Banyumas (custom password atau nama kwarran)
    for (const kw of DAFTAR_KWARRAN_BANYUMAS) {
      const kwKey = cleanString(kw);
      const customKwPass = custom.adminKwarran?.[kwKey];

      const isMatch =
        (customKwPass && password === customKwPass) ||
        passwordClean === kwKey ||
        passwordClean === kwKey.replace(/^kwarran/, '');

      if (isMatch) {
        return {
          success: true,
          user: {
            role: 'admin_kwarran',
            username: 'admin',
            displayName: `Admin Kwarran ${kw}`,
            kwarran: kw,
            avatarUrl: '/bawor.png',
            selectedGolongan: selectedGolongan || undefined,
          },
        };
      }
    }

    return {
      success: false,
      error:
        'Password salah. Silakan periksa kembali password Anda.',
    };
  }

  // ================= 2. PENGUJI LOGIN =================
  if (username === 'penguji') {
    // Check if password matches custom password or candidate names
    for (const penguji of pengujiList) {
      const customPengujiPass = custom.penguji?.[penguji.id];
      const candidates = getPengujiPasswordCandidates(penguji.nama);

      const isMatch =
        (customPengujiPass && password === customPengujiPass) ||
        candidates.includes(passwordClean);

      if (isMatch) {
        return {
          success: true,
          user: {
            role: 'penguji',
            username: 'penguji',
            displayName: penguji.nama,
            kwarran: penguji.kwarran || 'Kemranjen',
            pengujiId: penguji.id,
            pengujiData: penguji,
            selectedGolongan:
              selectedGolongan || penguji.golongan || 'Penggalang',
          },
        };
      }
    }

    return {
      success: false,
      error:
        'Password penguji tidak cocok. Masukkan password akun atau nama penguji yang terdaftar.',
    };
  }

  return {
    success: false,
    error: 'Username tidak dikenal. Gunakan "admin" atau "penguji".',
  };
}

export function loadCurrentAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const user = JSON.parse(raw) as AuthUser;
      if ((user.role === 'admin' || user.role === 'admin_kwarran') && !user.avatarUrl) {
        user.avatarUrl = '/bawor.png';
      }
      return user;
    }
  } catch (err) {
    console.error('Failed to load auth user', err);
  }
  return null;
}

export function clearAuthUser(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear auth user', err);
  }
}

export function saveCurrentAuthUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save auth user', err);
  }
}
