import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  ClockAlert,
  PlaneTakeoff,
  Timer,
  AlertTriangle,
  QrCode,
  CalendarCheck,
  Camera,
  ChevronLeft,
  FileText,
  Clock,
  Briefcase,
  Headphones,
  CheckCircle2,
  Sparkles,
  Receipt,
  Plus,
  PlusCircle,
  CreditCard,
  FileSpreadsheet,
  Settings as SettingsIcon,
  DollarSign,
  X,
  Wallet,
  UserPlus,
  Check,
  XCircle,
  AlertCircle,
  ExternalLink,
  Shield,
  Activity,
  FileCheck,
  History,
  MessageSquare,
  ArrowUpRight,
  Database,
  Building2,
  Calendar,
  Coins,
  Gift,
  TrendingUp,
  TrendingDown,
  Bell,
  BarChart3,
  Home,
  CheckCheck,
  CalendarClock,
  ClipboardList,
  Banknote,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  LeaveType,
  AdvanceRequest,
  SalaryRecord,
  User,
  WorkerExpense,
  AuditLog,
  ManagerAdjustmentType,
  CompanySettings,
  HomeworkTask,
  FinancialReminder,
} from '../../types';
import {
  formatNumberFa,
  getTodayShamsiDetailed,
  formatCurrencyTomans,
  PERSIAN_WEEKDAYS,
  gregorianToJalali,
  toEnglishDigits,
  getTodayShamsi,
} from '../../utils/dateUtils';
import { NavTab } from '../common/Sidebar';
import { StorageService } from '../../services/storage';

interface DashboardViewProps {
  currentUser?: User;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  advances: AdvanceRequest[];
  salaries: SalaryRecord[];
  auditLogs?: AuditLog[];
  onNavigate: (tab: NavTab) => void;
  onQuickClockIn?: () => void;
  onOpenQuickMiscPayment?: () => void;
  onRefresh?: () => void;
}

type AlertFilterTab = 'ALL' | 'FINANCIAL' | 'LEAVES' | 'ATTENDANCE';

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  employees,
  attendance,
  leaves,
  advances,
  salaries,
  auditLogs = [],
  onNavigate,
  onOpenQuickMiscPayment,
  onRefresh,
}) => {
  const shamsi = getTodayShamsiDetailed();
  const [settings, setSettings] = useState<CompanySettings>(() => StorageService.getSettings());
  const [timeStr, setTimeStr] = useState('');
  const [activeAlertTab, setActiveAlertTab] = useState<AlertFilterTab>('ALL');
  const [dashboardTab, setDashboardTab] = useState<'REQUESTS' | 'PRESENCE' | 'WORK_REPORTS' | 'TRENDS' | 'LOGS'>('REQUESTS');
  const [actionFeedback, setActionFeedback] = useState<{ text: string; success: boolean } | null>(null);

  // Quick Action Registration Modal State
  const [isQuickRequestModalOpen, setIsQuickRequestModalOpen] = useState(false);
  const [quickModalTab, setQuickModalTab] = useState<'LEAVE' | 'ADVANCE' | 'EXPENSE' | 'MANUAL_ATT' | 'ADJUSTMENT'>('LEAVE');
  
  // Quick forms states
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || '');
  const [quickLeaveType, setQuickLeaveType] = useState<LeaveType>('EARNED');
  const [quickLeaveDays, setQuickLeaveDays] = useState<number>(1);
  const [quickLeaveReason, setQuickLeaveReason] = useState('');
  
  const [quickAdvanceAmount, setQuickAdvanceAmount] = useState<number | ''>('');
  const [quickAdvanceReason, setQuickAdvanceReason] = useState('');
  
  const [quickExpenseAmount, setQuickExpenseAmount] = useState<number | ''>('');
  const [quickExpenseTitle, setQuickExpenseTitle] = useState('');
  
  const [quickAttIn, setQuickAttIn] = useState('07:00');
  const [quickAttOut, setQuickAttOut] = useState('16:00');
  const [quickAttReason, setQuickAttReason] = useState('');

  const [quickAdjType, setQuickAdjType] = useState<ManagerAdjustmentType>('BONUS');
  const [quickAdjAmount, setQuickAdjAmount] = useState<number | ''>('');
  const [quickAdjTitle, setQuickAdjTitle] = useState('');
  const [quickAdjDesc, setQuickAdjDesc] = useState('');

  // Hero Banner State
  const [bannerUrl, setBannerUrl] = useState<string>(() => {
    return settings.dashboardBannerUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80';
  });
  const [bannerUploadMsg, setBannerUploadMsg] = useState<string | null>(null);

  // Real-time clock ticker
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update selected emp default if list changes
  useEffect(() => {
    if (!selectedEmpId && employees.length > 0) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  // Host Banner Upload Handler
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        alert('حجم تصویر بنر نباید بیشتر از ۸ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        setBannerUploadMsg('در حال آپلود و ذخیره فایل بنر در هاست...');
        try {
          const res = await StorageService.uploadBannerAsync(result);
          if (res.success && res.url) {
            setBannerUrl(res.url);
            setBannerUploadMsg('✓ بنر کارگاه با موفقیت در هاست ذخیره و فعال شد.');
          } else {
            setBannerUrl(result);
            setBannerUploadMsg('بنر سربرگ داشبورد ذخیره شد.');
          }
        } catch {
          setBannerUrl(result);
          setBannerUploadMsg('بنر ذخیره شد.');
        }
        setTimeout(() => setBannerUploadMsg(null), 3500);
      };
      reader.readAsDataURL(file);
    }
  };

  // -------------------------------------------------------------
  // DATA QUERIES & SYSTEM INDICATORS
  // -------------------------------------------------------------
  const totalEmployees = employees.length;
  const todayAttendance = attendance.filter((a) => a.date === shamsi.dateString);
  const presentCount = todayAttendance.filter(
    (a) => a.status === 'PRESENT' || (a.status === 'LATE' && a.checkInTime) || a.status === 'EARLY_LEAVE'
  ).length;
  const lateCount = todayAttendance.filter((a) => a.status === 'LATE' || (a.lateMinutes && a.lateMinutes > 0)).length;
  const totalLateMinutes = todayAttendance.reduce((sum, a) => sum + (a.lateMinutes || 0), 0);
  
  const onLeaveCount = leaves.filter(
    (l) => l.status === 'APPROVED' && l.startDate <= shamsi.dateString && l.endDate >= shamsi.dateString
  ).length;
  const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);

  // Overtime minutes
  const totalOvertimeMinutes = todayAttendance.reduce((acc, curr) => acc + (curr.overtimeMinutes || 0), 0);

  // 1. Pending Financial: Worker Expenses paid from personal cards
  const allExpenses: WorkerExpense[] = StorageService.getAllExpensesRaw();
  const pendingExpenses = allExpenses.filter((e) => e.status === 'PENDING_SETTLEMENT');
  const totalPendingExpenseAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. Pending Financial: Advances
  const pendingAdvances = advances.filter((a) => a.status === 'PENDING');
  const totalPendingAdvanceAmount = pendingAdvances.reduce((sum, a) => sum + a.amount, 0);

  // 3. Pending Financial: Homework & Piecework wages (کار در منزل و کارمزدی)
  const allHomeworkTasks: HomeworkTask[] = StorageService.getAllHomeworkTasksRaw();
  const pendingHomeworkTasks = allHomeworkTasks.filter((t) => t.status === 'PENDING');
  const totalPendingHomeworkWage = pendingHomeworkTasks.reduce((sum, t) => sum + t.totalWage, 0);

  // Total Open Financial Obligations
  const totalPendingFinancialAmount = totalPendingExpenseAmount + totalPendingAdvanceAmount + totalPendingHomeworkWage;

  // 4. Financial Reminders sent by Finance Manager to Senior Admin (صورتحساب‌ها، چک‌های صیادی و اقساط)
  const allFinancialReminders: FinancialReminder[] = StorageService.getFinancialReminders(currentUser);
  const pendingSentFinancialReminders = allFinancialReminders.filter(
    (r) => r.isSentToSeniorAdmin && r.status !== 'PAID'
  );
  const totalPendingSentFinancialAmount = pendingSentFinancialReminders.reduce(
    (sum, r) => sum + (r.amount || 0), 0
  );

  // 5. Pending Leaves
  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');

  // 6. Pending Manual Attendance Punch Requests
  const pendingManualAttendance = attendance.filter((a) => a.approvalStatus === 'PENDING');

  // 7. Open Shifts (Clocked-in without checkout past standard shift hours)
  const notCheckedOutEmployees = todayAttendance.filter(
    (a) => a.checkInTime && !a.checkOutTime
  );

  // Total Urgent Action Items Count
  const totalUrgentCount =
    pendingExpenses.length +
    pendingAdvances.length +
    pendingHomeworkTasks.length +
    pendingLeaves.length +
    pendingManualAttendance.length +
    pendingSentFinancialReminders.length;

  const totalAlertsWithNotCheckedOut = totalUrgentCount + notCheckedOutEmployees.length;

  // Work Reports (گزارش‌های کار روزانه پرسنل و مدیران)
  const allWorkReports = StorageService.getWorkReports(currentUser);
  const todayWorkReports = allWorkReports.filter((r) => r.date === getTodayShamsi());
  const pendingWorkReports = allWorkReports.filter((r) => r.status !== 'ACKNOWLEDGED');

  // -------------------------------------------------------------
  // INLINE APPROVAL / REJECTION HANDLERS
  // -------------------------------------------------------------
  const showFeedback = (text: string, success: boolean = true) => {
    setActionFeedback({ text, success });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleQuickApproveFinancialReminder = (id: string) => {
    StorageService.changeFinancialReminderStatus(id, 'APPROVED', 'تایید پرداخت از طریق داشبورد مدیریت ارشد');
    showFeedback('✓ دستور پرداخت مورد مالی توسط مدیر ارشد تایید شد.');
    onRefresh?.();
  };

  const handleQuickPayFinancialReminder = (id: string) => {
    StorageService.changeFinancialReminderStatus(id, 'PAID', 'تسویه و پرداخت نهایی ثبت شد');
    showFeedback('✓ تسویه و پرداخت چک/قسط با موفقیت ثبت شد.');
    onRefresh?.();
  };

  const handleSettleExpenseNow = (expenseId: string) => {
    StorageService.settleWorkerExpense(
      expenseId,
      currentUser?.name || 'مدیریت کارگاه',
      'تسویه و واریز نقدی از طریق پنل فوری داشبورد'
    );
    showFeedback('✓ فاکتور خرید کارگر با موفقیت تسویه شد و به وضعیت پرداخت نهایی انتقال یافت.');
    onRefresh?.();
  };

  const handleAddExpenseToSalary = (expenseId: string) => {
    StorageService.reviewWorkerExpense(
      expenseId,
      'ADD_TO_SALARY',
      currentUser?.name || 'مدیریت کارگاه',
      'افزودن به حقوق ماه جاری از طریق داشبورد'
    );
    showFeedback('✓ مبلغ فاکتور با موفقیت به سرفصل مطالبات فیش حقوقی ماه جاری پرسنل افزوده شد.');
    onRefresh?.();
  };

  const handleRejectExpense = (expenseId: string) => {
    StorageService.reviewWorkerExpense(
      expenseId,
      'REJECT',
      currentUser?.name || 'مدیریت کارگاه',
      'عدم تایید توسط مدیریت کارگاه'
    );
    showFeedback('درخواست تسویه فاکتور رد شد.', false);
    onRefresh?.();
  };

  const handleApproveAdvance = (advanceId: string) => {
    StorageService.reviewAdvanceRequest(
      advanceId,
      true,
      currentUser?.name || 'مدیریت کارگاه'
    );
    showFeedback('✓ درخواست مساعده تایید شد و سند مالی ثبت گردید.');
    onRefresh?.();
  };

  const handleRejectAdvance = (advanceId: string) => {
    StorageService.reviewAdvanceRequest(
      advanceId,
      false,
      currentUser?.name || 'مدیریت کارگاه',
      'عدم موافقت مدیریت با پرداخت مساعده در این دوره'
    );
    showFeedback('درخواست مساعده رد شد.', false);
    onRefresh?.();
  };

  const handleSettleHomeworkNow = (taskId: string) => {
    StorageService.reviewHomeworkTask(taskId, 'SETTLE_NOW', currentUser?.name || 'مدیریت کارگاه', 'تسویه نقدی فوری از داشبورد');
    showFeedback('✓ دستمزد کار در منزل به صورت نقدی تسویه شد.');
    onRefresh?.();
  };

  const handleAddHomeworkToSalary = (taskId: string) => {
    StorageService.reviewHomeworkTask(taskId, 'ADD_TO_SALARY', currentUser?.name || 'مدیریت کارگاه', 'افزودن دستمزد به حقوق ماه جاری از داشبورد');
    showFeedback('✓ دستمزد کار در منزل به فیش حقوق ماه جاری اضافه گردید.');
    onRefresh?.();
  };

  const handleRejectHomework = (taskId: string) => {
    const reason = prompt('لطفاً دلیل رد کار در منزل را وارد فرمایید:') || 'عدم انطباق کیفی با سفارش';
    StorageService.reviewHomeworkTask(taskId, 'REJECT', currentUser?.name || 'مدیریت کارگاه', reason);
    showFeedback('کار در منزل رد شد.', false);
    onRefresh?.();
  };

  const handleApproveLeave = (leaveId: string) => {
    StorageService.reviewLeaveRequest(
      leaveId,
      true,
      currentUser?.name || 'مدیریت کارگاه'
    );
    showFeedback('✓ درخواست مرخصی پرسنل تایید شد.');
    onRefresh?.();
  };

  const handleRejectLeave = (leaveId: string) => {
    StorageService.reviewLeaveRequest(
      leaveId,
      false,
      currentUser?.name || 'مدیریت کارگاه',
      'عدم امکان موافقت به دلیل حجم تعهدات تولید کارگاه'
    );
    showFeedback('درخواست مرخصی رد شد.', false);
    onRefresh?.();
  };

  const handleApproveManualAttendance = (recordId: string) => {
    StorageService.reviewManualAttendance(
      recordId,
      true,
      currentUser?.name || 'مدیریت کارگاه'
    );
    showFeedback('✓ درخواست تردد دستی تایید و در کارت تردد ثبت شد.');
    onRefresh?.();
  };

  const handleRejectManualAttendance = (recordId: string) => {
    StorageService.reviewManualAttendance(
      recordId,
      false,
      currentUser?.name || 'مدیریت کارگاه'
    );
    showFeedback('درخواست تردد دستی رد شد.', false);
    onRefresh?.();
  };

  // -------------------------------------------------------------
  // QUICK REGISTRATION MODAL SUBMISSIONS
  // -------------------------------------------------------------
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert('لطفاً پرسنل مورد نظر را انتخاب فرمایید.');
      return;
    }

    const emp = employees.find((x) => x.id === selectedEmpId);
    if (!emp) return;

    if (quickModalTab === 'LEAVE') {
      if (!quickLeaveReason.trim()) {
        alert('لطفاً علت مرخصی را وارد فرمایید.');
        return;
      }
      StorageService.submitLeaveRequest({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        type: quickLeaveType,
        startDate: getTodayShamsi(),
        endDate: getTodayShamsi(),
        durationDays: quickLeaveDays || 1,
        reason: quickLeaveReason.trim(),
      });
      showFeedback(`درخواست مرخصی برای ${emp.firstName} ${emp.lastName} ثبت شد.`);
    } else if (quickModalTab === 'ADVANCE') {
      if (!quickAdvanceAmount || Number(quickAdvanceAmount) <= 0) {
        alert('لطفاً مبلغ معتبر مساعده را وارد فرمایید.');
        return;
      }
      StorageService.submitAdvanceRequest({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        amount: Number(quickAdvanceAmount),
        requestDate: getTodayShamsi(),
        reason: quickAdvanceReason.trim() || 'درخواست مساعده پرسنلی',
        repayMonth: shamsi.year + '/' + (shamsi.monthName ? '07' : '07'),
      });
      showFeedback(`مساعده به مبلغ ${formatCurrencyTomans(Number(quickAdvanceAmount))} برای ${emp.firstName} ثبت شد.`);
    } else if (quickModalTab === 'EXPENSE') {
      if (!quickExpenseAmount || Number(quickExpenseAmount) <= 0 || !quickExpenseTitle.trim()) {
        alert('لطفاً مبلغ و عنوان خرید را وارد فرمایید.');
        return;
      }
      StorageService.submitWorkerExpense({
        employeeId: emp.id,
        amount: Number(quickExpenseAmount),
        title: quickExpenseTitle.trim(),
        date: getTodayShamsi(),
      });
      showFeedback(`فاکتور خرید ${quickExpenseTitle} ثبت گردید.`);
    } else if (quickModalTab === 'MANUAL_ATT') {
      StorageService.submitManualAttendanceRequest({
        employeeId: emp.id,
        date: getTodayShamsi(),
        checkInTime: quickAttIn,
        checkOutTime: quickAttOut,
        reason: quickAttReason.trim() || 'ثبت دستی تردد توسط مدیریت در داشبورد',
      });
      showFeedback(`تردد دستی برای ${emp.firstName} ${emp.lastName} با موفقیت ثبت شد.`);
    } else if (quickModalTab === 'ADJUSTMENT') {
      if (!quickAdjAmount || Number(quickAdjAmount) <= 0 || !quickAdjTitle.trim()) {
        alert('لطفاً مبلغ معتبر و عنوان تعدیل را وارد فرمایید.');
        return;
      }
      const currentMonth = getTodayShamsiDetailed().dateString.substring(0, 7);
      StorageService.addBonusOrPenalty({
        id: `bp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        companyId: settings.id,
        employeeId: emp.id,
        type: quickAdjType,
        amount: Number(quickAdjAmount),
        title: quickAdjTitle.trim(),
        description: quickAdjDesc.trim(),
        date: getTodayShamsi(),
        month: currentMonth,
        createdBy: currentUser?.name || currentUser?.username,
        createdAt: new Date().toISOString(),
      });
      StorageService.calculateSalaryForEmployee(emp.id, currentMonth);
      const typeLabel =
        quickAdjType === 'BONUS'
          ? 'پاداش تشویقی'
          : quickAdjType === 'DISCRETIONARY_ADVANCE'
          ? 'مساعده خارج از چارچوب'
          : 'جریمه انضباطی';
      showFeedback(`✓ ${typeLabel} به مبلغ ${formatCurrencyTomans(Number(quickAdjAmount))} برای ${emp.firstName} ${emp.lastName} ثبت و در فیش حقوقی دوره محاسبه گردید.`);
    }

    setIsQuickRequestModalOpen(false);
    onRefresh?.();
  };

  // -------------------------------------------------------------
  // WEEKLY ATTENDANCE TREND (Strict dynamic data Saturday to Friday)
  // -------------------------------------------------------------
  const todayWeekdayIdx = PERSIAN_WEEKDAYS.indexOf(shamsi.dayOfWeek);
  const effectiveTodayIdx = todayWeekdayIdx >= 0 ? todayWeekdayIdx : 0;

  const weeklyAttendanceData = useMemo(() => {
    return PERSIAN_WEEKDAYS.map((day, idx) => {
      const dayOffset = idx - effectiveTodayIdx;
      const d = new Date();
      d.setDate(d.getDate() + dayOffset);
      const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const dayDateSlash = `${jy}/${jm < 10 ? '0' : ''}${jm}/${jd < 10 ? '0' : ''}${jd}`;
      const dayDateDash = `${jy}-${jm < 10 ? '0' : ''}${jm}-${jd < 10 ? '0' : ''}${jd}`;

      const dayAtt = attendance.filter((a) => a.date === dayDateSlash || a.date === dayDateDash);
      const present = dayAtt.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EARLY_LEAVE'
      ).length;
      const late = dayAtt.filter(
        (a) => a.status === 'LATE' || (a.lateMinutes && a.lateMinutes > 0)
      ).length;
      const absent = dayAtt.filter((a) => a.status === 'ABSENT').length;

      return {
        day,
        حاضر: present,
        تاخیر: late,
        غایب: absent,
      };
    });
  }, [attendance, effectiveTodayIdx]);

  return (
    <div className="space-y-6 w-full max-w-full" dir="rtl">
      
      {/* Action Notification Toast */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in duration-200 ${
            actionFeedback.success
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Banner Upload Notification */}
      {bannerUploadMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between animate-in fade-in">
          <span>{bannerUploadMsg}</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. ULTRA-COMPACT COMMAND STRIP (بنر کم‌ارتفاع و مدرن)     */}
      {/* ========================================================= */}
      <div className="relative rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 p-2 sm:px-3.5 sm:py-2 text-white flex items-center justify-between gap-2.5">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-500 opacity-25"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950" />

        {/* Right Info: Live Status & Manager Greeting */}
        <div className="relative z-10 flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-white truncate">
                سلام، {currentUser?.name?.split(' (')[0] || 'جناب آقای نورایی'}
              </h2>
              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-white/10 text-indigo-200 border border-white/15 font-bold hidden xs:inline">
                مدیریت کارگاه
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
              <span>{shamsi.dayOfWeek}، {shamsi.day} {shamsi.monthName}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-emerald-300 font-bold tracking-wider">{timeStr}</span>
            </p>
          </div>
        </div>

        {/* Left Info: Key Badges & Banner Camera Button */}
        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs">
            <span className="text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
              {formatNumberFa(presentCount)} حاضر
            </span>
            {totalUrgentCount > 0 && (
              <span className="text-rose-300 font-bold bg-rose-500/25 px-2 py-0.5 rounded-lg border border-rose-500/40 animate-pulse">
                {formatNumberFa(totalUrgentCount)} اقدام فوری
              </span>
            )}
          </div>

          <label
            htmlFor="dashboard-banner-upload"
            className="p-1 sm:px-2 sm:py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/15 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold shadow-2xs shrink-0"
            title="تغییر تصویر بنر کارگاه"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-200" />
            <span className="hidden sm:inline">بنر</span>
            <input
              id="dashboard-banner-upload"
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PROMINENT KEY TELEMETRY & WORKSHOP PULSE (بخش‌های مهم)  */}
      {/* ========================================================= */}
      <div className="space-y-2.5">
        {/* 4 Main Actionable Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Card 1: Today's Live Presence */}
          <div
            onClick={() => onNavigate('attendance')}
            className="bg-white hover:bg-blue-50/40 border border-slate-200/90 hover:border-blue-300 p-3 sm:p-3.5 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 group-hover:text-blue-900 transition-colors">حضور امروز کارگاه</span>
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {formatNumberFa(presentCount)}
                </span>
                <span className="text-xs text-slate-500 font-medium">از {formatNumberFa(totalEmployees)} نفر حاضر</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalEmployees > 0 ? (presentCount / totalEmployees) * 100 : 0}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{formatNumberFa(absentCount)} غایب</span>
                <span className="text-amber-700 font-medium">{formatNumberFa(lateCount)} تاخیر</span>
              </div>
            </div>
          </div>

          {/* Card 2: Urgent Approvals */}
          <div
            onClick={() => setDashboardTab('REQUESTS')}
            className={`border p-3 sm:p-3.5 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group ${
              totalUrgentCount > 0
                ? 'bg-rose-50/70 border-rose-200/90 hover:border-rose-400'
                : 'bg-white border-slate-200/90 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold ${totalUrgentCount > 0 ? 'text-rose-950' : 'text-slate-700'}`}>اقدامات و تاییدات مدیر</span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                totalUrgentCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <Shield className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${totalUrgentCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                  {formatNumberFa(totalUrgentCount)}
                </span>
                <span className="text-xs text-slate-500 font-medium">مورد منتظر اقدام</span>
              </div>
              <div className="text-[10px] mt-1.5 font-medium truncate flex items-center gap-1">
                {totalUrgentCount > 0 ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                    <span className="text-rose-700 font-bold">نیاز به تایید و تسویه فوری</span>
                  </>
                ) : (
                  <span className="text-emerald-700">✓ همه موارد تعیین‌تکلیف شدند</span>
                )}
              </div>
              <span className="text-[9px] text-indigo-600 font-bold mt-1 block">بررسی در پیشخوان ←</span>
            </div>
          </div>

          {/* Card 3: Pending Financial Obligations */}
          <div
            onClick={() => onNavigate('advances')}
            className="bg-white hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-300 p-3 sm:p-3.5 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 group-hover:text-amber-950 transition-colors">مطالبات مالی در انتظار</span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-slate-900 font-mono tracking-tight truncate">
                {formatCurrencyTomans(totalPendingFinancialAmount)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">
                {formatNumberFa(pendingExpenses.length)} فاکتور خرید + {formatNumberFa(pendingAdvances.length)} مساعده + {formatNumberFa(pendingHomeworkTasks.length)} کار در منزل
              </div>
              <span className="text-[9px] text-amber-700 font-bold mt-1 block">تسویه و پرداخت ←</span>
            </div>
          </div>

          {/* Card 4: SMS Gateway Status & Balance */}
          <div
            onClick={() => onNavigate('settings')}
            className="bg-white hover:bg-indigo-50/40 border border-slate-200/90 hover:border-indigo-300 p-3 sm:p-3.5 rounded-2xl shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 group-hover:text-indigo-950 transition-colors">درگاه پیامک کارگاه</span>
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="truncate">
                  {settings.smsProvider === 'MELIPAYAMAK' ? 'ملی‌پیامک (فعال)' :
                   settings.smsProvider === 'IPPANEL_FARAZ' ? 'فراز اس‌ام‌اس (فعال)' :
                   settings.smsProvider === 'GHASEDAK' ? 'قاصدک (فعال)' :
                   settings.smsProvider === 'SMS_IR' ? 'SMS.ir (فعال)' :
                   settings.smsProvider === 'CUSTOM' ? 'وب‌سرویس سفارشی' : 'کاوه‌نگار (فعال)'}
                </span>
              </div>
              <div className="text-[10px] text-indigo-950 font-bold mt-1 truncate bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-100">
                {settings.smsLastBalance ? `مانده: ${settings.smsLastBalance}` : 'آماده ارسال اعلان تردد'}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 block">تنظیمات پیامک ←</span>
            </div>
          </div>
        </div>

        {/* Compact Secondary Stat Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div
            onClick={() => onNavigate('attendance')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <UserX className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">غایبین:</span>
            </div>
            <span className="font-mono text-xs font-black text-rose-600 mr-1">{formatNumberFa(absentCount)} نفر</span>
          </div>

          <div
            onClick={() => onNavigate('attendance')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <ClockAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">تاخیر ورود:</span>
            </div>
            <span className="font-mono text-xs font-black text-amber-700 mr-1">{formatNumberFa(lateCount)} نفر</span>
          </div>

          <div
            onClick={() => onNavigate('leaves')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <PlaneTakeoff className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">مرخصی مصوب:</span>
            </div>
            <span className="font-mono text-xs font-black text-teal-700 mr-1">{formatNumberFa(onLeaveCount)} نفر</span>
          </div>

          <div
            onClick={() => onNavigate('attendance')}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Timer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] text-slate-600 truncate">اضافه‌کاری:</span>
            </div>
            <span className="font-mono text-xs font-black text-indigo-700 mr-1">{formatNumberFa(totalOvertimeMinutes)} دقیقه</span>
          </div>
        </div>
      </div>

      {/* Daily Work Reports Dedicated Quick Banner */}
      <div
        onClick={() => onNavigate('work-reports')}
        className="p-3 sm:p-4 rounded-3xl bg-gradient-to-r from-teal-50 via-emerald-50 to-indigo-50 border border-teal-200/90 hover:border-teal-400 flex items-center justify-between cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
            <ClipboardList className="w-5 h-5 text-teal-100" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-xs sm:text-sm text-teal-950">گزارش‌های کار روزانه پرسنل و مدیران</span>
              {pendingWorkReports.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                  {formatNumberFa(pendingWorkReports.length)} در انتظار تایید و بازخورد
                </span>
              )}
            </div>
            <p className="text-[11px] text-teal-800/80 mt-0.5 truncate">
              {todayWorkReports.length > 0
                ? `${formatNumberFa(todayWorkReports.length)} گزارش کار برای امروز ثبت شده است. کلیک جهت مشاهده سوابق، تایید و ثبت گزارش جدید.`
                : 'مشاهده گزارش‌های کار کلیه پرسنل، ثبت گزارش کار روزانه جدید و ثبت نظر یا بازخورد مدیریتی'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 group-hover:text-teal-950 shrink-0 mr-2">
          <span className="hidden sm:inline">مشاهده و ثبت گزارش</span>
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. QUICK ACTIONS GRID (میز کار و دسترسی سریع عملیاتی)      */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-black text-xs sm:text-sm text-slate-900">
                میز کار و دسترسی سریع عملیاتی (Quick Actions)
              </h3>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            دسترسی فوری با یک کلیک
          </span>
        </div>

        {/* 3 columns on mobile, 5 on tablet, 9+ on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 sm:gap-2.5">
          {/* Quick Action: Daily Work Reports */}
          <button
            type="button"
            onClick={() => onNavigate('work-reports')}
            className="p-2.5 sm:p-3 rounded-2xl bg-teal-50 hover:bg-teal-100/90 text-teal-950 border border-teal-200/90 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center relative shadow-2xs"
          >
            {pendingWorkReports.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs animate-bounce">
                {pendingWorkReports.length}
              </span>
            )}
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList className="w-4 h-4 text-teal-600" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">گزارش کار</span>
              <span className="text-[8px] text-teal-700 font-medium block truncate">ثبت و مشاهده</span>
            </div>
          </button>

          {/* Quick Action: Miscellaneous Payments */}
          <button
            type="button"
            onClick={() => {
              if (onOpenQuickMiscPayment) {
                onOpenQuickMiscPayment();
              } else {
                onNavigate('financial-reminders');
              }
            }}
            className="p-2.5 sm:p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/90 text-emerald-950 border border-emerald-200/90 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">واریزی متفرقه</span>
              <span className="text-[8px] text-emerald-700 font-medium block truncate">خارج از مساعده</span>
            </div>
          </button>
          {/* Quick Action 1: Workshop Alarms & Chimes Shortcut */}
          <button
            type="button"
            onClick={() => onNavigate('alarms')}
            className="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 border border-amber-300/80 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center shadow-2xs"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bell className="w-4 h-4 text-amber-600 animate-bounce-short" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-black block truncate">زنگ و آلارم</span>
              <span className="text-[8px] text-amber-700 font-medium block truncate">پخش فوری کارگاه</span>
            </div>
          </button>

          {/* Quick Action 2: Submit Personnel Request */}
          <button
            type="button"
            onClick={() => setIsQuickRequestModalOpen(true)}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white flex flex-col items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer group text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-black block truncate">ثبت درخواست</span>
              <span className="text-[8px] text-indigo-200 font-medium block truncate">مرخصی / مساعده</span>
            </div>
          </button>

          {/* Quick Action 3: Manual Attendance */}
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="p-2.5 sm:p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/90 text-emerald-950 border border-emerald-200/90 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">تردد دستی</span>
              <span className="text-[8px] text-emerald-700 font-medium block truncate">اصلاح ورود/خروج</span>
            </div>
          </button>

          {/* Quick Action 4: Settle Personal Card Expense */}
          <button
            type="button"
            onClick={() => onNavigate('advances')}
            className={`p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer relative group text-center ${
              pendingExpenses.length > 0
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-950 border-rose-300 ring-2 ring-rose-400/20'
                : 'bg-slate-50 hover:bg-slate-100/90 text-slate-800 border-slate-200/90'
            }`}
          >
            {pendingExpenses.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs animate-bounce">
                {pendingExpenses.length}
              </span>
            )}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
              pendingExpenses.length > 0 ? 'bg-rose-500/15 text-rose-700' : 'bg-blue-500/15 text-blue-700'
            }`}>
              <Receipt className={`w-4 h-4 ${pendingExpenses.length > 0 ? 'text-rose-600' : 'text-blue-600'}`} />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">تسویه فاکتور</span>
              <span className={`text-[8px] font-medium block truncate ${
                pendingExpenses.length > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
              }`}>
                {pendingExpenses.length > 0 ? `${formatNumberFa(pendingExpenses.length)} باز` : 'خرید پرسنل'}
              </span>
            </div>
          </button>

          {/* Quick Action 5: Discretionary Adjustments */}
          <button
            type="button"
            onClick={() => {
              setQuickModalTab('ADJUSTMENT');
              setIsQuickRequestModalOpen(true);
            }}
            className="p-2.5 sm:p-3 rounded-2xl bg-purple-50 hover:bg-purple-100/90 text-purple-950 border border-purple-200/90 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">پاداش و جریمه</span>
              <span className="text-[8px] text-purple-700 font-medium block truncate">تعدیلات ویژه</span>
            </div>
          </button>

          {/* Quick Action 6: Smart QR Kiosk */}
          <button
            type="button"
            onClick={() => onNavigate('qr-kiosk')}
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <QrCode className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">کیوسک QR</span>
              <span className="text-[8px] text-slate-500 font-medium block truncate">بارکد و پوستر</span>
            </div>
          </button>

          {/* Quick Action 7: Payroll & Advances */}
          <button
            type="button"
            onClick={() => onNavigate('payroll')}
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">فیش حقوقی</span>
              <span className="text-[8px] text-slate-500 font-medium block truncate">محاسبه دستمزد</span>
            </div>
          </button>

          {/* Quick Action 8: Employees Management */}
          <button
            type="button"
            onClick={() => onNavigate('employees')}
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">پرسنل کارگاه</span>
              <span className="text-[8px] text-slate-500 font-medium block truncate">پرونده و شیفت</span>
            </div>
          </button>

          {/* Quick Action 9: Settings */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/90 text-slate-800 border border-slate-200/90 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer group text-center"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <SettingsIcon className="w-4 h-4 text-slate-600" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[11px] font-bold block truncate">تنظیمات</span>
              <span className="text-[8px] text-slate-500 font-medium block truncate">قوانین و پیامک</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. OTHER CONTENTS SECTION (تب‌بندی شده برای موبایل)       */}
      {/* ========================================================= */}
      <div className="space-y-4">
        {/* Navigation Tabs for Other Contents */}
        <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setDashboardTab('REQUESTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                dashboardTab === 'REQUESTS'
                  ? 'bg-white text-indigo-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${dashboardTab === 'REQUESTS' ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>هشدارها و مطالبات</span>
              {totalUrgentCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold animate-pulse">
                  {formatNumberFa(totalUrgentCount)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('PRESENCE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                dashboardTab === 'PRESENCE'
                  ? 'bg-white text-indigo-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${dashboardTab === 'PRESENCE' ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>پایش تردد و پرسنل</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-mono font-bold">
                {formatNumberFa(presentCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('WORK_REPORTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                dashboardTab === 'WORK_REPORTS'
                  ? 'bg-white text-indigo-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardList className={`w-3.5 h-3.5 ${dashboardTab === 'WORK_REPORTS' ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>گزارش‌های کار روزانه</span>
              {pendingWorkReports.length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-teal-600 text-white font-mono font-bold animate-pulse">
                  {formatNumberFa(pendingWorkReports.length)}
                </span>
              ) : allWorkReports.length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-mono font-bold">
                  {formatNumberFa(allWorkReports.length)}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('TRENDS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                dashboardTab === 'TRENDS'
                  ? 'bg-white text-indigo-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${dashboardTab === 'TRENDS' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>نمودار روند هفتگی</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('LOGS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                dashboardTab === 'LOGS'
                  ? 'bg-white text-indigo-950 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className={`w-3.5 h-3.5 ${dashboardTab === 'LOGS' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>رویدادهای زنده سیستم</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-400 px-2 hidden md:inline">
            بررسی سریع مطالب بدون نیاز به اسکرول
          </span>
        </div>

        {/* Tab 1: High Priority Alerts & Requests Panel */}
        {dashboardTab === 'REQUESTS' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200/60 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  مرکز هشدارها، مطالبات و درخواست‌های پرسنلی
                </h3>
                {totalUrgentCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تایید، تسویه فوری فاکتورها، مساعده، مرخصی و ترددهای دستی پرسنل
              </p>
            </div>
          </div>

          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveAlertTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              همه ({formatNumberFa(totalAlertsWithNotCheckedOut)})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab('FINANCIAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'FINANCIAL'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مالی و فاکتورها ({formatNumberFa(pendingExpenses.length + pendingAdvances.length)})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab('LEAVES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'LEAVES'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مرخصی‌ها ({formatNumberFa(pendingLeaves.length)})
            </button>
            <button
              type="button"
              onClick={() => setActiveAlertTab('ATTENDANCE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeAlertTab === 'ATTENDANCE'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تردد و ساعات باز ({formatNumberFa(pendingManualAttendance.length + notCheckedOutEmployees.length)})
            </button>
          </div>
        </div>

        {/* Requests & Alerts List */}
        <div className="space-y-3">
          
          {/* SECTION 0: Financial Reminders, Checks & Installments sent by Finance Manager */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'FINANCIAL') && pendingSentFinancialReminders.length > 0 && (
            <div className="space-y-2 p-4 rounded-3xl bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-white border-2 border-indigo-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-indigo-950 px-1 pt-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="text-sm">یادآوری‌های مالی، چک‌های صیادی و اقساط ارسالی مدیر منابع مالی ({formatNumberFa(pendingSentFinancialReminders.length)} مورد)</span>
                  <span className="text-[11px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                    مجموع: {formatCurrencyTomans(totalPendingSentFinancialAmount)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('financial-reminders')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <span>ورود به کارتابل چک و اقساط</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                {pendingSentFinancialReminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="p-3.5 rounded-2xl bg-white border border-indigo-100 hover:border-indigo-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5 ${
                        rem.type === 'CHECK'
                          ? 'bg-purple-600 text-white'
                          : rem.type === 'INSTALLMENT'
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}>
                        {rem.type === 'CHECK' ? <CheckCheck className="w-5 h-5" /> : rem.type === 'INSTALLMENT' ? <CalendarClock className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-slate-900">{rem.title}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            rem.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}>
                            {rem.priority === 'URGENT' ? 'فوری' : 'عادی'}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            سررسید: {rem.dueDate}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                          <span>طرف حساب: <strong>{rem.debtorCreditorName}</strong></span>
                          {rem.bankName && <span>• بانک: {rem.bankName}</span>}
                          {rem.checkNumber && <span className="font-mono">• چک: {rem.checkNumber}</span>}
                          {rem.installmentNumber && <span>• {rem.installmentNumber}</span>}
                        </div>
                        <div className="text-sm font-black text-indigo-900 font-mono">
                          مبلغ: {formatCurrencyTomans(rem.amount)}
                        </div>
                      </div>
                    </div>

                    {/* Quick actions for Senior Admin */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                      {rem.status !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => handleQuickApproveFinancialReminder(rem.id)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-300 transition-colors cursor-pointer"
                        >
                          تایید دستور پرداخت
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleQuickPayFinancialReminder(rem.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تسویه و پرداخت شد</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION A: Personal Card Expenses (High Priority Financial) */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'FINANCIAL') && pendingExpenses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-rose-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-rose-600" />
                  <span>فاکتورها و خریدهای پرداخت‌شده با کارت شخصی کارگران ({formatNumberFa(pendingExpenses.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('advances')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت کامل فاکتورها</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 hover:bg-rose-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{exp.employeeName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({exp.date})</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200">
                          پرداخت از کارت شخصی
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        شرح خرید: <strong className="text-slate-900">{exp.title}</strong>
                      </p>
                      <div className="text-sm font-black text-rose-700 font-mono">
                        مبلغ پرداختی کارگر: {formatCurrencyTomans(exp.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Expense */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSettleExpenseNow(exp.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="تسویه نقدی فوری و انتقال وجه به کارگر"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تسویه نقدی فوری</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddExpenseToSalary(exp.id)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="افزودن به حقوق ماه جاری کارگر"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>افزودن به حقوق ماه</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectExpense(exp.id)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>رد</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION B: Advance Salary Requests */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'FINANCIAL') && pendingAdvances.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-amber-600" />
                  <span>درخواست‌های مساعده مالی در انتظار تایید ({formatNumberFa(pendingAdvances.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('advances')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت کامل مساعده‌ها</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingAdvances.map((adv) => {
                const emp = employees.find((e) => e.id === adv.employeeId);
                return (
                  <div
                    key={adv.id}
                    className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 hover:bg-amber-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : adv.employeeId}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">({adv.requestDate})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                            مساعده بین‌ماه
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">
                          علت درخواست: <span className="font-semibold text-slate-900">{adv.reason || 'مساعده پرسنلی'}</span>
                          {adv.repayMonth && <span className="text-slate-500 mr-2">• کسر در حقوق: {adv.repayMonth}</span>}
                        </p>
                        <div className="text-sm font-black text-amber-800 font-mono">
                          مبلغ درخواستی: {formatCurrencyTomans(adv.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveAdvance(adv.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تایید و پرداخت مساعده</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectAdvance(adv.id)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>رد</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION B2: Homework Tasks (Pending Piecework & Homework Wages) */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'FINANCIAL') && pendingHomeworkTasks.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-indigo-600" />
                  <span>گزارش‌های کار در منزل و کارمزدی در انتظار تسویه ({formatNumberFa(pendingHomeworkTasks.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('advances')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت کامل کار در منزل</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingHomeworkTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 hover:bg-indigo-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                      <Home className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{task.employeeName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({task.date})</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                          کار در منزل / کارمزدی
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        نوع کار: <strong className="text-slate-900">{task.taskType}</strong> • مقدار: <strong className="text-indigo-900">{formatNumberFa(task.quantity)} {task.unit}</strong> (نرخ واحد: {formatCurrencyTomans(task.wagePerUnit)})
                      </p>
                      <div className="text-sm font-black text-indigo-800 font-mono">
                        مبلغ دستمزد: {formatCurrencyTomans(task.totalWage)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSettleHomeworkNow(task.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="تسویه حساب نقدی فوری"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تسویه نقدی فوری</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddHomeworkToSalary(task.id)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="افزودن دستمزد به فیش حقوقی ماه جاری"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>افزودن به فیش حقوق</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectHomework(task.id)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>رد</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION C: Leave Requests */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'LEAVES') && pendingLeaves.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-teal-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-teal-600" />
                  <span>درخواست‌های مرخصی در انتظار تایید ({formatNumberFa(pendingLeaves.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('leaves')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت مرخصی‌ها</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingLeaves.map((l) => {
                const emp = employees.find((e) => e.id === l.employeeId);
                const leaveTypeLabel =
                  l.type === 'EARNED' ? 'استحقاقی' :
                  l.type === 'MEDICAL' ? 'استعلاجی' :
                  l.type === 'HOURLY' ? 'ساعتی' : 'بدون حقوق';

                return (
                  <div
                    key={l.id}
                    className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 hover:bg-teal-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                        <CalendarCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : l.employeeName || l.employeeId}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-200">
                            {leaveTypeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">
                          بازه زمانی: <strong className="text-slate-900 font-mono">{l.startDate}</strong> الی <strong className="text-slate-900 font-mono">{l.endDate}</strong>
                          {l.durationHours ? ` (${formatNumberFa(l.durationHours)} ساعت)` : ` (${formatNumberFa(l.durationDays || 1)} روز)`}
                        </p>
                        <p className="text-xs text-slate-500">
                          علت مرخصی: <span className="text-slate-800 font-medium">{l.reason || 'امور شخصی'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveLeave(l.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>موافقت با مرخصی</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectLeave(l.id)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-teal-100 text-teal-800 border border-teal-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>عدم موافقت</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION D: Manual Attendance Punch Requests */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'ATTENDANCE') && pendingManualAttendance.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950 px-1 pt-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>درخواست‌های ثبت تردد دستی پرسنل ({formatNumberFa(pendingManualAttendance.length)} مورد)</span>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <span>مدیریت حضور و غیاب</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendingManualAttendance.map((rec) => {
                const emp = employees.find((e) => e.id === rec.employeeId);
                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 hover:bg-indigo-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-right"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900">
                            {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">({rec.date})</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold border border-indigo-200">
                            تردد دستی
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">
                          ساعات درخواستی: ورود <strong className="font-mono text-emerald-700">{rec.checkInTime || '-'}</strong> | خروج <strong className="font-mono text-rose-700">{rec.checkOutTime || '-'}</strong>
                          <span className="text-slate-500 mr-2 font-mono">({formatNumberFa(rec.workDurationMinutes)} دقیقه کارکرد)</span>
                        </p>
                        {rec.notes && <p className="text-xs text-slate-500">{rec.notes}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApproveManualAttendance(rec.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>تایید تردد</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectManualAttendance(rec.id)}
                        className="px-3 py-2 rounded-xl bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 active:scale-95 text-xs font-bold transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>رد</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SECTION E: Unclosed Shifts (Clocked in without checkout) */}
          {(activeAlertTab === 'ALL' || activeAlertTab === 'ATTENDANCE') && notCheckedOutEmployees.length > 0 && (
            <div
              onClick={() => onNavigate('attendance')}
              className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 hover:bg-amber-100/60 transition-all flex items-center justify-between gap-3 text-right cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <ClockAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                    پرسنل حاضر در کارگاه بدون ثبت خروج ({formatNumberFa(notCheckedOutEmployees.length)} نفر)
                  </h4>
                  <p className="text-[11px] text-amber-800/90 mt-0.5">
                    پرسنل وارد کارگاه شده‌اند و هنوز شیفت کاری آنها بسته نشده است.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-800 shrink-0 bg-white/80 px-3 py-1.5 rounded-xl border border-amber-200">
                <span>مشاهده در حضور و غیاب</span>
                <ChevronLeft className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Clean Reassuring Empty State */}
          {totalAlertsWithNotCheckedOut === 0 && (
            <div className="p-8 text-center bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">
                تمام درخواست‌ها و مطالبات پرسنلی تعیین تکلیف شده‌اند
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                هیچ فاکتور خرید معوق، درخواست مساعده باز، مرخصی تعیین تکلیف‌نشده یا تردد بلاتکلیفی وجود ندارد.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Tab 2: Today's Attendance & Personnel Presence */}
      {dashboardTab === 'PRESENCE' && (
      <div className="space-y-4">
        {/* 6 Statistical KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Active Personnel */}
        <div
          onClick={() => onNavigate('employees')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>کل پرسنل</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(totalEmployees)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">
              {formatNumberFa(totalEmployees)} پرونده فعال کارگاه
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mr-2">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Mission Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>مأموریت روز</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(1)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>خارج از کارگاه</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mr-2">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Absents */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>غایبین امروز</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(absentCount)}
            </div>
            <div className="text-[11px] text-rose-600 font-medium mt-0.5 truncate">
              {absentCount > 0 ? 'بدون ثبت تردد' : 'تمامی پرسنل حاضر'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mr-2">
            <UserX className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Entry Delay */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>تاخیر ورود</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(totalLateMinutes)}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5 truncate">
              {formatNumberFa(lateCount)} نفر دارای تاخیر
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mr-2">
            <ClockAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Card 5: On Leave */}
        <div
          onClick={() => onNavigate('leaves')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>در مرخصی</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(onLeaveCount)}
            </div>
            <div className="text-[11px] text-teal-700 font-medium mt-0.5 truncate">
              مرخصی مصوب روز
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 mr-2">
            <PlaneTakeoff className="w-5 h-5" />
          </div>
        </div>

        {/* Card 6: Overtime Today */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>اضافه‌کاری</span>
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {formatNumberFa(totalOvertimeMinutes)}
            </div>
            <div className="text-[11px] text-indigo-700 font-medium mt-0.5 truncate">
              مجموع دقایق مازاد امروز
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mr-2">
            <Timer className="w-5 h-5" />
          </div>
        </div>
        </div>

        {/* Today's Active Presence Roster */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>پرسنل ثبت‌شده در شیفت کاری امروز ({formatNumberFa(todayAttendance.length)} نفر)</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg"
            >
              <span>مشاهده دفتر تردد</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {todayAttendance.map((rec) => {
              const emp = employees.find((e) => e.id === rec.employeeId);
              return (
                <div key={rec.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <span className="font-black text-slate-900 block truncate">
                      {emp ? `${emp.firstName} ${emp.lastName}` : rec.employeeId}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ورود: <strong className="text-emerald-700">{rec.checkInTime || '-'}</strong>
                      {rec.checkOutTime ? ` | خروج: ${rec.checkOutTime}` : ' | در کارگاه'}
                    </span>
                  </div>
                  {rec.lateMinutes && rec.lateMinutes > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold shrink-0">
                      {formatNumberFa(rec.lateMinutes)}د تاخیر
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">
                      حاضر
                    </span>
                  )}
                </div>
              );
            })}
            {todayAttendance.length === 0 && (
              <div className="col-span-full text-center py-6 text-xs text-slate-400">
                هنوز ترددی برای امروز ثبت نشده است.
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Tab: Daily Work Reports Overview */}
      {dashboardTab === 'WORK_REPORTS' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  گزارش‌های کار روزانه پرسنل و مدیران کارگاه
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ثبت عملکرد روزانه، اقدامات تولیدی، ماشین‌کاری و امور اداری پرسنل و مدیران
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('work-reports')}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-indigo-700 hover:from-teal-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <ClipboardList className="w-4 h-4 text-teal-200" />
              <span>ورود به سامانه کامل گزارش کار ←</span>
            </button>
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">کل گزارش‌های ثبت‌شده:</span>
                <div className="text-lg font-black text-slate-800 font-mono mt-0.5">{formatNumberFa(allWorkReports.length)} مورد</div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 bg-teal-50/80 rounded-2xl border border-teal-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-teal-700 font-medium">گزارش‌های امروز:</span>
                <div className="text-lg font-black text-teal-900 font-mono mt-0.5">{formatNumberFa(todayWorkReports.length)} مورد</div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-700 font-medium">در انتظار بررسی مدیریت:</span>
                <div className="text-lg font-black text-amber-900 font-mono mt-0.5">{formatNumberFa(pendingWorkReports.length)} مورد</div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="space-y-3 pt-2">
            {allWorkReports.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  تاکنون هیچ گزارش کاری در سامانه ثبت نشده است.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('work-reports')}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ثبت اولین گزارش کار</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {allWorkReports.slice(0, 5).map((rep) => {
                  const isAck = rep.status === 'ACKNOWLEDGED';
                  return (
                    <div key={rep.id} className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {rep.employeeName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {rep.date}
                          </span>
                          {rep.hoursSpent && (
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                              {rep.hoursSpent} ساعت کارکرد
                            </span>
                          )}
                          {(rep.tags || []).map((tag, i) => (
                            <span key={i} className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isAck ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>بررسی شده توسط {rep.seenBy || 'مدیر'}</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>در انتظار بررسی</span>
                              </span>
                              {(currentUser?.role === 'ADMIN' || currentUser?.isHrManager || currentUser?.role === 'MANAGER') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    StorageService.reviewWorkReport(rep.id, 'مشاهده و تایید شد', currentUser?.name || 'مدیر');
                                    showFeedback('✓ گزارش کار با موفقیت تایید و نشان مشاهده ثبت شد.');
                                    onRefresh?.();
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  تایید و ثبت نظر
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-700 font-medium">
                        <div className="font-bold text-slate-900">{rep.title}</div>
                        <p className="text-slate-600 text-xs mt-1 leading-relaxed whitespace-pre-line line-clamp-2">
                          {rep.content}
                        </p>
                      </div>

                      {rep.adminFeedback && (
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-[11px] text-emerald-800">نظر مدیر ({rep.feedbackBy || 'مدیر'}): </span>
                            <span className="text-[11px]">{rep.adminFeedback}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Weekly Attendance Trend Chart */}
      {dashboardTab === 'TRENDS' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                نمودار روند حضور و غیاب هفته جاری (شنبه تا جمعه)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                پایش دقیق تعداد حاضرین، تاخیرها و غیبت‌های ثبت‌شده در طول هفته
              </p>
            </div>

            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100/70 px-3 py-1.5 rounded-xl transition-colors"
            >
              <span>مشاهده دفتر حضور و غیاب</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <div className="h-64 sm:h-72 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendanceData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                    direction: 'rtl',
                    border: 'none',
                  }}
                />
                <Bar dataKey="حاضر" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="تاخیر" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="غایب" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-3 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>حاضر در کارگاه</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>ورود با تاخیر</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>غایب</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Live Activity Feed */}
      {dashboardTab === 'LOGS' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600 shrink-0" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                آخرین رویدادهای کارگاه و تغییرات سیستم
              </h3>
            </div>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
              زنده
            </span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.slice(0, 8).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-right space-y-1 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{log.action}</span>
                  <span className="text-[10px] font-mono text-slate-400">{log.timestamp?.split(' ')[1] || log.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed truncate">
                  {log.details}
                </p>
                <div className="text-[10px] text-slate-400">
                  توسط: <span className="font-medium text-slate-600">{log.userName}</span>
                </div>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                هنوز رویدادی ثبت نشده است.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>مشاهده لاگ‌های امنیتی کامل در تنظیمات</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      </div>

      {/* ========================================================= */}
      {/* 7. QUICK ACTION REGISTRATION MODAL                        */}
      {/* ========================================================= */}
      {isQuickRequestModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsQuickRequestModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsQuickRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <span>ثبت درخواست یا عملیات جدید</span>
                <PlusCircle className="w-5 h-5 text-indigo-600" />
              </h3>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setQuickModalTab('LEAVE')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate ${
                  quickModalTab === 'LEAVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مرخصی
              </button>
              <button
                type="button"
                onClick={() => setQuickModalTab('ADVANCE')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate ${
                  quickModalTab === 'ADVANCE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مساعده
              </button>
              <button
                type="button"
                onClick={() => setQuickModalTab('EXPENSE')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate ${
                  quickModalTab === 'EXPENSE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                خرید کارگاه
              </button>
              <button
                type="button"
                onClick={() => setQuickModalTab('MANUAL_ATT')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate ${
                  quickModalTab === 'MANUAL_ATT' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تردد دستی
              </button>
              <button
                type="button"
                onClick={() => setQuickModalTab('ADJUSTMENT')}
                className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer truncate col-span-2 sm:col-span-1 ${
                  quickModalTab === 'ADJUSTMENT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-800 bg-indigo-50/60 hover:bg-indigo-100'
                }`}
              >
                پاداش / جریمه / مساعده
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  پرسنل مورد نظر:
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.personalCode} - {emp.position})
                    </option>
                  ))}
                </select>
              </div>

              {/* TAB 1: LEAVE */}
              {quickModalTab === 'LEAVE' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">نوع مرخصی:</label>
                      <select
                        value={quickLeaveType}
                        onChange={(e) => setQuickLeaveType(e.target.value as LeaveType)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none bg-white font-medium"
                      >
                        <option value="EARNED">استحقاقی</option>
                        <option value="MEDICAL">استعلاجی</option>
                        <option value="HOURLY">ساعتی</option>
                        <option value="UNPAID">بدون حقوق</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">مدت مرخصی (روز):</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={quickLeaveDays}
                        onChange={(e) => setQuickLeaveDays(Number(e.target.value))}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">علت و توضیحات مرخصی:</label>
                    <input
                      type="text"
                      required
                      value={quickLeaveReason}
                      onChange={(e) => setQuickLeaveReason(e.target.value)}
                      placeholder="مثال: امور شخصی یا استراحت پزشکی"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              {/* TAB 2: ADVANCE */}
              {quickModalTab === 'ADVANCE' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ مساعده (تومان):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={quickAdvanceAmount}
                      onChange={(e) => {
                        const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        setQuickAdvanceAmount(raw ? Number(raw) : '');
                      }}
                      placeholder="مثال: ۲,۰۰۰,۰۰۰"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">علت درخواست مساعده:</label>
                    <input
                      type="text"
                      value={quickAdvanceReason}
                      onChange={(e) => setQuickAdvanceReason(e.target.value)}
                      placeholder="علت درخواست مساعده پرسنلی"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              {/* TAB 3: EXPENSE */}
              {quickModalTab === 'EXPENSE' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ خرید (تومان):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={quickExpenseAmount}
                      onChange={(e) => {
                        const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        setQuickExpenseAmount(raw ? Number(raw) : '');
                      }}
                      placeholder="مثال: ۱,۸۵۰,۰۰۰"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">شرح و فاکتور خرید:</label>
                    <input
                      type="text"
                      required
                      value={quickExpenseTitle}
                      onChange={(e) => setQuickExpenseTitle(e.target.value)}
                      placeholder="مثال: خرید چسب و سنباده خط تولید"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              {/* TAB 4: MANUAL ATTENDANCE */}
              {quickModalTab === 'MANUAL_ATT' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ساعت ورود:</label>
                      <input
                        type="time"
                        value={quickAttIn}
                        onChange={(e) => setQuickAttIn(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">ساعت خروج:</label>
                      <input
                        type="time"
                        value={quickAttOut}
                        onChange={(e) => setQuickAttOut(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">علت ثبت دستی:</label>
                    <input
                      type="text"
                      value={quickAttReason}
                      onChange={(e) => setQuickAttReason(e.target.value)}
                      placeholder="ثبت دستی تردد توسط مدیریت"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              {/* TAB 5: ADJUSTMENT (BONUS, PENALTY, EXTRA ADVANCE) */}
              {quickModalTab === 'ADJUSTMENT' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع تعدیل مدیریتی:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickAdjType('BONUS')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          quickAdjType === 'BONUS'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <TrendingUp className={`w-3.5 h-3.5 ${quickAdjType === 'BONUS' ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold">پاداش (+)</span>
                        <span className="text-[9px] text-emerald-700 font-normal">افزایش به حقوق</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuickAdjType('DISCRETIONARY_ADVANCE')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          quickAdjType === 'DISCRETIONARY_ADVANCE'
                            ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Coins className={`w-3.5 h-3.5 ${quickAdjType === 'DISCRETIONARY_ADVANCE' ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold">مساعده ویژه (-)</span>
                        <span className="text-[9px] text-purple-700 font-normal">خارج از چارچوب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuickAdjType('PENALTY')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          quickAdjType === 'PENALTY'
                            ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <TrendingDown className={`w-3.5 h-3.5 ${quickAdjType === 'PENALTY' ? 'text-rose-600' : 'text-slate-400'}`} />
                        <span className="text-[11px] font-bold">جریمه (-)</span>
                        <span className="text-[9px] text-rose-700 font-normal">کسر از حقوق</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">مبلغ (تومان):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={quickAdjAmount}
                      onChange={(e) => {
                        const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                        setQuickAdjAmount(raw ? Number(raw) : '');
                      }}
                      placeholder="مثال: ۱,۵۰۰,۰۰۰"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none font-mono text-left font-bold"
                      dir="ltr"
                    />
                    {quickAdjAmount ? (
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        معادل: {formatCurrencyTomans(Number(quickAdjAmount))}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عنوان / موضوع:</label>
                    <input
                      type="text"
                      required
                      value={quickAdjTitle}
                      onChange={(e) => setQuickAdjTitle(e.target.value)}
                      placeholder={
                        quickAdjType === 'BONUS'
                          ? 'مثال: تسریع در تکمیل سفارش یا حسن کارکرد'
                          : quickAdjType === 'DISCRETIONARY_ADVANCE'
                          ? 'مثال: مساعده فوری خارج از سقف'
                          : 'مثال: جریمه خسارت یا تاخیر غیرموجه'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">توضیحات و مستندات (اختیاری):</label>
                    <input
                      type="text"
                      value={quickAdjDesc}
                      onChange={(e) => setQuickAdjDesc(e.target.value)}
                      placeholder="شرح علت برای ثبت دقیق در فیش دوره جاری"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  ثبت قطعی در پرونده
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
