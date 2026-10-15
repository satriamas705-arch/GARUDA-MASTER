import React, { useState, useEffect, useRef } from 'react';
import { Penguji, PenilaianPeserta, AuthUser } from '../types';
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
  FileUp,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import {
  exportPengujiToExcel,
  downloadPengujiTemplate,
  parsePengujiFile,
  ParsePengujiResult,
} from '../utils/dataIo';
import { AppSettings } from '../types';
import { extractGolonganName, GolonganType } from '../utils/golongan';

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

  // Filter Penguji strictly to effectiveGolongan
  const filteredPengujiList = pengujiList.filter(
    (p) => (p.golongan || 'Penggalang') === effectiveGolongan
  );

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

  const [formNama, setFormNama] = useState('');
  const [formNipNta, setFormNipNta] = useState('');
  const [formJabatan, setFormJabatan] = useState('');
  const [formPangkalan, setFormPangkalan] = useState('');
  const [formHp, setFormHp] = useState('');
  const [formGolongan, setFormGolongan] = useState<GolonganType>(effectiveGolongan);

  const isAdmin = !currentUser || currentUser.role === 'admin';

  const openAddModal = () => {
    setEditingPenguji(null);
    setFormNama('');
    setFormNipNta(`NTA. 11.02.00.${(pengujiList.length + 1).toString().padStart(3, '0')}`);
    setFormGolongan(effectiveGolongan);
    setFormJabatan(`Tim Penguji Urusan ${effectiveGolongan}`);
    setFormPangkalan(settings?.kwartirCabang || 'Kwarcab Banyumas');
    setFormHp('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Penguji) => {
    setEditingPenguji(p);
    setFormNama(p.nama);
    setFormNipNta(p.nipNta || '');
    setFormJabatan(p.jabatan);
    setFormPangkalan(p.pangkalan);
    setFormHp(p.noHp || '');
    setFormGolongan(p.golongan || effectiveGolongan);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) return;

    if (editingPenguji) {
      onUpdatePenguji({
        ...editingPenguji,
        nama: formNama,
        nipNta: formNipNta,
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

    if (onBatchImportPenguji) {
      onBatchImportPenguji(parseResult.valid, importMode);
    } else {
      parseResult.valid.forEach((pj) => onAddPenguji(pj));
    }

    setImportNotification(
      `Berhasil mengimpor ${parseResult.valid.length} data penguji (${
        importMode === 'merge' ? 'Gabung / Perbarui' : 'Ganti Total'
      }).`
    );
    setTimeout(() => setImportNotification(null), 5000);

    setIsIoModalOpen(false);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-stone-900 tracking-wide uppercase">
            Data Tim Penguji - Golongan {effectiveGolongan}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Daftar penguji resmi, andalan cabang, pelatih, dan penilai wawancara ({settings?.kwartirCabang || 'Kwarcab Banyumas'}) • Total: {filteredPengujiList.length} Penguji Golongan {effectiveGolongan}
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
            title="Ekspor Data Penguji ke Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setIoTab('import');
                setParseResult(null);
                setIsIoModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-stone-100 hover:bg-indigo-50 hover:text-indigo-800 text-stone-700 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 border border-stone-200 hover:border-indigo-300 transition-all cursor-pointer"
              title="Impor Data Penguji dari Excel / CSV"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Impor</span>
            </button>
          )}

          {isAdmin && onResetAllPenguji && (
            <button
              type="button"
              onClick={() => {
                setResetPengujiMode('empty');
                setResetConfirmInput('');
                setIsResetModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-800 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 border border-rose-300 transition-all cursor-pointer"
              title="Reset Semua Data Penguji"
            >
              <RotateCcw className="w-4 h-4 text-rose-600" />
              <span>Reset Semua Penguji</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Penguji Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Golongan Indicator Bar for Penguji */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-stone-700 font-bold">
          <Layers className="w-4 h-4 text-amber-600" />
          <span>Golongan Penguji:</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-xl text-xs font-bold text-white shadow-xs ${
            effectiveGolongan === 'Siaga'
              ? 'bg-emerald-600'
              : effectiveGolongan === 'Penggalang'
              ? 'bg-rose-600'
              : effectiveGolongan === 'Penegak'
              ? 'bg-amber-600'
              : 'bg-stone-700'
          }`}>
            Khusus Golongan {effectiveGolongan}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            {filteredPengujiList.length} Penguji Terdaftar
          </span>
        </div>
      </div>

      {/* Examiners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPengujiList
          .map((p) => {
            // Count participants assessed by this examiner
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
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 hover:bg-stone-100 text-stone-600 rounded-lg transition-colors"
                            title="Edit Penguji"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-amber-900">
                        {p.nipNta || 'NTA belum diset'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
                        p.golongan === 'Siaga'
                          ? 'bg-emerald-600'
                          : p.golongan === 'Penggalang'
                          ? 'bg-rose-600'
                          : p.golongan === 'Penegak'
                          ? 'bg-amber-600'
                          : 'bg-stone-600'
                      }`}>
                        {p.golongan || 'Penggalang'}
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
                          setFormJabatan(`Andalan Cabang Urusan ${g.id}`);
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
                  Pangkalan / Kwartir
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
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-amber-600/20 transition-all"
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
                className="flex-1 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePenguji(deleteCandidate.id);
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
              {isAdmin && (
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
                  ioTab === 'export' || !isAdmin
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
              {ioTab === 'import' && isAdmin ? (
                <div className="space-y-4">
                  {/* Template download notice */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                        <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                        <span>Unduh Format Template Penguji</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        Susunan kolom: Nama Penguji, NTA/NIP, Jabatan, Pangkalan/Instansi, No HP/WhatsApp.
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
                      Klik untuk memilih berkas Excel atau CSV penguji
                    </div>
                    <div className="text-xs text-stone-500 mt-1">
                      Mendukung format .xlsx, .xls, dan .csv
                    </div>
                  </div>

                  {isParsing && (
                    <div className="p-4 rounded-xl bg-stone-100 text-center text-xs font-semibold text-stone-600 animate-pulse">
                      Membaca data berkas penguji...
                    </div>
                  )}

                  {/* Parse Results Preview */}
                  {parseResult && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-stone-700">
                          Pratinjau Data ({parseResult.valid.length} Penguji Terbaca)
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
                              <th className="py-2 px-2.5">NAMA PENGUJI</th>
                              <th className="py-2 px-2.5">NTA / NIP</th>
                              <th className="py-2 px-2.5">JABATAN</th>
                              <th className="py-2 px-2.5">PANGKALAN</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {parseResult.valid.slice(0, 8).map((pj, idx) => (
                              <tr key={pj.id} className="hover:bg-amber-50/20">
                                <td className="py-1.5 px-2.5 text-stone-500">{idx + 1}</td>
                                <td className="py-1.5 px-2.5 font-bold text-stone-900">{pj.nama}</td>
                                <td className="py-1.5 px-2.5 font-mono text-amber-900">
                                  {pj.nipNta || '-'}
                                </td>
                                <td className="py-1.5 px-2.5 text-stone-700">{pj.jabatan}</td>
                                <td className="py-1.5 px-2.5 text-stone-600">{pj.pangkalan}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Import Mode Selector */}
                      <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                        <div className="text-xs font-bold text-stone-700">Pilih Mode Impor:</div>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 text-xs text-stone-800 cursor-pointer">
                            <input
                              type="radio"
                              name="pengujiImportMode"
                              checked={importMode === 'merge'}
                              onChange={() => setImportMode('merge')}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>
                              <strong>Gabungkan &amp; Perbarui (Merge)</strong> — Tambahkan ke data yang ada dan perbarui bila ada penguji yang cocok.
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-xs text-stone-800 cursor-pointer">
                            <input
                              type="radio"
                              name="pengujiImportMode"
                              checked={importMode === 'replace'}
                              onChange={() => setImportMode('replace')}
                              className="text-amber-600 focus:ring-amber-500"
                            />
                            <span>
                              <strong>Ganti Total (Replace All)</strong> — Hapus daftar penguji lama dan gunakan data berkas ini.
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
                      Ekspor Data Tim Penguji Pramuka Garuda
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Unduh berkas spreadsheet data tim penguji resmi lengkap dengan nomor NTA/NIP, jabatan kepramukaan, instansi pangkalan, nomor kontak, serta total rekap peserta yang telah dinilai.
                    </p>

                    <div className="p-3 rounded-xl bg-white border border-stone-200 text-center max-w-xs mx-auto">
                      <div className="text-2xl font-black text-amber-700">{pengujiList.length}</div>
                      <div className="text-[11px] text-stone-500 font-bold uppercase mt-0.5">
                        Total Penguji Terdaftar
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => exportPengujiToExcel(pengujiList, penilaianMap)}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Data Penguji ke Excel (.xlsx)</span>
                    </button>
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={downloadPengujiTemplate}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center justify-center gap-1 mx-auto"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Format Template Kosong Penguji (.xlsx)</span>
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

              {ioTab === 'import' && isAdmin && parseResult && parseResult.valid.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyImport}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-amber-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Terapkan Impor ({parseResult.valid.length} Penguji)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
       * MODAL RESET SEMUA PENGUJI
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
                  Reset Semua Data Penguji
                </h3>
                <p className="text-xs text-stone-500">
                  Kelola dan bersihkan data tim penguji yang terdaftar
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                Pilih Mode Reset:
              </label>

              <div
                onClick={() => setResetPengujiMode('empty')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  resetPengujiMode === 'empty'
                    ? 'border-rose-500 bg-rose-50/70 text-rose-950'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-sm text-rose-900">
                    1. Kosongkan Total (0 Penguji)
                  </div>
                  <input
                    type="radio"
                    name="resetPengujiMode"
                    checked={resetPengujiMode === 'empty'}
                    onChange={() => setResetPengujiMode('empty')}
                    className="accent-rose-600"
                  />
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Hapus <strong>seluruh penguji ({pengujiList.length} penguji)</strong> dari sistem. Cocok untuk mendaftarkan susunan tim penilai baru.
                </p>
              </div>

              <div
                onClick={() => setResetPengujiMode('default')}
                className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                  resetPengujiMode === 'default'
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
                    name="resetPengujiMode"
                    checked={resetPengujiMode === 'default'}
                    onChange={() => setResetPengujiMode('default')}
                    className="accent-amber-600"
                  />
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  Mengembalikan data penguji ke contoh bawaan resmi Kwartir Cabang Banyumas.
                </p>
              </div>
            </div>

            {resetPengujiMode === 'empty' && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <span className="font-bold block mb-1">Konfirmasi Keamanan:</span>
                Ketik kata <span className="font-black underline text-rose-950">RESET</span> di bawah untuk konfirmasi pengosongan penguji:
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
                disabled={resetPengujiMode === 'empty' && resetConfirmInput.trim().toUpperCase() !== 'RESET'}
                onClick={() => {
                  if (onResetAllPenguji) {
                    onResetAllPenguji(resetPengujiMode);
                    setImportNotification(
                      resetPengujiMode === 'empty'
                        ? 'Semua data penguji telah berhasil dikosongkan.'
                        : 'Data penguji berhasil dikembalikan ke contoh bawaan.'
                    );
                    setTimeout(() => setImportNotification(null), 4000);
                  }
                  setIsResetModalOpen(false);
                }}
                className={`px-5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 ${
                  resetPengujiMode === 'empty'
                    ? resetConfirmInput.trim().toUpperCase() === 'RESET'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 active:scale-95 cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 active:scale-95 cursor-pointer'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {resetPengujiMode === 'empty' ? 'Kosongkan Semua Penguji' : 'Reset ke Contoh Bawaan'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
