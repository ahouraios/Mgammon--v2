import {
  Employee,
  CompanySettings,
  Shift,
  AttendanceRecord,
  AdvanceRequest,
  BonusOrPenalty,
  WorkerExpense,
  HomeworkTask,
  MiscPayment,
  WorkMission,
  CalendarEvent,
  SalaryRecord
} from '../types';
import {
  getDatesInShamsiMonth,
  getWeekdayIndexFromShamsi
} from './dateUtils';

export interface PayrollCalculationInput {
  employee: Employee;
  settings: CompanySettings;
  month: string; // "1405/07" or "1405-07"
  attendanceRecords: AttendanceRecord[];
  advances: AdvanceRequest[];
  bonusesPenalties: BonusOrPenalty[];
  workerExpenses: WorkerExpense[];
  homeworkTasks: HomeworkTask[];
  miscPayments: MiscPayment[];
  missions?: WorkMission[];
  calendarEvents?: CalendarEvent[];
  shifts?: Shift[];
  existingRecord?: SalaryRecord | null;
}

export interface PayrollCalculationResult extends SalaryRecord {
  absentDaysCount: number;
  presentDaysCount: number;
  missionDaysCount: number;
  paidLeaveDaysCount: number;
  unpaidLeaveDaysCount: number;
  explicitAbsentDaysCount: number;
  unrecordedDaysCount: number;
  incompleteDaysCount: number;
  officialHolidayDaysCount: number;
  emergencyShutdownPaidDaysCount: number;
  emergencyShutdownUnpaidDaysCount: number;
  weeklyOffDaysCount: number;
  requiredWorkDaysCount: number;
  dailyBaseWage: number;
  effectiveHourlyRate: number;
  absentDeduction: number;
}

/**
 * Single Authoritative Source of Truth for Payroll Calculation in M.GAMMON
 * Used uniformly across Server, Client, Storage, Reports, and Payslips.
 * 
 * Rules Enforced:
 * 1. Calendar-Aware & Shift-Aware: Determines month days, shift workDays vs off days,
 *    official holidays, and emergency shutdowns.
 * 2. Strict 0 vs undefined handling: 0 is intentional zero, undefined falls back to default.
 * 3. Official holidays and paid emergency shutdowns NEVER become absent days and do NOT deduce base salary.
 * 4. Distinct accounting for present, mission, paid leave, unpaid leave, explicit absent,
 *    unrecorded required work days, official holidays, and emergency shutdowns.
 * 5. Single unified calculation logic (Client + Server + Payslips).
 * 6. Homework / piecework wages included in gross & net salary without changing base wage.
 */
export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const {
    employee: emp,
    settings,
    month,
    attendanceRecords,
    advances,
    bonusesPenalties,
    workerExpenses,
    homeworkTasks,
    miscPayments,
    missions = [],
    calendarEvents = [],
    shifts = [],
    existingRecord
  } = input;

  const normMonth = month.replace(/-/g, '/');

  // Find employee's assigned shift (or default)
  const employeeShift = shifts.find(s => s.id === emp.shiftId) || shifts[0] || {
    id: 'default_shift',
    companyId: settings.id,
    name: 'استاندارد',
    type: 'MORNING' as const,
    startTime: settings.defaultWorkStartTime || '07:00',
    endTime: settings.defaultWorkEndTime || '16:00',
    breakDurationMinutes: 60,
    workDays: [0, 1, 2, 3, 4, 5], // Sat to Thu
    lateToleranceMinutes: settings.lateToleranceMinutes || 15,
    earlyExitToleranceMinutes: 10
  };

  const shiftWorkDaysSet = new Set<number>(
    Array.isArray(employeeShift.workDays) ? employeeShift.workDays : [0, 1, 2, 3, 4, 5]
  );

  const standardDailyHours = typeof settings.dailyWorkHours === 'number' && settings.dailyWorkHours > 0
    ? settings.dailyWorkHours
    : 8;

  // Active calendar events for this month applicable to this employee's workshop or ALL
  const applicableEvents = (calendarEvents || []).filter(e => {
    if (!e.isActive) return false;
    if (e.scope === 'WORKSHOP' && e.workshopId && emp.workshopId && e.workshopId !== emp.workshopId) {
      return false;
    }
    return true;
  });

  // Build a lookup map of day events
  const eventMap = new Map<string, CalendarEvent>();
  applicableEvents.forEach(e => {
    const s = e.startDate.replace(/-/g, '/');
    const end = (e.endDate || e.startDate).replace(/-/g, '/');
    if (s === end) {
      eventMap.set(s, e);
    } else {
      // Range
      const startParts = s.split('/').map(Number);
      const endParts = end.split('/').map(Number);
      if (startParts[0] === endParts[0] && startParts[1] === endParts[1]) {
        for (let d = startParts[2]; d <= endParts[2]; d++) {
          const ddStr = d < 10 ? `0${d}` : `${d}`;
          const mmStr = startParts[1] < 10 ? `0${startParts[1]}` : `${startParts[1]}`;
          eventMap.set(`${startParts[0]}/${mmStr}/${ddStr}`, e);
        }
      } else {
        eventMap.set(s, e);
      }
    }
  });

  // All dates of the month (e.g. 1405/07/01 to 1405/07/30)
  const monthDates = getDatesInShamsiMonth(normMonth);

  // Group attendance records of employee for this month
  const monthlyAtt = (attendanceRecords || []).filter(
    a => a.employeeId === emp.id && (a.date?.startsWith(month) || a.date?.replace(/-/g, '/').startsWith(normMonth))
  );

  const attMap = new Map<string, AttendanceRecord>();
  monthlyAtt.forEach(a => {
    const dStr = a.date.replace(/-/g, '/');
    attMap.set(dStr, a);
  });

  // Group missions of employee for this month
  const missionMap = new Map<string, WorkMission>();
  (missions || [])
    .filter(m => m.employeeId === emp.id && (m.date?.startsWith(month) || m.date?.replace(/-/g, '/').startsWith(normMonth)))
    .forEach(m => {
      const dStr = m.date.replace(/-/g, '/');
      missionMap.set(dStr, m);
    });

  let presentDaysCount = 0;
  let missionDaysCount = 0;
  let paidLeaveDaysCount = 0;
  let unpaidLeaveDaysCount = 0;
  let explicitAbsentDaysCount = 0;
  let incompleteDaysCount = 0;
  let officialHolidayDaysCount = 0;
  let emergencyShutdownPaidDaysCount = 0;
  let emergencyShutdownUnpaidDaysCount = 0;
  let weeklyOffDaysCount = 0;
  let unrecordedDaysCount = 0;
  let requiredWorkDaysCount = 0;
  let workedDaysCount = 0;
  let totalWorkedMinutes = 0;
  let totalOvertimeMinutes = 0;

  // Day-by-Day Evaluation
  monthDates.forEach(dateStr => {
    const weekdayIdx = getWeekdayIndexFromShamsi(dateStr);
    const isShiftWorkDay = shiftWorkDaysSet.has(weekdayIdx);
    const calEvent = eventMap.get(dateStr);
    const att = attMap.get(dateStr);
    const mission = missionMap.get(dateStr);

    // If day is regular weekly off based on employee's shift and not a special workday
    if (!isShiftWorkDay && (!calEvent || calEvent.type !== 'SPECIAL_WORKDAY')) {
      weeklyOffDaysCount++;
      return;
    }

    // Is it an official holiday or emergency shutdown on a shift work day?
    if (calEvent) {
      if (calEvent.type === 'OFFICIAL_HOLIDAY') {
        officialHolidayDaysCount++;
        // Official holidays do not require shift work by default
        return;
      }
      if (calEvent.type === 'EMERGENCY_SHUTDOWN') {
        if (calEvent.paidStatus === 'UNPAID') {
          emergencyShutdownUnpaidDaysCount++;
        } else {
          emergencyShutdownPaidDaysCount++;
        }
        return;
      }
      if (calEvent.type === 'WEEKLY_OFF') {
        weeklyOffDaysCount++;
        return;
      }
    }

    // Now, this is a REQUIRED WORK DAY for the employee
    requiredWorkDaysCount++;

    // Evaluate Attendance / Mission / Leave on this required work day
    if (att) {
      // If manager rejected this manual/punch attendance, counts as explicit absent
      if (att.approvalStatus === 'REJECTED') {
        explicitAbsentDaysCount++;
        return;
      }

      // If pending approval by manager, it is not approved yet (remains in review / unrecorded)
      if (att.approvalStatus === 'PENDING') {
        unrecordedDaysCount++;
        return;
      }

      const isUnpaid = att.notes?.includes('UNPAID') || att.notes?.includes('بدون حقوق');
      const isMissionFlag = Boolean(att.isMission || att.isMissionStart || att.notes?.includes('مأموریت'));

      if (att.status === 'HOLIDAY') {
        officialHolidayDaysCount++;
      } else if (att.status === 'ON_LEAVE') {
        if (isUnpaid) {
          unpaidLeaveDaysCount++;
        } else {
          paidLeaveDaysCount++;
          workedDaysCount++;
          totalWorkedMinutes += standardDailyHours * 60;
        }
      } else if (att.status === 'ABSENT') {
        explicitAbsentDaysCount++;
      } else if (isMissionFlag) {
        missionDaysCount++;
        workedDaysCount++;
        const duration = typeof att.workDurationMinutes === 'number' && att.workDurationMinutes > 0
          ? att.workDurationMinutes
          : standardDailyHours * 60;
        totalWorkedMinutes += duration;
        if (typeof att.overtimeMinutes === 'number' && att.overtimeMinutes > 0) {
          totalOvertimeMinutes += att.overtimeMinutes;
        }
      } else if (att.status === 'PRESENT' || att.status === 'LATE' || att.status === 'EARLY_LEAVE') {
        presentDaysCount++;
        workedDaysCount++;
        // If manager approved full day credit despite early leave or early departure
        const isManagerFullDay = att.isManagerCreditFullDay === true || att.notes?.includes('محاسبه تمام‌وقت به دستور مدیر');
        let duration = typeof att.workDurationMinutes === 'number' && att.workDurationMinutes > 0
          ? att.workDurationMinutes
          : 0;

        if (isManagerFullDay) {
          const standardMins = standardDailyHours * 60;
          if (duration < standardMins) {
            duration = standardMins;
          }
        }

        if (att.checkInTime && (!att.checkOutTime || att.checkOutTime === '') && duration === 0 && !isManagerFullDay) {
          incompleteDaysCount++;
        }

        totalWorkedMinutes += duration;
        if (typeof att.overtimeMinutes === 'number' && att.overtimeMinutes > 0) {
          totalOvertimeMinutes += att.overtimeMinutes;
        }
      }
      return;
    }

    // Check separate mission record for this day
    if (mission && mission.isWithinWorkingHours !== false) {
      missionDaysCount++;
      workedDaysCount++;
      totalWorkedMinutes += standardDailyHours * 60;
      return;
    }

    // No attendance, leave, or mission record exists on this required work day
    unrecordedDaysCount++;
  });

  // Fallback: If no calendar events or shifts are passed (backward compatibility),
  // retain settings.workDaysPerMonth (default 22)
  const effectiveStandardWorkDays = requiredWorkDaysCount > 0
    ? requiredWorkDaysCount
    : (typeof settings.workDaysPerMonth === 'number' && settings.workDaysPerMonth > 0 ? settings.workDaysPerMonth : 22);

  // Total Absent Days = Explicit Absences + Unrecorded required work days + Unpaid Emergency Shutdowns
  const absentDaysCount = explicitAbsentDaysCount + unrecordedDaysCount + emergencyShutdownUnpaidDaysCount;

  // Daily base wage calculation
  const dailyBaseWage = effectiveStandardWorkDays > 0 ? Math.round(emp.baseSalary / effectiveStandardWorkDays) : 0;
  const absentDeduction = absentDaysCount * dailyBaseWage;

  // Effective hourly rate: 0 if explicitly set to 0, otherwise custom rate, or calculated from baseSalary
  const effectiveHourlyRate = typeof emp.hourlyRate === 'number'
    ? emp.hourlyRate
    : (effectiveStandardWorkDays > 0 && standardDailyHours > 0 ? Math.round(emp.baseSalary / (effectiveStandardWorkDays * standardDailyHours)) : 0);

  // Overtime multiplier: employee specific overrides company settings; 0 means no overtime pay
  const overtimeMultiplier = typeof emp.overtimeRate === 'number'
    ? emp.overtimeRate
    : (typeof settings.overtimeRateMultiplier === 'number' ? settings.overtimeRateMultiplier : 1.4);

  const workedHours = Number((totalWorkedMinutes / 60).toFixed(2));
  const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(2));
  const overtimeAmount = Math.round((totalOvertimeMinutes / 60) * effectiveHourlyRate * overtimeMultiplier);

  // 2. ADVANCES (مساعده حقوق)
  const approvedAdvances = advances
    .filter(a => a.employeeId === emp.id && a.status === 'APPROVED' && (a.repayMonth?.replace(/-/g, '/') === normMonth))
    .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const discretionaryAdvances = bonusesPenalties
    .filter(b => b.employeeId === emp.id && (b.type === 'DISCRETIONARY_ADVANCE' || (b as any).type === 'EXTRA_ADVANCE') && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const totalAdvances = approvedAdvances + discretionaryAdvances;

  // 3. BONUSES & DISCIPLINARY PENALTIES (پاداش و جریمه انضباطی)
  const regularBonuses = bonusesPenalties
    .filter(b => b.employeeId === emp.id && b.type === 'BONUS' && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const eydiTotal = bonusesPenalties
    .filter(b => b.employeeId === emp.id && b.type === 'EYDI' && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const rewardTotal = bonusesPenalties
    .filter(b => b.employeeId === emp.id && b.type === 'REWARD' && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const shoppingVoucherTotal = bonusesPenalties
    .filter(b => b.employeeId === emp.id && b.type === 'SHOPPING_VOUCHER' && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const bonuses = regularBonuses + eydiTotal + rewardTotal + shoppingVoucherTotal;

  const disciplinaryPenalties = bonusesPenalties
    .filter(b => b.employeeId === emp.id && b.type === 'PENALTY' && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const penalties = disciplinaryPenalties + absentDeduction;

  // 4. WORKER PERSONAL EXPENSES (هزینه‌های انجام‌شده از کارت شخصی کارگر - افزوده‌شده به حقوق)
  const approvedExpensesToSalary = workerExpenses
    .filter(e => e.employeeId === emp.id && e.status === 'ADDED_TO_SALARY' && (e.date?.startsWith(month) || e.date?.replace(/-/g, '/').startsWith(normMonth)))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 5. HOMEWORK / PIECEWORK WAGES (کار در منزل / کارمزدی تاییدشده و افزوده به فیش حقوق)
  const approvedHomeworkWagesToSalary = homeworkTasks
    .filter(h => h.employeeId === emp.id && h.status === 'ADDED_TO_SALARY' && (h.date?.startsWith(month) || h.date?.replace(/-/g, '/').startsWith(normMonth)))
    .reduce((sum, h) => sum + (Number(h.totalWage) || 0), 0);

  // 6. MISC DEDUCTIONS (کسورات پرداخت‌های متفرقه و علی‌الحساب)
  const miscDeductions = miscPayments
    .filter(m => m.employeeId === emp.id && m.deductFromSalary && (m.month?.replace(/-/g, '/') === normMonth || m.date?.replace(/-/g, '/').startsWith(normMonth)))
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  // 7. ALLOWANCES (مزایای رفاهی و انگیزشی: 0 یعنی واقعاً 0، undefined یعنی fallback به تنظیمات کارگاه)
  const housing = typeof emp.housingAllowance === 'number'
    ? Math.max(0, emp.housingAllowance)
    : (typeof settings.fixedHousingAllowance === 'number' && settings.fixedHousingAllowance > 0 ? settings.fixedHousingAllowance : 0);

  const grocery = typeof emp.groceryAllowance === 'number'
    ? Math.max(0, emp.groceryAllowance)
    : (typeof settings.fixedGroceryAllowance === 'number' && settings.fixedGroceryAllowance > 0 ? settings.fixedGroceryAllowance : 0);

  const child = typeof emp.childAllowance === 'number'
    ? Math.max(0, emp.childAllowance)
    : (typeof settings.childAllowance === 'number' && settings.childAllowance > 0 ? settings.childAllowance : 0);

  // 8. GROSS SALARY (ناخالص حقوق)
  const grossSalary = emp.baseSalary + overtimeAmount + bonuses + housing + grocery + child + approvedHomeworkWagesToSalary;

  // 9. STATUTORY DEDUCTIONS: INSURANCE & TAX (بیمه و مالیات قانونی)
  let insuranceDeduction = 0;
  const isInsuranceExempt = emp.isInsuranceExempt === true || emp.insuranceRatePercent === 0;
  if (!isInsuranceExempt) {
    const insuranceRate = typeof emp.insuranceRatePercent === 'number'
      ? emp.insuranceRatePercent
      : (typeof settings.insuranceRatePercent === 'number' ? settings.insuranceRatePercent : 7);
    if (insuranceRate > 0) {
      const insuranceBase = emp.baseSalary + housing + grocery;
      insuranceDeduction = Math.round(insuranceBase * (insuranceRate / 100));
    }
  }

  let taxDeduction = 0;
  const isTaxExempt = emp.isTaxExempt === true || emp.taxRatePercent === 0;
  if (!isTaxExempt) {
    const taxRate = typeof emp.taxRatePercent === 'number'
      ? emp.taxRatePercent
      : (typeof settings.taxRatePercent === 'number' ? settings.taxRatePercent : 10);
    const taxThreshold = typeof settings.taxExemptionThreshold === 'number'
      ? settings.taxExemptionThreshold
      : 14000000;
    if (taxRate > 0) {
      const taxableBase = Math.max(0, grossSalary - taxThreshold);
      taxDeduction = Math.round(taxableBase * (taxRate / 100));
    }
  }

  // 10. NET SALARY (خالص پرداختی)
  const netSalary = Math.max(
    0,
    grossSalary - insuranceDeduction - taxDeduction - penalties - totalAdvances - miscDeductions + approvedExpensesToSalary
  );

  const recordId = existingRecord ? existingRecord.id : `sal_${emp.id}_${month.replace('/', '_')}`;

  return {
    id: recordId,
    companyId: settings.id,
    employeeId: emp.id,
    month,
    baseSalary: emp.baseSalary,
    workDays: workedDaysCount,
    workedHours,
    overtimeHours,
    overtimeAmount,
    bonusesTotal: bonuses,
    eydiTotal,
    rewardTotal,
    shoppingVoucherTotal,
    penaltiesTotal: penalties,
    advancesTotal: totalAdvances,
    discretionaryAdvancesTotal: discretionaryAdvances,
    personalCardExpensesTotal: approvedExpensesToSalary,
    homeworkWagesTotal: approvedHomeworkWagesToSalary,
    miscDeductionsTotal: miscDeductions,
    housingAllowance: housing,
    groceryAllowance: grocery,
    childAllowance: child,
    grossSalary,
    insuranceDeduction,
    taxDeduction,
    netSalary,
    status: existingRecord?.status === 'PAID' ? 'PAID' : 'CALCULATED',
    paymentDate: existingRecord?.paymentDate,
    // Detailed audit & transparency breakdown
    presentDaysCount,
    missionDaysCount,
    paidLeaveDaysCount,
    unpaidLeaveDaysCount,
    explicitAbsentDaysCount,
    unrecordedDaysCount,
    incompleteDaysCount,
    officialHolidayDaysCount,
    emergencyShutdownPaidDaysCount,
    emergencyShutdownUnpaidDaysCount,
    weeklyOffDaysCount,
    requiredWorkDaysCount: effectiveStandardWorkDays,
    absentDaysCount,
    dailyBaseWage,
    effectiveHourlyRate,
    absentDeduction
  };
}
