-- ========================================================
-- M.GAMMON Workshop Management System
-- Authoritative MySQL Relational Schema
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Company Settings (تنظیمات مرکزی کارگاه)
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` VARCHAR(64) NOT NULL,
  `company_name` VARCHAR(255) NOT NULL,
  `company_code` VARCHAR(64) NOT NULL,
  `owner_name` VARCHAR(255) DEFAULT NULL,
  `logo_url` TEXT DEFAULT NULL,
  `dashboard_banner_url` TEXT DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `phone_number` VARCHAR(64) DEFAULT NULL,
  `office_lat` DECIMAL(10, 7) DEFAULT 36.3766000,
  `office_lng` DECIMAL(10, 7) DEFAULT 59.5082000,
  `allowed_gps_radius_meters` INT DEFAULT 35,
  `workshops_json` LONGTEXT DEFAULT NULL,
  `sms_enabled` TINYINT(1) DEFAULT 0,
  `sms_provider` VARCHAR(64) DEFAULT 'MELIPAYAMAK',
  `sms_connection_mode` VARCHAR(64) DEFAULT 'legacy_rest',
  `sms_sender_number` VARCHAR(64) DEFAULT NULL,
  `sms_username` VARCHAR(128) DEFAULT NULL,
  `sms_password` TEXT DEFAULT NULL,
  `sms_api_key` TEXT DEFAULT NULL,
  `sms_new_api_endpoint` TEXT DEFAULT NULL,
  `sms_new_api_token` TEXT DEFAULT NULL,
  `sms_pattern_code` VARCHAR(64) DEFAULT NULL,
  `sms_last_connection_status` VARCHAR(64) DEFAULT 'UNKNOWN',
  `sms_last_balance` VARCHAR(128) DEFAULT NULL,
  `qr_refresh_interval_seconds` INT DEFAULT 30,
  `default_work_start_time` VARCHAR(16) DEFAULT '07:00',
  `default_work_end_time` VARCHAR(16) DEFAULT '16:00',
  `late_tolerance_minutes` INT DEFAULT 15,
  `annual_leave_days_quota` INT DEFAULT 26,
  `max_leave_requests_per_week` INT DEFAULT 1,
  `allow_multiple_pending_leaves` TINYINT(1) DEFAULT 0,
  `max_hourly_leave_hours_per_month` INT DEFAULT 16,
  `max_advance_requests_per_month` INT DEFAULT 1,
  `advance_window_start_day` INT DEFAULT 15,
  `advance_window_end_day` INT DEFAULT 20,
  `max_advance_salary_percent` INT DEFAULT 30,
  `work_days_per_month` INT DEFAULT 22,
  `daily_work_hours` DECIMAL(5, 2) DEFAULT 8.00,
  `overtime_rate_multiplier` DECIMAL(5, 2) DEFAULT 1.40,
  `insurance_rate_percent` DECIMAL(5, 2) DEFAULT 7.00,
  `tax_rate_percent` DECIMAL(5, 2) DEFAULT 10.00,
  `tax_exemption_threshold` BIGINT DEFAULT 14000000,
  `fixed_housing_allowance` BIGINT DEFAULT 900000,
  `fixed_grocery_allowance` BIGINT DEFAULT 1400000,
  `child_allowance` BIGINT DEFAULT 0,
  `job_categories_json` TEXT DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Shifts (شیفت‌های کاری)
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'MORNING',
  `start_time` VARCHAR(16) NOT NULL DEFAULT '07:00',
  `end_time` VARCHAR(16) NOT NULL DEFAULT '16:00',
  `thursday_end_time` VARCHAR(16) DEFAULT '13:00',
  `break_duration_minutes` INT DEFAULT 60,
  `work_days_json` VARCHAR(128) DEFAULT '[0,1,2,3,4,5]',
  `late_tolerance_minutes` INT DEFAULT 15,
  `early_exit_tolerance_minutes` INT DEFAULT 10,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_shift_comp` (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Users (کاربران سیستم و مدیران)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) DEFAULT NULL,
  `username` VARCHAR(128) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `password_salt` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(64) DEFAULT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'EMPLOYEE',
  `is_super_admin` TINYINT(1) DEFAULT 0,
  `workshop_id` VARCHAR(64) DEFAULT NULL,
  `permissions_json` TEXT DEFAULT NULL,
  `management_roles_json` TEXT DEFAULT NULL,
  `avatar_url` TEXT DEFAULT NULL,
  `is_hr_manager` TINYINT(1) DEFAULT 0,
  `is_finance_manager` TINYINT(1) DEFAULT 0,
  `raw_json` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  INDEX `idx_user_emp` (`employee_id`),
  INDEX `idx_user_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Employees (پرونده پرسنل)
CREATE TABLE IF NOT EXISTS `employees` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `personal_code` VARCHAR(64) NOT NULL,
  `first_name` VARCHAR(128) NOT NULL,
  `last_name` VARCHAR(128) NOT NULL,
  `national_code` VARCHAR(64) DEFAULT NULL,
  `phone` VARCHAR(64) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `department` VARCHAR(128) NOT NULL DEFAULT 'کارگاه',
  `position` VARCHAR(128) NOT NULL DEFAULT 'نیروی فنی',
  `workshop_id` VARCHAR(64) DEFAULT 'ws_1',
  `username` VARCHAR(128) DEFAULT NULL,
  `hire_date` VARCHAR(32) DEFAULT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  `shift_id` VARCHAR(64) DEFAULT 'shift_standard_day',
  `card_number` VARCHAR(32) DEFAULT NULL,
  `bank_account` VARCHAR(64) DEFAULT NULL,
  `sheba_number` VARCHAR(64) DEFAULT NULL,
  `base_salary` BIGINT NOT NULL DEFAULT 0,
  `hourly_rate` BIGINT DEFAULT 0,
  `overtime_rate` DECIMAL(5, 2) DEFAULT 1.40,
  `remaining_leave_days` INT DEFAULT 26,
  `is_confidential` TINYINT(1) DEFAULT 0,
  `allow_manual_attendance` TINYINT(1) DEFAULT 0,
  `is_hr_manager` TINYINT(1) DEFAULT 0,
  `is_finance_manager` TINYINT(1) DEFAULT 0,
  `housing_allowance` BIGINT DEFAULT NULL,
  `grocery_allowance` BIGINT DEFAULT NULL,
  `child_allowance` BIGINT DEFAULT NULL,
  `is_insurance_exempt` TINYINT(1) DEFAULT 0,
  `insurance_rate_percent` DECIMAL(5, 2) DEFAULT NULL,
  `is_tax_exempt` TINYINT(1) DEFAULT 0,
  `tax_rate_percent` DECIMAL(5, 2) DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_personal_code` (`personal_code`),
  INDEX `idx_emp_status` (`status`),
  INDEX `idx_emp_workshop` (`workshop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Attendance (سوابق تردد و حضور و غیاب)
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `date` VARCHAR(32) NOT NULL,
  `check_in_time` VARCHAR(16) DEFAULT NULL,
  `check_out_time` VARCHAR(16) DEFAULT NULL,
  `work_duration_minutes` INT DEFAULT 0,
  `late_minutes` INT DEFAULT 0,
  `early_exit_minutes` INT DEFAULT 0,
  `overtime_minutes` INT DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PRESENT',
  `check_in_method` VARCHAR(32) DEFAULT 'QR_CODE',
  `check_out_method` VARCHAR(32) DEFAULT NULL,
  `approval_status` VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
  `approved_by` VARCHAR(128) DEFAULT NULL,
  `approved_at` VARCHAR(64) DEFAULT NULL,
  `manual_reason` TEXT DEFAULT NULL,
  `is_mission` TINYINT(1) DEFAULT 0,
  `is_mission_start` TINYINT(1) DEFAULT 0,
  `mission_destination` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `verified_lat` DECIMAL(10, 7) DEFAULT NULL,
  `verified_lng` DECIMAL(10, 7) DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_att_emp_date` (`employee_id`, `date`),
  INDEX `idx_att_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Leaves (درخواست‌های مرخصی)
CREATE TABLE IF NOT EXISTS `leaves` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'EARNED',
  `start_date` VARCHAR(32) NOT NULL,
  `end_date` VARCHAR(32) NOT NULL,
  `start_time` VARCHAR(16) DEFAULT NULL,
  `end_time` VARCHAR(16) DEFAULT NULL,
  `duration_days` INT DEFAULT 1,
  `duration_hours` INT DEFAULT 0,
  `reason` TEXT DEFAULT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `created_at` VARCHAR(64) NOT NULL,
  `reviewed_by` VARCHAR(128) DEFAULT NULL,
  `reviewed_at` VARCHAR(64) DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_leaves_emp_status` (`employee_id`, `status`),
  INDEX `idx_leaves_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Advances (درخواست‌های مساعده حقوق)
CREATE TABLE IF NOT EXISTS `advances` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `amount` BIGINT NOT NULL,
  `request_date` VARCHAR(32) NOT NULL,
  `repay_month` VARCHAR(32) NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `created_at` VARCHAR(64) NOT NULL,
  `reviewed_by` VARCHAR(128) DEFAULT NULL,
  `reviewed_at` VARCHAR(64) DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_adv_emp_month` (`employee_id`, `repay_month`),
  INDEX `idx_adv_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Worker Personal Expenses (هزینه‌های انجام‌شده از کارت شخصی کارگر)
CREATE TABLE IF NOT EXISTS `worker_expenses` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `amount` BIGINT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `date` VARCHAR(32) NOT NULL,
  `receipt_url` TEXT DEFAULT NULL,
  `payer` VARCHAR(64) DEFAULT 'کارت شخصی کارگر',
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING_SETTLEMENT',
  `created_at` VARCHAR(64) NOT NULL,
  `settled_at` VARCHAR(64) DEFAULT NULL,
  `settled_by` VARCHAR(128) DEFAULT NULL,
  `settlement_notes` TEXT DEFAULT NULL,
  `settlement_type` VARCHAR(32) DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_exp_emp_status` (`employee_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Homework / Piecework Tasks (کار در منزل و کارمزدی)
CREATE TABLE IF NOT EXISTS `homework_tasks` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `task_type` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL,
  `unit` VARCHAR(64) DEFAULT 'عدد',
  `wage_per_unit` BIGINT NOT NULL,
  `total_wage` BIGINT NOT NULL,
  `date` VARCHAR(32) NOT NULL,
  `order_code` VARCHAR(128) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `receipt_url` TEXT DEFAULT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `settlement_type` VARCHAR(32) DEFAULT NULL,
  `settled_at` VARCHAR(64) DEFAULT NULL,
  `settled_by` VARCHAR(128) DEFAULT NULL,
  `reviewed_by` VARCHAR(128) DEFAULT NULL,
  `settlement_notes` TEXT DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_hw_emp_status` (`employee_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Miscellaneous Payments (پرداخت‌های متفرقه و علی‌الحساب)
CREATE TABLE IF NOT EXISTS `misc_payments` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `amount` BIGINT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `date` VARCHAR(32) NOT NULL,
  `month` VARCHAR(32) NOT NULL,
  `deduct_from_salary` TINYINT(1) DEFAULT 1,
  `notes` TEXT DEFAULT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `created_by` VARCHAR(128) DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_misc_emp_month` (`employee_id`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Work Missions (مأموریت‌های کاری)
CREATE TABLE IF NOT EXISTS `work_missions` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `employee_name` VARCHAR(255) NOT NULL,
  `date` VARCHAR(32) NOT NULL,
  `start_time` VARCHAR(16) NOT NULL,
  `end_time` VARCHAR(16) NOT NULL,
  `destination` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_within_working_hours` TINYINT(1) DEFAULT 1,
  `created_at` VARCHAR(64) NOT NULL,
  `created_by` VARCHAR(128) DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_msn_emp_date` (`employee_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bonuses & Penalties (پاداش‌ها، جریمه‌ها و مساعده خارج از چارچوب)
CREATE TABLE IF NOT EXISTS `bonuses_penalties` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `type` VARCHAR(32) NOT NULL,
  `amount` BIGINT NOT NULL,
  `date` VARCHAR(32) NOT NULL,
  `month` VARCHAR(32) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` VARCHAR(64) DEFAULT NULL,
  `created_by` VARCHAR(128) DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_bp_emp_month` (`employee_id`, `month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Salaries & Payroll Slips (فیش‌های حقوقی دوره‌ای با تضمین عدم تکرار)
CREATE TABLE IF NOT EXISTS `salaries` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `employee_id` VARCHAR(64) NOT NULL,
  `month` VARCHAR(32) NOT NULL,
  `base_salary` BIGINT NOT NULL,
  `work_days` INT NOT NULL DEFAULT 0,
  `worked_hours` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `overtime_hours` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `overtime_amount` BIGINT NOT NULL DEFAULT 0,
  `bonuses_total` BIGINT NOT NULL DEFAULT 0,
  `penalties_total` BIGINT NOT NULL DEFAULT 0,
  `advances_total` BIGINT NOT NULL DEFAULT 0,
  `discretionary_advances_total` BIGINT NOT NULL DEFAULT 0,
  `personal_card_expenses_total` BIGINT NOT NULL DEFAULT 0,
  `homework_wages_total` BIGINT NOT NULL DEFAULT 0,
  `misc_deductions_total` BIGINT NOT NULL DEFAULT 0,
  `insurance_deduction` BIGINT NOT NULL DEFAULT 0,
  `tax_deduction` BIGINT NOT NULL DEFAULT 0,
  `housing_allowance` BIGINT NOT NULL DEFAULT 0,
  `grocery_allowance` BIGINT NOT NULL DEFAULT 0,
  `child_allowance` BIGINT NOT NULL DEFAULT 0,
  `gross_salary` BIGINT NOT NULL DEFAULT 0,
  `net_salary` BIGINT NOT NULL DEFAULT 0,
  `status` VARCHAR(32) NOT NULL DEFAULT 'CALCULATED',
  `payment_date` VARCHAR(32) DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sal_emp_month` (`employee_id`, `month`),
  INDEX `idx_sal_month` (`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Audit Logs (لاگ‌های بازرسی و نظارت سیستم)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `user_name` VARCHAR(255) NOT NULL,
  `action` VARCHAR(128) NOT NULL,
  `resource` VARCHAR(128) NOT NULL,
  `details` TEXT NOT NULL,
  `timestamp` VARCHAR(64) NOT NULL,
  `ip_address` VARCHAR(64) DEFAULT '127.0.0.1',
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_log_user` (`user_id`),
  INDEX `idx_log_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Broadcast Messages (پیام‌ها و اعلانات کارگاهی)
CREATE TABLE IF NOT EXISTS `broadcast_messages` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `sender_name` VARCHAR(255) NOT NULL,
  `recipient_type` VARCHAR(32) NOT NULL DEFAULT 'ALL',
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `channel` VARCHAR(32) NOT NULL DEFAULT 'IN_APP',
  `sent_at` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'SENT',
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_msg_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Workshop Alarms (زنگ‌ها و هشدارهای صوتی شیفت کارگاه)
CREATE TABLE IF NOT EXISTS `workshop_alarms` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'RECURRING',
  `target_type` VARCHAR(32) NOT NULL DEFAULT 'ALL',
  `scheduled_date` VARCHAR(32) DEFAULT NULL,
  `scheduled_time` VARCHAR(16) DEFAULT '16:00',
  `ringtone` VARCHAR(32) NOT NULL DEFAULT 'BELL',
  `send_sms` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` VARCHAR(64) NOT NULL,
  `created_by` VARCHAR(128) NOT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Financial Reminders (یادآورهای مالی، چک‌ها، اقساط و فاکتورها)
CREATE TABLE IF NOT EXISTS `financial_reminders` (
  `id` VARCHAR(64) NOT NULL,
  `company_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `type` VARCHAR(32) NOT NULL DEFAULT 'INVOICE',
  `amount` BIGINT NOT NULL DEFAULT 0,
  `due_date` VARCHAR(32) NOT NULL,
  `debtor_creditor_name` VARCHAR(255) NOT NULL,
  `bank_name` VARCHAR(128) DEFAULT NULL,
  `check_number` VARCHAR(128) DEFAULT NULL,
  `installment_number` VARCHAR(128) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `priority` VARCHAR(32) NOT NULL DEFAULT 'NORMAL',
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `created_by_employee_id` VARCHAR(64) NOT NULL,
  `created_by_name` VARCHAR(128) NOT NULL,
  `created_at` VARCHAR(64) NOT NULL,
  `is_sent_to_senior_admin` TINYINT(1) DEFAULT 0,
  `sent_at` VARCHAR(64) DEFAULT NULL,
  `seen_by_senior_admin` TINYINT(1) DEFAULT 0,
  `seen_at` VARCHAR(64) DEFAULT NULL,
  `admin_feedback` TEXT DEFAULT NULL,
  `paid_at` VARCHAR(64) DEFAULT NULL,
  `raw_json` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_fin_status_due` (`status`, `due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
