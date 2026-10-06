import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, Share2, PlusSquare, X } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'subtle' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'primary',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled) {
    return null;
  }

  // Not installable yet and not iOS (e.g. standard desktop browser without prompt)
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      install();
    }
  };

  const getButtonStyles = () => {
    if (variant === 'compact') {
      return 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition shadow-xs';
    }
    if (variant === 'subtle') {
      return 'flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs';
    }
    return 'flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 transition shadow-xs';
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        type="button"
        title="نصب نسخه پیشرو کارگاه (PWA) روی گوشی یا تبلت"
        className={`${getButtonStyles()} ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5 text-current shrink-0" />
        <span>{isIOS ? 'نصب در آیفون / آیپد' : 'نصب مستقیم برنامه'}</span>
        <Download className="w-3 h-3 text-current opacity-70 shrink-0" />
      </button>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4 text-right"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">نصب برنامه در آیفون (iOS)</h3>
                  <p className="text-[11px] text-slate-500">بدون نیاز به App Store یا سیب‌اپ</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  ۱
                </span>
                <p>
                  در پایین صفحه مرورگر Safari روی دکمه{' '}
                  <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    <Share2 className="w-3 h-3 text-blue-500" /> Share (اشتراک)
                  </span>{' '}
                  بزنید.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  ۲
                </span>
                <p>
                  در منوی باز شده به پایین اسکرول کنید و روی گزینه{' '}
                  <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    <PlusSquare className="w-3 h-3 text-slate-700" /> Add to Home Screen
                  </span>{' '}
                  (افزودن به صفحه اصلی) بزنید.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  ۳
                </span>
                <p>
                  در گوشه بالای صفحه دکمه <strong>Add</strong> را بزنید. آیکون اختصاصی کارگاه به صفحه
                  گوشی شما افزوده می‌شود و نوتیفیکیشن و آلارم‌ها بدون نیاز به باز بودن مرورگر عمل خواهند کرد!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};
