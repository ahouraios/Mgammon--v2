import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface DatabaseStatus {
  mode: 'MYSQL' | 'ATOMIC_FILE_FALLBACK';
  connected: boolean;
  database: string;
  host: string;
  port: number;
  message: string;
  lastChecked: string;
  tableCounts?: Record<string, number>;
}

class MySqlDatabaseService {
  private pool: Pool | null = null;
  private isConnected = false;
  private isInitialized = false;
  private initPromise: Promise<boolean> | null = null;

  private host = process.env.MYSQL_HOST || '';
  private port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  private user = process.env.MYSQL_USER || '';
  private password = process.env.MYSQL_PASSWORD || '';
  private database = process.env.MYSQL_DATABASE || '';
  private connectionLimit = parseInt(process.env.MYSQL_CONNECTION_LIMIT || '10', 10);

  /**
   * Check if MySQL environment credentials have been supplied
   */
  public isConfigured(): boolean {
    return Boolean(this.host && this.user && this.database);
  }

  /**
   * Initialize pool and verify connectivity
   */
  public async initialize(dataDir?: string, dbJsonFile?: string): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.isConfigured()) {
        console.log('ℹ️ [MySQL] Environment variables (MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE) not configured.');
        console.log('ℹ️ [MySQL] System active with atomic file-backed storage (data/db.json). Ready for MySQL upon hosting deployment.');
        this.isConnected = false;
        this.isInitialized = true;
        return false;
      }

      try {
        console.log(`🔌 [MySQL] Connecting to ${this.user}@${this.host}:${this.port}/${this.database}...`);
        this.pool = mysql.createPool({
          host: this.host,
          port: this.port,
          user: this.user,
          password: this.password,
          database: this.database,
          waitForConnections: true,
          connectionLimit: this.connectionLimit,
          queueLimit: 0,
          charset: 'utf8mb4_unicode_ci',
          timezone: '+03:30', // Tehran
          connectTimeout: 7000
        });

        // Test connection
        const conn = await this.pool.getConnection();
        await conn.ping();
        conn.release();

        this.isConnected = true;
        this.isInitialized = true;
        console.log('✅ [MySQL] Connection pool created and verified successfully!');

        // Run migrations
        await this.runMigrations();

        // Migrate seed data if tables are empty
        if (dbJsonFile && fs.existsSync(dbJsonFile)) {
          await this.syncFromDbJsonIfEmpty(dbJsonFile);
        }

        return true;
      } catch (err: any) {
        console.warn('⚠️ [MySQL] Could not connect to MySQL server:', err.message || err);
        console.warn('⚠️ [MySQL] Falling back safely to persistent storage. All data will be preserved.');
        this.isConnected = false;
        this.isInitialized = true;
        return false;
      }
    })();

    return this.initPromise;
  }

  public getPool(): Pool | null {
    return this.pool;
  }

  public getStatus(): DatabaseStatus {
    return {
      mode: this.isConnected ? 'MYSQL' : 'ATOMIC_FILE_FALLBACK',
      connected: this.isConnected,
      database: this.database || 'mgammon_default',
      host: this.host || 'local',
      port: this.port || 3306,
      message: this.isConnected
        ? 'اتصال فعال به پایگاه‌داده رابطه ای MySQL برقرار است. تمام عملیات به صورت پایدار در دیتابیس هاست ذخیره می‌شوند.'
        : 'سامانه در وضعیت آماده‌باش اتصال به MySQL قرار دارد و اطلاعات روی هاست در فایل پایدار داده سرور ذخیره می‌شوند.',
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Execute schema migrations to ensure all required tables exist
   */
  public async runMigrations(): Promise<void> {
    if (!this.pool || !this.isConnected) return;

    console.log('🔄 [MySQL] Checking schema and verifying database tables...');
    const conn = await this.pool.getConnection();
    try {
      // Ensure tables exist using schema definitions
      await conn.query(`
        CREATE TABLE IF NOT EXISTS company_settings (
          id VARCHAR(64) PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL,
          company_code VARCHAR(64) NOT NULL,
          owner_name VARCHAR(255) DEFAULT NULL,
          logo_url TEXT DEFAULT NULL,
          dashboard_banner_url TEXT DEFAULT NULL,
          address TEXT DEFAULT NULL,
          phone_number VARCHAR(64) DEFAULT NULL,
          office_lat DECIMAL(10, 7) DEFAULT 36.3766000,
          office_lng DECIMAL(10, 7) DEFAULT 59.5082000,
          allowed_gps_radius_meters INT DEFAULT 35,
          workshops_json LONGTEXT DEFAULT NULL,
          sms_enabled TINYINT(1) DEFAULT 0,
          sms_provider VARCHAR(64) DEFAULT 'MELIPAYAMAK',
          sms_connection_mode VARCHAR(64) DEFAULT 'legacy_rest',
          sms_sender_number VARCHAR(64) DEFAULT NULL,
          sms_username VARCHAR(128) DEFAULT NULL,
          sms_password TEXT DEFAULT NULL,
          sms_api_key TEXT DEFAULT NULL,
          sms_new_api_endpoint TEXT DEFAULT NULL,
          sms_new_api_token TEXT DEFAULT NULL,
          sms_pattern_code VARCHAR(64) DEFAULT NULL,
          sms_last_connection_status VARCHAR(64) DEFAULT 'UNKNOWN',
          sms_last_balance VARCHAR(128) DEFAULT NULL,
          qr_refresh_interval_seconds INT DEFAULT 30,
          default_work_start_time VARCHAR(16) DEFAULT '07:00',
          default_work_end_time VARCHAR(16) DEFAULT '16:00',
          late_tolerance_minutes INT DEFAULT 15,
          annual_leave_days_quota INT DEFAULT 26,
          max_leave_requests_per_week INT DEFAULT 1,
          allow_multiple_pending_leaves TINYINT(1) DEFAULT 0,
          max_hourly_leave_hours_per_month INT DEFAULT 16,
          max_advance_requests_per_month INT DEFAULT 1,
          advance_window_start_day INT DEFAULT 15,
          advance_window_end_day INT DEFAULT 20,
          max_advance_salary_percent INT DEFAULT 30,
          work_days_per_month INT DEFAULT 22,
          daily_work_hours DECIMAL(5, 2) DEFAULT 8.00,
          overtime_rate_multiplier DECIMAL(5, 2) DEFAULT 1.40,
          insurance_rate_percent DECIMAL(5, 2) DEFAULT 7.00,
          tax_rate_percent DECIMAL(5, 2) DEFAULT 10.00,
          tax_exemption_threshold BIGINT DEFAULT 14000000,
          fixed_housing_allowance BIGINT DEFAULT 900000,
          fixed_grocery_allowance BIGINT DEFAULT 1400000,
          child_allowance BIGINT DEFAULT 0,
          job_categories_json TEXT DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS shifts (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(32) NOT NULL DEFAULT 'MORNING',
          start_time VARCHAR(16) NOT NULL DEFAULT '07:00',
          end_time VARCHAR(16) NOT NULL DEFAULT '16:00',
          thursday_end_time VARCHAR(16) DEFAULT '13:00',
          break_duration_minutes INT DEFAULT 60,
          work_days_json VARCHAR(128) DEFAULT '[0,1,2,3,4,5]',
          late_tolerance_minutes INT DEFAULT 15,
          early_exit_tolerance_minutes INT DEFAULT 10,
          raw_json LONGTEXT DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) DEFAULT NULL,
          username VARCHAR(128) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          password_salt VARCHAR(255) DEFAULT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) DEFAULT NULL,
          phone VARCHAR(64) DEFAULT NULL,
          role VARCHAR(32) NOT NULL DEFAULT 'EMPLOYEE',
          is_super_admin TINYINT(1) DEFAULT 0,
          workshop_id VARCHAR(64) DEFAULT NULL,
          permissions_json TEXT DEFAULT NULL,
          management_roles_json TEXT DEFAULT NULL,
          avatar_url TEXT DEFAULT NULL,
          is_hr_manager TINYINT(1) DEFAULT 0,
          is_finance_manager TINYINT(1) DEFAULT 0,
          raw_json LONGTEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS employees (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          personal_code VARCHAR(64) NOT NULL UNIQUE,
          first_name VARCHAR(128) NOT NULL,
          last_name VARCHAR(128) NOT NULL,
          national_code VARCHAR(64) DEFAULT NULL,
          phone VARCHAR(64) NOT NULL,
          email VARCHAR(255) DEFAULT NULL,
          department VARCHAR(128) NOT NULL DEFAULT 'کارگاه',
          position VARCHAR(128) NOT NULL DEFAULT 'نیروی فنی',
          workshop_id VARCHAR(64) DEFAULT 'ws_1',
          username VARCHAR(128) DEFAULT NULL,
          hire_date VARCHAR(32) DEFAULT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
          shift_id VARCHAR(64) DEFAULT 'shift_standard_day',
          card_number VARCHAR(32) DEFAULT NULL,
          bank_account VARCHAR(64) DEFAULT NULL,
          sheba_number VARCHAR(64) DEFAULT NULL,
          base_salary BIGINT NOT NULL DEFAULT 0,
          hourly_rate BIGINT DEFAULT 0,
          overtime_rate DECIMAL(5, 2) DEFAULT 1.40,
          remaining_leave_days INT DEFAULT 26,
          is_confidential TINYINT(1) DEFAULT 0,
          allow_manual_attendance TINYINT(1) DEFAULT 0,
          is_hr_manager TINYINT(1) DEFAULT 0,
          is_finance_manager TINYINT(1) DEFAULT 0,
          housing_allowance BIGINT DEFAULT NULL,
          grocery_allowance BIGINT DEFAULT NULL,
          child_allowance BIGINT DEFAULT NULL,
          is_insurance_exempt TINYINT(1) DEFAULT 0,
          insurance_rate_percent DECIMAL(5, 2) DEFAULT NULL,
          is_tax_exempt TINYINT(1) DEFAULT 0,
          tax_rate_percent DECIMAL(5, 2) DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          date VARCHAR(32) NOT NULL,
          check_in_time VARCHAR(16) DEFAULT NULL,
          check_out_time VARCHAR(16) DEFAULT NULL,
          work_duration_minutes INT DEFAULT 0,
          late_minutes INT DEFAULT 0,
          early_exit_minutes INT DEFAULT 0,
          overtime_minutes INT DEFAULT 0,
          status VARCHAR(32) NOT NULL DEFAULT 'PRESENT',
          check_in_method VARCHAR(32) DEFAULT 'QR_CODE',
          check_out_method VARCHAR(32) DEFAULT NULL,
          approval_status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
          approved_by VARCHAR(128) DEFAULT NULL,
          approved_at VARCHAR(64) DEFAULT NULL,
          manual_reason TEXT DEFAULT NULL,
          is_mission TINYINT(1) DEFAULT 0,
          is_mission_start TINYINT(1) DEFAULT 0,
          mission_destination VARCHAR(255) DEFAULT NULL,
          notes TEXT DEFAULT NULL,
          verified_lat DECIMAL(10, 7) DEFAULT NULL,
          verified_lng DECIMAL(10, 7) DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_att_emp_date (employee_id, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS leaves (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          employee_name VARCHAR(255) NOT NULL,
          type VARCHAR(32) NOT NULL DEFAULT 'EARNED',
          start_date VARCHAR(32) NOT NULL,
          end_date VARCHAR(32) NOT NULL,
          start_time VARCHAR(16) DEFAULT NULL,
          end_time VARCHAR(16) DEFAULT NULL,
          duration_days INT DEFAULT 1,
          duration_hours INT DEFAULT 0,
          reason TEXT DEFAULT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
          created_at VARCHAR(64) NOT NULL,
          reviewed_by VARCHAR(128) DEFAULT NULL,
          reviewed_at VARCHAR(64) DEFAULT NULL,
          rejection_reason TEXT DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_leaves_emp_status (employee_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS advances (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          employee_name VARCHAR(255) NOT NULL,
          amount BIGINT NOT NULL,
          request_date VARCHAR(32) NOT NULL,
          repay_month VARCHAR(32) NOT NULL,
          reason TEXT DEFAULT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
          created_at VARCHAR(64) NOT NULL,
          reviewed_by VARCHAR(128) DEFAULT NULL,
          reviewed_at VARCHAR(64) DEFAULT NULL,
          rejection_reason TEXT DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_adv_emp_month (employee_id, repay_month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS worker_expenses (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          employee_name VARCHAR(255) NOT NULL,
          amount BIGINT NOT NULL,
          title VARCHAR(255) NOT NULL,
          date VARCHAR(32) NOT NULL,
          receipt_url TEXT DEFAULT NULL,
          payer VARCHAR(64) DEFAULT 'کارت شخصی کارگر',
          status VARCHAR(32) NOT NULL DEFAULT 'PENDING_SETTLEMENT',
          created_at VARCHAR(64) NOT NULL,
          settled_at VARCHAR(64) DEFAULT NULL,
          settled_by VARCHAR(128) DEFAULT NULL,
          settlement_notes TEXT DEFAULT NULL,
          settlement_type VARCHAR(32) DEFAULT NULL,
          rejection_reason TEXT DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_exp_emp_status (employee_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS homework_tasks (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          employee_name VARCHAR(255) NOT NULL,
          task_type VARCHAR(255) NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          unit VARCHAR(64) DEFAULT 'عدد',
          wage_per_unit BIGINT NOT NULL,
          total_wage BIGINT NOT NULL,
          date VARCHAR(32) NOT NULL,
          order_code VARCHAR(128) DEFAULT NULL,
          notes TEXT DEFAULT NULL,
          receipt_url TEXT DEFAULT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
          settlement_type VARCHAR(32) DEFAULT NULL,
          settled_at VARCHAR(64) DEFAULT NULL,
          settled_by VARCHAR(128) DEFAULT NULL,
          reviewed_by VARCHAR(128) DEFAULT NULL,
          settlement_notes TEXT DEFAULT NULL,
          rejection_reason TEXT DEFAULT NULL,
          created_at VARCHAR(64) NOT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_hw_emp_status (employee_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS misc_payments (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          employee_name VARCHAR(255) NOT NULL,
          amount BIGINT NOT NULL,
          title VARCHAR(255) NOT NULL,
          date VARCHAR(32) NOT NULL,
          month VARCHAR(32) NOT NULL,
          deduct_from_salary TINYINT(1) DEFAULT 1,
          notes TEXT DEFAULT NULL,
          created_at VARCHAR(64) NOT NULL,
          created_by VARCHAR(128) DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_misc_emp_month (employee_id, month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS work_missions (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          employee_name VARCHAR(255) NOT NULL,
          date VARCHAR(32) NOT NULL,
          start_time VARCHAR(16) NOT NULL,
          end_time VARCHAR(16) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          is_within_working_hours TINYINT(1) DEFAULT 1,
          created_at VARCHAR(64) NOT NULL,
          created_by VARCHAR(128) DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_msn_emp_date (employee_id, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS bonuses_penalties (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          type VARCHAR(32) NOT NULL,
          amount BIGINT NOT NULL,
          date VARCHAR(32) NOT NULL,
          month VARCHAR(32) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          created_at VARCHAR(64) DEFAULT NULL,
          created_by VARCHAR(128) DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_bp_emp_month (employee_id, month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS salaries (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          employee_id VARCHAR(64) NOT NULL,
          month VARCHAR(32) NOT NULL,
          base_salary BIGINT NOT NULL,
          work_days INT NOT NULL DEFAULT 0,
          worked_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
          overtime_hours DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
          overtime_amount BIGINT NOT NULL DEFAULT 0,
          bonuses_total BIGINT NOT NULL DEFAULT 0,
          penalties_total BIGINT NOT NULL DEFAULT 0,
          advances_total BIGINT NOT NULL DEFAULT 0,
          discretionary_advances_total BIGINT NOT NULL DEFAULT 0,
          personal_card_expenses_total BIGINT NOT NULL DEFAULT 0,
          homework_wages_total BIGINT NOT NULL DEFAULT 0,
          misc_deductions_total BIGINT NOT NULL DEFAULT 0,
          insurance_deduction BIGINT NOT NULL DEFAULT 0,
          tax_deduction BIGINT NOT NULL DEFAULT 0,
          housing_allowance BIGINT NOT NULL DEFAULT 0,
          grocery_allowance BIGINT NOT NULL DEFAULT 0,
          child_allowance BIGINT NOT NULL DEFAULT 0,
          gross_salary BIGINT NOT NULL DEFAULT 0,
          net_salary BIGINT NOT NULL DEFAULT 0,
          status VARCHAR(32) NOT NULL DEFAULT 'CALCULATED',
          payment_date VARCHAR(32) DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_sal_emp_month (employee_id, month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          user_id VARCHAR(64) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          action VARCHAR(128) NOT NULL,
          resource VARCHAR(128) NOT NULL,
          details TEXT NOT NULL,
          timestamp VARCHAR(64) NOT NULL,
          ip_address VARCHAR(64) DEFAULT '127.0.0.1',
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_log_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS broadcast_messages (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          sender_name VARCHAR(255) NOT NULL,
          recipient_type VARCHAR(32) NOT NULL DEFAULT 'ALL',
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          channel VARCHAR(32) NOT NULL DEFAULT 'IN_APP',
          sent_at VARCHAR(64) NOT NULL,
          status VARCHAR(32) NOT NULL DEFAULT 'SENT',
          raw_json LONGTEXT DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS workshop_alarms (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(32) NOT NULL DEFAULT 'RECURRING',
          target_type VARCHAR(32) NOT NULL DEFAULT 'ALL',
          scheduled_date VARCHAR(32) DEFAULT NULL,
          scheduled_time VARCHAR(16) DEFAULT '16:00',
          ringtone VARCHAR(32) NOT NULL DEFAULT 'BELL',
          send_sms TINYINT(1) DEFAULT 0,
          is_active TINYINT(1) DEFAULT 1,
          created_at VARCHAR(64) NOT NULL,
          createdBy VARCHAR(128) NOT NULL,
          raw_json LONGTEXT DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await conn.query(`
        CREATE TABLE IF NOT EXISTS financial_reminders (
          id VARCHAR(64) PRIMARY KEY,
          company_id VARCHAR(64) NOT NULL,
          title VARCHAR(255) NOT NULL,
          type VARCHAR(32) NOT NULL DEFAULT 'INVOICE',
          amount BIGINT NOT NULL DEFAULT 0,
          due_date VARCHAR(32) NOT NULL,
          debtor_creditor_name VARCHAR(255) NOT NULL,
          bank_name VARCHAR(128) DEFAULT NULL,
          check_number VARCHAR(128) DEFAULT NULL,
          installment_number VARCHAR(128) DEFAULT NULL,
          description TEXT DEFAULT NULL,
          priority VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
          status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
          created_by_employee_id VARCHAR(64) NOT NULL,
          created_by_name VARCHAR(128) NOT NULL,
          created_at VARCHAR(64) NOT NULL,
          is_sent_to_senior_admin TINYINT(1) DEFAULT 0,
          sent_at VARCHAR(64) DEFAULT NULL,
          seen_by_senior_admin TINYINT(1) DEFAULT 0,
          seen_at VARCHAR(64) DEFAULT NULL,
          admin_feedback TEXT DEFAULT NULL,
          paid_at VARCHAR(64) DEFAULT NULL,
          raw_json LONGTEXT DEFAULT NULL,
          INDEX idx_fin_status_due (status, due_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      console.log('✅ [MySQL] All 17 operational tables verified and ready.');
    } finally {
      conn.release();
    }
  }

  /**
   * Migrate existing records from db.json if MySQL is completely fresh/empty
   */
  public async syncFromDbJsonIfEmpty(dbJsonFile: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;

    try {
      const dataStr = fs.readFileSync(dbJsonFile, 'utf-8');
      const data = JSON.parse(dataStr);

      const [rows]: any = await this.pool.query('SELECT COUNT(*) as count FROM users');
      const count = rows[0]?.count || 0;

      if (count > 0) {
        console.log(`ℹ️ [MySQL] Database already populated (${count} users found). Skipping initial seed.`);
        return;
      }

      console.log('🌱 [MySQL] Empty database detected. Seeding data from current db.json store...');
      const conn = await this.pool.getConnection();
      await conn.beginTransaction();

      try {
        // 1. Settings
        if (data.settings) {
          const s = data.settings;
          await conn.query(
            `INSERT INTO company_settings (id, company_name, company_code, owner_name, logo_url, address, phone_number, raw_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE raw_json = VALUES(raw_json)`,
            [s.id || 'comp_mgommon_01', s.companyName || 'M.GAMMON', s.companyCode || 'MG-101', s.ownerName || '', s.logoUrl || '', s.address || '', s.phoneNumber || '', JSON.stringify(s)]
          );
        }

        // 2. Shifts
        if (Array.isArray(data.shifts)) {
          for (const sh of data.shifts) {
            await conn.query(
              `INSERT IGNORE INTO shifts (id, company_id, name, type, start_time, end_time, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [sh.id, sh.companyId || 'comp_mgommon_01', sh.name, sh.type || 'MORNING', sh.startTime, sh.endTime, JSON.stringify(sh)]
            );
          }
        }

        // 3. Users
        if (Array.isArray(data.users)) {
          for (const u of data.users) {
            await conn.query(
              `INSERT IGNORE INTO users (id, company_id, username, password_hash, password_salt, name, role, is_super_admin, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [u.id, u.companyId || 'comp_mgommon_01', u.username, u.passwordHash, u.passwordSalt || null, u.name, u.role, u.isSuperAdmin ? 1 : 0, JSON.stringify(u)]
            );
          }
        }

        // 4. Employees
        if (Array.isArray(data.employees)) {
          for (const e of data.employees) {
            await conn.query(
              `INSERT IGNORE INTO employees (id, company_id, personal_code, first_name, last_name, phone, department, position, base_salary, status, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [e.id, e.companyId || 'comp_mgommon_01', e.personalCode, e.firstName, e.lastName, e.phone, e.department || 'کارگاه', e.position || 'نیروی فنی', e.baseSalary || 0, e.status || 'ACTIVE', JSON.stringify(e)]
            );
          }
        }

        // 5. Attendance
        if (Array.isArray(data.attendance)) {
          for (const a of data.attendance) {
            await conn.query(
              `INSERT IGNORE INTO attendance (id, company_id, employee_id, date, status, check_in_time, check_out_time, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [a.id, a.companyId || 'comp_mgommon_01', a.employeeId, a.date, a.status || 'PRESENT', a.checkInTime || null, a.checkOutTime || null, JSON.stringify(a)]
            );
          }
        }

        // 6. Leaves
        if (Array.isArray(data.leaves)) {
          for (const l of data.leaves) {
            await conn.query(
              `INSERT IGNORE INTO leaves (id, company_id, employee_id, employee_name, type, start_date, end_date, reason, status, created_at, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [l.id, l.companyId || 'comp_mgommon_01', l.employeeId, l.employeeName || '', l.type || 'EARNED', l.startDate, l.endDate, l.reason || '', l.status || 'PENDING', l.createdAt || new Date().toISOString(), JSON.stringify(l)]
            );
          }
        }

        // 7. Advances
        if (Array.isArray(data.advances)) {
          for (const adv of data.advances) {
            await conn.query(
              `INSERT IGNORE INTO advances (id, company_id, employee_id, employee_name, amount, request_date, repay_month, reason, status, created_at, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [adv.id, adv.companyId || 'comp_mgommon_01', adv.employeeId, adv.employeeName || '', adv.amount || 0, adv.requestDate || '', adv.repayMonth || '', adv.reason || '', adv.status || 'PENDING', adv.createdAt || new Date().toISOString(), JSON.stringify(adv)]
            );
          }
        }

        // 8. BonusesPenalties
        if (Array.isArray(data.bonusesPenalties)) {
          for (const b of data.bonusesPenalties) {
            await conn.query(
              `INSERT IGNORE INTO bonuses_penalties (id, company_id, employee_id, type, amount, date, month, title, description, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [b.id, b.companyId || 'comp_mgommon_01', b.employeeId, b.type, b.amount || 0, b.date || '', b.month || '', b.title || '', b.description || '', JSON.stringify(b)]
            );
          }
        }

        // 9. Salaries
        if (Array.isArray(data.salaries)) {
          for (const s of data.salaries) {
            await conn.query(
              `INSERT IGNORE INTO salaries (id, company_id, employee_id, month, base_salary, gross_salary, net_salary, status, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [s.id, s.companyId || 'comp_mgommon_01', s.employeeId, s.month, s.baseSalary || 0, s.grossSalary || 0, s.netSalary || 0, s.status || 'CALCULATED', JSON.stringify(s)]
            );
          }
        }

        // 10. Audit Logs
        if (Array.isArray(data.auditLogs)) {
          for (const log of data.auditLogs) {
            await conn.query(
              `INSERT IGNORE INTO audit_logs (id, company_id, user_id, user_name, action, resource, details, timestamp, raw_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [log.id, log.companyId || 'comp_mgommon_01', log.userId || '', log.userName || '', log.action || '', log.resource || '', log.details || '', log.timestamp || '', JSON.stringify(log)]
            );
          }
        }

        await conn.commit();
        console.log('✅ [MySQL] Initial migration & seed committed successfully.');
      } catch (seedErr) {
        await conn.rollback();
        console.error('❌ [MySQL] Failed to complete initial seed, rolled back:', seedErr);
      } finally {
        conn.release();
      }
    } catch (e: any) {
      console.warn('⚠️ [MySQL] Seed check skipped:', e.message || e);
    }
  }

  /**
   * Generic Query Runner with automatic connection release & parameter binding
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.pool || !this.isConnected) {
      throw new Error('MySQL connection is not active');
    }
    const [rows] = await this.pool.query(sql, params);
    return rows as T[];
  }

  /**
   * Execute with Transaction
   */
  public async transaction<T>(work: (conn: PoolConnection) => Promise<T>): Promise<T> {
    if (!this.pool || !this.isConnected) {
      throw new Error('MySQL connection is not active');
    }
    const conn = await this.pool.getConnection();
    await conn.beginTransaction();
    try {
      const result = await work(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

export const mySqlDb = new MySqlDatabaseService();
