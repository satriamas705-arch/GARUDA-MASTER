import * as XLSX from 'xlsx';
import { Peserta, Penguji, Kelompok, PenilaianPeserta, AppSettings } from '../types';
import { formatTanggalIndonesia } from './formatDate';

interface RekapRowData {
  peserta: Peserta;
  kelompok?: Kelompok;
  penilaian?: PenilaianPeserta;
  penguji?: Penguji;
}

export function exportRekapitulasiToExcel(
  items: RekapRowData[],
  settings: AppSettings,
  filterKelompokName?: string
) {
  // Build data rows
  const headers = [
    'NO',
    'NO. PESERTA',
    'NAMA PESERTA',
    'GOLONGAN',
    'L/P',
    'PANGKALAN / GUDEP',
    'REGU / KELOMPOK',
    'ADMINISTRASI (YA/TOTAL)',
    'STATUS ADMIN',
    'SKOR WAWANCARA',
    'PERSENTASE (%)',
    'STATUS KELULUSAN',
    'PENGUJI',
    'TANGGAL PENILAIAN',
  ];

  const rows = items.map((item, index) => {
    const pen = item.penilaian;
    const isSiaga = item.peserta.golongan === 'Siaga';
    const adminTotal = pen ? pen.administrasi.length : (isSiaga ? 12 : 14);
    const maxSkor = pen ? pen.wawancara.length * 5 : (isSiaga ? 45 : 55);

    let adminYaCount = 0;
    let skorWawancara = 0;
    let persentase = 0;
    let statusKelulusan = 'BELUM DINILAI';
    let statusAdmin = '-';

    if (pen) {
      adminYaCount = pen.administrasi.filter((a) => a.tersedia).length;
      statusAdmin = adminYaCount === adminTotal ? 'Lengkap' : `${adminYaCount}/${adminTotal} (Belum Lengkap)`;
      skorWawancara = pen.wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
      persentase = Number(((skorWawancara / maxSkor) * 100).toFixed(2));
      statusKelulusan = persentase >= 80 ? 'LULUS' : 'BELUM LULUS';
    }

    return [
      index + 1,
      item.peserta.nomorPeserta,
      item.peserta.nama,
      item.peserta.golongan || 'Penggalang',
      item.peserta.jenisKelamin,
      item.peserta.pangkalan + (item.peserta.gudep ? ` (${item.peserta.gudep})` : ''),
      item.kelompok?.nama || '-',
      pen ? `${adminYaCount}/${adminTotal}` : '-',
      statusAdmin,
      pen ? `${skorWawancara}/${maxSkor}` : '-',
      pen ? `${persentase}%` : '-',
      statusKelulusan,
      item.penguji?.nama || '-',
      pen?.tanggalPenilaian || '-',
    ];
  });

  // Calculate summary
  const total = items.length;
  const sudahDinilai = items.filter((i) => !!i.penilaian).length;
  const lulus = items.filter((i) => {
    if (!i.penilaian) return false;
    const isSiaga = i.peserta.golongan === 'Siaga';
    const maxSkor = i.penilaian.wawancara.length * 5 || (isSiaga ? 45 : 55);
    const skor = i.penilaian.wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
    return (skor / maxSkor) * 100 >= 80;
  }).length;
  const belumLulus = sudahDinilai - lulus;

  // Title and header info block
  const sheetData: (string | number)[][] = [
    ['REKAPITULASI PENILAIAN PENCAPAIAN PRAMUKA GARUDA'],
    [`${settings.golongan.toUpperCase()} - ${settings.kwartirCabang.toUpperCase()}`],
    [`TAHUN ${settings.tahun}`],
    filterKelompokName ? [`Filter Regu/Kelompok: ${filterKelompokName}`] : [],
    [],
    [
      `Total Peserta: ${total}`,
      `Sudah Dinilai: ${sudahDinilai}`,
      `Lulus (>= 80%): ${lulus}`,
      `Belum Lulus: ${belumLulus}`,
      `Standar Kelulusan: Minimal 80% (Siaga: Skor ≥ 36/45, Penggalang: Skor ≥ 44/55)`,
    ],
    [],
    headers,
    ...rows,
    [],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', `Ditetapkan di: ${settings.tempat}`, '', ''],
    ['', '', '', '', '', '', '', '', '', '', `Tanggal: ${formatTanggalIndonesia()}`, '', ''],
    ['', '', '', '', '', '', '', '', '', '', 'Tim Penguji Pramuka Garuda', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // NO
    { wch: 18 }, // NO PESERTA
    { wch: 28 }, // NAMA
    { wch: 6 },  // L/P
    { wch: 32 }, // PANGKALAN
    { wch: 24 }, // REGU
    { wch: 20 }, // ADMIN
    { wch: 22 }, // STATUS ADMIN
    { wch: 24 }, // SKOR WAWANCARA
    { wch: 16 }, // %
    { wch: 18 }, // STATUS
    { wch: 30 }, // PENGUJI
    { wch: 16 }, // TANGGAL
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekapitulasi Nilai');

  const fileName = `Rekap_Nilai_Pramuka_Garuda_${settings.tahun}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportLembarIndividuToExcel(
  peserta: Peserta,
  penilaian: PenilaianPeserta,
  penguji: Penguji | undefined,
  settings: AppSettings,
  customTempat?: string,
  customTanggal?: string
) {
  const isSiaga = peserta.golongan === 'Siaga';
  const adminTotal = penilaian.administrasi.length || (isSiaga ? 12 : 14);
  const maxSkor = penilaian.wawancara.length * 5 || (isSiaga ? 45 : 55);
  const adminYaCount = penilaian.administrasi.filter((a) => a.tersedia).length;
  const totalSkorWawancara = penilaian.wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
  const persentase = Number(((totalSkorWawancara / maxSkor) * 100).toFixed(2));
  const minPoinLulus = Math.ceil(maxSkor * 0.8);
  const statusKelulusan = persentase >= 80 ? 'LULUS' : 'BELUM LULUS';

  const tempatUjianFinal = customTempat || settings.tempat || 'Kemranjen, Banyumas';
  const tanggalUjianFinal = formatTanggalIndonesia(
    customTanggal || penilaian.tanggalPenilaian || settings.tanggalDefault
  );

  const wb = XLSX.utils.book_new();

  // SHEET 1: FORM LENGKAP
  const sheetContent: (string | number)[][] = [
    ['KRITERIA KELULUSAN PENCAPAIAN PRAMUKA GARUDA'],
    [`${(peserta.golongan ? `GOLONGAN ${peserta.golongan}` : settings.golongan).toUpperCase()} - ${settings.kwartirCabang.toUpperCase()}`],
    [`TAHUN ${settings.tahun}`],
    [],
    ['Nama', `: ${peserta.nama}`],
    ['Nomor Peserta', `: ${peserta.nomorPeserta}`],
    ['Golongan / TKU', `: ${peserta.golongan || 'Penggalang'} (${peserta.tingkatTKU})`],
    ['Pangkalan', `: ${peserta.pangkalan}`],
    ['Gugus Depan', `: ${peserta.gudep || '-'}`],
    ['Jenis Kelamin', `: ${peserta.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}`],
    ['Penguji', `: ${penguji?.nama || '-'}`],
    ['Tempat Ujian', `: ${tempatUjianFinal}`],
    ['Tanggal Ujian', `: ${tanggalUjianFinal}`],
    [],
    ['A. ADMINISTRASI'],
    ['NO', 'PENCAPAIAN', 'KETERSEDIAAN DATA', 'KETERANGAN / CATATAN'],
  ];

  penilaian.administrasi.forEach((item) => {
    sheetContent.push([
      item.id,
      item.pencapaian,
      item.tersedia ? 'YA' : 'TIDAK',
      item.catatan || '',
    ]);
  });

  sheetContent.push([]);
  sheetContent.push([
    'Catatan Administrasi:',
    `Terpenuhi ${adminYaCount} dari ${adminTotal} butir. Point-point yang belum terpenuhi diberikan waktu 3 hari sebelum pelaksanaan Wawancara.`,
  ]);
  if (isSiaga) {
    sheetContent.push([
      'Catatan Khusus Siaga:',
      'Khusus siaga putri jika bidang berwarna kuning (bidang agama, mental, moral dan spiritual) tidak terpenuhi maka bisa digantikan dengan bidang lain.',
    ]);
  }
  sheetContent.push([]);
  sheetContent.push(['B. WAWANCARA']);
  sheetContent.push(['NO', 'PENCAPAIAN', 'POIN KEMAMPUAN (1 - 5)', 'KETERANGAN / CATATAN']);

  penilaian.wawancara.forEach((item) => {
    sheetContent.push([
      item.id,
      item.pencapaian,
      item.poin || 0,
      item.catatan || '',
    ]);
  });

  sheetContent.push([]);
  sheetContent.push(['KETERANGAN SKALA POIN: 1. Sangat Kurang | 2. Kurang | 3. Cukup | 4. Baik | 5. Sangat Baik']);
  sheetContent.push([]);
  sheetContent.push(['RANGKUMAN PENILAIAN AKHIR']);
  sheetContent.push(['Jumlah Poin Diperoleh', totalSkorWawancara, `Poin Maksimal: ${maxSkor}`]);
  sheetContent.push(['% Pencapaian', `${persentase}%`, `Formula: (Poin / ${maxSkor}) * 100%`]);
  sheetContent.push(['KRITERIA KELULUSAN', statusKelulusan, `LULUS jika tercapai minimal 80% (Skor >= ${minPoinLulus})`]);
  if (penilaian.catatanUmum) {
    sheetContent.push(['Catatan Umum Penguji', penilaian.catatanUmum]);
  }
  sheetContent.push([]);
  sheetContent.push(['', '', `${tempatUjianFinal}, ${tanggalUjianFinal}`]);
  sheetContent.push(['', '', 'Tim Penguji Pramuka Garuda:']);
  sheetContent.push([]);
  sheetContent.push([]);
  sheetContent.push(['', '', penguji?.nama || '(....................................)']);

  const ws = XLSX.utils.aoa_to_sheet(sheetContent);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 65 },
    { wch: 22 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Lembar Penilaian Garuda');

  const safeName = peserta.nama.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Lembar_Nilai_${safeName}_${settings.tahun}.xlsx`);
}

export function exportRekapPengujiToExcel(
  penguji: Penguji,
  items: RekapRowData[],
  settings: AppSettings,
  golonganFilter?: string
) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [`REKAPITULASI HASIL PENILAIAN OLEH PENGUJI`],
    [`KWARTIR CABANG: ${settings.kwartirCabang}`],
    [`GOLONGAN: ${golonganFilter || penguji.golongan || settings.golongan}`],
    [`TAHUN: ${settings.tahun}`],
    [],
    [`DATA PENGUJI:`],
    [`Nama Penguji`, penguji.nama],
    [`NIP / NTA`, penguji.nipNta || '-'],
    [`Jabatan`, penguji.jabatan],
    [`Pangkalan / Kwarran`, penguji.pangkalan],
    [`Kontak HP`, penguji.noHp || '-'],
    [],
    [`DAFTAR PESERTA YANG DINILAI:`],
  ];

  const headers = [
    'NO',
    'NO. PESERTA',
    'NAMA PESERTA',
    'GOLONGAN',
    'L/P',
    'PANGKALAN / GUDEP',
    'REGU / KELOMPOK',
    'ADMINISTRASI',
    'STATUS ADMIN',
    'SKOR WAWANCARA',
    'PERSENTASE (%)',
    'STATUS KELULUSAN',
    'TANGGAL PENILAIAN',
    'CATATAN PENGUJI',
  ];

  let totalPersenSemua = 0;
  let lulusCount = 0;
  let sudahDinilaiCount = 0;

  const dataRows = items.map((item, index) => {
    const pen = item.penilaian;
    const isSiaga = item.peserta.golongan === 'Siaga' || penguji.golongan === 'Siaga';
    const adminTotal = pen ? pen.administrasi.length : (isSiaga ? 12 : 14);
    const maxSkor = pen ? pen.wawancara.length * 5 : (isSiaga ? 45 : 55);

    let adminYa = 0;
    let skor = 0;
    let persen = 0;
    let status = 'BELUM DINILAI';
    let statusAdm = '-';

    if (pen) {
      sudahDinilaiCount++;
      adminYa = pen.administrasi.filter((a) => a.tersedia).length;
      statusAdm = adminYa === adminTotal ? 'Lengkap' : `${adminYa}/${adminTotal}`;
      skor = pen.wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
      persen = Number(((skor / maxSkor) * 100).toFixed(2));
      status = persen >= 80 ? 'LULUS' : 'BELUM LULUS';
      if (status === 'LULUS') lulusCount++;
      totalPersenSemua += persen;
    }

    return [
      index + 1,
      item.peserta.nomorPeserta,
      item.peserta.nama,
      item.peserta.golongan || 'Penggalang',
      item.peserta.jenisKelamin,
      item.peserta.pangkalan + (item.peserta.gudep ? ` (${item.peserta.gudep})` : ''),
      item.kelompok?.nama || '-',
      pen ? `${adminYa}/${adminTotal}` : '-',
      statusAdm,
      pen ? `${skor}/${maxSkor}` : '-',
      pen ? `${persen}%` : '-',
      status,
      pen ? formatTanggalIndonesia(pen.tanggalPenilaian) : '-',
      pen?.catatanUmum || '-',
    ];
  });

  const avgPersen = sudahDinilaiCount > 0 ? (totalPersenSemua / sudahDinilaiCount).toFixed(1) : '0';

  const summaryRows = [
    [],
    ['RINGKASAN PENILAIAN PENGUJI:'],
    ['Total Peserta Diuji', items.length],
    ['Sudah Dinilai', sudahDinilaiCount],
    ['Jumlah Lulus', lulusCount],
    ['Jumlah Belum Lulus', sudahDinilaiCount - lulusCount],
    ['Rata-rata Pencapaian (%)', `${avgPersen}%`],
    [],
    ['', '', '', '', '', '', '', '', `${settings.tempat || 'Purwokerto'}, ${formatTanggalIndonesia(settings.tanggalDefault || new Date().toISOString())}`],
    ['', '', '', '', '', '', '', '', 'Penguji Bersangkutan,'],
    [],
    [],
    ['', '', '', '', '', '', '', '', penguji.nama],
  ];

  const fullSheet = [...titleRows, headers, ...dataRows, ...summaryRows];
  const ws = XLSX.utils.aoa_to_sheet(fullSheet);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 6 },
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 35 },
  ];

  const safePenguji = penguji.nama.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai Penguji');
  XLSX.writeFile(wb, `Rekap_Nilai_Penguji_${safePenguji}_${settings.tahun}.xlsx`);
}
