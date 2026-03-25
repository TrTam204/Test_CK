# Sales Management | E-commerce – Dự án kiểm thử CORS

Dự án web bán hàng được xây dựng để phục vụ môn Kiểm thử phần mềm, tập trung vào kiểm thử chính sách CORS, cookie và bảo mật API. Đây không phải dự án production.

## Mục tiêu

- Chạy được end-to-end: đăng ký, đăng nhập, xem sản phẩm, giỏ hàng, thanh toán giả lập.
- Cố ý giữ các cấu hình không an toàn để kiểm thử: CORS sai, cookie không an toàn, xác thực yếu, thiếu validate.
- Cung cấp kịch bản kiểm thử CORS (simple, preflight, credentials) và xác thực cookie.

## Kiến trúc & Công nghệ

- Frontend: HTML/CSS/JS (multi-page) trong thư mục `frontend/`
- Backend: Node.js + Express trong `backend/` – file chính: [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js)
- Database: SQL Server LocalDB (SalesDB) – tạo bảng và seed dữ liệu tự động khi khởi động

Luồng: Trình duyệt → Frontend → gọi API → Backend (Express) → SQL Server

## Chế độ CORS (CORS_MODE)

Backend hỗ trợ 3 chế độ cấu hình CORS điều khiển qua biến môi trường `CORS_MODE`:

- `vulnerable` (mặc định): `origin: true` (reflect), `credentials: true`
- `broken`: `origin: "*"`, `credentials: true` (trình duyệt sẽ chặn credentials – dùng cho test âm tính)
- `secure`: `origin: ["http://localhost:3000"]`, `credentials: true`

Ví dụ chạy (PowerShell):

```
$env:CORS_MODE="vulnerable"; node server.js
```

## Các “lỗi” cố ý để kiểm thử

- CORS sai: phản chiếu Origin động, đồng thời bật `Access-Control-Allow-Credentials: true` (vô cùng nguy hiểm)
- Cookie không an toàn: cookie phiên lưu `userId`, `secure: false`. Mặc định mã nguồn đang để `sameSite: "Lax"`; có thể đổi sang `"None"` khi cần kiểm thử thêm (xem bên dưới)
- Xác thực yếu: cookie chứa số `userId`, không có JWT/CSRF
- Không validate input đầy đủ ở nhiều API

Tuyệt đối KHÔNG sửa các “lỗi” trên khi fix bug tính năng – chỉ sửa lỗi kỹ thuật (DB, API, UI).

## Cấu trúc thư mục

```
Test_CK/
├─ backend/
│  ├─ server.js
│  ├─ package.json
│  └─ ...
├─ frontend/
│  ├─ index.html
│  ├─ products.html
│  ├─ cart.html
│  ├─ login.html
│  ├─ signup.html
│  ├─ app.js
│  └─ style.css
├─ tests/
│  ├─ api.test.js
│  └─ cors.test.js
├─ Database/
│  └─ store.sql        (nguồn dữ liệu tham chiếu gốc)
├─ attacker.html        (website giả lập tấn công CORS – chạy ở cổng 4000)

```

## Cách chạy

1) Backend (Express + SQL Server)

- Yêu cầu: Windows + SQL Server LocalDB (`(localdb)\MSSQLLocalDB`), Node.js
- Cài package: trong thư mục `backend/`

```
npm i
node server.js
```

Server chạy tại: http://localhost:5000/

2) Frontend (static server)

```
cd frontend
python -m http.server 3000
```

Truy cập: http://localhost:3000/

3) Attacker site (mô phỏng website độc hại khác origin)

```
# Chạy ở thư mục gốc dự án để phục vụ attacker.html
python -m http.server 4000
```

Mở: http://localhost:4000/attacker.html – nhấn các nút để gửi request cross-origin với `credentials: "include"` tới backend.

## Dữ liệu mẫu & Tài khoản mẫu

- Khi khởi động backend lần đầu, hệ thống tự tạo bảng `users`, `items`, `users_items` và seed 12 sản phẩm có ảnh (liên kết đến `frontend/img`).
- Tài khoản mẫu để đăng nhập kiểm thử:
  - Email: `ram@xyz.com`
  - Password: `password123`

## Backend – Cấu hình CORS & Cookie

- CORS: phản chiếu Origin động (reflect) và bật credentials bằng middleware chuẩn `cors` với `origin: true, credentials: true`. Tham khảo: [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js#L13-L21)
- Cookie phiên khi login:
  - `sameSite: "Lax"`
  - `secure: false`
  - `httpOnly: false`
  - Lưu ý: cấu hình này giúp hệ thống chạy được trên localhost, đồng thời vẫn giữ lỗ hổng CORS do cho phép nhiều origin có credential.

## API chính

Tất cả API base URL: `http://localhost:5000`

- Auth
  - POST `/api/register`
    - Body: `{ name, email, password, contact?, city?, address? }`
    - Tạo user mới (không hash mật khẩu – cố ý yếu)
  - POST `/api/login`
    - Body: `{ email, password }`
    - Thành công: set cookie `userId` và trả `{ user: { id, name, email } }`
  - POST `/api/logout`
    - Xóa cookie

- Sản phẩm
  - GET `/api/items` – công khai
  - GET `/api/items/search?q=keyword` – công khai
  - GET `/api/items/category/:categoryName` – công khai
  - POST `/api/items` – yêu cầu đăng nhập (thêm sản phẩm)
  - PUT `/api/items/:id` – yêu cầu đăng nhập (sửa sản phẩm)
  - DELETE `/api/items/:id` – yêu cầu đăng nhập (xóa sản phẩm)

- Giỏ hàng (yêu cầu đăng nhập qua cookie)
  - POST `/api/cart` – Body: `{ itemId }` – thêm vào giỏ (trạng thái `"Added to cart"`)
  - GET `/api/cart` – lấy danh sách item trong giỏ
  - DELETE `/api/cart/:itemId` – xóa một item khỏi giỏ
  - POST `/api/checkout` – chuyển toàn bộ `"Added to cart"` → `"Confirmed"` (giả lập thanh toán)

- Đơn hàng (yêu cầu đăng nhập)
  - GET `/api/orders` – danh sách đơn của người dùng
  - GET `/api/orders/:id` – chi tiết đơn (sản phẩm, tổng tiền)

Các handler nằm trong: [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js)

## Frontend – luồng chính

- File logic: [app.js](file:///d:/A.monhoc/Test_CK/frontend/app.js)
- Trang:
  - Trang chủ: [index.html](file:///d:/A.monhoc/Test_CK/frontend/index.html) – danh mục + ô tìm kiếm + lưới sản phẩm
  - Danh sách sản phẩm: [products.html](file:///d:/A.monhoc/Test_CK/frontend/products.html) – tìm kiếm và thêm giỏ hàng (chỉ hiện nút khi đã đăng nhập)
  - Giỏ hàng: [cart.html](file:///d:/A.monhoc/Test_CK/frontend/cart.html) – xem, xóa, thanh toán
  - Đăng nhập/Đăng ký: [login.html](file:///d:/A.monhoc/Test_CK/frontend/login.html), [signup.html](file:///d:/A.monhoc/Test_CK/frontend/signup.html)

## Kiểm thử CORS – Kịch bản gợi ý

Lưu ý: Backend cố ý phản chiếu Origin động và bật credentials, nên đây là **lỗ hổng nghiêm trọng**. Thực hiện kiểm thử từ một trang/host khác (hoặc qua curl với `-H "Origin: ..."`).

1) Simple request với credentials

```
curl -i http://localhost:5000/api/items \
  -H "Origin: http://evil.local" \
  -H "Cookie: userId=1"
```

Kỳ vọng: Response có `Access-Control-Allow-Origin: http://evil.local` và `Access-Control-Allow-Credentials: true` (do reflect origin).

2) Preflight request (OPTIONS)

```
curl -i -X OPTIONS http://localhost:5000/api/cart \
  -H "Origin: http://evil.local" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

Kỳ vọng: 200 với các header CORS cho phép.

3) Cross-site với cookie

- Từ domain khác, gửi `fetch` kèm `credentials: "include"` tới `/api/cart` sau khi đã login – kiểm tra cookie `userId` vẫn được gửi (vì `secure: false`, `sameSite: Lax/None`).

4) So sánh hành vi khi đổi `sameSite`

- Trong [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js), chuyển `sameSite: "Lax"` → `"None"` để kiểm thử mức độ rủi ro cao hơn với cross-site.

## Test tự động

Cài đặt:

```
cd backend
npm i -D jest supertest
```

Chạy test (backend đang chạy tại http://localhost:5000):

```
npx jest ../tests --runInBand
```

- Test API: tests/api.test.js
- Test CORS: tests/cors.test.js

## Kiểm thử Authentication & Security

- Thử thao tác giỏ hàng từ domain lạ (vì cookie dễ bị gửi kèm khi `sameSite` lỏng).
- Thử gửi payload không hợp lệ (thiếu trường, kiểu dữ liệu) vì API thiếu validate chặt chẽ.
- Quan sát cookie có `httpOnly: false` – dễ bị JS đọc được.

## Lưu ý quan trọng

- Đây là dự án kiểm thử – **Không triển khai production**.
- Các “lỗi” bảo mật (CORS, cookie, xác thực yếu) **phải được giữ nguyên** để phục vụ bài kiểm thử.
- Khi “Fix bug” chỉ sửa lỗi kỹ thuật (kết nối DB, crash API, UI sai) – **không vá bảo mật**.

## Lệnh tiện ích

- Khởi động backend: `node backend/server.js`
- Khởi động frontend: `python -m http.server 3000` trong `frontend/`

## Tham chiếu mã nguồn

- Backend: [server.js](file:///d:/A.monhoc/Test_CK/backend/server.js)
- Frontend logic: [app.js](file:///d:/A.monhoc/Test_CK/frontend/app.js)
- Giao diện: [style.css](file:///d:/A.monhoc/Test_CK/frontend/style.css)

---

Nếu bạn muốn tôi bổ sung bài test minh họa (curl/Postman hoặc file HTML “kẻ tấn công” mô phỏng cross-site), hãy nói chức năng muốn kiểm thử sâu hơn (CORS preflight, gửi credentials tự động, thao tác giỏ hàng từ site khác, v.v.).
