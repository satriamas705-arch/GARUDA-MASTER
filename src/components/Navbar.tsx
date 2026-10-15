import React, { useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCheck,
  Shield,
  FileSpreadsheet,
  Settings,
  Menu,
  X,
  Award,
  LogOut,
  ExternalLink,
  Cloud,
  Layers,
  KeyRound,
} from 'lucide-react';
import { PramukaBadge } from './PramukaBadge';
import { AppSettings, AuthUser } from '../types';
import { GolonganType, extractGolonganName } from '../utils/golongan';

export type NavTab = 'dashboard' | 'penilaian' | 'peserta' | 'penguji' | 'kelompok' | 'rekap';

export interface NavItemConfig {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: number;
  badgeText?: string;
  adminOnly?: boolean;
}

export const getNavItems = (
  pesertaCount: number,
  sudahDinilaiCount: number,
  _isPenguji: boolean
): NavItemConfig[] => {
  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Ringkasan & Statistik',
      icon: LayoutDashboard,
    },
    {
      id: 'penilaian',
      label: 'Form Penilaian',
      description: 'Administrasi & Wawancara',
      icon: ClipboardList,
    },
    {
      id: 'peserta',
      label: 'Data Peserta',
      description: 'Daftar Calon Garuda',
      icon: Users,
      badge: pesertaCount,
    },
    {
      id: 'penguji',
      label: 'Data Penguji',
      description: 'Daftar Tim Penguji',
      icon: UserCheck,
    },
    {
      id: 'kelompok',
      label: 'Data Tim Penilai',
      description: 'Penguji, Andik & Nilai',
      icon: Shield,
    },
    {
      id: 'rekap',
      label: 'Rekap & Ekspor',
      description: 'Hasil Akhir & Rekap Penguji',
      icon: FileSpreadsheet,
      badgeText: `${sudahDinilaiCount}/${pesertaCount}`,
    },
  ];
};

/* ========================================================
 * TOP NAVIGATION COMPONENT (Menu Navigasi di Bagian Atas)
 * ======================================================== */
export interface TopNavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  settings: AppSettings;
  pesertaCount: number;
  sudahDinilaiCount: number;
  currentUser?: AuthUser | null;
  onTriggerLogout: () => void;
  onOpenSettings?: () => void;
  onOpenDriveSync?: () => void;
  onSelectGolongan?: (gol: GolonganType) => void;
  onOpenChangePassword?: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  activeTab,
  onSelectTab,
  settings,
  pesertaCount,
  sudahDinilaiCount,
  currentUser,
  onTriggerLogout,
  onOpenSettings,
  onOpenDriveSync,
  onSelectGolongan,
  onOpenChangePassword,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isPenguji = currentUser?.role === 'penguji';
  const navItems = getNavItems(pesertaCount, sudahDinilaiCount, isPenguji);
  const activeGolongan: GolonganType =
    currentUser?.selectedGolongan || extractGolonganName(settings.golongan) || 'Penggalang';

  const handleItemClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-white shadow-lg border-b border-stone-800 print:hidden select-none">
      {/* Tier 1: Branding Header, User Session, Golongan Selector & Action Controls */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          {/* Left: Official Brand & Title */}
          <div
            onClick={() => handleItemClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0 min-w-0"
            title="Kembali ke Dashboard Utama"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform shrink-0 shadow-sm">
              <PramukaBadge
                size={40}
                customLogoUrl={settings.customLogoUrl}
                kwarranText={settings.kwarran || 'KWARRAN KEMRANJEN'}
                year={settings.tahun}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm sm:text-base tracking-tight text-white group-hover:text-amber-400 transition-colors uppercase truncate">
                  Pramuka Garuda
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                  {settings.tahun}
                </span>
              </div>
              <div className="text-[11px] text-stone-400 font-medium truncate flex items-center gap-1">
                <span>{settings.kwarran || 'KWARRAN KEMRANJEN'}</span>
                <span>•</span>
                <span className="text-stone-400/80">{settings.kwartirCabang || 'Kwarcab Banyumas'}</span>
              </div>
            </div>
          </div>

          {/* Right: Golongan Switcher, Cloud Sync, Settings, User Info & Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Golongan Badge for Penguji or Switcher Dropdown for Admin */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800/90 border border-stone-700 shadow-inner">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  activeGolongan === 'Siaga'
                    ? 'bg-emerald-400'
                    : activeGolongan === 'Penggalang'
                    ? 'bg-rose-400'
                    : activeGolongan === 'Penegak'
                    ? 'bg-amber-400'
                    : 'bg-stone-300'
                }`}
              />
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase hidden md:inline">
                  Golongan:
                </span>
                {currentUser?.role === 'penguji' ? (
                  <span className="font-extrabold text-xs text-amber-300">
                    {activeGolongan}
                  </span>
                ) : (
                  <select
                    value={activeGolongan}
                    onChange={(e) => onSelectGolongan && onSelectGolongan(e.target.value as GolonganType)}
                    className="bg-transparent font-bold text-xs text-amber-300 focus:outline-none cursor-pointer pr-1"
                    title="Ganti Golongan Penilaian yang ditampilkan"
                  >
                    <option value="Siaga" className="bg-stone-900 text-white">Siaga (7-10 Thn)</option>
                    <option value="Penggalang" className="bg-stone-900 text-white">Penggalang (11-15 Thn)</option>
                    <option value="Penegak" className="bg-stone-900 text-white">Penegak (16-20 Thn)</option>
                    <option value="Pandega" className="bg-stone-900 text-white">Pandega (21-25 Thn)</option>
                  </select>
                )}
              </div>
            </div>

            {/* Google Sheets Live Link (jika sudah disinkronkan) */}
            {settings.lastSyncedSpreadsheetUrl && (
              <a
                href={settings.lastSyncedSpreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all shadow-sm"
                title="Buka Google Spreadsheet Langsung di Tab Baru"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Google Drive Sync Quick Button */}
            {onOpenDriveSync && (
              <button
                type="button"
                onClick={onOpenDriveSync}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Sinkronisasi Google Drive & Spreadsheet (Backup & Restore)"
              >
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline font-bold">Drive Sync</span>
              </button>
            )}

            {/* User Session Info with Bawor Photo for Admin & Admin Kwarran */}
            {currentUser && (
              <div
                onClick={onOpenChangePassword}
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-800/90 border border-stone-700 shadow-inner ${
                  onOpenChangePassword
                    ? 'cursor-pointer hover:border-amber-500/50 hover:bg-stone-800 transition-all'
                    : ''
                }`}
                title={onOpenChangePassword ? 'Klik untuk Ubah Password Akun' : undefined}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 ${
                    currentUser.role === 'admin' || currentUser.role === 'admin_kwarran'
                      ? 'bg-amber-100 border-2 border-amber-400 shadow-xs'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {currentUser.role === 'admin' || currentUser.role === 'admin_kwarran' ? (
                    <img
                      src="/bawor.png"
                      alt="Foto Admin Bawor"
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <Award className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-bold text-white text-xs max-w-[110px] md:max-w-[150px] truncate leading-tight">
                    {currentUser.displayName}
                  </div>
                  <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider leading-none">
                    {currentUser.role === 'admin'
                      ? 'Admin Bawor'
                      : currentUser.role === 'admin_kwarran'
                      ? `Admin Kwarran ${currentUser.kwarran || ''}`
                      : `Penguji ${currentUser.kwarran ? `(${currentUser.kwarran})` : ''}`}
                  </div>
                </div>
              </div>
            )}

            {/* Ubah Password Button (Semua User: Admin Kwarcab, Admin Kwarran, & Penguji) */}
            {currentUser && onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-amber-300 hover:text-white border border-stone-700 hover:border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Ubah Password Akun Anda"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Ubah Password</span>
              </button>
            )}

            {/* Admin Settings Button (Kwarcab Super Admin only) */}
            {currentUser?.role === 'admin' && onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="hidden md:flex p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700 cursor-pointer"
                title="Pengaturan Kwartir & Data"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Tombol Logout (Keluar) */}
            <button
              type="button"
              onClick={onTriggerLogout}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 border border-rose-500 cursor-pointer shrink-0"
              title="Keluar dari Aplikasi (Logout)"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">Keluar</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors border border-stone-700 ml-1"
              aria-label="Buka menu navigasi"
              title="Buka menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Menu Navigasi di Bagian Atas (Horizontal Navigation Bar) */}
      <nav className="w-full bg-stone-950/95 border-t border-stone-800/80 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1 overflow-x-auto scrollbar-none py-1.5">
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/25 ring-1 ring-amber-500/50'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/90'
                  }`}
                  title={item.description || item.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>

                  {/* Badge count indicator */}
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-amber-950 text-amber-200 border border-amber-800'
                          : 'bg-stone-800 text-stone-300 border border-stone-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.badgeText && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive
                          ? 'bg-amber-950 text-amber-200 border border-amber-800'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                      }`}
                    >
                      {item.badgeText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Golongan Indicator Pill on Desktop */}
          <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-stone-800 shrink-0 text-xs text-stone-400 font-semibold">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Aktif:</span>
            <span className="font-extrabold text-amber-300">{activeGolongan}</span>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer (Saat Hamburger Diklik pada Layar Kecil) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-stone-950 border-t border-stone-800 px-4 py-3 space-y-2 animate-in slide-in-from-top-3 duration-200 shadow-2xl">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2 pb-1">
            Menu Navigasi
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-colors ${
                    isActive
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-200 font-bold">
                      {item.badge}
                    </span>
                  )}
                  {item.badgeText && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold">
                      {item.badgeText}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Action Shortcuts in Mobile Menu */}
          <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center gap-2">
            {onOpenDriveSync && (
              <button
                type="button"
                onClick={() => {
                  onOpenDriveSync();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Sync Drive</span>
              </button>
            )}

            {currentUser && onOpenChangePassword && (
              <button
                type="button"
                onClick={() => {
                  onOpenChangePassword();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Ubah Password</span>
              </button>
            )}

            {!isPenguji && onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setMobileMenuOpen(false);
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Pengaturan</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

/* ========================================================
 * BACKWARD-COMPATIBLE EXPORTS (Navbar, Sidebar, TopHeader)
 * ======================================================== */
export interface NavbarProps extends TopNavigationProps {}

export const Navbar: React.FC<NavbarProps> = (props) => {
  return <TopNavigation {...props} />;
};

export interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  settings: AppSettings;
  pesertaCount: number;
  sudahDinilaiCount: number;
  currentUser?: AuthUser | null;
  onOpenSettings?: () => void;
  onOpenDriveSync?: () => void;
  onSelectGolongan?: (gol: GolonganType) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  // Shims to keep backwards compatibility if imported anywhere
  return null;
};

export interface TopHeaderProps {
  activeTab: NavTab;
  currentUser?: AuthUser | null;
  settings: AppSettings;
  onOpenMobileMenu?: () => void;
  onTriggerLogout: () => void;
  onOpenSettings?: () => void;
  onOpenDriveSync?: () => void;
  onSelectGolongan?: (gol: GolonganType) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = (props) => {
  // Shims to keep backwards compatibility if imported anywhere
  return null;
};
