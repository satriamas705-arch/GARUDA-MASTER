import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Peserta, Kelompok, PenilaianPeserta, AppSettings, AuthUser } from '../types';
import {
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileEdit,
  Printer,
  School,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  FileUp,
  AlertCircle,
  AlertTriangle,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  MapPin,
  Calendar,
  Building2,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  exportPesertaToExcel,
  downloadPesertaTemplate,
  parsePesertaFile,
  ParsePesertaResult,
} from '../utils/dataIo';
import {
  extractGolonganName,
  getDefaultTKUForGolongan,
  getTKUOptionsForGolongan,
  GolonganType,
  DAFTAR_KWARRAN_BANYUMAS,
  deteksiGolonganDariTanggalLahir,
  formatTempatTanggalLahir,
  DeteksiGolonganResult,
  isSameKwarran,
} from '../utils/golongan';

interface PesertaViewProps {
  pesertaList: Peserta[];
  kelompokList: Kelompok[];
  penilaianMap: Record<string, PenilaianPeserta>;
  settings: AppSettings;
  currentUser?: AuthUser | null;
  activeGolongan?: GolonganType;
  onAddPeserta: (peserta: Peserta) => void;
  onUpdatePeserta: (peserta: Peserta) => void;
  onDeletePeserta: (id: string) => void;
  onBatchImportPeserta?: (newList: Peserta[], mode: 'merge' | 'replace') => void;
  onSyncAllGolongan?: () => void;
  onNavigateToNilai: (pesertaId: string) => void;
  onOpenPrintPreview: (pesertaId: string) => void;
  onResetAllPeserta?: (mode: 'empty' | 'default') => void;
}

export const PesertaView: React.FC<PesertaViewProps> = ({
  pesertaList,
  kelompokList,
  penilaianMap,
  settings,
  currentUser,
  activeGolongan,
  onAddPeserta,
  onUpdatePeserta,
  onDeletePeserta,
  onBatchImportPeserta,
  onSyncAllGolongan,
  onNavigateToNilai,
  onOpenPrintPreview,
  onResetAllPeserta,
}) => {
  const effectiveGolongan: GolonganType =
    activeGolongan ||
    currentUser?.selectedGolongan ||
    extractGolonganName(settings.golongan) ||
    'Penggalang';

  // Pembatasan wilayah Kwarran untuk Admin Kwarran & Penguji
  const isKwarranRestricted =
    (currentUser?.role === 'admin_kwarran' || currentUser?.role === 'penguji') &&
    !!currentUser?.kwarran;
  const userKwarran = currentUser?.kwarran || '';
  const isSuperAdmin = !currentUser || currentUser.role === 'admin';
  const isAdminKwarran = currentUser?.role === 'admin_kwarran';
  const canManage = isSuperAdmin || isAdminKwarran;

  // Scoped Peserta List khusus kwarran user jika dibatasi
  const scopedPesertaList = useMemo(() => {
    if (isKwarranRestricted) {
      return pesertaList.filter((p) => isSameKwarran(p.kwarran, userKwarran));
    }
    return pesertaList;
  }, [pesertaList, isKwarranRestricted, userKwarran]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterKelompok, setFilterKelompok] = useState('ALL');
  const [filterPangkalan, setFilterPangkalan] = useState('ALL');
  const [filterKwarran, setFilterKwarran] = useState<string>(
    isKwarranRestricted ? userKwarran : 'ALL'
  );
  const [filterGolongan, setFilterGolongan] = useState<'ALL' | GolonganType>(effectiveGolongan);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'LULUS' | 'BELUM_LULUS' | 'BELUM_DINILAI'>('ALL');
  const [showKwarranTable, setShowKwarranTable] = useState(false);

  useEffect(() => {
    if (activeGolongan) {
      setFilterGolongan(activeGolongan);
    }
  }, [activeGolongan]);

  useEffect(() => {
    if (isKwarranRestricted) {
      setFilterKwarran(userKwarran);
    }
  }, [isKwarranRestricted, userKwarran]);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPeserta, setEditingPeserta] = useState<Peserta | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Peserta | null>(null);

  // Modal State for Reset All Peserta
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPesertaMode, setResetPesertaMode] = useState<'empty' | 'default'>('empty');
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  // Modal State for Export & Import
  const [isIoModalOpen, setIsIoModalOpen] = useState(false);
  const [ioTab, setIoTab] = useState<'import' | 'export'>('import');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsePesertaResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [formNomor, setFormNomor] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formJK, setFormJK] = useState<'L' | 'P'>('L');
  const [formKwarran, setFormKwarran] = useState('');
  const [formTempatLahir, setFormTempatLahir] = useState('');
  const [formTanggalLahir, setFormTanggalLahir] = useState('');
  const [formPangkalan, setFormPangkalan] = useState('');
  const [formGudep, setFormGudep] = useState('');
  const [formKelompokId, setFormKelompokId] = useState('');
  const [formGolongan, setFormGolongan] = useState<Peserta['golongan']>(
    extractGolonganName(settings.golongan)
  );
  const [formTingkatTKU, setFormTingkatTKU] = useState<Peserta['tingkatTKU']>(
    getDefaultTKUForGolongan(settings.golongan)
  );
  const [formHp, setFormHp] = useState('');
  const [formPembina, setFormPembina] = useState('');

  // Daftar unik Pangkalan/Sekolah dari scoped peserta untuk filter
  const uniqueSekolahList = useMemo(() => {
    const set = new Set<string>();
    scopedPesertaList.forEach((p) => {
      if (p.pangkalan && p.pangkalan.trim()) {
        set.add(p.pangkalan.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedPesertaList]);

  // Daftar unik Kwarran dari data peserta digabung dengan daftar Kwarran Banyumas
  const uniqueKwarranList = useMemo(() => {
    if (isKwarranRestricted) {
      return [userKwarran];
    }
    const set = new Set<string>();
    scopedPesertaList.forEach((p) => {
      if (p.kwarran && p.kwarran.trim()) {
        set.add(p.kwarran.trim());
      }
    });
    DAFTAR_KWARRAN_BANYUMAS.forEach((k) => set.add(k));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [scopedPesertaList, isKwarranRestricted, userKwarran]);

  // Rekapitulasi Tabel Distribusi Peserta per Kwarran
  const kwarranDistribution = useMemo(() => {
    const stats: Record<string, { total: number; lulus: number; belum: number; belumDinilai: number }> = {};
    scopedPesertaList
      .filter((p) => (p.golongan || 'Penggalang') === effectiveGolongan)
      .forEach((p) => {
        const kw = p.kwarran?.trim() || 'Lainnya / Belum Diisi';
        if (!stats[kw]) {
          stats[kw] = { total: 0, lulus: 0, belum: 0, belumDinilai: 0 };
        }
        stats[kw].total++;
        const pen = penilaianMap[p.id];
        if (!pen) {
          stats[kw].belumDinilai++;
        } else {
          const isSiaga = p.golongan === 'Siaga';
          const maxSkor = pen.wawancara.length * 5 || (isSiaga ? 45 : 55);
          const skor = pen.wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
          if ((skor / maxSkor) * 100 >= 80) stats[kw].lulus++;
          else stats[kw].belum++;
        }
      });
    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [scopedPesertaList, effectiveGolongan, penilaianMap]);

  // Real-time detection inside Form Modal
  const modalDeteksiGolongan = useMemo(() => {
    return deteksiGolonganDariTanggalLahir(formTanggalLahir, settings.tanggalDefault, formGolongan);
  }, [formTanggalLahir, settings.tanggalDefault, formGolongan]);

  const openAddModal = () => {
    setEditingPeserta(null);
    const nextNum = (pesertaList.length + 1).toString().padStart(2, '0');
    setFormNomor(`PG-${nextNum}/BMS/${settings.tahun || '2026'}`);
    setFormNama('');
    setFormJK('L');
    const cleanKwarran = isKwarranRestricted && userKwarran
      ? userKwarran
      : settings.kwarran ? settings.kwarran.replace(/KWARRAN\s*/i, '').trim() : 'Kemranjen';
    setFormKwarran(cleanKwarran || 'Kemranjen');
    setFormTempatLahir('Banyumas');
    const defaultBirth =
      effectiveGolongan === 'Siaga'
        ? '2016-05-14'
        : effectiveGolongan === 'Penegak'
        ? '2009-02-04'
        : effectiveGolongan === 'Pandega'
        ? '2003-08-10'
        : '2012-05-14';
    setFormTanggalLahir(defaultBirth);
    setFormPangkalan(settings.kwartirCabang ? `${settings.kwartirCabang}` : 'SMP Negeri 1 Purwokerto');
    setFormGudep('02.001 - 02.002');
    setFormKelompokId(kelompokList[0]?.id || '');
    const activeGol = filterGolongan !== 'ALL' ? filterGolongan : effectiveGolongan;
    setFormGolongan(activeGol);
    setFormTingkatTKU(getDefaultTKUForGolongan(activeGol));
    setFormHp('');
    setFormPembina('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Peserta) => {
    setEditingPeserta(p);
    setFormNomor(p.nomorPeserta);
    setFormNama(p.nama);
    setFormJK(p.jenisKelamin);
    setFormKwarran(isKwarranRestricted && userKwarran ? userKwarran : p.kwarran || 'Kemranjen');
    setFormTempatLahir(p.tempatLahir || 'Banyumas');
    setFormTanggalLahir(p.tanggalLahir || '');
    setFormPangkalan(p.pangkalan);
    setFormGudep(p.gudep || '');
    setFormKelompokId(p.kelompokId || '');
    const currentGol = p.golongan || effectiveGolongan;
    setFormGolongan(currentGol);
    setFormTingkatTKU(p.tingkatTKU || getDefaultTKUForGolongan(currentGol));
    setFormHp(p.kontakHp || '');
    setFormPembina(p.namaPembina || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formNomor.trim()) return;

    const targetKwarran = (isKwarranRestricted && userKwarran ? userKwarran : formKwarran).trim() || undefined;

    if (editingPeserta) {
      onUpdatePeserta({
        ...editingPeserta,
        nomorPeserta: formNomor.trim(),
        nama: formNama.trim(),
        jenisKelamin: formJK,
        kwarran: targetKwarran,
        tempatLahir: formTempatLahir.trim() || undefined,
        tanggalLahir: formTanggalLahir.trim() || undefined,
        pangkalan: formPangkalan.trim(),
        gudep: formGudep.trim(),
        kelompokId: formKelompokId,
        golongan: formGolongan,
        tingkatTKU: formTingkatTKU,
        kontakHp: formHp.trim(),
        namaPembina: formPembina.trim(),
      });
    } else {
      const newPeserta: Peserta = {
        id: `peserta-${Date.now()}`,
        nomorPeserta: formNomor.trim(),
        nama: formNama.trim(),
        jenisKelamin: formJK,
        kwarran: targetKwarran,
        tempatLahir: formTempatLahir.trim() || undefined,
        tanggalLahir: formTanggalLahir.trim() || undefined,
        pangkalan: formPangkalan.trim(),
        gudep: formGudep.trim(),
        kelompokId: formKelompokId,
        golongan: formGolongan,
        tingkatTKU: formTingkatTKU,
        kontakHp: formHp.trim(),
        namaPembina: formPembina.trim(),
      };
      onAddPeserta(newPeserta);
    }
    setIsModalOpen(false);
  };

  // Filtered List: Memfilter berdasarkan Golongan, Kata Kunci, Regu, Sekolah, Kwarran, & Status Nilai
  const filteredList = scopedPesertaList.filter((p) => {
    const matchGolongan = (p.golongan || 'Penggalang') === effectiveGolongan;

    const term = searchTerm.toLowerCase();
    const matchSearch =
      p.nama.toLowerCase().includes(term) ||
      p.nomorPeserta.toLowerCase().includes(term) ||
      p.pangkalan.toLowerCase().includes(term) ||
      (p.kwarran || '').toLowerCase().includes(term) ||
      (p.tempatLahir || '').toLowerCase().includes(term);

    const matchKelompok =
      filterKelompok === 'ALL' || p.kelompokId === filterKelompok;

    const matchPangkalan =
      filterPangkalan === 'ALL' || p.pangkalan === filterPangkalan;

    const matchKwarran =
      filterKwarran === 'ALL' || isSameKwarran(p.kwarran, filterKwarran);

    const pen = penilaianMap[p.id];
    let matchStatus = true;
    if (filterStatus === 'BELUM_DINILAI') {
      matchStatus = !pen;
    } else if (filterStatus === 'LULUS') {
      if (!pen) matchStatus = false;
      else {
        const isSiaga = p.golongan === 'Siaga';
        const maxSkor = pen.wawancara.length * 5 || (isSiaga ? 45 : 55);
        const skor = pen.wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
        matchStatus = (skor / maxSkor) * 100 >= 80;
      }
    } else if (filterStatus === 'BELUM_LULUS') {
      if (!pen) matchStatus = false;
      else {
        const isSiaga = p.golongan === 'Siaga';
        const maxSkor = pen.wawancara.length * 5 || (isSiaga ? 45 : 55);
        const skor = pen.wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
        matchStatus = (skor / maxSkor) * 100 < 80;
      }
    }

    return (
      matchGolongan &&
      matchSearch &&
      matchKelompok &&
      matchPangkalan &&
      matchKwarran &&
      matchStatus
    );
  });

  const isAnyFilterActive =
    searchTerm !== '' ||
    filterKelompok !== 'ALL' ||
    filterPangkalan !== 'ALL' ||
    filterKwarran !== 'ALL' ||
    filterStatus !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterKelompok('ALL');
    setFilterPangkalan('ALL');
    setFilterKwarran('ALL');
    setFilterStatus('ALL');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseResult(null);
    try {
      const res = await parsePesertaFile(file, kelompokList, settings.golongan);
      setParseResult(res);
    } catch (err: any) {
      setParseResult({
        valid: [],
        errors: [`Gagal membaca berkas: ${err?.message || 'Format tidak didukung'}`],
        totalParsed: 0,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplyImport = () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    if (onBatchImportPeserta) {
      onBatchImportPeserta(parseResult.valid, importMode);
    } else {
      parseResult.valid.forEach((p) => onAddPeserta(p));
    }

    setImportNotification(
      `Berhasil mengimpor ${parseResult.valid.length} data peserta ke dalam sistem (${
        importMode === 'merge' ? 'Gabung / Perbarui' : 'Ganti Total'
      }).`
    );
    setTimeout(() => setImportNotification(null), 5000);

    setIsIoModalOpen(false);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const configuredGolongan = extractGolonganName(settings.golongan);
  const mismatchedPeserta = pesertaList.filter(
    (p) => (p.golongan || 'Penggalang') !== configuredGolongan
  );
  const mismatchedCount = mismatchedPeserta.length;

  const handleSyncAllToSettings = () => {
    if (onSyncAllGolongan) {
      onSyncAllGolongan();
    } else if (onBatchImportPeserta) {
      const targetTku = getDefaultTKUForGolongan(settings.golongan);
      const updated = pesertaList.map((p) => ({
        ...p,
        golongan: configuredGolongan,
        tingkatTKU: (p.golongan || 'Penggalang') !== configuredGolongan ? targetTku : p.tingkatTKU,
      }));
      onBatchImportPeserta(updated, 'replace');
    }
    setImportNotification(
      `Semua peserta (${pesertaList.length} peserta) berhasil disesuaikan ke ${settings.golongan}.`
    );
    setTimeout(() => setImportNotification(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Import / Action Notification */}
      {importNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{importNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportNotification(null)}
            className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alert Penyesuaian Golongan jika ada ketidaksesuaian dengan pengaturan */}
      {mismatchedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-amber-950">
                Penyesuaian Golongan Sesuai Pengaturan: {settings.golongan}
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Terdapat <strong>{mismatchedCount} peserta</strong> yang golongannya belum disesuaikan ke <strong>{configuredGolongan}</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSyncAllToSettings}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all self-end sm:self-auto shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sesuaikan Semua Peserta ({mismatchedCount})</span>
          </button>
        </div>
      )}

      {/* Kwarran Restriction Notice */}
      {isKwarranRestricted && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-amber-900">
                Akses Terbatas: Wilayah Kwarran {userKwarran}
              </div>
              <p className="text-[11px] text-stone-600 mt-0.5">
                {currentUser?.role === 'admin_kwarran'
                  ? 'Sebagai Admin Kwarran, Anda hanya dapat mengakses, menambah, dan mengelola calon peserta di wilayah Kwarran ' + userKwarran + '.'
                  : 'Sebagai Penguji, Anda dibatasi untuk mengakses peserta di wilayah Kwarran ' + userKwarran + '.'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-600 text-white shrink-0 shadow-xs">
            Kwarran {userKwarran}
          </span>
        </div>
      )}

      {/* Top action bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-stone-900 tracking-wide uppercase">
              Data Peserta Uji Garuda - Golongan {effectiveGolongan}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
              {effectiveGolongan}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Kelola data calon Pramuka Garuda ({settings.kwartirCabang}) • Total: {filteredList.length} Peserta Golongan {effectiveGolongan}
            {isKwarranRestricted ? ` • Kwarran ${userKwarran}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export / Import Button */}
          <button
            type="button"
            onClick={() => {
              setIoTab('export');
              setIsIoModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 border border-stone-200 hover:border-emerald-300 transition-all cursor-pointer"
            title="Ekspor Data Peserta ke Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor</span>
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                setIoTab('import');
                setParseResult(null);
                setIsIoModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-800 text-stone-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 border border-stone-200 hover:border-indigo-300 transition-all cursor-pointer"
              title="Impor Data Peserta dari Excel / CSV"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Impor</span>
            </button>
          )}

          {isSuperAdmin && onResetAllPeserta && (
            <button
              type="button"
              onClick={() => {
                setResetPesertaMode('empty');
                setResetConfirmInput('');
                setIsResetModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 border border-rose-300 transition-all cursor-pointer"
              title="Reset Semua Data Peserta"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset Semua Peserta</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Peserta Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200 space-y-3.5">
        {/* Golongan Filter Indicator & Kwarran Table Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-xs text-stone-700 font-bold">
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Golongan Peserta:</span>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-bold text-white shadow-xs ${
                effectiveGolongan === 'Siaga'
                  ? 'bg-emerald-600'
                  : effectiveGolongan === 'Penggalang'
                  ? 'bg-rose-600'
                  : effectiveGolongan === 'Penegak'
                  ? 'bg-amber-600'
                  : 'bg-stone-700'
              }`}
            >
              Khusus Golongan {effectiveGolongan}
            </span>
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {filteredList.length} Peserta Terdaftar
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Tabel Distribusi Kwarran */}
            <button
              type="button"
              onClick={() => setShowKwarranTable(!showKwarranTable)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showKwarranTable
                  ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
              }`}
              title="Lihat rekapitulasi jumlah calon Garuda per Kwarran"
            >
              <TableIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Tabel Kwarran ({kwarranDistribution.length})</span>
              {showKwarranTable ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Search & Filter Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, no. peserta, sekolah, kwarran, TTL..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Filter Per Sekolah / Pangkalan */}
          <div className="md:col-span-3 flex items-center gap-1.5 text-xs text-stone-600">
            <School className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="font-semibold shrink-0">Sekolah:</span>
            <select
              value={filterPangkalan}
              onChange={(e) => setFilterPangkalan(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 font-medium truncate"
              title="Filter calon peserta per Pangkalan / Sekolah"
            >
              <option value="ALL">Semua Sekolah ({uniqueSekolahList.length})</option>
              {uniqueSekolahList.map((sek) => (
                <option key={sek} value={sek}>
                  {sek}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Per Kwarran */}
          <div className="md:col-span-3 flex items-center gap-1.5 text-xs text-stone-600">
            <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="font-semibold shrink-0">Kwarran:</span>
            <select
              value={filterKwarran}
              onChange={(e) => setFilterKwarran(e.target.value)}
              disabled={isKwarranRestricted}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 font-medium truncate disabled:bg-stone-100 disabled:cursor-not-allowed"
              title={isKwarranRestricted ? 'Terkunci sesuai wilayah kwarran Anda' : 'Filter calon peserta per Kwartir Ranting (Kwarran)'}
            >
              {!isKwarranRestricted && <option value="ALL">Semua Kwarran</option>}
              {uniqueKwarranList.map((kw) => (
                <option key={kw} value={kw}>
                  {kw}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Regu & Status */}
          <div className="md:col-span-2 flex items-center gap-2 justify-end">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs focus:ring-1 focus:ring-amber-500 font-medium truncate"
              title="Filter status penilaian"
            >
              <option value="ALL">Semua Status</option>
              <option value="LULUS">Lulus (≥ 80%)</option>
              <option value="BELUM_LULUS">Belum Lulus (&lt; 80%)</option>
              <option value="BELUM_DINILAI">Belum Dinilai</option>
            </select>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-colors shrink-0"
                title="Reset Semua Filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Bar: Filter Regu & Active Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-stone-600">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-700" />
              <span className="font-semibold">Regu:</span>
              <select
                value={filterKelompok}
                onChange={(e) => setFilterKelompok(e.target.value)}
                className="bg-stone-50 border border-stone-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500 font-medium"
              >
                <option value="ALL">Semua Regu</option>
                {kelompokList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Active Chips */}
            {filterPangkalan !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-medium text-[11px]">
                Sekolah: {filterPangkalan}
                <button
                  type="button"
                  onClick={() => setFilterPangkalan('ALL')}
                  className="hover:text-rose-600 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterKwarran !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-medium text-[11px]">
                Kwarran: {filterKwarran}
                <button
                  type="button"
                  onClick={() => setFilterKwarran('ALL')}
                  className="hover:text-rose-600 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="text-[11px] text-stone-500 font-medium">
            Menampilkan <strong className="text-stone-900">{filteredList.length}</strong> dari{' '}
            {pesertaList.filter((p) => (p.golongan || 'Penggalang') === effectiveGolongan).length} peserta
          </div>
        </div>

        {/* Collapsible: Tabel Rekapitulasi Distribusi per Kwarran */}
        {showKwarranTable && (
          <div className="mt-3 p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs sm:text-sm font-extrabold text-stone-900 uppercase tracking-wide">
                  Tabel Distribusi Calon Pramuka Garuda per Kwartir Ranting ({effectiveGolongan})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowKwarranTable(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-200/80 text-stone-700 font-bold border-b border-stone-300">
                    <th className="py-2 px-3 text-center w-10">No</th>
                    <th className="py-2 px-3">Nama Kwartir Ranting (Kwarran)</th>
                    <th className="py-2 px-3 text-center">Jumlah Peserta</th>
                    <th className="py-2 px-3 text-center">Lulus (≥ 80%)</th>
                    <th className="py-2 px-3 text-center">Belum Lulus</th>
                    <th className="py-2 px-3 text-center">Belum Dinilai</th>
                    <th className="py-2 px-3 text-right">Aksi Filter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 bg-white">
                  {kwarranDistribution.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-stone-400 italic">
                        Belum ada data kwarran pada golongan ini.
                      </td>
                    </tr>
                  ) : (
                    kwarranDistribution.map(([kw, st], idx) => (
                      <tr
                        key={kw}
                        className={`hover:bg-amber-50/50 transition-colors ${
                          filterKwarran === kw ? 'bg-amber-100/60 font-bold' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-stone-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-stone-800">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            <span>Kwarran {kw}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center font-extrabold text-stone-900">
                          {st.total}
                        </td>
                        <td className="py-2 px-3 text-center text-emerald-700 font-bold">
                          {st.lulus}
                        </td>
                        <td className="py-2 px-3 text-center text-rose-700 font-bold">
                          {st.belum}
                        </td>
                        <td className="py-2 px-3 text-center text-stone-500">
                          {st.belumDinilai}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setFilterKwarran(filterKwarran === kw ? 'ALL' : kw);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                              filterKwarran === kw
                                ? 'bg-amber-600 text-white'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            {filterKwarran === kw ? 'Batal Filter' : 'Filter Kwarran Ini'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Participant Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200 text-xs">
                <th className="py-3 px-2.5 w-10 text-center">NO</th>
                <th className="py-3 px-3">NO. PESERTA</th>
                <th className="py-3 px-3">NAMA PESERTA & TTL</th>
                <th className="py-3 px-3">KWARRAN</th>
                <th className="py-3 px-3">PANGKALAN (SEKOLAH) & GUDEP</th>
                <th className="py-3 px-3">GOLONGAN & DETEKSI USIA</th>
                <th className="py-3 px-3">REGU / TIM</th>
                <th className="py-3 px-3 text-center">NILAI & STATUS</th>
                <th className="py-3 px-3 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-stone-400 italic">
                    Tidak ditemukan peserta yang sesuai kriteria pencarian dan filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((p, idx) => {
                  const kel = kelompokList.find((k) => k.id === p.kelompokId);
                  const pen = penilaianMap[p.id];
                  let skorWawancara = 0;
                  let persentase = 0;
                  let isLulus = false;

                  if (pen) {
                    const isSiaga = p.golongan === 'Siaga';
                    const maxSkor = pen.wawancara.length * 5 || (isSiaga ? 45 : 55);
                    skorWawancara = pen.wawancara.reduce((sum, w) => sum + (w.poin || 0), 0);
                    persentase = Number(((skorWawancara / maxSkor) * 100).toFixed(2));
                    isLulus = persentase >= 80;
                  }

                  const isSiaga = p.golongan === 'Siaga';
                  const maxSkor = pen ? pen.wawancara.length * 5 : (isSiaga ? 45 : 55);

                  // Deteksi kesesuaian golongan kepramukaan berdasarkan tanggal lahir
                  const deteksi = deteksiGolonganDariTanggalLahir(
                    p.tanggalLahir,
                    settings.tanggalDefault,
                    p.golongan
                  );

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-2.5 text-center font-bold text-stone-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-900 text-xs">
                        {p.nomorPeserta}
                      </td>
                      {/* Nama Peserta & Tempat Tanggal Lahir */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-stone-900">{p.nama}</div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600 mt-0.5">
                          <span className="font-medium">
                            {p.jenisKelamin === 'L' ? 'Putra (L)' : 'Putri (P)'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-stone-700">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            {formatTempatTanggalLahir(p.tempatLahir, p.tanggalLahir)}
                          </span>
                        </div>
                      </td>
                      {/* Kwarran (Kwartir Ranting) */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setFilterKwarran(p.kwarran || 'ALL')}
                          className="flex items-center gap-1 font-semibold text-stone-800 hover:text-amber-800 text-xs cursor-pointer group"
                          title="Klik untuk memfilter Kwarran ini"
                        >
                          <MapPin className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                          <span>{p.kwarran || 'Belum Diisi'}</span>
                        </button>
                      </td>
                      {/* Pangkalan (Sekolah) & Gudep */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setFilterPangkalan(p.pangkalan)}
                          className="font-semibold text-stone-800 hover:text-amber-800 text-left cursor-pointer group"
                          title="Klik untuk memfilter sekolah ini"
                        >
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600" />
                            <span>{p.pangkalan}</span>
                          </div>
                        </button>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {p.gudep ? `Gudep: ${p.gudep}` : 'Gudep Belum Diisi'}
                        </div>
                      </td>
                      {/* Golongan & Deteksi Usia Otomatis */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-amber-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                            {p.golongan || configuredGolongan}
                          </span>
                          <span className="text-[11px] font-semibold text-stone-700">
                            TKU: {p.tingkatTKU}
                          </span>
                        </div>
                        {/* Status Deteksi Usia & Rekomendasi Golongan */}
                        <div className="mt-1">
                          {deteksi ? (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                deteksi.isSesuai
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-50 text-amber-900 border-amber-300'
                              }`}
                              title={`Usia: ${deteksi.usiaFormatted} • Rentang resmi ${deteksi.golonganTerdeteksi}: ${deteksi.rentangUsiaResmi}`}
                            >
                              {deteksi.isSesuai ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              )}
                              <span>
                                {deteksi.usiaFormatted} • {deteksi.golonganTerdeteksi} (
                                {deteksi.isSesuai ? 'Sesuai' : 'Perlu Cek'})
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400 italic">
                              TTL belum diisi
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Regu / Kelompok */}
                      <td className="py-3 px-3">
                        {kel ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 font-medium text-xs">
                            {kel.nama}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs italic">-</span>
                        )}
                      </td>
                      {/* Nilai & Status */}
                      <td className="py-3 px-3 text-center">
                        {pen ? (
                          <div>
                            <div className="font-extrabold text-stone-900 text-sm">
                              {skorWawancara}/{maxSkor}{' '}
                              <span className="text-xs font-semibold text-stone-600">
                                ({persentase}%)
                              </span>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 mt-0.5 rounded-full text-[10px] font-black ${
                                isLulus
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isLulus ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" /> LULUS
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3" /> BELUM LULUS
                                </>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 bg-stone-100 text-stone-500 text-[11px] font-semibold rounded-lg">
                            Belum Dinilai
                          </span>
                        )}
                      </td>
                      {/* Aksi */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNavigateToNilai(p.id)}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Buka Form Penilaian"
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                            <span>Nilai</span>
                          </button>

                          {pen && (
                            <button
                              onClick={() => onOpenPrintPreview(p.id)}
                              className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors cursor-pointer"
                              title="Cetak Lembar Resmi"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors cursor-pointer"
                            title="Edit Data Peserta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteCandidate(p)}
                            className="p-1.5 bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Peserta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Peserta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-stone-900 tracking-wide uppercase mb-4 pb-2 border-b border-stone-200">
              {editingPeserta ? 'Edit Data Peserta' : 'Tambah Peserta Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nomor Peserta *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNomor}
                    onChange={(e) => setFormNomor(e.target.value)}
                    placeholder="PG-01/BMS/2026"
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formJK}
                    onChange={(e) => setFormJK(e.target.value as 'L' | 'P')}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="L">Laki-laki (Putra)</option>
                    <option value="P">Perempuan (Putri)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Lengkap Peserta *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Satria Pratama"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Kwarran (Kwartir Ranting) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kwartir Ranting (Kwarran) *</span>
                </label>
                {isKwarranRestricted ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900 flex items-center justify-between">
                    <span>Kwarran {userKwarran}</span>
                    <span className="text-[10px] text-amber-700 font-normal italic">Terkunci sesuai wilayah kwarran Anda</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={
                        DAFTAR_KWARRAN_BANYUMAS.includes(formKwarran) ? formKwarran : 'CUSTOM'
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'CUSTOM') {
                          setFormKwarran(e.target.value);
                        }
                      }}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500 font-medium"
                    >
                      <option value="">-- Pilih Kwarran di Banyumas --</option>
                      {DAFTAR_KWARRAN_BANYUMAS.map((kw) => (
                        <option key={kw} value={kw}>
                          Kwarran {kw}
                        </option>
                      ))}
                      <option value="CUSTOM">Lainnya / Tulis Manual...</option>
                    </select>

                    <input
                      type="text"
                      value={formKwarran}
                      onChange={(e) => setFormKwarran(e.target.value)}
                      placeholder="Nama Kwarran (contoh: Kemranjen)"
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              {/* Tempat & Tanggal Lahir (TTL) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formTempatLahir}
                    onChange={(e) => setFormTempatLahir(e.target.value)}
                    placeholder="Contoh: Banyumas"
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formTanggalLahir}
                    onChange={(e) => setFormTanggalLahir(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Real-Time Golongan & Age Detection Card */}
              {modalDeteksiGolongan && (
                <div
                  className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    modalDeteksiGolongan.isSesuai
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50/90 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {modalDeteksiGolongan.isSesuai ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>
                          Usia: <strong>{modalDeteksiGolongan.usiaFormatted}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Terdeteksi Masuk Golongan:{' '}
                          <strong className="underline underline-offset-2">
                            {modalDeteksiGolongan.golonganTerdeteksi}
                          </strong>{' '}
                          ({modalDeteksiGolongan.rentangUsiaResmi})
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        {modalDeteksiGolongan.isSesuai
                          ? `Usia peserta sesuai dengan golongan yang didaftarkan (${formGolongan}).`
                          : `Usia peserta terdeteksi masuk rentang ${modalDeteksiGolongan.golonganTerdeteksi}. Golongan terpilih saat ini: ${formGolongan}.`}
                      </p>
                    </div>
                  </div>

                  {!modalDeteksiGolongan.isSesuai &&
                    (modalDeteksiGolongan.golonganTerdeteksi === 'Siaga' ||
                      modalDeteksiGolongan.golonganTerdeteksi === 'Penggalang' ||
                      modalDeteksiGolongan.golonganTerdeteksi === 'Penegak' ||
                      modalDeteksiGolongan.golonganTerdeteksi === 'Pandega') && (
                      <button
                        type="button"
                        onClick={() => {
                          const target = modalDeteksiGolongan.golonganTerdeteksi as GolonganType;
                          setFormGolongan(target);
                          setFormTingkatTKU(getDefaultTKUForGolongan(target));
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-[11px] rounded-lg shadow-xs transition-all shrink-0 cursor-pointer"
                      >
                        Terapkan Golongan {modalDeteksiGolongan.golonganTerdeteksi}
                      </button>
                    )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Pangkalan / Sekolah *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPangkalan}
                    onChange={(e) => setFormPangkalan(e.target.value)}
                    placeholder="Contoh: SMP Negeri 1 Purwokerto"
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Nomor Gudep
                  </label>
                  <input
                    type="text"
                    value={formGudep}
                    onChange={(e) => setFormGudep(e.target.value)}
                    placeholder="02.001 - 02.002"
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Golongan Pramuka *
                  </label>
                  <select
                    value={formGolongan}
                    onChange={(e) => {
                      const newG = e.target.value as any;
                      setFormGolongan(newG);
                      setFormTingkatTKU(getDefaultTKUForGolongan(newG));
                    }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500 font-bold text-amber-950"
                  >
                    <option value="Siaga">Siaga (7 - 10 Tahun)</option>
                    <option value="Penggalang">Penggalang (11 - 15 Tahun)</option>
                    <option value="Penegak">Penegak (16 - 20 Tahun)</option>
                    <option value="Pandega">Pandega (21 - 25 Tahun)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Tingkat TKU Terakhir *
                  </label>
                  <select
                    value={formTingkatTKU}
                    onChange={(e) => setFormTingkatTKU(e.target.value as any)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500 font-semibold"
                  >
                    {getTKUOptionsForGolongan(formGolongan).map((tku) => (
                      <option key={tku.value} value={tku.value}>
                        {tku.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Regu / Kelompok
                  </label>
                  <select
                    value={formKelompokId}
                    onChange={(e) => setFormKelompokId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- Tanpa Regu --</option>
                    {kelompokList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Kontak HP / WA Peserta
                  </label>
                  <input
                    type="text"
                    value={formHp}
                    onChange={(e) => setFormHp(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Pembina Pendamping
                </label>
                <input
                  type="text"
                  value={formPembina}
                  onChange={(e) => setFormPembina(e.target.value)}
                  placeholder="Nama Pembina Gudep"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="mt-6 pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                >
                  {editingPeserta ? 'Simpan Perubahan' : 'Tambahkan Peserta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-center text-stone-900">
              Hapus Data Peserta?
            </h3>
            <p className="text-xs text-stone-600 text-center mt-1">
              Apakah Anda yakin ingin menghapus calon peserta{' '}
              <span className="font-bold text-stone-900">"{deleteCandidate.nama}"</span> ({deleteCandidate.nomorPeserta})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePeserta(deleteCandidate.id);
                  setDeleteCandidate(null);
                }}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/25 transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ekspor & Impor Data Peserta Modal */}
      {isIoModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-stone-200 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    Ekspor &amp; Impor Data Peserta
                  </h3>
                  <p className="text-xs text-stone-500">
                    Unggah atau unduh berkas spreadsheet Excel (.xlsx) / CSV
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsIoModalOpen(false);
                  setParseResult(null);
                }}
                className="p-1.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-stone-100 border border-stone-200 mt-4 mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setIoTab('import')}
                className={`py-2 px-3 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  ioTab === 'import'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Impor dari Excel / CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setIoTab('export')}
                className={`py-2 px-3 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  ioTab === 'export'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>Ekspor ke Excel</span>
              </button>
            </div>

            {/* Modal Tab Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {ioTab === 'import' ? (
                <div className="space-y-4">
                  {/* Template download notice */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                        <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                        <span>Unduh Format Template Resmi</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Gunakan susunan kolom standar: No Peserta, Nama, L/P, Pangkalan, Gudep, Regu, Golongan, TKU, HP, Pembina.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadPesertaTemplate(settings.golongan)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Template (.xlsx)</span>
                    </button>
                  </div>

                  {/* File Upload Box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-stone-50/50 hover:bg-amber-50/30"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-sm text-stone-800">
                      Klik untuk memilih berkas Excel atau CSV
                    </div>
                    <div className="text-xs text-stone-500 mt-1">
                      Mendukung format .xlsx, .xls, dan .csv
                    </div>
                  </div>

                  {isParsing && (
                    <div className="p-4 rounded-xl bg-stone-100 text-center text-xs font-semibold text-stone-600 animate-pulse">
                      Membaca dan memproses berkas spreadsheet...
                    </div>
                  )}

                  {/* Parse Results Preview */}
                  {parseResult && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-stone-700">
                          Pratinjau Data ({parseResult.valid.length} Peserta Terbaca)
                        </span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Siap Diimpor
                        </span>
                      </div>

                      {parseResult.errors.length > 0 && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                          <div className="font-bold flex items-center gap-1 text-rose-900">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Peringatan / Catatan Baris:</span>
                          </div>
                          <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                            {parseResult.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Preview Table */}
                      <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-xl">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead className="bg-stone-100 text-stone-700 sticky top-0">
                            <tr>
                              <th className="py-2 px-2.5">NO</th>
                              <th className="py-2 px-2.5">NO. PESERTA</th>
                              <th className="py-2 px-2.5">NAMA</th>
                              <th className="py-2 px-2.5">L/P</th>
                              <th className="py-2 px-2.5">PANGKALAN</th>
                              <th className="py-2 px-2.5">TKU</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {parseResult.valid.slice(0, 8).map((p, idx) => (
                              <tr key={p.id} className="hover:bg-amber-50/20">
                                <td className="py-1.5 px-2.5 text-stone-500">{idx + 1}</td>
                                <td className="py-1.5 px-2.5 font-mono font-bold text-amber-900">
                                  {p.nomorPeserta}
                                </td>
                                <td className="py-1.5 px-2.5 font-bold text-stone-900">{p.nama}</td>
                                <td className="py-1.5 px-2.5">{p.jenisKelamin}</td>
                                <td className="py-1.5 px-2.5 text-stone-600">{p.pangkalan}</td>
                                <td className="py-1.5 px-2.5 font-semibold text-stone-700">
                                  {p.tingkatTKU}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {parseResult.valid.length > 8 && (
                        <div className="text-[10px] text-stone-500 text-center italic">
                          Menampilkan 8 dari total {parseResult.valid.length} peserta yang siap diimpor.
                        </div>
                      )}

                      {/* Import Mode Selector */}
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                        <div className="text-xs font-bold text-stone-700">Pilih Mode Impor:</div>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-xs text-stone-800 cursor-pointer">
                            <input
                              type="radio"
                              name="pesertaImportMode"
                              checked={importMode === 'merge'}
                              onChange={() => setImportMode('merge')}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>
                              <strong>Gabungkan &amp; Perbarui (Merge)</strong> — Tambahkan ke data yang sudah ada dan perbarui jika nomor peserta sama.
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-stone-800 cursor-pointer">
                            <input
                              type="radio"
                              name="pesertaImportMode"
                              checked={importMode === 'replace'}
                              onChange={() => setImportMode('replace')}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>
                              <strong>Ganti Total (Replace All)</strong> — Hapus data peserta saat ini dan ganti seluruhnya dengan data berkas ini.
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Export Tab */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="font-extrabold text-sm text-stone-900">
                      Ekspor Laporan &amp; Data Peserta ke Spreadsheet
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Unduh seluruh basis data peserta dalam format Excel (.xlsx) lengkap dengan informasi pangkalan, regu, nomor gudep, kontak pembina, dan status penilaian terkini.
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-white border border-stone-200 text-center">
                        <div className="text-2xl font-black text-stone-900">{pesertaList.length}</div>
                        <div className="text-[11px] text-stone-500 font-bold uppercase mt-0.5">
                          Total Seluruh Peserta
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-stone-200 text-center">
                        <div className="text-2xl font-black text-amber-700">{filteredList.length}</div>
                        <div className="text-[11px] text-stone-500 font-bold uppercase mt-0.5">
                          Sesuai Filter Aktif
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => exportPesertaToExcel(pesertaList, kelompokList, penilaianMap)}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Seluruh Data ({pesertaList.length} Peserta)</span>
                    </button>

                    {filteredList.length !== pesertaList.length && (
                      <button
                        type="button"
                        onClick={() => exportPesertaToExcel(filteredList, kelompokList, penilaianMap, 'Data_Peserta_Tersaring.xlsx')}
                        className="py-3 px-4 bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Hasil Filter ({filteredList.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => downloadPesertaTemplate(settings.golongan)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center justify-center gap-1 mx-auto"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Format Template Kosong (.xlsx)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsIoModalOpen(false);
                  setParseResult(null);
                }}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>

              {ioTab === 'import' && parseResult && parseResult.valid.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyImport}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-amber-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan Impor ({parseResult.valid.length} Peserta)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
       * MODAL RESET SEMUA PESERTA
       * ======================================================== */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-rose-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-stone-900">
                  Reset Semua Data Peserta
                </h3>
                <p className="text-xs text-stone-500">
                  Kelola dan bersihkan data peserta yang tersimpan dalam sistem
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Pilih Mode Reset:
              </label>

              <div
                onClick={() => setResetPesertaMode('empty')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  resetPesertaMode === 'empty'
                    ? 'border-rose-500 bg-rose-50/70 text-rose-950'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm text-rose-900">
                    1. Kosongkan Total (0 Peserta)
                  </div>
                  <input
                    type="radio"
                    name="resetPesertaMode"
                    checked={resetPesertaMode === 'empty'}
                    onChange={() => setResetPesertaMode('empty')}
                    className="accent-rose-600"
                  />
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Hapus <strong>seluruh peserta ({pesertaList.length} peserta)</strong> dan seluruh riwayat nilai ujian mereka. Cocok untuk memulai pendataan kegiatan baru dari nol bersih.
                </p>
              </div>

              <div
                onClick={() => setResetPesertaMode('default')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  resetPesertaMode === 'default'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-950'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm text-amber-900">
                    2. Kembalikan ke Contoh Data Bawaan
                  </div>
                  <input
                    type="radio"
                    name="resetPesertaMode"
                    checked={resetPesertaMode === 'default'}
                    onChange={() => setResetPesertaMode('default')}
                    className="accent-amber-600"
                  />
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Mengembalikan daftar peserta ke data contoh awal resmi Kwartir Cabang Banyumas.
                </p>
              </div>
            </div>

            {resetPesertaMode === 'empty' && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <span className="font-bold block mb-1">Konfirmasi Keamanan:</span>
                Ketik kata <span className="font-black underline text-rose-950">RESET</span> di bawah untuk melanjutkan pengosongan data:
                <input
                  type="text"
                  value={resetConfirmInput}
                  onChange={(e) => setResetConfirmInput(e.target.value)}
                  placeholder="Ketik RESET di sini..."
                  className="mt-2 w-full px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-mono font-bold text-stone-900 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={resetPesertaMode === 'empty' && resetConfirmInput.trim().toUpperCase() !== 'RESET'}
                onClick={() => {
                  if (onResetAllPeserta) {
                    onResetAllPeserta(resetPesertaMode);
                    setImportNotification(
                      resetPesertaMode === 'empty'
                        ? 'Semua data peserta dan nilai telah berhasil dikosongkan.'
                        : 'Data peserta berhasil dikembalikan ke contoh bawaan.'
                    );
                    setTimeout(() => setImportNotification(null), 4000);
                  }
                  setIsResetModalOpen(false);
                }}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                  resetPesertaMode === 'empty'
                    ? resetConfirmInput.trim().toUpperCase() === 'RESET'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 active:scale-95 cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 active:scale-95 cursor-pointer'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {resetPesertaMode === 'empty' ? 'Kosongkan Semua Peserta' : 'Reset ke Contoh Bawaan'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
