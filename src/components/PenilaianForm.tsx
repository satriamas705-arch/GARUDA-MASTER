import React, { useState, useEffect } from 'react';
import {
  Peserta,
  Penguji,
  PenilaianPeserta,
  AppSettings,
  ItemAdministrasi,
  ItemWawancara,
  AuthUser,
} from '../types';
import {
  DEFAULT_ADMINISTRASI_TEMPLATE,
  DEFAULT_WAWANCARA_TEMPLATE,
  SIAGA_ADMINISTRASI_TEMPLATE,
  SIAGA_WAWANCARA_TEMPLATE,
} from '../data/initialData';
import {
  CheckCircle2,
  XCircle,
  Save,
  Printer,
  RotateCcw,
  Sparkles,
  ChevronRight,
  FileSpreadsheet,
  Award,
  AlertTriangle,
  FileText,
  Trash2,
} from 'lucide-react';
import { exportLembarIndividuToExcel } from '../utils/exportExcel';
import {
  extractGolonganName,
  formatPencapaianForGolongan,
  GolonganType,
  getAdministrasiTemplate,
  getWawancaraTemplate,
  getMaxSkorWawancara,
  getAdminTotalCount,
  calculateKelulusanWawancara,
} from '../utils/golongan';

interface PenilaianFormProps {
  pesertaList: Peserta[];
  pengujiList: Penguji[];
  penilaianMap: Record<string, PenilaianPeserta>;
  selectedPesertaId: string | null;
  settings: AppSettings;
  currentUser?: AuthUser | null;
  activeGolongan?: GolonganType;
  onSavePenilaian: (penilaian: PenilaianPeserta) => void;
  onOpenPrintPreview: (pesertaId: string) => void;
  onSelectPeserta: (pesertaId: string) => void;
  onResetPesertaPenilaian?: (pesertaId: string) => void;
  onResetAllPenilaian?: () => void;
}

export const PenilaianForm: React.FC<PenilaianFormProps> = ({
  pesertaList,
  pengujiList,
  penilaianMap,
  selectedPesertaId,
  settings,
  currentUser,
  activeGolongan,
  onSavePenilaian,
  onOpenPrintPreview,
  onSelectPeserta,
  onResetPesertaPenilaian,
  onResetAllPenilaian,
}) => {
  const effectiveGolongan: GolonganType =
    activeGolongan ||
    currentUser?.selectedGolongan ||
    extractGolonganName(settings.golongan) ||
    'Penggalang';

  const displayedPeserta = pesertaList.filter(
    (p) => (p.golongan || 'Penggalang') === effectiveGolongan
  );

  const currentPeserta =
    displayedPeserta.find((p) => p.id === selectedPesertaId) ||
    displayedPeserta[0] ||
    null;

  const existingPenilaian = currentPeserta ? penilaianMap[currentPeserta.id] : undefined;

  // Filter penguji according to effectiveGolongan
  const availablePenguji = pengujiList.filter(
    (pj) => !pj.golongan || pj.golongan === effectiveGolongan
  );

  // Form states
  const defaultPengujiId =
    currentUser?.role === 'penguji' && currentUser.pengujiId
      ? currentUser.pengujiId
      : (availablePenguji[0]?.id || pengujiList[0]?.id || '');

  const [pengujiId, setPengujiId] = useState<string>(
    existingPenilaian?.pengujiId || defaultPengujiId
  );

  useEffect(() => {
    if (availablePenguji.length > 0 && !availablePenguji.some((pj) => pj.id === pengujiId)) {
      setPengujiId(availablePenguji[0].id);
    }
  }, [effectiveGolongan, availablePenguji, pengujiId]);

  const [tanggal, setTanggal] = useState<string>(
    existingPenilaian?.tanggalPenilaian || settings.tanggalDefault || new Date().toISOString().split('T')[0]
  );
  const [catatanUmum, setCatatanUmum] = useState<string>(existingPenilaian?.catatanUmum || '');

  const currentGolongan: GolonganType = effectiveGolongan;
  const targetAdminTemplate = getAdministrasiTemplate(currentGolongan);
  const targetWawancaraTemplate = getWawancaraTemplate(currentGolongan);

  const [administrasi, setAdministrasi] = useState<ItemAdministrasi[]>(() => {
    if (existingPenilaian?.administrasi && existingPenilaian.administrasi.length === targetAdminTemplate.length) {
      return existingPenilaian.administrasi;
    }
    return targetAdminTemplate.map((item) => {
      const match = existingPenilaian?.administrasi?.find((a) => a.id === item.id);
      return {
        ...item,
        tersedia: match ? match.tersedia : false,
        catatan: match ? match.catatan : '',
      };
    });
  });

  const [wawancara, setWawancara] = useState<ItemWawancara[]>(() => {
    if (existingPenilaian?.wawancara && existingPenilaian.wawancara.length === targetWawancaraTemplate.length) {
      return existingPenilaian.wawancara;
    }
    return targetWawancaraTemplate.map((item) => {
      const match = existingPenilaian?.wawancara?.find((w) => w.id === item.id);
      return {
        ...item,
        poin: match ? match.poin : 0,
        catatan: match ? match.catatan : '',
      };
    });
  });

  const [activeTab, setActiveTab] = useState<'administrasi' | 'wawancara' | 'semua'>('semua');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isResetCurrentModalOpen, setIsResetCurrentModalOpen] = useState(false);
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [resetFeedbackMessage, setResetFeedbackMessage] = useState<string | null>(null);

  const handleConfirmResetCurrent = () => {
    if (!currentPeserta) return;
    const tAdmin = getAdministrasiTemplate(currentGolongan);
    const tWawancara = getWawancaraTemplate(currentGolongan);
    setAdministrasi(
      tAdmin.map((item) => ({
        ...item,
        tersedia: false,
        catatan: '',
      }))
    );
    setWawancara(
      tWawancara.map((item) => ({
        ...item,
        poin: 0,
        catatan: '',
      }))
    );
    setCatatanUmum('');
    if (onResetPesertaPenilaian) {
      onResetPesertaPenilaian(currentPeserta.id);
    }
    setIsResetCurrentModalOpen(false);
    setResetFeedbackMessage(
      `Formulir penilaian untuk ${currentPeserta.nama} berhasil di-reset ke kondisi belum dinilai.`
    );
    setTimeout(() => setResetFeedbackMessage(null), 3500);
  };

  const handleConfirmResetAll = () => {
    if (onResetAllPenilaian) {
      onResetAllPenilaian();
    }
    const tAdmin = getAdministrasiTemplate(currentGolongan);
    const tWawancara = getWawancaraTemplate(currentGolongan);
    setAdministrasi(
      tAdmin.map((item) => ({
        ...item,
        tersedia: false,
        catatan: '',
      }))
    );
    setWawancara(
      tWawancara.map((item) => ({
        ...item,
        poin: 0,
        catatan: '',
      }))
    );
    setCatatanUmum('');
    setIsResetAllModalOpen(false);
    setResetFeedbackMessage(
      'Seluruh hasil penilaian semua peserta berhasil di-reset / dikosongkan.'
    );
    setTimeout(() => setResetFeedbackMessage(null), 3500);
  };

  // Synchronize when currentPeserta changes
  useEffect(() => {
    if (!currentPeserta) return;
    const g = (currentPeserta.golongan as GolonganType) || effectiveGolongan;
    const tAdmin = getAdministrasiTemplate(g);
    const tWawancara = getWawancaraTemplate(g);
    const pen = penilaianMap[currentPeserta.id];

    if (pen) {
      setPengujiId(pen.pengujiId || pengujiList[0]?.id || '');
      setTanggal(pen.tanggalPenilaian || settings.tanggalDefault);
      setCatatanUmum(pen.catatanUmum || '');

      // Check if existing administrasi matches the target template length
      if (pen.administrasi && pen.administrasi.length === tAdmin.length) {
        setAdministrasi(pen.administrasi);
      } else {
        // Adapt saved data to current template
        setAdministrasi(
          tAdmin.map((item) => {
            const match = pen.administrasi?.find((a) => a.id === item.id);
            return {
              ...item,
              tersedia: match ? match.tersedia : false,
              catatan: match ? match.catatan : '',
            };
          })
        );
      }

      // Check if existing wawancara matches the target template length
      if (pen.wawancara && pen.wawancara.length === tWawancara.length) {
        setWawancara(pen.wawancara);
      } else {
        // Adapt saved data to current template
        setWawancara(
          tWawancara.map((item) => {
            const match = pen.wawancara?.find((w) => w.id === item.id);
            return {
              ...item,
              poin: match ? match.poin : 0,
              catatan: match ? match.catatan : '',
            };
          })
        );
      }
    } else {
      setPengujiId(pengujiList[0]?.id || '');
      setTanggal(settings.tanggalDefault);
      setCatatanUmum('');
      setAdministrasi(
        tAdmin.map((item) => ({
          ...item,
          tersedia: false,
          catatan: '',
        }))
      );
      setWawancara(
        tWawancara.map((item) => ({
          ...item,
          poin: 0,
          catatan: '',
        }))
      );
    }
  }, [currentPeserta?.id, currentPeserta?.golongan, penilaianMap, pengujiList, settings.tanggalDefault, effectiveGolongan]);

  // Calculations dynamic per Golongan (Siaga: Max 45 / Min 36, Penggalang: Max 55 / Min 44)
  const adminYaCount = administrasi.filter((a) => a.tersedia).length;
  const adminTotalCount = getAdminTotalCount(currentGolongan, administrasi);
  const totalPoinWawancara = wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
  const maxSkorWawancara = getMaxSkorWawancara(currentGolongan, wawancara);
  const { persentase, isLulus, minPoinLulus } = calculateKelulusanWawancara(
    totalPoinWawancara,
    maxSkorWawancara
  );

  // Handlers for Administrasi
  const handleToggleAdmin = (id: number, val: boolean) => {
    setAdministrasi((prev) =>
      prev.map((item) => (item.id === id ? { ...item, tersedia: val } : item))
    );
  };

  const handleChangeAdminCatatan = (id: number, text: string) => {
    setAdministrasi((prev) =>
      prev.map((item) => (item.id === id ? { ...item, catatan: text } : item))
    );
  };

  const handleMarkAllAdmin = (val: boolean) => {
    setAdministrasi((prev) =>
      prev.map((item) => ({
        ...item,
        tersedia: val,
        catatan: val ? 'Lengkap & Terverifikasi' : '',
      }))
    );
  };

  // Handlers for Wawancara
  const handleSetPoinWawancara = (id: number, poinVal: number) => {
    setWawancara((prev) =>
      prev.map((item) => (item.id === id ? { ...item, poin: poinVal } : item))
    );
  };

  const handleChangeWawancaraCatatan = (id: number, text: string) => {
    setWawancara((prev) =>
      prev.map((item) => (item.id === id ? { ...item, catatan: text } : item))
    );
  };

  const handleSetAllWawancaraPoin = (poinVal: number) => {
    setWawancara((prev) =>
      prev.map((item) => ({
        ...item,
        poin: poinVal,
      }))
    );
  };

  const handleSave = () => {
    if (!currentPeserta) return;
    const payload: PenilaianPeserta = {
      pesertaId: currentPeserta.id,
      pengujiId,
      tanggalPenilaian: tanggal,
      administrasi,
      wawancara,
      catatanUmum,
      updatedAt: new Date().toISOString(),
    };
    onSavePenilaian(payload);
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 3000);
  };

  const handleExportExcel = () => {
    if (!currentPeserta) return;
    const pengujiObj = pengujiList.find((p) => p.id === pengujiId);
    const mockPayload: PenilaianPeserta = {
      pesertaId: currentPeserta.id,
      pengujiId,
      tanggalPenilaian: tanggal,
      administrasi,
      wawancara,
      catatanUmum,
      updatedAt: new Date().toISOString(),
    };
    exportLembarIndividuToExcel(currentPeserta, mockPayload, pengujiObj, settings);
  };

  if (!currentPeserta) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-amber-200 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-stone-800">Belum Ada Data Peserta</h3>
        <p className="text-stone-600 text-sm mt-1">
          Silakan tambahkan data peserta terlebih dahulu di menu Data Peserta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Selector & Participant Identity Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-amber-900/10 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-900/70">
                Pilih Peserta yang Dinilai
              </label>
              {/* Filter Golongan Badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Golongan: {effectiveGolongan}
                </span>
                <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  {displayedPeserta.length} Peserta
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={currentPeserta.id}
                onChange={(e) => onSelectPeserta(e.target.value)}
                className="bg-amber-50/50 border border-amber-300 font-semibold text-stone-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none min-w-[260px]"
              >
                {displayedPeserta.map((p) => {
                  const hasPen = !!penilaianMap[p.id];
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nomorPeserta} - {p.nama} ({p.pangkalan}) [{p.golongan || effectiveGolongan}] {hasPen ? '✓' : ''}
                    </option>
                  );
                })}
              </select>

              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2.5 py-1 font-bold rounded-lg text-white ${
                  effectiveGolongan === 'Siaga'
                    ? 'bg-emerald-600'
                    : effectiveGolongan === 'Penggalang'
                    ? 'bg-rose-600'
                    : effectiveGolongan === 'Penegak'
                    ? 'bg-amber-600'
                    : 'bg-stone-600'
                }`}>
                  {effectiveGolongan}
                </span>
                <span className="px-2.5 py-1 bg-stone-100 text-stone-700 font-medium rounded-lg">
                  TKU: {currentPeserta.tingkatTKU}
                </span>
                <span className="px-2.5 py-1 bg-stone-100 text-stone-700 font-medium rounded-lg">
                  {currentPeserta.jenisKelamin === 'L' ? 'Putra (L)' : 'Putri (P)'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Examiner & Date pickers */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Tim Penguji ({effectiveGolongan})
              </label>
              <select
                value={pengujiId}
                onChange={(e) => setPengujiId(e.target.value)}
                className="bg-white border border-stone-300 text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-amber-500"
              >
                {availablePenguji.map((pj) => (
                  <option key={pj.id} value={pj.id}>
                    {pj.nama} ({pj.jabatan}) {pj.golongan ? `[${pj.golongan}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Tanggal Ujian
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="bg-white border border-stone-300 text-xs sm:text-sm rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Tombol Reset Penilaian */}
            <div className="flex items-center gap-2 pt-4 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsResetCurrentModalOpen(true)}
                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                title="Kosongkan nilai peserta yang sedang dibuka"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Reset Form Ini</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetAllModalOpen(true)}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 border border-rose-300 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
                title="Kosongkan seluruh nilai semua peserta di sistem"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset Semua Nilai</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notifikasi feedback reset */}
        {resetFeedbackMessage && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resetFeedbackMessage}</span>
          </div>
        )}

        {/* Live Scorecard Banner */}
        <div className="mt-5 pt-4 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              1. Berkas Administrasi
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-amber-950">
                {adminYaCount}
              </span>
              <span className="text-xs text-stone-600 font-semibold">/ {adminTotalCount} Butir</span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
              {adminYaCount === adminTotalCount ? '✓ Semua Terpenuhi' : `${adminTotalCount - adminYaCount} belum terpenuhi`}
            </span>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              2. Poin Wawancara
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-stone-900">
                {totalPoinWawancara}
              </span>
              <span className="text-xs text-stone-600 font-semibold">/ {maxSkorWawancara} Maks</span>
            </div>
            <span className="text-[11px] text-stone-500 font-medium mt-0.5 block">
              Formula: Poin / {maxSkorWawancara}
            </span>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              3. % Pencapaian
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-stone-900">
                {persentase}%
              </span>
            </div>
            <span className="text-[11px] text-stone-600 font-medium mt-0.5 block">
              Target Lulus: Min. 80.00% (≥ {minPoinLulus} Poin)
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border flex flex-col justify-between ${
              isLulus
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
              Hasil Kelulusan
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {isLulus ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="font-black text-base sm:text-lg leading-tight">
                {isLulus ? 'LULUS' : 'BELUM LULUS'}
              </span>
            </div>
            <span className="text-[10px] mt-0.5 font-semibold">
              {isLulus ? `Syarat ≥ 80% terpenuhi (min. ${minPoinLulus} poin)` : `Kurang dari 80% (< ${minPoinLulus} poin)`}
            </span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('semua')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'semua'
                  ? 'bg-amber-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Tampilkan Semua
            </button>
            <button
              onClick={() => setActiveTab('administrasi')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'administrasi'
                  ? 'bg-amber-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              A. Administrasi ({adminYaCount}/{adminTotalCount})
            </button>
            <button
              onClick={() => setActiveTab('wawancara')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'wawancara'
                  ? 'bg-amber-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              B. Wawancara ({totalPoinWawancara}/{maxSkorWawancara})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 flex items-center gap-1.5 transition-colors border border-stone-200"
              title="Unduh Lembar Ini ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>

            <button
              onClick={() => onOpenPrintPreview(currentPeserta.id)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center gap-1.5 transition-colors border border-amber-300"
              title="Cetak format asli foto / Simpan PDF"
            >
              <Printer className="w-4 h-4 text-amber-800" />
              <span>Cetak / PDF Resmi</span>
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs sm:text-sm font-extrabold rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Penilaian</span>
            </button>
          </div>
        </div>

        {showSavedFeedback && (
          <div className="mt-3 p-2.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Penilaian untuk {currentPeserta.nama} berhasil disimpan ke database lokal!</span>
          </div>
        )}
      </div>

      {/* ================= SECTION A: ADMINISTRASI ================= */}
      {(activeTab === 'semua' || activeTab === 'administrasi') && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm">
                A
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
                  A. ADMINISTRASI ({adminTotalCount} Butir Penilaian)
                </h3>
                <p className="text-xs text-stone-300">
                  {currentGolongan === 'Siaga'
                    ? 'Centang (✓) YA jika data tersedia, atau TIDAK jika data tidak tersedia (sesuai SIAGA.docx Kwarcab Banyumas).'
                    : 'Centang YA jika berkas tersedia, atau TIDAK jika belum lengkap.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMarkAllAdmin(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tandai Semua YA</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkAllAdmin(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-200 text-stone-700 font-bold bg-stone-50">
                    <th className="py-2.5 px-3 w-12 text-center">NO</th>
                    <th className="py-2.5 px-3">PENCAPAIAN ADMINISTRASI</th>
                    <th className="py-2.5 px-3 w-36 text-center">KETERSEDIAAN DATA</th>
                    <th className="py-2.5 px-3 w-64 sm:w-80">KETERANGAN / CATATAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {administrasi.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-amber-50/40 transition-colors ${
                        item.tersedia ? 'bg-emerald-50/20' : 'bg-stone-50/30'
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold text-stone-500 align-top">
                        {item.id}
                      </td>
                      <td className="py-3 px-3 text-stone-900 font-medium leading-relaxed align-top">
                        {item.pencapaian}
                      </td>
                      <td className="py-3 px-3 text-center align-top">
                        <div className="inline-flex rounded-xl p-1 bg-stone-200/80 border border-stone-300">
                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(item.id, true)}
                            className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                              item.tersedia
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            YA
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(item.id, false)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                              !item.tersedia
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            TIDAK
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 align-top">
                        <input
                          type="text"
                          value={item.catatan}
                          onChange={(e) => handleChangeAdminCatatan(item.id, e.target.value)}
                          placeholder="Catatan berkas (opsional)..."
                          className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-stone-700 italic space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5 not-italic">
                <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  {currentGolongan === 'Siaga'
                    ? 'Point Administrasi Sesuai Dokumen Resmi SIAGA Kwarcab Banyumas:'
                    : 'Catatan Resmi Administrasi:'}
                </span>
              </div>
              <p>
                Point Administrasi : Centang (✓) Ya (jika data tersedia) atau Tidak (Jika Data Tidak tersedia)
              </p>
              <p>
                (Catatan = Namun point - point yang belum terpenuhi diberikan waktu 3 hari sebelum pelaksanaan Wawancara)
              </p>
              {currentGolongan === 'Siaga' && (
                <p className="text-amber-800 font-medium">
                  * Khusus siaga putri jika bidang berwarna kuning (bidang agama, mental, moral dan spiritual) tidak terpenuhi maka bisa digantikan dengan bidang lain.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION B: WAWANCARA ================= */}
      {(activeTab === 'semua' || activeTab === 'wawancara') && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm">
                B
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">
                  B. WAWANCARA ({wawancara.length} Butir Pencapaian & Keterampilan)
                </h3>
                <p className="text-xs text-stone-300">
                  Skala poin kemampuan: 1 (Sangat Kurang), 2 (Kurang), 3 (Cukup), 4 (Baik), 5 (Sangat Baik). Skor Maksimal: {maxSkorWawancara} Poin.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetAllWawancaraPoin(4)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 transition-colors"
                title="Beri skor 4 (Baik) untuk semua butir"
              >
                <span>Preset Nilai 4</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetAllWawancaraPoin(5)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-colors"
                title="Beri skor 5 (Sangat Baik) untuk semua butir"
              >
                <span>Preset Nilai 5</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetAllWawancaraPoin(0)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-stone-200 text-stone-700 font-bold bg-stone-50">
                    <th className="py-2.5 px-3 w-12 text-center">NO</th>
                    <th className="py-2.5 px-3">PENCAPAIAN UJI WAWANCARA & BAKAT</th>
                    <th className="py-2.5 px-3 w-56 text-center">POIN KEMAMPUAN (1 - 5)</th>
                    <th className="py-2.5 px-3 w-64 sm:w-80">KETERANGAN / CATATAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {wawancara.map((item) => (
                    <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-stone-500 align-top">
                        {item.id}
                      </td>
                      <td className="py-3 px-3 text-stone-900 font-medium leading-relaxed align-top">
                        {formatPencapaianForGolongan(item.pencapaian, currentPeserta.golongan || effectiveGolongan)}
                      </td>
                      <td className="py-2 px-3 text-center align-top">
                        <div className="inline-flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-300">
                          {[1, 2, 3, 4, 5].map((scale) => {
                            const isSelected = item.poin === scale;
                            return (
                              <button
                                key={scale}
                                type="button"
                                onClick={() => handleSetPoinWawancara(item.id, scale)}
                                className={`w-8 h-8 rounded-lg font-black text-xs transition-all ${
                                  isSelected
                                    ? scale >= 4
                                      ? 'bg-amber-600 text-white shadow-md scale-105'
                                      : scale === 3
                                      ? 'bg-amber-500 text-white shadow-md'
                                      : 'bg-rose-500 text-white shadow-md'
                                    : 'text-stone-700 hover:bg-stone-200'
                                }`}
                                title={`Nilai ${scale}`}
                              >
                                {scale}
                              </button>
                            );
                          })}
                        </div>
                        <div className="text-[10px] text-stone-500 mt-1 font-semibold">
                          {item.poin === 1 && 'Sangat Kurang'}
                          {item.poin === 2 && 'Kurang'}
                          {item.poin === 3 && 'Cukup'}
                          {item.poin === 4 && 'Baik'}
                          {item.poin === 5 && 'Sangat Baik'}
                          {item.poin === 0 && 'Belum dinilai'}
                        </div>
                      </td>
                      <td className="py-2 px-3 align-top">
                        <input
                          type="text"
                          value={item.catatan}
                          onChange={(e) => handleChangeWawancaraCatatan(item.id, e.target.value)}
                          placeholder="Catatan penguji saat wawancara..."
                          className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Scale legend */}
            <div className="mt-4 p-3 bg-stone-100 rounded-xl text-xs text-stone-700 font-medium flex flex-wrap gap-4 items-center">
              <span className="font-bold text-stone-900">Keterangan Skala Poin:</span>
              <span>1 = Sangat Kurang</span>
              <span>2 = Kurang</span>
              <span>3 = Cukup</span>
              <span>4 = Baik</span>
              <span>5 = Sangat Baik</span>
            </div>

            {/* General examiner notes */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Catatan Umum Penguji & Rekomendasi:
              </label>
              <textarea
                rows={2}
                value={catatanUmum}
                onChange={(e) => setCatatanUmum(e.target.value)}
                placeholder="Tuliskan rekomendasi atau catatan khusus untuk peserta ini..."
                className="w-full bg-white border border-stone-300 rounded-xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Footer Bottom Save Bar */}
            <div className="mt-5 pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-600">
                Formula resmi: <span className="font-bold">({totalPoinWawancara} / {maxSkorWawancara}) × 100% = {persentase}%</span>. Ambang kelulusan: <span className="font-bold text-stone-900">80.00%</span> (min. {minPoinLulus} poin).
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetCurrentModalOpen(true)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1.5 transition-colors border border-stone-300"
                  title="Kosongkan nilai peserta ini"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
                  <span>Reset Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPrintPreview(currentPeserta.id)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 flex items-center gap-1.5 transition-colors border border-amber-300"
                >
                  <Printer className="w-4 h-4" />
                  <span>Preview Cetak / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 text-sm font-extrabold rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 shadow-md shadow-amber-600/25 active:scale-95 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Nilai Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
       * MODAL 1: KONFIRMASI RESET FORM PESERTA INI
       * ======================================================== */}
      {isResetCurrentModalOpen && currentPeserta && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">
              Reset Form Penilaian Peserta Ini?
            </h3>
            <p className="text-sm text-stone-600 mt-2">
              Anda akan mengosongkan seluruh butir penilaian administrasi, wawancara, dan catatan penguji untuk:
            </p>
            <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-950 text-sm">{currentPeserta.nama}</div>
              <div className="text-stone-600">No. Peserta: <span className="font-semibold">{currentPeserta.nomorPeserta}</span></div>
              <div className="text-stone-600">Pangkalan: <span className="font-semibold">{currentPeserta.pangkalan}</span></div>
            </div>
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-3">
              Catatan: Status peserta ini akan kembali menjadi <strong>Belum Dinilai (0%)</strong>. Data biodata peserta tetap ada.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsResetCurrentModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetCurrent}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-md shadow-amber-600/20 active:scale-95"
              >
                Ya, Reset Form Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
       * MODAL 2: KONFIRMASI RESET SEMUA HASIL PENILAIAN PESERTA
       * ======================================================== */}
      {isResetAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-300">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-stone-900">
              Reset Semua Nilai Penilaian Peserta?
            </h3>
            <p className="text-sm text-stone-600 mt-2">
              Tindakan ini akan <strong>mengosongkan seluruh nilai hasil ujian</strong> dari semua peserta ({pesertaList.length} peserta).
            </p>
            <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Peringatan Penting:
              </div>
              <ul className="list-disc list-inside space-y-1 text-rose-800">
                <li>Seluruh lembar administrasi dan butir wawancara yang tersimpan akan dikosongkan.</li>
                <li>Seluruh peserta akan berstatus <strong>Belum Dinilai</strong>.</li>
                <li>Data biodata peserta, penguji, dan kelompok <strong>tidak akan terhapus</strong>.</li>
              </ul>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsResetAllModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAll}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md shadow-rose-600/20 active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Semua Nilai</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
