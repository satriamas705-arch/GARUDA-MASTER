import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Peserta, Penguji, Kelompok, PenilaianPeserta, AppSettings, AuthUser } from '../types';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Award,
  ChevronDown,
  Sparkles,
  Layers,
  UserCheck,
  Users,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { exportRekapitulasiToExcel, exportLembarIndividuToExcel, exportRekapPengujiToExcel } from '../utils/exportExcel';
import { exportElementToPdf } from '../utils/generatePdf';
import { formatTanggalIndonesia } from '../utils/formatDate';
import { PramukaBadge } from './PramukaBadge';
import { OfficialScoutStamp } from './OfficialScoutStamp';
import { KopSurat } from './KopSurat';
import { extractGolonganName, GolonganType } from '../utils/golongan';

interface RekapitulasiViewProps {
  pesertaList: Peserta[];
  pengujiList: Penguji[];
  kelompokList: Kelompok[];
  penilaianMap: Record<string, PenilaianPeserta>;
  settings: AppSettings;
  currentUser?: AuthUser | null;
  activeGolongan?: GolonganType;
  onOpenPrintPreview: (pesertaId: string) => void;
  onNavigateToNilai: (pesertaId: string) => void;
}

export const RekapitulasiView: React.FC<RekapitulasiViewProps> = ({
  pesertaList,
  pengujiList,
  kelompokList,
  penilaianMap,
  settings,
  currentUser,
  activeGolongan,
  onOpenPrintPreview,
  onNavigateToNilai,
}) => {
  const initialGolongan = activeGolongan || currentUser?.selectedGolongan || extractGolonganName(settings.golongan) || 'Penggalang';
  const [rekapTab, setRekapTab] = useState<'kolektif' | 'penguji'>('kolektif');
  const [filterGolongan, setFilterGolongan] = useState<'ALL' | GolonganType>(initialGolongan);
  const [selectedPengujiId, setSelectedPengujiId] = useState<string>(
    currentUser?.pengujiId || 'ALL'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelompok, setFilterKelompok] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LULUS' | 'BELUM_LULUS' | 'BELUM_DINILAI'>('ALL');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (activeGolongan) {
      setFilterGolongan(activeGolongan);
    }
  }, [activeGolongan]);

  // Build combined row data
  const rowDataList = pesertaList.map((p) => {
    const kelompok = kelompokList.find((k) => k.id === p.kelompokId);
    const penilaian = penilaianMap[p.id];
    const penguji = penilaian ? pengujiList.find((pj) => pj.id === penilaian.pengujiId) : undefined;
    return {
      peserta: p,
      kelompok,
      penilaian,
      penguji,
    };
  });

  // Base rows filtered by selected Golongan
  const rowsInSelectedGolongan = rowDataList.filter((item) => {
    if (filterGolongan === 'ALL') return true;
    return item.peserta.golongan === filterGolongan;
  });

  // Filter for Collective Table
  const filteredRows = rowsInSelectedGolongan.filter((item) => {
    const { peserta, penilaian } = item;
    const matchSearch =
      peserta.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      peserta.nomorPeserta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      peserta.pangkalan.toLowerCase().includes(searchTerm.toLowerCase());

    const matchKelompok =
      filterKelompok === 'ALL' || peserta.kelompokId === filterKelompok;

    let matchStatus = true;
    if (filterStatus === 'BELUM_DINILAI') {
      matchStatus = !penilaian;
    } else if (filterStatus === 'LULUS') {
      if (!penilaian) matchStatus = false;
      else {
        const isSiaga = peserta.golongan === 'Siaga';
        const maxSkor = penilaian.wawancara.length * 5 || (isSiaga ? 45 : 55);
        const skor = penilaian.wawancara.reduce((s, w) => s + (w.poin || 0), 0);
        matchStatus = (skor / maxSkor) * 100 >= 80;
      }
    } else if (filterStatus === 'BELUM_LULUS') {
      if (!penilaian) matchStatus = false;
      else {
        const isSiaga = peserta.golongan === 'Siaga';
        const maxSkor = penilaian.wawancara.length * 5 || (isSiaga ? 45 : 55);
        const skor = penilaian.wawancara.reduce((s, w) => s + (w.poin || 0), 0);
        matchStatus = (skor / maxSkor) * 100 < 80;
      }
    }

    return matchSearch && matchKelompok && matchStatus;
  });

  // Overall Statistics for current active Golongan view
  const totalPeserta = rowsInSelectedGolongan.length;
  const sudahDinilaiCount = rowsInSelectedGolongan.filter((p) => !!penilaianMap[p.peserta.id]).length;
  const lulusCount = rowsInSelectedGolongan.filter((p) => {
    const pen = penilaianMap[p.peserta.id];
    if (!pen) return false;
    const isSiaga = p.peserta.golongan === 'Siaga';
    const maxSkor = pen.wawancara.length * 5 || (isSiaga ? 45 : 55);
    const skor = pen.wawancara.reduce((s, w) => s + (w.poin || 0), 0);
    return (skor / maxSkor) * 100 >= 80;
  }).length;
  const belumLulusCount = sudahDinilaiCount - lulusCount;
  const persentaseKelulusan = sudahDinilaiCount > 0 ? ((lulusCount / sudahDinilaiCount) * 100).toFixed(1) : '0';

  // Penguji in active Golongan
  const pengujiInGolongan = pengujiList.filter(
    (pj) => filterGolongan === 'ALL' || !pj.golongan || pj.golongan === filterGolongan
  );

  // Generate QR for collective recap
  useEffect(() => {
    const qrInfo = [
      `BERITA ACARA REKAPITULASI PRAMUKA GARUDA`,
      `Kwartir: ${settings.kwartirCabang}`,
      `Golongan: ${filterGolongan === 'ALL' ? settings.golongan : filterGolongan}`,
      `Tahun: ${settings.tahun}`,
      `Total Peserta: ${totalPeserta}`,
      `Sudah Dinilai: ${sudahDinilaiCount}`,
      `Jumlah Lulus: ${lulusCount}`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID')}`,
    ].join('\n');

    QRCode.toDataURL(qrInfo, { width: 120, margin: 1 })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error(err));
  }, [settings, totalPeserta, sudahDinilaiCount, lulusCount, filterGolongan]);

  const handleExportExcelAll = () => {
    const selectedKel = kelompokList.find((k) => k.id === filterKelompok);
    exportRekapitulasiToExcel(filteredRows, settings, selectedKel?.nama);
  };

  const handlePrintCollective = () => {
    window.print();
  };

  const handleExportPdfCollective = async () => {
    setIsExportingPdf(true);
    setExportProgress(10);
    try {
      const fileName = `Rekapitulasi_Garuda_${settings.tahun}_${Date.now()}.pdf`;
      await exportElementToPdf(['rekap-collective-printable-container'], {
        fileName,
        paperSize: 'a4',
        onProgress: (prog) => setExportProgress(prog),
      });
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor PDF rekapitulasi. Gunakan tombol Cetak PDF sebagai alternatif.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-stone-900 tracking-wide uppercase flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-700" />
              <span>Rekapitulasi Laporan Nilai Pramuka Garuda</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {settings.golongan} • {settings.kwartirCabang} • TAHUN {settings.tahun}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcelAll}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
              title="Unduh file Excel Rekapitulasi Resmi"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Rekap Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportPdfCollective}
              disabled={isExportingPdf}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all disabled:opacity-50"
              title="Unduh file Berita Acara Rekapitulasi PDF langsung"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Memproses PDF...' : 'Unduh Berita Acara PDF'}</span>
            </button>

            <button
              onClick={handlePrintCollective}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-md transition-all"
              title="Cetak Berita Acara Rekapitulasi Kolektif ke Printer / PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak (Ctrl+P)</span>
            </button>
          </div>
        </div>

        {isExportingPdf && (
          <div className="mt-3 pt-3 border-t border-stone-200">
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-600 h-1.5 transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

      {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-100">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
              Total Calon Garuda ({filterGolongan})
            </span>
            <div className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5">
              {totalPeserta}
            </div>
            <span className="text-[11px] text-stone-500">
              {sudahDinilaiCount} telah diuji
            </span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Lulus Uji (≥ 80%)
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-0.5">
              {lulusCount}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Memenuhi syarat Garuda
            </span>
          </div>

          <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
              Belum Lulus (&lt; 80%)
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-950 mt-0.5">
              {belumLulusCount}
            </div>
            <span className="text-[11px] text-rose-700">
              Diberi waktu perbaikan
            </span>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
              Tingkat Kelulusan
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-950 mt-0.5">
              {persentaseKelulusan}%
            </div>
            <span className="text-[11px] text-amber-800 font-semibold">
              Dari {sudahDinilaiCount} yang dinilai
            </span>
          </div>
        </div>

        {/* View Mode Tabs: Rekap Kolektif vs Rekap Nilai Penguji */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-stone-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRekapTab('kolektif')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                rekapTab === 'kolektif'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Rekap Kolektif Peserta</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {filteredRows.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRekapTab('penguji')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                rekapTab === 'penguji'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Rekap Nilai Penguji</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {pengujiInGolongan.length} Penguji
              </span>
            </button>
          </div>

          {/* Golongan Filter Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1 shrink-0">
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              <span>Golongan:</span>
            </span>
            {(['ALL', 'Siaga', 'Penggalang', 'Penegak', 'Pandega'] as const).map((gol) => {
              const isSelected = filterGolongan === gol;
              return (
                <button
                  key={gol}
                  type="button"
                  onClick={() => setFilterGolongan(gol)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-amber-400 ring-1 ring-amber-400 shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {gol === 'ALL' ? 'Semua Golongan' : gol}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* VIEW 1: REKAPITULASI KOLEKTIF PESERTA */}
      {rekapTab === 'kolektif' && (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari berdasarkan nama, pangkalan, atau nomor peserta..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-stone-600">
                <Filter className="w-3.5 h-3.5 text-amber-700" />
                <span className="font-semibold">Regu:</span>
                <select
                  value={filterKelompok}
                  onChange={(e) => setFilterKelompok(e.target.value)}
                  className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">Semua Regu</option>
                  {kelompokList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-stone-600">
                <span className="font-semibold">Hasil:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="LULUS">Lulus (≥ 80%)</option>
                  <option value="BELUM_LULUS">Belum Lulus (&lt; 80%)</option>
                  <option value="BELUM_DINILAI">Belum Dinilai</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Recap Table Container (Printable and Exportable) */}
          <div
            id="rekap-collective-printable-container"
            className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden print:border-none print:shadow-none p-4 sm:p-6 print:p-0"
          >
            {/* Collective Print Header (Visible on print and PDF export) */}
            <div className="mb-4">
              <KopSurat settings={settings} showDoubleBorder={true} />
              <div className="text-center mt-3 pt-1">
                <h2 className="text-xs sm:text-sm font-black text-black uppercase tracking-wider">
                  BERITA ACARA &amp; REKAPITULASI PENILAIAN PRAMUKA GARUDA TAHUN {settings.tahun}
                </h2>
                <div className="text-[11px] text-stone-700 font-semibold mt-0.5">
                  {filterGolongan === 'ALL' ? settings.golongan : `GOLONGAN ${filterGolongan.toUpperCase()}`} • {settings.kwartirCabang}
                </div>
              </div>
            </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse border border-stone-300 print:border-stone-800">
            <thead>
              <tr className="bg-stone-100 text-stone-900 font-extrabold border-b border-stone-300 print:border-stone-800 print:bg-stone-100">
                <th className="py-2.5 px-2 w-10 text-center border-r border-stone-200 print:border-stone-800">
                  NO
                </th>
                <th className="py-2.5 px-3 border-r border-stone-200 print:border-stone-800">
                  NO. PESERTA
                </th>
                <th className="py-2.5 px-3 border-r border-stone-200 print:border-stone-800">
                  NAMA PESERTA
                </th>
                <th className="py-2.5 px-3 border-r border-stone-200 print:border-stone-800">
                  PANGKALAN & REGU
                </th>
                <th className="py-2.5 px-2 text-center border-r border-stone-200 print:border-stone-800">
                  ADMINISTRASI
                </th>
                <th className="py-2.5 px-2 text-center border-r border-stone-200 print:border-stone-800">
                  SKOR WAWANCARA
                </th>
                <th className="py-2.5 px-2 text-center border-r border-stone-200 print:border-stone-800">
                  %
                </th>
                <th className="py-2.5 px-3 text-center border-r border-stone-200 print:border-stone-800">
                  STATUS
                </th>
                <th className="py-2.5 px-3 text-right print:hidden">
                  AKSI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 print:divide-stone-800 text-[11px] sm:text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400 italic">
                    Tidak ada data yang cocok dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((item, idx) => {
                  const { peserta, kelompok, penilaian, penguji } = item;
                  const isSiaga = peserta.golongan === 'Siaga';
                  const adminTotal = penilaian ? penilaian.administrasi.length : (isSiaga ? 12 : 14);
                  const maxSkor = penilaian ? penilaian.wawancara.length * 5 : (isSiaga ? 45 : 55);

                  let adminYa = 0;
                  let skorWawancara = 0;
                  let persentase = 0;
                  let isLulus = false;

                  if (penilaian) {
                    adminYa = penilaian.administrasi.filter((a) => a.tersedia).length;
                    skorWawancara = penilaian.wawancara.reduce((s, w) => s + (w.poin || 0), 0);
                    persentase = Number(((skorWawancara / maxSkor) * 100).toFixed(2));
                    isLulus = persentase >= 80;
                  }

                  return (
                    <tr
                      key={peserta.id}
                      className={`hover:bg-amber-50/30 transition-colors ${
                        idx % 2 === 1 ? 'bg-stone-50/50' : 'bg-white'
                      }`}
                    >
                      <td className="py-2.5 px-2 text-center font-bold text-stone-400 border-r border-stone-200 print:border-stone-800">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-950 border-r border-stone-200 print:border-stone-800">
                        {peserta.nomorPeserta}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-stone-900 border-r border-stone-200 print:border-stone-800">
                        <div>{peserta.nama}</div>
                        <div className="text-[10px] text-stone-500 font-normal">
                          {peserta.golongan || 'Penggalang'} • {peserta.jenisKelamin === 'L' ? 'Putra' : 'Putri'} • TKU {peserta.tingkatTKU}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 border-r border-stone-200 print:border-stone-800">
                        <div className="font-medium text-stone-800">{peserta.pangkalan}</div>
                        <div className="text-[10px] text-stone-500">
                          {kelompok?.nama || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center border-r border-stone-200 print:border-stone-800">
                        {penilaian ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              adminYa === adminTotal
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {adminYa}/{adminTotal}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-stone-900 border-r border-stone-200 print:border-stone-800">
                        {penilaian ? `${skorWawancara} / ${maxSkor}` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-stone-900 border-r border-stone-200 print:border-stone-800">
                        {penilaian ? `${persentase}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center border-r border-stone-200 print:border-stone-800">
                        {penilaian ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              isLulus
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                                : 'bg-rose-100 text-rose-900 border border-rose-400'
                            }`}
                          >
                            {isLulus ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> LULUS
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-rose-700" /> BELUM LULUS
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-stone-100 text-stone-400 text-[10px] rounded-md italic">
                            Belum Ujian
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          {penilaian ? (
                            <>
                              <button
                                onClick={() => onOpenPrintPreview(peserta.id)}
                                className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                title="Buka Pratinjau Cetak / PDF Resmi"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Cetak PDF</span>
                              </button>
                              <button
                                onClick={() =>
                                  exportLembarIndividuToExcel(
                                    peserta,
                                    penilaian,
                                    penguji,
                                    settings
                                  )
                                }
                                className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors"
                                title="Ekspor Lembar Nilai ke Excel"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onNavigateToNilai(peserta.id)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-lg text-xs font-bold transition-colors"
                            >
                              Mulai Uji &rarr;
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Collective Print Signature Block with Stamp */}
        <div className="mt-8 pt-4 border-t border-stone-400">
          <div className="grid grid-cols-2 gap-8 text-xs text-stone-800 items-end">
            <div>
              <div className="font-extrabold mb-1">Catatan Berita Acara Kelulusan:</div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-stone-700">
                <li>Kriteria kelulusan minimal 80% dari total poin wawancara (Siaga: min. 36 dari 45 poin, Penggalang: min. 44 dari 55 poin).</li>
                <li>Peserta yang berstatus LULUS diajukan untuk penerbitan Piagam dan Tanda Pramuka Garuda.</li>
                <li>Butir administrasi yang belum lengkap diberikan batas perbaikan 3 hari sebelum wawancara.</li>
              </ul>
            </div>

            <div className="relative text-right">
              <div className="text-xs text-stone-700">
                {settings.tempat}, {formatTanggalIndonesia()}
              </div>
              <div className="font-extrabold text-stone-900 mt-0.5">
                Ketua Tim Penguji Pramuka Garuda,
              </div>

              <div className="relative h-20 flex items-center justify-end">
                <div className="absolute right-12 -top-2 z-10 pointer-events-none">
                  <OfficialScoutStamp
                    kwartirName={settings.kwartirCabang}
                    tahun={settings.tahun}
                    size={105}
                  />
                </div>
                <div className="relative z-20 text-stone-800 select-none transform -rotate-2">
                  <svg width="140" height="50" viewBox="0 0 140 50" fill="none">
                    <path
                      d="M 10 35 C 25 15, 35 10, 45 28 C 55 45, 60 5, 75 25 C 90 40, 105 15, 120 30"
                      stroke="#1E3A8A"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 30 42 C 55 38, 95 38, 125 40"
                      stroke="#1E3A8A"
                      strokeWidth="1.8"
                    />
                  </svg>
                </div>
              </div>

              <div className="relative z-20">
                <div className="font-black text-stone-950 underline text-sm">
                  {settings.mabigusAtauKetuaPanitia || 'Drs. H. Achmad Supriyanto, M.Pd.'}
                </div>
                <div className="text-[11px] font-mono text-stone-700">
                  NTA. 11.02.00.001
                </div>
                <div className="text-[10px] text-stone-500">
                  {settings.kwartirCabang}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )}

  {/* VIEW 2: REKAP NILAI PENGUJI */}
  {rekapTab === 'penguji' && (
    <div className="space-y-6">
      {/* Penguji Selection Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-700" />
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Pilih Penguji Golongan {filterGolongan === 'ALL' ? 'Semua' : filterGolongan}
              </h3>
              <p className="text-[11px] text-stone-500">
                Lihat ringkasan nilai, rata-rata skor, dan daftar peserta per penguji
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedPengujiId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedPengujiId === 'ALL'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Semua Penguji ({pengujiInGolongan.length})
            </button>
            {pengujiInGolongan.map((pj) => {
              const isSelected = selectedPengujiId === pj.id;
              const shortName = pj.nama.replace(/\b(kak|kakak)\b\.?/gi, '').trim().split(',')[0];
              return (
                <button
                  key={pj.id}
                  type="button"
                  onClick={() => setSelectedPengujiId(pj.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {shortName}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cards per Penguji */}
      {pengujiInGolongan
        .filter((pj) => selectedPengujiId === 'ALL' || pj.id === selectedPengujiId)
        .map((pj) => {
          // Find all peserta assessed by this penguji in selected golongan
          const itemsByPenguji = rowsInSelectedGolongan.filter(
            (item) => item.penilaian && item.penilaian.pengujiId === pj.id
          );

          const diujiCount = itemsByPenguji.length;
          const lulusPj = itemsByPenguji.filter((item) => {
            const isSiaga = item.peserta.golongan === 'Siaga' || pj.golongan === 'Siaga';
            const maxSkor = item.penilaian!.wawancara.length * 5 || (isSiaga ? 45 : 55);
            const skor = item.penilaian!.wawancara.reduce((s, w) => s + (w.poin || 0), 0);
            return (skor / maxSkor) * 100 >= 80;
          }).length;
          const belumLulusPj = diujiCount - lulusPj;
          const totalPersenPj = itemsByPenguji.reduce((sum, item) => {
            const isSiaga = item.peserta.golongan === 'Siaga' || pj.golongan === 'Siaga';
            const maxSkor = item.penilaian!.wawancara.length * 5 || (isSiaga ? 45 : 55);
            const skor = item.penilaian!.wawancara.reduce((s, w) => s + (w.poin || 0), 0);
            return sum + (skor / maxSkor) * 100;
          }, 0);
          const avgPersen = diujiCount > 0 ? (totalPersenPj / diujiCount).toFixed(1) : '0';

          return (
            <div
              key={pj.id}
              className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-stone-200 space-y-5"
            >
              {/* Penguji Header Card */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                    {pj.nama.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-black text-stone-900">
                        {pj.nama}
                      </h4>
                      {pj.golongan && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          {pj.golongan}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {pj.nipNta || 'NTA. -'} • {pj.jabatan} • {pj.pangkalan}
                    </p>
                  </div>
                </div>

                {/* Export & Actions for this Penguji */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => exportRekapPengujiToExcel(pj, itemsByPenguji, settings, filterGolongan)}
                    disabled={diujiCount === 0}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40 cursor-pointer"
                    title={`Ekspor Rekap Excel Nilai ${pj.nama}`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Ekspor Excel Penguji</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Cetak Berita Acara Rekap Nilai Penguji"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cetak</span>
                  </button>
                </div>
              </div>

              {/* Penguji Scorecard Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                    Peserta Diuji
                  </span>
                  <div className="text-xl font-black text-stone-900 mt-0.5">
                    {diujiCount} <span className="text-xs font-normal text-stone-500">calon</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Lulus Uji (≥80%)
                  </span>
                  <div className="text-xl font-black text-emerald-950 mt-0.5">
                    {lulusPj} <span className="text-xs font-normal text-emerald-700">peserta</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                    Belum Lulus
                  </span>
                  <div className="text-xl font-black text-rose-950 mt-0.5">
                    {belumLulusPj} <span className="text-xs font-normal text-rose-700">peserta</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Rata-rata Nilai
                  </span>
                  <div className="text-xl font-black text-amber-950 mt-0.5">
                    {avgSkor} <span className="text-xs font-bold text-amber-700">({avgPersen}%)</span>
                  </div>
                </div>
              </div>

              {/* Table of Peserta graded by this Penguji */}
              {diujiCount > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100 text-stone-900 font-extrabold border-b border-stone-200">
                        <th className="py-2.5 px-3 w-10 text-center">NO</th>
                        <th className="py-2.5 px-3">NO. PESERTA</th>
                        <th className="py-2.5 px-3">NAMA PESERTA</th>
                        <th className="py-2.5 px-3">PANGKALAN</th>
                        <th className="py-2.5 px-3 text-center">ADMINISTRASI</th>
                        <th className="py-2.5 px-3 text-center">WAWANCARA</th>
                        <th className="py-2.5 px-3 text-center">% SKOR</th>
                        <th className="py-2.5 px-3 text-center">HASIL</th>
                        <th className="py-2.5 px-3 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {itemsByPenguji.map((item, idx) => {
                        const pen = item.penilaian!;
                        const isSiaga = item.peserta.golongan === 'Siaga' || pj.golongan === 'Siaga';
                        const adminTotal = pen.administrasi.length || (isSiaga ? 12 : 14);
                        const maxSkor = pen.wawancara.length * 5 || (isSiaga ? 45 : 55);

                        const adminYa = pen.administrasi.filter((a) => a.tersedia).length;
                        const skor = pen.wawancara.reduce((s, w) => s + (w.poin || 0), 0);
                        const persen = Number(((skor / maxSkor) * 100).toFixed(2));
                        const isLulus = persen >= 80;

                        return (
                          <tr key={item.peserta.id} className="hover:bg-amber-50/30">
                            <td className="py-2.5 px-3 text-center font-bold text-stone-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-950">
                              {item.peserta.nomorPeserta}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-stone-900">
                              <div>{item.peserta.nama}</div>
                              <div className="text-[10px] text-stone-500 font-normal">
                                {item.peserta.golongan || 'Penggalang'} • {item.peserta.jenisKelamin === 'L' ? 'Putra' : 'Putri'} • TKU {item.peserta.tingkatTKU}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-stone-700">
                              <div>{item.peserta.pangkalan}</div>
                              <div className="text-[10px] text-stone-500">{item.kelompok?.nama || '-'}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  adminYa === adminTotal
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {adminYa}/{adminTotal}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-900">
                              {skor} / {maxSkor}
                            </td>
                            <td className="py-2.5 px-3 text-center font-black text-stone-900">
                              {persen}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  isLulus
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                                }`}
                              >
                                {isLulus ? 'LULUS' : 'BELUM LULUS'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onOpenPrintPreview(item.peserta.id)}
                                  className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Pratinjau Cetak Lembar Nilai Resmi"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Cetak</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onNavigateToNilai(item.peserta.id)}
                                  className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                  title="Ubah Nilai Peserta Ini"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <UserCheck className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-stone-600">
                    Belum ada calon Garuda yang dinilai oleh {pj.nama}.
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Buka menu Form Penilaian untuk mulai menguji portofolio administrasi dan kemampuan wawancara.
                  </p>
                </div>
              )}
            </div>
          );
        })}
    </div>
  )}
    </div>
  );
};
