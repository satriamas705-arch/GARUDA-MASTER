export interface ItemAdministrasi {
  id: number;
  pencapaian: string;
  tersedia: boolean; // Ya = true, Tidak = false
  catatan: string;
}

export interface ItemWawancara {
  id: number;
  pencapaian: string;
  poin: number; // 1 to 5 (0 means not yet assessed)
  catatan: string;
}

export interface PenilaianPeserta {
  pesertaId: string;
  pengujiId: string;
  tanggalPenilaian: string;
  administrasi: ItemAdministrasi[];
  wawancara: ItemWawancara[];
  catatanUmum?: string;
  updatedAt: string;
}

export interface Peserta {
  id: string;
  nomorPeserta: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  pangkalan: string; // e.g. SMP N 1 Purwokerto
  gudep?: string; // e.g. 02.101 - 02.102
  kelompokId?: string; // ID of Kelompok/Regu
  golongan: 'Penggalang' | 'Siaga' | 'Penegak' | 'Pandega';
  tingkatTKU: 'Ramu' | 'Rakit' | 'Terap' | 'Bantara' | 'Laksana' | 'Mula' | 'Bantu' | 'Tata' | 'Pandega';
  kontakHp?: string;
  namaPembina?: string;
}

export interface Penguji {
  id: string;
  nama: string;
  nipNta?: string;
  jabatan: string;
  pangkalan: string;
  noHp?: string;
  golongan?: 'Penggalang' | 'Siaga' | 'Penegak' | 'Pandega';
}

export interface Kelompok {
  id: string;
  nama: string; // Nama Tim Penilai (e.g. "Tim Penilai 1", "Regu Rajawali")
  jenisKelamin?: 'Putra' | 'Putri';
  pangkalan: string; // Nama Pangkalan (e.g. "SMP Negeri 1 Purwokerto")
  pemimpinRegu?: string;
  pembinaPendamping?: string;
  namaPenguji?: string; // Nama Tim Penguji (e.g. "Kak Sugeng Priyono, S.Pd. & Kak Siti Nurjanah, M.Pd.")
  pengujiIds?: string[]; // Daftar ID Penguji yang bertugas
  namaAndik?: string[]; // Daftar nama anak didik / peserta
  pesertaIds?: string[]; // ID peserta yang ditugaskan ke tim ini
  keterangan?: string;
  golongan?: 'Penggalang' | 'Siaga' | 'Penegak' | 'Pandega';
}

export type TimPenilai = Kelompok;

export type UserRole = 'admin' | 'penguji';

export interface AuthUser {
  role: UserRole;
  username: string;
  displayName: string;
  avatarUrl?: string; // URL / path to user profile photo (e.g. /bawor.png for admin)
  pengujiId?: string; // Set when logged in as Penguji
  pengujiData?: Penguji;
  selectedGolongan?: 'Siaga' | 'Penggalang' | 'Penegak' | 'Pandega'; // Golongan yang dipilih saat login
}

export interface AppSettings {
  kwartirCabang: string; // Default: "KWARTIR CABANG BANYUMAS"
  kwarran?: string; // Default: "KWARRAN KEMRANJEN" (matches uploaded badge)
  golongan: string; // Default: "GOLONGAN PENGGALANG"
  tahun: string; // Default: "2026"
  tempat: string; // Default: "Purwokerto"
  mabigusAtauKetuaPanitia?: string;
  tanggalDefault: string;
  customLogoUrl?: string; // Base64 or URL if user uploads custom logo (Garuda)

  // Pengaturan Kop Surat (3 Baris & Logo Kiri/Kanan)
  kopBaris1?: string; // Baris 1: e.g. "GERAKAN PRAMUKA"
  kopBaris2?: string; // Baris 2: e.g. "KWARTIR RANTING KECAMATAN KEMRANJEN"
  kopBaris3?: string; // Baris 3: e.g. "Alamat: Jalan Pramuka Nomor 17 Karangjati Kemranjen Banyumas Kode Pos 53194"
  logoKiriUrl?: string; // Base64 atau URL gambar logo kiri (contoh: Siluet Cikal Tunas Kelapa)
  logoKananUrl?: string; // Base64 atau URL gambar logo kanan (contoh: WOSM Pandu Dunia ungu)

  // Pengaturan Google Drive & Sheets Synchronization
  targetFolderId?: string; // Google Drive folder ID (default: 184OdtL5XmCOVYL0IzwNkCelzBnQL8ADm)
  autoSyncToSheets?: boolean; // Otomatis sync perubahan ke Google Sheets
  lastSyncedSpreadsheetId?: string;
  lastSyncedSpreadsheetUrl?: string;
  lastSyncedAt?: string;
}
