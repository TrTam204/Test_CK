# BÁO CÁO THỰC THI KIỂM THỬ + KIỂM THỬ TỰ ĐỘNG + BUG REPORT (Dự án Web bán hàng – lỗi CORS)

## Thông tin chạy hệ thống

- Thư mục dự án: `d:\A.monhoc\Test_CK`
- Backend: `node backend/server.js`
  - URL: http://localhost:5000
  - Trạng thái DB: LocalDB **không kết nối** (log: `dbReady=false`)
- Frontend: `npx http-server frontend -p 3001 -c-1`
  - URL: http://localhost:3001
- Attacker page: `npx http-server . -p 4000 -c-1`
  - URL: http://localhost:4000/attacker.html

---

## PHẦN 5: THỰC THI KIỂM THỬ (TEST EXECUTION)

### 5.1 Kiểm thử chức năng (Functional Testing)

- FE01: Truy cập frontend `http://localhost:3001/` → HTTP 200
- BE01: `GET http://localhost:5000/api/items` → HTTP 200, trả JSON danh sách item

### 5.2 Kiểm thử tích hợp (Integration Testing)

- INT01: Frontend (3001) gọi được Backend (5000) (API trả 200)
- INT02: Backend phục vụ static ảnh `/img/*` từ `frontend/img` (mount: [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js#L11-L11))

### 5.3 Kiểm thử hệ thống (System Testing)

- SYS01: Backend running (5000)
- SYS02: Frontend running (3001)
- SYS03: Attacker page running (4000)

### 5.4 Kiểm thử hiệu năng (Performance Testing) – nếu có

- Không thực hiện (không có kịch bản/perf tool trong phạm vi yêu cầu hiện tại)

### 5.5 Kiểm thử bảo mật cơ bản (Security Testing – CORS)

#### Bảng kết quả 20 test case CORS (theo Expected bạn cung cấp)

| ID | Expected | Actual | Status | Bug |
|---|---|---|---|---|
| TC01 | Allow (ACAO=http://localhost:3000) | status=200; ACAO=http://localhost:3000 | PASS |  |
| TC02 | Block (không ACAO=evil.com) | status=200; ACAO=http://evil.com | FAIL | CORS1 |
| TC03 | Block (không ACAO=localhost:4000) | status=200; ACAO=http://localhost:4000 | FAIL | CORS1 |
| TC04 | Block (không ACAO=https://localhost:3000) | status=200; ACAO=https://localhost:3000 | FAIL | CORS1 |
| TC05 | Block (Origin attacker page) | status=200; ACAO=http://127.0.0.1:4000 | FAIL | CORS1 |
| TC06 | OPTIONS /api/cart (POST) Allow | status=200; Allow-Methods=GET,POST,PUT,DELETE,OPTIONS | PASS |  |
| TC07 | OPTIONS /api/cart (PUT) Allow | status=200; Allow-Methods=GET,POST,PUT,DELETE,OPTIONS | PASS |  |
| TC08 | Allow Authorization header | status=200; Allow-Headers=Content-Type,X-Test | FAIL | CORS2 |
| TC09 | Allow Content-Type header | status=200; Allow-Headers=Content-Type,X-Test | PASS |  |
| TC10 | Có Access-Control-Max-Age | status=200; Max-Age=(empty) | FAIL | CORS4 |
| TC11 | Login→call API từ origin khác: không gửi cookie | status=200; ACAO=http://evil.com; ACAC=true | FAIL | CORS5 |
| TC12 | Cookie SameSite=Lax | Set-Cookie=...; SameSite=Lax | PASS |  |
| TC13 | Cookie Secure=true | Set-Cookie thiếu Secure | FAIL | CORS3 |
| TC14 | Cookie httpOnly=true | Set-Cookie thiếu HttpOnly | FAIL |  |
| TC15 | credentials + origin “*” bị browser chặn | status=200; ACAO=http://localhost:3000; ACAC=true | PASS |  |
| TC16 | Request không có Origin | status=200 | PASS |  |
| TC17 | Method PATCH không hợp lệ | status=404 | FAIL |  |
| TC18 | Header lạ → Block | status=200; Allow-Headers không chứa X-Strange-Header | PASS |  |
| TC19 | credentials từ origin sai → Block | status=200; ACAO=http://malicious.com; ACAC=true | FAIL | CORS5 |
| TC20 | OPTIONS với method lạ → Block | status=200; Allow-Methods không có PATCH | PASS |  |

### 5.6 Kiểm thử hồi quy (Regression Testing) – nếu có

- Không thực hiện (không có regression suite chạy được bằng Jest trong môi trường hiện tại)

### 5.7 Thống kê kết quả

- Tổng test case: 20
- PASS: 9
- FAIL: 11
- % PASS: 45%

---

## PHẦN 6: KIỂM THỬ TỰ ĐỘNG (AUTOMATION TESTING)

### 6.1 Công cụ sử dụng & lý do lựa chọn

- Script Node.js có sẵn trong dự án: `cors_test_20.js` (kiểm thử 20 test case)
- Jest test files có sẵn: `tests/api.test.js`, `tests/cors.test.js`
- Script Python có sẵn: `cors_test.py`

### 6.2 Các test script đã viết (liệt kê tên, mô tả chức năng)

- `cors_test_20.js`: chạy 20 test case CORS, in bảng kết quả và summary
- `tests/api.test.js`: kiểm tra API cơ bản (GET items, login, cart)
- `tests/cors.test.js`: kiểm tra header CORS phản chiếu origin
- `cors_test.py`: chạy 20 test case CORS bằng Python requests

### 6.3 Hướng dẫn cài đặt & chạy script

- Chạy backend:
  - `cd backend`
  - `node server.js`
- Chạy script tự động Node (dùng node_modules trong backend):
  - PowerShell:
    - `$env:NODE_PATH="d:\A.monhoc\Test_CK\backend\node_modules"; node cors_test_20.js`
- Chạy Jest (đã thử theo README):
  - `cd backend`
  - `npx jest ../tests --runInBand`
- Chạy Python:
  - `python cors_test.py`

### 6.4 Kết quả chạy tự động (log)

#### 6.4.1 Node script `cors_test_20.js` (RUN)

- Kết quả:
  - Tổng Test Cases: 20
  - PASS: 11
  - FAIL: 9
  - ERROR: 0
  - Pass Rate: 55.0%

#### 6.4.2 Jest tests (FAIL)

- Lỗi khi chạy: “No tests found” / “Could not find a config file …” (không có `jest.config.*`)

#### 6.4.3 Python script (FAIL)

- Lỗi khi chạy: `ModuleNotFoundError: No module named 'requests'`

### 6.5 Nhận xét về automation

- Có thể chạy automation bằng Node script `cors_test_20.js`
- Jest có file test nhưng chưa chạy được do thiếu cấu hình jest trong project
- Python script chưa chạy được do thiếu dependency `requests`

---

## PHẦN 7: BÁO CÁO LỖI (BUG REPORT) + SUMMARY

### 7.1 Danh sách toàn bộ bug tìm được

| Bug ID | Tiêu đề | Module | Mức độ | Ưu tiên | Bước tái hiện | Kết quả thực tế | Kết quả mong đợi | Trạng thái | Ảnh/Video |
|---|---|---|---|---|---|---|---|---|---|
| BUG001 | CORS phản chiếu Origin (Origin Reflection) | Backend/CORS | Critical | High | `GET /api/items` + `Origin: http://evil.com` | `ACAO: http://evil.com` | Block origin lạ | Open | TC02–TC05 |
| BUG002 | Thiếu Authorization trong Allow-Headers (Preflight) | Backend/CORS | Major | High | `OPTIONS /api/cart` + `Access-Control-Request-Headers: Authorization` | `Allow-Headers: Content-Type,X-Test` | Có `Authorization` | Open | TC08 |
| BUG003 | Thiếu Access-Control-Max-Age | Backend/CORS | Minor | Medium | `OPTIONS /api/cart` | Không có `Access-Control-Max-Age` | Có `Access-Control-Max-Age` | Open | TC10 |
| BUG004 | Cho phép credentials với origin sai | Backend/CORS | Critical | High | `GET /api/items` + `Origin: http://evil.com` | `ACAO=evil.com`, `ACAC=true` | Block credentials origin sai | Open | TC11, TC19 |
| BUG005 | Cookie thiếu Secure flag | Backend/Auth-Cookie | Major | Medium | `POST /api/login` | Set-Cookie thiếu `Secure` | Có `Secure` | Open | TC13 |
| BUG006 | Cookie thiếu HttpOnly flag | Backend/Auth-Cookie | Major | Medium | `POST /api/login` | Set-Cookie thiếu `HttpOnly` | Có `HttpOnly` | Open | TC14 |
| BUG007 | PATCH /api/cart không trả 405 | Backend/API | Minor | Low | `PATCH /api/cart` | 404 | 405 | Open | TC17 |
| BUG008 | LocalDB không kết nối khi khởi động | Backend/DB | Major | High | `node backend/server.js` | `dbReady=false` | DB connected | Open | Log backend |
| BUG009 | Jest tests không chạy được do thiếu config | Tests/Jest | Major | Medium | `npx jest ../tests --runInBand` | Không tìm thấy test/config | Test chạy được | Open | Log jest |
| BUG010 | Python automation không chạy do thiếu requests | Tests/Python | Minor | Low | `python cors_test.py` | thiếu module `requests` | Script chạy được | Open | Log python |

### 7.2 Phân loại bug theo mức độ nghiêm trọng

- Critical: 2 (BUG001, BUG004)
- Major: 5 (BUG002, BUG005, BUG006, BUG008, BUG009)
- Minor: 3 (BUG003, BUG007, BUG010)

### 7.3 Biểu đồ thống kê bug (theo module, theo mức độ)

#### Theo module

- Backend/CORS: 4
- Backend/Auth-Cookie: 2
- Backend/DB: 1
- Backend/API: 1
- Tests (Jest/Python): 2

#### Theo mức độ

- Critical: 2
- Major: 5
- Minor: 3

---

## KIỂM THỬ HỘP TRẮNG / XÁM (WHITE/GRAY BOX) – BÁM CODE DỰ ÁN

- CORS middleware (origin reflect + credentials) ở: [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js#L13-L41)
  - `origin: true`, `credentials: true`
  - `allowedHeaders: ["Content-Type", "X-Test"]` (thiếu Authorization)
  - Không set `Access-Control-Max-Age`
- Cookie khi login ở: [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js#L245-L270)
  - `httpOnly: false` (TC14 FAIL)
  - `secure: false` (TC13 FAIL)
  - `sameSite: "Lax"` (TC12 PASS)
- Allowed methods trong CORS options ở: [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js#L15-L20)
  - `methods: ["GET","POST","PUT","DELETE","OPTIONS"]` (không có PATCH)

