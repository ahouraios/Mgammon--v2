/**
 * M.GAMMON - Comprehensive Role-Based Access Control (RBAC) & Security Verification Suite
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  role: string;
  test: string;
  endpoint: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

async function req(method: string, endpoint: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

function record(role: string, test: string, endpoint: string, pass: boolean, expected: string, actual: string, details?: string) {
  results.push({
    role,
    test,
    endpoint,
    expected,
    actual,
    status: pass ? 'PASS' : 'FAIL',
    details
  });
}

async function runTests() {
  console.log('🚀 Starting M.GAMMON Comprehensive RBAC & Security Test Suite...\n');

  // 1. Unauthenticated / Anonymous Tests
  console.log('--- 1. Testing Unauthenticated Access ---');
  const unauthEndpoints = [
    { method: 'GET', url: '/api/employees' },
    { method: 'GET', url: '/api/attendance' },
    { method: 'GET', url: '/api/leaves' },
    { method: 'GET', url: '/api/missions' },
    { method: 'GET', url: '/api/homework-tasks' },
    { method: 'GET', url: '/api/work-reports' },
    { method: 'GET', url: '/api/salaries' },
    { method: 'GET', url: '/api/advances' },
    { method: 'GET', url: '/api/expenses' },
    { method: 'GET', url: '/api/misc-payments' },
    { method: 'GET', url: '/api/settings' },
    { method: 'GET', url: '/api/alarms' },
    { method: 'GET', url: '/api/backup/export' },
    { method: 'POST', url: '/api/auth/sync-session' }
  ];

  for (const ep of unauthEndpoints) {
    const res = await req(ep.method, ep.url);
    const isBlocked = res.status === 401 || res.status === 403;
    record(
      'ناشناس (Anonymous)',
      `مسدودسازی دسترسی بدون لاگین به ${ep.url}`,
      ep.url,
      isBlocked,
      '401 Unauthorized / 403 Forbidden',
      `${res.status} (${res.data?.message || 'Blocked'})`
    );
  }

  // Check public endpoint
  const pubTime = await req('GET', '/api/time');
  record('ناشناس (Anonymous)', 'دسترسی مجاز به زمان سرور', '/api/time', pubTime.status === 200, '200 OK', `${pubTime.status}`);

  // 2. Login All Roles
  console.log('\n--- 2. Authenticating All Roles ---');
  const loginWorker = await req('POST', '/api/auth/login', { loginId: 'worker', password: 'Worker@MGommon2026!' });
  const workerToken = loginWorker.data?.token;
  record('کارگر (Worker)', 'ورود با رمز عبور امن', '/api/auth/login', !!workerToken, 'Token received', workerToken ? 'موفق' : 'ناموفق');

  const loginSup = await req('POST', '/api/auth/login', { loginId: 'supervisor', password: 'Super@MGommon2026!' });
  const supToken = loginSup.data?.token;
  record('سرپرست (Supervisor)', 'ورود با رمز عبور امن', '/api/auth/login', !!supToken, 'Token received', supToken ? 'موفق' : 'ناموفق');

  const loginHr = await req('POST', '/api/auth/login', { loginId: 'hr_manager', password: 'Hr@MGommon2026!' });
  const hrToken = loginHr.data?.token;
  record('منابع انسانی (HR Manager)', 'ورود با رمز عبور امن', '/api/auth/login', !!hrToken, 'Token received', hrToken ? 'موفق' : 'ناموفق');

  const loginFin = await req('POST', '/api/auth/login', { loginId: 'fin_manager', password: 'Fin@MGommon2026!' });
  const finToken = loginFin.data?.token;
  record('مدیر مالی (Finance Manager)', 'ورود با رمز عبور امن', '/api/auth/login', !!finToken, 'Token received', finToken ? 'موفق' : 'ناموفق');

  const loginAdmin = await req('POST', '/api/auth/login', { loginId: 'admin', password: 'Admin@MGommon2026!' });
  const adminToken = loginAdmin.data?.token;
  record('مدیر ارشد (Super Admin)', 'ورود با رمز عبور امن', '/api/auth/login', !!adminToken, 'Token received', adminToken ? 'موفق' : 'ناموفق');

  // Test Backdoor Blocking
  const backdoorLogin = await req('POST', '/api/auth/login', { loginId: 'admin', password: '123' });
  record('امنیت ورود', 'مسدود بودن کامل رمزهای پیش‌فرض/پشتی (123)', '/api/auth/login', backdoorLogin.status === 401, '401 Rejected', `${backdoorLogin.status}`);

  // 3. Worker (کارمند عادی) Access Controls
  console.log('\n--- 3. Testing Worker Allowed & Prohibited Permissions ---');
  // Worker profile access
  const workerMe = await req('GET', '/api/employees/me', undefined, workerToken);
  record('کارگر (Worker)', 'مشاهده پرونده پرسنلی خود', '/api/employees/me', workerMe.status === 200, '200 OK', `${workerMe.status}`, workerMe.data?.employee?.firstName);

  // Worker public directory: verify confidential fields NOT leaked
  const workerEmpDir = await req('GET', '/api/employees', undefined, workerToken);
  const dirSample = workerEmpDir.data?.[0];
  const noSensitiveLeak = dirSample && dirSample.baseSalary === undefined && dirSample.nationalCode === undefined && dirSample.bankAccount === undefined;
  record('کارگر (Worker)', 'عدم افشای حقوق و کد ملی در لیست همکاران', '/api/employees', noSensitiveLeak, 'No salary/nationalCode/bank leaked', noSensitiveLeak ? 'امن' : 'افشا شده!');

  // Worker attendance isolation
  const workerAtt = await req('GET', '/api/attendance', undefined, workerToken);
  const onlyOwnAtt = Array.isArray(workerAtt.data) && workerAtt.data.every((a: any) => a.employeeId === 'emp_worker_01');
  record('کارگر (Worker)', 'محدودیت سوابق تردد صرفاً به خود', '/api/attendance', onlyOwnAtt, 'Only own employeeId', `${workerAtt.status}`);

  // Worker blocked from reviewing
  const workerRevLeave = await req('POST', '/api/leaves/review', { leaveId: 'test', status: 'APPROVED' }, workerToken);
  record('کارگر (Worker)', 'مسدود بودن بررسی و تایید مرخصی', '/api/leaves/review', workerRevLeave.status === 403, '403 Forbidden', `${workerRevLeave.status}`);

  // Worker blocked from payroll calculation
  const workerCalcSal = await req('POST', '/api/salaries/calculate', { employeeId: 'emp_worker_01', month: '1403/01' }, workerToken);
  record('کارگر (Worker)', 'مسدود بودن محاسبه حقوق و دستمزد', '/api/salaries/calculate', workerCalcSal.status === 403, '403 Forbidden', `${workerCalcSal.status}`);

  // Worker blocked from modifying settings
  const workerPutSet = await req('PUT', '/api/settings', { companyName: 'Hacked' }, workerToken);
  record('کارگر (Worker)', 'مسدود بودن تغییر تنظیمات سیستم', '/api/settings', workerPutSet.status === 403, '403 Forbidden', `${workerPutSet.status}`);

  // Worker settings read: SMS credentials stripped
  const workerGetSet = await req('GET', '/api/settings', undefined, workerToken);
  const secretsStripped = workerGetSet.data?.smsPassword === undefined && workerGetSet.data?.smsApiKey === undefined;
  record('کارگر (Worker)', 'حذف اطلاعات محرمانه پیامک در دریافت تنظیمات', '/api/settings', secretsStripped, 'SMS credentials stripped', secretsStripped ? 'امن' : 'افشا شده!');

  // 4. Workshop Supervisor Permissions
  console.log('\n--- 4. Testing Workshop Supervisor Permissions ---');
  // Allowed: manual attendance review
  const supAttRev = await req('POST', '/api/attendance/review-manual', { recordId: 'non_existent', action: 'APPROVE' }, supToken);
  // 404 means route is authorized and reached record lookup! (not 403)
  record('سرپرست (Supervisor)', 'مجوز بررسی تردد دستی کارگاه', '/api/attendance/review-manual', supAttRev.status === 404, 'Authorized (404 Not Found)', `${supAttRev.status}`);

  // Prohibited: payroll calculation
  const supCalcSal = await req('POST', '/api/salaries/calculate', { employeeId: 'emp_worker_01', month: '1403/01' }, supToken);
  record('سرپرست (Supervisor)', 'مسدود بودن محاسبه حقوق و دستمزد', '/api/salaries/calculate', supCalcSal.status === 403, '403 Forbidden', `${supCalcSal.status}`);

  // Prohibited: deleting employees
  const supDelEmp = await req('DELETE', '/api/employees/emp_worker_01', undefined, supToken);
  record('سرپرست (Supervisor)', 'مسدود بودن حذف پرسنل', '/api/employees/:id', supDelEmp.status === 403, '403 Forbidden', `${supDelEmp.status}`);

  // 5. HR Manager Permissions
  console.log('\n--- 5. Testing HR Manager Permissions ---');
  // Allowed: create regular employee
  const hrCreateEmp = await req('POST', '/api/employees', {
    firstName: 'تست',
    lastName: 'کارمند منابع انسانی',
    nationalCode: '092999' + Math.floor(1000 + Math.random() * 9000),
    phone: '09159999999',
    role: 'EMPLOYEE'
  }, hrToken);
  record('منابع انسانی (HR Manager)', 'مجوز ثبت پرونده پرسنلی کارمند', '/api/employees', hrCreateEmp.status === 200, '200 Created', `${hrCreateEmp.status}`);

  // Prohibited: creating an ADMIN account (Privilege escalation block)
  const hrEscalate = await req('POST', '/api/employees', {
    firstName: 'جاعل',
    lastName: 'ادمین',
    nationalCode: '092888' + Math.floor(1000 + Math.random() * 9000),
    phone: '09158888888',
    username: 'fake_admin',
    role: 'ADMIN',
    isSuperAdmin: true
  }, hrToken);
  const escalationBlocked = hrEscalate.status === 403;
  record('منابع انسانی (HR Manager)', 'جلوگیری از ساخت حساب مدیر ارشد یا ارتقای نقش', '/api/employees', escalationBlocked, '403 Forbidden', `${hrEscalate.status} (${hrEscalate.data?.message || 'Blocked'})`);

  // Prohibited: payroll calculation (Finance role only)
  const hrCalcSal = await req('POST', '/api/salaries/calculate', { employeeId: 'emp_worker_01', month: '1403/01' }, hrToken);
  record('منابع انسانی (HR Manager)', 'مسدود بودن محاسبه حقوق مالی', '/api/salaries/calculate', hrCalcSal.status === 403, '403 Forbidden', `${hrCalcSal.status}`);

  // 6. Finance Manager Permissions
  console.log('\n--- 6. Testing Finance Manager Permissions ---');
  // Allowed: misc payments route
  const finMisc = await req('GET', '/api/misc-payments', undefined, finToken);
  record('مدیر مالی (Finance Manager)', 'مشاهده پرداخت‌های متفرقه و مالی', '/api/misc-payments', finMisc.status === 200, '200 OK', `${finMisc.status}`);

  // Prohibited: leaves review (HR / Supervisor only)
  const finRevLeave = await req('POST', '/api/leaves/review', { leaveId: 'test', status: 'APPROVED' }, finToken);
  record('مدیر مالی (Finance Manager)', 'مسدود بودن بررسی مرخصی پرسنل', '/api/leaves/review', finRevLeave.status === 403, '403 Forbidden', `${finRevLeave.status}`);

  // Prohibited: employee creation / modification
  const finCreateEmp = await req('POST', '/api/employees', { firstName: 'تست', lastName: 'مالی', nationalCode: '0927771111' }, finToken);
  record('مدیر مالی (Finance Manager)', 'مسدود بودن ایجاد پرسنل', '/api/employees', finCreateEmp.status === 403, '403 Forbidden', `${finCreateEmp.status}`);

  // 7. Super Admin Permissions & Management
  console.log('\n--- 7. Testing Super Admin Full Access & System Security ---');
  const adminExport = await req('GET', '/api/backup/export', undefined, adminToken);
  record('مدیر ارشد (Super Admin)', 'مجوز پشتیبان‌گیری کامل از پایگاه داده', '/api/backup/export', adminExport.status === 200, '200 OK', `${adminExport.status}`);

  const adminSettings = await req('GET', '/api/settings', undefined, adminToken);
  const hasFullSettings = adminSettings.data?.smsProvider !== undefined;
  record('مدیر ارشد (Super Admin)', 'دسترسی به تنظیمات مدیریتی و پیامک', '/api/settings', hasFullSettings, 'Full settings accessible', `${adminSettings.status}`);

  // 8. Super Admin Bootstrap Setup Endpoint Security
  console.log('\n--- 8. Testing Initial Super Admin Bootstrap Endpoint (/api/setup/admin) ---');
  // Attempt setup without valid key
  const setupBadKey = await req('POST', '/api/setup/admin', {
    setupKey: 'invalid_hack_key',
    username: 'hacker_admin',
    password: 'Password12345!'
  });
  record('راه‌اندازی امن (Setup)', 'رد درخواست راه‌اندازی بدون کلید امنیتی معتبر', '/api/setup/admin', setupBadKey.status === 403, '403 Forbidden', `${setupBadKey.status}`);

  // Summary
  console.log('\n======================================================');
  console.log('📊 FINAL TEST RESULTS SUMMARY:');
  console.log('======================================================');
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') passCount++;
    else failCount++;
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${r.role}] ${r.test} -> ${r.actual}`);
  }

  console.log('======================================================');
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
});
