import React, { useState, useEffect } from 'react';
import {
  Banknote,
  X,
  Coins,
  Clock,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { Employee, User, MiscPayment } from '../../types';
import { StorageService } from '../../services/storage';
import {
  getTodayShamsi,
  getCurrentTimeStr,
  toEnglishDigits,
  numberToPersianWords,
  formatCurrencyTomans
} from '../../utils/dateUtils';
import { ShamsiDatePicker } from './ShamsiDatePicker';

interface QuickMiscPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  employees: Employee[];
  onSuccess?: (payment: MiscPayment) => void;
  preselectedEmployeeId?: string;
}

export const QuickMiscPaymentModal: React.FC<QuickMiscPaymentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  employees,
  onSuccess,
  preselectedEmployeeId,
}) => {
  const isAuthorized =
    currentUser?.role === 'ADMIN' ||
    Boolean(currentUser?.isSuperAdmin) ||
    Boolean(currentUser?.isFinanceManager) ||
    Boolean(currentUser?.isHrManager) ||
    currentUser?.managementRoles?.includes('FINANCE_OFFICER') ||
    currentUser?.managementRoles?.includes('HR_ADMIN');

  const defaultEmpId = preselectedEmployeeId || employees[0]?.id || '';
  const [selectedEmpId, setSelectedEmpId] = useState(defaultEmpId);
  const [amountInput, setAmountInput] = useState('');
  const [rawAmount, setRawAmount] = useState<number>(0);
  const [title, setTitle] = useState('پاداش موردی و متفرقه');
  const [date, setDate] = useState(getTodayShamsi());
  const [time, setTime] = useState(getCurrentTimeStr());
  const [notes, setNotes] = useState('');
  const [deductFromSalary, setDeductFromSalary] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (preselectedEmployeeId) {
        setSelectedEmpId(preselectedEmployeeId);
      } else if (!selectedEmpId && employees.length > 0) {
        setSelectedEmpId(employees[0].id);
      }
      setDate(getTodayShamsi());
      setTime(getCurrentTimeStr());
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, preselectedEmployeeId, employees]);

  if (!isOpen) return null;

  const quickTitles = [
    'پاداش موردی و تشویقی',
    'واریزی متفرقه کارگاهی',
    'بازپرداخت هزینه خرید',
    'کمک‌هزینه و مزایای ویژه',
    'تسویه موردی و علی‌الحساب'
  ];

  const handleAmountChange = (val: string) => {
    const clean = toEnglishDigits(val).replace(/\D/g, '');
    if (!clean) {
      setAmountInput('');
      setRawAmount(0);
    } else {
      const num = parseInt(clean, 10);
      setAmountInput(num.toLocaleString('en-US'));
      setRawAmount(num);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMsg('شما دسترسی مجاز برای ثبت واریزی متفرقه ندارید.');
      return;
    }

    if (!selectedEmpId) {
      setErrorMsg('لطفاً پرسنل دریافت‌کننده را انتخاب کنید.');
      return;
    }

    if (rawAmount <= 0) {
      setErrorMsg('لطفاً مبلغ معتبری وارد فرمایید.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('عنوان یا شرح واریز الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = StorageService.submitMiscPayment({
        employeeId: selectedEmpId,
        amount: rawAmount,
        title: title.trim(),
        date,
        time,
        deductFromSalary,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.payment) {
        setSuccessMsg(`واریزی با موفقیت به مبلغ ${formatCurrencyTomans(rawAmount)} ثبت شد.`);
        if (onSuccess) {
          onSuccess(res.payment);
        }
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccessMsg(null);
          setAmountInput('');
          setRawAmount(0);
          setNotes('');
          onClose();
        }, 800);
      } else {
        setIsSubmitting(false);
        setErrorMsg(res.message || 'خطا در ثبت واریزی متفرقه.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg('خطایی در ارتباط با سیستم رخ داد.');
    }
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <Banknote className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">ثبت سریع واریزی متفرقه به پرسنل</h3>
              <p className="text-[11px] text-emerald-100/90">خارج از سرفصل مساعده و تنخواه کارگاهی</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!isAuthorized ? (
          <div className="p-6 text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">عدم دسترسی مجاز</h4>
            <p className="text-xs text-slate-500">
              ثبت واریزی‌های متفرقه تنها توسط مدیر ارشد، مدیر مالی یا مدیر منابع انسانی امکان‌پذیر است.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              بستن
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Recipient Employee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                پرسنل دریافت‌کننده وجه: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  required
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.position || 'پرسنل'}) - کد: {emp.personalCode}
                      {emp.isHrManager ? ' [مدیر HR]' : ''}
                      {emp.isFinanceManager ? ' [مدیر مالی]' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {selectedEmployee && (
                <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                  {selectedEmployee.cardNumber && (
                    <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      کارت: {selectedEmployee.cardNumber}
                    </span>
                  )}
                  {selectedEmployee.bankAccount && (
                    <span className="text-slate-500">حساب: {selectedEmployee.bankAccount}</span>
                  )}
                </div>
              )}
            </div>

            {/* Amount with commas and Persian words */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                مبلغ واریزی (تومان): <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="مثال: ۲,۵۰۰,۰۰۰"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-left tracking-wider"
                  dir="ltr"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">تومان</span>
              </div>
              {rawAmount > 0 && (
                <div className="mt-1.5 text-xs font-bold text-emerald-800 bg-emerald-50/90 px-3 py-1.5 rounded-xl border border-emerald-200/90 flex items-center gap-1.5 animate-in fade-in">
                  <span className="text-[11px] text-emerald-700/80 font-normal">مبلغ به حروف:</span>
                  <span>{numberToPersianWords(rawAmount)}</span>
                </div>
              )}
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <ShamsiDatePicker
                  label="تاریخ واریز"
                  value={date}
                  onChange={(val) => setDate(val)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ساعت واریز: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="14:35"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left tracking-wider"
                    dir="ltr"
                    required
                  />
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Title / Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سرفصل یا عنوان پرداخت: <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {quickTitles.map((qt) => (
                  <button
                    key={qt}
                    type="button"
                    onClick={() => setTitle(qt)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      title === qt
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {qt}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="شرح کوتاه یا عنوان واریز..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Notes / Description (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                شرح و توضیحات تکمیلی (اختیاری):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات و بابت پرداخت وجه، شماره پیگیری بانکی یا جزئیات اختیاری..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            {/* Settlement Mode Selection */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-800 block">نحوه ثبت در حساب مالی و فیش حقوقی:</span>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="miscPaymentMode"
                    checked={!deductFromSalary}
                    onChange={() => setDeductFromSalary(false)}
                    className="text-emerald-600 cursor-pointer"
                  />
                  <span className="text-slate-800 font-semibold">
                    واریز مستقل نقدی (پرداخت آزاد کارگاهی - منظور در گزارش مالی و سوابق فیش پرسنل)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="miscPaymentMode"
                    checked={deductFromSalary}
                    onChange={() => setDeductFromSalary(true)}
                    className="text-emerald-600 cursor-pointer"
                  />
                  <span className="text-slate-700">
                    کسر از حقوق دوره جاری (به عنوان علی‌الحساب متفرقه)
                  </span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                disabled={isSubmitting}
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rawAmount <= 0}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت قطعی واریزی متفرقه'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
