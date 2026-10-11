import React, { useState, useEffect } from 'react';
import {
  Lock,
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  RotateCcw,
  Building2,
  UserCheck,
  ChevronLeft,
  Briefcase
} from 'lucide-react';
import { User } from '../../types';
import { StorageService, RememberedUser } from '../../services/storage';
import { DeveloperBadge } from '../common/DeveloperBadge';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const settings = StorageService.getSettings();

  const [activeTab, setActiveTab] = useState<'EMPLOYEE' | 'MANAGEMENT'>('EMPLOYEE');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Biometrics & Remembered User
  const [rememberedUser, setRememberedUser] = useState<RememberedUser | null>(null);
  const [isScanningFingerprint, setIsScanningFingerprint] = useState(false);

  useEffect(() => {
    const cached = StorageService.getRememberedUser();
    if (cached) {
      setRememberedUser(cached);
    }
  }, []);

  // Standard Login Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanId = loginId.trim();
    if (!cleanId) {
      setErrorMsg('لطفاً نام کاربری، کد ملی، کد پرسنلی یا شماره موبایل را وارد فرمایید.');
      return;
    }
    if (!password) {
      setErrorMsg('لطفاً رمز عبور را وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await StorageService.authenticateAsync(cleanId, password, rememberMe);
      if (res.success && res.user) {
        setSuccessMsg(`خوش آمدید، ${res.user.name}`);
        setTimeout(() => {
          onLogin(res.user!);
        }, 350);
      } else {
        setErrorMsg(res.message || 'نام کاربری یا رمز عبور اشتباه است.');
      }
    } catch {
      setErrorMsg('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Biometric Fast Login
  const handleBiometricLogin = async (customId?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetId = customId || (rememberedUser ? rememberedUser.personalCode || rememberedUser.username || rememberedUser.phone : loginId.trim());

    if (!targetId) {
      setErrorMsg('لطفاً ابتدا کد پرسنلی یا نام کاربری خود را در کادر وارد نمایید.');
      return;
    }

    setIsSubmitting(true);
    setIsScanningFingerprint(true);

    try {
      const res = await StorageService.authenticateBiometricAsync(targetId, rememberMe);
      if (res.success && res.user) {
        setSuccessMsg(`خوش آمدید، ${res.user.name}`);
        setTimeout(() => {
          onLogin(res.user!);
        }, 400);
      } else {
        setErrorMsg(res.message || 'احراز هویت با اثر انگشت انجام نشد.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'خطا در خواندن حسگر اثر انگشت.');
    } finally {
      setIsSubmitting(false);
      setIsScanningFingerprint(false);
    }
  };

  const handleSelectRemembered = (user: RememberedUser) => {
    setLoginId(user.personalCode || user.username || user.phone || '');
    if (user.id === 'usr_admin') {
      setActiveTab('MANAGEMENT');
    } else {
      setActiveTab('EMPLOYEE');
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between items-center p-4 sm:p-8 font-sans selection:bg-slate-900 selection:text-white"
      dir="rtl"
    >
      <div className="w-full max-w-md my-auto">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white font-black text-xl shadow-xs mb-3 border border-slate-800">
            MG
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {settings.companyName || 'M.GAMMON'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            سامانه یکپارچه مدیریت کارگاهی، حضور و غیاب و پرسنلی
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
          {/* Tabs: Employee vs Management */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('EMPLOYEE');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'EMPLOYEE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>ورود پرسنل</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('MANAGEMENT');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'MANAGEMENT'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>ورود مدیریت</span>
            </button>
          </div>

          {/* Remembered User Quick Chip */}
          {rememberedUser && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {rememberedUser.name?.charAt(0) || '؟'}
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-500 block">آخرین حساب مورد استفاده:</span>
                  <span className="font-bold text-slate-900 truncate block">{rememberedUser.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectRemembered(rememberedUser)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer shrink-0"
              >
                انتخاب این حساب
              </button>
            </div>
          )}

          {/* Notification Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {activeTab === 'EMPLOYEE'
                  ? 'کد پرسنلی، کد ملی، شماره موبایل یا نام کاربری'
                  : 'نام کاربری یا شماره موبایل مدیریت'}
              </label>
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder={activeTab === 'EMPLOYEE' ? 'مثال: امید میثمی (omid) یا 0915...' : 'مثال: admin یا شماره موبایل'}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-800 transition-all font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  رمز عبور
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور حساب کاربری"
                  className="w-full text-xs p-3 pl-10 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-800 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-800 cursor-pointer accent-slate-900"
                />
                <span>مرا به خاطر بسپار</span>
              </label>

              {activeTab === 'MANAGEMENT' && (
                <span className="text-[11px] text-slate-400">
                  حساب پیش‌فرض مدیر ارشد: admin
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'در حال بررسی...' : 'ورود به سامانه'}
            </button>
          </form>

          {/* Biometric Touch Option */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleBiometricLogin()}
              disabled={isSubmitting || isScanningFingerprint}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-slate-600" />
              <span>{isScanningFingerprint ? 'در حال اسکن اثر انگشت...' : 'ورود سریع با اثر انگشت'}</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <span>کارگاه M.GAMMON • مشهد، توس ۱۴۲، حسین‌زاده ۸</span>
        </div>
      </div>

      <div className="w-full max-w-md pb-4 flex justify-center">
        <DeveloperBadge variant="footer" />
      </div>
    </div>
  );
};
