import React from 'react';
import { Bell, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { WorkshopAlarmCard } from '../dashboard/WorkshopAlarmCard';
import { CompanySettings, Employee, User } from '../../types';
import { NavTab } from '../common/Sidebar';

interface AlarmsViewProps {
  settings: CompanySettings;
  employees: Employee[];
  currentUser?: User | null;
  onNavigate?: (tab: NavTab) => void;
  onSettingsUpdate?: (updated: CompanySettings) => void;
}

export const AlarmsView: React.FC<AlarmsViewProps> = ({
  settings,
  employees,
  currentUser,
  onNavigate,
  onSettingsUpdate
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-amber-600 via-amber-500 to-amber-600 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 border border-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>سامانه صوتی و اعلانات کارگاه</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/20 text-amber-100 text-[11px] font-bold">
                M.GAMMON Smart Chimes
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 animate-bounce text-amber-200 shrink-0" />
              <span>مدیریت زنگ‌ها و آلارم هوشمند کارگاه</span>
            </h1>

            <p className="text-xs sm:text-sm text-amber-100/90 max-w-2xl leading-relaxed">
              پخش زنده زنگ‌های کارگاهی در تلفن همراه پرسنل، زمان‌بندی زنگ صبحانه و ناهار، هشدارهای فوری و پیگیری وضعیت رویت نیروها
            </p>
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="self-start sm:self-center px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/20 backdrop-blur-xs shadow-xs"
            >
              <span>بازگشت به پیشخوان</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {/* Main Alarms Management Section */}
      <WorkshopAlarmCard
        settings={settings}
        employees={employees}
        onSettingsUpdate={onSettingsUpdate}
      />
    </div>
  );
};
