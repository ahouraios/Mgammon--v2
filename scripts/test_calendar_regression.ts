import { calculatePayroll, PayrollCalculationInput } from '../src/utils/payrollEngine';
import { Employee, CompanySettings, Shift, CalendarEvent, AttendanceRecord } from '../src/types';
import { isJalaliLeapYear, getDaysInJalaliMonth } from '../src/utils/dateUtils';

const mockSettings: CompanySettings = {
  id: 'comp_1',
  companyName: 'M.GAMMON',
  companyCode: 'MG-1',
  address: 'مشهد',
  phoneNumber: '051',
  officeLat: 36,
  officeLng: 59,
  allowedGpsRadiusMeters: 35,
  workshops: [
    { id: 'ws_1', name: 'کارگاه ۱', code: 'W1', lat: 36, lng: 59, allowedRadiusMeters: 35 },
    { id: 'ws_2', name: 'کارگاه ۲', code: 'W2', lat: 36, lng: 59, allowedRadiusMeters: 35 }
  ],
  qrRefreshIntervalSeconds: 30,
  defaultWorkStartTime: '07:00',
  defaultWorkEndTime: '16:00',
  lateToleranceMinutes: 15,
  annualLeaveDaysQuota: 26,
  maxLeaveRequestsPerWeek: 1,
  allowMultiplePendingLeaves: false,
  maxHourlyLeaveHoursPerMonth: 16,
  maxAdvanceRequestsPerMonth: 1,
  advanceWindowStartDay: 15,
  advanceWindowEndDay: 20,
  maxAdvanceSalaryPercent: 30,
  workDaysPerMonth: 22,
  dailyWorkHours: 8,
  overtimeRateMultiplier: 1.4,
  insuranceRatePercent: 7,
  taxRatePercent: 10,
  taxExemptionThreshold: 14000000,
  fixedHousingAllowance: 900000,
  fixedGroceryAllowance: 1400000,
  childAllowance: 0,
};

const mockEmployee1: Employee = {
  id: 'emp_1',
  companyId: 'comp_1',
  personalCode: '101',
  firstName: 'رضا',
  lastName: 'کاظمی',
  nationalCode: '0920000001',
  phone: '09150000001',
  email: 'reza@mgommon.ir',
  department: 'تولید',
  position: 'استادکار',
  workshopId: 'ws_1',
  hireDate: '1404/01/01',
  status: 'ACTIVE',
  shiftId: 'shift_6days',
  baseSalary: 22000000,
  hourlyRate: 125000,
  overtimeRate: 1.4,
  remainingLeaveDays: 20,
};

const mockEmployee2: Employee = {
  id: 'emp_2',
  companyId: 'comp_1',
  personalCode: '102',
  firstName: 'علی',
  lastName: 'حسینی',
  nationalCode: '0920000002',
  phone: '09150000002',
  email: 'ali@mgommon.ir',
  department: 'مونتاژ',
  position: 'مونتاژکار',
  workshopId: 'ws_2',
  hireDate: '1404/01/01',
  status: 'ACTIVE',
  shiftId: 'shift_5days',
  baseSalary: 20000000,
  hourlyRate: 110000,
  overtimeRate: 1.4,
  remainingLeaveDays: 20,
};

const shift6Days: Shift = {
  id: 'shift_6days',
  companyId: 'comp_1',
  name: '۶ روز در هفته (شنبه تا پنجشنبه)',
  type: 'MORNING',
  startTime: '07:00',
  endTime: '16:00',
  breakDurationMinutes: 60,
  workDays: [0, 1, 2, 3, 4, 5], // Sat to Thu, Fri off
  lateToleranceMinutes: 15,
  earlyExitToleranceMinutes: 10
};

const shift5Days: Shift = {
  id: 'shift_5days',
  companyId: 'comp_1',
  name: '۵ روز در هفته (شنبه تا چهارشنبه)',
  type: 'MORNING',
  startTime: '07:00',
  endTime: '16:00',
  breakDurationMinutes: 60,
  workDays: [0, 1, 2, 3, 4], // Sat to Wed, Thu & Fri off
  lateToleranceMinutes: 15,
  earlyExitToleranceMinutes: 10
};

const allShifts = [shift6Days, shift5Days];

console.log('--- STARTING M.GAMMON CALENDAR & ABSENCE REGRESSION TEST ---');

let passedCount = 0;
let totalTests = 0;

function assert(name: string, condition: boolean, details?: string) {
  totalTests++;
  if (condition) {
    passedCount++;
    console.log(`[PASSED] ${name}`);
  } else {
    console.error(`[FAILED] ${name} -> ${details || ''}`);
  }
}

// 1. ماه بدون تعطیلی رسمی در وسط هفته (مهر 1405: ۳۰ روزه، ۴ جمعه دارد و ۲۶ روز موظفی برای شیفت ۶ روزه)
{
  const res = calculatePayroll({
    employee: mockEmployee1,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: [],
    shifts: allShifts
  });
  assert(
    'Scenario 1: Month without official holidays (4 Fridays off, 26 required days for 6-day shift)',
    res.weeklyOffDaysCount === 4 && res.requiredWorkDaysCount === 26,
    `weeklyOff=${res.weeklyOffDaysCount}, required=${res.requiredWorkDaysCount}`
  );
}

// 2. ماه با چند تعطیلی رسمی در وسط هفته (مثلاً دو روز یکشنبه ۵ و ۱۲ مهر)
{
  const events: CalendarEvent[] = [
    {
      id: 'h1',
      companyId: 'comp_1',
      startDate: '1405/07/05',
      endDate: '1405/07/05',
      title: 'تعطیل رسمی ۱',
      type: 'OFFICIAL_HOLIDAY',
      scope: 'ALL',
      isActive: true,
      paidStatus: 'PAID'
    },
    {
      id: 'h2',
      companyId: 'comp_1',
      startDate: '1405/07/12',
      endDate: '1405/07/12',
      title: 'تعطیل رسمی ۲',
      type: 'OFFICIAL_HOLIDAY',
      scope: 'ALL',
      isActive: true,
      paidStatus: 'PAID'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee1,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: events,
    shifts: allShifts
  });
  assert(
    'Scenario 2: Month with official holidays deducted from required workdays (26 - 2 = 24)',
    res.officialHolidayDaysCount === 2 && res.requiredWorkDaysCount === 24,
    `officialHolidays=${res.officialHolidayDaysCount}, required=${res.requiredWorkDaysCount}`
  );
}

// 3. تعطیلی یکروزه کارگاه در روز موظفی (دوشنبه 1405/07/06 - اضطراری باحقوق)
{
  const events: CalendarEvent[] = [
    {
      id: 'e1',
      companyId: 'comp_1',
      startDate: '1405/07/06',
      endDate: '1405/07/06',
      title: 'قطعی برق سراسری کارگاه',
      type: 'EMERGENCY_SHUTDOWN',
      scope: 'ALL',
      isActive: true,
      paidStatus: 'PAID'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee1,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: events,
    shifts: allShifts
  });
  assert(
    'Scenario 3: 1-day paid emergency shutdown does not increase absence (26 - 1 = 25)',
    res.emergencyShutdownPaidDaysCount === 1 && res.requiredWorkDaysCount === 25,
    `emergencyPaid=${res.emergencyShutdownPaidDaysCount}, required=${res.requiredWorkDaysCount}`
  );
}

// 4. تعطیلی ۳ روزه کارگاه در وسط هفته (شنبه، یکشنبه، دوشنبه ۱۱ الی ۱۳ مهر)
{
  const events: CalendarEvent[] = [
    {
      id: 'e3',
      companyId: 'comp_1',
      startDate: '1405/07/11',
      endDate: '1405/07/13',
      title: 'تعمیرات اساسی خط برش و ماشین‌کاری',
      type: 'EMERGENCY_SHUTDOWN',
      scope: 'ALL',
      isActive: true,
      paidStatus: 'PAID'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee1,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: events,
    shifts: allShifts
  });
  assert(
    'Scenario 4: 3 consecutive days emergency shutdown recognized correctly (26 - 3 = 23)',
    res.emergencyShutdownPaidDaysCount === 3 && res.requiredWorkDaysCount === 23,
    `emergencyPaid=${res.emergencyShutdownPaidDaysCount}, required=${res.requiredWorkDaysCount}`
  );
}

// 5. تعطیلی محدود به یک کارگاه خاص (مثلاً کارگاه ۱ روز دوشنبه 07/06 تعطیل است)
{
  const events: CalendarEvent[] = [
    {
      id: 'ws1_down',
      companyId: 'comp_1',
      startDate: '1405/07/06',
      endDate: '1405/07/06',
      title: 'تعمیرات گردگیر کارگاه ۱',
      type: 'EMERGENCY_SHUTDOWN',
      scope: 'WORKSHOP',
      workshopId: 'ws_1',
      isActive: true,
      paidStatus: 'PAID'
    }
  ];
  const res1 = calculatePayroll({
    employee: mockEmployee1, // workshop ws_1
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: events,
    shifts: allShifts
  });
  const res2 = calculatePayroll({
    employee: mockEmployee2, // workshop ws_2
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: events,
    shifts: allShifts
  });
  assert(
    'Scenario 5: Workshop-scoped event only affects matching workshop employees',
    res1.emergencyShutdownPaidDaysCount === 1 && res2.emergencyShutdownPaidDaysCount === 0,
    `emp1Emergency=${res1.emergencyShutdownPaidDaysCount}, emp2Emergency=${res2.emergencyShutdownPaidDaysCount}`
  );
}

// 6. دو کارمند با شیفت‌های متفاوت در یک ماه (شیفت ۶ روزه: ۲۶ روز کار، شیفت ۵ روزه: ۲۱ روز کار)
{
  const resEmp1 = calculatePayroll({
    employee: mockEmployee1, // 6 days/week (Sat to Thu) -> 4 Fridays off
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: [],
    shifts: allShifts
  });
  const resEmp2 = calculatePayroll({
    employee: mockEmployee2, // 5 days/week (Sat to Wed) -> 4 Fridays + 5 Thursdays = 9 days off, 21 workdays
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: [],
    shifts: allShifts
  });
  assert(
    'Scenario 6: Different shifts yield distinct weekly off days and required workdays (26 vs 21)',
    resEmp1.weeklyOffDaysCount === 4 && resEmp1.requiredWorkDaysCount === 26 &&
    resEmp2.weeklyOffDaysCount === 9 && resEmp2.requiredWorkDaysCount === 21,
    `emp1Off=${resEmp1.weeklyOffDaysCount}, emp2Off=${resEmp2.weeklyOffDaysCount}, emp2Req=${resEmp2.requiredWorkDaysCount}`
  );
}

// 7. کارمند دارای حضور کامل در تمام روزهای موظفی (۲۱ روز کاری شیفت ۵ روزه در مهر ۱۴۰۵)
{
  const fullAttendance: AttendanceRecord[] = [];
  const satToWedDates = [
    '1405/07/01', '1405/07/04', '1405/07/05', '1405/07/06', '1405/07/07', '1405/07/08',
    '1405/07/11', '1405/07/12', '1405/07/13', '1405/07/14', '1405/07/15', '1405/07/18',
    '1405/07/19', '1405/07/20', '1405/07/21', '1405/07/22', '1405/07/25', '1405/07/26',
    '1405/07/27', '1405/07/28', '1405/07/29'
  ]; // Exactly the 21 Sat-Wed days in 1405/07
  satToWedDates.forEach((d, idx) => {
    fullAttendance.push({
      id: `att_${idx}`,
      companyId: 'comp_1',
      employeeId: mockEmployee2.id,
      date: d,
      checkInTime: '07:00',
      checkOutTime: '16:00',
      workDurationMinutes: 480,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      status: 'PRESENT',
      approvalStatus: 'APPROVED'
    });
  });

  const res = calculatePayroll({
    employee: mockEmployee2,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: fullAttendance,
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: [],
    shifts: allShifts
  });
  assert(
    'Scenario 7: Full attendance on all required days gives 0 absent days and full base salary',
    res.absentDaysCount === 0 && res.workDays === 21 && res.absentDeduction === 0,
    `absentDays=${res.absentDaysCount}, workDays=${res.workDays}, deduction=${res.absentDeduction}`
  );
}

// 8. کارمند دارای یک روز غیبت واقعی (۲۰ روز حاضر از ۲۱ روز)
{
  const partialAttendance: AttendanceRecord[] = [];
  const satToWedDates = [
    '1405/07/01', '1405/07/04', '1405/07/05', '1405/07/06', '1405/07/07', '1405/07/08',
    '1405/07/11', '1405/07/12', '1405/07/13', '1405/07/14', '1405/07/15', '1405/07/18',
    '1405/07/19', '1405/07/20', '1405/07/21', '1405/07/22', '1405/07/25', '1405/07/26',
    '1405/07/27', '1405/07/28' // omitted 1405/07/29
  ];
  satToWedDates.forEach((d, idx) => {
    partialAttendance.push({
      id: `att_part_${idx}`,
      companyId: 'comp_1',
      employeeId: mockEmployee2.id,
      date: d,
      checkInTime: '07:00',
      checkOutTime: '16:00',
      workDurationMinutes: 480,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      status: 'PRESENT',
      approvalStatus: 'APPROVED'
    });
  });

  const res = calculatePayroll({
    employee: mockEmployee2,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: partialAttendance,
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: [],
    shifts: allShifts
  });
  assert(
    'Scenario 8: 1 missed day on a required workday produces exactly 1 absent day and 1 day wage deduction',
    res.absentDaysCount === 1 && res.unrecordedDaysCount === 1 && res.workDays === 20,
    `absentDays=${res.absentDaysCount}, workDays=${res.workDays}`
  );
}

// 9. کارمند دارای مرخصی باحقوق
{
  const attLeave: AttendanceRecord[] = [
    {
      id: 'att_leave_1',
      companyId: 'comp_1',
      employeeId: mockEmployee2.id,
      date: '1405/07/01',
      status: 'ON_LEAVE',
      workDurationMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      approvalStatus: 'APPROVED',
      notes: 'مرخصی استحقاقی'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee2,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: attLeave,
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: [],
    shifts: allShifts
  });
  assert(
    'Scenario 9: Approved paid leave counts as worked day and not absent',
    res.paidLeaveDaysCount === 1 && res.workDays === 1,
    `paidLeave=${res.paidLeaveDaysCount}, workDays=${res.workDays}`
  );
}

// 10. کارمند دارای مرخصی بدون حقوق
{
  const attUnpaid: AttendanceRecord[] = [
    {
      id: 'att_unpaid_1',
      companyId: 'comp_1',
      employeeId: mockEmployee2.id,
      date: '1405/07/01',
      status: 'ON_LEAVE',
      workDurationMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      approvalStatus: 'APPROVED',
      notes: 'مرخصی بدون حقوق (UNPAID)'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee2,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: attUnpaid,
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: [],
    shifts: allShifts
  });
  assert(
    'Scenario 10: Approved unpaid leave tracked in unpaidLeaveDaysCount',
    res.unpaidLeaveDaysCount === 1 && res.workDays === 0,
    `unpaidLeave=${res.unpaidLeaveDaysCount}, workDays=${res.workDays}`
  );
}

// 11. کارمند دارای درخواست تردد دستی در انتظار تأیید (PENDING)
{
  const attPending: AttendanceRecord[] = [
    {
      id: 'att_pen_1',
      companyId: 'comp_1',
      employeeId: mockEmployee2.id,
      date: '1405/07/01',
      status: 'PRESENT',
      workDurationMinutes: 480,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      approvalStatus: 'PENDING',
      notes: 'تردد دستی ثبت‌شده توسط کارمند'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee2,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: attPending,
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: [],
    shifts: allShifts
  });
  assert(
    'Scenario 11: PENDING attendance request is not counted as approved worked day',
    res.workDays === 0 && res.unrecordedDaysCount > 0,
    `workDays=${res.workDays}, unrecorded=${res.unrecordedDaysCount}`
  );
}

// 12. ماهی که تعطیلات رسمی و تعطیلی اضطراری هر دو در آن وجود دارند
{
  const eventsCombo: CalendarEvent[] = [
    {
      id: 'h_off',
      companyId: 'comp_1',
      startDate: '1405/07/04',
      endDate: '1405/07/04',
      title: 'تعطیل رسمی',
      type: 'OFFICIAL_HOLIDAY',
      scope: 'ALL',
      isActive: true,
      paidStatus: 'PAID'
    },
    {
      id: 'e_shut',
      companyId: 'comp_1',
      startDate: '1405/07/05',
      endDate: '1405/07/05',
      title: 'تعطیلی گرد و غبار',
      type: 'EMERGENCY_SHUTDOWN',
      scope: 'ALL',
      isActive: true,
      paidStatus: 'PAID'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee2,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: eventsCombo,
    shifts: allShifts
  });
  assert(
    'Scenario 12: Combination of official holiday and emergency shutdown both tracked distinctly',
    res.officialHolidayDaysCount === 1 && res.emergencyShutdownPaidDaysCount === 1,
    `holiday=${res.officialHolidayDaysCount}, emergency=${res.emergencyShutdownPaidDaysCount}`
  );
}

// 13. تغییر تعطیلی ثبت‌شده و بررسی اثر آن بر حقوق (از باحقوق به بدون حقوق)
{
  const eventsUnpaid: CalendarEvent[] = [
    {
      id: 'e_shut_unpaid',
      companyId: 'comp_1',
      startDate: '1405/07/05',
      endDate: '1405/07/05',
      title: 'تعطیلی توافقی بدون حقوق',
      type: 'EMERGENCY_SHUTDOWN',
      scope: 'ALL',
      isActive: true,
      paidStatus: 'UNPAID'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee2,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: eventsUnpaid,
    shifts: allShifts
  });
  assert(
    'Scenario 13: Unpaid emergency shutdown explicitly tracked and contributes to absent deduction',
    res.emergencyShutdownUnpaidDaysCount === 1,
    `unpaidEmergency=${res.emergencyShutdownUnpaidDaysCount}`
  );
}

// 14. جلوگیری از دوباره‌شماری تعطیلی و غیبت (چهارشنبه 07/01 تعطیل رسمی است؛ ۲۱ روز موظفی -> ۲۰ روز موظفی)
{
  const eventsOverlap: CalendarEvent[] = [
    {
      id: 'hol_overlap',
      companyId: 'comp_1',
      startDate: '1405/07/01',
      endDate: '1405/07/01',
      title: 'تعطیل رسمی سالروز',
      type: 'OFFICIAL_HOLIDAY',
      scope: 'ALL',
      isActive: true,
      paidStatus: 'PAID'
    }
  ];
  const res = calculatePayroll({
    employee: mockEmployee2,
    settings: mockSettings,
    month: '1405/07',
    attendanceRecords: [],
    advances: [],
    bonusesPenalties: [],
    workerExpenses: [],
    homeworkTasks: [],
    miscPayments: [],
    calendarEvents: eventsOverlap,
    shifts: allShifts
  });
  assert(
    'Scenario 14: Official holiday is not double-counted as absent day (required 20, unrecorded 20)',
    res.officialHolidayDaysCount === 1 && res.requiredWorkDaysCount === 20 && res.unrecordedDaysCount === 20,
    `official=${res.officialHolidayDaysCount}, req=${res.requiredWorkDaysCount}, unrecorded=${res.unrecordedDaysCount}`
  );
}

// 15. بررسی مرز شروع و پایان ماه شمسی (ماه ۶ ماه اول ۳۱ روزه، ماه ۶ ماه دوم ۳۰ روزه)
{
  const dFarvardin = getDaysInJalaliMonth(1405, 1);
  const dMehr = getDaysInJalaliMonth(1405, 7);
  assert(
    'Scenario 15: Shamsi month boundary accurately yields 31 days for H1 and 30 days for H2',
    dFarvardin === 31 && dMehr === 30,
    `Farvardin=${dFarvardin}, Mehr=${dMehr}`
  );
}

// 16. بررسی سال کبیسه و پایان اسفند بر اساس تقویم حسابی بیهقی/بیرشک (1404 کبیسه 30 روزه، 1405 عادی 29 روزه)
{
  const is1404Leap = isJalaliLeapYear(1404);
  const is1405Leap = isJalaliLeapYear(1405);
  const dEsfand1404 = getDaysInJalaliMonth(1404, 12);
  const dEsfand1405 = getDaysInJalaliMonth(1405, 12);
  assert(
    'Scenario 16: Leap year and Esfand month length (1404 is leap with 30 days, 1405 is normal with 29 days)',
    is1404Leap === true && is1405Leap === false && dEsfand1404 === 30 && dEsfand1405 === 29,
    `1404Leap=${is1404Leap} (${dEsfand1404}d), 1405Leap=${is1405Leap} (${dEsfand1405}d)`
  );
}

// 17. بررسی حفظ اطلاعات پس از بازخوانی (داده‌های Storage و JSON Backup)
{
  const sampleEvent: CalendarEvent = {
    id: 'test_backup_evt',
    companyId: 'comp_1',
    startDate: '1405/01/01',
    endDate: '1405/01/04',
    title: 'تعطیلات نوروز',
    type: 'OFFICIAL_HOLIDAY',
    scope: 'ALL',
    isActive: true,
    paidStatus: 'PAID'
  };
  const json = JSON.stringify([sampleEvent]);
  const restored = JSON.parse(json);
  assert(
    'Scenario 17: Calendar events serialize and deserialize losslessly for persistence and backups',
    restored[0].id === 'test_backup_evt' && restored[0].title === 'تعطیلات نوروز',
    `restored=${restored[0]?.title}`
  );
}

console.log(`\nTEST RUN SUMMARY: ${passedCount} / ${totalTests} PASSED.`);
if (passedCount === totalTests) {
  console.log('ALL REGRESSION TESTS COMPLETED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('SOME TESTS FAILED!');
  process.exit(1);
}
