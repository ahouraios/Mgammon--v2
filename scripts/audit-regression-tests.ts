import { calculatePayroll } from '../src/utils/payrollEngine';
import { Employee, CompanySettings, AttendanceRecord, HomeworkTask, WorkMission } from '../src/types';

function runTests() {
  console.log('=== RUNNING M.GAMMON AUDIT & REGRESSION TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const baseSettings: CompanySettings = {
    id: 'comp_1',
    companyName: 'M.GAMMON',
    companyCode: 'MG-101',
    address: 'مشهد',
    phoneNumber: '05136909090',
    qrRefreshIntervalSeconds: 30,
    defaultWorkStartTime: '07:00',
    defaultWorkEndTime: '16:00',
    workDaysPerMonth: 22,
    dailyWorkHours: 8,
    overtimeRateMultiplier: 1.4,
    insuranceRatePercent: 7,
    taxRatePercent: 10,
    taxExemptionThreshold: 14000000,
    fixedHousingAllowance: 900000,
    fixedGroceryAllowance: 1400000,
    childAllowance: 500000,
    officeLat: 36.37,
    officeLng: 59.50,
    allowedGpsRadiusMeters: 35,
    lateToleranceMinutes: 15,
    annualLeaveDaysQuota: 26,
    maxLeaveRequestsPerWeek: 1,
    allowMultiplePendingLeaves: false,
    maxHourlyLeaveHoursPerMonth: 16,
    maxAdvanceRequestsPerMonth: 1,
    advanceWindowStartDay: 15,
    advanceWindowEndDay: 20,
    maxAdvanceSalaryPercent: 30,
    workshops: []
  };

  const sampleEmployee: Employee = {
    id: 'emp_test_1',
    companyId: 'comp_1',
    personalCode: 'MG-001',
    nationalCode: '0920000001',
    firstName: 'علی',
    lastName: 'رضایی',
    phone: '09150000001',
    email: 'ali@example.com',
    hireDate: '1400/01/01',
    department: 'تولید',
    position: 'تراشکار',
    workshopId: 'ws_1',
    shiftId: 'shift_1',
    baseSalary: 22000000, // 22,000,000 Toman (1,000,000 / day for 22 days)
    hourlyRate: 0,
    overtimeRate: 1.4,
    remainingLeaveDays: 26,
    shebaNumber: '',
    status: 'ACTIVE',
    allowManualAttendance: false
  };

  function createAttRecord(partial: Partial<AttendanceRecord> & { date: string; status: AttendanceRecord['status'] }): AttendanceRecord {
    return {
      id: `att_${Math.random()}`,
      companyId: 'comp_1',
      employeeId: sampleEmployee.id,
      workDurationMinutes: 0,
      lateMinutes: 0,
      earlyExitMinutes: 0,
      overtimeMinutes: 0,
      approvalStatus: 'APPROVED',
      ...partial
    };
  }

  // ----------------------------------------------------
  // TEST 1: Zero Attendance Silence != Full Attendance
  // ----------------------------------------------------
  console.log('--- TEST GROUP 1: Silence & Zero Attendance (Goal 4) ---');
  {
    const res = calculatePayroll({
      employee: sampleEmployee,
      settings: baseSettings,
      month: '1405/07',
      attendanceRecords: [],
      advances: [],
      bonusesPenalties: [],
      workerExpenses: [],
      homeworkTasks: [],
      miscPayments: [],
      missions: []
    });

    assert(
      'Zero attendance records must result in workDays === 0 (not 22)',
      res.workDays === 0,
      `Got workDays: ${res.workDays}`
    );
    assert(
      'Zero attendance records must record 22 unrecorded/absent days',
      res.absentDaysCount === 22 && res.unrecordedDaysCount === 22,
      `Got absentDaysCount: ${res.absentDaysCount}`
    );
    assert(
      'Full absent deduction applied (22 days * 1,000,000 = 22,000,000)',
      res.absentDeduction === 22000000,
      `Got absentDeduction: ${res.absentDeduction}`
    );
  }

  // ----------------------------------------------------
  // TEST 2: 0 vs undefined (Goal 2)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 2: 0 vs Undefined Fallbacks (Goal 2) ---');
  {
    // Case A: Employee has undefined allowances -> fallback to settings
    const empUndefined: Employee = {
      ...sampleEmployee,
      housingAllowance: undefined,
      groceryAllowance: undefined,
      childAllowance: undefined,
      insuranceRatePercent: undefined,
      taxRatePercent: undefined
    };

    const resUndefined = calculatePayroll({
      employee: empUndefined,
      settings: baseSettings,
      month: '1405/07',
      attendanceRecords: [
        createAttRecord({
          date: '1405/07/01',
          status: 'PRESENT',
          checkInTime: '07:00',
          checkOutTime: '16:00',
          workDurationMinutes: 480
        })
      ],
      advances: [],
      bonusesPenalties: [],
      workerExpenses: [],
      homeworkTasks: [],
      miscPayments: [],
      missions: []
    });

    assert(
      'Undefined housing allowance falls back to company fixed allowance (900,000)',
      resUndefined.housingAllowance === 900000,
      `Got: ${resUndefined.housingAllowance}`
    );
    assert(
      'Undefined grocery allowance falls back to company fixed allowance (1,400,000)',
      resUndefined.groceryAllowance === 1400000,
      `Got: ${resUndefined.groceryAllowance}`
    );
    assert(
      'Undefined child allowance falls back to company allowance (500,000)',
      resUndefined.childAllowance === 500000,
      `Got: ${resUndefined.childAllowance}`
    );

    // Case B: Employee explicitly has 0 for allowances -> strictly 0!
    const empZero: Employee = {
      ...sampleEmployee,
      housingAllowance: 0,
      groceryAllowance: 0,
      childAllowance: 0,
      insuranceRatePercent: 0,
      taxRatePercent: 0
    };

    const resZero = calculatePayroll({
      employee: empZero,
      settings: baseSettings,
      month: '1405/07',
      attendanceRecords: [
        createAttRecord({
          date: '1405/07/01',
          status: 'PRESENT',
          checkInTime: '07:00',
          checkOutTime: '16:00',
          workDurationMinutes: 480
        })
      ],
      advances: [],
      bonusesPenalties: [],
      workerExpenses: [],
      homeworkTasks: [],
      miscPayments: [],
      missions: []
    });

    assert(
      'housingAllowance === 0 remains strictly 0 (not overridden by 900,000)',
      resZero.housingAllowance === 0,
      `Got: ${resZero.housingAllowance}`
    );
    assert(
      'groceryAllowance === 0 remains strictly 0 (not overridden by 1,400,000)',
      resZero.groceryAllowance === 0,
      `Got: ${resZero.groceryAllowance}`
    );
    assert(
      'childAllowance === 0 remains strictly 0 (not overridden by 500,000)',
      resZero.childAllowance === 0,
      `Got: ${resZero.childAllowance}`
    );
    assert(
      'insuranceRatePercent === 0 results in insuranceDeduction === 0',
      resZero.insuranceDeduction === 0,
      `Got: ${resZero.insuranceDeduction}`
    );
    assert(
      'taxRatePercent === 0 results in taxDeduction === 0',
      resZero.taxDeduction === 0,
      `Got: ${resZero.taxDeduction}`
    );
  }

  // ----------------------------------------------------
  // TEST 3: Insurance & Tax Exemptions (Goal 3)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 3: Insurance & Tax Exemptions (Goal 3) ---');
  {
    const empExempt: Employee = {
      ...sampleEmployee,
      isInsuranceExempt: true,
      isTaxExempt: true
    };

    const resExempt = calculatePayroll({
      employee: empExempt,
      settings: baseSettings,
      month: '1405/07',
      attendanceRecords: Array.from({ length: 22 }, (_, i) => 
        createAttRecord({
          id: `att_${i}`,
          date: `1405/07/${(i + 1).toString().padStart(2, '0')}`,
          status: 'PRESENT',
          checkInTime: '07:00',
          checkOutTime: '16:00',
          workDurationMinutes: 480
        })
      ),
      advances: [],
      bonusesPenalties: [],
      workerExpenses: [],
      homeworkTasks: [],
      miscPayments: [],
      missions: []
    });

    assert('Exempt employee has insuranceDeduction === 0', resExempt.insuranceDeduction === 0);
    assert('Exempt employee has taxDeduction === 0', resExempt.taxDeduction === 0);
    assert('All 22 days worked -> absentDeduction === 0', resExempt.absentDeduction === 0);
    assert('Net salary equals gross salary when no deductions', resExempt.netSalary === resExempt.grossSalary);
  }

  // ----------------------------------------------------
  // TEST 4: Missions & Leaves & Homework (Goal 1 & 4)
  // ----------------------------------------------------
  console.log('\n--- TEST GROUP 4: Missions, Leaves & Homework Wages (Goal 1 & 4) ---');
  {
    const homeworkItem: HomeworkTask = {
      id: 'hw_1',
      companyId: 'comp_1',
      employeeId: sampleEmployee.id,
      employeeName: 'علی رضایی',
      taskType: 'تراشکاری قطعه فلزی',
      quantity: 50,
      unit: 'عدد',
      wagePerUnit: 40000,
      totalWage: 2000000, // 2,000,000 Toman homework wage
      date: '1405/07/20',
      status: 'ADDED_TO_SALARY',
      createdAt: new Date().toISOString()
    };

    const missionItem: WorkMission = {
      id: 'msn_1',
      companyId: 'comp_1',
      employeeId: sampleEmployee.id,
      employeeName: 'علی رضایی',
      date: '1405/07/16',
      startTime: '08:00',
      endTime: '15:00',
      destination: 'کارخانه قطعه‌سازی شرق',
      isWithinWorkingHours: true,
      createdAt: new Date().toISOString()
    };

    const resCombined = calculatePayroll({
      employee: sampleEmployee,
      settings: baseSettings,
      month: '1405/07',
      attendanceRecords: [
        // 10 Present days
        ...Array.from({ length: 10 }, (_, i) => 
          createAttRecord({
            id: `att_p_${i}`,
            date: `1405/07/${(i + 1).toString().padStart(2, '0')}`,
            status: 'PRESENT',
            checkInTime: '07:00',
            checkOutTime: '16:00',
            workDurationMinutes: 480
          })
        ),
        // 2 Paid leave days
        createAttRecord({
          id: 'att_l_1',
          date: '1405/07/11',
          status: 'ON_LEAVE',
          notes: 'مرخصی استحقاقی سالیانه'
        }),
        createAttRecord({
          id: 'att_l_2',
          date: '1405/07/12',
          status: 'ON_LEAVE',
          notes: 'مرخصی استحقاقی'
        }),
        // 1 Unpaid leave day
        createAttRecord({
          id: 'att_l_unpaid',
          date: '1405/07/13',
          status: 'ON_LEAVE',
          notes: 'مرخصی UNPAID بدون حقوق'
        }),
        // 1 Explicit absent day
        createAttRecord({
          id: 'att_abs',
          date: '1405/07/14',
          status: 'ABSENT'
        }),
        // 1 Rejected manual attendance request (must be treated as absent, not worked)
        createAttRecord({
          id: 'att_rej',
          date: '1405/07/15',
          status: 'PRESENT',
          approvalStatus: 'REJECTED',
          checkInMethod: 'MANUAL'
        })
      ],
      advances: [],
      bonusesPenalties: [],
      workerExpenses: [],
      homeworkTasks: [homeworkItem],
      miscPayments: [],
      missions: [missionItem]
    });

    // Total worked days: 10 present + 2 paid leave + 1 mission = 13 worked days
    assert(
      'Worked days count correctly aggregates 10 present + 2 paid leave + 1 mission = 13',
      resCombined.workDays === 13,
      `Got workDays: ${resCombined.workDays}`
    );
    assert(
      'Mission days count tracked as 1',
      resCombined.missionDaysCount === 1,
      `Got: ${resCombined.missionDaysCount}`
    );
    assert(
      'Paid leave days count tracked as 2',
      resCombined.paidLeaveDaysCount === 2,
      `Got: ${resCombined.paidLeaveDaysCount}`
    );
    assert(
      'Unpaid leave days count tracked as 1',
      resCombined.unpaidLeaveDaysCount === 1,
      `Got: ${resCombined.unpaidLeaveDaysCount}`
    );
    assert(
      'Rejected request treated as absent (not worked day)',
      resCombined.explicitAbsentDaysCount === 2, // 1 explicit ABSENT + 1 REJECTED
      `Got: ${resCombined.explicitAbsentDaysCount}`
    );
    assert(
      'Homework task wages (2,000,000) added to salary without modifying baseSalary',
      resCombined.homeworkWagesTotal === 2000000 && resCombined.baseSalary === 22000000,
      `Got homeworkWagesTotal: ${resCombined.homeworkWagesTotal}`
    );
    assert(
      'Gross salary includes base + allowances + homework wage',
      resCombined.grossSalary > resCombined.baseSalary,
      `Got grossSalary: ${resCombined.grossSalary}`
    );
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
