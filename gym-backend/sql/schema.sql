CREATE DATABASE IF NOT EXISTS gym_db;
USE gym_db;

-- 1. Member
CREATE TABLE IF NOT EXISTS Member (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender ENUM('Male', 'Female', 'Other'),
    phone VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    date_of_birth DATE,
    join_date DATE,
    status ENUM('Active', 'Inactive') DEFAULT 'Active'
);

-- 2. Trainer
CREATE TABLE IF NOT EXISTS Trainer (
    trainer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    phone VARCHAR(15),
    salary DECIMAL(10,2),
    hire_date DATE
);

-- 3. Membership_Plan
CREATE TABLE IF NOT EXISTS Membership_Plan (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    duration_months INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    description TEXT
);

-- 4. Subscription
CREATE TABLE IF NOT EXISTS Subscription (
    subscription_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    plan_id INT,
    start_date DATE,
    end_date DATE,
    status ENUM('Active', 'Expired', 'Cancelled') DEFAULT 'Active',
    FOREIGN KEY (member_id) REFERENCES Member(member_id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES Membership_Plan(plan_id) ON DELETE CASCADE
);

-- 5. Payment
CREATE TABLE IF NOT EXISTS Payment (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('Cash', 'Card', 'UPI', 'Bank Transfer') NOT NULL,
    FOREIGN KEY (subscription_id) REFERENCES Subscription(subscription_id) ON DELETE CASCADE
);

-- 6. Attendance
CREATE TABLE IF NOT EXISTS Attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    check_in_time DATETIME NOT NULL,
    check_out_time DATETIME,
    FOREIGN KEY (member_id) REFERENCES Member(member_id) ON DELETE CASCADE
);

-- 7. Workout_Plan
CREATE TABLE IF NOT EXISTS Workout_Plan (
    workout_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    goal VARCHAR(100),
    difficulty_level ENUM('Beginner', 'Intermediate', 'Advanced'),
    duration_weeks INT
);

-- 8. Exercise
CREATE TABLE IF NOT EXISTS Exercise (
    exercise_id INT AUTO_INCREMENT PRIMARY KEY,
    exercise_name VARCHAR(100) NOT NULL,
    muscle_group VARCHAR(100),
    equipment_required VARCHAR(100)
);

-- 9. Workout_Exercise
CREATE TABLE IF NOT EXISTS Workout_Exercise (
    workout_id INT,
    exercise_id INT,
    sets INT NOT NULL,
    reps INT NOT NULL,
    rest_time INT, -- in seconds
    PRIMARY KEY (workout_id, exercise_id),
    FOREIGN KEY (workout_id) REFERENCES Workout_Plan(workout_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES Exercise(exercise_id) ON DELETE CASCADE
);

-- 10. Member_Workout
CREATE TABLE IF NOT EXISTS Member_Workout (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    workout_id INT,
    trainer_id INT,
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (member_id) REFERENCES Member(member_id) ON DELETE CASCADE,
    FOREIGN KEY (workout_id) REFERENCES Workout_Plan(workout_id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES Trainer(trainer_id) ON DELETE SET NULL
);

-- 11. Diet_Plan
CREATE TABLE IF NOT EXISTS Diet_Plan (
    diet_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL,
    goal VARCHAR(100),
    calories_per_day INT NOT NULL
);

-- 12. Member_Diet
CREATE TABLE IF NOT EXISTS Member_Diet (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    diet_id INT,
    trainer_id INT,
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (member_id) REFERENCES Member(member_id) ON DELETE CASCADE,
    FOREIGN KEY (diet_id) REFERENCES Diet_Plan(diet_id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES Trainer(trainer_id) ON DELETE SET NULL
);

-- 13. Equipment
CREATE TABLE IF NOT EXISTS Equipment (
    equipment_id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_name VARCHAR(100) NOT NULL,
    purchase_date DATE,
    condition_status ENUM('New', 'Good', 'Needs Repair', 'Out of Order') DEFAULT 'Good',
    location VARCHAR(100)
);

-- 14. Maintenance
CREATE TABLE IF NOT EXISTS Maintenance (
    maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id INT,
    maintenance_date DATE NOT NULL,
    description TEXT,
    cost DECIMAL(10,2),
    FOREIGN KEY (equipment_id) REFERENCES Equipment(equipment_id) ON DELETE CASCADE
);

-- 15. Supplement
CREATE TABLE IF NOT EXISTS Supplement (
    supplement_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    CONSTRAINT chk_stock CHECK (stock_quantity >= 0)
);

-- 16. Supplement_Sale
CREATE TABLE IF NOT EXISTS Supplement_Sale (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT,
    supplement_id INT,
    quantity INT NOT NULL,
    sale_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (member_id) REFERENCES Member(member_id) ON DELETE CASCADE,
    FOREIGN KEY (supplement_id) REFERENCES Supplement(supplement_id) ON DELETE CASCADE
);

-- 17. Class_Schedule
CREATE TABLE IF NOT EXISTS Class_Schedule (
    class_id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    trainer_id INT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    capacity INT DEFAULT 20,
    registered INT DEFAULT 0,
    color VARCHAR(30) DEFAULT 'lime',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_class_trainer FOREIGN KEY (trainer_id) REFERENCES Trainer(trainer_id) ON DELETE SET NULL
);

-- 18. Admin
CREATE TABLE IF NOT EXISTS Admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
