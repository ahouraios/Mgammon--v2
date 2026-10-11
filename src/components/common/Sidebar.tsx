import React from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  QrCode,
  CalendarDays,
  PlaneTakeoff,
  Wallet,
  CreditCard,
  BarChart3,
  Settings,
  UserCheck,
  MessageSquare,
  ChevronLeft,
  Printer,
  Camera,
  LogOut,
  Bell,
  Receipt,
  ClipboardList
} from 'lucide-react';
import { Role } from '../../types';
import { DeveloperBadge } from './DeveloperBadge';

export type NavTab =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'work-reports'
  | 'qr-kiosk'
  | 'schedules'
  | 'alarms'
  | 'leaves'
  | 'advances'
  | 'messages'
  | 'payroll'
  | 'financial-reminders'
  | 'reports'
  | 'employee-portal'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  role?: Role;
  currentRole?: Role;
  pendingLeavesCount: number;
  pendingAdvancesCount: number;
  pendingFinancialCount?: number;
  pendingReportsCount?: number;
  isFinanceManager?: boolean;
  onLogout?: () => void;
}

interface NavGroup {
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  role,
  currentRole,
  pendingLeavesCount,
  pendingAdvancesCount,
  pendingFinancialCount = 0,
  pendingReportsCount = 0,
  isFinanceManager = false,
  onLogout,
}) => {
  const activeRole = currentRole || role || 'ADMIN';

  const getNavGroups = (): NavGroup[] => {
    if (activeRole === 'EMPLOYEE') {
      const groups: NavGroup[] = [
        {
          title: 'میز کار پرسنلی',
          items: [
            { id: 'employee-portal', label: 'میز کار و تردد من', icon: UserCheck, count: 0 },
            { id: 'attendance', label: 'ثبت تردد با دوربین', icon: Camera, count: 0 },
            { id: 'work-reports', label: 'گزارش‌های کار روزانه', icon: ClipboardList, count: 0 },
          ]
        },
        {
          title: 'درخواست‌ها و مالی',
          items: [
            { id: 'leaves', label: 'درخواست‌های مرخصی', icon: PlaneTakeoff, count: 0 },
            { id: 'advances', label: 'درخواست مساعده', icon: Wallet, count: 0 },
            { id: 'payroll', label: 'فیش‌های حقوقی من', icon: CreditCard, count: 0 },
            { id: 'qr-kiosk', label: 'پوستر بارکد کارگاه', icon: Printer, count: 0 },
          ]
        }
      ];
      if (isFinanceManager) {
        groups[1].items.push({
          id: 'financial-reminders',
          label: 'صورتحساب و چک‌ها',
          icon: Receipt,
          count: pendingFinancialCount
        });
      }
      return groups;
    }

    if (activeRole === 'MANAGER') {
      return [
        {
          title: 'پیشخوان و فعالیت‌ها',
          items: [
            { id: 'dashboard', label: 'داشبورد مدیریتی', icon: LayoutDashboard, count: 0 },
            { id: 'work-reports', label: 'گزارش‌های کار روزانه', icon: ClipboardList, count: pendingReportsCount },
            { id: 'employee-portal', label: 'میز کار پرسنلی من', icon: UserCheck, count: 0 },
          ]
        },
        {
          title: 'نیروی انسانی و تردد',
          items: [
            { id: 'employees', label: 'پرونده پرسنل', icon: Users, count: 0 },
            { id: 'attendance', label: 'گزارش ترددها', icon: Clock, count: 0 },
            { id: 'alarms', label: 'زنگ و آلارم سالن', icon: Bell, count: 0 },
            { id: 'qr-kiosk', label: 'پوستر بارکد کارگاه', icon: Printer, count: 0 },
          ]
        },
        {
          title: 'امور مالی و درخواست‌ها',
          items: [
            { id: 'leaves', label: 'بررسی مرخصی‌ها', icon: PlaneTakeoff, count: pendingLeavesCount },
            { id: 'advances', label: 'بررسی مساعده‌ها', icon: Wallet, count: pendingAdvancesCount },
            { id: 'payroll', label: 'حقوق و دستمزد', icon: CreditCard, count: 0 },
            { id: 'financial-reminders', label: 'صورتحساب و چک‌ها', icon: Receipt, count: pendingFinancialCount },
          ]
        },
        {
          title: 'گزارشات و تنظیمات',
          items: [
            { id: 'messages', label: 'اطلاع‌رسانی و پیامک', icon: MessageSquare, count: 0 },
            { id: 'reports', label: 'گزارشات آماری', icon: BarChart3, count: 0 },
            { id: 'settings', label: 'تنظیمات و قوانین', icon: Settings, count: 0 },
          ]
        }
      ];
    }

    // ADMIN
    return [
      {
        title: 'مدیریت و شفافیت',
        items: [
          { id: 'dashboard', label: 'داشبورد جامع کارگاه', icon: LayoutDashboard, count: 0 },
          { id: 'work-reports', label: 'گزارش‌های کار روزانه', icon: ClipboardList, count: pendingReportsCount },
        ]
      },
      {
        title: 'نیروی انسانی و عملیات',
        items: [
          { id: 'employees', label: 'مدیریت پرسنل و سطوح', icon: Users, count: 0 },
          { id: 'attendance', label: 'مدیریت و مانیتورینگ تردد', icon: Clock, count: 0 },
          { id: 'schedules', label: 'شیفت‌ها و تقویم کاری', icon: CalendarDays, count: 0 },
          { id: 'alarms', label: 'زنگ و آلارم هوشمند سالن', icon: Bell, count: 0 },
          { id: 'qr-kiosk', label: 'چاپ پوستر بارکد کارگاه', icon: Printer, count: 0 },
        ]
      },
      {
        title: 'حقوق و امور مالی',
        items: [
          { id: 'payroll', label: 'محاسبه حقوق و دستمزد', icon: CreditCard, count: 0 },
          { id: 'advances', label: 'مدیریت مساعده‌ها', icon: Wallet, count: pendingAdvancesCount },
          { id: 'leaves', label: 'مدیریت مرخصی‌ها', icon: PlaneTakeoff, count: pendingLeavesCount },
          { id: 'financial-reminders', label: 'صورتحساب و چک‌ها', icon: Receipt, count: pendingFinancialCount },
        ]
      },
      {
        title: 'سامانه و گزارشات',
        items: [
          { id: 'messages', label: 'اطلاع‌رسانی و پیامک', icon: MessageSquare, count: 0 },
          { id: 'reports', label: 'گزارشات و خروجی اکسل', icon: BarChart3, count: 0 },
          { id: 'settings', label: 'تنظیمات و رهگیری وقایع', icon: Settings, count: 0 },
        ]
      }
    ];
  };

  const navGroups = getNavGroups();

  return (
    <aside className="w-64 shrink-0 bg-white/90 backdrop-blur-md border border-slate-200/80 min-h-[calc(100vh-100px)] p-3.5 flex flex-col justify-between hidden md:flex rounded-3xl shadow-xs">
      <div className="space-y-4 overflow-y-auto pr-0.5">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {group.title}
              </span>
            </div>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-teal-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.count > 0 ? (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white font-mono shadow-2xs">
                        {item.count}
                      </span>
                    ) : isActive ? (
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Profile / Branding & Logout */}
      <div className="pt-3 border-t border-slate-100 space-y-2 mt-2">
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/60 transition-colors cursor-pointer text-right"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>خروج از حساب</span>
            </div>
            <ChevronLeft className="w-3 h-3 text-rose-400" />
          </button>
        )}

        <div className="px-2 py-1.5 bg-slate-50/70 rounded-xl border border-slate-200/50 text-center">
          <div className="text-[11px] text-slate-800 font-bold tracking-wider">
            M.GAMMON
          </div>
          <div className="text-[9px] text-slate-400 block mt-0.5">
            مشهد، توس ۱۴۲، حسین زاده ۸
          </div>
        </div>
        <DeveloperBadge variant="menu" />
      </div>
    </aside>
  );
};
