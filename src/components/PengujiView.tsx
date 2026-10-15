import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Penguji, PenilaianPeserta, AuthUser, AppSettings } from '../types';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Briefcase,
  Award,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Layers,
  MapPin,
  Table as TableIcon,
  LayoutGrid,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Building2,
  Shield,
} from 'lucide-react';
import {
  exportPengujiToExcel,
  downloadPengujiTemplate,
  parsePengujiFile,
  ParsePengujiResult,
} from '../utils/dataIo';
import {
  extractGolonganName,
  GolonganType,
  DAFTAR_KWARRAN_BANYUMAS,
  isSameKwarran,
} from '../utils/golongan';

interface PengujiViewProps {
  pengujiList: Penguji[];
  penilaianMap: Record<string, PenilaianPeserta>;
  currentUser?: AuthUser | null;
  settings?: AppSettings;
  activeGolongan?: GolonganType;
  onAddPenguji: (penguji: Penguji) => void;
  onUpdatePenguji: (penguji: Penguji) => void;
  onDeletePenguji: (id: string) => void;
  onBatchImportPenguji?: (newList: Penguji[], mode: 'merge' | 'replace') => void;
  onResetAllPenguji?: (mode: 'empty' | 'default') => void;
}

export const PengujiView: React.FC<PengujiViewProps> = ({
  pengujiList,
  penilaianMap,
  currentUser,
  settings,
  activeGolongan,
  onAddPenguji,
  onUpdatePenguji,
  onDeletePenguji,
  onBatchImportPenguji,
  onResetAllPenguji,
}) => {
  const effectiveGolongan: GolonganType =
    activeGolongan ||
    currentUser?.selectedGolongan ||
    extractGolonganName(settings?.golongan) ||
    'Penggalang';

  // Pembatasan wilayah Kwarran untuk Admin Kwarran & Penguji
  const isKwarranRestricted =
    (currentUser?.role === 'admin_kwarran' || currentUser?.role === 'penguji') &&
    !!currentUser?.kwarran;
  const userKwarran = currentUser?.kwarran || '';

  // Hak kelola penguji: Super Admin Kwarcab atau Admin Kwarran
  const isSuperAdmin = currentUser?.role === 'admin';
  const isAdminKwarran = currentUser?.role === 'admin_kwarran';
  const canManage = isSuperAdmin || isAdminKwarran;

  // Filter Penguji strictly to effectiveGolongan dan wilayah Kwarran (jika dibatasi)
  const baseGolonganPenguji = useMemo(() => {
    return pengujiList.filter(
      (p) => (p.golongan || 'Penggalang') === effectiveGolongan
    );
  }, [pengujiList, effectiveGolongan]);

  const baseScopedPenguji = useMemo(() => {
    if (isKwarranRestricted) {
      return baseGolonganPenguji.filter((p) => isSameKwarran(p.kwarran, userKwarran));
    }
    return baseGolonganPenguji;
  }, [baseGolonganPenguji, isKwarranRestricted, userKwarran]);

  // View state & filter
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKwarran, setFilterKwarran] = useState<string>(
    isKwarranRestricted ? userKwarran : 'ALL'
  );
  const [showKwarranTable, setShowKwarranTable] = useState(false);

  // Sync filterKwarran if user is restricted
  useEffect(() => {
    if (isKwarranRestricted) {
      setFilterKwarran(userKwarran);
    }
  }, [isKwarranRestricted, userKwarran]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPenguji, setEditingPenguji] = useState<Penguji | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Penguji | null>(null);

  // Modal State for Reset All Penguji
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPengujiMode, setResetPengujiMode] = useState<'empty' | 'default'>('empty');
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  // Modal State for Export & Import
  const [isIoModalOpen, setIsIoModalOpen] = useState(false);
  const [ioTab, setIoTab] = useState<'import' | 'export'>('import');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsePengujiResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importNotification, setImportNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formNama, setFormNama] = useState('');
  const [formNipNta, setFormNipNta] = useState('');
  const [formKwarran, setFormKwarran] = useState('');
  const [formJabatan, setFormJabatan] = useState('');
  const [formPangkalan, setFormPangkalan] = useState('');
  const [formHp, setFormHp] = useState('');
  const [formGolongan, setFormGolongan] = useState<GolonganType>(effectiveGolongan);

  // Daftar unik Kwarran dari data penguji digabung 27 Kwarran Banyumas
  const uniqueKwarranList = useMemo(() => {
    const set = new Set<string>();
    pengujiList.forEach((p) => {
      if (p.kwarran && p.kwarran.trim()) set.add(p.kwarran.trim());
    });
    DAFTAR_KWARRAN_BANYUMAS.forEach((k) => set.add(k));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pengujiList]);

  // Rekapitulasi Tabel Distribusi Penguji per Kwarran
  const kwarranDistribution = useMemo(() => {
    const stats: Record<string, { total: number; aktifMenguji: number; totalDiuji: number }> = {};

    baseGolonganPenguji.forEach((p) => {
      const kw = p.kwarran?.trim() || 'Lainnya / Belum Diisi';
      if (!stats[kw]) {
        stats[kw] = { total: 0, aktifMenguji: 0, totalDiuji: 0 };
      }
      stats[kw].total++;
      const count = Object.values(penilaianMap).filter((pen) => pen.pengujiId === p.id).length;
      stats[kw].totalDiuji += count;
      if (count > 0) stats[kw].aktifMenguji++;
    });

    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [baseGolonganPenguji, penilaianMap]);

  // Filtered List berdasarkan Search & Kwarran
  const filteredList = useMemo(() => {
    return baseScopedPenguji.filter((p) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        p.nama.toLowerCase().includes(term) ||
        (p.nipNta || '').toLowerCase().includes(term) ||
        (p.pangkalan || '').toLowerCase().includes(term) ||
        (p.jabatan || '').toLowerCase().includes(term) ||
        (p.kwarran || '').toLowerCase().includes(term);

      const matchKwarran =
        filterKwarran === 'ALL' || isSameKwarran(p.kwarran, filterKwarran);

      return matchSearch && matchKwarran;
    });
  }, [baseScopedPenguji, searchTerm, filterKwarran]);

  const openAddModal = () => {
    setEditingPenguji(null);
    setFormNama('');
    setFormNipNta(`NTA. 11.02.00.${(pengujiList.length + 1).toString().padStart(3, '0')}`);
    setFormGolongan(effectiveGolongan);
    setFormJabatan(`Tim Penguji Urusan ${effectiveGolongan}`);
    setFormPangkalan(settings?.kwartirCabang || 'Kwarcab Banyumas');
    setFormKwarran(
      isAdminKwarran && userKwarran
        ? userKwarran
        : settings?.kwarran?.replace(/KWARRAN\s*/i, '').trim() || 'Kemranjen'
    );
    setFormHp('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Penguji) => {
    setEditingPenguji(p);
    setFormNama(p.nama);
    setFormNipNta(p.nipNta || '');
    setFormJabatan(p.jabatan);
    setFormPangkalan(p.pangkalan);
    setFormKwarran(p.kwarran || 'Kemranjen');
    setFormHp(p.noHp || '');
    setFormGolongan(p.golongan || effectiveGolongan);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;

    const targetKwarran = isAdminKwarran && userKwarran ? userKwarran : formKwarran;

    if (editingPenguji) {
      onUpdatePenguji({
        ...editingPenguji,
        nama: formNama,
        nipNta: formNipNta,
        kwarran: targetKwarran,
        jabatan: formJabatan,
        pangkalan: formPangkalan,
        noHp: formHp,
        golongan: formGolongan,
      });
    } else {
      const newPenguji: Penguji = {
        id: `penguji-${Date.now()}`,
        nama: formNama,
        nipNta: formNipNta,
        kwarran: targetKwarran,
        jabatan: formJabatan,
        pangkalan: formPangkalan,
        noHp: formHp,
        golongan: formGolongan,
      };
      onAddPenguji(newPenguji);
    }
    setIsModalOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseResult(null);
    try {
      const res = await parsePengujiFile(file);
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

    // Jika admin kwarran, pastikan kwarran diset ke kwarran mereka jika kosong
    const toImport = isAdminKwarran && userKwarran
      ? parseResult.valid.map((pj) => ({ ...pj, kwarran: pj.kwarran || userKwarran }))
      : parseResult.valid;

    if (onBatchImportPenguji) {
      onBatchImportPenguji(toImport, importMode);
    } else {
      toImport.forEach((pj) => onAddPenguji(pj));
    }

    setImportNotification(
      `Berhasil mengimpor ${toImport.length} data penguji (${
        importMode === 'merge' ? 'Gabung / Perbarui' : 'Ganti Total'
      }).`
    );
    setTimeout(() => setImportNotification(null), 5000);

    setIsIoModalOpen(false);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportExcel = () => {
    exportPengujiToExcel(
      filteredList,
      penilaianMap,
      `Data_Tim_Penguji_${effectiveGolongan}${
        isKwarranRestricted ? `_${userKwarran}` : ''
      }.xlsx`
    );
  };

  return (
    <div className="space-y-5">
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
                  ? 'Sebagai Admin Kwarran, Anda hanya dapat mengakses dan mengelola data penguji dari Kwarran ' + userKwarran + '.'
                  : 'Sebagai Penguji, Anda hanya dapat melihat data penguji dan peserta di wilayah Kwarran ' + userKwarran + '.'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-600 text-white shrink-0 shadow-xs">
            Kwarran {userKwarran}
          </span>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-black text-stone-900 tracking-wide uppercase">
              Data Tim Penguji - Golongan {effectiveGolongan}
            </h2>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {filteredList.length} Penguji
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Daftar penguji resmi, andalan cabang, pelatih pusdiklat, dan penilai wawancara ({settings?.kwartirCabang || 'Kwarcab Banyumas'})
            {isKwarranRestricted ? ` • Kwarran ${userKwarran}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 border border-stone-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Tampilkan dalam bentuk Tabel"
            >
              <TableIcon className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Tampilkan dalam bentuk Kartu / Grid"
            >
              <LayoutGrid className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Kartu</span>
            </button>
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 border border-stone-200 hover:border-emerald-300 transition-all cursor-pointer"
            title="Ekspor Data Penguji ke Excel (.xlsx)"
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
              className="px-3.5 py-2 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-800 text-stone-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 border border-stone-200 hover:border-indigo-300 transition-all cursor-pointer"
              title="Impor Data Penguji dari Excel / CSV"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Impor</span>
            </button>
          )}

          {isSuperAdmin && onResetAllPenguji && (
            <button
              type="button"
              onClick={() => {
                setResetPengujiMode('empty');
                setResetConfirmInput('');
                setIsResetModalOpen(true);
              }}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-rose-300 transition-all cursor-pointer"
              title="Reset Semua Data Penguji"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Penguji</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200 space-y-3.5">
        {/* Toggle Tabel Rekapitulasi Kwarran Penguji */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold text-white ${
              effectiveGolongan === 'Siaga'
                ? 'bg-emerald-600'
                : effectiveGolongan === 'Penggalang'
                ? 'bg-rose-600'
                : effectiveGolongan === 'Penegak'
                ? 'bg-amber-600'
                : 'bg-stone-700'
            }`}>
              Golongan {effectiveGolongan}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              Menampilkan {filteredList.length} dari {baseScopedPenguji.length} penguji
            </span>
          </div>

          {!isKwarranRestricted && (
            <button
              type="button"
              onClick={() => setShowKwarranTable(!showKwarranTable)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Tabel Rekapitulasi Kwarran Penguji</span>
              {showKwarranTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Collapsible Tabel Rekapitulasi Asal Kwarran Penguji */}
        {showKwarranTable && !isKwarranRestricted && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-700" />
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Tabel Asal Kwarran & Distribusi Penguji ({settings?.kwartirCabang || 'Kwarcab Banyumas'})
                </h4>
              </div>
              <span className="text-[11px] font-bold text-stone-500">
                Total {kwarranDistribution.length} Kwarran Terdata
              </span>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-amber-200 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-amber-100/70 text-amber-950 font-black border-b border-amber-200">
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3">Nama Kwartir Ranting (Kwarran)</th>
                    <th className="py-2 px-3 text-center">Total Penguji</th>
                    <th className="py-2 px-3 text-center">Aktif Menguji</th>
                    <th className="py-2 px-3 text-center">Total Peserta Diuji</th>
                    <th className="py-2 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/60">
                  {kwarranDistribution.map(([kw, st], idx) => {
                    const isSelected = isSameKwarran(filterKwarran, kw);
                    return (
                      <tr
                        key={kw}
                        className={`hover:bg-amber-50/50 transition-colors ${
                          isSelected ? 'bg-amber-100/50 font-bold' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-stone-500 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5 font-bold text-stone-900">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            <span>Kwarran {kw}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-stone-100 text-stone-800">
                            {st.total} Penguji
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                            {st.aktifMenguji} Aktif
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                            {st.totalDiuji} Peserta
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setFilterKwarran(isSelected ? 'ALL' : kw)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-600 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-900'
                            }`}
                          >
                            {isSelected ? 'Batalkan Filter' : 'Filter Kwarran Ini'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-7 md:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari penguji (nama, NTA, jabatan, pangkalan, atau kwarran)..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Asal Kwarran Dropdown */}
          <div className="sm:col-span-5 md:col-span-4">
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 pointer-events-none" />
              <select
                value={filterKwarran}
                onChange={(e) => setFilterKwarran(e.target.value)}
                disabled={isKwarranRestricted}
                className="w-full pl-8 pr-7 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all cursor-pointer disabled:bg-stone-100 disabled:cursor-not-allowed"
                title={isKwarranRestricted ? 'Terkunci sesuai wilayah kwarran Anda' : 'Filter berdasarkan Kwartir Ranting'}
              >
                {!isKwarranRestricted && <option value="ALL">Semua Kwarran ({uniqueKwarranList.length})</option>}
                {uniqueKwarranList.map((kw) => (
                  <option key={kw} value={kw}>
                    Kwarran {kw}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: TABLE VIEW ATAU GRID VIEW */}
      {viewMode === 'table' ? (
        /* ================= TABEL DATA PENGUJI ================= */
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 text-[11px] font-black uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Nama Penguji & NTA</th>
                  <th className="py-3.5 px-4">Asal Kwarran</th>
                  <th className="py-3.5 px-4">Golongan</th>
                  <th className="py-3.5 px-4">Jabatan / Unsur</th>
                  <th className="py-3.5 px-4">Pangkalan / Instansi</th>
                  <th className="py-3.5 px-4">Kontak (HP/WA)</th>
                  <th className="py-3.5 px-4 text-center">Peserta Diuji</th>
                  {canManage && <th className="py-3.5 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 9 : 8} className="py-12 text-center text-stone-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <UserCheck className="w-8 h-8 text-stone-300" />
                        <p className="font-bold text-stone-600 text-sm">Tidak ada data penguji ditemukan</p>
                        <p className="text-xs text-stone-400 max-w-sm">
                          {searchTerm || filterKwarran !== 'ALL'
                            ? 'Coba ubah kata kunci pencarian atau reset filter Kwarran.'
                            : 'Belum ada penguji yang terdaftar untuk golongan ini.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((p, idx) => {
                    const assessedCount = Object.values(penilaianMap).filter(
                      (pen) => pen.pengujiId === p.id
                    ).length;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-amber-50/40 transition-colors group"
                      >
                        {/* No */}
                        <td className="py-3 px-4 text-center text-stone-400 font-mono font-medium">
                          {idx + 1}
                        </td>

                        {/* Nama & NTA */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                              <UserCheck className="w-4 h-4 text-amber-800" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors">
                                {p.nama}
                              </div>
                              <div className="text-[11px] font-mono text-stone-500">
                                {p.nipNta || 'NTA belum diset'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Asal Kwarran (TABEL ASAL KWARRAN PADA DATA PENGUJI) */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{p.kwarran || 'Kemranjen'}</span>
                          </span>
                        </td>

                        {/* Golongan */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white ${
                              p.golongan === 'Siaga'
                                ? 'bg-emerald-600'
                                : p.golongan === 'Penggalang'
                                ? 'bg-rose-600'
                                : p.golongan === 'Penegak'
                                ? 'bg-amber-600'
                                : 'bg-stone-600'
                            }`}
                          >
                            {p.golongan || effectiveGolongan}
                          </span>
                        </td>

                        {/* Jabatan */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-stone-800 font-medium">
                            <Briefcase className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{p.jabatan}</span>
                          </div>
                        </td>

                        {/* Pangkalan / Instansi */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-stone-600">
                            <Award className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{p.pangkalan}</span>
                          </div>
                        </td>

                        {/* Kontak */}
                        <td className="py-3 px-4">
                          {p.noHp ? (
                            <div className="flex items-center gap-1 text-stone-600 font-mono text-xs">
                              <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>{p.noHp}</span>
                            </div>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>

                        {/* Peserta Diuji */}
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-amber-100/80 text-amber-950 border border-amber-300/60">
                            {assessedCount}
                          </span>
                        </td>

                        {/* Aksi */}
                        {canManage && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(p)}
                                className="p-1.5 hover:bg-stone-100 text-stone-600 hover:text-amber-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Penguji"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteCandidate(p)}
                                className="p-1.5 hover:bg-rose-100 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Penguji"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= GRID VIEW KARTU PENGUJI ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((p) => {
            const assessedCount = Object.values(penilaianMap).filter(
              (pen) => pen.pengujiId === p.id
            ).length;

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex flex-col justify-between hover:border-amber-400 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                      <UserCheck className="w-5 h-5 text-amber-800" />
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg transition-colors"
                            title="Edit Penguji"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteCandidate(p)}
                            className="p-1.5 hover:bg-rose-100 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Hapus Penguji"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-extrabold text-stone-900 text-base leading-snug">
                      {p.nama}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-mono text-amber-900">
                        {p.nipNta || 'NTA belum diset'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
                          p.golongan === 'Siaga'
                            ? 'bg-emerald-600'
                            : p.golongan === 'Penggalang'
                            ? 'bg-rose-600'
                            : p.golongan === 'Penegak'
                            ? 'bg-amber-600'
                            : 'bg-stone-600'
                        }`}
                      >
                        {p.golongan || effectiveGolongan}
                      </span>
                    </div>

                    {/* Asal Kwarran Badge */}
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                        <MapPin className="w-3 h-3 text-amber-600" />
                        <span>Kwarran {p.kwarran || 'Kemranjen'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="font-medium text-stone-800">{p.jabatan}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{p.pangkalan}</span>
                    </div>
                    {p.noHp && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{p.noHp}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Telah Menguji:</span>
                  <span className="font-extrabold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {assessedCount} Peserta
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Penguji */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-extrabold text-stone-900 tracking-wide uppercase mb-4 pb-2 border-b border-stone-200">
              {editingPenguji ? 'Edit Data Penguji' : 'Tambah Penguji Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Kak Sugeng Priyono, S.Pd., M.Si."
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  NTA / NIP Penguji
                </label>
                <input
                  type="text"
                  value={formNipNta}
                  onChange={(e) => setFormNipNta(e.target.value)}
                  placeholder="NTA. 11.02.00.001"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-mono focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* ASAL KWARRAN SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Asal Kwartir Ranting (Kwarran) *</span>
                </label>
                {isAdminKwarran ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900 flex items-center justify-between">
                    <span>Kwarran {userKwarran}</span>
                    <span className="text-[10px] text-amber-700 font-normal italic">Terkunci ke Kwarran Anda</span>
                  </div>
                ) : (
                  <select
                    value={formKwarran}
                    onChange={(e) => setFormKwarran(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold focus:ring-1 focus:ring-amber-500"
                  >
                    {DAFTAR_KWARRAN_BANYUMAS.map((kw) => (
                      <option key={kw} value={kw}>
                        Kwarran {kw}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Golongan Penguji *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Siaga' as GolonganType, label: 'Siaga', dot: 'bg-emerald-500' },
                    { id: 'Penggalang' as GolonganType, label: 'Penggalang', dot: 'bg-rose-500' },
                    { id: 'Penegak' as GolonganType, label: 'Penegak', dot: 'bg-amber-500' },
                    { id: 'Pandega' as GolonganType, label: 'Pandega', dot: 'bg-stone-500' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setFormGolongan(g.id);
                        if (!editingPenguji) {
                          setFormJabatan(`Tim Penguji Urusan ${g.id}`);
                        }
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                        formGolongan === g.id
                          ? 'border-amber-600 bg-amber-50 text-amber-950 ring-2 ring-amber-500/40'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${g.dot} shrink-0`} />
                      <span>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Jabatan / Unsur
                </label>
                <input
                  type="text"
                  value={formJabatan}
                  onChange={(e) => setFormJabatan(e.target.value)}
                  placeholder="Andalan Cabang Urusan Penggalang"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Pangkalan / Instansi
                </label>
                <input
                  type="text"
                  value={formPangkalan}
                  onChange={(e) => setFormPangkalan(e.target.value)}
                  placeholder="Kwarcab Banyumas"
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  No. Telepon / WhatsApp
                </label>
                <input
                  type="text"
                  value={formHp}
                  onChange={(e) => setFormHp(e.target.value)}
                  placeholder="0812-3456-7890"
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
                  {editingPenguji ? 'Simpan Perubahan' : 'Tambahkan Penguji'}
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
              Hapus Data Penguji?
            </h3>
            <p className="text-xs text-stone-600 text-center mt-1">
              Apakah Anda yakin ingin menghapus penguji{' '}
              <span className="font-bold text-stone-900">"{deleteCandidate.nama}"</span>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePenguji(deleteCandidate.id);
                  setDeleteCandidate(null);
                }}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md shadow-rose-600/25 transition-all cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ekspor & Impor Data Penguji Modal */}
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
                    Ekspor &amp; Impor Data Tim Penguji
                  </h3>
                  <p className="text-xs text-stone-500">
                    Unggah atau unduh berkas spreadsheet data penguji resmi (.xlsx / .csv)
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
              {canManage && (
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
              )}
              <button
                type="button"
                onClick={() => setIoTab('export')}
                className={`py-2 px-3 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  ioTab === 'export' || !canManage
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
              {ioTab === 'import' && canManage ? (
                <div className="space-y-4">
                  {/* Template download notice */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                        <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                        <span>Unduh Format Template Penguji</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Susunan kolom: Nama Penguji, NTA/NIP, Golongan, Asal Kwarran, Jabatan, Pangkalan, No HP.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={downloadPengujiTemplate}
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
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm font-bold text-stone-700">
                      Klik untuk memilih berkas Excel atau CSV
                    </p>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Mendukung format .xlsx, .xls, dan .csv
                    </p>
                  </div>

                  {isParsing && (
                    <div className="text-center py-4 text-xs font-semibold text-stone-500 animate-pulse">
                      Sedang memproses dan memvalidasi berkas...
                    </div>
                  )}

                  {/* Parse Results Preview */}
                  {parseResult && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-700">
                          Pratinjau Data Impor ({parseResult.valid.length} data valid)
                        </span>
                        {parseResult.errors.length > 0 && (
                          <span className="text-xs font-bold text-rose-600">
                            {parseResult.errors.length} peringatan
                          </span>
                        )}
                      </div>

                      {parseResult.valid.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-stone-200 rounded-xl divide-y divide-stone-100 text-xs">
                          {parseResult.valid.slice(0, 10).map((p, i) => (
                            <div key={i} className="p-2.5 flex items-center justify-between hover:bg-stone-50">
                              <div>
                                <div className="font-bold text-stone-900">{p.nama}</div>
                                <div className="text-[11px] text-stone-500 flex items-center gap-2">
                                  <span>{p.nipNta || '-'}</span>
                                  <span>•</span>
                                  <span>Kwarran {p.kwarran || 'Kemranjen'}</span>
                                  <span>•</span>
                                  <span>{p.jabatan}</span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                                {p.golongan || effectiveGolongan}
                              </span>
                            </div>
                          ))}
                          {parseResult.valid.length > 10 && (
                            <div className="p-2 text-center text-[11px] text-stone-400 font-medium">
                              ...dan {parseResult.valid.length - 10} data lainnya
                            </div>
                          )}
                        </div>
                      )}

                      {/* Import Mode Selection */}
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                        <span className="text-xs font-bold text-stone-800">Mode Penyimpanan:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                            importMode === 'merge'
                              ? 'bg-white border-amber-600 text-amber-900 font-bold shadow-xs'
                              : 'bg-white/60 border-stone-200 text-stone-600'
                          }`}>
                            <input
                              type="radio"
                              name="importMode"
                              checked={importMode === 'merge'}
                              onChange={() => setImportMode('merge')}
                              className="text-amber-600"
                            />
                            <span>Gabung / Perbarui (Merge)</span>
                          </label>
                          <label className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${
                            importMode === 'replace'
                              ? 'bg-white border-rose-600 text-rose-900 font-bold shadow-xs'
                              : 'bg-white/60 border-stone-200 text-stone-600'
                          }`}>
                            <input
                              type="radio"
                              name="importMode"
                              checked={importMode === 'replace'}
                              onChange={() => setImportMode('replace')}
                              className="text-rose-600"
                            />
                            <span>Ganti Total (Replace)</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyImport}
                        disabled={parseResult.valid.length === 0}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Terapkan Impor ({parseResult.valid.length} Penguji)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* EXPORT CONTENT */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-xs font-black uppercase text-stone-800">
                        Ekspor Data Penguji ({filteredList.length} Baris)
                      </h4>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Unduh daftar penguji golongan <strong>{effectiveGolongan}</strong>
                      {isKwarranRestricted ? ` wilayah Kwarran ${userKwarran}` : ''} dalam format Microsoft Excel (.xlsx) resmi dengan data nomor NTA, Asal Kwarran, jabatan, instansi, kontak, serta rekap jumlah peserta yang telah diuji.
                    </p>

                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Berkas Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-center text-stone-900">
              Reset Data Penguji?
            </h3>
            <p className="text-xs text-stone-600 text-center mt-1">
              Ketik kata <span className="font-mono font-bold text-rose-600">RESET</span> di bawah untuk mengonfirmasi:
            </p>

            <input
              type="text"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
              placeholder="Ketik RESET"
              className="w-full mt-3 px-3 py-2 border border-stone-300 rounded-xl text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={resetConfirmInput !== 'RESET'}
                onClick={() => {
                  if (onResetAllPenguji) onResetAllPenguji(resetPengujiMode);
                  setIsResetModalOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
