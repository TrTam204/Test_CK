# BÁO CÁO KIỂM THỬ CORS - 20 TEST CASES

## Thông tin chung
- **Thời gian kiểm thử**: 30/03/2026
- **Dự án**: Sales Management E-commerce CORS Testing
- **Base URL**: http://localhost:5000
- **Frontend URL**: http://localhost:3001

---

## TỔNG KẾT KẾT QUẢ

| Chỉ số | Giá trị |
|-------|--------|
| Tổng Test Cases | 20 |
| ✓ PASS | 10 (50%) |
| ✗ FAIL | 10 (50%) |
| ⚠ ERROR | 0 |
| **Pass Rate** | **50.0%** |

---

## CHI TIẾT TỪNG TEST CASE

### NHÓM 1: ORIGIN (TC01-TC05) - 1/5 PASS

| ID | Description | Expected | Actual | Status | Bug |
|----|-------------|----------|--------|--------|-----|
| TC01 | Origin: http://localhost:3000 → Allow | http://localhost:3000 | http://localhost:3000 | ✓ PASS | - |
| TC02 | Origin: http://evil.com → Block | NOT http://evil.com | http://evil.com | ✗ FAIL | CORS1 |
| TC03 | Origin: http://localhost:4000 → Block | NOT http://localhost:4000 | http://localhost:4000 | ✗ FAIL | CORS1 |
| TC04 | Origin: https://localhost:3000 → Block | NOT https://localhost:3000 | https://localhost:3000 | ✗ FAIL | CORS1 |
| TC05 | Origin: http://attacker.local → Block | NOT http://attacker.local | http://attacker.local | ✗ FAIL | CORS1 |

**Kết luận Nhóm 1**: Server ở chế độ VULNERABLE - phản chiếu mọi Origin (cố ý)

---

### NHÓM 2: PREFLIGHT (TC06-TC10) - 3/5 PASS

| ID | Description | Expected | Actual | Status | Bug |
|----|-------------|----------|--------|--------|-----|
| TC06 | OPTIONS /api/cart, Method: POST | Contains POST | GET,POST,PUT,DELETE,OPTIONS | ✓ PASS | - |
| TC07 | OPTIONS /api/cart, Method: PUT | Contains PUT | GET,POST,PUT,DELETE,OPTIONS | ✓ PASS | - |
| TC08 | OPTIONS + Authorization header | Contains Authorization | Content-Type,X-Test | ✗ FAIL | CORS2 |
| TC09 | OPTIONS + Content-Type header | Contains Content-Type | Content-Type,X-Test | ✓ PASS | - |
| TC10 | Access-Control-Max-Age header | Max-Age present | (not set) | ✗ FAIL | CORS4 |

**Kết luận Nhóm 2**: 
- Hỗ trợ POST/PUT Method ✓
- Thiếu Authorization header trong Allow-Headers ✗ (CORS2)
- Thiếu Max-Age header ✗ (CORS4)

---

### NHÓM 3: CREDENTIALS & COOKIE (TC11-TC15) - 2/5 PASS

| ID | Description | Expected | Actual | Status | Bug |
|----|-------------|----------|--------|--------|-----|
| TC11 | Login + API from different origin | No credentials from evil | cred:true, origin:http://evil.com | ✗ FAIL | CORS5 |
| TC12 | Cookie SameSite attribute | SameSite present | userId=1; Max-Age=86400; Path=/; | ✓ PASS | - |
| TC13 | Cookie Secure flag | Secure present | userId=1; Max-Age=86400; Path=/; | ✗ FAIL | CORS3 |
| TC14 | Cookie HttpOnly flag | HttpOnly present | userId=1; Max-Age=86400; Path=/; | ✗ FAIL | - |
| TC15 | Credentials + Origin "*" | Not both * and true | http://localhost:3000, true | ✓ PASS | - |

**Kết luận Nhóm 3**:
- SameSite attribute có ✓
- Secure flag không có (HTTP dev mode) ✗ (CORS3)
- HttpOnly flag không có ✗
- Credentials được phép từ origin khác ✗ (CORS5) - LỖI NGUY HIỂM

---

### NHÓM 4: NEGATIVE/EDGE CASES (TC16-TC20) - 4/5 PASS

| ID | Description | Expected | Actual | Status | Bug |
|----|-------------|----------|--------|--------|-----|
| TC16 | Request without Origin | 200 OK | 200 | ✓ PASS | - |
| TC17 | PATCH method not allowed | 405/404 | 404 | ✓ PASS | - |
| TC18 | Custom header in request | 200 OK | 200 | ✓ PASS | - |
| TC19 | Block malicious origin | NOT malicious.com | http://malicious.com | ✗ FAIL | CORS1 |
| TC20 | Block unknown method | Not UNKNOWN | GET,POST,PUT,DELETE,OPTIONS | ✓ PASS | - |

**Kết luận Nhóm 4**: Hầu hết các test edge case pass, ngoại trừ TC19 (do CORS1)

---

## CÁC LỖI CORS PHÁT HIỆN

### CORS1: Origin Reflection Vulnerability ⚠️⚠️⚠️
- **Lỗi**: Server phản chiếu bất kỳ Origin nào từ client
- **Ảnh hưởng**: TC02, TC03, TC04, TC05, TC19
- **Mức độ**: **NGUY HIỂM**
- **Mô tả**: 
  ```
  Request: Origin: http://evil.com
  Response: Access-Control-Allow-Origin: http://evil.com ← PHẢN CHIẾU
  ```
- **Hệ quả**: Attacker có thể tấn công CSRF với credentials

### CORS2: Missing Authorization Header in Preflight
- **Lỗi**: Authorization header không được phép trong preflight response
- **Ảnh hưởng**: TC08
- **Mức độ**: **TRUNG BÌNH**
- **Mô tả**: 
  ```
  Expected: Access-Control-Allow-Headers: Authorization, Content-Type
  Actual: Access-Control-Allow-Headers: Content-Type, X-Test
  ```

### CORS3: Cookie Missing Secure Flag ⚠️
- **Lỗi**: Cookie không có Secure flag
- **Ảnh hưởng**: TC13
- **Mức độ**: **TRUNG BÌNH** (dev mode, HTTP)
- **Mô tả**: 
  ```
  Cookie: userId=1; Max-Age=86400; Path=/; SameSite=Lax
  ✗ Thiếu: Secure flag
  ```
- **Note**: Trong production (HTTPS), PHẢI có Secure flag

### CORS4: Missing Max-Age Header
- **Lỗi**: Preflight response không có Access-Control-Max-Age
- **Ảnh hưởng**: TC10
- **Mức độ**: **THẤP** (performance, không bảo mật)
- **Mô tả**: 
  ```
  Expected: Access-Control-Max-Age: 86400
  Actual: (not set)
  ```
- **Hệ quả**: Browser phải preflight mỗi lần request CORS

### CORS5: Credentials Allowed with Different Origin ⚠️⚠️
- **Lỗi**: Credentials được phép từ origin không hợp lệ
- **Ảnh hưởng**: TC11
- **Mức độ**: **NGUY HIỂM**
- **Mô tả**: 
  ```
  Request từ http://evil.com:
  Response: Access-Control-Allow-Credentials: true
           Access-Control-Allow-Origin: http://evil.com
  ```
- **Hệ quả**: Session hijacking, CSRF tấn công

---

## PHÂN TÍCH CHUYÊN SÂU

### Chế độ CORS
```
CORS_MODE: vulnerable (mặc định)
- origin: true (phản chiếu)
- credentials: true
```

Đây là chế độ **cố ý** để kiểm thử CORS vulnerabilities. Theo README.md:
> "Cố ý giữ các cấu hình không an toàn để kiểm thử"

### So sánh với Best Practices

| Tiêu chí | Hiện tại | Best Practice | Status |
|---------|---------|---------------|--------|
| Origin filtering | Phản chiếu động | Whitelist cụ thể | ✗ FAIL |
| Credentials | Cho phép | Strict control | ✗ FAIL |
| Cookie Secure | Không (HTTP) | Bắt buộc HTTPS | ✗ FAIL |
| Cookie HttpOnly | Không | Bắt buộc | ✗ FAIL |
| Authorization header | Không hỗ trợ | Bắt buộc | ✗ FAIL |
| Max-Age | Không | Nên có | ✗ FAIL |

---

## KỲ VỌNG VS THỰC TẾ

### Dự kiến (Expected Behavior - Secure)
```
- Origin: http://localhost:3000 → Allow
- Origin: http://evil.com → Block
- Credentials + wildcard origin → Block
- Cookie có Secure, HttpOnly, SameSite
- Authorization header được hỗ trợ
```

### Thực tế (Actual - Vulnerable)
```
✓ TC01: localhost:3000 Allow (OK)
✗ TC02-05: Mọi origin đều allow (VULNERABLE)
✗ TC08: Authorization không hỗ trợ
✗ TC10: Max-Age thiếu
✗ TC11: Credentials cho phép từ evil origin
✗ TC13-14: Cookie flags thiếu
```

---

## KẾT LUẬN

### Tóm tắt
- **20/20 test cases** được thực hiện thành công
- **10 PASS, 10 FAIL** = 50% Success Rate
- **5 CORS vulnerabilities** được phát hiện
- **2 lỗi nguy hiểm** (CORS1, CORS5)

### Đánh giá Bảo mật
- 🔴 **NGUY HIỂM**: CORS1 (origin reflection), CORS5 (credentials leak)
- 🟡 **TRUNG BÌNH**: CORS2 (missing headers), CORS3 (no secure flag), CORS4 (no max-age)

### Khuyến nghị
1. **Immediate Fix**:
   - Thay thế `origin: true` bằng whitelist cụ thể
   - Thêm `secure: true` cho cookie (khi chuyển HTTPS)
   - Thêm `httpOnly: true` cho cookie

2. **Short-term**:
   - Hỗ trợ Authorization header trong Allow-Headers
   - Thêm Access-Control-Max-Age header

3. **Long-term**:
   - Chuyển sang chế độ `secure` cho production
   - Implement CSRF token
   - Sử dụng SameSite=Strict thay vì Lax

---

## MỤC ĐÍCH DỰ ÁN

Dự án này **cố ý** để kiểm thử/học tập về CORS vulnerabilities:
- ✓ Các "lỗi" đã phát hiện là **EXPECTED**
- ✓ Đây không phải production code
- ✓ Hữu ích cho việc học CORS testing patterns

**Status**: Đạt mục đích → Tất cả 20 test cases kiểm thử CORS vulnerabilities thành công
