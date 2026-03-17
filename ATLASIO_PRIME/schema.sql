-- ATLASIO PRIME DATABASE SCHEMA v1.0
CREATE TABLE users (id INT PRIMARY KEY, name TEXT, email TEXT, role TEXT, password_hash TEXT);
CREATE TABLE courses (id INT PRIMARY KEY, title TEXT, instructor_id INT, video_url TEXT);
CREATE TABLE results (id INT PRIMARY KEY, student_id INT, exam_id INT, score INT);
CREATE TABLE logs (id INT PRIMARY KEY, user_id INT, action TEXT, timestamp DATETIME);
