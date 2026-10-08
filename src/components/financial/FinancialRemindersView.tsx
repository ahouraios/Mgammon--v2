import React, { useState } from 'react';
import {
  Receipt,
  CreditCard,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Send,
  Bell,
  Trash2,
  Edit2,
  Eye,
  Check,
  X,
  Building2,
  Hash,
  AlertCircle,
  FileText,
  BadgeAlert,
  ArrowUpRight,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import {
  FinancialReminder,
  FinancialReminderType,
  FinancialReminderPriority,
  FinancialReminderStatus,
  User,
  Employee
} from '../../types';
import { StorageService } from '../../services/storage';
import {
  formatCurrencyTomans,
  getTodayShamsi,
  toEnglishDigits
} from '../../utils/dateUtils';

interface FinancialRemindersViewProps {
  currentUser: User | null;
  employees: Employee[];
  reminders: FinancialReminder[];
  onRefresh: () => void;
  canManage: boolean;
}

export const FinancialRemindersView: React.FC<FinancialRemindersViewProps> = ({
  currentUser,
  employees,
  reminders,
  onRefresh,
  canManage,
}) => {
  const isSuperAdmin = currentUser?.role === 'ADMIN' || Boolean(currentUser?.isSuperAdmin);
  const isFinanceManager = Boolean(currentUser?.isFinanceManager) || currentUser?.managementRoles?.includes('FINANCE_OFFICER');

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | FinancialReminderType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FinancialReminderStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | FinancialReminderPriority>('ALL');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<FinancialReminder | null>(null);
  const [viewingReminder, setViewingReminder] = useState<FinancialReminder | null>(null);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [feedbackModalReminder, setFeedbackModalReminder] = useState<FinancialReminder | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<FinancialReminderType>('CHECK');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formAmountDisplay, setFormAmountDisplay] = useState('');
  const [formDueDate, setFormDueDate] = useState(getTodayShamsi());
  const [formDebtorCreditor, setFormDebtorCreditor] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formCheckNumber, setFormCheckNumber] = useState('');
  const [formInstallmentNumber, setFormInstallmentNumber] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<FinancialReminderPriority>('HIGH');
  const [formSendToAdmin, setFormSendToAdmin] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setFormTitle('');
    setFormType('CHECK');
    setFormAmount(0);
    setFormAmountDisplay('');
    setFormDueDate(getTodayShamsi());
    setFormDebtorCreditor('');
    setFormBankName('');
    setFormCheckNumber('');
    setFormInstallmentNumber('');
    setFormDescription('');
    setFormPriority('HIGH');
    setFormSendToAdmin(true);
    setFormError(null);
    setEditingReminder(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: FinancialReminder) => {
    setEditingReminder(item);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormAmount(item.amount);
    setFormAmountDisplay(item.amount ? item.amount.toLocaleString('en-US') : '');
    setFormDueDate(item.dueDate);
    setFormDebtorCreditor(item.debtorCreditorName || '');
    setFormBankName(item.bankName || '');
    setFormCheckNumber(item.checkNumber || '');
    setFormInstallmentNumber(item.installmentNumber || '');
    setFormDescription(item.description || '');
    setFormPriority(item.priority);
    setFormSendToAdmin(item.isSentToSeniorAdmin);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('لطفاً عنوان صورتحساب، چک یا قسط را وارد نمایید.');
      return;
    }
    if (!formDueDate.trim()) {
      setFormError('لطفاً تاریخ سررسید را مشخص نمایید.');
      return;
    }
    if (!formDebtorCreditor.trim()) {
      setFormError('لطفاً نام طرف حساب، صادرکننده یا ذینفع را وارد کنید.');
      return;
    }

    const currentEmp = employees.find(emp => emp.id === currentUser?.employeeId);
    const creatorName = currentEmp ? `${currentEmp.firstName} ${currentEmp.lastName} (مدیر مالی)` : (currentUser?.name || 'مدیر مالی');

    if (editingReminder) {
      const updated: FinancialReminder = {
        ...editingReminder,
        title: formTitle.trim(),
        type: formType,
        amount: formAmount,
        dueDate: formDueDate.trim(),
        debtorCreditorName: formDebtorCreditor.trim(),
        bankName: formBankName.trim() || undefined,
        checkNumber: formCheckNumber.trim() || undefined,
        installmentNumber: formInstallmentNumber.trim() || undefined,
        description: formDescription.trim() || undefined,
        priority: formPriority,
        isSentToSeniorAdmin: formSendToAdmin,
        sentAt: formSendToAdmin && !editingReminder.isSentToSeniorAdmin ? `${getTodayShamsi()}` : editingReminder.sentAt
      };
      StorageService.updateFinancialReminder(updated, currentUser || undefined);
      setActionSuccess('یادآوری مالی با موفقیت بروزرسانی شد.');
    } else {
      const newReminder: FinancialReminder = {
        id: `fin_rem_${Date.now()}`,
        companyId: currentUser?.companyId || 'comp_mgommon_01',
        title: formTitle.trim(),
        type: formType,
        amount: formAmount,
        dueDate: formDueDate.trim(),
        debtorCreditorName: formDebtorCreditor.trim(),
        bankName: formBankName.trim() || undefined,
        checkNumber: formCheckNumber.trim() || undefined,
        installmentNumber: formInstallmentNumber.trim() || undefined,
        description: formDescription.trim() || undefined,
        priority: formPriority,
        status: 'PENDING',
        createdByEmployeeId: currentUser?.employeeId || 'usr_finance',
        createdByName: creatorName,
        createdAt: getTodayShamsi(),
        isSentToSeniorAdmin: formSendToAdmin,
        sentAt: formSendToAdmin ? getTodayShamsi() : undefined,
        seenBySeniorAdmin: false
      };
      StorageService.addFinancialReminder(newReminder, currentUser || undefined);
      setActionSuccess('یادآوری مالی ثبت شد و نوتیفیکیشن آن به کارتابل مدیر ارشد ارسال گردید.');
    }

    setIsFormModalOpen(false);
    resetForm();
    onRefresh();
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('آیا از حذف این یادآوری مالی اطمینان دارید؟')) {
      StorageService.deleteFinancialReminder(id, currentUser || undefined);
      onRefresh();
      setActionSuccess('مورد مالی با موفقیت حذف گردید.');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleSendToAdmin = (id: string) => {
    StorageService.sendFinancialReminderToAdmin(id);
    onRefresh();
    setActionSuccess('نوتیفیکیشن و هشدار سررسید با موفقیت به کارتابل مدیر ارشد ارسال شد.');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleMarkSeen = (id: string) => {
    StorageService.markFinancialReminderSeen(id);
    onRefresh();
  };

  const handleStatusChange = (id: string, status: FinancialReminderStatus, feedback?: string) => {
    StorageService.changeFinancialReminderStatus(id, status, feedback);
    onRefresh();
    setFeedbackModalReminder(null);
    setFeedbackInput('');
    setActionSuccess(`وضعیت با موفقیت به "${status === 'PAID' ? 'تسویه و پرداخت شده' : status === 'APPROVED' ? 'تایید شده' : status}" تغییر یافت.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Filtered List
  const filteredReminders = reminders.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.debtorCreditorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.checkNumber && item.checkNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.bankName && item.bankName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || item.priority === priorityFilter;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  // Aggregated Stats
  const checksSum = reminders
    .filter(r => r.type === 'CHECK' && r.status !== 'PAID')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const installmentsSum = reminders
    .filter(r => r.type === 'INSTALLMENT' && r.status !== 'PAID')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const pendingSentToAdminCount = reminders.filter(r => r.isSentToSeniorAdmin && r.status === 'PENDING').length;
  const urgentCount = reminders.filter(r => r.priority === 'URGENT' && r.status !== 'PAID').length;

  const getTypeBadge = (type: FinancialReminderType) => {
    switch (type) {
      case 'CHECK':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>چک صیادی</span>
          </span>
        );
      case 'INSTALLMENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
            <CalendarClock className="w-3.5 h-3.5 text-blue-600" />
            <span>سررسید قسط</span>
          </span>
        );
      case 'INVOICE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            <Receipt className="w-3.5 h-3.5 text-amber-600" />
            <span>صورتحساب / فاکتور</span>
          </span>
        );
      case 'BILL':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>قبض کارگاه</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            <CreditCard className="w-3.5 h-3.5 text-slate-600" />
            <span>سایر مالی</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: FinancialReminderPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>فوری و ضروری</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>اولویت بالا</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <span>عادی</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: FinancialReminderStatus) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>تسویه و پرداخت شده</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>تایید شده توسط مدیر ارشد</span>
          </span>
        );
      case 'SEEN':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span>مشاهده شده توسط مدیر ارشد</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>رد شده / لغو</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>در انتظار بررسی مدیر ارشد</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-500/20 backdrop-blur-md rounded-2xl border border-indigo-400/30 text-indigo-300">
                <Receipt className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                کارتابل صورتحساب‌ها، چک‌های صیادی و اقساط کارگاه
              </h1>
            </div>
            <p className="text-xs text-indigo-200/80 max-w-2xl leading-relaxed">
              سامانه اختصاصی هماهنگی مدیر منابع مالی و مدیر ارشد: ثبت و ارسال یادآوری‌های سررسید چک، اقساط تسهیلات، صورتحساب‌های خرید و صدور دستور پرداخت.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {(isSuperAdmin || isFinanceManager || canManage) && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer border border-indigo-400/30"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت چک / قسط / صورتحساب جدید</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs">{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Checks */}
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-purple-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <CheckCheck className="w-4 h-4 text-purple-600" />
              <span>چک‌های صیادی سررسید نزدیک</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 font-bold">
              {reminders.filter(r => r.type === 'CHECK' && r.status !== 'PAID').length} فقره
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-purple-950">
            {formatCurrencyTomans(checksSum)}
          </div>
          <div className="text-[10px] text-slate-400">
            مجموع مبالغ چک‌های صیادی پرداخت‌نشده
          </div>
        </div>

        {/* Total Active Installments */}
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-blue-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-blue-600" />
              <span>سررسید اقساط و وام‌ها</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 font-bold">
              {reminders.filter(r => r.type === 'INSTALLMENT' && r.status !== 'PAID').length} قسط
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-blue-950">
            {formatCurrencyTomans(installmentsSum)}
          </div>
          <div className="text-[10px] text-slate-400">
            تسهیلات تجهیزات و ماشین‌آلات کارگاه
          </div>
        </div>

        {/* Pending Sent To Senior Admin */}
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span className="flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>در کارتابل مدیر ارشد</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 font-bold text-amber-800">
              {pendingSentToAdminCount} مورد
            </span>
          </div>
          <div className="text-lg font-bold text-amber-950">
            {pendingSentToAdminCount > 0 ? 'در انتظار دستور پرداخت' : 'همه موارد بررسی شده'}
          </div>
          <div className="text-[10px] text-slate-400">
            نوتیفیکیشن فعال در پنل مدیریت ارشد
          </div>
        </div>

        {/* Urgent Reminders */}
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-rose-700 font-semibold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>موارد فوری و اضطراری</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 font-bold text-rose-800">
              {urgentCount} مورد
            </span>
          </div>
          <div className="text-lg font-bold text-rose-950">
            {urgentCount > 0 ? `${urgentCount} سررسید فوری` : 'مورد اضطراری وجود ندارد'}
          </div>
          <div className="text-[10px] text-slate-400">
            نیاز به تسویه حساب فوری
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجوی عنوان، طرف حساب، شماره چک یا بانک..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">همه وضعیت‌ها</option>
              <option value="PENDING">در انتظار بررسی</option>
              <option value="SEEN">مشاهده شده</option>
              <option value="APPROVED">تایید شده</option>
              <option value="PAID">تسویه و پرداخت شده</option>
            </select>

            {/* Priority Select */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="text-xs rounded-xl border border-slate-200 py-1.5 px-3 bg-white text-slate-700 focus:outline-none"
            >
              <option value="ALL">همه اولویت‌ها</option>
              <option value="URGENT">فوری و ضروری</option>
              <option value="HIGH">اولویت بالا</option>
              <option value="NORMAL">عادی</option>
            </select>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-slate-400 ml-1">دسته‌بندی:</span>
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه موارد ({reminders.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('CHECK')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              typeFilter === 'CHECK'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>چک‌های صیادی ({reminders.filter(r => r.type === 'CHECK').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('INSTALLMENT')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              typeFilter === 'INSTALLMENT'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>سررسید اقساط ({reminders.filter(r => r.type === 'INSTALLMENT').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('INVOICE')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              typeFilter === 'INVOICE'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>صورتحساب و فاکتورها ({reminders.filter(r => r.type === 'INVOICE').length})</span>
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="space-y-3">
        {filteredReminders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold">هیچ یادآوری یا صورتحسابی با این فیلترها یافت نشد.</p>
            <p className="text-[11px] text-slate-400">می‌توانید با دکمه بالا مورد مالی جدیدی ثبت نمایید.</p>
          </div>
        ) : (
          filteredReminders.map((item) => {
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all p-4.5 space-y-3 shadow-xs hover:shadow-md ${
                  item.priority === 'URGENT' && item.status !== 'PAID'
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getTypeBadge(item.type)}
                    {getPriorityBadge(item.priority)}
                    {getStatusBadge(item.status)}
                    {item.isSentToSeniorAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Bell className="w-3 h-3 text-emerald-600" />
                        <span>ارسال شده به مدیر ارشد</span>
                      </span>
                    )}
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 block sm:inline ml-1">مبلغ:</span>
                    <span className="font-bold font-mono text-base text-slate-900">
                      {formatCurrencyTomans(item.amount)}
                    </span>
                  </div>
                </div>

                {/* Content row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="md:col-span-2 space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{item.title}</span>
                    </h3>
                    <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-500 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>طرف حساب: <strong>{item.debtorCreditorName}</strong></span>
                      </span>
                      {item.bankName && (
                        <span className="text-slate-400">• بانک: <strong className="text-slate-700">{item.bankName}</strong></span>
                      )}
                      {item.checkNumber && (
                        <span className="text-slate-400">• شناسه چک: <strong className="font-mono text-slate-700">{item.checkNumber}</strong></span>
                      )}
                      {item.installmentNumber && (
                        <span className="text-slate-400">• شماره قسط: <strong className="text-indigo-700">{item.installmentNumber}</strong></span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Due Date & Metadata column */}
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 text-xs space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 text-[11px]">تاریخ سررسید:</span>
                        <span className="font-bold font-mono text-slate-900 text-xs bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          {item.dueDate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="text-slate-400">ثبت‌کننده:</span>
                        <span className="font-medium text-slate-700">{item.createdByName}</span>
                      </div>
                      {item.sentAt && (
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="text-slate-400">ارسال نوتیفیکیشن:</span>
                          <span className="font-mono text-slate-700">{item.sentAt}</span>
                        </div>
                      )}
                    </div>

                    {item.adminFeedback && (
                      <div className="pt-2 border-t border-slate-200 text-[11px] space-y-0.5">
                        <span className="font-bold text-indigo-900 block">دستور / یادداشت مدیر ارشد:</span>
                        <span className="text-indigo-800 block bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-100">
                          {item.adminFeedback}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Send notification to senior admin */}
                    {!item.isSentToSeniorAdmin && (
                      <button
                        type="button"
                        onClick={() => handleSendToAdmin(item.id)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 border border-indigo-200 transition-colors cursor-pointer"
                        title="ارسال مستقیم به کارتابل مدیر ارشد"
                      >
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        <span>ارسال نوتیفیکیشن به مدیر ارشد</span>
                      </button>
                    )}

                    {/* Senior Admin Actions */}
                    {isSuperAdmin && (
                      <>
                        {item.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleMarkSeen(item.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1 border border-sky-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-600" />
                            <span>مشاهده شد</span>
                          </button>
                        )}

                        {item.status !== 'APPROVED' && item.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'APPROVED')}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center gap-1 border border-indigo-300 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-indigo-600" />
                            <span>تایید پرداخت</span>
                          </button>
                        )}

                        {item.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item.id, 'PAID')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ثبت تسویه و پرداخت گردید</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackModalReminder(item);
                            setFeedbackInput(item.adminFeedback || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>ثبت دستور مدیر</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                      title="ویرایش مشخصات"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {(isSuperAdmin || canManage) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingReminder ? 'ویرایش مورد مالی / چک / قسط' : 'ثبت چک، قسط یا صورتحساب جدید'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ارسال مستقیم به کارتابل و پنل نوتیفیکیشن مدیر ارشد
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Type Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نوع مورد مالی <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType('CHECK')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      formType === 'CHECK'
                        ? 'bg-purple-50 text-purple-800 border-purple-300 ring-2 ring-purple-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCheck className="w-4 h-4 text-purple-600" />
                    <span>چک صیادی</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('INSTALLMENT')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      formType === 'INSTALLMENT'
                        ? 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarClock className="w-4 h-4 text-blue-600" />
                    <span>سررسید قسط</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('INVOICE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      formType === 'INVOICE'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-amber-600" />
                    <span>صورتحساب / فاکتور</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  موضوع و شرح مختصر <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: چک خرید الوار راش و گردو / قسط وام دستگاه CNC"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Amount & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    مبلغ (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={formAmountDisplay}
                    onChange={(e) => {
                      const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                      if (!raw) {
                        setFormAmountDisplay('');
                        setFormAmount(0);
                      } else {
                        const num = parseInt(raw, 10);
                        setFormAmountDisplay(num.toLocaleString('en-US'));
                        setFormAmount(num);
                      }
                    }}
                    placeholder="مثال: ۲۵,۰۰۰,۰۰۰"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono font-bold text-left"
                  />
                  {formAmount > 0 && (
                    <span className="text-[10px] text-indigo-700 mt-1 block">
                      معادل: {formatCurrencyTomans(formAmount)}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    تاریخ سررسید (شمسی) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(toEnglishDigits(e.target.value))}
                    placeholder="1405/07/28"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-left font-bold"
                  />
                </div>
              </div>

              {/* Debtor / Creditor */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  طرف حساب / نام ذینفع یا صادرکننده <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بازرگانی چوب برادران رضوی / بانک ملت / فروشگاه کمالی"
                  value={formDebtorCreditor}
                  onChange={(e) => setFormDebtorCreditor(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Specific fields depending on type */}
              {formType === 'CHECK' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-purple-50/60 rounded-2xl border border-purple-200">
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      نام بانک و شعبه
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: بانک ملت - شعبه آزادی مشهد"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-purple-200 bg-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-900 mb-1">
                      شماره سریال یا شناسه صیادی (۱۶ رقم)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="۹۸۴۳۵/۰۲ یا شناسه ۱۶ رقمی"
                      value={formCheckNumber}
                      onChange={(e) => setFormCheckNumber(toEnglishDigits(e.target.value))}
                      className="w-full text-xs p-2 rounded-xl border border-purple-200 bg-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {formType === 'INSTALLMENT' && (
                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200">
                  <label className="block text-[11px] font-bold text-blue-900 mb-1">
                    شماره قسط و اطلاعات تسهیلات
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: قسط ۵ از ۱۲ - تسهیلات خرید دستگاه فرز"
                    value={formInstallmentNumber}
                    onChange={(e) => setFormInstallmentNumber(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-blue-200 bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  فوریت و اهمیت
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="NORMAL"
                      checked={formPriority === 'NORMAL'}
                      onChange={() => setFormPriority('NORMAL')}
                      className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>عادی</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer ml-3">
                    <input
                      type="radio"
                      name="priority"
                      value="HIGH"
                      checked={formPriority === 'HIGH'}
                      onChange={() => setFormPriority('HIGH')}
                      className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>اولویت بالا</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-rose-700 cursor-pointer font-bold ml-3">
                    <input
                      type="radio"
                      name="priority"
                      value="URGENT"
                      checked={formPriority === 'URGENT'}
                      onChange={() => setFormPriority('URGENT')}
                      className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span>فوری و ضروری (هشدار قرمز)</span>
                  </label>
                </div>
              </div>

              {/* Send Notification Checkbox */}
              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="sendToAdminCheck"
                  checked={formSendToAdmin}
                  onChange={(e) => setFormSendToAdmin(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="sendToAdminCheck" className="text-xs text-indigo-950 font-bold cursor-pointer">
                  <span>ارسال مستقیم به‌عنوان نوتیفیکیشن اختصاصی به کارتابل مدیر ارشد</span>
                  <span className="block text-[11px] font-normal text-indigo-800/80 mt-0.5">
                    با فعال بودن این گزینه، هشدار و اطلاعات این چک/قسط بلافاصله در داشبورد و آیکون زنگوله نوتیفیکیشن مدیر ارشد نمایان خواهد شد.
                  </span>
                </label>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  توضیحات و اقلام تکمیلی
                </label>
                <textarea
                  rows={2}
                  placeholder="توضیحات فاکتور، موارد مصرفی در کارگاه یا نکات پرداخت..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {editingReminder ? 'بروزرسانی تغییرات' : 'ثبت و ارسال نوتیفیکیشن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SENIOR ADMIN FEEDBACK / INSTRUCTIONS MODAL */}
      {feedbackModalReminder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>ثبت دستور مدیر ارشد برای حسابداری</span>
              </h3>
              <button
                type="button"
                onClick={() => setFeedbackModalReminder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              موضوع: <strong>{feedbackModalReminder.title}</strong>
              <div className="font-mono text-slate-800 mt-0.5">
                مبلغ: {formatCurrencyTomans(feedbackModalReminder.amount)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                دستور یا یادداشت شما:
              </label>
              <textarea
                rows={3}
                placeholder="مثال: از حساب جاری ملت پرداخت شود / با آقای رضوی تماس گرفته و تمدید شود..."
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFeedbackModalReminder(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  StorageService.markFinancialReminderSeen(feedbackModalReminder.id, feedbackInput.trim());
                  onRefresh();
                  setFeedbackModalReminder(null);
                  setActionSuccess('دستور مدیر ارشد با موفقیت ثبت شد.');
                  setTimeout(() => setActionSuccess(null), 3000);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
              >
                ثبت دستور
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
