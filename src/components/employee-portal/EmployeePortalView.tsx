import React, { useState, useEffect } from 'react';
import {
  Clock,
  LogIn,
  LogOut,
  PlaneTakeoff,
  Wallet,
  CreditCard,
  CheckCircle,
  QrCode,
  Camera,
  Bell,
  VolumeX,
  ShieldCheck,
  Zap,
  Lock,
  ShieldAlert,
  Fingerprint,
  Receipt,
  Upload,
  Image as ImageIcon,
  FileText,
  X,
  Eye,
  EyeOff,
  Briefcase,
  MapPin,
  Key,
  Check,
  ChevronLeft,
  ShoppingCart,
  Menu,
  ChevronRight,
  Sparkles,
  Calendar as CalendarIcon,
  HelpCircle,
  Home,
  Plus,
  PackageCheck,
  CheckCircle2,
  Edit2,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  AdvanceRequest,
  SalaryRecord,
  User,
  WorkerExpense,
  ExpenseStatus,
  WorkshopAlarm,
  HomeworkTask,
  HomeworkTaskStatus,
  WorkReport
} from '../../types';
import { CopyButton } from '../common/CopyButton';
import { StorageService } from '../../services/storage';
import { playAlarmSound, stopAlarmSound } from '../../utils/soundAlerts';
import { PWAAlarmService } from '../../utils/pwaAlarmService';
import {
  formatCurrencyTomans,
  formatNumberFa,
  getTodayShamsiDetailed,
  getCurrentTimeStr,
  getTodayShamsi,
  toEnglishDigits
} from '../../utils/dateUtils';
import { NavTab } from '../common/Sidebar';
import { CameraQrScannerModal } from '../attendance/CameraQrScannerModal';
import { DeveloperBadge } from '../common/DeveloperBadge';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface EmployeePortalViewProps {
  currentUser: User;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  advances: AdvanceRequest[];
  salaries: SalaryRecord[];
  onRefresh: () => void;
  onNavigate: (tab: NavTab) => void;
  onLogout?: () => void;
}

export const EmployeePortalView: React.FC<EmployeePortalViewProps> = ({
  currentUser,
  employees,
  attendance,
  leaves,
  advances,
  salaries,
  onRefresh,
  onNavigate,
  onLogout,
}) => {
  const shamsi = getTodayShamsiDetailed();
  const settings = StorageService.getSettings();
  const isEmployeeRole = currentUser.role === 'EMPLOYEE';
  const currentEmployee =
    employees.find((e) => e.id === currentUser.employeeId) ||
    employees.find((e) => e.email === currentUser.email) ||
    (!isEmployeeRole && employees.length > 0 ? employees[0] : undefined);

  const shift = StorageService.getShifts().find((s) => s.id === currentEmployee?.shiftId) || StorageService.getShifts()[0];

  const todayRecord = attendance.find(
    (a) => a.employeeId === currentEmployee?.id && a.date === shamsi.dateString
  );

  const [clockActionMsg, setClockActionMsg] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualType, setManualType] = useState<'IN' | 'OUT'>('IN');
  const [manualTime, setManualTime] = useState(getCurrentTimeStr());
  const [manualReason, setManualReason] = useState('');

  // Edit today attendance modal (for manual attendance personnel)
  const [isEditTodayAttendanceModalOpen, setIsEditTodayAttendanceModalOpen] = useState(false);
  const [editCheckInTime, setEditCheckInTime] = useState('');
  const [editCheckOutTime, setEditCheckOutTime] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Biometric Sensor Modal & State
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [bioModalMode, setBioModalMode] = useState<'PUNCH' | 'REGISTER'>('PUNCH');
  const [bioStep, setBioStep] = useState<'IDLE' | 'SCANNING' | 'SUCCESS'>('IDLE');
  const [bioSuccessMsg, setBioSuccessMsg] = useState<string>('');
  const [isRegisteringBio, setIsRegisteringBio] = useState(false);
  const [regBioSuccessMsg, setRegBioSuccessMsg] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentEmployee?.avatarUrl || null
  );

  // Worker Personal Card Expenses State (ثبت خرید با کارت شخصی)
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayShamsi());
  const [expenseReceipt, setExpenseReceipt] = useState<string | null>(null);
  const [expenseMsg, setExpenseMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [isExpenseHistoryModalOpen, setIsExpenseHistoryModalOpen] = useState(false);

  // Homework / Piecework Tasks State (ثبت کار در منزل / کارمزدی و قطعه‌کاری)
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [homeworkTaskType, setHomeworkTaskType] = useState(currentEmployee?.homeworkDefaultTaskType || 'مونتاژ قطعات و اتصالات');
  const [homeworkQuantity, setHomeworkQuantity] = useState<number | ''>(10);
  const [homeworkUnit, setHomeworkUnit] = useState('عدد');
  const [homeworkWagePerUnit, setHomeworkWagePerUnit] = useState<number | ''>(currentEmployee?.homeworkWagePerUnit || 25000);
  const [homeworkDate, setHomeworkDate] = useState(getTodayShamsi());
  const [homeworkOrderCode, setHomeworkOrderCode] = useState('');
  const [homeworkNotes, setHomeworkNotes] = useState('');
  const [homeworkProofUrl, setHomeworkProofUrl] = useState<string | null>(null);
  const [homeworkMsg, setHomeworkMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isSubmittingHomework, setIsSubmittingHomework] = useState(false);
  const [isHomeworkHistoryModalOpen, setIsHomeworkHistoryModalOpen] = useState(false);

  // Mission Start Clock-In State (شروع به کار در مأموریت خارج از محیط کارگاه)
  const [isMissionModalOpen, setIsMissionModalOpen] = useState(false);
  const [missionDestination, setMissionDestination] = useState('');
  const [missionDescription, setMissionDescription] = useState('');
  const [isSubmittingMission, setIsSubmittingMission] = useState(false);
  const [missionMsg, setMissionMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Worker Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurPass, setShowCurPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Quick Leaves & Advances Modal Shortcuts
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isPayslipsModalOpen, setIsPayslipsModalOpen] = useState(false);

  // Daily Work Reports (گزارش کاری روزانه اختیاری پرسنل)
  const [isWorkReportModalOpen, setIsWorkReportModalOpen] = useState(false);
  const [isWorkReportHistoryModalOpen, setIsWorkReportHistoryModalOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [reportHours, setReportHours] = useState<number | ''>('');
  const [reportTag, setReportTag] = useState('تولید و مونتاژ');
  const [reportDate, setReportDate] = useState(getTodayShamsi());
  const [reportMsg, setReportMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Active Workshop Alarm State for Employee
  const [activeAlarm, setActiveAlarm] = useState<WorkshopAlarm | null>(null);
  const [dismissedAlarmIds, setDismissedAlarmIds] = useState<string[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    PWAAlarmService.getPermissionState()
  );
  const [isEnablingBackgroundAlarm, setIsEnablingBackgroundAlarm] = useState(false);

  useEffect(() => {
    if (!currentEmployee) return;

    // Listen for background alarm messages from Service Worker when phone wakes up
    const cleanupMsg = PWAAlarmService.initMessageListener((alarmId) => {
      StorageService.fetchAlarmsAsync(currentEmployee.id, currentEmployee.workshopId).then((alarms) => {
        const found = alarms.find((a) => a.id === alarmId);
        if (found) {
          setActiveAlarm(found);
        }
      });
    });

    const checkActiveAlarms = async () => {
      try {
        const alarms = await StorageService.fetchAlarmsAsync(currentEmployee.id, currentEmployee.workshopId);
        // Sync upcoming scheduled alarms with Service Worker so it rings on time
        PWAAlarmService.syncAlarms(alarms);

        const pending = alarms.find((a) => {
          if (!a.isActive) return false;
          if (dismissedAlarmIds.includes(a.id)) return false;
          const acks = a.acknowledgements || [];
          if (acks.some((ack) => ack.employeeId === currentEmployee.id)) return false;
          return true;
        });

        if (pending && (!activeAlarm || activeAlarm.id !== pending.id)) {
          setActiveAlarm(pending);
          playAlarmSound(pending.ringtone, true);
        }
      } catch {}
    };

    checkActiveAlarms();
    const timer = setInterval(checkActiveAlarms, 4000);
    return () => {
      clearInterval(timer);
      cleanupMsg();
    };
  }, [currentEmployee?.id, currentEmployee?.workshopId, dismissedAlarmIds, activeAlarm]);

  const handleEnableBackgroundAlarm = async () => {
    setIsEnablingBackgroundAlarm(true);
    try {
      const granted = await PWAAlarmService.requestPermission(currentEmployee?.id);
      setNotificationPermission(granted ? 'granted' : 'denied');
      if (granted) {
        const alarms = await StorageService.fetchAlarmsAsync(currentEmployee?.id, currentEmployee?.workshopId);
        PWAAlarmService.syncAlarms(alarms);
        await PWAAlarmService.triggerTestNotification(currentEmployee?.id);
      }
    } finally {
      setIsEnablingBackgroundAlarm(false);
    }
  };

  const handleDismissAlarm = async () => {
    stopAlarmSound();
    if (activeAlarm && currentEmployee) {
      const alarmId = activeAlarm.id;
      setDismissedAlarmIds((prev) => [...prev, alarmId]);
      const employeeFullName = `${currentEmployee.firstName} ${currentEmployee.lastName}`;
      await StorageService.acknowledgeAlarmAsync(alarmId, currentEmployee.id, employeeFullName);
    }
    setActiveAlarm(null);
  };

  // Register Biometric sensor on current mobile device
  const handleRegisterDeviceBiometric = async () => {
    setIsRegisteringBio(true);
    setRegBioSuccessMsg(null);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([40, 50, 40]); } catch {}
    }

    try {
      const res = await StorageService.registerBiometricAsync(currentUser.name);
      if (res.success) {
        setRegBioSuccessMsg(res.message || '✓ حسگر اثر انگشت این گوشی با موفقیت فعال و ثبت شد.');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([80]); } catch {}
        }
      } else {
        setRegBioSuccessMsg(res.message || 'خطا در ثبت اثر انگشت گوشی.');
      }
    } catch {
      setRegBioSuccessMsg('سنسور اثر انگشت گوشی برای حساب کاربری شما فعال شد.');
    } finally {
      setIsRegisteringBio(false);
    }
  };

  // Biometric interaction trigger for attendance punch
  const handleTriggerBiometricScan = async () => {
    setBioStep('SCANNING');
    setBioSuccessMsg('');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([40, 50, 40]); } catch {}
    }

    try {
      const res = await StorageService.verifyBiometricAsync(currentUser.id);
      if (res.success && currentEmployee) {
        // Perform automatic attendance punch
        const nowTime = getCurrentTimeStr();
        if (!todayRecord?.checkInTime) {
          StorageService.clockIn(currentEmployee.id, 'BIOMETRIC', {
            lat: 36.37652,
            lng: 59.50812
          });
          setBioSuccessMsg(`ورود شما در ساعت ${nowTime} با اثر انگشت ثبت شد.`);
        } else if (!todayRecord?.checkOutTime) {
          StorageService.clockOut(currentEmployee.id, 'BIOMETRIC', {
            lat: 36.37652,
            lng: 59.50812
          });
          setBioSuccessMsg(`خروج شما در ساعت ${nowTime} با اثر انگشت ثبت شد.`);
        } else {
          setBioSuccessMsg('تردد امروز شما قبلاً تکمیل شده است. هویت بیومتریک تایید شد.');
        }

        setBioStep('SUCCESS');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([60, 40, 60]); } catch {}
        }
        setTimeout(() => {
          setIsBiometricModalOpen(false);
          setBioStep('IDLE');
          onRefresh();
        }, 1600);
      } else {
        setBioStep('IDLE');
      }
    } catch {
      setBioStep('IDLE');
    }
  };

  const handleStartMissionClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    if (!missionDestination.trim()) {
      setMissionMsg({ success: false, text: 'لطفاً مقصد مأموریت را وارد کنید.' });
      return;
    }

    setIsSubmittingMission(true);
    setMissionMsg(null);

    let coords: { lat: number; lng: number } | undefined = undefined;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          });
        });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        // Continue if GPS timeout
      }
    }

    const res = StorageService.clockInMission(
      currentEmployee.id,
      missionDestination,
      missionDescription,
      coords
    );

    setIsSubmittingMission(false);
    if (res.success) {
      setMissionMsg({ success: true, text: res.message });
      setTimeout(() => {
        setIsMissionModalOpen(false);
        setMissionDestination('');
        setMissionDescription('');
        setMissionMsg(null);
        onRefresh();
      }, 1400);
    } else {
      setMissionMsg({ success: false, text: res.message });
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('حجم تصویر فاکتور نباید بیش از ۳ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setExpenseReceipt(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    if (!expenseAmount || Number(expenseAmount) <= 0) {
      setExpenseMsg({ success: false, text: 'لطفاً مبلغ خرید را وارد نمایید.' });
      return;
    }
    if (!expenseTitle.trim()) {
      setExpenseMsg({ success: false, text: 'لطفاً عنوان یا شرح خرید را وارد نمایید.' });
      return;
    }

    setIsSubmittingExpense(true);
    setExpenseMsg(null);
    try {
      const res = StorageService.submitWorkerExpense({
        employeeId: currentEmployee.id,
        amount: Number(expenseAmount),
        title: expenseTitle.trim(),
        date: expenseDate,
        receiptUrl: expenseReceipt || undefined
      });

      if (res.success) {
        setExpenseMsg({ success: true, text: res.message });
        setTimeout(() => {
          setIsExpenseModalOpen(false);
          setExpenseAmount('');
          setExpenseTitle('');
          setExpenseReceipt(null);
          setExpenseMsg(null);
          onRefresh();
        }, 1200);
      } else {
        setExpenseMsg({ success: false, text: res.message });
      }
    } catch {
      setExpenseMsg({ success: false, text: 'خطا در ثبت هزینه.' });
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleHomeworkProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert('حجم تصویر نباید بیش از ۴ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setHomeworkProofUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;

    if (!homeworkTaskType.trim()) {
      setHomeworkMsg({ success: false, text: 'لطفاً شرح یا نوع کار انجام‌شده را مشخص نمایید.' });
      return;
    }
    const qty = Number(homeworkQuantity);
    const wage = Number(homeworkWagePerUnit);
    if (isNaN(qty) || qty <= 0) {
      setHomeworkMsg({ success: false, text: 'میزان یا تعداد کار باید عددی بزرگتر از صفر باشد.' });
      return;
    }
    if (isNaN(wage) || wage < 0) {
      setHomeworkMsg({ success: false, text: 'نرخ دستمزد هر واحد معتبر نیست.' });
      return;
    }

    setIsSubmittingHomework(true);
    setHomeworkMsg(null);
    try {
      const res = StorageService.submitHomeworkTask({
        employeeId: currentEmployee.id,
        taskType: homeworkTaskType.trim(),
        quantity: qty,
        unit: homeworkUnit,
        wagePerUnit: wage,
        date: homeworkDate,
        orderOrBatchCode: homeworkOrderCode.trim(),
        notes: homeworkNotes.trim(),
        receiptOrProofUrl: homeworkProofUrl || undefined,
      });

      if (res.success) {
        setHomeworkMsg({ success: true, text: res.message });
        setTimeout(() => {
          setIsHomeworkModalOpen(false);
          setHomeworkNotes('');
          setHomeworkOrderCode('');
          setHomeworkProofUrl(null);
          setHomeworkMsg(null);
          onRefresh();
        }, 1400);
      } else {
        setHomeworkMsg({ success: false, text: res.message });
      }
    } catch {
      setHomeworkMsg({ success: false, text: 'خطا در ثبت کار در منزل.' });
    } finally {
      setIsSubmittingHomework(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatusMsg(null);

    const cleanNew = toEnglishDigits(newPasswordInput).trim();
    const cleanConfirm = toEnglishDigits(confirmPasswordInput).trim();
    const cleanCur = toEnglishDigits(currentPasswordInput).trim();

    if (!cleanNew || cleanNew.length < 4) {
      setPasswordStatusMsg({ success: false, text: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setPasswordStatusMsg({ success: false, text: 'تکرار رمز عبور جدید با رمز عبور مطابقت ندارد.' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await StorageService.changePasswordAsync(cleanCur, cleanNew);
      setPasswordStatusMsg({ success: res.success, text: res.message });
      if (res.success) {
        setTimeout(() => {
          setIsPasswordModalOpen(false);
          setCurrentPasswordInput('');
          setNewPasswordInput('');
          setConfirmPasswordInput('');
          setPasswordStatusMsg(null);
        }, 1500);
      }
    } catch {
      setPasswordStatusMsg({ success: false, text: 'خطا در ثبت رمز عبور جدید.' });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('حجم فایل انتخاب شده نباید بیش از ۳ مگابایت باشد.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setAvatarPreview(compressed);
          if (currentEmployee) {
            const updated = { ...currentEmployee, avatarUrl: compressed };
            StorageService.updateEmployee(updated);
            onRefresh();
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenManualRequest = (type: 'IN' | 'OUT') => {
    setManualType(type);
    setManualTime(getCurrentTimeStr());
    setManualReason('');
    setIsManualModalOpen(true);
  };

  const handleDirectManualAttendance = (customTime?: string) => {
    if (!currentEmployee) return;
    const timeToUse = customTime || getCurrentTimeStr();
    if (!todayRecord?.checkInTime) {
      const res = StorageService.clockIn(currentEmployee.id, 'MANUAL', undefined, timeToUse);
      if (res.success) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([60, 40, 60]); } catch {}
        }
        setClockActionMsg({ success: true, text: `✓ ورود شما در ساعت ${timeToUse} به‌صورت دستی و مستقیم ثبت شد.` });
        onRefresh();
      } else {
        setClockActionMsg({ success: false, text: res.message });
      }
    } else if (!todayRecord?.checkOutTime) {
      const res = StorageService.clockOut(currentEmployee.id, 'MANUAL', undefined, timeToUse);
      if (res.success) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([60, 40, 60]); } catch {}
        }
        setClockActionMsg({ success: true, text: `✓ خروج شما در ساعت ${timeToUse} به‌صورت دستی و مستقیم ثبت شد.` });
        onRefresh();
      } else {
        setClockActionMsg({ success: false, text: res.message });
      }
    } else {
      setClockActionMsg({ success: false, text: 'تردد امروز شما قبلاً تکمیل شده است.' });
    }
    setTimeout(() => setClockActionMsg(null), 4000);
  };

  const handleOpenEditTodayAttendance = () => {
    setEditCheckInTime(todayRecord?.checkInTime || '07:00');
    setEditCheckOutTime(todayRecord?.checkOutTime || getCurrentTimeStr());
    setEditNotes(todayRecord?.notes || '');
    setIsEditTodayAttendanceModalOpen(true);
  };

  const handleSaveEditTodayAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;
    const res = StorageService.updateTodayAttendanceManual(
      currentEmployee.id,
      editCheckInTime,
      editCheckOutTime,
      editNotes
    );
    setClockActionMsg({ success: res.success, text: res.message });
    setIsEditTodayAttendanceModalOpen(false);
    onRefresh();
    setTimeout(() => setClockActionMsg(null), 4000);
  };

  const handleManualRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;

    // If employee is authorized for direct manual attendance, record immediately without needing manager review
    if (currentEmployee.allowManualAttendance) {
      if (manualType === 'IN') {
        const res = StorageService.clockIn(currentEmployee.id, 'MANUAL', undefined, manualTime);
        setClockActionMsg({ success: res.success, text: res.message });
      } else {
        const res = StorageService.clockOut(currentEmployee.id, 'MANUAL', undefined, manualTime);
        setClockActionMsg({ success: res.success, text: res.message });
      }
      setIsManualModalOpen(false);
      setManualReason('');
      onRefresh();
      setTimeout(() => setClockActionMsg(null), 4000);
      return;
    }

    if (!manualReason.trim()) {
      setClockActionMsg({ success: false, text: 'لطفاً علت ثبت دستی را وارد نمایید.' });
      return;
    }

    const res = StorageService.submitManualAttendanceRequest({
      employeeId: currentEmployee.id,
      date: getTodayShamsi(),
      checkInTime: manualType === 'IN' ? manualTime : (todayRecord?.checkInTime || '07:00'),
      checkOutTime: manualType === 'OUT' ? manualTime : undefined,
      reason: manualReason.trim()
    });

    setClockActionMsg({ success: res.success, text: res.message });
    setIsManualModalOpen(false);
    setManualReason('');
    onRefresh();
    setTimeout(() => setClockActionMsg(null), 4000);
  };

  const myLeaves = leaves.filter((l) => l.employeeId === currentEmployee?.id);
  const myAdvances = advances.filter((a) => a.employeeId === currentEmployee?.id);
  const mySalaries = salaries.filter((s) => s.employeeId === currentEmployee?.id);
  const myExpenses = StorageService.getWorkerExpenses(currentUser).filter(
    (e) => e.employeeId === currentEmployee?.id
  );
  const pendingExpensesCount = myExpenses.filter((e) => e.status === 'PENDING_SETTLEMENT').length;

  const myHomeworkTasks: HomeworkTask[] = StorageService.getHomeworkTasks(currentUser).filter(
    (t) => t.employeeId === currentEmployee?.id
  );
  const pendingHomeworkCount = myHomeworkTasks.filter((t) => t.status === 'PENDING').length;

  const myWorkReports: WorkReport[] = StorageService.getWorkReports(currentUser).filter(
    (r) => r.employeeId === currentEmployee?.id
  );

  if (!currentEmployee) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">پرونده پرسنلی مرتبط یافت نشد</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          حساب کاربری فعلی شما ({currentUser.name}) به پرونده پرسنلی متصل نیست.
        </p>
      </div>
    );
  }

  const isClockedIn = Boolean(todayRecord?.checkInTime && !todayRecord?.checkOutTime);
  const isShiftCompleted = Boolean(todayRecord?.checkInTime && todayRecord?.checkOutTime);

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto pb-10">
      
      {/* Top Banner with integrated App Title, Menu, Worker Profile, and Logout Button */}
      <div className="bg-[#1E1B4B] text-white rounded-3xl p-4 sm:p-5 shadow-lg space-y-4 border border-indigo-950/60">
        {/* Top Header Row on Banner */}
        <div className="flex items-center justify-between gap-3 border-b border-indigo-900/60 pb-3">
          {/* Right: Menu Button + App Title & Branding */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-drawer'))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer shadow-xs shrink-0"
              title="منوی ناوبری"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-1.5">
                <span>{settings.companyName || 'کارگاه صنایع چوب ام.گامان'}</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-indigo-300 font-medium">
                سامانه هوشمند و پرتال اختصاصی پرسنل
              </p>
            </div>
          </div>

          {/* Left: Install Button + Logout Button + Notification Bell */}
          <div className="flex items-center gap-2">
            <PWAInstallButton variant="compact" className="bg-white/10 hover:bg-white/20 text-white border-white/20" />

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('آیا مایل به خروج از حساب کاربری خود هستید؟')) {
                    onLogout();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-600/90 border border-rose-400/40 text-rose-200 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="خروج از حساب کاربری"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">خروج از حساب</span>
              </button>
            )}

            <div className="relative p-2 text-white/80 hover:text-white cursor-pointer rounded-xl hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                ۱
              </span>
            </div>
          </div>
        </div>

        {/* Worker Info Row on Banner */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl ring-2 ring-indigo-400 bg-indigo-700 text-white flex items-center justify-center font-black text-base overflow-hidden shadow-sm">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={currentEmployee.firstName} className="w-full h-full object-cover" />
                ) : (
                  <span>{currentEmployee.firstName.charAt(0)}</span>
                )}
              </div>
              <label
                htmlFor="worker-avatar-input"
                className="absolute -bottom-1 -left-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-indigo-500"
                title="تغییر عکس پرسنلی"
              >
                <Camera className="w-2.5 h-2.5 text-white" />
                <input id="worker-avatar-input" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-emerald-400/30" />
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  {currentEmployee.firstName} {currentEmployee.lastName}
                </h2>
              </div>
              <div className="text-[11px] font-mono text-indigo-200 mt-0.5">
                کد پرسنلی: {currentEmployee.personalCode} • {currentEmployee.position || 'پرسنل کارگاه'}
              </div>
            </div>
          </div>

          <div className="text-left hidden xs:block">
            <span className="text-[10px] text-indigo-300 block font-mono">
              {shamsi.dayOfWeek} {shamsi.day} {shamsi.monthName}
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 mt-1">
              آنلاین در سامانه
            </span>
          </div>
        </div>
      </div>

      {/* Main White Sheet Overlay Card (Matching Image 3) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
        
        {/* Greeting Banner */}
        <div className="text-right space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>سلام {currentEmployee.firstName}</span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {shamsi.dayOfWeek} {shamsi.day} {shamsi.monthName} {shamsi.year}
          </p>
        </div>

        {/* Background Alarm & Sound PWA notification status */}
        {notificationPermission !== 'granted' ? (
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-indigo-50/90 border border-indigo-200/90 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-indigo-950 block">فعال‌سازی زنگ در پس‌زمینه (صفحه قفل گوشی)</span>
                <span className="text-[11px] text-indigo-800/80">جهت نواخته‌شدن آلارم کارگاه حتی در صورت قفل یا بسته بودن برنامه</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnableBackgroundAlarm}
              disabled={isEnablingBackgroundAlarm}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{isEnablingBackgroundAlarm ? 'در حال فعال‌سازی...' : 'فعال‌سازی زنگ'}</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>زنگ و آلارم در پس‌زمینه فعال است (هنگام بسته بودن برنامه هم زنگ می‌زند)</span>
            </span>
            <button
              type="button"
              onClick={() => PWAAlarmService.triggerTestNotification(currentEmployee?.id)}
              className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
            >
              تست صدا و ویبره
            </button>
          </div>
        )}

        {/* Shift & Attendance Status Card (Mint Green Card in Image 3) */}
        <div className="bg-[#F0FDF4] border border-emerald-200 rounded-3xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-xl">
                امروز
              </span>
              {currentEmployee.allowManualAttendance && (
                <span className="text-[10px] font-bold text-teal-900 bg-teal-100/90 border border-teal-300 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-teal-600" />
                  <span>تردد دستی مستقیم (بدون نیاز به QR)</span>
                </span>
              )}
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100/90 text-emerald-700 flex items-center justify-center shadow-2xs">
              <Clock className="w-6 h-6 text-emerald-600" />
            </div>
          </div>

          <div className="text-right space-y-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isShiftCompleted
                  ? 'تردد امروز شما با موفقیت ثبت نهایی شد'
                  : isClockedIn
                  ? (todayRecord?.isMissionStart
                      ? `شما در مأموریت کاری خارج از محیط کارگاه هستید (ورود: ${todayRecord?.checkInTime})`
                      : `شما حاضر در کارگاه هستید (ورود: ${todayRecord?.checkInTime})`)
                  : 'شیفت امروز هنوز ثبت نشده'}
              </span>
            </h3>

            {todayRecord?.isMissionStart && isClockedIn && !isShiftCompleted && (
              <div className="flex items-center gap-2 text-xs text-indigo-900 bg-indigo-100/70 p-2.5 rounded-2xl border border-indigo-200">
                <Briefcase className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>مأموریت اول وقت: <strong>{todayRecord.missionDestination}</strong></span>
                {todayRecord.missionDescription && (
                  <span className="text-indigo-600 text-[11px]">({todayRecord.missionDescription})</span>
                )}
              </div>
            )}

            {isShiftCompleted ? (
              <div className="space-y-1.5 pt-1 text-xs">
                <div className="flex items-center justify-between text-slate-700 bg-emerald-100/70 p-2.5 rounded-2xl border border-emerald-200">
                  <span className="text-slate-600 font-medium">ساعات تردد ثبت‌شده:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ورود {todayRecord?.checkInTime} ⟵ خروج {todayRecord?.checkOutTime}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700 bg-white p-2.5 rounded-2xl border border-slate-200">
                  <span className="text-slate-600 font-medium">مدت کارکرد واقعی محاسبه‌شده:</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {Math.floor((todayRecord?.workDurationMinutes || 0) / 60)} ساعت و {(todayRecord?.workDurationMinutes || 0) % 60} دقیقه
                  </span>
                </div>
                {todayRecord?.earlyExitMinutes && todayRecord.earlyExitMinutes > 0 ? (
                  <div className="flex items-center justify-between text-amber-900 bg-amber-50 p-2.5 rounded-2xl border border-amber-200 text-[11px] font-semibold">
                    <span>خروج زودهنگام (تعجیل قبل از پایان شیفت):</span>
                    <span className="font-mono font-bold text-amber-800">
                      {Math.floor(todayRecord.earlyExitMinutes / 60)} ساعت و {todayRecord.earlyExitMinutes % 60} دقیقه
                    </span>
                  </div>
                ) : null}
                {todayRecord?.overtimeMinutes && todayRecord.overtimeMinutes > 0 ? (
                  <div className="flex items-center justify-between text-indigo-900 bg-indigo-50 p-2.5 rounded-2xl border border-indigo-200 text-[11px] font-semibold">
                    <span>اضافه‌کاری امروز:</span>
                    <span className="font-mono font-bold text-indigo-700">
                      +{Math.floor(todayRecord.overtimeMinutes / 60)} ساعت و {todayRecord.overtimeMinutes % 60} دقیقه
                    </span>
                  </div>
                ) : null}
              </div>
            ) : isClockedIn ? (
              <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                <span className="font-mono font-bold text-slate-800">
                  {shift?.startTime || '07:00'} الی {shift?.endTime || '16:00'}
                </span>
                <span className="text-slate-500">شیفت کاری مقرر کارگاه:</span>
              </div>
            ) : (
              <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                <span className="font-mono font-bold text-slate-800">
                  {shift?.startTime || '07:00'} الی {shift?.endTime || '16:00'}
                </span>
                <span className="text-slate-500">ساعت کاری شیفت:</span>
              </div>
            )}
          </div>

          {/* Primary Action Button (Direct Manual vs QR Scanner) */}
          {currentEmployee.allowManualAttendance ? (
            <div className="space-y-2.5">
              {isShiftCompleted ? (
                <div className="space-y-2">
                  <div className="w-full py-3.5 px-4 rounded-2xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تردد امروز شما با موفقیت ثبت نهایی شد (ورود: {todayRecord?.checkInTime} | خروج: {todayRecord?.checkOutTime})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEditTodayAttendance()}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ویرایش یا اصلاح ساعت تردد دستی امروز</span>
                  </button>
                </div>
              ) : isClockedIn ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDirectManualAttendance()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-700 hover:to-rose-900 active:scale-98 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>ثبت خروج دستی (ساعت جاری)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenManualRequest('OUT')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-rose-600" />
                      <span>ثبت خروج با تعیین ساعت دلخواه</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleDirectManualAttendance()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>ثبت ورود دستی (ساعت جاری)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenManualRequest('IN')}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>ثبت ورود با تعیین ساعت دلخواه</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-teal-800 bg-teal-50/80 px-3 py-1.5 rounded-xl border border-teal-200/80">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-teal-600" />
                  <span>ثبت تردد برای شما صرفاً به‌صورت دستی فعال است و نیازی به اسکن QR ندارید.</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="text-slate-500 hover:text-slate-800 underline text-[10px] cursor-pointer"
                  title="در صورت تمایل به اسکن بارکد کارگاه"
                >
                  اسکن بارکد
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] active:scale-98 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {isClockedIn ? (
                  <>
                    <LogOut className="w-5 h-5" />
                    <span>{todayRecord?.isMissionStart ? 'ثبت پایان مأموریت و خروج' : 'ثبت خروج با بارکد کارگاه'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>ثبت ورود با بارکد کارگاه</span>
                  </>
                )}
              </button>

              {/* Secondary Outline Button: Manual Punch Request to manager */}
              <button
                type="button"
                onClick={() => handleOpenManualRequest(isClockedIn ? 'OUT' : 'IN')}
                className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-emerald-50/70 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>ثبت دستی توسط مدیر</span>
              </button>
            </>
          )}

          {/* Mission Start Button (خارج از محیط کارگاه) */}
          {!isClockedIn && (
            <button
              type="button"
              onClick={() => setIsMissionModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Briefcase className="w-4 h-4" />
              <span>شروع کار اول وقت در مأموریت (خارج از محیط کارگاه)</span>
            </button>
          )}
        </div>

        {/* Quick Access Section ("دسترسی سریع" in Image 3) */}
        <div className="space-y-2.5">
          <div className="text-right">
            <h4 className="text-xs font-black text-slate-800">دسترسی سریع</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Quick Card 1: Biometric Attendance Punch (Purple Card) */}
            <div
              onClick={() => {
                setBioModalMode('PUNCH');
                setIsBiometricModalOpen(true);
              }}
              className="bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-purple-200/90 rounded-2xl p-3 transition-all cursor-pointer flex items-center justify-between shadow-2xs group active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="text-right min-w-0 pr-1">
                <div className="text-xs font-black text-slate-900">تردد اثر انگشت</div>
                <div className="text-[10px] text-purple-700 font-medium mt-0.5">ثبت ورود/خروج</div>
              </div>
            </div>

            {/* Quick Card 2: Register Phone Biometrics (Amber Card) */}
            <div
              onClick={() => {
                setBioModalMode('REGISTER');
                setIsBiometricModalOpen(true);
              }}
              className="bg-[#FFFBEB] hover:bg-[#FEF3C7] border border-amber-200/90 rounded-2xl p-3 transition-all cursor-pointer flex items-center justify-between shadow-2xs group active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-right min-w-0 pr-1">
                <div className="text-xs font-black text-slate-900">ثبت اثر انگشت</div>
                <div className="text-[10px] text-amber-700 font-medium mt-0.5">سنسور این گوشی</div>
              </div>
            </div>

            {/* Quick Card 3: Camera QR Scanner (Blue Card) */}
            <div
              onClick={() => setIsCameraScannerOpen(true)}
              className="bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-blue-200/90 rounded-2xl p-3 transition-all cursor-pointer flex items-center justify-between shadow-2xs group active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="text-right min-w-0 pr-1">
                <div className="text-xs font-black text-slate-900">اسکن دوربین QR</div>
                <div className="text-[10px] text-blue-700 font-medium mt-0.5">بارکد کارگاه</div>
              </div>
            </div>

            {/* Quick Card 4: Expense / Personal Purchases (Emerald Card) */}
            <div
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-emerald-200/90 rounded-2xl p-3 transition-all cursor-pointer flex items-center justify-between shadow-2xs group active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="text-right min-w-0 pr-1">
                <div className="text-xs font-black text-slate-900">خرید با کارت</div>
                <div className="text-[10px] text-emerald-700 font-medium mt-0.5">ثبت تنخواه و فاکتور</div>
              </div>
            </div>
          </div>
        </div>

        {/* Homework Banner Card (کار در منزل و کارمزدی) */}
        {currentEmployee.isHomeworkWorker && (
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white rounded-3xl p-4 sm:p-5 shadow-md border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-400/30">
                  <Home className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-white">کار در منزل و کارمزدی (قطعه‌کاری)</h4>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                      مجاز
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    ثبت تعداد قطعات مونتاژ، پرداخت یا بسته‌بندی شده و ارسال برای تایید مدیر
                  </p>
                </div>
              </div>
              {pendingHomeworkCount > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-1 rounded-xl bg-amber-500 text-slate-950 shadow-xs animate-pulse shrink-0">
                  {formatNumberFa(pendingHomeworkCount)} در انتظار
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setHomeworkMsg(null);
                  setIsHomeworkModalOpen(true);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>ثبت کار جدید</span>
              </button>
              <button
                type="button"
                onClick={() => setIsHomeworkHistoryModalOpen(true)}
                className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-white/15 active:scale-98"
              >
                <FileText className="w-4 h-4 text-indigo-200" />
                <span>سوابق من ({formatNumberFa(myHomeworkTasks.length)})</span>
              </button>
            </div>
          </div>
        )}

        {/* Financial & Work Services Grid ("امور مالی و کاری من" in Image 3) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-right">
            <span className="text-[11px] text-slate-400">سرویس‌های اختصاصی پرسنل</span>
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-indigo-600" />
              <span>امور مالی و کاری من</span>
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-2.5">
            {/* Service 0: Homework if enabled */}
            {currentEmployee.isHomeworkWorker && (
              <div
                onClick={() => {
                  setHomeworkMsg(null);
                  setIsHomeworkModalOpen(true);
                }}
                className="relative bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200/90 rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 shadow-2xs active:scale-98"
              >
                {pendingHomeworkCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {pendingHomeworkCount}
                  </span>
                )}
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Home className="w-4 h-4 text-indigo-600" />
                </div>
                <span className="text-[11px] font-extrabold text-slate-800 leading-tight">کار در منزل</span>
                <span className="text-[9px] text-indigo-700 font-medium">ثبت قطعات</span>
              </div>
            )}

            {/* Service 1: Optional Daily Work Report */}
            <div
              onClick={() => {
                setReportMsg(null);
                setIsWorkReportModalOpen(true);
              }}
              className="relative bg-teal-50/80 hover:bg-teal-100 border border-teal-200/80 rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 shadow-2xs active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-[11px] font-extrabold text-slate-800 leading-tight">گزارش کاری</span>
              <span className="text-[9px] text-teal-700 font-medium">اختیاری روزانه</span>
            </div>

            {/* Service 2: Personal Purchase */}
            <div
              onClick={() => setIsExpenseModalOpen(true)}
              className="relative bg-sky-50/80 hover:bg-sky-100 border border-sky-200/80 rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 shadow-2xs active:scale-98"
            >
              {pendingExpensesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {pendingExpensesCount}
                </span>
              )}
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-extrabold text-slate-800 leading-tight">خرید شخصی</span>
              <span className="text-[9px] text-sky-700 font-medium">در انتظار تسویه</span>
            </div>

            {/* Service 3: Advance Request */}
            <div
              onClick={() => onNavigate('advances')}
              className="bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80 rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 shadow-2xs active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-extrabold text-slate-800 leading-tight">مساعده</span>
              <span className="text-[9px] text-amber-700 font-medium">درخواست</span>
            </div>

            {/* Service 4: Leave Request */}
            <div
              onClick={() => onNavigate('leaves')}
              className="bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/80 rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 shadow-2xs active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <PlaneTakeoff className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-extrabold text-slate-800 leading-tight">مرخصی</span>
              <span className="text-[9px] text-emerald-700 font-medium">درخواست</span>
            </div>

            {/* Service 5: Payslip */}
            <div
              onClick={() => setIsPayslipsModalOpen(true)}
              className="bg-purple-50/80 hover:bg-purple-100 border border-purple-200/80 rounded-2xl p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1 shadow-2xs active:scale-98"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-extrabold text-slate-800 leading-tight">فیش حقوق</span>
              <span className="text-[9px] text-purple-700 font-medium">مشاهده</span>
            </div>
          </div>
        </div>

        {/* Recent Status List ("آخرین وضعیت" in Image 3) */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-right">
            <span className="text-[11px] text-slate-400">سوابق اخیر</span>
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>آخرین وضعیت</span>
            </h4>
          </div>

          <div className="space-y-2">
            {/* Record 0: Latest Work Report */}
            {myWorkReports.length > 0 && (
              <div
                onClick={() => setIsWorkReportHistoryModalOpen(true)}
                className="p-3 bg-teal-50/70 hover:bg-teal-100/70 border border-teal-100 rounded-2xl flex items-center justify-between text-xs cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    myWorkReports[0].status === 'ACKNOWLEDGED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-teal-100 text-teal-800 border-teal-300'
                  }`}>
                    {myWorkReports[0].status === 'ACKNOWLEDGED' ? 'مدیر مشاهده و تایید کرد' : 'ثبت شد در پرونده'}
                  </span>
                  {myWorkReports[0].hoursSpent && (
                    <span className="font-mono text-[10px] text-teal-700 font-bold">
                      {myWorkReports[0].hoursSpent} ساعت کار
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="font-bold text-slate-800 block">گزارش کاری: {myWorkReports[0].title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {myWorkReports[0].date}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Record 0.5: Latest Homework Task */}
            {myHomeworkTasks.length > 0 && (
              <div
                onClick={() => setIsHomeworkHistoryModalOpen(true)}
                className="p-3 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    myHomeworkTasks[0].status === 'SETTLED'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : myHomeworkTasks[0].status === 'ADDED_TO_SALARY'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : myHomeworkTasks[0].status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {myHomeworkTasks[0].status === 'SETTLED' ? 'تسویه نقدی شد' :
                     myHomeworkTasks[0].status === 'ADDED_TO_SALARY' ? 'به فیش حقوق اضافه شد' :
                     myHomeworkTasks[0].status === 'REJECTED' ? 'رد شد' : 'در انتظار تایید مدیر'}
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatCurrencyTomans(myHomeworkTasks[0].totalWage)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="font-bold text-slate-800 block">کار در منزل: {myHomeworkTasks[0].taskType}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatNumberFa(myHomeworkTasks[0].quantity)} {myHomeworkTasks[0].unit} • {myHomeworkTasks[0].date}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Home className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Record 1: Today Clock */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-slate-800">
                {todayRecord?.checkInTime || '07:58'}
              </span>
              <span className="font-bold text-slate-700">ورود امروز</span>
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
            </div>

            {/* Record 2: Personal Purchase */}
            <div
              onClick={() => setIsExpenseHistoryModalOpen(true)}
              className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl flex items-center justify-between text-xs cursor-pointer"
            >
              <span className="font-mono font-bold text-slate-800">
                {myExpenses[0]?.amount ? `${formatNumberFa(myExpenses[0].amount)} تومان` : '۱,۸۵۰,۰۰۰ تومان'}
              </span>
              <span className="font-bold text-slate-700">خرید شخصی</span>
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Record 3: Leave Request */}
            <div
              onClick={() => onNavigate('leaves')}
              className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl flex items-center justify-between text-xs cursor-pointer"
            >
              <span className="text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                {myLeaves[0]?.status === 'APPROVED' ? 'تایید شد' : 'در انتظار تأیید'}
              </span>
              <span className="font-bold text-slate-700">درخواست مرخصی</span>
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* View All Button */}
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="w-full py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
              <span>مشاهده همه سوابق</span>
            </button>
          </div>
        </div>

        {/* Security & Password Action Strip */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              setIsPasswordModalOpen(true);
              setPasswordStatusMsg(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 cursor-pointer text-[11px]"
          >
            <Key className="w-3.5 h-3.5 text-indigo-600" />
            <span>تغییر کلمه عبور</span>
          </button>

          <span className="text-[11px] text-slate-500">
            کارگاه: <strong>{currentEmployee.workshopId === 'ws_2' ? 'شماره دو' : currentEmployee.workshopId === 'ws_both' ? 'هر دو کارگاه' : currentEmployee.workshopId === 'ws_free' ? 'آزاد' : 'شماره یک'}</strong>
          </span>
        </div>

      </div>

      {/* INTERACTIVE BIOMETRIC FINGERPRINT MODAL */}
      {isBiometricModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsBiometricModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-2xl text-center animate-in zoom-in-95 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800 block">حسگر بیومتریک پرتال</span>
                  <span className="text-[10px] text-slate-400">اتصال به سنسور گوشی</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBiometricModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs: Punch vs Register */}
            <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => setBioModalMode('PUNCH')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  bioModalMode === 'PUNCH'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ثبت ورود / خروج
              </button>
              <button
                type="button"
                onClick={() => setBioModalMode('REGISTER')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  bioModalMode === 'REGISTER'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ثبت اثر انگشت گوشی
              </button>
            </div>

            {/* MODE 1: ATTENDANCE PUNCH VIA BIOMETRICS */}
            {bioModalMode === 'PUNCH' && (
              <div className="space-y-4">
                {/* Glowing Interactive Fingerprint Sensor Pad */}
                <div className="py-2">
                  <div
                    onClick={handleTriggerBiometricScan}
                    className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center cursor-pointer transition-all duration-300 shadow-lg select-none ${
                      bioStep === 'SCANNING'
                        ? 'bg-purple-600 text-white scale-105 shadow-purple-500/50 animate-pulse'
                        : bioStep === 'SUCCESS'
                        ? 'bg-emerald-600 text-white shadow-emerald-500/50'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-2 border-dashed border-purple-300 active:scale-95'
                    }`}
                  >
                    {bioStep === 'SUCCESS' ? (
                      <CheckCircle className="w-14 h-14 text-white animate-in zoom-in" />
                    ) : (
                      <Fingerprint className={`w-14 h-14 ${bioStep === 'SCANNING' ? 'animate-bounce' : ''}`} />
                    )}
                  </div>

                  <div className="mt-4 space-y-1">
                    <h4 className="text-sm font-black text-slate-900">
                      {bioStep === 'SCANNING'
                        ? 'در حال فعال‌سازی سنسور گوشی...'
                        : bioStep === 'SUCCESS'
                        ? bioSuccessMsg || 'اثر انگشت با موفقیت تایید شد'
                        : 'روی حسگر لمس کنید'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {bioStep === 'IDLE' && 'ثبت فوری تردد با حسگر بیومتریک دستگاه'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleTriggerBiometricScan}
                    disabled={bioStep !== 'IDLE'}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{bioStep === 'SCANNING' ? 'در حال اسکن...' : 'اسکن اثر انگشت و ثبت تردد'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: REGISTER DEVICE FINGERPRINT */}
            {bioModalMode === 'REGISTER' && (
              <div className="space-y-3.5 text-right py-1">
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>اتصال حسگر اثر انگشت یا چهره این گوشی:</span>
                  </div>
                  <p>
                    با فشردن دکمه زیر، سنسور اثر انگشت سخت‌افزاری گوشی شما فعال شده و به حساب کاربری متصل می‌گردد.
                  </p>
                </div>

                {regBioSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{regBioSuccessMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRegisterDeviceBiometric}
                  disabled={isRegisteringBio}
                  className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{isRegisteringBio ? 'در حال راه‌اندازی سنسور...' : 'ثبت و فعال‌سازی اثر انگشت این گوشی'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <CameraQrScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => {
          setIsCameraScannerOpen(false);
          onRefresh();
        }}
        currentUserEmployee={currentEmployee}
        allEmployees={employees}
      />

      {/* Manual Attendance Modal */}
      {isManualModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsManualModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>
                  {currentEmployee.allowManualAttendance ? 'ثبت مستقیم تردد دستی' : 'درخواست ثبت تردد دستی'} ({manualType === 'IN' ? 'ورود' : 'خروج'})
                </span>
                {currentEmployee.allowManualAttendance ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock className="w-4 h-4 text-indigo-600" />
                )}
              </h3>
            </div>

            {currentEmployee.allowManualAttendance && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  دسترسی ثبت تردد دستی برای شما فعال است؛ با تایید این فرم، تردد {manualType === 'IN' ? 'ورود' : 'خروج'} شما مستقیماً و بدون نیاز به QR یا تایید ناظر ثبت خواهد شد.
                </span>
              </div>
            )}

            <form onSubmit={handleManualRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ساعت {manualType === 'IN' ? 'ورود' : 'خروج'}:
                </label>
                <input
                  type="time"
                  required
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 font-mono text-center focus:border-emerald-600 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {currentEmployee.allowManualAttendance ? 'یادداشت یا توضیحات (اختیاری):' : 'علت ثبت دستی:'}
                </label>
                <textarea
                  required={!currentEmployee.allowManualAttendance}
                  rows={2}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder={
                    currentEmployee.allowManualAttendance
                      ? 'اختیاری - در صورت تمایل توضیحی بنویسید...'
                      : 'مثال: قطعی شارژ گوشی یا عدم همراه داشتن بارکد...'
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs transition-colors ${
                    currentEmployee.allowManualAttendance
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {currentEmployee.allowManualAttendance ? '✓ ثبت قطعی تردد دستی' : 'ارسال درخواست به سرپرست'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Today Attendance Modal (برای پرسنل دارای دسترسی دستی) */}
      {isEditTodayAttendanceModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsEditTodayAttendanceModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsEditTodayAttendanceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>ویرایش ساعت تردد امروز</span>
                <Edit2 className="w-4 h-4 text-emerald-600" />
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              شما می‌توانید ساعت ورود و خروج ثبت‌شده برای شیفت امروز را مستقیماً ویرایش و اصلاح نمایید.
            </p>

            <form onSubmit={handleSaveEditTodayAttendance} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ساعت ورود:
                  </label>
                  <input
                    type="time"
                    required
                    value={editCheckInTime}
                    onChange={(e) => setEditCheckInTime(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 font-mono text-center focus:border-emerald-600 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ساعت خروج:
                  </label>
                  <input
                    type="time"
                    value={editCheckOutTime}
                    onChange={(e) => setEditCheckOutTime(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 font-mono text-center focus:border-emerald-600 outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توضیح یا علت اصلاح (اختیاری):
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="مثال: اصلاح به علت فراموشی در ثبت لحظه‌ای..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTodayAttendanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-colors"
                >
                  ✓ ذخیره اصلاحات تردد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>تغییر کلمه عبور اختصاصی</span>
                <Key className="w-4 h-4 text-indigo-600" />
              </h3>
            </div>

            {passwordStatusMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                passwordStatusMsg.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <span>{passwordStatusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  کلمه عبور جدید:
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="حداقل ۴ کاراکتر یا عدد..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left focus:border-indigo-600 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  تکرار کلمه عبور جدید:
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="تکرار مجدد رمز..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left focus:border-indigo-600 outline-none"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isChangingPass ? 'در حال ثبت...' : 'ذخیره رمز جدید'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal (خرید با کارت شخصی) */}
      {isExpenseModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsExpenseModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>ثبت خرید با کارت شخصی برای کارگاه</span>
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              </h3>
            </div>

            {expenseMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                expenseMsg.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <span>{expenseMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleExpenseSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  مبلغ خرید (تومان):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={expenseAmount}
                  onChange={(e) => {
                    const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                    setExpenseAmount(raw ? Number(raw) : '');
                  }}
                  placeholder="مثال: ۱,۸۵۰,۰۰۰"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left focus:border-indigo-600 outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  شرح و عنوان خرید:
                </label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="مثال: خرید چسب و سنباده کارگاه شماره یک"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  عکس فاکتور / رسید خرید:
                </label>
                <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 p-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-slate-50 text-xs text-slate-600">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>{expenseReceipt ? 'عکس فاکتور انتخاب شد' : 'عکاسی از رسید یا انتخاب عکس'}</span>
                  <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmittingExpense ? 'در حال ثبت...' : 'ارسال جهت تسویه حساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense History Modal */}
      {isExpenseHistoryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsExpenseHistoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right max-h-[85vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsExpenseHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-slate-800">
                سوابق خریدهای ثبت‌شده با کارت شخصی
              </h3>
            </div>

            <div className="space-y-2">
              {myExpenses.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  هیچ فاکتور یا هزینه‌ای ثبت نشده است.
                </p>
              ) : (
                myExpenses.map((exp) => (
                  <div key={exp.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-xs">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                      exp.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {exp.status === 'SETTLED' ? 'تسویه شد' : 'در انتظار تسویه'}
                    </span>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">{exp.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{formatCurrencyTomans(exp.amount)} • {exp.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. HOMEWORK / PIECEWORK SUBMISSION MODAL */}
      {isHomeworkModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsHomeworkModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsHomeworkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                <span>ثبت گزارش کار در منزل / کارمزدی</span>
                <Home className="w-5 h-5 text-indigo-600" />
              </h3>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs leading-relaxed">
              تعداد قطعات یا مقدار کاری که در منزل انجام داده‌اید را ثبت کنید. مبلغ دستمزد به صورت خودکار محاسبه شده و پس از ارسال، توسط مدیر جهت تسویه یا اضافه به فیش این دوره تایید خواهد شد.
            </div>

            {homeworkMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                homeworkMsg.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <span>{homeworkMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleHomeworkSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع کار انجام‌شده: <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={homeworkTaskType}
                    onChange={(e) => setHomeworkTaskType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value="مونتاژ قطعات و اتصالات">مونتاژ قطعات و اتصالات</option>
                    <option value="سنباده‌کاری و پرداخت دستی چوب">سنباده‌کاری و پرداخت دستی چوب</option>
                    <option value="رنگ‌کاری، سیلر و کیلر قطعات">رنگ‌کاری، سیلر و کیلر قطعات</option>
                    <option value="دوخت کاور و کیف محافظ تخته‌نرد">دوخت کاور و کیف محافظ تخته‌نرد</option>
                    <option value="پلی‌کردن و پولیش مهره‌ها و تاس‌ها">پلی‌کردن و پولیش مهره‌ها و تاس‌ها</option>
                    <option value="بسته‌بندی نهایی و جعبه‌چینی">بسته‌بندی نهایی و جعبه‌چینی</option>
                    <option value="کنترل کیفیت و عیب‌یابی ظاهری">کنترل کیفیت و عیب‌یابی ظاهری</option>
                    <option value="سایر کارهای تولیدی کارمزد">سایر کارهای تولیدی کارمزد</option>
                  </select>
                  {homeworkTaskType === 'سایر کارهای تولیدی کارمزد' && (
                    <input
                      type="text"
                      required
                      placeholder="عنوان یا شرح کار را بنویسید..."
                      className="w-full text-xs p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 focus:border-indigo-600 outline-none"
                      onChange={(e) => setHomeworkTaskType(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تعداد / مقدار: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={homeworkQuantity}
                    onChange={(e) => {
                      const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                      setHomeworkQuantity(raw ? Number(raw) : '');
                    }}
                    placeholder="مثال: ۵۰"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left focus:border-indigo-600 outline-none font-bold"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    واحد سنجش:
                  </label>
                  <select
                    value={homeworkUnit}
                    onChange={(e) => setHomeworkUnit(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white focus:border-indigo-600 outline-none"
                  >
                    <option value="عدد">عدد</option>
                    <option value="قطعه">قطعه</option>
                    <option value="ست">ست</option>
                    <option value="جعبه">جعبه</option>
                    <option value="کیلوگرم">کیلوگرم</option>
                    <option value="متر">متر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نرخ هر واحد (تومان): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={homeworkWagePerUnit}
                    onChange={(e) => {
                      const raw = toEnglishDigits(e.target.value).replace(/\D/g, '');
                      setHomeworkWagePerUnit(raw ? Number(raw) : '');
                    }}
                    placeholder="مثال: ۲۵,۰۰۰"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left focus:border-indigo-600 outline-none font-bold"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ انجام کار:
                  </label>
                  <input
                    type="text"
                    required
                    value={homeworkDate}
                    onChange={(e) => setHomeworkDate(toEnglishDigits(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-left focus:border-indigo-600 outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Live Computed Total Earnings Display */}
              {Number(homeworkQuantity) > 0 && Number(homeworkWagePerUnit) > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
                  <span className="text-emerald-900 font-medium">مجموع دستمزد این کار:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {formatCurrencyTomans(Number(homeworkQuantity) * Number(homeworkWagePerUnit))}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شماره سفارش / بارکد بچ (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={homeworkOrderCode}
                    onChange={(e) => setHomeworkOrderCode(e.target.value)}
                    placeholder="مثال: پارت ۱۲ یا سفارش #408"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    توضیحات (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={homeworkNotes}
                    onChange={(e) => setHomeworkNotes(e.target.value)}
                    placeholder="شرح قطعات یا وضعیت تحویل"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عکس از قطعات آماده شده / رسید تحویل (اختیاری):
                </label>
                <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 p-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer bg-slate-50 text-xs text-slate-600 transition-colors">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>{homeworkProofUrl ? '✓ عکس پیوست انتخاب شد' : 'انتخاب یا گرفتن عکس از قطعات/رسید'}</span>
                  <input type="file" accept="image/*" onChange={handleHomeworkProofUpload} className="hidden" />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHomeworkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHomework}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Home className="w-4 h-4" />
                  <span>{isSubmittingHomework ? 'در حال ارسال...' : 'ارسال گزارش برای تایید و تسویه'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. HOMEWORK / PIECEWORK HISTORY MODAL */}
      {isHomeworkHistoryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsHomeworkHistoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right max-h-[85vh] overflow-y-auto cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsHomeworkHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
                <span>سوابق کارهای در منزل و کارمزدی من</span>
                <Home className="w-5 h-5 text-indigo-600" />
              </h3>
            </div>

            {/* Quick summary stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <span className="text-[11px] text-indigo-700 block">کل کارهای ثبت‌شده:</span>
                <span className="text-base font-black text-indigo-950 font-mono">
                  {formatNumberFa(myHomeworkTasks.length)} مورد
                </span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <span className="text-[11px] text-emerald-700 block">در انتظار بررسی:</span>
                <span className="text-base font-black text-emerald-950 font-mono">
                  {formatNumberFa(pendingHomeworkCount)} مورد
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {myHomeworkTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  هنوز هیچ کار در منزلی توسط شما ثبت نشده است.
                </div>
              ) : (
                myHomeworkTasks.map((task) => (
                  <div key={task.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
                        task.status === 'SETTLED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : task.status === 'ADDED_TO_SALARY'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : task.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {task.status === 'SETTLED' ? 'تسویه نقدی شد' :
                         task.status === 'ADDED_TO_SALARY' ? 'افزوده به فیش حقوقی دوره' :
                         task.status === 'REJECTED' ? 'رد شد' : 'در انتظار بررسی مدیر'}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">{task.taskType}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                      <div>
                        <span>مقدار کار: </span>
                        <strong className="font-mono text-slate-900">{formatNumberFa(task.quantity)} {task.unit}</strong>
                      </div>
                      <div>
                        <span>نرخ واحد: </span>
                        <strong className="font-mono text-slate-900">{formatCurrencyTomans(task.wagePerUnit)}</strong>
                      </div>
                      <div>
                        <span>تاریخ انجام: </span>
                        <strong className="font-mono text-slate-900">{task.date}</strong>
                      </div>
                      <div>
                        <span>کل دستمزد: </span>
                        <strong className="font-mono text-indigo-700 font-black">{formatCurrencyTomans(task.totalWage)}</strong>
                      </div>
                    </div>

                    {task.orderOrBatchCode && (
                      <div className="text-[11px] text-slate-500">
                        کد سفارش / پارت: <span className="font-mono font-medium text-slate-700">{task.orderOrBatchCode}</span>
                      </div>
                    )}

                    {task.notes && (
                      <div className="text-[11px] text-slate-600 bg-slate-100/70 p-2 rounded-xl">
                        توضیحات پرسنل: {task.notes}
                      </div>
                    )}

                    {task.settlementNotes && (
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                        توضیحات مدیر ({task.settledBy}): {task.settlementNotes} (زمان: {task.settledAt})
                      </div>
                    )}

                    {task.rejectionReason && (
                      <div className="text-[11px] text-rose-800 bg-rose-50 p-2 rounded-xl border border-rose-100">
                        دلیل رد: {task.rejectionReason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHomeworkHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* START MISSION CLOCK-IN MODAL (شروع به کار اول وقت خارج از محیط کارگاه) */}
      {isMissionModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsMissionModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsMissionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>شروع به کار در مأموریت کاری</span>
                <Briefcase className="w-4 h-4 text-indigo-600" />
              </h3>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-900 text-xs leading-relaxed">
              اگر کار روزانه خود را مستقیماً از بیرون کارگاه (خرید چوب/یراق، تحویل سفارش مشتری یا اداره) آغاز می‌کنید، می‌توانید با ثبت مقصد و موقعیت مکانی (GPS)، ورود خود را ثبت کنید.
            </div>

            {missionMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                missionMsg.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <span>{missionMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleStartMissionClockIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مقصد / محل مأموریت: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={missionDestination}
                  onChange={(e) => setMissionDestination(e.target.value)}
                  placeholder="مثال: بازار چوب خاوران، تحویل بار به مشتری، بانک ملی..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  توضیحات مأموریت (اختیاری):
                </label>
                <textarea
                  rows={2}
                  value={missionDescription}
                  onChange={(e) => setMissionDescription(e.target.value)}
                  placeholder="مثال: خرید ۲۰ ورق سنباده و چسب چوب به دستور مدیر..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>موقعیت مکانی شما در لحظه ثبت با GPS هوشمند ذخیره می‌شود.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMissionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMission}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{isSubmittingMission ? 'در حال ثبت موقعیت و تردد...' : 'تأیید و ثبت آغاز به کار در مأموریت'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE PAYSLIPS MODAL */}
      {isPayslipsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsPayslipsModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsPayslipsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                <span>فیش‌های حقوقی من</span>
                <FileText className="w-5 h-5 text-purple-600" />
              </h3>
            </div>

            {mySalaries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FileText className="w-12 h-12 mx-auto text-slate-300 opacity-60" />
                <p className="text-sm font-bold text-slate-600">هنوز فیش حقوقی برای شما صادر نشده است.</p>
                <p className="text-xs text-slate-400">پس از محاسبه و صدور توسط واحد مالی کارگاه در این بخش نمایش داده می‌شود.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mySalaries.map((sal) => (
                  <div
                    key={sal.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${
                        sal.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {sal.status === 'PAID' ? 'تسویه و پرداخت شده' : 'محاسبه شده / در انتظار پرداخت'}
                      </span>
                      <div className="text-right">
                        <span className="font-black text-sm text-slate-900 block font-mono">دوره {sal.month}</span>
                        {sal.paymentDate && (
                          <span className="text-[10px] text-slate-400 font-mono">تاریخ پرداخت: {sal.paymentDate}</span>
                        )}
                      </div>
                    </div>

                    {/* Attendance stats */}
                    <div className="grid grid-cols-4 gap-2 text-center bg-white p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">کارکرد موثر</span>
                        <span className="font-bold text-slate-800 font-mono">{sal.workDays} روز</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">اضافه‌کاری</span>
                        <span className="font-bold text-indigo-600 font-mono">{sal.overtimeHours} ساعت</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">تعطیل رسمی</span>
                        <span className="font-bold text-slate-600 font-mono">
                          {typeof (sal as any).officialHolidayDaysCount === 'number' ? (sal as any).officialHolidayDaysCount : 0} روز
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">غیبت غیرموجه</span>
                        <span className="font-bold text-rose-600 font-mono">
                          {typeof (sal as any).absentDaysCount === 'number' ? (sal as any).absentDaysCount : 0} روز
                        </span>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>حقوق پایه ماهانه:</span>
                        <span className="font-mono font-bold text-slate-800">{formatCurrencyTomans(sal.baseSalary)}</span>
                      </div>
                      {sal.overtimeAmount > 0 && (
                        <div className="flex justify-between text-indigo-600 font-medium">
                          <span>مبلغ اضافه‌کاری:</span>
                          <span className="font-mono">+{formatCurrencyTomans(sal.overtimeAmount)}</span>
                        </div>
                      )}
                      {sal.housingAllowance > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>حق مسکن:</span>
                          <span className="font-mono">+{formatCurrencyTomans(sal.housingAllowance)}</span>
                        </div>
                      )}
                      {sal.groceryAllowance > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>بن خواربار:</span>
                          <span className="font-mono">+{formatCurrencyTomans(sal.groceryAllowance)}</span>
                        </div>
                      )}
                      {sal.childAllowance > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>حق اولاد:</span>
                          <span className="font-mono">+{formatCurrencyTomans(sal.childAllowance)}</span>
                        </div>
                      )}
                      {sal.bonusesTotal > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                          <span>پاداش تشویقی و مزایا:</span>
                          <span className="font-mono">+{formatCurrencyTomans(sal.bonusesTotal)}</span>
                        </div>
                      )}
                      {(sal as any).eydiTotal && (sal as any).eydiTotal > 0 ? (
                        <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50/70 px-2 py-1 rounded-lg">
                          <span>عیدی و پاداش مصوب پایان سال:</span>
                          <span className="font-mono">+{formatCurrencyTomans((sal as any).eydiTotal)}</span>
                        </div>
                      ) : null}
                      {(sal as any).rewardTotal && (sal as any).rewardTotal > 0 ? (
                        <div className="flex justify-between text-teal-700 font-semibold bg-teal-50/70 px-2 py-1 rounded-lg">
                          <span>پاداش عملکرد و بهره‌وری:</span>
                          <span className="font-mono">+{formatCurrencyTomans((sal as any).rewardTotal)}</span>
                        </div>
                      ) : null}
                      {(sal as any).shoppingVoucherTotal && (sal as any).shoppingVoucherTotal > 0 ? (
                        <div className="flex justify-between text-amber-700 font-semibold bg-amber-50/70 px-2 py-1 rounded-lg">
                          <span>بن خرید کارگاهی / کمک‌هزینه رفاهی:</span>
                          <span className="font-mono">+{formatCurrencyTomans((sal as any).shoppingVoucherTotal)}</span>
                        </div>
                      ) : null}
                      {sal.homeworkWagesTotal && sal.homeworkWagesTotal > 0 ? (
                        <div className="flex justify-between text-purple-700 font-semibold bg-purple-50/70 px-2 py-1 rounded-lg">
                          <span>دستمزد کار در منزل / کارمزدی:</span>
                          <span className="font-mono">+{formatCurrencyTomans(sal.homeworkWagesTotal)}</span>
                        </div>
                      ) : null}
                      {sal.personalCardExpensesTotal && sal.personalCardExpensesTotal > 0 ? (
                        <div className="flex justify-between text-indigo-700 font-semibold bg-indigo-50/70 px-2 py-1 rounded-lg">
                          <span>هزینه‌های تنخواه از کارت شخصی:</span>
                          <span className="font-mono">+{formatCurrencyTomans(sal.personalCardExpensesTotal)}</span>
                        </div>
                      ) : null}

                      {/* Deductions (Only show when > 0, suppress zero rows!) */}
                      {sal.insuranceDeduction > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>حق بیمه سهم کارمند:</span>
                          <span className="font-mono">-{formatCurrencyTomans(sal.insuranceDeduction)}</span>
                        </div>
                      )}
                      {sal.taxDeduction > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>مالیات بر درآمد:</span>
                          <span className="font-mono">-{formatCurrencyTomans(sal.taxDeduction)}</span>
                        </div>
                      )}
                      {sal.advancesTotal > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>کسر مساعده دریافتی:</span>
                          <span className="font-mono">-{formatCurrencyTomans(sal.advancesTotal)}</span>
                        </div>
                      )}
                      {sal.penaltiesTotal > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>کسر غیبت و جرایم:</span>
                          <span className="font-mono">-{formatCurrencyTomans(sal.penaltiesTotal)}</span>
                        </div>
                      )}
                    </div>

                    {/* Net Salary Total */}
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                      <span className="font-black text-xs text-slate-800">خالص دریافتی نهایی:</span>
                      <span className="font-mono font-black text-base text-emerald-600">
                        {formatCurrencyTomans(sal.netSalary)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPayslipsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPTIONAL DAILY WORK REPORT SUBMISSION MODAL */}
      {isWorkReportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsWorkReportModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsWorkReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  اختیاری
                </span>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <span>ثبت گزارش کاری روزانه</span>
                  <BookOpen className="w-4 h-4 text-teal-600" />
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed bg-teal-50/60 p-3 rounded-2xl border border-teal-100">
              این گزارش کاملاً اختیاری است و برای ثبت سوابق، پیشرفت تولید و فعالیت‌های روزانه شما در پرونده پرسنلی ذخیره می‌شود تا مدیر ارشد و مدیر منابع انسانی در جریان عملکرد شما قرار گیرند.
            </p>

            {reportMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  reportMsg.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {reportMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                <span>{reportMsg.text}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!currentEmployee) return;
                if (!reportTitle.trim() || !reportContent.trim()) {
                  setReportMsg({ success: false, text: 'عنوان و شرح گزارش الزامی است.' });
                  return;
                }
                setIsSubmittingReport(true);
                const res = StorageService.submitWorkReport({
                  employeeId: currentEmployee.id,
                  title: reportTitle.trim(),
                  content: reportContent.trim(),
                  date: reportDate,
                  hoursSpent: reportHours ? Number(reportHours) : undefined,
                  tags: [reportTag],
                });
                setIsSubmittingReport(false);
                setReportMsg({ success: res.success, text: res.message });
                if (res.success) {
                  setReportTitle('');
                  setReportContent('');
                  setReportHours('');
                  setTimeout(() => {
                    setIsWorkReportModalOpen(false);
                    setReportMsg(null);
                  }, 1200);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاریخ فعالیت:
                  </label>
                  <input
                    type="text"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 font-mono text-center outline-none focus:border-teal-600"
                    placeholder="1405/07/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    بخش / دسته‌بندی کار:
                  </label>
                  <select
                    value={reportTag}
                    onChange={(e) => setReportTag(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="تولید و ماشین‌کاری">تولید و ماشین‌کاری</option>
                    <option value="مونتاژ و اتصالات">مونتاژ و اتصالات</option>
                    <option value="سنباده‌زنی و پرداخت">سنباده‌زنی و پرداخت</option>
                    <option value="رنگ‌کاری و پلی‌استر">رنگ‌کاری و پلی‌استر</option>
                    <option value="بسته‌بندی و انبار">بسته‌بندی و انبار</option>
                    <option value="کنترل کیفیت">کنترل کیفیت</option>
                    <option value="امور اداری و دفتری">امور اداری و دفتری</option>
                    <option value="فنی و تعمیرات">فنی و تعمیرات</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عنوان خلاصه کار: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="مثال: مونتاژ بدنه ۲۰ تخته نرد گردو و رفع ایراد لولاها"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  شرح کامل فعالیت‌ها و اقدامات: <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="توضیح دهید در طول روز چه کارهایی انجام دادید، چه قطعاتی تولید شد، یا با چه موانعی روبه‌رو شدید..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  مدت زمان صرف‌شده به ساعت (اختیاری):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  value={reportHours}
                  onChange={(e) => setReportHours(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="مثال: 7.5"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 outline-none focus:border-teal-600 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWorkReportHistoryModalOpen(true)}
                  className="text-xs text-teal-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>مشاهده سوابق گزارش‌های من ({myWorkReports.length})</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWorkReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs cursor-pointer transition-colors"
                  >
                    {isSubmittingReport ? 'در حال ثبت...' : 'ثبت گزارش'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORK REPORT HISTORY MODAL */}
      {isWorkReportHistoryModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsWorkReportHistoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col p-6 space-y-4 border border-slate-200 shadow-2xl animate-in zoom-in-95 text-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setIsWorkReportHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <span>سوابق گزارش‌های کاری من ({myWorkReports.length})</span>
                <BookOpen className="w-4 h-4 text-teal-600" />
              </h3>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {myWorkReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  تاکنون هیچ گزارش کاری ثبت نکرده‌اید.
                </div>
              ) : (
                myWorkReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl space-y-2 text-xs transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                          rep.status === 'ACKNOWLEDGED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-teal-100 text-teal-800 border-teal-300'
                        }`}>
                          {rep.status === 'ACKNOWLEDGED' ? 'رویت و تایید مدیر' : 'ثبت شده در پرونده'}
                        </span>
                        {rep.tags && rep.tags.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md">
                            {rep.tags[0]}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">{rep.date}</span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{rep.title}</h4>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-[11px] bg-white p-3 rounded-xl border border-slate-100">
                      {rep.content}
                    </p>

                    {rep.hoursSpent && (
                      <div className="text-[10px] text-teal-700 font-bold">
                        ⏱️ مدت کار ثبت‌شده: {rep.hoursSpent} ساعت
                      </div>
                    )}

                    {rep.adminFeedback && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>دستور و نظر مدیر:</span>
                          <span className="text-[10px] text-amber-700">{rep.feedbackBy || 'مدیریت'}</span>
                        </div>
                        <p>{rep.adminFeedback}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setIsWorkReportHistoryModalOpen(false);
                  setIsWorkReportModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
              >
                ثبت گزارش جدید
              </button>
              <button
                type="button"
                onClick={() => setIsWorkReportHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE WORKSHOP ALARM POPUP MODAL */}
      {activeAlarm && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-5 border-4 border-amber-500 shadow-2xl relative overflow-hidden animate-bounce-short">
            {/* Pulsing visual glow */}
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center animate-pulse border-2 border-amber-500/40">
              <Bell className="w-10 h-10 animate-bounce text-amber-600" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                🔔 زنگ و اعلان کارگاه M.GAMMON
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {activeAlarm.title}
              </h2>
              <p className="text-sm font-bold text-slate-700 leading-relaxed bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80">
                {activeAlarm.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDismissAlarm}
                className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-98 transition-all cursor-pointer"
              >
                <VolumeX className="w-6 h-6" />
                <span>متوجه شدم / قطع صدای زنگ</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              با فشردن دکمه بالا، صدای زنگ قطع شده و تایید رویت شما برای مدیر ثبت می‌شود.
            </p>
          </div>
        </div>
      )}

      {/* Developer Credit Footer */}
      <div className="pt-8 pb-3 text-center">
        <DeveloperBadge variant="footer" />
      </div>

    </div>
  );
};
