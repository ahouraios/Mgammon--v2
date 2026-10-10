import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MessageSquare,
  Trash2,
  Calendar,
  User as UserIcon,
  Tag,
  Sparkles,
  ChevronLeft,
  X,
  FileText
} from 'lucide-react';
import { Employee, User, WorkReport } from '../../types';
import { StorageService } from '../../services/storage';
import { getTodayShamsi, getCurrentTimeStr } from '../../utils/dateUtils';
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
  const defaultEmpId = currentUser.employeeId || employees[0]?.id || '';
  const [reportForm, setReportForm] = useState({
    employeeId: defaultEmpId,
    title: '',
    content: '',
    hoursSpent: 8,
    date: getTodayShamsi(),
    tag: 'تولید و ماشین‌کاری'
  });
  const [formMsg, setFormMsg] = useState<{ success: boolean; text: string } | null>(null);

  const tagsList = [
    'تولید و ماشین‌کاری',
    'مونتاژ و بسته‌بندی',
    'انبارداری و لجستیک',
    'فنی و تعمیرات',
    'کنترل کیفیت',
    'امور اداری و منابع انسانی',
    'امور مالی و حسابداری',
    'سایر فعالیت‌ها'
  ];

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
    if (!reportForm.employeeId || !reportForm.title.trim() || !reportForm.content.trim()) {
      setFormMsg({ success: false, text: 'عنوان و شرح گزارش کار الزامی است.' });
      return;
    }

    const emp = employees.find((e) => e.id === reportForm.employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : currentUser.name;

    const res = StorageService.submitWorkReport({
      employeeId: reportForm.employeeId,
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
        setReportForm({
          employeeId: defaultEmpId,
          title: '',
          content: '',
          hoursSpent: 8,
          date: getTodayShamsi(),
          tag: 'تولید و ماشین‌کاری'
        });
        onRefresh();
      }, 700);
    } else {
      setFormMsg({ success: false, text: res.message || 'خطا در ثبت گزارش' });
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
    <div className="space-y-6" dir="rtl">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <ClipboardList className="w-7 h-7 text-teal-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>سامانه گزارش‌های کار روزانه پرسنل</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/30 border border-teal-400/40 text-teal-200">
                  شفافیت کارکرد
                </span>
              </h2>
              <p className="text-xs text-teal-100/90 mt-1">
                ثبت شرح فعالیت‌های روزانه، ثبت نظر و بازخورد مدیر و نظارت مدیر منابع انسانی و مدیریت ارشد
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setReportForm((prev) => ({
                ...prev,
                employeeId: currentUser.employeeId || employees[0]?.id || '',
                date: getTodayShamsi()
              }));
              setIsSubmitModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-white text-teal-900 font-bold text-xs hover:bg-teal-50 transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-teal-700" />
            <span>ثبت گزارش کار روزانه جدید</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-teal-200 block">کل گزارش‌های ثبت‌شده</span>
            <span className="text-lg font-bold font-mono text-white">{allReports.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-teal-200 block">گزارش‌های امروز ({todayStr})</span>
            <span className="text-lg font-bold font-mono text-amber-300">{todayCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-teal-200 block">در انتظار بررسی مدیر</span>
            <span className="text-lg font-bold font-mono text-teal-200">{pendingCount}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-teal-200 block">تایید و رویت‌شده توسط مدیر</span>
            <span className="text-lg font-bold font-mono text-emerald-300">{acknowledgedCount}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو در عنوان، شرح یا نام پرسنل..."
              className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Employee Filter */}
          {canManageReports && (
            <div>
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="ALL">همه پرسنل و مدیران ({employees.length})</option>
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
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="SUBMITTED">در انتظار بررسی مدیر ({pendingCount})</option>
              <option value="ACKNOWLEDGED">رویت و تایید شده ({acknowledgedCount})</option>
            </select>
          </div>

          {/* Tag Filter */}
          <div>
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">همه دسته‌بندی‌ها و تگ‌ها</option>
              {tagsList.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter & Clear */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">فیلتر تاریخ:</span>
            <button
              type="button"
              onClick={() => setSelectedDateFilter('')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedDateFilter === '' ? 'bg-teal-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه تاریخ‌ها
            </button>
            <button
              type="button"
              onClick={() => setSelectedDateFilter(todayStr)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedDateFilter === todayStr ? 'bg-teal-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
              className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>پاک‌کردن فیلترها</span>
            </button>
          )}
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-3">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">گزارش کاری با این مشخصات یافت نشد.</p>
            <p className="text-xs text-slate-400">
              می‌توانید با دکمه «ثبت گزارش کار روزانه جدید» فعالیت‌های انجام‌شده امروز را ثبت فرمایید.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((rep) => {
              const isOwner = currentUser.employeeId === rep.employeeId;
              const canEditThis = canManageReports || isOwner;

              return (
                <div
                  key={rep.id}
                  className="p-5 bg-white border border-slate-200 hover:border-teal-300 rounded-3xl shadow-xs transition-all space-y-3.5 relative"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {rep.employeeName?.charAt(0) || 'پ'}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">{rep.employeeName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{rep.date}</span>
                          {rep.hoursSpent && <span>• ⏱️ {rep.hoursSpent} ساعت کار</span>}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                        rep.status === 'ACKNOWLEDGED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {rep.status === 'ACKNOWLEDGED' ? '✓ تایید و رویت مدیر' : 'در انتظار بررسی'}
                    </span>
                  </div>

                  {/* Title and Tag */}
                  <div>
                    <h3 className="font-bold text-xs text-teal-900 mb-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{rep.title}</span>
                    </h3>
                    {rep.tags && rep.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rep.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {rep.content}
                  </div>

                  {/* Admin Feedback Box */}
                  {rep.adminFeedback && (
                    <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                      <div className="font-bold text-amber-900 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                          <span>بازخورد و دستور مدیریت:</span>
                        </span>
                        <span className="text-[10px] text-amber-700 font-normal">
                          {rep.feedbackBy || 'مدیریت'} {rep.feedbackAt ? `(${rep.feedbackAt.substring(0, 10)})` : ''}
                        </span>
                      </div>
                      <p className="text-amber-950 font-medium leading-relaxed">{rep.adminFeedback}</p>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div>
                      {canManageReports && (
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackModalReport(rep);
                            setFeedbackText(rep.adminFeedback || '');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 font-bold text-[11px] border border-teal-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{rep.adminFeedback ? 'ویرایش بازخورد مدیر' : 'ثبت بازخورد / تایید'}</span>
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
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW REPORT SUBMISSION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-indigo-800 text-white">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-300" />
                <h3 className="text-sm font-bold">ثبت گزارش کار روزانه</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewReport} className="p-6 space-y-4">
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

              {/* Employee Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">پرسنل گزارش‌دهنده:</label>
                  {currentUser.employeeId && reportForm.employeeId !== currentUser.employeeId && (
                    <button
                      type="button"
                      onClick={() => setReportForm({ ...reportForm, employeeId: currentUser.employeeId || '' })}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                    >
                      ثبت برای خودم ({currentUser.name})
                    </button>
                  )}
                </div>
                {canManageReports ? (
                  <select
                    value={reportForm.employeeId}
                    onChange={(e) => setReportForm({ ...reportForm, employeeId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
                    required
                  >
                    {isSeniorAdmin && (
                      <option value="usr_admin">
                        {currentUser.name} [مدیر ارشد کارگاه]
                      </option>
                    )}
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.position || 'پرسنل'}{emp.isHrManager ? ' - مدیر منابع انسانی' : emp.isFinanceManager ? ' - مدیر مالی' : ''})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-100 font-bold text-slate-800">
                    {currentUser.name} ({currentUser.username})
                  </div>
                )}
              </div>

              {/* Date & Hours Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <ShamsiDatePicker
                    label="تاریخ گزارش"
                    value={reportForm.date}
                    onChange={(val) => setReportForm({ ...reportForm, date: val })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">مدت زمان فعالیت (ساعت):</label>
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={reportForm.hoursSpent}
                    onChange={(e) => setReportForm({ ...reportForm, hoursSpent: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان فعالیت / وظیفه:</label>
                <input
                  type="text"
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  placeholder="مثال: مونتاژ سفارش پارت ۴۲، کنترل کیفیت قطعات یا بررسی پرونده پرسنل"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              {/* Tag / Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی فعالیت:</label>
                <select
                  value={reportForm.tag}
                  onChange={(e) => setReportForm({ ...reportForm, tag: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {tagsList.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">شرح کامل فعالیت‌های انجام‌شده:</label>
                <textarea
                  rows={4}
                  value={reportForm.content}
                  onChange={(e) => setReportForm({ ...reportForm, content: e.target.value })}
                  placeholder="شرح جزئیات اقدامات، تعداد قطعات تولیدشده، نواقص مشاهده‌شده یا پیشرفت کار..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-700 to-indigo-800 hover:opacity-95 transition-all shadow-md cursor-pointer"
                >
                  ثبت قطعی گزارش کار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FEEDBACK & REVIEW MODAL */}
      {feedbackModalReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-teal-800 text-white">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-300" />
                <h3 className="text-sm font-bold">ثبت بازخورد و تایید مدیر</h3>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalReport(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <span className="text-slate-500 block">گزارش پرسنل:</span>
                <span className="font-bold text-slate-900">{feedbackModalReport.employeeName}</span>
                <span className="text-slate-600 block mt-1">{feedbackModalReport.title}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نظر، امتیاز یا دستور مدیریت برای این گزارش:
                </label>
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="مثال: گزارش رویت شد و اقدامات مورد تایید است. کار با کیفیت انجام شده."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
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
                  className="px-5 py-2 rounded-xl font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
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
