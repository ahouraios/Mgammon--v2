import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Check,
  X,
  HelpCircle,
  Trash2,
  Receipt,
  CreditCard,
  CheckCircle2,
  Image as ImageIcon,
  PlusCircle,
  Coins,
  Eye,
  Home,
  Search,
  Filter,
  Layers
} from 'lucide-react';
import { AdvanceRequest, Employee, User, WorkerExpense, MiscPayment, HomeworkTask, HomeworkTaskStatus } from '../../types';
import { StorageService } from '../../services/storage';
import {
  formatCurrencyTomans,
  formatNumberFa,
  getTodayShamsi,
  getTodayShamsiDetailed,
  toEnglishDigits
} from '../../utils/dateUtils';

interface AdvancesViewProps {
  advances: AdvanceRequest[];
  employees: Employee[];
  currentUser: User;
  onRefresh: () => void;
  canApprove: boolean;
}

export const AdvancesView: React.FC<AdvancesViewProps> = ({
  advances,
  employees,
  currentUser,
  onRefresh,
  canApprove,
}) => {
  const shamsiDetail = getTodayShamsiDetailed();
  const currentMonthStr = shamsiDetail.dateString.substring(0, 7);

  // Dynamic month options
  const persianMonthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];
  const repayMonthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return {
      value: `${shamsiDetail.year}/${m}`,
      label: `${persianMonthNames[i]} ${shamsiDetail.year}${`${shamsiDetail.year}/${m}` === currentMonthStr ? ' (دوره جاری)' : ''}`
    };
  });

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deletingAdvanceId, setDeletingAdvanceId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: currentUser.employeeId || employees[0]?.id || '',
    amount: 5000000,
    repayMonth: currentMonthStr,
    reason: '',
  });

  const handleOpenSubmitModal = () => {
    setFormError(null);
    setFormData({
      employeeId: currentUser.employeeId || employees[0]?.id || '',
      amount: 5000000,
      repayMonth: currentMonthStr,
      reason: '',
    });
    setIsSubmitModalOpen(true);
  };

  const filteredAdvances = advances.filter((adv) => {
    if (currentUser.role === 'EMPLOYEE') {
      if (!currentUser.employeeId || adv.employeeId !== currentUser.employeeId) {
        return false;
      }
    }
    return true;
  });

  const [activeSection, setActiveSection] = useState<'ADVANCES' | 'MISC_PAYMENTS' | 'EXPENSES' | 'HOMEWORK'>('ADVANCES');
  const [settlingExpense, setSettlingExpense] = useState<WorkerExpense | null>(null);
  const [settlementNotes, setSettlementNotes] = useState('');
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Homework Tasks State (کار در منزل و کارمزدی)
  const [homeworkStatusFilter, setHomeworkStatusFilter] = useState<'ALL' | 'PENDING' | 'SETTLED' | 'ADDED_TO_SALARY' | 'REJECTED'>('ALL');
  const [homeworkEmployeeFilter, setHomeworkEmployeeFilter] = useState<string>('ALL');
  const [homeworkSearch, setHomeworkSearch] = useState<string>('');
  const [rejectingHomeworkTask, setRejectingHomeworkTask] = useState<HomeworkTask | null>(null);
  const [homeworkRejectionReason, setHomeworkRejectionReason] = useState<string>('');
  const [isManagerAddHomeworkModalOpen, setIsManagerAddHomeworkModalOpen] = useState(false);
  const [managerHomeworkForm, setManagerHomeworkForm] = useState<{
    employeeId: string;
    taskType: string;
    quantity: number | '';
    unit: string;
    wagePerUnit: number | '';
    date: string;
    orderCode: string;
    notes: string;
    decision: 'PENDING' | 'SETTLE_NOW' | 'ADD_TO_SALARY';
  }>({
    employeeId: employees.find(e => e.isHomeworkWorker)?.id || employees[0]?.id || '',
    taskType: 'مونتاژ قطعات و اتصالات',
    quantity: 10,
    unit: 'عدد',
    wagePerUnit: 25000,
    date: getTodayShamsi(),
    orderCode: '',
    notes: '',
    decision: 'PENDING',
  });
  const [managerHomeworkMsg, setManagerHomeworkMsg] = useState<{ success: boolean; text: string } | null>(null);

  const homeworkTasks = StorageService.getHomeworkTasks(currentUser);
  const pendingHomeworkTasks = homeworkTasks.filter((t) => t.status === 'PENDING');
  const pendingHomeworkCount = pendingHomeworkTasks.length;
  const totalPendingHomeworkWage = pendingHomeworkTasks.reduce((sum, t) => sum + t.totalWage, 0);
  const totalSettledHomeworkWage = homeworkTasks.filter((t) => t.status === 'SETTLED').reduce((sum, t) => sum + t.totalWage, 0);
  const totalAddedToSalaryHomeworkWage = homeworkTasks.filter((t) => t.status === 'ADDED_TO_SALARY').reduce((sum, t) => sum + t.totalWage, 0);

  const filteredHomeworkTasks = homeworkTasks.filter((t) => {
    if (homeworkStatusFilter !== 'ALL' && t.status !== homeworkStatusFilter) return false;
    if (homeworkEmployeeFilter !== 'ALL' && t.employeeId !== homeworkEmployeeFilter) return false;
    if (homeworkSearch.trim()) {
      const q = homeworkSearch.trim().toLowerCase();
      const matchName = t.employeeName.toLowerCase().includes(q);
      const matchType = t.taskType.toLowerCase().includes(q);
      const matchOrder = t.orderCode ? t.orderCode.toLowerCase().includes(q) : false;
      const matchNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
      if (!matchName && !matchType && !matchOrder && !matchNotes) return false;
    }
    return true;
  });

  const handleHomeworkAction = (
    taskId: string,
    action: 'SETTLE_NOW' | 'ADD_TO_SALARY' | 'REJECT',
    reason?: string
  ) => {
    StorageService.reviewHomeworkTask(taskId, action, currentUser.name, reason);
    if (action === 'REJECT') {
      setRejectingHomeworkTask(null);
      setHomeworkRejectionReason('');
    }
    onRefresh();
  };

  const handleManagerAddHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerHomeworkForm.employeeId) {
      setManagerHomeworkMsg({ success: false, text: 'لطفاً پرسنل مورد نظر را انتخاب کنید.' });
      return;
    }
    if (!managerHomeworkForm.taskType.trim()) {
      setManagerHomeworkMsg({ success: false, text: 'نوع یا شرح کار را وارد نمایید.' });
      return;
    }
    if (!managerHomeworkForm.quantity || Number(managerHomeworkForm.quantity) <= 0) {
      setManagerHomeworkMsg({ success: false, text: 'تعداد یا مقدار کار باید بزرگتر از صفر باشد.' });
      return;
    }
    if (!managerHomeworkForm.wagePerUnit || Number(managerHomeworkForm.wagePerUnit) <= 0) {
      setManagerHomeworkMsg({ success: false, text: 'نرخ دستمزد هر واحد باید بزرگتر از صفر باشد.' });
      return;
    }

    const res = StorageService.submitHomeworkTask({
      employeeId: managerHomeworkForm.employeeId,
      taskType: managerHomeworkForm.taskType.trim(),
      quantity: Number(managerHomeworkForm.quantity),
      unit: managerHomeworkForm.unit,
      wagePerUnit: Number(managerHomeworkForm.wagePerUnit),
      date: managerHomeworkForm.date,
      orderCode: managerHomeworkForm.orderCode.trim() || undefined,
      notes: managerHomeworkForm.notes.trim() || undefined,
    });

    if (res.success && res.task) {
      if (managerHomeworkForm.decision === 'SETTLE_NOW') {
        StorageService.reviewHomeworkTask(res.task.id, 'SETTLE_NOW', currentUser.name, 'تسویه نقدی فوری توسط ثبت‌کننده');
      } else if (managerHomeworkForm.decision === 'ADD_TO_SALARY') {
        StorageService.reviewHomeworkTask(res.task.id, 'ADD_TO_SALARY', currentUser.name, 'افزودن مستقیم به فیش حقوقی دوره');
      }
      setManagerHomeworkMsg({ success: true, text: 'کار در منزل با موفقیت ثبت گردید.' });
      setTimeout(() => {
        setIsManagerAddHomeworkModalOpen(false);
        setManagerHomeworkMsg(null);
        setManagerHomeworkForm({
          employeeId: employees.find(e => e.isHomeworkWorker)?.id || employees[0]?.id || '',
          taskType: 'مونتاژ قطعات و اتصالات',
          quantity: 10,
          unit: 'عدد',
          wagePerUnit: 25000,
          date: getTodayShamsi(),
          orderCode: '',
          notes: '',
          decision: 'PENDING',
        });
        onRefresh();
      }, 1000);
    } else {
      setManagerHomeworkMsg({ success: false, text: res.message || 'خطا در ثبت کار در منزل.' });
    }
  };

  // Miscellaneous Payments State
  const [isMiscModalOpen, setIsMiscModalOpen] = useState(false);
  const [miscForm, setMiscForm] = useState<{
    employeeId: string;
    amount: number | '';
    title: string;
    date: string;
    month: string;
    deductFromSalary: boolean;
    notes: string;
  }>({
    employeeId: employees[0]?.id || '',
    amount: '',
    title: 'پرداخت متفرقه',
    date: getTodayShamsi(),
    month: currentMonthStr,
    deductFromSalary: true,
    notes: ''
  });
  const [miscMsg, setMiscMsg] = useState<{ success: boolean; text: string } | null>(null);
  const miscPayments = StorageService.getMiscPayments(currentUser);

  const expenses = StorageService.getWorkerExpenses(currentUser);
  const pendingExpensesCount = expenses.filter((e) => e.status === 'PENDING_SETTLEMENT').length;
  const totalPendingExpenseAmount = expenses
    .filter((e) => e.status === 'PENDING_SETTLEMENT')
    .reduce((sum, e) => sum + e.amount, 0);

  const handleExpenseAction = (expenseId: string, action: 'SETTLE_NOW' | 'ADD_TO_SALARY' | 'REJECT', notes?: string) => {
    StorageService.reviewWorkerExpense(expenseId, action, currentUser.name, notes);
    onRefresh();
  };

  const handleConfirmSettleExpense = () => {
    if (!settlingExpense) return;
    StorageService.reviewWorkerExpense(settlingExpense.id, 'SETTLE_NOW', currentUser.name, settlementNotes);
    setSettlingExpense(null);
    setSettlementNotes('');
    onRefresh();
  };

  const handleMiscSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!miscForm.employeeId || !miscForm.amount || Number(miscForm.amount) <= 0 || !miscForm.title.trim()) {
      setMiscMsg({ success: false, text: 'لطفاً مبلغ و عنوان پرداخت را مشخص نمایید.' });
      return;
    }
    const res = StorageService.submitMiscPayment({
      employeeId: miscForm.employeeId,
      amount: Number(miscForm.amount),
      title: miscForm.title.trim(),
      date: miscForm.date,
      month: miscForm.month,
      deductFromSalary: miscForm.deductFromSalary,
      notes: miscForm.notes
    });
    if (res.success) {
      setMiscMsg({ success: true, text: res.message });
      setTimeout(() => {
        setIsMiscModalOpen(false);
        setMiscMsg(null);
        setMiscForm({
          employeeId: employees[0]?.id || '',
          amount: '',
          title: 'پرداخت متفرقه',
          date: getTodayShamsi(),
          month: currentMonthStr,
          deductFromSalary: true,
          notes: ''
        });
        onRefresh();
      }, 1000);
    } else {
      setMiscMsg({ success: false, text: res.message });
    }
  };

  const handleDeleteMiscPayment = (id: string) => {
    if (confirm('آیا از حذف این رکورد پرداخت اطمینان دارید؟')) {
      StorageService.deleteMiscPayment(id);
      onRefresh();
    }
  };

  const handleApprove = (id: string) => {
    StorageService.reviewAdvanceRequest(id, true, currentUser.name);
    onRefresh();
  };

  const handleReject = () => {
    if (!rejectingId) return;
    StorageService.reviewAdvanceRequest(
      rejectingId,
      false,
      currentUser.name,
      rejectionReason || 'عدم تایید بر اساس بودجه جاری ماه'
    );
    setRejectingId(null);
    setRejectionReason('');
    onRefresh();
  };

  const handleDeleteConfirm = () => {
    if (!deletingAdvanceId) return;
    StorageService.deleteAdvanceRequest(deletingAdvanceId);
    setDeletingAdvanceId(null);
    onRefresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const emp = employees.find((e) => e.id === formData.employeeId);
    if (!emp) return;

    if (!formData.reason.trim()) {
      setFormError('لطفاً دلیل درخواست مساعده را قید نمایید.');
      return;
    }

    const result = StorageService.submitAdvanceRequest({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      amount: formData.amount,
      requestDate: getTodayShamsi(),
      repayMonth: formData.repayMonth,
      reason: formData.reason.trim(),
    });

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setIsSubmitModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            {activeSection === 'ADVANCES' ? (
              <>
                <Wallet className="w-5 h-5 text-indigo-600" />
                <span>مدیریت درخواست‌های مساعده حقوقی</span>
              </>
            ) : activeSection === 'MISC_PAYMENTS' ? (
              <>
                <Coins className="w-5 h-5 text-amber-600" />
                <span>پرداخت‌های متفرقه و علی‌الحساب مدیریت</span>
              </>
            ) : activeSection === 'EXPENSES' ? (
              <>
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>خریدهای کارت شخصی کارگران (بستانکاری کارگاه)</span>
              </>
            ) : (
              <>
                <Home className="w-5 h-5 text-indigo-600" />
                <span>کار در منزل، کارمزدی و قطعه‌کاری پرسنل</span>
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {activeSection === 'ADVANCES'
              ? 'فرآیند درخواست، اعتبارسنجی سقف ۳۰٪ و تایید کسر از حقوق پایان ماه'
              : activeSection === 'MISC_PAYMENTS'
              ? 'ثبت پرداخت‌های علی‌الحساب یا متفرقه کارفرما با تعیین وضعیت کسر از حقوق'
              : activeSection === 'EXPENSES'
              ? 'هزینه‌های انجام‌شده با کارت شخصی کارگران برای کارگاه و مدیریت تسویه فوری، افزودن به حقوق یا رد'
              : 'گزارش‌های کار در منزل و قطعه‌کاری پرسنل با امکان تسویه نقدی فوری، افزودن به حقوق ماه جاری یا رد'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSection === 'ADVANCES' && (
            <button
              onClick={handleOpenSubmitModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>درخواست مساعده جدید</span>
            </button>
          )}

          {activeSection === 'MISC_PAYMENTS' && canApprove && (
            <button
              onClick={() => {
                setMiscMsg(null);
                setIsMiscModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>ثبت پرداخت متفرقه / علی‌الحساب</span>
            </button>
          )}

          {activeSection === 'HOMEWORK' && canApprove && (
            <button
              onClick={() => {
                setManagerHomeworkMsg(null);
                setIsManagerAddHomeworkModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>ثبت مستقیم کار در منزل</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('ADVANCES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'ADVANCES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wallet className="w-4 h-4 text-indigo-400" />
          <span>مساعده‌های پرسنلی</span>
          {filteredAdvances.filter((a) => a.status === 'PENDING').length > 0 && (
            <span className="bg-amber-500 text-slate-950 font-mono text-[10px] px-1.5 py-0.2 rounded-full">
              {filteredAdvances.filter((a) => a.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('MISC_PAYMENTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'MISC_PAYMENTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-500" />
          <span>پرداخت‌های متفرقه و علی‌الحساب</span>
          <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.2 rounded-full">
            {miscPayments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('EXPENSES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'EXPENSES'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-500" />
          <span>خریدهای کارت شخصی کارگران</span>
          {pendingExpensesCount > 0 && (
            <span className="bg-amber-500 text-slate-950 font-mono text-[10px] px-1.5 py-0.2 rounded-full">
              {pendingExpensesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('HOMEWORK')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSection === 'HOMEWORK'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-indigo-950 hover:bg-indigo-50 border border-indigo-200/80'
          }`}
        >
          <Home className="w-4 h-4 text-indigo-400" />
          <span>کار در منزل و کارمزدی</span>
          {pendingHomeworkCount > 0 && (
            <span className="bg-rose-500 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full animate-pulse">
              {pendingHomeworkCount}
            </span>
          )}
        </button>
      </div>

      {/* SECTION 1: ADVANCES */}
      {activeSection === 'ADVANCES' && (
        <div className="space-y-4">
          {/* Policy Notice Box */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800 block mb-0.5">ضوابط اعطای مساعده:</span>
              ثبت مساعده صرفاً در بازه روزهای ۱۵ الی ۲۰ هر ماه، حداکثر تا سقف ۳۰ درصد حقوق پایه ماهیانه پرسنل و یک نوبت در هر ماه کاری امکان‌پذیر است.
            </div>
          </div>

      {/* Advances: Cards (Mobile) & Table (Desktop) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredAdvances.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              هیچ درخواست مساعده‌ای ثبت نشده است.
            </div>
          ) : (
            filteredAdvances.map((adv) => (
              <div key={adv.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{adv.employeeName}</div>
                    <div className="text-xs text-emerald-600 font-bold font-mono mt-0.5">
                      {formatCurrencyTomans(adv.amount)}
                    </div>
                  </div>
                  <div>
                    {adv.status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> تایید شده
                      </span>
                    ) : adv.status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3" /> رد شده
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        <AlertCircle className="w-3 h-3" /> در انتظار تایید
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">تاریخ درخواست:</span>
                    <span className="font-mono text-slate-700">{adv.requestDate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">دوره کسر از حقوق:</span>
                    <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {adv.repayMonth}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-slate-400 shrink-0">علت نیاز:</span>
                    <span className="text-slate-700 text-right">{adv.reason}</span>
                  </div>
                  {adv.reviewedBy && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-500">
                      <span>بررسی کننده: <strong>{adv.reviewedBy}</strong></span>
                      <span className="text-[10px] text-slate-400">{adv.reviewedAt}</span>
                    </div>
                  )}
                </div>

                {/* Manager Action Buttons on Mobile Card */}
                {canApprove && adv.status === 'PENDING' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(adv.id)}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>تایید و پرداخت</span>
                    </button>
                    <button
                      onClick={() => setRejectingId(adv.id)}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>رد درخواست</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-semibold">
              <tr>
                <th className="py-3.5 px-4">پرسنل متقاضی</th>
                <th className="py-3.5 px-4">مبلغ مساعده</th>
                <th className="py-3.5 px-4">تاریخ ثبت</th>
                <th className="py-3.5 px-4">ماه تسویه</th>
                <th className="py-3.5 px-4">دلیل درخواست</th>
                <th className="py-3.5 px-4">وضعیت</th>
                <th className="py-3.5 px-4">بررسی کننده</th>
                {canApprove && <th className="py-3.5 px-4 text-center">اقدامات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAdvances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    هیچ موردی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                filteredAdvances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{adv.employeeName}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 font-mono">
                      {formatCurrencyTomans(adv.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{adv.requestDate}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-medium text-[11px]">
                        {adv.repayMonth}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">{adv.reason}</td>
                    <td className="py-3 px-4">
                      {adv.status === 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> تایید شده
                        </span>
                      ) : adv.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> رد شده
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          <AlertCircle className="w-3 h-3" /> در انتظار
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {adv.reviewedBy ? (
                        <div>
                          <div className="font-semibold text-slate-700">{adv.reviewedBy}</div>
                          <div className="text-[10px] text-slate-400">{adv.reviewedAt}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canApprove && adv.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(adv.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer shadow-xs"
                              title="تایید"
                            >
                              <Check className="w-3 h-3" />
                              <span>تایید</span>
                            </button>
                            <button
                              onClick={() => setRejectingId(adv.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 flex items-center gap-1 cursor-pointer"
                              title="رد درخواست"
                            >
                              <X className="w-3 h-3" />
                              <span>رد</span>
                            </button>
                          </>
                        )}
                        {(canApprove || (currentUser.employeeId === adv.employeeId && adv.status === 'PENDING')) && (
                          <button
                            onClick={() => setDeletingAdvanceId(adv.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

      {/* SECTION 2: MISCELLANEOUS PAYMENTS */}
      {activeSection === 'MISC_PAYMENTS' && (
        <div className="space-y-4">
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-800">
            <Coins className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-950 block">راهنمای پرداخت‌های متفرقه و علی‌الحساب:</span>
              <p className="leading-relaxed">
                این بخش جهت ثبت پرداخت‌های متفرقه به پرسنل خارج از مساعده عادی است. در زمان ثبت، می‌توانید مشخص کنید که <strong>«از حقوق کسر شود؟»</strong>. اگر بله انتخاب شود، در محاسبه حقوق ماه مربوطه کسر می‌گردد؛ و اگر خیر، صرفاً به عنوان سابقه پرداخت در پرونده مالی پرسنل ثبت می‌شود.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-medium">
                    <th className="p-3.5 pr-5">پرسنل</th>
                    <th className="p-3.5">عنوان / نوع پرداخت</th>
                    <th className="p-3.5">مبلغ (تومان)</th>
                    <th className="p-3.5">تاریخ پرداخت</th>
                    <th className="p-3.5">دوره حقوقی</th>
                    <th className="p-3.5">کسر از حقوق؟</th>
                    <th className="p-3.5">توضیحات</th>
                    {canApprove && <th className="p-3.5 pl-5 text-left">عملیات</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {miscPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        تاکنون پرداخت متفرقه‌ای ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    miscPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pr-5 font-bold text-slate-900">{p.employeeName}</td>
                        <td className="p-3.5 font-medium text-slate-700">{p.title}</td>
                        <td className="p-3.5 font-bold font-mono text-slate-900">
                          {formatCurrencyTomans(p.amount)}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{p.date}</td>
                        <td className="p-3.5 font-mono text-slate-500">{p.month}</td>
                        <td className="p-3.5">
                          {p.deductFromSalary ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              کسر از حقوق: بله
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              کسر از حقوق: خیر (فقط سابقه)
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 max-w-[180px] truncate" title={p.notes || '-'}>
                          {p.notes || '-'}
                        </td>
                        {canApprove && (
                          <td className="p-3.5 pl-5 text-left">
                            <button
                              type="button"
                              onClick={() => handleDeleteMiscPayment(p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: WORKER PERSONAL CARD EXPENSES */}
      {activeSection === 'EXPENSES' && (
        <div className="space-y-4">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-start gap-3">
              <Receipt className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-950 block mb-0.5">
                  خریدهای انجام‌شده با کارت شخصی کارگر برای کارگاه:
                </span>
                این مبالغ به منزله <strong>بستانکاری کارگر بابت هزینه مجموعه</strong> است و مدیر می‌تواند آن را «تسویه الآن»، «افزودن به حقوق ماه جاری» یا «رد» نماید.
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 bg-white/80 p-2.5 rounded-xl border border-emerald-200">
              <div>
                <span className="text-[10px] text-slate-500 block">بستانکاری در انتظار:</span>
                <span className="font-mono font-bold text-amber-700 text-xs">
                  {formatCurrencyTomans(totalPendingExpenseAmount)}
                </span>
              </div>
              <div className="border-r border-slate-200 pr-3">
                <span className="text-[10px] text-slate-500 block">تعداد در انتظار:</span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {pendingExpensesCount} مورد
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-medium">
                    <th className="p-3.5 pr-5">کارگر پرداخت‌کننده</th>
                    <th className="p-3.5">شرح خرید</th>
                    <th className="p-3.5">مبلغ هزینه</th>
                    <th className="p-3.5">تاریخ خرید</th>
                    <th className="p-3.5">پرداخت‌کننده</th>
                    <th className="p-3.5">فاکتور / رسید</th>
                    <th className="p-3.5">وضعیت تسویه</th>
                    {canApprove && <th className="p-3.5 pl-5 text-left">تصمیم مدیر</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        تاکنون خریدی با کارت شخصی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pr-5 font-bold text-slate-900">{exp.employeeName}</td>
                        <td className="p-3.5 font-medium text-slate-700 max-w-[200px] truncate" title={exp.title}>
                          {exp.title}
                        </td>
                        <td className="p-3.5 font-bold font-mono text-amber-700">
                          {formatCurrencyTomans(exp.amount)}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{exp.date}</td>
                        <td className="p-3.5 text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                            {exp.payer}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {exp.receiptUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingReceipt(exp.receiptUrl!)}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3 h-3 text-amber-700" />
                              <span>مشاهده</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">ندارد</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {exp.status === 'PENDING_SETTLEMENT' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3 h-3" /> در انتظار تأیید
                            </span>
                          ) : exp.status === 'SETTLED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> تأیید و تسویه‌شده
                            </span>
                          ) : exp.status === 'ADDED_TO_SALARY' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <PlusCircle className="w-3 h-3" /> تأیید و افزوده‌شده به حقوق
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" /> ردشده
                            </span>
                          )}
                        </td>
                        {canApprove && (
                          <td className="p-3.5 pl-5 text-left">
                            {exp.status === 'PENDING_SETTLEMENT' ? (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleExpenseAction(exp.id, 'SETTLE_NOW')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="تسویه حساب الآن"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>تسویه الآن</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExpenseAction(exp.id, 'ADD_TO_SALARY')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="افزودن به حقوق ماه جاری"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                  <span>افزودن به حقوق</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExpenseAction(exp.id, 'REJECT')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 cursor-pointer"
                                  title="رد درخواست"
                                >
                                  <X className="w-3 h-3" />
                                  <span>رد</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-[11px] text-slate-400">بررسی شده</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('آیا از حذف این هزینه اطمینان دارید؟')) {
                                      StorageService.deleteWorkerExpense(exp.id);
                                      onRefresh();
                                    }
                                  }}
                                  className="p-1 rounded text-slate-300 hover:text-rose-600 cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: HOMEWORK & PIECEWORK TASKS */}
      {activeSection === 'HOMEWORK' && (
        <div className="space-y-4">
          {/* Header Summary Banner */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-blue-50/90 border border-indigo-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-indigo-950 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Home className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="font-black text-sm text-indigo-950 block">
                  سامانه کار در منزل، کارمزدی و قطعه‌کاری کارگاه
                </span>
                <p className="text-slate-600 leading-relaxed max-w-2xl">
                  ثبت و تعیین‌تکلیف فعالیت‌های برون‌سپاری‌شده به پرسنل در منزل. مدیریت می‌تواند مطالبات را به‌صورت <strong className="text-emerald-700">«تسویه نقدی فوری»</strong>، <strong className="text-indigo-700">«افزودن به حقوق ماه جاری»</strong> (بدون تغییر در پایه حقوق) و یا <strong className="text-rose-700">«رد»</strong> تعیین‌تکلیف نماید.
                </p>
              </div>
            </div>

            {/* Quick Stat Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
              <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block font-medium">در انتظار بررسی:</span>
                <div className="font-mono font-black text-rose-600 text-xs mt-0.5">
                  {formatCurrencyTomans(totalPendingHomeworkWage)}
                </div>
                <span className="text-[9px] text-rose-700 font-bold block mt-0.5">
                  {formatNumberFa(pendingHomeworkCount)} مورد باز
                </span>
              </div>

              <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-200/80 shadow-2xs">
                <span className="text-[10px] text-slate-500 block font-medium">تسویه نقدی فوری:</span>
                <div className="font-mono font-black text-emerald-700 text-xs mt-0.5">
                  {formatCurrencyTomans(totalSettledHomeworkWage)}
                </div>
                <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">پرداخت مستقیم</span>
              </div>

              <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-200/80 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 block font-medium">افزوده‌شده به فیش حقوق:</span>
                <div className="font-mono font-black text-indigo-700 text-xs mt-0.5">
                  {formatCurrencyTomans(totalAddedToSalaryHomeworkWage)}
                </div>
                <span className="text-[9px] text-indigo-700 font-bold block mt-0.5">ردیف مستقل در فیش</span>
              </div>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setHomeworkStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  homeworkStatusFilter === 'ALL'
                    ? 'bg-indigo-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه ({formatNumberFa(homeworkTasks.length)})
              </button>
              <button
                type="button"
                onClick={() => setHomeworkStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  homeworkStatusFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span>در انتظار ({formatNumberFa(pendingHomeworkCount)})</span>
              </button>
              <button
                type="button"
                onClick={() => setHomeworkStatusFilter('SETTLED')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  homeworkStatusFilter === 'SETTLED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                تسویه نقدی ({formatNumberFa(homeworkTasks.filter(t => t.status === 'SETTLED').length)})
              </button>
              <button
                type="button"
                onClick={() => setHomeworkStatusFilter('ADDED_TO_SALARY')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  homeworkStatusFilter === 'ADDED_TO_SALARY'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                افزوده به حقوق ({formatNumberFa(homeworkTasks.filter(t => t.status === 'ADDED_TO_SALARY').length)})
              </button>
              <button
                type="button"
                onClick={() => setHomeworkStatusFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  homeworkStatusFilter === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                رد شده ({formatNumberFa(homeworkTasks.filter(t => t.status === 'REJECTED').length)})
              </button>
            </div>

            {/* Employee Filter & Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={homeworkEmployeeFilter}
                  onChange={(e) => setHomeworkEmployeeFilter(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">همه پرسنل</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} {emp.isHomeworkWorker ? '⭐ (کار در منزل)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجو در کارها..."
                  value={homeworkSearch}
                  onChange={(e) => setHomeworkSearch(e.target.value)}
                  className="pr-8 pl-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
                />
              </div>
            </div>
          </div>

          {/* Cards for Mobile & Table for Desktop */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Mobile Cards (block sm:hidden) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filteredHomeworkTasks.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  هیچ موردی با فیلتر انتخابی یافت نشد.
                </div>
              ) : (
                filteredHomeworkTasks.map((t) => (
                  <div key={t.id} className="p-3.5 space-y-2.5 text-xs text-right">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          <Home className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900">{t.employeeName}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                        t.status === 'SETTLED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : t.status === 'ADDED_TO_SALARY'
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : t.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>
                        {t.status === 'SETTLED' ? 'تسویه نقدی' :
                         t.status === 'ADDED_TO_SALARY' ? 'افزوده به حقوق' :
                         t.status === 'REJECTED' ? 'رد شده' : 'در انتظار تایید'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <div className="font-bold text-slate-800">{t.taskType}</div>
                      <div className="flex items-center justify-between text-slate-600 text-[11px]">
                        <span>مقدار: <strong className="text-slate-900">{formatNumberFa(t.quantity)} {t.unit}</strong></span>
                        <span>نرخ: {formatCurrencyTomans(t.wagePerUnit)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 font-mono">{t.date} {t.orderCode ? `• عطف: ${t.orderCode}` : ''}</span>
                        <span className="font-mono font-black text-indigo-700 text-xs">
                          کل: {formatCurrencyTomans(t.totalWage)}
                        </span>
                      </div>
                      {t.notes && <div className="text-[10px] text-slate-500 pt-0.5">{t.notes}</div>}
                      {t.rejectionReason && (
                        <div className="text-[10px] text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
                          علت رد: {t.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {t.proofImageUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewingReceipt(t.proofImageUrl!)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] flex items-center gap-1 border border-indigo-200 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>مشاهده عکس کار</span>
                        </button>
                      ) : <span className="text-[10px] text-slate-400">بدون تصویر</span>}

                      {canApprove && t.status === 'PENDING' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleHomeworkAction(t.id, 'SETTLE_NOW')}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" />
                            <span>تسویه</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHomeworkAction(t.id, 'ADD_TO_SALARY')}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white flex items-center gap-0.5"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>به حقوق</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingHomeworkTask(t);
                              setHomeworkRejectionReason('');
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
                          >
                            رد
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-medium">
                    <th className="p-3.5 pr-5">پرسنل</th>
                    <th className="p-3.5">شرح کار / قطعه</th>
                    <th className="p-3.5">تعداد / متراژ</th>
                    <th className="p-3.5">نرخ هر واحد (تومان)</th>
                    <th className="p-3.5">دستمزد کل (تومان)</th>
                    <th className="p-3.5">تاریخ انجام</th>
                    <th className="p-3.5">کد سفارش / عطف</th>
                    <th className="p-3.5">عکس / رسید</th>
                    <th className="p-3.5">وضعیت</th>
                    {canApprove && <th className="p-3.5 pl-5 text-left">تصمیم و تسویه مدیر</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHomeworkTasks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400">
                        هیچ موردی با فیلترهای انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredHomeworkTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 pr-5 font-bold text-slate-900 whitespace-nowrap">
                          {t.employeeName}
                        </td>
                        <td className="p-3.5 font-medium text-slate-800 max-w-[200px] truncate" title={t.taskType}>
                          {t.taskType}
                          {t.notes && <span className="block text-[10px] text-slate-400 truncate">{t.notes}</span>}
                        </td>
                        <td className="p-3.5 font-bold font-mono text-slate-700 whitespace-nowrap">
                          {formatNumberFa(t.quantity)} {t.unit}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                          {formatCurrencyTomans(t.wagePerUnit)}
                        </td>
                        <td className="p-3.5 font-bold font-mono text-indigo-700 whitespace-nowrap">
                          {formatCurrencyTomans(t.totalWage)}
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">{t.date}</td>
                        <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                          {t.orderCode || '-'}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {t.proofImageUrl ? (
                            <button
                              type="button"
                              onClick={() => setViewingReceipt(t.proofImageUrl!)}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3 h-3 text-indigo-600" />
                              <span>مشاهده</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {t.status === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3 h-3" /> در انتظار تایید
                            </span>
                          ) : t.status === 'SETTLED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" /> تسویه نقدی شده
                            </span>
                          ) : t.status === 'ADDED_TO_SALARY' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <PlusCircle className="w-3 h-3" /> افزوده‌شده به حقوق
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
                              title={t.rejectionReason || 'رد شده توسط مدیریت'}
                            >
                              <XCircle className="w-3 h-3" /> رد شده
                            </span>
                          )}
                        </td>
                        {canApprove && (
                          <td className="p-3.5 pl-5 text-left whitespace-nowrap">
                            {t.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleHomeworkAction(t.id, 'SETTLE_NOW')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="تسویه حساب نقدی فوری"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>تسویه الآن</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleHomeworkAction(t.id, 'ADD_TO_SALARY')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 cursor-pointer shadow-2xs"
                                  title="افزودن دستمزد به فیش حقوقی ماه جاری"
                                >
                                  <PlusCircle className="w-3 h-3" />
                                  <span>افزودن به حقوق</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingHomeworkTask(t);
                                    setHomeworkRejectionReason('');
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 cursor-pointer"
                                  title="رد کار انجام‌شده"
                                >
                                  <X className="w-3 h-3" />
                                  <span>رد</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-[11px] text-slate-400">
                                  {t.reviewedBy ? `توسط ${t.reviewedBy}` : 'بررسی شده'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('آیا از حذف این رکورد کار در منزل اطمینان دارید؟')) {
                                      StorageService.deleteHomeworkTask(t.id);
                                      onRefresh();
                                    }
                                  }}
                                  className="p-1 rounded text-slate-300 hover:text-rose-600 cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REJECT ADVANCE MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-800">علت رد درخواست مساعده:</h3>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="توضیحات دلیل رد درخواست..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-100 text-slate-600 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleReject}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                ثبت رد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAdvanceId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">حذف درخواست مساعده</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              آیا از حذف این درخواست مساعده اطمینان دارید؟
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingAdvanceId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تایید و حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT ADVANCE MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-visible animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-600" />
                <span>ثبت درخواست مساعده حقوقی</span>
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">پرسنل متقاضی</label>
                {currentUser.role === 'EMPLOYEE' ? (
                  <div className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-800 flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {employees.find((e) => e.id === formData.employeeId)?.firstName || ''}{' '}
                      {employees.find((e) => e.id === formData.employeeId)?.lastName || currentUser.name}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      حقوق پایه: {formatCurrencyTomans(employees.find((e) => e.id === formData.employeeId)?.baseSalary || 0)}
                    </span>
                  </div>
                ) : (
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({formatCurrencyTomans(emp.baseSalary)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    مبلغ مساعده (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono font-medium">
                    معادل: {formatCurrencyTomans(formData.amount)}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    دوره تسویه <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.repayMonth}
                    onChange={(e) => setFormData({ ...formData, repayMonth: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 font-mono bg-white"
                  >
                    {repayMonthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">علت و ضرورت دریافت مساعده</label>
                <textarea
                  rows={3}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="دلیل درخواست مساعده را شرح دهید..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  ثبت نهایی درخواست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT MISCELLANEOUS PAYMENT MODAL */}
      {isMiscModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>ثبت پرداخت متفرقه / علی‌الحساب به پرسنل</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsMiscModalOpen(false);
                  setMiscMsg(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMiscSubmit} className="p-6 space-y-4 text-right">
              {miscMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    miscMsg.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{miscMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  پرسنل دریافت‌کننده وجه <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={miscForm.employeeId}
                  onChange={(e) => setMiscForm({ ...miscForm, employeeId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position || 'پرسنل'} - کد: {emp.personalCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    عنوان یا شرح پرداخت <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    {['پرداخت متفرقه', 'علی‌الحساب', 'پاداش نقدی', 'سایر پرداخت‌ها'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setMiscForm({ ...miscForm, title: preset })}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={miscForm.title}
                  onChange={(e) => setMiscForm({ ...miscForm, title: e.target.value })}
                  placeholder="مثال: پرداخت متفرقه یا علی‌الحساب..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مبلغ پرداختی (تومان) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    value={miscForm.amount}
                    onChange={(e) => setMiscForm({ ...miscForm, amount: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="مثال: ۱۲۰۰۰۰۰"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left focus:border-amber-600 outline-none"
                  />
                  {miscForm.amount && Number(miscForm.amount) > 0 ? (
                    <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                      معادل: {formatCurrencyTomans(Number(miscForm.amount))}
                    </span>
                  ) : null}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ پرداخت (شمسی) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={miscForm.date}
                    onChange={(e) => setMiscForm({ ...miscForm, date: e.target.value, month: e.target.value.substring(0, 7) })}
                    placeholder="مثال: 1405/07/02"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:border-amber-600 outline-none"
                  />
                </div>
              </div>

              {/* DEDUCT FROM SALARY TOGGLE - CRITICAL USER REQUIREMENT */}
              <div className="bg-amber-50/70 border border-amber-300/80 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-amber-950 block">
                      آیا از حقوق کسر شود؟
                    </span>
                    <span className="text-[11px] text-amber-800 leading-relaxed block">
                      {miscForm.deductFromSalary
                        ? '✓ بله: این مبلغ در محاسبه حقوق ماه به عنوان کسرشونده لحاظ می‌شود.'
                        : '✕ خیر: فقط به عنوان سابقه پرداخت ثبت می‌شود و از حقوق کسر نمی‌گردد.'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={miscForm.deductFromSalary}
                      onChange={(e) => setMiscForm({ ...miscForm, deductFromSalary: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  توضیحات اختیاری
                </label>
                <textarea
                  rows={2}
                  value={miscForm.notes}
                  onChange={(e) => setMiscForm({ ...miscForm, notes: e.target.value })}
                  placeholder="شماره پیگیری واریز یا توضیحات تکمیلی..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMiscModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>ثبت نهایی پرداخت</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT HOMEWORK MODAL */}
      {rejectingHomeworkTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 shadow-xl text-right">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>رد کار در منزل: {rejectingHomeworkTask.employeeName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingHomeworkTask(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              لطفاً علت رد کار در منزل (مانند: نقص کیفی، عدم انطباق با سفارش، مغایرت در تعداد تحویلی) را یادداشت نمایید تا در سوابق پرسنل ثبت شود:
            </p>

            <textarea
              rows={3}
              value={homeworkRejectionReason}
              onChange={(e) => setHomeworkRejectionReason(e.target.value)}
              placeholder="توضیحات علت رد..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 text-slate-800"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingHomeworkTask(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => handleHomeworkAction(rejectingHomeworkTask.id, 'REJECT', homeworkRejectionReason)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs"
              >
                تایید رد درخواست
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGER DIRECT ADD HOMEWORK MODAL */}
      {isManagerAddHomeworkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 p-6 space-y-4 shadow-2xl text-right animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-indigo-600" />
                <span>ثبت مستقیم کار در منزل برای پرسنل</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManagerAddHomeworkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {managerHomeworkMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  managerHomeworkMsg.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {managerHomeworkMsg.text}
              </div>
            )}

            <form onSubmit={handleManagerAddHomeworkSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  انتخاب پرسنل مجری:
                </label>
                <select
                  value={managerHomeworkForm.employeeId}
                  onChange={(e) => {
                    const emp = employees.find(x => x.id === e.target.value);
                    setManagerHomeworkForm({
                      ...managerHomeworkForm,
                      employeeId: e.target.value,
                      wagePerUnit: emp?.homeworkWagePerUnit || managerHomeworkForm.wagePerUnit,
                      taskType: emp?.homeworkDefaultTaskType || managerHomeworkForm.taskType,
                    });
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} {emp.isHomeworkWorker ? '⭐ (دسترسی کار در منزل دارد)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شرح یا نوع کار انجام‌شده:
                </label>
                <input
                  type="text"
                  placeholder="مثال: مونتاژ قطعات، دوخت، بسته‌بندی، سوهان‌کاری..."
                  value={managerHomeworkForm.taskType}
                  onChange={(e) =>
                    setManagerHomeworkForm({ ...managerHomeworkForm, taskType: e.target.value })
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تعداد یا مقدار:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={managerHomeworkForm.quantity}
                    onChange={(e) =>
                      setManagerHomeworkForm({
                        ...managerHomeworkForm,
                        quantity: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    واحد سنجش:
                  </label>
                  <input
                    type="text"
                    value={managerHomeworkForm.unit}
                    onChange={(e) =>
                      setManagerHomeworkForm({ ...managerHomeworkForm, unit: e.target.value })
                    }
                    placeholder="عدد، متر، کیلوگرم، بسته..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نرخ دستمزد هر واحد (تومان):
                  </label>
                  <input
                    type="text"
                    value={
                      managerHomeworkForm.wagePerUnit !== ''
                        ? managerHomeworkForm.wagePerUnit.toLocaleString('fa-IR')
                        : ''
                    }
                    onChange={(e) => {
                      const raw = toEnglishDigits(e.target.value.replace(/,/g, ''));
                      setManagerHomeworkForm({
                        ...managerHomeworkForm,
                        wagePerUnit: raw ? Number(raw) : '',
                      });
                    }}
                    placeholder="مثال: ۲۵,۰۰۰"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ انجام کار:
                  </label>
                  <input
                    type="text"
                    value={managerHomeworkForm.date}
                    onChange={(e) =>
                      setManagerHomeworkForm({ ...managerHomeworkForm, date: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Total Calculation Preview */}
              {managerHomeworkForm.quantity && managerHomeworkForm.wagePerUnit ? (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900">مجموع دستمزد قابل پرداخت:</span>
                  <span className="font-mono font-black text-indigo-800 text-sm">
                    {formatCurrencyTomans(
                      Number(managerHomeworkForm.quantity) * Number(managerHomeworkForm.wagePerUnit)
                    )}
                  </span>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شماره سفارش / عطف (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={managerHomeworkForm.orderCode}
                    onChange={(e) =>
                      setManagerHomeworkForm({ ...managerHomeworkForm, orderCode: e.target.value })
                    }
                    placeholder="ORD-..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تصمیم تسویه حساب:
                  </label>
                  <select
                    value={managerHomeworkForm.decision}
                    onChange={(e) =>
                      setManagerHomeworkForm({
                        ...managerHomeworkForm,
                        decision: e.target.value as any,
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 font-bold bg-white"
                  >
                    <option value="PENDING">در انتظار بررسی</option>
                    <option value="SETTLE_NOW">تسویه نقدی فوری (پرداخت شد)</option>
                    <option value="ADD_TO_SALARY">افزودن به حقوق ماه جاری</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توضیحات و یادداشت (اختیاری):
                </label>
                <textarea
                  rows={2}
                  value={managerHomeworkForm.notes}
                  onChange={(e) =>
                    setManagerHomeworkForm({ ...managerHomeworkForm, notes: e.target.value })
                  }
                  placeholder="نکات کنترل کیفیت، تحویل حضوری و ..."
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManagerAddHomeworkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت و ذخیره در پرونده</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT IMAGE MODAL */}
      {viewingReceipt && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewingReceipt(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 text-right animate-in zoom-in-95 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>تصویر فاکتور / رسید خرید پیوست‌شده</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center bg-slate-50 p-2 rounded-2xl border border-slate-100 max-h-[70vh] overflow-auto">
              <img
                src={viewingReceipt}
                alt="فاکتور خرید کارگر"
                className="rounded-xl object-contain max-h-[65vh] w-auto shadow-xs"
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
