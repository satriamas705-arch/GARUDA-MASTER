import { Peserta, ItemAdministrasi, ItemWawancara } from '../types';
import {
  SIAGA_ADMINISTRASI_TEMPLATE,
  SIAGA_WAWANCARA_TEMPLATE,
  DEFAULT_ADMINISTRASI_TEMPLATE,
  DEFAULT_WAWANCARA_TEMPLATE,
} from '../data/initialData';

export {
  SIAGA_ADMINISTRASI_TEMPLATE,
  SIAGA_WAWANCARA_TEMPLATE,
  DEFAULT_ADMINISTRASI_TEMPLATE,
  DEFAULT_WAWANCARA_TEMPLATE,
};

export type GolonganType = 'Penggalang' | 'Siaga' | 'Penegak' | 'Pandega';

/**
 * Dapatkan template butir Administrasi resmi berdasarkan golongan
 * - Siaga: 12 Butir persis sesuai public/SIAGA.docx
 * - Penggalang: 14 Butir persis sesuai public/GALANG.docx
 */
export function getAdministrasiTemplate(
  golonganStr: string | GolonganType | undefined
): Omit<ItemAdministrasi, 'tersedia' | 'catatan'>[] {
  const g = extractGolonganName(golonganStr);
  if (g === 'Siaga') {
    return SIAGA_ADMINISTRASI_TEMPLATE;
  }
  return DEFAULT_ADMINISTRASI_TEMPLATE;
}

/**
 * Dapatkan template butir Wawancara resmi berdasarkan golongan
 * - Siaga: 9 Butir persis sesuai public/SIAGA.docx (Skor Maks 45)
 * - Penggalang: 11 Butir persis sesuai public/GALANG.docx (Skor Maks 55)
 */
export function getWawancaraTemplate(
  golonganStr: string | GolonganType | undefined
): Omit<ItemWawancara, 'poin' | 'catatan'>[] {
  const g = extractGolonganName(golonganStr);
  if (g === 'Siaga') {
    return SIAGA_WAWANCARA_TEMPLATE;
  }
  return DEFAULT_WAWANCARA_TEMPLATE;
}

/**
 * Hitung skor maksimal wawancara:
 * Jika item array diberikan: items.length * 5
 * Jika tidak: 45 untuk Siaga, 55 untuk Penggalang/lainnya.
 */
export function getMaxSkorWawancara(
  golonganStr?: string | GolonganType,
  items?: ItemWawancara[]
): number {
  if (items && items.length > 0) {
    return items.length * 5;
  }
  const g = extractGolonganName(golonganStr);
  if (g === 'Siaga') return 45;
  return 55;
}

/**
 * Hitung jumlah total butir administrasi:
 * Jika item array diberikan: items.length
 * Jika tidak: 12 untuk Siaga, 14 untuk Penggalang/lainnya.
 */
export function getAdminTotalCount(
  golonganStr?: string | GolonganType,
  items?: ItemAdministrasi[]
): number {
  if (items && items.length > 0) {
    return items.length;
  }
  const g = extractGolonganName(golonganStr);
  if (g === 'Siaga') return 12;
  return 14;
}

/**
 * Hitung kelulusan wawancara (standar resmi: LULUS jika persentase >= 80%):
 * Siaga: min 36 dari 45 (80.00%)
 * Penggalang: min 44 dari 55 (80.00%)
 */
export function calculateKelulusanWawancara(
  skor: number,
  maxSkorOrGolongan?: number | string | GolonganType
): { persentase: number; isLulus: boolean; minPoinLulus: number; maxSkor: number } {
  let max = 55;
  if (typeof maxSkorOrGolongan === 'number') {
    max = maxSkorOrGolongan;
  } else if (typeof maxSkorOrGolongan === 'string') {
    const g = extractGolonganName(maxSkorOrGolongan);
    max = g === 'Siaga' ? 45 : 55;
  }
  const safeSkor = Math.max(0, skor);
  const persentase = max > 0 ? Number(((safeSkor / max) * 100).toFixed(2)) : 0;
  const isLulus = persentase >= 80;
  const minPoinLulus = Math.ceil(max * 0.8);

  return {
    persentase,
    isLulus,
    minPoinLulus,
    maxSkor: max,
  };
}

/**
 * Ekstrak nama golongan singkat ('Penggalang' | 'Siaga' | 'Penegak' | 'Pandega')
 * dari teks konfigurasi pengaturan (contoh: "GOLONGAN PENGGALANG", "GOLONGAN SIAGA", dst)
 */
export function extractGolonganName(golonganStr: string | undefined): GolonganType {
  if (!golonganStr) return 'Penggalang';
  const s = golonganStr.toUpperCase();
  if (s.includes('SIAGA')) return 'Siaga';
  if (s.includes('PENEGAK')) return 'Penegak';
  if (s.includes('PANDEGA')) return 'Pandega';
  return 'Penggalang';
}

/**
 * Format nama golongan lengkap resmi (contoh: "GOLONGAN SIAGA")
 */
export function formatGolonganLabel(golonganStr: string | undefined): string {
  const short = extractGolonganName(golonganStr);
  return `GOLONGAN ${short.toUpperCase()}`;
}

export interface TKUOption {
  value: Peserta['tingkatTKU'];
  label: string;
  isGarudaPrerequisite?: boolean;
}

/**
 * Daftar opsi TKU yang valid berdasarkan golongan yang dipilih
 */
export function getTKUOptionsForGolongan(golonganStr: string | undefined): TKUOption[] {
  const g = extractGolonganName(golonganStr);
  switch (g) {
    case 'Siaga':
      return [
        { value: 'Tata', label: 'Siaga Tata (Syarat Pramuka Garuda)', isGarudaPrerequisite: true },
        { value: 'Bantu', label: 'Siaga Bantu' },
        { value: 'Mula', label: 'Siaga Mula' },
      ];
    case 'Penegak':
      return [
        { value: 'Laksana', label: 'Penegak Laksana (Syarat Pramuka Garuda)', isGarudaPrerequisite: true },
        { value: 'Bantara', label: 'Penegak Bantara' },
      ];
    case 'Pandega':
      return [
        { value: 'Pandega', label: 'Pandega (Syarat Pramuka Garuda)', isGarudaPrerequisite: true },
      ];
    case 'Penggalang':
    default:
      return [
        { value: 'Terap', label: 'Penggalang Terap (Syarat Pramuka Garuda)', isGarudaPrerequisite: true },
        { value: 'Rakit', label: 'Penggalang Rakit' },
        { value: 'Ramu', label: 'Penggalang Ramu' },
      ];
  }
}

/**
 * Ambil TKU prasyarat Pramuka Garuda default berdasarkan golongan
 */
export function getDefaultTKUForGolongan(golonganStr: string | undefined): Peserta['tingkatTKU'] {
  const g = extractGolonganName(golonganStr);
  switch (g) {
    case 'Siaga':
      return 'Tata';
    case 'Penegak':
      return 'Laksana';
    case 'Pandega':
      return 'Pandega';
    case 'Penggalang':
    default:
      return 'Terap';
  }
}

/**
 * Format butir pencapaian administrasi & wawancara agar dinamis sesuai golongan yang diatur
 */
export function formatPencapaianForGolongan(text: string, golonganSetting: string | undefined): string {
  const g = extractGolonganName(golonganSetting);
  if (g === 'Penggalang') {
    return text;
  }

  let formatted = text;

  if (g === 'Siaga') {
    formatted = formatted
      .replace(/SKU Tingkat Penggalang Ramu/g, 'SKU Tingkat Siaga Mula')
      .replace(/SKU Tingkat Penggalang Rakit/g, 'SKU Tingkat Siaga Bantu')
      .replace(/SKU Tingkat Penggalang Terap/g, 'SKU Tingkat Siaga Tata')
      .replace(/penggalang putri/g, 'siaga putri')
      .replace(/golongan penggalang/g, 'golongan siaga')
      .replace(/Golongan Penggalang/g, 'Golongan Siaga')
      .replace(/Penggalang/g, 'Siaga')
      .replace(/penggalang/g, 'siaga')
      .replace(/25 TKK/g, '10 TKK')
      .replace(
        /\(untuk penggalang pengujian IT untuk membuat dan memposting di IG video tentang kegiatan pencapaian garuda di kwarran dengan mencantumkan hastag dan tag yang telah ditentukan\)/g,
        '(untuk siaga pengujian pemanfaatan gawai dan internet ramah anak secara bijak)'
      );
  } else if (g === 'Penegak') {
    formatted = formatted
      .replace(/SKU Tingkat Penggalang Ramu/g, 'SKU Tingkat Penegak Bantara')
      .replace(/SKU Tingkat Penggalang Rakit/g, 'SKU Tingkat Penegak Laksana')
      .replace(/SKU Tingkat Penggalang Terap/g, 'SKU Tingkat Penegak Laksana (Pemenuhan Syarat Garuda)')
      .replace(/penggalang putri/g, 'penegak putri')
      .replace(/golongan penggalang/g, 'golongan penegak')
      .replace(/Golongan Penggalang/g, 'Golongan Penegak')
      .replace(/Penggalang/g, 'Penegak')
      .replace(/penggalang/g, 'penegak')
      .replace(
        /\(untuk penggalang pengujian IT untuk membuat dan memposting di IG video tentang kegiatan pencapaian garuda di kwarran dengan mencantumkan hastag dan tag yang telah ditentukan\)/g,
        '(untuk penegak pengujian pembuatan konten kepramukaan dan publikasi digital edukatif)'
      );
  } else if (g === 'Pandega') {
    formatted = formatted
      .replace(/SKU Tingkat Penggalang Ramu/g, 'SKU Tingkat Pandega')
      .replace(/SKU Tingkat Penggalang Rakit/g, 'SKU Tingkat Pandega')
      .replace(/SKU Tingkat Penggalang Terap/g, 'SKU Tingkat Pandega (Syarat Garuda)')
      .replace(/penggalang putri/g, 'pandega putri')
      .replace(/golongan penggalang/g, 'golongan pandega')
      .replace(/Golongan Penggalang/g, 'Golongan Pandega')
      .replace(/Penggalang/g, 'Pandega')
      .replace(/penggalang/g, 'pandega');
  }

  return formatted;
}

/**
 * Daftar 27 Kwartir Ranting (Kwarran) resmi di wilayah Kwartir Cabang Banyumas
 */
export const DAFTAR_KWARRAN_BANYUMAS: string[] = [
  'Ajibarang',
  'Banyumas',
  'Baturraden',
  'Cilongok',
  'Gumelar',
  'Jatilawang',
  'Kalibagor',
  'Karanglewas',
  'Kebasen',
  'Kedungbanteng',
  'Kembaran',
  'Kemranjen',
  'Lumbir',
  'Patikraja',
  'Pekuncen',
  'Purwojati',
  'Purwokerto Barat',
  'Purwokerto Selatan',
  'Purwokerto Timur',
  'Purwokerto Utara',
  'Rawalo',
  'Sokaraja',
  'Somagede',
  'Sumbang',
  'Sumpiuh',
  'Tambak',
  'Wangon',
];

export interface DeteksiGolonganResult {
  usiaTahun: number;
  usiaBulan: number;
  usiaTotalBulan: number;
  usiaFormatted: string; // contoh: "13 Thn 4 Bln"
  golonganTerdeteksi: GolonganType | 'Prasiaga' | 'Dewasa';
  rentangUsiaResmi: string; // contoh: "11 - 15 Tahun"
  isSesuai: boolean; // apakah cocok dengan golongan terdaftar
  statusText: string; // contoh: "Sesuai Golongan" / "Usia belum masuk rentang"
  badgeColorClass: string;
}

/**
 * Hitung usia presisi (tahun dan bulan) berdasarkan tanggal lahir
 */
export function hitungUsia(
  tanggalLahirStr: string | undefined,
  referenceDateStr?: string
): { tahun: number; bulan: number; hari: number; totalBulan: number } | null {
  if (!tanggalLahirStr) return null;
  const birth = new Date(tanggalLahirStr);
  if (isNaN(birth.getTime())) return null;

  const ref = referenceDateStr ? new Date(referenceDateStr) : new Date();
  if (isNaN(ref.getTime())) return null;

  let tahun = ref.getFullYear() - birth.getFullYear();
  let bulan = ref.getMonth() - birth.getMonth();
  let hari = ref.getDate() - birth.getDate();

  if (hari < 0) {
    bulan--;
  }

  if (bulan < 0) {
    tahun--;
    bulan += 12;
  }

  if (tahun < 0) {
    return { tahun: 0, bulan: 0, hari: 0, totalBulan: 0 };
  }

  return {
    tahun,
    bulan,
    hari: Math.max(0, hari),
    totalBulan: tahun * 12 + bulan,
  };
}

/**
 * Deteksi golongan kepramukaan resmi berdasarkan tanggal lahir (sesuai AD/ART Gerakan Pramuka):
 * - Siaga: 7 s.d. 10 tahun
 * - Penggalang: 11 s.d. 15 tahun
 * - Penegak: 16 s.d. 20 tahun
 * - Pandega: 21 s.d. 25 tahun
 * - < 7 tahun: Prasiaga / Belum Masuk Golongan
 * - > 25 tahun: Dewasa / Pembina
 */
export function deteksiGolonganDariTanggalLahir(
  tanggalLahirStr: string | undefined,
  referenceDateStr?: string,
  golonganTerdaftar?: GolonganType | string
): DeteksiGolonganResult | null {
  const usia = hitungUsia(tanggalLahirStr, referenceDateStr);
  if (!usia) return null;

  const { tahun, bulan } = usia;
  let golongan: GolonganType | 'Prasiaga' | 'Dewasa';
  let rentang = '';

  if (tahun < 7) {
    golongan = 'Prasiaga';
    rentang = '< 7 Tahun';
  } else if (tahun >= 7 && tahun <= 10) {
    golongan = 'Siaga';
    rentang = '7 - 10 Tahun';
  } else if (tahun >= 11 && tahun <= 15) {
    golongan = 'Penggalang';
    rentang = '11 - 15 Tahun';
  } else if (tahun >= 16 && tahun <= 20) {
    golongan = 'Penegak';
    rentang = '16 - 20 Tahun';
  } else if (tahun >= 21 && tahun <= 25) {
    golongan = 'Pandega';
    rentang = '21 - 25 Tahun';
  } else {
    golongan = 'Dewasa';
    rentang = '> 25 Tahun';
  }

  const terdaftar = golonganTerdaftar ? extractGolonganName(golonganTerdaftar) : undefined;
  const isSesuai = terdaftar ? golongan === terdaftar : true;

  let statusText = 'Sesuai Golongan';
  let badgeColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';

  if (terdaftar && !isSesuai) {
    statusText = `Disarankan: ${golongan} (${rentang})`;
    badgeColorClass = 'bg-amber-100 text-amber-900 border-amber-300';
  }

  const bulanStr = bulan > 0 ? ` ${bulan} Bln` : '';
  const usiaFormatted = `${tahun} Thn${bulanStr}`;

  return {
    usiaTahun: tahun,
    usiaBulan: bulan,
    usiaTotalBulan: usia.totalBulan,
    usiaFormatted,
    golonganTerdeteksi: golongan,
    rentangUsiaResmi: rentang,
    isSesuai,
    statusText,
    badgeColorClass,
  };
}

/**
 * Format string gabungan Tempat dan Tanggal Lahir (contoh: "Banyumas, 14 Mei 2012")
 */
export function formatTempatTanggalLahir(
  tempatLahir?: string,
  tanggalLahir?: string
): string {
  const parts: string[] = [];
  if (tempatLahir && tempatLahir.trim()) {
    parts.push(tempatLahir.trim());
  }

  if (tanggalLahir && tanggalLahir.trim()) {
    try {
      const date = new Date(tanggalLahir);
      if (!isNaN(date.getTime())) {
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
        ];
        const formattedDate = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        parts.push(formattedDate);
      } else {
        parts.push(tanggalLahir);
      }
    } catch {
      parts.push(tanggalLahir);
    }
  }

  return parts.length > 0 ? parts.join(', ') : '-';
}

/**
 * Normalisasi nama Kwarran untuk perbandingan akurat
 */
export function cleanKwarranName(kw?: string): string {
  if (!kw) return '';
  return kw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^kwarran/, '');
}

/**
 * Mengecek apakah dua nama Kwarran sama (case-insensitive & mengabaikan spasi/prefix)
 */
export function isSameKwarran(kw1?: string, kw2?: string): boolean {
  if (!kw1 || !kw2) return false;
  const c1 = cleanKwarranName(kw1);
  const c2 = cleanKwarranName(kw2);
  return c1.length > 0 && c1 === c2;
}
