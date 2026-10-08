-- Database initialization for Inventory System
CREATE DATABASE IF NOT EXISTS inventory_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventory_db;

-- 1. Bảng sản phẩm chính phục vụ chức năng CRUD
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dữ liệu mẫu ban đầu cho sản phẩm
INSERT INTO products (name, category, price, stock, description) VALUES
('Dell XPS 15 Laptop', 'Electronics', 1899.99, 15, 'High performance laptop with 4K OLED display and Intel i7'),
('Logitech MX Master 3S', 'Accessories', 99.99, 45, 'Ergonomic wireless mouse with ultra-quiet clicks'),
('Keychron Q1 Pro Keyboard', 'Accessories', 199.50, 30, 'Custom mechanical wireless keyboard with QMK/VIA support'),
('Sony WH-1000XM5 Headphones', 'Electronics', 349.99, 20, 'Industry leading noise canceling wireless headphones'),
('LG UltraFine 27" 4K Monitor', 'Electronics', 499.00, 12, 'IPS panel with 99% DCI-P3 color gamut for creatives'),
('Herman Miller Aeron Chair', 'Furniture', 1250.00, 8, 'Ergonomic office chair designed for all-day comfort'),
('Standing Desk Pro', 'Furniture', 450.00, 14, 'Dual-motor electric height adjustable standing desk'),
('Anker 737 Power Bank', 'Accessories', 149.99, 50, '24000mAh 140W fast portable charger with smart display'),
('Kindle Paperwhite 16GB', 'Electronics', 139.99, 25, 'Glare-free 6.8 inch display with adjustable warm light'),
('Stainless Steel Coffee Tumbler', 'Kitchenware', 29.99, 80, 'Vacuum insulated 20oz travel mug keeps coffee hot for 8 hours');

-- 2. Bảng theo dõi duy nhất 1 câu truy vấn gần nhất (tối ưu hóa tài nguyên: duy trì đúng 1 dòng)
DROP TABLE IF EXISTS search_cache_state;
CREATE TABLE search_cache_state (
    id INT PRIMARY KEY DEFAULT 1,
    active_keyword VARCHAR(255) NULL,
    hit_count INT DEFAULT 0,
    is_deep_indexed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO search_cache_state (id, active_keyword, hit_count, is_deep_indexed) VALUES (1, NULL, 0, FALSE);

-- 3. Bảng chứa dữ liệu nhạy cảm / Secrets để thử nghiệm UNION SQLi
DROP TABLE IF EXISTS system_secrets;
CREATE TABLE system_secrets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    secret_key VARCHAR(100) NOT NULL,
    secret_val TEXT NOT NULL,
    description VARCHAR(255)
);

INSERT INTO system_secrets (secret_key, secret_val, description) VALUES
('FLAG', 'FLAG{sp_sqli_2nd_order_trigger_success_98234}', 'CTF Challenge Flag'),
('ADMIN_TOKEN', 'tok_sec_live_9a8f7c6e5d4b3a2019', 'Root API Bearer Secret'),
('AWS_BACKUP_S3', 'AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', 'Database Daily Backup Credentials'),
('SUPERADMIN_HASH', '$2b$12$e8YpM9hD0fE/7pG93dDKeOD6K4r5X2zV9/1l0b1s2t3u4v5w6x7y8', 'Master admin bcrypt password');

-- 4. Stored Procedure kích hoạt sau 3 lần gọi liên tiếp: sp_deep_search_products
-- Mô hình 2 tham số: p_keyword (cắt cụt ở 64 ký tự) và p_category (giới hạn 128 ký tự)
-- Lỗ hổng: Boundary Truncation trên p_keyword nuốt ranh giới đóng nháy, giải phóng p_category thành mã SQL thực thi
DROP PROCEDURE IF EXISTS sp_deep_search_products;
DELIMITER //
CREATE PROCEDURE sp_deep_search_products(IN p_keyword TEXT, IN p_category VARCHAR(128))
BEGIN
    DECLARE v_search VARCHAR(64);
    
    SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
    SET v_search = p_keyword;

    SET @sql_query = CONCAT(
        'SELECT id, name, category, price, stock, description, created_at ',
        'FROM products WHERE name = ''', v_search, ''' AND category = ''', p_category, ''' ',
        'ORDER BY id DESC'
    );
    
    PREPARE stmt FROM @sql_query;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END //
DELIMITER ;
