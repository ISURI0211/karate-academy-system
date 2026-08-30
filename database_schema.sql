-- ============================================================================
-- SMART KARATE TRAINING AND ACADEMY MANAGEMENT SYSTEM DATABASE SCHEMA
-- Target DBMS: MySQL 8.0+
-- File: database_schema.sql
-- Description: Core database structures, relationships, integrity rules, 
--              and sample initial seed data for user management, student profiles,
--              schedules, attendance, progress, grading, fee tracking, 
--              events, notifications, and training resources.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS karate_academy_db;
USE karate_academy_db;

-- ----------------------------------------------------------------------------
-- Drop tables in reverse order of foreign key dependency
-- ----------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS resources;
DROP TABLE IF EXISTS event_participants;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS fees;
DROP TABLE IF EXISTS performance_evaluations;
DROP TABLE IF EXISTS grading_registrations;
DROP TABLE IF EXISTS grading_exams;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS class_enrollments;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS instructor_schedules;
DROP TABLE IF EXISTS instructors;
DROP TABLE IF EXISTS student_training_history;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. USER MANAGEMENT
-- ----------------------------------------------------------------------------

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'instructor', 'student') NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reset_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. STUDENT & INSTRUCTOR PROFILES
-- ----------------------------------------------------------------------------

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NULL,
    dob DATE NOT NULL,
    address VARCHAR(255) NULL,
    belt_rank ENUM(
        'White', 'Yellow', 'Orange', 'Green', 'Blue', 
        'Purple', 'Brown (3rd Kyu)', 'Brown (2nd Kyu)', 'Brown (1st Kyu)', 
        'Black (1st Dan)', 'Black (2nd Dan)', 'Black (3rd Dan)'
    ) DEFAULT 'White',
    enrollment_status ENUM('active', 'suspended', 'graduated', 'inactive') DEFAULT 'active',
    joining_date DATE NOT NULL,
    emergency_contact_name VARCHAR(100) NULL,
    emergency_contact_phone VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student_belt (belt_rank),
    INDEX idx_student_status (enrollment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_training_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- e.g., 'Enrolled', 'Belt Upgrade', 'Suspension', 'Status Update'
    details TEXT NULL,
    action_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_history_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE instructors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NULL,
    qualifications TEXT NULL, -- e.g., '5th Dan Black Belt, 10 Years Coaching Experience'
    joining_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE instructor_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE,
    CONSTRAINT chk_schedule_time CHECK (start_time < end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. CLASSES, SCHEDULING, AND ENROLLMENT
-- ----------------------------------------------------------------------------

CREATE TABLE classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    class_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(100) NOT NULL, -- e.g., 'Dojo A', 'Dojo B'
    capacity INT NOT NULL,
    instructor_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT,
    CONSTRAINT chk_class_time CHECK (start_time < end_time),
    CONSTRAINT chk_class_capacity CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE class_enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('enrolled', 'cancelled', 'completed') DEFAULT 'enrolled',
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT uq_class_student UNIQUE (class_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. ATTENDANCE MANAGEMENT
-- ----------------------------------------------------------------------------

CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'excused') NOT NULL,
    marked_by INT NOT NULL, -- user_id of the instructor/admin marking it
    marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_attendance_day UNIQUE (class_id, student_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. BELT PROGRESSION AND GRADING
-- ----------------------------------------------------------------------------

CREATE TABLE grading_exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    exam_date DATE NOT NULL,
    examiner_id INT NOT NULL,
    fee DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (examiner_id) REFERENCES instructors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE grading_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    target_belt ENUM(
        'White', 'Yellow', 'Orange', 'Green', 'Blue', 
        'Purple', 'Brown (3rd Kyu)', 'Brown (2nd Kyu)', 'Brown (1st Kyu)', 
        'Black (1st Dan)', 'Black (2nd Dan)', 'Black (3rd Dan)'
    ) NOT NULL,
    eligibility_status ENUM('eligible', 'ineligible') DEFAULT 'eligible',
    exam_result ENUM('pending', 'pass', 'fail') DEFAULT 'pending',
    score INT NULL CHECK (score BETWEEN 0 AND 100),
    examiner_feedback TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES grading_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT uq_exam_student UNIQUE (exam_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trigger logic description: Application layer handles updating students.belt_rank 
-- upon transition of grading_registrations.exam_result to 'pass'.

-- ----------------------------------------------------------------------------
-- 6. PERFORMANCE TRACKING
-- ----------------------------------------------------------------------------

CREATE TABLE performance_evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    instructor_id INT NOT NULL,
    evaluation_date DATE NOT NULL,
    fitness_score INT NOT NULL CHECK (fitness_score BETWEEN 1 AND 10),
    technique_score INT NOT NULL CHECK (technique_score BETWEEN 1 AND 10),
    spar_score INT NOT NULL CHECK (spar_score BETWEEN 1 AND 10),
    discipline_score INT NOT NULL CHECK (discipline_score BETWEEN 1 AND 10),
    general_feedback TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. FEE MANAGEMENT
-- ----------------------------------------------------------------------------

CREATE TABLE fees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    billing_month DATE NOT NULL, -- Stored as YYYY-MM-01 representing the month
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('paid', 'unpaid', 'overdue') DEFAULT 'unpaid',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT uq_student_month UNIQUE (student_id, billing_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fee_id INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_method ENUM('cash', 'card', 'bank_transfer', 'online') NOT NULL,
    transaction_reference VARCHAR(100) NULL,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. NOTIFICATIONS
-- ----------------------------------------------------------------------------

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('class_reminder', 'grading_exam', 'announcement') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notification_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. EVENTS AND COMPETITIONS
-- ----------------------------------------------------------------------------

CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    event_date DATE NOT NULL,
    location VARCHAR(150) NOT NULL,
    event_type ENUM('competition', 'seminar', 'social') NOT NULL,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE event_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    student_id INT NOT NULL,
    role ENUM('competitor', 'spectator', 'volunteer') DEFAULT 'competitor',
    result_details VARCHAR(255) NULL, -- e.g., 'Gold Medal', 'Quarter Finals', or 'N/A'
    score INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT uq_event_student UNIQUE (event_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. TRAINING RESOURCES
-- ----------------------------------------------------------------------------

CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    resource_type ENUM('video', 'document', 'link') NOT NULL,
    file_url VARCHAR(255) NOT NULL,
    uploaded_by INT NOT NULL, -- instructor user ID
    class_id INT NULL, -- Target class if context-specific
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

-- Seed Users (Passwords hashed typically, e.g., bcrypt for '$2b$10$...' mock representation here)
INSERT INTO users (id, username, email, password_hash, role, status) VALUES
(1, 'admin', 'admin@karateacademy.com', '$2b$10$abcdefghijklmnopqrstuv', 'admin', 'active'),
(2, 'sensei_john', 'john.doe@karateacademy.com', '$2b$10$abcdefghijklmnopqrstuv', 'instructor', 'active'),
(3, 'sensei_jane', 'jane.smith@karateacademy.com', '$2b$10$abcdefghijklmnopqrstuv', 'instructor', 'active'),
(4, 'student_li', 'bruce.li@student.com', '$2b$10$abcdefghijklmnopqrstuv', 'student', 'active'),
(5, 'student_sarah', 'sarah.connor@student.com', '$2b$10$abcdefghijklmnopqrstuv', 'student', 'active');

-- Seed Instructors
INSERT INTO instructors (id, user_id, first_name, last_name, phone, qualifications, joining_date) VALUES
(1, 2, 'John', 'Doe', '+1234567890', '5th Dan Shotokan Black Belt, 15 Years Dojo Experience', '2020-01-15'),
(2, 3, 'Jane', 'Smith', '+1987654321', '4th Dan Kyokushin Black Belt, Certified Youth Trainer', '2021-06-01');

-- Seed Instructor Schedules
INSERT INTO instructor_schedules (instructor_id, day_of_week, start_time, end_time) VALUES
(1, 'Monday', '16:00:00', '18:00:00'),
(1, 'Wednesday', '16:00:00', '18:00:00'),
(2, 'Tuesday', '17:00:00', '19:00:00'),
(2, 'Thursday', '17:00:00', '19:00:00');

-- Seed Students
INSERT INTO students (id, user_id, first_name, last_name, phone, dob, address, belt_rank, enrollment_status, joining_date, emergency_contact_name, emergency_contact_phone) VALUES
(1, 4, 'Bruce', 'Li', '+1112223333', '2005-11-27', '123 Dragon Alley, NY', 'Green', 'active', '2023-01-10', 'Grace Li', '+1112223330'),
(2, 5, 'Sarah', 'Connor', '+4445556666', '2008-04-12', '742 Evergreen Terr, NY', 'White', 'active', '2024-03-01', 'John Connor', '+4445556660');

-- Seed Student Training History
INSERT INTO student_training_history (student_id, action_type, details, action_date) VALUES
(1, 'Enrolled', 'Joined karate academy as a White belt.', '2023-01-10'),
(1, 'Belt Upgrade', 'Passed grading from White to Yellow.', '2023-06-15'),
(1, 'Belt Upgrade', 'Passed grading from Yellow to Orange.', '2023-12-10'),
(1, 'Belt Upgrade', 'Passed grading from Orange to Green.', '2024-05-20'),
(2, 'Enrolled', 'Joined karate academy as a White belt.', '2024-03-01');

-- Seed Classes
INSERT INTO classes (id, name, description, class_date, start_time, end_time, location, capacity, instructor_id) VALUES
(1, 'Beginner Kata & Stances', 'Introduction to base blocks and stances.', '2026-06-25', '16:00:00', '17:30:00', 'Dojo A', 20, 1),
(2, 'Advanced Kumite Sparring', 'Tactics and technical applications for tournament sparring.', '2026-06-26', '17:00:00', '18:30:00', 'Dojo B', 15, 2);

-- Seed Class Enrollments
INSERT INTO class_enrollments (class_id, student_id, status) VALUES
(1, 2, 'enrolled'), -- Sarah in Beginners Class
(2, 1, 'enrolled'); -- Bruce in Advanced Kumite

-- Seed Attendance Records
INSERT INTO attendance (class_id, student_id, attendance_date, status, marked_by) VALUES
(1, 2, '2026-06-25', 'present', 2);

-- Seed Grading Exams
INSERT INTO grading_exams (id, name, description, exam_date, examiner_id, fee) VALUES
(1, 'Summer Rank Promotion Exam', 'Quarterly grading exam for belts White through Blue.', '2026-07-15', 1, 50.00);

-- Seed Grading Registrations
INSERT INTO grading_registrations (exam_id, student_id, target_belt, eligibility_status, exam_result) VALUES
(1, 2, 'Yellow', 'eligible', 'pending');

-- Seed Performance Evaluations
INSERT INTO performance_evaluations (student_id, instructor_id, evaluation_date, fitness_score, technique_score, spar_score, discipline_score, general_feedback) VALUES
(1, 2, '2026-06-20', 8, 9, 8, 9, 'Excellent focus during sparring. Kick height and form have improved noticeably.');

-- Seed Fees
INSERT INTO fees (id, student_id, billing_month, amount, due_date, status) VALUES
(1, 1, '2026-06-01', 80.00, '2026-06-15', 'paid'),
(2, 2, '2026-06-01', 80.00, '2026-06-15', 'overdue');

-- Seed Payments
INSERT INTO payments (fee_id, amount_paid, payment_method, receipt_number) VALUES
(1, 80.00, 'online', 'REC-2026-0001');

-- Seed Notifications
INSERT INTO notifications (user_id, type, title, message) VALUES
(5, 'class_reminder', 'Upcoming Class: Beginner Kata', 'Friendly reminder that your Beginner Kata & Stances class starts tomorrow at 16:00.');

-- Seed Events
INSERT INTO events (id, name, description, event_date, location, event_type, status) VALUES
(1, 'Tri-State Karate Open Championship', 'Regional kata and kumite tournament.', '2026-08-20', 'City Arena', 'competition', 'upcoming');

-- Seed Event Participants
INSERT INTO event_participants (event_id, student_id, role) VALUES
(1, 1, 'competitor');

-- Seed Resources
INSERT INTO resources (title, description, resource_type, file_url, uploaded_by) VALUES
(1, 'Heian Shodan Kata Video Tutorial', 'Video breakdown of the first shotokan kata.', 'video', 'https://karatecdn.com/videos/heian-shodan.mp4', 2);
