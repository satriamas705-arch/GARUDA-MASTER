import React, { useState } from 'react';
import { AuthUser, Penguji, AppSettings } from '../types';
import { attemptLogin, getPengujiPasswordCandidates } from '../utils/auth';
import { GolonganType, extractGolonganName } from '../utils/golongan';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Award,
  KeyRound,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  UserCheck,
} from 'lucide-react';

interface LoginFormProps {
  pengujiList: Penguji[];
  settings: AppSettings;
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  pengujiList,
  settings,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'admin' | 'penguji'>('admin');
  const [selectedGolongan, setSelectedGolongan] = useState<GolonganType>(
    extractGolonganName(settings.golongan) || 'Penggalang'
  );

  // Filter penguji according to selected golongan
  const pengujiInSelectedGolongan = pengujiList.filter(
    (p) => !p.golongan || p.golongan === selectedGolongan
  );

  const handleGolonganChange = (gol: GolonganType) => {
    setSelectedGolongan(gol);
    setErrorMessage(null);
    if (activeTab === 'penguji') {
      const filtered = pengujiList.filter((p) => !p.golongan || p.golongan === gol);
      if (filtered.length > 0) {
        const defaultSample = getPengujiPasswordCandidates(filtered[0].nama)[0] || '';
        setPassword(defaultSample);
      }
    }
  };

  const handleSelectPengujiQuick = (penguji: Penguji) => {
    const candidates = getPengujiPasswordCandidates(penguji.nama);
    if (candidates.length > 0) {
      setPassword(candidates[0]);
      setErrorMessage(null);
    }
  };

  const handleTabChange = (tab: 'admin' | 'penguji') => {
    setActiveTab(tab);
    setErrorMessage(null);
    if (tab === 'admin') {
      setUsername('admin');
      setPassword('admin');
    } else {
      setUsername('penguji');
      const filtered = pengujiList.filter(
        (p) => !p.golongan || p.golongan === selectedGolongan
      );
      if (filtered.length > 0) {
        const defaultSample = getPengujiPasswordCandidates(filtered[0].nama)[0] || '';
        setPassword(defaultSample);
      } else if (pengujiList.length > 0) {
        const defaultSample = getPengujiPasswordCandidates(pengujiList[0].nama)[0] || '';
        setPassword(defaultSample);
      } else {
        setPassword('sugengpriyono');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = attemptLogin(username, password, pengujiList, selectedGolongan);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setErrorMessage(result.error || 'Login gagal. Periksa kembali username dan password Anda.');
    }
  };

  const logoUrl = settings.customLogoUrl || '/pg-banyumas.png';

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans">
      {/* Decorative scout badge background watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
        <img
          src={logoUrl}
          alt=""
          className="w-[700px] h-[700px] sm:w-[850px] sm:h-[850px] object-contain grayscale"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/PG BANYUMAS.png';
          }}
        />
      </div>

      {/* Decorative subtle ambient lights */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main container: 2-column layout on lg screens (Text & Logo in center/left, Form on right) */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Kolom Kiri/Tengah: Logo dan Tulisan Penilaian Pramuka Garuda */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-center lg:items-center text-center justify-center space-y-4 px-2">
          {/* Logo Badge Lingkaran Resmi dengan Foto Logo PG Banyumas */}
          <div className="relative group">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full blur-md opacity-40 group-hover:opacity-75 transition duration-500"></div>
            <div className="relative inline-flex flex-col items-center p-2 rounded-full bg-stone-900 border-2 border-amber-500/70 shadow-2xl backdrop-blur-md">
              <img
                src={logoUrl}
                alt="Logo Pramuka Garuda Banyumas"
                className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-full drop-shadow-xl hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/PG BANYUMAS.png';
                }}
              />
            </div>
          </div>

          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Sistem Penilaian Resmi</span>
            </div>

            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-white uppercase leading-tight">
              Penilaian Pramuka Garuda
            </h1>

            <p className="text-sm sm:text-base font-bold text-amber-300 tracking-wide uppercase">
              {settings.kwarran || 'KWARRAN KEMRANJEN'} • {settings.kwartirCabang}
            </p>

            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-stone-300 pt-1">
              <span className="bg-stone-800/80 px-2.5 py-1 rounded-md border border-stone-700/60 font-medium">
                Tahun {settings.tahun}
              </span>
              <span>•</span>
              <span className="bg-stone-800/80 px-2.5 py-1 rounded-md border border-stone-700/60 font-semibold text-amber-300">
                {settings.golongan}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed pt-2 max-w-md mx-auto">
              Aplikasi terintegrasi untuk verifikasi portofolio administrasi, pelaksanaan uji wawancara, perekapan nilai, dan pencetakan berita acara penetapan Pramuka Garuda.
            </p>
          </div>

          {/* Badge Fitur Singkat */}
          <div className="grid grid-cols-2 gap-2 w-full max-w-sm pt-2 text-left">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-800/60 border border-stone-700/50">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-stone-300">Penilaian Real-time</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-800/60 border border-stone-700/50">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[11px] font-semibold text-stone-300">Cetak & Unduh Dokumen</span>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Form Login */}
        <div className="lg:col-span-6 xl:col-span-5 w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-stone-200">
            {/* Header Form dengan Foto Logo Resmi */}
            <div className="mb-5 pb-4 border-b border-stone-100 flex items-center gap-3.5">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/60 p-1.5 border border-amber-200/80 shadow-sm shrink-0 flex items-center justify-center">
                <img
                  src={logoUrl}
                  alt="Logo PG Banyumas"
                  className="w-full h-full object-contain drop-shadow-xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/PG BANYUMAS.png';
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                    Silakan Masuk
                  </h2>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 shrink-0">
                    {activeTab === 'admin' ? 'Admin Portal' : 'Penguji Portal'}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5 truncate">
                  Pramuka Garuda {settings.kwartirCabang || 'Kwarcab Banyumas'}
                </p>
              </div>
            </div>

            {/* Role Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-stone-100 border border-stone-200 mb-5">
              <button
                type="button"
                onClick={() => handleTabChange('admin')}
                className={`py-2 px-3 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('penguji')}
                className={`py-2 px-3 text-xs sm:text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'penguji'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Penguji</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field Pilihan Golongan Penilaian (Khususnya untuk Penguji & Admin) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pilih Golongan Penilaian</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Aktif: {selectedGolongan}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: 'Siaga' as GolonganType,
                      label: 'Siaga',
                      age: '7-10 Thn',
                      tku: 'Mula • Bantu • Tata',
                      activeBorder: 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500 text-emerald-950',
                      badgeBg: 'bg-emerald-500',
                    },
                    {
                      id: 'Penggalang' as GolonganType,
                      label: 'Penggalang',
                      age: '11-15 Thn',
                      tku: 'Ramu • Rakit • Terap',
                      activeBorder: 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500 text-rose-950',
                      badgeBg: 'bg-rose-500',
                    },
                    {
                      id: 'Penegak' as GolonganType,
                      label: 'Penegak',
                      age: '16-20 Thn',
                      tku: 'Bantara • Laksana',
                      activeBorder: 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500 text-amber-950',
                      badgeBg: 'bg-amber-500',
                    },
                    {
                      id: 'Pandega' as GolonganType,
                      label: 'Pandega',
                      age: '21-25 Thn',
                      tku: 'Pandega Garuda',
                      activeBorder: 'border-stone-600 bg-stone-100 ring-2 ring-stone-600 text-stone-950',
                      badgeBg: 'bg-stone-700',
                    },
                  ].map((gol) => {
                    const isSelected = selectedGolongan === gol.id;
                    return (
                      <button
                        key={gol.id}
                        type="button"
                        onClick={() => handleGolonganChange(gol.id)}
                        className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? gol.activeBorder + ' shadow-sm'
                            : 'border-stone-200 bg-stone-50/60 hover:bg-white text-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full ${gol.badgeBg} shrink-0`} />
                            <span className="font-extrabold text-xs text-stone-900 truncate">
                              {gol.label}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-stone-400 shrink-0">
                            {gol.age}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-500 mt-1 truncate font-medium">
                          {gol.tku}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick penguji selection per selected golongan */}
                {activeTab === 'penguji' && (
                  <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 mt-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span>Pilih Penguji Golongan {selectedGolongan}:</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        {pengujiInSelectedGolongan.length} Penguji
                      </span>
                    </div>

                    {pengujiInSelectedGolongan.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {pengujiInSelectedGolongan.map((pj) => {
                          const cand = getPengujiPasswordCandidates(pj.nama)[0];
                          const isSelected = password === cand;
                          return (
                            <button
                              key={pj.id}
                              type="button"
                              onClick={() => handleSelectPengujiQuick(pj)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/50'
                                  : 'bg-white text-stone-700 border-amber-200 hover:bg-amber-100/70 hover:border-amber-300'
                              }`}
                            >
                              {pj.nama.replace(/\b(kak|kakak)\b\.?/gi, '').trim().split(',')[0]}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-amber-900 leading-snug">
                        Belum ada penguji terdaftar untuk golongan {selectedGolongan}. Masukkan password nama penguji Anda secara manual.
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-stone-500 mt-1.5 leading-tight">
                  *Form penilaian, data peserta, data penguji, tim penilai, dan rekap nilai otomatis difilter untuk golongan <strong>{selectedGolongan}</strong>.
                </p>
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin / penguji"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Password
                  </label>
                  {activeTab === 'penguji' && (
                    <span className="text-[11px] text-stone-500">
                      nama penguji
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      activeTab === 'admin'
                        ? '••••••••'
                        : 'nama penguji huruf kecil'
                    }
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-700"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Notification */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="leading-snug">{errorMessage}</div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 transition-all mt-2"
              >
                <span>Masuk Aplikasi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Petunjuk Akses Akun (hanya untuk Penguji, disembunyikan untuk Admin) */}
            {activeTab === 'penguji' && (
              <div className="mt-5 pt-4 border-t border-stone-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Petunjuk Akses Penguji:</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-700" />
                    <span>Akses Tim Penguji</span>
                  </div>
                  <div className="text-[11px] text-stone-700">
                    Username: <code className="bg-amber-100 font-bold px-1 rounded">penguji</code>
                  </div>
                  <div className="text-[11px] text-stone-700">
                    Password: <span className="font-bold">nama penguji huruf kecil dan disambung</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer info di bawah form */}
          <div className="text-center text-[11px] text-stone-400 mt-4 font-medium">
            Sistem Penilaian Pencapaian Pramuka Garuda © {settings.tahun}
          </div>
        </div>
      </div>
    </div>
  );
};
