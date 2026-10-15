import React, { useState } from 'react';
import { AuthUser, Penguji } from '../types';
import {
  changeUserPassword,
  resetUserPasswordToDefault,
  hasCustomPassword,
} from '../utils/auth';
import {
  KeyRound,
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Shield,
  Award,
  MapPin,
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  pengujiList: Penguji[];
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  pengujiList,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const isUsingCustom = hasCustomPassword(currentUser);

  const handleResetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowResetConfirm(false);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!oldPassword.trim()) {
      setErrorMessage('Password lama / saat ini wajib diisi.');
      return;
    }
    if (!newPassword.trim()) {
      setErrorMessage('Password baru wajib diisi.');
      return;
    }
    if (newPassword.trim().length < 4) {
      setErrorMessage('Password baru minimal harus 4 karakter.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMessage('Konfirmasi password baru tidak cocok. Periksa kembali pengetikan Anda.');
      return;
    }

    const result = changeUserPassword(
      currentUser,
      oldPassword,
      newPassword,
      pengujiList
    );

    if (result.success) {
      setSuccessMessage('Password berhasil diperbarui! Gunakan password baru ini saat login berikutnya.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        handleClose();
      }, 1800);
    } else {
      setErrorMessage(result.error || 'Gagal mengubah password. Pastikan password lama sesuai.');
    }
  };

  const handleResetToDefault = () => {
    const res = resetUserPasswordToDefault(currentUser);
    if (res.success) {
      setSuccessMessage(`${res.message}`);
      setShowResetConfirm(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        handleClose();
      }, 1800);
    } else {
      setErrorMessage(res.message);
    }
  };

  const getRoleBadge = () => {
    if (currentUser.role === 'admin') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          Admin Kwarcab
        </span>
      );
    }
    if (currentUser.role === 'admin_kwarran') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
          Admin Kwarran
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
        Tim Penguji
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 p-5 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">
                Ubah Password Akun
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pengaturan keamanan akun penilaian
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* User identity card */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${
                currentUser.role === 'admin' || currentUser.role === 'admin_kwarran'
                  ? 'bg-amber-100 border-2 border-amber-300 p-0.5'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              }`}
            >
              {currentUser.role === 'admin' || currentUser.role === 'admin_kwarran' ? (
                <img
                  src="/bawor.png"
                  alt="Bawor"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Award className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-stone-900 truncate">
                  {currentUser.displayName}
                </span>
                {getRoleBadge()}
              </div>
              <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                {currentUser.kwarran && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-stone-400" />
                    <span>Kwarran {currentUser.kwarran}</span>
                  </span>
                )}
                {currentUser.selectedGolongan && (
                  <span className="text-[11px] font-semibold text-stone-600">
                    • Golongan {currentUser.selectedGolongan}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Alert messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-relaxed font-semibold">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="leading-relaxed font-bold">{successMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Password Lama */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Password Saat Ini (Password Lama)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showOldPass ? 'text' : 'password'}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Password Baru */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Password Baru
                </label>
                <span className="text-[10px] text-stone-500 font-semibold">
                  Min. 4 karakter
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password Baru */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Shield className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Password</span>
              </button>
            </div>
          </form>

          {/* Reset ke default option */}
          {isUsingCustom && (
            <div className="pt-3 border-t border-stone-200">
              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                  <span>Kembalikan ke Password Default</span>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="text-xs text-amber-950 font-bold">
                    Apakah Anda yakin ingin mereset password ke default awal?
                  </div>
                  <p className="text-[11px] text-amber-900 leading-tight">
                    {currentUser.role === 'admin'
                      ? 'Password Administrator Kwarcab akan kembali menjadi "admin".'
                      : currentUser.role === 'admin_kwarran'
                      ? `Password Admin Kwarran ${currentUser.kwarran} akan kembali menjadi nama kwarran huruf kecil.`
                      : 'Password penguji akan kembali menjadi nama penguji huruf kecil.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                    >
                      Ya, Reset Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
