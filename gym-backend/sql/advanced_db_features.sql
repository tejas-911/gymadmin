-- ============================================================================
-- GYM MANAGEMENT SYSTEM — Advanced Database Features
-- Course  : CSS 2212 — DBS Lab Mini Project
-- Database: MySQL 8.x
-- ============================================================================

USE gym_db;


-- ============================================================================
-- SECTION A: DDL IMPROVEMENTS (ALTER TABLE)
-- Purpose : Extend existing tables without breaking current data or application
-- ============================================================================

-- A1. Audit log table — captures inserts, updates, deletes across critical tables
CREATE TABLE IF NOT EXISTS Audit_Log (
    log_id       INT AUTO_INCREMENT PRIMARY KEY,
    table_name   VARCHAR(50)  NOT NULL,
    action_type  ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    record_id    INT          NOT NULL,          -- PK of the affected row
    old_values   JSON,                           -- snapshot before change
    new_values   JSON,                           -- snapshot after change
    changed_by   VARCHAR(100) DEFAULT 'SYSTEM',
    changed_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- A2. Add a status column to Payment for tracking refunds / pending states
-- (Safe: uses a procedure to check if the column already exists before adding)
DROP PROCEDURE IF EXISTS _add_payment_status;
DELIMITER //
CREATE PROCEDURE _add_payment_status()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Payment' AND COLUMN_NAME = 'status'
    ) THEN
        ALTER TABLE Payment
            ADD COLUMN status ENUM('Paid','Pending','Refunded','Failed')
            DEFAULT 'Paid' AFTER payment_method;
    END IF;
END //
DELIMITER ;
CALL _add_payment_status();
DROP PROCEDURE _add_payment_status;

-- A3. Add indexes on frequently filtered columns for performance
-- (Safe: procedure checks if index exists before creating)
DROP PROCEDURE IF EXISTS _create_index_if_not_exists;
DELIMITER //
CREATE PROCEDURE _create_index_if_not_exists(
    IN idx_name VARCHAR(64), IN tbl_name VARCHAR(64), IN col_def VARCHAR(200)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl_name AND INDEX_NAME = idx_name
    ) THEN
        SET @sql = CONCAT('CREATE INDEX ', idx_name, ' ON ', tbl_name, '(', col_def, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

CALL _create_index_if_not_exists('idx_attendance_date',     'Attendance',     'date');
CALL _create_index_if_not_exists('idx_attendance_member',   'Attendance',     'member_id, date');
CALL _create_index_if_not_exists('idx_subscription_status', 'Subscription',   'status');
CALL _create_index_if_not_exists('idx_payment_date',        'Payment',        'payment_date');
CALL _create_index_if_not_exists('idx_class_schedule_date', 'class_schedule', 'scheduled_date');

DROP PROCEDURE _create_index_if_not_exists;


-- ============================================================================
-- SECTION B: VIEWS
-- ============================================================================

-- B1. Member Dashboard Summary View
-- Shows every member with their active plan, remaining days, and payment total
DROP VIEW IF EXISTS vw_member_dashboard;
CREATE VIEW vw_member_dashboard AS
SELECT
    m.member_id,
    m.name           AS member_name,
    m.gender,
    m.phone,
    m.email,
    m.status         AS member_status,
    m.join_date,
    -- Active subscription info (most recent)
    sub.subscription_id,
    mp.plan_name,
    mp.price         AS plan_price,
    sub.start_date   AS subscription_start,
    sub.end_date     AS subscription_end,
    sub.status       AS subscription_status,
    DATEDIFF(sub.end_date, CURDATE()) AS days_remaining,
    -- Lifetime payment total
    IFNULL(pay.total_paid, 0) AS total_paid,
    -- Total visits
    IFNULL(att.visit_count, 0) AS total_visits
FROM Member m
LEFT JOIN Subscription sub
    ON sub.subscription_id = (
        SELECT s2.subscription_id
        FROM Subscription s2
        WHERE s2.member_id = m.member_id
        ORDER BY s2.end_date DESC
        LIMIT 1
    )
LEFT JOIN Membership_Plan mp  ON sub.plan_id = mp.plan_id
LEFT JOIN (
    SELECT s.member_id, SUM(p.amount) AS total_paid
    FROM Subscription s
    JOIN Payment p ON p.subscription_id = s.subscription_id
    GROUP BY s.member_id
) pay ON pay.member_id = m.member_id
LEFT JOIN (
    SELECT member_id, COUNT(*) AS visit_count
    FROM Attendance
    GROUP BY member_id
) att ON att.member_id = m.member_id;

-- Usage: SELECT * FROM vw_member_dashboard WHERE member_status = 'Active';


-- B2. Revenue Report View (Monthly)
-- Aggregates revenue by month, plan, and payment method
DROP VIEW IF EXISTS vw_monthly_revenue;
CREATE VIEW vw_monthly_revenue AS
SELECT
    DATE_FORMAT(p.payment_date, '%Y-%m')  AS payment_month,
    mp.plan_name,
    p.payment_method,
    COUNT(*)                              AS transaction_count,
    SUM(p.amount)                         AS total_revenue,
    AVG(p.amount)                         AS avg_transaction
FROM Payment p
JOIN Subscription s   ON p.subscription_id = s.subscription_id
JOIN Membership_Plan mp ON s.plan_id = mp.plan_id
GROUP BY payment_month, mp.plan_name, p.payment_method;

-- Usage: SELECT * FROM vw_monthly_revenue ORDER BY payment_month DESC;


-- B3. Daily Attendance Report View
-- Shows today's gym traffic with session durations
DROP VIEW IF EXISTS vw_daily_attendance;
CREATE VIEW vw_daily_attendance AS
SELECT
    a.attendance_id,
    m.member_id,
    m.name          AS member_name,
    m.status        AS member_status,
    a.check_in_time,
    a.check_out_time,
    DATE(a.check_in_time)   AS date,
    TIMESTAMPDIFF(MINUTE, a.check_in_time,
        IFNULL(a.check_out_time, NOW()))    AS session_minutes,
    CASE
        WHEN a.check_out_time IS NULL THEN 'Inside Now'
        ELSE 'Completed'
    END AS visit_status
FROM Attendance a
JOIN Member m ON a.member_id = m.member_id;

-- Usage: SELECT * FROM vw_daily_attendance WHERE date = CURDATE();


-- B4. Equipment Maintenance Overview
-- Joins equipment with its latest maintenance and flags overdue items
DROP VIEW IF EXISTS vw_equipment_health;
CREATE VIEW vw_equipment_health AS
SELECT
    e.equipment_id,
    e.equipment_name,
    e.condition_status,
    e.location,
    e.purchase_date,
    latest.last_service_date,
    latest.last_service_cost,
    DATEDIFF(CURDATE(), latest.last_service_date) AS days_since_service,
    CASE
        WHEN DATEDIFF(CURDATE(), latest.last_service_date) > 180 THEN 'Overdue'
        WHEN DATEDIFF(CURDATE(), latest.last_service_date) > 90  THEN 'Due Soon'
        ELSE 'OK'
    END AS maintenance_flag
FROM Equipment e
LEFT JOIN (
    SELECT
        equipment_id,
        MAX(maintenance_date) AS last_service_date,
        (SELECT cost FROM Maintenance m2
         WHERE m2.equipment_id = m1.equipment_id
         ORDER BY maintenance_date DESC LIMIT 1) AS last_service_cost
    FROM Maintenance m1
    GROUP BY equipment_id
) latest ON latest.equipment_id = e.equipment_id;

-- Usage: SELECT * FROM vw_equipment_health WHERE maintenance_flag = 'Overdue';


-- ============================================================================
-- SECTION C: STORED PROCEDURES
-- ============================================================================

-- C1. sp_register_member — Inserts a new member with validation
-- Validates: name not empty, email unique, valid gender
DROP PROCEDURE IF EXISTS sp_register_member;
DELIMITER //
CREATE PROCEDURE sp_register_member(
    IN  p_name          VARCHAR(100),
    IN  p_gender        VARCHAR(10),
    IN  p_phone         VARCHAR(15),
    IN  p_email         VARCHAR(100),
    IN  p_date_of_birth DATE,
    OUT p_new_id        INT,
    OUT p_message       VARCHAR(255)
)
BEGIN
    DECLARE v_email_count INT DEFAULT 0;

    -- Validate: Name must not be empty
    IF p_name IS NULL OR TRIM(p_name) = '' THEN
        SET p_new_id  = -1;
        SET p_message = 'ERROR: Member name cannot be empty.';
    -- Validate: Gender must be valid ENUM value
    ELSEIF p_gender NOT IN ('Male', 'Female', 'Other') THEN
        SET p_new_id  = -1;
        SET p_message = 'ERROR: Gender must be Male, Female, or Other.';
    ELSE
        -- Validate: Email must be unique
        SELECT COUNT(*) INTO v_email_count
        FROM Member WHERE email = p_email;

        IF v_email_count > 0 THEN
            SET p_new_id  = -1;
            SET p_message = 'ERROR: A member with this email already exists.';
        ELSE
            INSERT INTO Member (name, gender, phone, email, date_of_birth, join_date, status)
            VALUES (p_name, p_gender, p_phone, p_email, p_date_of_birth, CURDATE(), 'Active');

            SET p_new_id  = LAST_INSERT_ID();
            SET p_message = CONCAT('SUCCESS: Member "', p_name, '" registered with ID ', p_new_id);
        END IF;
    END IF;
END //
DELIMITER ;

-- Usage:
-- CALL sp_register_member('Rahul Sharma', 'Male', '9876543210',
--      'rahul@gym.com', '1998-03-15', @id, @msg);
-- SELECT @id AS member_id, @msg AS result;


-- C2. sp_renew_subscription — Renews or creates a subscription + payment
DROP PROCEDURE IF EXISTS sp_renew_subscription;
DELIMITER //
CREATE PROCEDURE sp_renew_subscription(
    IN  p_member_id      INT,
    IN  p_plan_id        INT,
    IN  p_payment_method VARCHAR(20),
    OUT p_sub_id         INT,
    OUT p_message        VARCHAR(255)
)
BEGIN
    DECLARE v_plan_price    DECIMAL(10,2);
    DECLARE v_plan_months   INT;
    DECLARE v_start         DATE;
    DECLARE v_end           DATE;
    DECLARE v_member_exists INT DEFAULT 0;
    DECLARE v_plan_exists   INT DEFAULT 0;

    -- Validate member exists
    SELECT COUNT(*) INTO v_member_exists FROM Member WHERE member_id = p_member_id;
    IF v_member_exists = 0 THEN
        SET p_sub_id = -1;
        SET p_message = 'ERROR: Member not found.';
    ELSE
        -- Validate plan exists
        SELECT COUNT(*) INTO v_plan_exists FROM Membership_Plan WHERE plan_id = p_plan_id;
        IF v_plan_exists = 0 THEN
            SET p_sub_id = -1;
            SET p_message = 'ERROR: Membership plan not found.';
        ELSE
            -- Expire any currently active subscription for this member
            UPDATE Subscription SET status = 'Expired'
            WHERE member_id = p_member_id AND status = 'Active';

            -- Get plan details
            SELECT price, duration_months INTO v_plan_price, v_plan_months
            FROM Membership_Plan WHERE plan_id = p_plan_id;

            SET v_start = CURDATE();
            SET v_end   = DATE_ADD(v_start, INTERVAL v_plan_months MONTH);

            -- Create new subscription
            INSERT INTO Subscription (member_id, plan_id, start_date, end_date, status)
            VALUES (p_member_id, p_plan_id, v_start, v_end, 'Active');

            SET p_sub_id = LAST_INSERT_ID();

            -- Record payment
            INSERT INTO Payment (subscription_id, amount, payment_date, payment_method)
            VALUES (p_sub_id, v_plan_price, CURDATE(), p_payment_method);

            -- Reactivate member if inactive
            UPDATE Member SET status = 'Active' WHERE member_id = p_member_id;

            SET p_message = CONCAT('SUCCESS: Subscription renewed until ', v_end,
                                   '. Payment of ₹', v_plan_price, ' recorded.');
        END IF;
    END IF;
END //
DELIMITER ;

-- Usage:
-- CALL sp_renew_subscription(2, 3, 'UPI', @sid, @msg);
-- SELECT @sid AS subscription_id, @msg AS result;


-- C3. sp_gym_performance_report — Generates a multi-metric report
DROP PROCEDURE IF EXISTS sp_gym_performance_report;
DELIMITER //
CREATE PROCEDURE sp_gym_performance_report(
    IN p_report_month INT,    -- month number (1–12)
    IN p_report_year  INT     -- e.g. 2023
)
BEGIN
    -- 1. Membership summary
    SELECT 'MEMBERSHIP SUMMARY' AS report_section;
    SELECT
        COUNT(*)                                                        AS total_members,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END)             AS active_members,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END)           AS inactive_members,
        SUM(CASE WHEN MONTH(join_date) = p_report_month
                  AND YEAR(join_date) = p_report_year THEN 1 ELSE 0 END) AS new_this_month
    FROM Member;

    -- 2. Revenue summary
    SELECT 'REVENUE SUMMARY' AS report_section;
    SELECT
        COUNT(*)              AS total_transactions,
        SUM(amount)           AS total_revenue,
        AVG(amount)           AS avg_transaction,
        MAX(amount)           AS highest_payment,
        payment_method,
        COUNT(*) AS count_by_method
    FROM Payment
    WHERE MONTH(payment_date) = p_report_month
      AND YEAR(payment_date) = p_report_year
    GROUP BY payment_method;

    -- 3. Attendance summary
    SELECT 'ATTENDANCE SUMMARY' AS report_section;
    SELECT
        COUNT(DISTINCT member_id)       AS unique_visitors,
        COUNT(*)                        AS total_check_ins,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, check_in_time,
            IFNULL(check_out_time, check_in_time))), 0) AS avg_session_minutes
    FROM Attendance
    WHERE MONTH(date) = p_report_month
      AND YEAR(date) = p_report_year;

    -- 4. Top 5 most active members
    SELECT 'TOP 5 ACTIVE MEMBERS' AS report_section;
    SELECT m.member_id, m.name, COUNT(*) AS visits
    FROM Attendance a
    JOIN Member m ON a.member_id = m.member_id
    WHERE MONTH(a.date) = p_report_month
      AND YEAR(a.date) = p_report_year
    GROUP BY m.member_id, m.name
    ORDER BY visits DESC
    LIMIT 5;

    -- 5. Equipment needing attention
    SELECT 'EQUIPMENT ALERTS' AS report_section;
    SELECT equipment_id, equipment_name, condition_status, location
    FROM Equipment
    WHERE condition_status IN ('Needs Repair', 'Out of Order');
END //
DELIMITER ;

-- Usage:
-- CALL sp_gym_performance_report(1, 2023);


-- ============================================================================
-- SECTION D: FUNCTIONS
-- ============================================================================

-- D1. fn_member_age — Calculates a member's current age from date_of_birth
DROP FUNCTION IF EXISTS fn_member_age;
DELIMITER //
CREATE FUNCTION fn_member_age(p_member_id INT)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_dob DATE;

    SELECT date_of_birth INTO v_dob
    FROM Member WHERE member_id = p_member_id;

    IF v_dob IS NULL THEN
        RETURN NULL;
    END IF;

    -- Accurate age considering whether birthday has occurred this year
    RETURN TIMESTAMPDIFF(YEAR, v_dob, CURDATE());
END //
DELIMITER ;

-- Usage: SELECT fn_member_age(1) AS age;
-- Usage in query: SELECT name, fn_member_age(member_id) AS age FROM Member;


-- D2. fn_subscription_status_label — Returns a human-readable subscription
--     status with days remaining or days since expiry
DROP FUNCTION IF EXISTS fn_subscription_status_label;
DELIMITER //
CREATE FUNCTION fn_subscription_status_label(p_member_id INT)
RETURNS VARCHAR(100)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_end_date DATE;
    DECLARE v_status   VARCHAR(20);
    DECLARE v_diff     INT;

    SELECT end_date, status INTO v_end_date, v_status
    FROM Subscription
    WHERE member_id = p_member_id
    ORDER BY end_date DESC
    LIMIT 1;

    IF v_end_date IS NULL THEN
        RETURN 'No Subscription';
    END IF;

    SET v_diff = DATEDIFF(v_end_date, CURDATE());

    IF v_status = 'Cancelled' THEN
        RETURN 'Cancelled';
    ELSEIF v_diff < 0 THEN
        RETURN CONCAT('Expired ', ABS(v_diff), ' days ago');
    ELSEIF v_diff <= 7 THEN
        RETURN CONCAT('Expiring in ', v_diff, ' days — RENEW NOW');
    ELSE
        RETURN CONCAT('Active — ', v_diff, ' days remaining');
    END IF;
END //
DELIMITER ;

-- Usage: SELECT name, fn_subscription_status_label(member_id) AS sub_status FROM Member;


-- D3. fn_total_revenue_by_member — Returns lifetime revenue from a member
DROP FUNCTION IF EXISTS fn_total_revenue_by_member;
DELIMITER //
CREATE FUNCTION fn_total_revenue_by_member(p_member_id INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0.00;

    SELECT IFNULL(SUM(p.amount), 0.00) INTO v_total
    FROM Payment p
    JOIN Subscription s ON p.subscription_id = s.subscription_id
    WHERE s.member_id = p_member_id;

    RETURN v_total;
END //
DELIMITER ;

-- Usage: SELECT fn_total_revenue_by_member(1) AS lifetime_revenue;


-- ============================================================================
-- SECTION E: TRIGGERS
-- ============================================================================

-- E1. BEFORE INSERT on Attendance — Validates member is Active before check-in
DROP TRIGGER IF EXISTS trg_attendance_validate_member;
DELIMITER //
CREATE TRIGGER trg_attendance_validate_member
BEFORE INSERT ON Attendance
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(10);

    SELECT status INTO v_status
    FROM Member WHERE member_id = NEW.member_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot check in: Member does not exist.';
    ELSEIF v_status = 'Inactive' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot check in: Member is Inactive. Renew subscription first.';
    END IF;
END //
DELIMITER ;

-- Test: INSERT INTO Attendance (member_id, check_in_time, date)
--       VALUES (3, NOW(), CURDATE());
-- Expected: Error because member 3 is Inactive


-- E2. AFTER INSERT on Payment — Audit log trigger
DROP TRIGGER IF EXISTS trg_payment_audit_log;
DELIMITER //
CREATE TRIGGER trg_payment_audit_log
AFTER INSERT ON Payment
FOR EACH ROW
BEGIN
    INSERT INTO Audit_Log (table_name, action_type, record_id, new_values)
    VALUES (
        'Payment',
        'INSERT',
        NEW.payment_id,
        JSON_OBJECT(
            'subscription_id', NEW.subscription_id,
            'amount',          NEW.amount,
            'payment_date',    NEW.payment_date,
            'payment_method',  NEW.payment_method
        )
    );
END //
DELIMITER ;


-- E3. AFTER INSERT on Supplement_Sale — Auto-decrement stock
--     Raises error if stock is insufficient
DROP TRIGGER IF EXISTS trg_supplement_stock_update;
DELIMITER //
CREATE TRIGGER trg_supplement_stock_update
AFTER INSERT ON Supplement_Sale
FOR EACH ROW
BEGIN
    DECLARE v_stock INT;

    SELECT stock_quantity INTO v_stock
    FROM Supplement WHERE supplement_id = NEW.supplement_id;

    IF v_stock < NEW.quantity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient stock for this supplement.';
    ELSE
        UPDATE Supplement
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE supplement_id = NEW.supplement_id;
    END IF;
END //
DELIMITER ;


-- E4. BEFORE INSERT on Subscription — Auto-expire overlapping subscriptions
DROP TRIGGER IF EXISTS trg_subscription_auto_expire;
DELIMITER //
CREATE TRIGGER trg_subscription_auto_expire
BEFORE INSERT ON Subscription
FOR EACH ROW
BEGIN
    -- Expire any existing active subscription for this member
    UPDATE Subscription
    SET status = 'Expired'
    WHERE member_id = NEW.member_id
      AND status = 'Active'
      AND end_date >= CURDATE();
END //
DELIMITER ;


-- E5. AFTER UPDATE on Member — Audit log for member status changes
DROP TRIGGER IF EXISTS trg_member_status_audit;
DELIMITER //
CREATE TRIGGER trg_member_status_audit
AFTER UPDATE ON Member
FOR EACH ROW
BEGIN
    IF OLD.status <> NEW.status THEN
        INSERT INTO Audit_Log (table_name, action_type, record_id, old_values, new_values)
        VALUES (
            'Member',
            'UPDATE',
            NEW.member_id,
            JSON_OBJECT('status', OLD.status, 'name', OLD.name),
            JSON_OBJECT('status', NEW.status, 'name', NEW.name)
        );
    END IF;
END //
DELIMITER ;


-- ============================================================================
-- QUICK VERIFICATION QUERIES
-- Run these after executing the above to verify everything works
-- ============================================================================

-- Test View B1
-- SELECT * FROM vw_member_dashboard;

-- Test View B2
-- SELECT * FROM vw_monthly_revenue;

-- Test View B3
-- SELECT * FROM vw_daily_attendance WHERE date = CURDATE();

-- Test Function D1
-- SELECT m.name, fn_member_age(m.member_id) AS age FROM Member m;

-- Test Function D2
-- SELECT m.name, fn_subscription_status_label(m.member_id) AS status FROM Member m;

-- Test Function D3
-- SELECT m.name, fn_total_revenue_by_member(m.member_id) AS revenue FROM Member m;

-- Test Procedure C1
-- CALL sp_register_member('Test User', 'Male', '1111111111', 'test@gym.com', '2000-01-01', @id, @msg);
-- SELECT @id, @msg;

-- Test Procedure C2
-- CALL sp_renew_subscription(2, 3, 'UPI', @sid, @msg);
-- SELECT @sid, @msg;

-- Test Procedure C3
-- CALL sp_gym_performance_report(1, 2023);
