import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Send,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  Users,
  Building2,
  Sparkles,
  Calendar,
  AlertTriangle,
  RotateCw,
  Trash2,
  Settings2,
  Check,
  Radio,
  Flame
} from 'lucide-react';
import { WorkshopAlarm, AlarmRingtone, AlarmType, AlarmTargetType, Employee, CompanySettings } from '../../types';
import { StorageService } from '../../services/storage';
import { playAlarmSound, stopAlarmSound } from '../../utils/soundAlerts';
import { PWAAlarmService } from '../../utils/pwaAlarmService';
import { getTodayShamsi } from '../../utils/dateUtils';

interface WorkshopAlarmCardProps {
  settings: CompanySettings;
  employees: Employee[];
  onSettingsUpdate?: (updated: CompanySettings) => void;
}

const PRESET_MESSAGES = [
  { title: 'سلام صبح بخیر ☀️', text: 'سلام صبح بخیر، بیدار شید و آماده شروع یک روز پرانرژی در کارگاه!' },
  { title: 'وقت صبحانه و چای ☕', text: 'وقت صبحانه و صرف چای کارگاه است (۱۵ دقیقه استراحت). نوش جان!' },
  { title: 'وقت ناهار و نماز 🍽️', text: 'وقت ناهار، نماز و استراحت نیم‌روزی فرارسید. کارگاه موقتاً خاموش و تجدید قوا فرمایید.' },
  { title: 'پایان ساعت کاری 🏁', text: 'پایان ساعت کاری شیفت؛ لطفاً ابزارها را تمیز، جمع‌آوری و خروج خود را ثبت نمایید.' },
  { title: 'جلسه فوری کارگاه 📢', text: 'جلسه فوری کلیه نیروها در محل دفتر کارگاه. لطفاً سریعاً حاضر شوید.' },
  { title: 'یادآوری ثبت تردد ⏰', text: 'یادآوری: لطفاً ثبت ورود یا خروج خود را در سامانه بررسی و نهایی کنید.' },
];

export const WorkshopAlarmCard: React.FC<WorkshopAlarmCardProps> = ({
  settings,
  employees,
  onSettingsUpdate
}) => {
  const [alarms, setAlarms] = useState<WorkshopAlarm[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState<AlarmRingtone | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [alarmTitle, setAlarmTitle] = useState('');
  const [alarmMessage, setAlarmMessage] = useState('');
  const [alarmType, setAlarmType] = useState<AlarmType>('INSTANT');
  const [targetType, setTargetType] = useState<AlarmTargetType>('ALL');
  const [targetWorkshopId, setTargetWorkshopId] = useState<string>(settings.workshops?.[0]?.id || '');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(getTodayShamsi());
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [ringtone, setRingtone] = useState<AlarmRingtone>('BELL');
  const [sendSms, setSendSms] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Proposal 4: Shift Sync Alarm Settings
  const [isShiftSyncOpen, setIsShiftSyncOpen] = useState(false);
  const [autoShiftEnabled, setAutoShiftEnabled] = useState(settings.autoShiftAlarmsEnabled ?? true);
  const [breakfastTime, setBreakfastTime] = useState(settings.autoBreakfastAlarmTime || '09:30');
  const [lunchTime, setLunchTime] = useState(settings.autoLunchAlarmTime || '13:00');
  const [shiftEndTime, setShiftEndTime] = useState(settings.autoShiftEndAlarmTime || '16:00');
  const [isSavingShiftSettings, setIsSavingShiftSettings] = useState(false);

  // Load Alarms
  const loadAlarms = async () => {
    setIsLoading(true);
    try {
      const data = await StorageService.fetchAlarmsAsync();
      setAlarms(data);
      PWAAlarmService.syncAlarms(data);
    } catch {
      const fallback = StorageService.getAlarmsRaw();
      setAlarms(fallback);
      PWAAlarmService.syncAlarms(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlarms();
    const interval = setInterval(loadAlarms, 10000);
    return () => clearInterval(interval);
  }, []);

  // Play test sound
  const handleTestSound = (tone: AlarmRingtone) => {
    if (isPlayingTest === tone) {
      stopAlarmSound();
      setIsPlayingTest(null);
    } else {
      stopAlarmSound();
      playAlarmSound(tone, false);
      setIsPlayingTest(tone);
      setTimeout(() => {
        setIsPlayingTest(null);
      }, 4000);
    }
  };

  // Quick preset trigger
  const handleQuickTrigger = async (preset: { title: string; text: string; ringtone: AlarmRingtone }) => {
    setActionMessage(null);
    setIsLoading(true);
    try {
      const res = await StorageService.createAlarmAsync({
        title: preset.title,
        message: preset.text,
        type: 'INSTANT',
        targetType: 'ALL',
        ringtone: preset.ringtone,
        sendSms: false,
        isActive: true
      });
      if (res.success) {
        setActionMessage({ text: `زنگ «${preset.title}» بلافاصله در گوشی پرسنل کارگاه به صدا درآمد!` });
        playAlarmSound(preset.ringtone, false);
        setTimeout(stopAlarmSound, 3000);
        await loadAlarms();
      } else {
        setActionMessage({ text: res.message || 'خطا در به صدا درآوردن زنگ', isError: true });
      }
    } catch (e: any) {
      setActionMessage({ text: e.message || 'خطا در ارتباط با سرور', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit new alarm
  const handleCreateAlarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alarmTitle.trim() || !alarmMessage.trim()) {
      setActionMessage({ text: 'لطفاً عنوان و متن آلارم را وارد فرمایید.', isError: true });
      return;
    }

    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await StorageService.createAlarmAsync({
        title: alarmTitle.trim(),
        message: alarmMessage.trim(),
        type: alarmType,
        targetType,
        targetWorkshopId: targetType === 'WORKSHOP' ? targetWorkshopId : undefined,
        targetEmployeeIds: targetType === 'CUSTOM' ? selectedEmployeeIds : undefined,
        scheduledDate: alarmType === 'SCHEDULED' ? scheduledDate : undefined,
        scheduledTime: alarmType !== 'INSTANT' ? scheduledTime : undefined,
        ringtone,
        sendSms,
        isActive: true
      });

      if (res.success) {
        setActionMessage({ text: res.message });
        setIsFormOpen(false);
        setAlarmTitle('');
        setAlarmMessage('');
        await loadAlarms();
      } else {
        setActionMessage({ text: res.message || 'خطا در ثبت آلارم', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'خطای شبکه', isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger existing alarm now
  const handleTriggerAlarm = async (alarmId: string) => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await StorageService.triggerAlarmAsync(alarmId);
      if (res.success) {
        setActionMessage({ text: res.message });
        const a = alarms.find(x => x.id === alarmId);
        if (a) playAlarmSound(a.ringtone, false);
        setTimeout(stopAlarmSound, 2500);
        await loadAlarms();
      }
    } catch (e: any) {
      setActionMessage({ text: e.message, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle active
  const handleToggleAlarm = async (alarmId: string) => {
    try {
      await StorageService.toggleAlarmAsync(alarmId);
      await loadAlarms();
    } catch {}
  };

  // Delete
  const handleDeleteAlarm = async (alarmId: string) => {
    if (!window.confirm('آیا از حذف این آلارم اطمینان دارید؟')) return;
    try {
      await StorageService.deleteAlarmAsync(alarmId);
      await loadAlarms();
    } catch {}
  };

  // Save Shift Sync Settings (Proposal 4)
  const handleSaveShiftSync = async () => {
    setIsSavingShiftSettings(true);
    try {
      const updated: CompanySettings = {
        ...settings,
        autoShiftAlarmsEnabled: autoShiftEnabled,
        autoBreakfastAlarmTime: breakfastTime,
        autoLunchAlarmTime: lunchTime,
        autoShiftEndAlarmTime: shiftEndTime
      };
      await StorageService.saveSettingsAsync(updated);
      if (onSettingsUpdate) onSettingsUpdate(updated);
      setActionMessage({ text: 'تنظیمات همگام‌سازی زنگ‌های شیفت با موفقیت ذخیره شد.' });
      setIsShiftSyncOpen(false);
    } catch (e: any) {
      setActionMessage({ text: e.message || 'خطا در ذخیره تنظیمات شیفت', isError: true });
    } finally {
      setIsSavingShiftSettings(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>سامانه زنگ و آلارم هوشمند کارگاه</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                پخش زنگ در گوشی نیروها
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              به صدا درآوردن زنگ فوری، زمان‌بندی زنگ صبحانه و ناهار، و فراخوان پرسنل کارگاه
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShiftSyncOpen(!isShiftSyncOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isShiftSyncOpen
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
            title="همگام‌سازی زنگ‌ها با شیفت کاری (پیشنهاد ۴)"
          >
            <Settings2 className="w-4 h-4" />
            <span>تنظیم زنگ‌های شیفت</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>{isFormOpen ? 'بستن فرم' : 'تنظیم آلارم جدید'}</span>
          </button>
        </div>
      </div>

      {/* Action Message Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            actionMessage.isError
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs underline cursor-pointer opacity-70 hover:opacity-100"
          >
            بستن
          </button>
        </div>
      )}

      {/* QUICK PRESET BUTTONS (یک‌کلیکی) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>زنگ‌های سریع کارگاه (یک‌کلیکی فوری):</span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">کلیک کنید تا بلافاصله در گوشی تمام نیروها زنگ بزند</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickTrigger({ title: 'سلام صبح بخیر، بیدار شید ☀️', text: 'سلام صبح بخیر، بیدار شید و آماده شروع روز کاری در کارگاه!', ringtone: 'GENTLE' })}
            disabled={isLoading}
            className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-950 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <span className="text-xl">☀️</span>
            <span>صبح بخیر / بیدارباش</span>
            <span className="text-[10px] font-normal text-amber-700">زنگ ملایم</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTrigger({ title: 'وقت صبحانه و چای ☕', text: 'وقت صرف چای و صبحانه کارگاه است (۱۵ دقیقه استراحت). نوش جان!', ringtone: 'BELL' })}
            disabled={isLoading}
            className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200/80 text-sky-950 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <span className="text-xl">☕</span>
            <span>زنگ صبحانه و چای</span>
            <span className="text-[10px] font-normal text-sky-700">زنگ کلاسیک کارگاه</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTrigger({ title: 'وقت ناهار و نماز 🍽️', text: 'وقت ناهار، نماز و استراحت نیم‌روزی فرارسید. کارگاه موقتاً خاموش و تجدید قوا فرمایید.', ringtone: 'BELL' })}
            disabled={isLoading}
            className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-950 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <span className="text-xl">🍽️</span>
            <span>زنگ ناهار و نماز</span>
            <span className="text-[10px] font-normal text-emerald-700">زنگ کلاسیک کارگاه</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickTrigger({ title: 'پایان ساعت کاری شیفت 🏁', text: 'پایان ساعت کاری شیفت؛ لطفاً ابزارها را جمع‌آوری کرده و خروج خود را ثبت نمایید.', ringtone: 'SIREN' })}
            disabled={isLoading}
            className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-rose-950 font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
          >
            <span className="text-xl">🏁</span>
            <span>پایان کار و نظافت</span>
            <span className="text-[10px] font-normal text-rose-700">هشدار دو مرحله‌ای</span>
          </button>
        </div>
      </div>

      {/* PROPOSAL 4: SHIFT SYNC SETTINGS MODAL / PANEL */}
      {isShiftSyncOpen && (
        <div className="bg-amber-50/50 p-4 sm:p-5 rounded-2xl border border-amber-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-amber-700" />
              <h3 className="text-sm font-bold text-amber-950">
                پیشنهاد ۴: همگام‌سازی خودکار و انتخابی زنگ‌ها با شیفت کاری
              </h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoShiftEnabled}
                onChange={(e) => setAutoShiftEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              <span className="mr-2 text-xs font-bold text-slate-800">
                {autoShiftEnabled ? 'فعال (خودکار)' : 'غیرفعال (دستی)'}
              </span>
            </label>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            در صورت فعال بودن این بخش، سرور مرکزی در ساعات تعیین‌شده زیر به صورت خودکار زنگ کارگاه را در تلفن همراه پرسنل به صدا درمی‌آورد. شما می‌توانید ساعات را مطابق با روال کارگاه خود تغییر دهید:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">ساعت زنگ صبحانه:</span>
              <input
                type="time"
                value={breakfastTime}
                onChange={(e) => setBreakfastTime(e.target.value)}
                disabled={!autoShiftEnabled}
                className="w-full text-center font-mono font-bold text-sm bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">ساعت زنگ ناهار و نماز:</span>
              <input
                type="time"
                value={lunchTime}
                onChange={(e) => setLunchTime(e.target.value)}
                disabled={!autoShiftEnabled}
                className="w-full text-center font-mono font-bold text-sm bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">ساعت زنگ پایان کار:</span>
              <input
                type="time"
                value={shiftEndTime}
                onChange={(e) => setShiftEndTime(e.target.value)}
                disabled={!autoShiftEnabled}
                className="w-full text-center font-mono font-bold text-sm bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsShiftSyncOpen(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSaveShiftSync}
              disabled={isSavingShiftSettings}
              className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSavingShiftSettings ? 'در حال ذخیره...' : 'ذخیره تنظیمات شیفت'}</span>
            </button>
          </div>
        </div>
      )}

      {/* NEW ALARM FORM */}
      {isFormOpen && (
        <form onSubmit={handleCreateAlarm} className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <span>تنظیم و برنامه‌ریزی آلارم جدید</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              بستن ✕
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">انتخاب از بین متن‌های آماده:</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_MESSAGES.map((pm, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAlarmTitle(pm.title);
                    setAlarmMessage(pm.text);
                  }}
                  className="px-2.5 py-1 text-xs rounded-xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 transition-colors cursor-pointer"
                >
                  {pm.title}
                </button>
              ))}
            </div>
          </div>

          {/* Title and Message */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-1">
              <label className="text-xs font-bold text-slate-700">عنوان زنگ / آلارم:</label>
              <input
                type="text"
                required
                value={alarmTitle}
                onChange={(e) => setAlarmTitle(e.target.value)}
                placeholder="مثلاً: وقت ناهاره، یا جلسه کارگاه"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700">متن پیام نمایشی به نیروها:</label>
              <input
                type="text"
                required
                value={alarmMessage}
                onChange={(e) => setAlarmMessage(e.target.value)}
                placeholder="متنی که هنگام زنگ خوردن روی گوشی نیروها نمایش داده می‌شود..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Timing, Type, and Target */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Alarm Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">نحوه اجرای آلارم:</label>
              <select
                value={alarmType}
                onChange={(e) => setAlarmType(e.target.value as AlarmType)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden"
              >
                <option value="INSTANT">فوری (هم‌اکنون زنگ بزند)</option>
                <option value="SCHEDULED">زمان‌بندی‌شده (تاریخ و ساعت خاص)</option>
                <option value="RECURRING">تکرارشونده روزانه (هر روز در ساعت مشخص)</option>
              </select>
            </div>

            {/* Target Audience */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مخاطبان آلارم:</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as AlarmTargetType)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden"
              >
                <option value="ALL">همه پرسنل و کارگاه‌ها</option>
                <option value="WORKSHOP">یک کارگاه مشخص</option>
                <option value="CUSTOM">انتخاب یک یا چند نیروی خاص</option>
              </select>
            </div>

            {/* Ringtone */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">صدای زنگ (ملودی):</label>
                <button
                  type="button"
                  onClick={() => handleTestSound(ringtone)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {isPlayingTest === ringtone ? <VolumeX className="w-3 h-3 text-rose-600" /> : <Volume2 className="w-3 h-3" />}
                  <span>{isPlayingTest === ringtone ? 'قطع صدا' : 'تست صدا'}</span>
                </button>
              </div>
              <select
                value={ringtone}
                onChange={(e) => setRingtone(e.target.value as AlarmRingtone)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden"
              >
                <option value="BELL">زنگ کلاسیک کارگاه (کارخانه‌ای / دو مرحله‌ای)</option>
                <option value="GENTLE">ملودی ملایم صبحگاهی (چنگ هارپ)</option>
                <option value="SIREN">آژیر صنعتی / هشدار جدی</option>
              </select>
            </div>
          </div>

          {/* Conditional: Workshop Target */}
          {targetType === 'WORKSHOP' && (
            <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700">انتخاب کارگاه:</label>
              <select
                value={targetWorkshopId}
                onChange={(e) => setTargetWorkshopId(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
              >
                {settings.workshops?.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.address})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional: Custom Employees Target */}
          {targetType === 'CUSTOM' && (
            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
              <label className="text-xs font-bold text-slate-700">انتخاب پرسنل مورد نظر (چک‌باکس):</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                        } else {
                          setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== emp.id));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{emp.firstName} {emp.lastName}</span>
                    <span className="text-[10px] text-slate-400">({emp.position || 'نیرو'})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Conditional: Scheduled Date & Time */}
          {alarmType !== 'INSTANT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
              {alarmType === 'SCHEDULED' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">تاریخ اجرا (شمسی):</label>
                  <input
                    type="text"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    placeholder="1405/07/15"
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono text-center"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ساعت اجرا:</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono text-center"
                />
              </div>
            </div>
          )}

          {/* SMS Toggle Option */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={sendSms}
                onChange={(e) => setSendSms(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>ارسال همزمان پیامک (SMS) به شماره موبایل پرسنل هدف</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isLoading ? 'در حال ثبت...' : alarmType === 'INSTANT' ? 'پخش فوری زنگ' : 'ثبت زمان‌بندی'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ALARMS LIST & HISTORY */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>فهرست زنگ‌ها و آلارم‌های ثبت‌شده ({alarms.length}):</span>
          </span>
          <button
            type="button"
            onClick={loadAlarms}
            disabled={isLoading}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>
        </div>

        {alarms.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
            هنوز آلارمی ثبت نشده است. از دکمه‌های بالا برای به صدا درآوردن زنگ فوری استفاده کنید.
          </div>
        ) : (
          <div className="space-y-2">
            {alarms.map((alarm) => {
              const acks = alarm.acknowledgements || [];
              return (
                <div
                  key={alarm.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    alarm.isActive
                      ? 'bg-white border-slate-200/90 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">{alarm.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alarm.type === 'INSTANT'
                            ? 'bg-rose-100 text-rose-800'
                            : alarm.type === 'RECURRING'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {alarm.type === 'INSTANT' ? 'فوری' : alarm.type === 'RECURRING' ? `روزانه (${alarm.scheduledTime})` : `زمان‌بندی (${alarm.scheduledDate} ${alarm.scheduledTime})`}
                      </span>

                      {alarm.targetType === 'ALL' ? (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          همه پرسنل
                        </span>
                      ) : alarm.targetType === 'WORKSHOP' ? (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          کارگاه
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {alarm.targetEmployeeIds?.length || 0} نفر انتخابی
                        </span>
                      )}

                      {alarm.sendSms && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                          SMS
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{alarm.message}</p>

                    {/* Acknowledgements Status */}
                    <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>تایید رویت و قطع زنگ توسط:</span>
                        <strong className="text-slate-800 font-bold">{acks.length} نفر</strong>
                      </span>
                      {acks.length > 0 && (
                        <span className="text-slate-400 truncate max-w-xs sm:max-w-md">
                          ({acks.map((a) => a.employeeName).join('، ')})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTestSound(alarm.ringtone)}
                      title="پخش آزمایشی صدا در این سیستم"
                      className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {isPlayingTest === alarm.ringtone ? (
                        <VolumeX className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerAlarm(alarm.id)}
                      title="به صدا درآوردن زنگ هم‌اکنون در گوشی نیروها"
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>پخش فوری</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleAlarm(alarm.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                        alarm.isActive
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      {alarm.isActive ? 'غیرفعال' : 'فعال‌سازی'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAlarm(alarm.id)}
                      title="حذف آلارم"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
