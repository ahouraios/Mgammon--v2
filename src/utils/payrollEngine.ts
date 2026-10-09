import {
  Employee,
  CompanySettings,
  AttendanceRecord,
  AdvanceRequest,
  BonusOrPenalty,
  WorkerExpense,
  HomeworkTask,
  MiscPayment,
  WorkMission,
  SalaryRecord
} from '../types';

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
  dailyBaseWage: number;
  effectiveHourlyRate: number;
  absentDeduction: number;
}

/**
 * Single Authoritative Source of Truth for Payroll Calculation in M.GAMMON
 * Used uniformly across Server, Client, Storage, Reports, and Payslips.
 * 
 * Rules Enforced:
 * 1. Single unified calculation logic (Client + Server + Payslips).
 * 2. Strict 0 vs undefined handling: 0 is intentional zero, undefined falls back to default.
 * 3. Insurance and tax exemptions / zero rates produce 0 deductions and are omitted from payslip/reports.
 * 4. Never assume silence = full attendance! Zero attendance records = 0 worked days and deduction for unrecorded days.
 * 5. Distinct accounting for present, mission, paid leave, unpaid leave, explicit absent, unrecorded, and incomplete days.
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
    existingRecord
  } = input;

  const normMonth = month.replace(/-/g, '/');

  // Standard work days and hours per month (fallback defaults: 22 days, 8 hours)
  const standardWorkDays = typeof settings.workDaysPerMonth === 'number' && settings.workDaysPerMonth > 0
    ? settings.workDaysPerMonth
    : 22;
  const standardDailyHours = typeof settings.dailyWorkHours === 'number' && settings.dailyWorkHours > 0
    ? settings.dailyWorkHours
    : 8;

  // 1. ATTENDANCE & WORKING DAYS AGGREGATION
  const monthlyAtt = attendanceRecords.filter(
    a => a.employeeId === emp.id && (a.date?.startsWith(month) || a.date?.replace(/-/g, '/').startsWith(normMonth))
  );

  let presentDaysCount = 0;
  let missionDaysCount = 0;
  let paidLeaveDaysCount = 0;
  let unpaidLeaveDaysCount = 0;
  let explicitAbsentDaysCount = 0;
  let incompleteDaysCount = 0;
  let workedDaysCount = 0;
  let totalWorkedMinutes = 0;
  let totalOvertimeMinutes = 0;

  const processedDates = new Set<string>();

  monthlyAtt.forEach(a => {
    // If request was rejected by manager, count as absent
    if (a.approvalStatus === 'REJECTED') {
      explicitAbsentDaysCount++;
      return;
    }

    // Pending manual requests are not counted as approved work until manager approves
    if (a.approvalStatus === 'PENDING') {
      return;
    }

    processedDates.add(a.date);

    const isUnpaid = a.notes?.includes('UNPAID') || a.notes?.includes('بدون حقوق');
    const isMission = Boolean(a.isMission || a.isMissionStart || a.notes?.includes('مأموریت'));

    if (a.status === 'ON_LEAVE') {
      if (isUnpaid) {
        unpaidLeaveDaysCount++;
      } else {
        paidLeaveDaysCount++;
        workedDaysCount++;
        totalWorkedMinutes += standardDailyHours * 60;
      }
    } else if (a.status === 'ABSENT') {
      explicitAbsentDaysCount++;
    } else if (isMission) {
      missionDaysCount++;
      workedDaysCount++;
      const duration = typeof a.workDurationMinutes === 'number' && a.workDurationMinutes > 0
        ? a.workDurationMinutes
        : standardDailyHours * 60;
      totalWorkedMinutes += duration;
      if (typeof a.overtimeMinutes === 'number' && a.overtimeMinutes > 0) {
        totalOvertimeMinutes += a.overtimeMinutes;
      }
    } else if (a.status === 'PRESENT' || a.status === 'LATE' || a.status === 'EARLY_LEAVE') {
      presentDaysCount++;
      workedDaysCount++;
      const duration = typeof a.workDurationMinutes === 'number' && a.workDurationMinutes > 0
        ? a.workDurationMinutes
        : 0;
      
      // Track incomplete punch (checked in without checkout and 0 duration)
      if (a.checkInTime && (!a.checkOutTime || a.checkOutTime === '') && duration === 0) {
        incompleteDaysCount++;
      }

      totalWorkedMinutes += duration;
      if (typeof a.overtimeMinutes === 'number' && a.overtimeMinutes > 0) {
        totalOvertimeMinutes += a.overtimeMinutes;
      }
    }
  });

  // Credit full-day or scheduled work missions not already captured in attendance punches
  if (missions && Array.isArray(missions)) {
    missions
      .filter(m => m.employeeId === emp.id && (m.date?.startsWith(month) || m.date?.replace(/-/g, '/').startsWith(normMonth)))
      .forEach(m => {
        if (!processedDates.has(m.date) && m.isWithinWorkingHours !== false) {
          processedDates.add(m.date);
          missionDaysCount++;
          workedDaysCount++;
          totalWorkedMinutes += standardDailyHours * 60;
        }
      });
  }

  // CRITICAL RULE (Audit Goal 4):
  // Never assume silence = full attendance!
  // If an employee has zero attendance/leave records, worked days is 0.
  // Absent days is explicitly broken down into:
  // - explicitAbsentDaysCount: recorded absences
  // - unrecordedDaysCount: working days with no attendance recorded
  const unrecordedDaysCount = Math.max(0, standardWorkDays - workedDaysCount - unpaidLeaveDaysCount - explicitAbsentDaysCount);
  const absentDaysCount = explicitAbsentDaysCount + unrecordedDaysCount;

  // Daily base wage
  const dailyBaseWage = standardWorkDays > 0 ? Math.round(emp.baseSalary / standardWorkDays) : 0;
  const absentDeduction = absentDaysCount * dailyBaseWage;

  // Effective hourly rate: 0 if explicitly set to 0, otherwise custom rate, or calculated from baseSalary
  const effectiveHourlyRate = typeof emp.hourlyRate === 'number'
    ? emp.hourlyRate
    : (standardWorkDays > 0 && standardDailyHours > 0 ? Math.round(emp.baseSalary / (standardWorkDays * standardDailyHours)) : 0);

  // Overtime rate multiplier: employee specific overrides company settings; 0 means no overtime pay
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

  // 3. BONUSES & DISCIPLINARY PENALTIES (پاداش و جریمه)
  const bonuses = bonusesPenalties
    .filter(b => b.employeeId === emp.id && b.type === 'BONUS' && (b.month?.replace(/-/g, '/') === normMonth))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

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
  // If employee is exempt or rate is explicitly 0, deduction is strictly 0 and not deducted!
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
    absentDaysCount,
    dailyBaseWage,
    effectiveHourlyRate,
    absentDeduction
  };
}
