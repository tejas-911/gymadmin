
-- ============================================================
-- STEP 3: Fix Member_Workout (composite PK → surrogate PK)
-- ============================================================
CREATE INDEX idx_mw_member_fk ON Member_Workout(member_id);
ALTER TABLE Member_Workout DROP PRIMARY KEY;
ALTER TABLE Member_Workout ADD COLUMN assignment_id INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- ============================================================
-- STEP 4: Fix Member_Diet (composite PK → surrogate PK)
-- ============================================================
CREATE INDEX idx_md_member_fk ON Member_Diet(member_id);
ALTER TABLE Member_Diet DROP PRIMARY KEY;
ALTER TABLE Member_Diet ADD COLUMN assignment_id INT AUTO_INCREMENT PRIMARY KEY FIRST;

-- ============================================================
-- STEP 5: Supplement stock integrity
-- ============================================================
ALTER TABLE Supplement ADD CONSTRAINT chk_stock CHECK (stock_quantity >= 0);

DELIMITER $$
CREATE TRIGGER trg_decrement_stock
AFTER INSERT ON Supplement_Sale
FOR EACH ROW
BEGIN
    UPDATE Supplement
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE supplement_id = NEW.supplement_id;
END$$
DELIMITER ;

-- ============================================================
-- STEP 6: Add Admin table
-- ============================================================
CREATE TABLE IF NOT EXISTS Admin (
    admin_id   INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed one default admin
INSERT INTO Admin (name, email, password) VALUES (
    'Admin',
    'admin@gym.com',
    '$2a$10$tZ2yN7M7d32K0o0dF.ZlO.P936kHjQpX8qO8mH2g6E.E7oHtzN1Ua'
);
