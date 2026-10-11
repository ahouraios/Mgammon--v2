import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  Trash2,
  Calendar,
  User as UserIcon,
  Tag,
  X,
  FileText,
  Filter,
  Check,
  Building2,
  Briefcase
} from 'lucide-react';
import { Employee, User, WorkReport } from '../../types';
import { StorageService } from '../../services/storage';
import { getTodayShamsi } from '../../utils/dateUtils';
import { ShamsiDatePicker } from '../common/ShamsiDatePicker';

interface WorkReportsViewProps {
  currentUser: User;
  employees: Employee[];
  onRefresh: () => void;
}

export const WorkReportsView: React.FC<WorkReportsViewProps> = ({
  currentUser,
  employees,
  onRefresh,
}) => {
  const isSeniorAdmin = currentUser.role === 'ADMIN' || Boolean(currentUser.isSuperAdmin);
  const isHrManager = Boolean(currentUser.isHrManager || currentUser.managementRoles?.includes('HR_ADMIN'));
  const canManageReports = isSeniorAdmin || isHrManager;

  const allReports: WorkReport[] = StorageService.getWorkReports(currentUser);

  // Eligible employees for report submission (All personnel and managers, excluding Senior Admin)
  const eligibleEmployees: Employee[] = useMemo(() => {
    const list = employees.filter((e) => e.id !== 'usr_admin');
    if (currentUser.employeeId && !list.some((e) => e.id === currentUser.employeeId)) {
      const nameParts = (currentUser.name || '').trim().split(' ');
      list.unshift({
        id: currentUser.employeeId,
        companyId: currentUser.companyId || 'comp_mgommon_01',
        personalCode: currentUser.employeeId.replace(/^emp_/, '').slice(-4) || '1001',
        nationalCode: '0920000000',
        firstName: nameParts[0] || currentUser.username || 'پرسنل',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: currentUser.phone || '09154520433',
        email: currentUser.email || `${currentUser.username}@mgommon.ir`,
        department: (currentUser.isHrManager || currentUser.isFinanceManager) ? 'مدیریت و منابع انسانی' : 'کارگاه',
        position: currentUser.isHrManager ? 'مدیر منابع انسانی' : currentUser.isFinanceManager ? 'مدیر مالی' : 'نیروی کارگاهی',
        workshopId: currentUser.workshopId || 'ws_1',
        username: currentUser.username,
        hireDate: '1403/01/01',
        status: 'ACTIVE',
        contractType: 'PERMANENT',
        shiftId: 'shift_standard_day',
        baseSalary: 35000000,
        hourlyRate: 198000,
        overtimeRate: 277000,
        remainingLeaveDays: 26,
        cardNumber: '6037997100000000',
        bankAccount: '100000000',
        shebaNumber: 'IR000000000000000000000000',
        isConfidential: false,
        permissions: currentUser.permissions || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        managementRoles: currentUser.managementRoles || [],
        isHrManager: Boolean(currentUser.isHrManager),
        isFinanceManager: Boolean(currentUser.isFinanceManager),
      } as Employee);
    }
    return list;
  }, [employees, currentUser]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'ACKNOWLEDGED'>('ALL');
  const [selectedTagFilter, setSelectedTagFilter] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [feedbackModalReport, setFeedbackModalReport] = useState<WorkReport | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Form State for new report
  const initialEmpId = currentUser.employeeId || eligibleEmployees[0]?.id || '';
  const initialEmp = eligibleEmployees.find(e => e.id === initialEmpId);
  const initialEmpName = initialEmp ? `${initialEmp.firstName} ${initialEmp.lastName}`.trim() : (currentUser.name || '');

  const [reportForm, setReportForm] = useState({
    employeeId: initialEmpId,
    customEmployeeName: initialEmpName,
    title: '',
    content: '',
    hoursSpent: 8,
    date: getTodayShamsi(),
    tag: 'تولید و ماشین‌کاری'
  });
  const [formMsg, setFormMsg] = useState<{ success: boolean; text: string } | null>(null);

  const tagsList = [
    'تولید و ماشین‌کاری',
    'مونتاژ و اتصالات',
    'سنباده‌زنی و پرداخت',
    'رنگ‌کاری و پلی‌استر',
    'انبارداری و لجستیک',
    'کنترل کیفیت',
    'فنی و تأسیسات',
    'امور اداری و منابع انسانی',
    'امور مالی و حسابداری',
    'سایر فعالیت‌ها'
  ];

  // Open modal with fresh state & properly set employee name
  const handleOpenSubmitModal = () => {
    const effectiveEmpId = currentUser.employeeId || eligibleEmployees[0]?.id || '';
    const emp = eligibleEmployees.find((e) => e.id === effectiveEmpId);
    const resolvedName = emp
      ? `${emp.firstName} ${emp.lastName}`.trim()
      : (currentUser.name || currentUser.username || 'پرسنل');

    setReportForm({
      employeeId: effectiveEmpId,
      customEmployeeName: resolvedName,
      title: '',
      content: '',
      hoursSpent: 8,
      date: getTodayShamsi(),
      tag: 'تولید و ماشین‌کاری'
    });
    setFormMsg(null);
    setIsSubmitModalOpen(true);
  };

  // Filtered reports
  const filteredReports = allReports.filter((rep) => {
    if (selectedEmployeeFilter !== 'ALL' && rep.employeeId !== selectedEmployeeFilter) {
      return false;
    }
    if (selectedStatusFilter === 'SUBMITTED' && rep.status === 'ACKNOWLEDGED') {
      return false;
    }
    if (selectedStatusFilter === 'ACKNOWLEDGED' && rep.status !== 'ACKNOWLEDGED') {
      return false;
    }
    if (selectedTagFilter !== 'ALL' && (!rep.tags || !rep.tags.includes(selectedTagFilter))) {
      return false;
    }
    if (selectedDateFilter && rep.date !== selectedDateFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      const matchEmp = rep.employeeName?.toLowerCase().includes(q);
      const matchTitle = rep.title?.toLowerCase().includes(q);
      const matchContent = rep.content?.toLowerCase().includes(q);
      if (!matchEmp && !matchTitle && !matchContent) return false;
    }
    return true;
  });

  const todayStr = getTodayShamsi();
  const todayCount = allReports.filter((r) => r.date === todayStr).length;
  const pendingCount = allReports.filter((r) => r.status !== 'ACKNOWLEDGED').length;
  const acknowledgedCount = allReports.filter((r) => r.status === 'ACKNOWLEDGED').length;

  const handleSubmitNewReport = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEmpId = reportForm.employeeId || currentUser.employeeId || currentUser.id || 'emp_user';
    const emp = eligibleEmployees.find((e) => e.id === effectiveEmpId);
    const empName = reportForm.customEmployeeName?.trim() || (emp ? `${emp.firstName} ${emp.lastName}`.trim() : currentUser.name);

    if (!reportForm.title.trim()) {
      setFormMsg({ success: false, text: 'عنوان فعالیت را وارد فرمایید.' });
      return;
    }
    if (!reportForm.content.trim()) {
      setFormMsg({ success: false, text: 'شرح فعالیت‌های انجام‌شده الزامی است.' });
      return;
    }

    const res = StorageService.submitWorkReport({
      employeeId: effectiveEmpId,
      employeeName: empName,
      title: reportForm.title.trim(),
      content: reportForm.content.trim(),
      hoursSpent: Number(reportForm.hoursSpent) || 8,
      tags: [reportForm.tag],
      date: reportForm.date
    });

    if (res.success) {
      setFormMsg({ success: true, text: 'گزارش کار با موفقیت ثبت شد.' });
      setTimeout(() => {
        setIsSubmitModalOpen(false);
        setFormMsg(null);
        onRefresh();
      }, 600);
    } else {
      setFormMsg({ success: false, text: res.message || 'خطا در ثبت گزارش کار.' });
    }
  };

  const handleSaveFeedback = () => {
    if (!feedbackModalReport) return;
    StorageService.reviewWorkReport(feedbackModalReport.id, feedbackText.trim(), currentUser.name);
    setFeedbackModalReport(null);
    setFeedbackText('');
    onRefresh();
  };

  const handleDeleteReport = (id: string) => {
    if (confirm('آیا از حذف این گزارش کار اطمینان دارید؟')) {
      StorageService.deleteWorkReport(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full" dir="rtl">
      {/* 1. Sleek Modern Header (No bulky gradient banners, no technical clutter) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 border border-slate-200">
            <ClipboardList className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              گزارش‌های کار روزانه
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              ثبت شفاف فعالیت‌های انجام‌شده، ساعات کارکرد و بازخورد کیفی مدیریت
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenSubmitModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت گزارش کار جدید</span>
        </button>
      </div>

      {/* 2. Key Metrics Row (Clean, minimal stat cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">کل گزارش‌ها</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{allReports.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">گزارش‌های امروز</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">{todayCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-amber-600 font-medium">در انتظار بررسی</div>
          <div className="text-xl font-bold font-mono text-amber-700 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-emerald-600 font-medium">تایید و رویت‌شده</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1">{acknowledgedCount}</div>
        </div>
      </div>

      {/* 3. Minimal Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو در عنوان، شرح یا نام پرسنل..."
              className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 bg-slate-50/50 focus:bg-white transition-colors"
            />
          </div>

          {/* Employee Filter (For managers/admins) */}
          {canManageReports && (
            <div>
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
              >
                <option value="ALL">همه پرسنل ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.position || 'پرسنل'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="SUBMITTED">در انتظار بررسی ({pendingCount})</option>
              <option value="ACKNOWLEDGED">تایید و رویت‌شده ({acknowledgedCount})</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
            >
              <option value="ALL">همه دسته‌بندی‌ها</option>
              {tagsList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Quick Filter & Clear */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">فیلتر تاریخ:</span>
            <button
              type="button"
              onClick={() => setSelectedDateFilter('')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedDateFilter === ''
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه تاریخ‌ها
            </button>
            <button
              type="button"
              onClick={() => setSelectedDateFilter(todayStr)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedDateFilter === todayStr
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              امروز ({todayStr})
            </button>
          </div>

          {(searchTerm || selectedEmployeeFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || selectedTagFilter !== 'ALL' || selectedDateFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedEmployeeFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSelectedTagFilter('ALL');
                setSelectedDateFilter('');
              }}
              className="text-slate-500 hover:text-slate-800 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>پاک‌کردن فیلترها</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Reports List (Modern cards with clean typographic hierarchy) */}
      <div className="space-y-3">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 text-slate-400 space-y-2.5">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">گزارش کاری با این مشخصات یافت نشد.</p>
            <p className="text-xs text-slate-400">
              با کلیک روی «ثبت گزارش کار جدید» می‌توانید فعالیت‌های انجام‌شده امروز را ثبت فرمایید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredReports.map((rep) => {
              const isOwner = currentUser.employeeId === rep.employeeId || currentUser.name === rep.employeeName;
              const canEditThis = canManageReports || isOwner;

              return (
                <div
                  key={rep.id}
                  className="p-5 bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl shadow-xs transition-all flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-3">
                    {/* Header Row: Author, Date, Duration, Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {rep.employeeName?.charAt(0) || 'پ'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{rep.employeeName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{rep.date}</span>
                            {rep.hoursSpent && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">·</span>
                                <span>{rep.hoursSpent} ساعت کارکرد</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {rep.status === 'ACKNOWLEDGED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-lg">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>تایید شده</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded-lg">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>در انتظار بررسی</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title and Category Tag */}
                    <div>
                      <h2 className="font-bold text-xs text-slate-900 leading-snug">
                        {rep.title}
                      </h2>
                      {rep.tags && rep.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {rep.tags.map((t, idx) => (
                            <span key={idx} className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Body Content */}
                    <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {rep.content}
                    </div>

                    {/* Admin Feedback Box */}
                    {rep.adminFeedback && (
                      <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-amber-900 flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                            <span>بازخورد مدیریت:</span>
                          </span>
                          <span className="text-[10px] text-amber-700 font-normal">
                            {rep.feedbackBy || 'مدیریت'} {rep.feedbackAt ? `(${rep.feedbackAt.substring(0, 10)})` : ''}
                          </span>
                        </div>
                        <p className="text-amber-950 font-medium leading-relaxed">{rep.adminFeedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      {canManageReports && (
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackModalReport(rep);
                            setFeedbackText(rep.adminFeedback || '');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-medium text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                          <span>{rep.adminFeedback ? 'ویرایش بازخورد مدیر' : 'ثبت بازخورد و تایید'}</span>
                        </button>
                      )}
                    </div>

                    {canEditThis && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(rep.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="حذف گزارش"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. SUBMIT WORK REPORT MODAL (Fixed Employee Name, Pure Clean Minimalist Form) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-800" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">ثبت گزارش کار روزانه</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewReport} className="p-5 space-y-4">
              {formMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    formMsg.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {formMsg.text}
                </div>
              )}

              {/* 1. Employee Name & Profile (Fixes: Easy selection / confirmation of personnel name) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">نام پرسنل گزارش‌دهنده:</label>
                  {currentUser.employeeId && reportForm.employeeId !== currentUser.employeeId && (
                    <button
                      type="button"
                      onClick={() => {
                        const myEmp = eligibleEmployees.find(e => e.id === currentUser.employeeId);
                        const myName = myEmp ? `${myEmp.firstName} ${myEmp.lastName}`.trim() : (currentUser.name || '');
                        setReportForm({
                          ...reportForm,
                          employeeId: currentUser.employeeId || '',
                          customEmployeeName: myName
                        });
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      انتخاب خودکار من ({currentUser.name})
                    </button>
                  )}
                </div>

                {/* Direct name input for transparent customization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      انتخاب پرونده پرسنلی:
                    </label>
                    <select
                      value={reportForm.employeeId}
                      onChange={(e) => {
                        const chosenId = e.target.value;
                        const empObj = eligibleEmployees.find(x => x.id === chosenId);
                        setReportForm({
                          ...reportForm,
                          employeeId: chosenId,
                          customEmployeeName: empObj ? `${empObj.firstName} ${empObj.lastName}`.trim() : reportForm.customEmployeeName
                        });
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
                      required
                    >
                      {eligibleEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.position || 'پرسنل'})
                          {emp.id === currentUser.employeeId ? ' [حساب شما]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      نام دقیق درج‌شده در گزارش:
                    </label>
                    <input
                      type="text"
                      value={reportForm.customEmployeeName}
                      onChange={(e) => setReportForm({ ...reportForm, customEmployeeName: e.target.value })}
                      placeholder="نام و نام خانوادگی پرسنل"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. Date & Hours Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">تاریخ فعالیت:</span>
                    <button
                      type="button"
                      onClick={() => setReportForm({ ...reportForm, date: getTodayShamsi() })}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                    >
                      امروز ({getTodayShamsi()})
                    </button>
                  </div>
                  <ShamsiDatePicker
                    label=""
                    value={reportForm.date}
                    onChange={(val) => setReportForm({ ...reportForm, date: val })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مدت زمان کارکرد (ساعت):
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={reportForm.hoursSpent}
                    onChange={(e) => setReportForm({ ...reportForm, hoursSpent: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 font-mono"
                    required
                  />
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {[4, 7.5, 8, 9, 10].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setReportForm({ ...reportForm, hoursSpent: h })}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-all cursor-pointer ${
                          reportForm.hoursSpent === h
                            ? 'bg-slate-900 text-white border-slate-900 font-bold'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {h} س
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Category Tag */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی یا بخش کار:</label>
                <select
                  value={reportForm.tag}
                  onChange={(e) => setReportForm({ ...reportForm, tag: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-800 cursor-pointer"
                >
                  {tagsList.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 4. Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان فعالیت / سفارش:</label>
                <input
                  type="text"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  placeholder="مثال: مونتاژ سفارش تخته نرد گردو پارت ۲۴، کنترل کیفیت، یا رسیدگی به انبار"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800"
                  required
                />
              </div>

              {/* 5. Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شرح جزئیات اقدامات انجام‌شده:</label>
                <textarea
                  rows={4}
                  value={reportForm.content}
                  onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })}
                  placeholder="شرح جزئیات کارهای انجام‌شده، تعداد قطعات آماده‌شده، نواقص مشاهده‌شده یا موانع کاری..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 leading-relaxed"
                  required
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
                >
                  ثبت نهایی گزارش کار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. FEEDBACK & REVIEW MODAL */}
      {feedbackModalReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-800" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">ثبت بازخورد و تایید مدیر</h3>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalReport(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div className="text-slate-500 text-[11px]">گزارش پرسنل:</div>
                <div className="font-bold text-slate-900 mt-0.5">{feedbackModalReport.employeeName}</div>
                <div className="text-slate-600 mt-1">{feedbackModalReport.title}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نظر، امتیاز یا دستور مدیریت:
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="مثال: گزارش رویت شد و اقدامات مورد تایید است. خداقوت."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-800 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => setFeedbackModalReport(null)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveFeedback}
                  className="px-4 py-2 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تایید و ثبت نظر مدیر</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
