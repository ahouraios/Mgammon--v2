import React, { useState } from 'react';
import {
  Smartphone,
  Apple,
  Share2,
  PlusSquare,
  Check,
  Copy,
  ExternalLink,
  X,
  Users,
  ShieldCheck,
  WifiOff,
  Sparkles,
  Download
} from 'lucide-react';

interface MobileInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'ios' | 'android' | 'share';
}

export const MobileInstallGuideModal: React.FC<MobileInstallGuideModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'ios',
}) => {
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'share'>(defaultTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const portalUrl = `${currentUrl}/?view=portal`;

  const inviteMessage = `همکار گرامی سامانه کارگاهی M.GAMMON
جهت ثبت ورود/خروج، مشاهده مرخصی‌ها، کارکرد و هشدارهای کارگاه، لینک زیر را در گوشی خود باز کرده و به صفحه اصلی (Add to Home Screen) اضافه نمایید:
${portalUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyInviteText = () => {
    navigator.clipboard.writeText(inviteMessage);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'سامانه کارگاهی M.GAMMON',
          text: inviteMessage,
          url: portalUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyInviteText();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden text-right flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">راهنمای نصب موبایل و استقرار پرسنل</h3>
              <p className="text-xs text-indigo-200">سازگار با آیفون (iOS) و اندروید (Android)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'ios'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>آیفون (iOS)</span>
          </button>
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'android'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>اندروید (Android)</span>
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTab === 'share'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>ارسال به پرسنل (۱۰ نفر)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {activeTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 leading-relaxed">
                <strong>نکته ویژه کاربران گوشی‌های اپل:</strong>
                <p className="mt-1 text-[11px] text-amber-800">
                  سیستم‌عامل iOS بدون نیاز به سیب‌اپ یا پرداخت هزینه App Store، امکان نصب مستقیم برنامه از طریق مرورگر اصلی <strong>Safari</strong> را فراهم ساخته است.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    ۱
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">باز کردن در مرورگر Safari</h4>
                    <p className="text-slate-500 mt-0.5">
                      لینک سامانه را حتماً داخل مرورگر پیش‌فرض آیفون یعنی <strong>Safari</strong> باز کنید (اگر از طریق پیام‌رسان‌ها مانند ایتا یا تلگرام لینک را باز کرده‌اید، از منوی بالا گزینه Open in Safari را بزنید).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    ۲
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">لمس دکمه اشتراک‌گذاری (Share)</h4>
                    <p className="text-slate-500 mt-0.5">
                      در نوار پایین مرورگر سافاری روی آیکون مربع با فلش رو به بالا{' '}
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-300">
                        <Share2 className="w-3 h-3 text-blue-600" /> Share
                      </span>{' '}
                      بزنید.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    ۳
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">انتخاب Add to Home Screen</h4>
                    <p className="text-slate-500 mt-0.5">
                      در لیست گزینه‌ها به پایین بیایید و روی{' '}
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-300">
                        <PlusSquare className="w-3 h-3 text-slate-700" /> Add to Home Screen
                      </span>{' '}
                      (افزودن به صفحه اصلی) کلیک کنید.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    ۴
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">تأیید نهایی و ثبت در آیفون</h4>
                    <p className="text-slate-500 mt-0.5">
                      در گوشه بالا دکمه <strong>Add</strong> را بزنید. آیکون اختصاصی کارگاه M.GAMMON در صفحه اصلی آیفون ایجاد شده و برنامه به‌صورت تمام‌صفحه و با کارایی فوق‌العاده سریع اجرا خواهد شد.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 leading-relaxed">
                <strong>سازگاری کامل با اندروید (PWA و فایل نصبی APK):</strong>
                <p className="mt-1 text-[11px] text-emerald-800">
                  در گوشی‌های اندروید می‌توانید برنامه را در ۱ ثانیه از طریق مرورگر به شکل اپلیکیشن نصب کنید، یا در صورت تمایل فایل APK اختصاصی ایجاد نمایید.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
                      A
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">روش ۱: نصب سریع از مرورگر Chrome</h4>
                  </div>
                  <p className="text-slate-600 text-xs">
                    هنگام باز کردن برنامه در گوگل کروم، روی دکمه <strong>«نصب مستقیم برنامه»</strong> در بالای صفحه بزنید. در صورتی که دکمه فعال نبود، روی منوی ۳ نقطه در گوشه بالا سمت راست کروم زده و گزینه <strong>«افزودن به صفحه اصلی» (Add to Home screen)</strong> یا <strong>«نصب برنامه»</strong> را انتخاب کنید.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
                      B
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm">روش ۲: ساخت فایل خروجی APK با کدهای فعلی</h4>
                  </div>
                  <p className="text-slate-600 text-xs">
                    پروژه دارای تنظیمات رسمی <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">capacitor.config.json</code> است. با اجرای دستور:
                  </p>
                  <pre className="bg-slate-900 text-indigo-300 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto text-left" dir="ltr">
npx cap add android
npx cap open android</pre>
                  <p className="text-[11px] text-slate-500">
                    بدون نیاز به حتی یک خط تغییر در منطق حقوق و دستمزد، یک خروجی فایل نصبی APK مستقل در محیط Android Studio تولید می‌شود.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'share' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-950">
                <div className="flex items-center gap-2 font-bold text-indigo-900 mb-1">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>راه‌اندازی برای ۱۰ پرسنل کارگاه</span>
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  پرسنل می‌توانند با تلفن همراه شخصی (چه آیفون و چه اندروید) وارد پرتال اختصاصی خود شوند. برای راحتی کار، لینک اختصاصی زیر را برای آنها ارسال کنید:
                </p>
              </div>

              {/* Direct Portal Link */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">لینک مستقیم پرتال پرسنلی:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={portalUrl}
                    className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-slate-600 text-left"
                    dir="ltr"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>
              </div>

              {/* Pre-formatted Message for Messengers */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">متن آماده پیام جهت ارسال به پرسنل در پیام‌رسان‌ها:</label>
                <textarea
                  readOnly
                  rows={4}
                  value={inviteMessage}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-slate-700 leading-relaxed resize-none"
                />
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleCopyInviteText}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-900 transition"
                  >
                    {copiedText ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedText ? 'متن پیام کپی شد' : 'کپی متن پیام'}</span>
                  </button>
                  <button
                    onClick={handleNativeShare}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>ارسال مستقیم</span>
                  </button>
                </div>
              </div>

              {/* Security & Offline note */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] text-slate-700">دسترسی امن با شماره پرسنلی</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-100 flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] text-slate-700">پشتیبانی کامل از حالت آفلاین</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>سامانه به صورت خودکار تغییرات و آپدیت‌ها را روی گوشی‌ها همگام می‌کند.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
