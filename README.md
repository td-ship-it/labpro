# LabLog Pro — Đăng ký & Nhật ký Thiết bị Phòng Thí nghiệm

Hệ thống đặt lịch thiết bị, nhận/trả máy (check-in/check-out), nhật ký sử dụng, báo sự cố, dự báo bảo trì và theo dõi vật tư theo đề tài. Dữ liệu lưu trong **Google Sheets**, giao diện chạy trên **Cloudflare Workers**.

```
Trình duyệt ──► Cloudflare Worker (worker/index.js)
                  │  /            → giao diện React (thư mục dist/, build tự động)
                  │  POST /api    → chuyển tiếp, gắn PROXY_KEY bí mật + IP người dùng
                  │  POST /api/chat → Trợ lý AI (Cloudflare Workers AI miễn phí, hoặc Gemini)
                  ▼
           Google Apps Script (apps-script/Code.gs)  ── kiểm tra quyền, nghiệp vụ, gửi email
                  ▼
           Google Sheets (9 sheet dữ liệu + 1 sheet lịch sử thao tác)
```

Trình duyệt không biết địa chỉ Apps Script, không giữ khóa bí mật nào. Mọi kiểm tra (trùng lịch, quyền Admin, ai được trả máy…) đều làm ở Apps Script.

## Cấu trúc thư mục

| Đường dẫn | Nội dung |
|---|---|
| `apps-script/Code.gs` | Máy chủ nghiệp vụ — dán vào Apps Script của file Google Sheet |
| `apps-script/appsscript.json` | Cấu hình Apps Script (múi giờ Việt Nam, quyền Web app) |
| `worker/index.js` | Cloudflare Worker: phục vụ giao diện + chuyển tiếp `/api` |
| `wrangler.toml` | Cấu hình Worker (tên, lệnh build, thư mục `dist`) |
| `src/` | Giao diện React + TypeScript |
| `src/services/storage.ts` | Kho dữ liệu phía trình duyệt, đồng bộ với máy chủ |
| `src/services/api.ts` | Gọi `/api`, giữ phiên đăng nhập |
| `public/_headers` | Header bảo mật (CSP, chống nhúng khung, quyền camera cho quét QR) |
| `.dev.vars.example` | Mẫu biến môi trường khi chạy thử trên máy |

---

## Bước 1 — Google Sheet + Apps Script

1. Tạo một **Google Sheet** mới (đặt tên ví dụ `LabLog Pro - Dữ liệu`). Nên dùng tài khoản Google của đơn vị/phòng Lab, vì email thông báo sẽ gửi từ tài khoản này.
2. Mở **Tiện ích mở rộng → Apps Script**.
3. Xóa nội dung mặc định trong `Code.gs`, dán toàn bộ file `apps-script/Code.gs`, bấm **Lưu**.
4. (Nên làm) **Cài đặt dự án** (⚙️) → bật *Hiển thị tệp kê khai "appsscript.json"* → mở `appsscript.json` → dán nội dung `apps-script/appsscript.json` → Lưu.
5. Chọn hàm **`caiDat`** trên thanh công cụ → **Chạy** → cấp quyền khi được hỏi (Google sẽ cảnh báo "ứng dụng chưa được xác minh": bấm *Nâng cao → Đi tới… (không an toàn)* — đây là script của chính bạn).
6. Mở **Nhật ký thực thi**, ghi lại 2 dòng:
   - `PROXY_KEY = ...` → dùng ở Bước 3.
   - `Tài khoản Admin: <email của bạn> · Mật khẩu: ...` → dùng để đăng nhập lần đầu.

   Hàm `caiDat` đã: tạo 10 sheet, định dạng toàn bộ ô là *Văn bản thuần* (không mất số 0 đầu số điện thoại, không tự đổi giờ), tạo tài khoản Admin, bật lịch **gửi email nhắc trước giờ đặt máy** (15 phút/lần) và trigger **xóa bộ nhớ đệm khi có người sửa tay trên Sheet**.
7. **Triển khai → Tùy chọn triển khai mới → Loại: Ứng dụng web**:
   - *Thực thi dưới dạng*: **Tôi**
   - *Người có quyền truy cập*: **Bất kỳ ai**
   - Bấm **Triển khai**, sao chép **URL ứng dụng web** (kết thúc bằng `/exec`).

> **Khi sửa `Code.gs` sau này:** Triển khai → Quản lý các bản triển khai → ✏️ → Phiên bản: **Phiên bản mới** → Triển khai. URL giữ nguyên.

### Thuộc tính tập lệnh (tùy chọn)

Vào **Cài đặt dự án → Thuộc tính tập lệnh**:

| Tên | Giá trị | Ý nghĩa |
|---|---|---|
| `REGISTRATION` | `approval` *(mặc định)* | Người dùng tự đăng ký, **chờ Admin kích hoạt** (Admin nhận email báo) |
| | `open` | Tự đăng ký là dùng được ngay |
| | `closed` | Tắt tự đăng ký, chỉ Admin cấp tài khoản |
| `ALLOWED_EMAIL_DOMAINS` | ví dụ `ump.edu.vn` | Chỉ cho tự đăng ký bằng email thuộc tên miền này (nhiều tên miền cách nhau dấu phẩy) |
| `APP_URL` | ví dụ `https://lablog-pro.ten.workers.dev` | Đường dẫn gắn vào nút trong email |
| `LAB_NAME` | ví dụ `Bộ môn Bào chế` | Tên hiển thị trong email |
| `SEND_EMAIL` | `false` | Tắt gửi email thật (hộp thư trong ứng dụng vẫn lưu) |

---

## Bước 2 — Đưa mã nguồn lên GitHub

Tạo repo **trống** (nên để *Private*) tên `lablog-pro` tại https://github.com/new, rồi:

```bash
cd lablog-pro
git init -b main
git add .
git commit -m "LabLog Pro — Cloudflare Workers + Google Sheets"
git remote add origin https://github.com/<tai-khoan>/lablog-pro.git
git push -u origin main
```

Hoặc trên trang repo: **Add file → Upload files**, kéo thả toàn bộ nội dung thư mục (trừ `node_modules`, `dist` nếu có).

---

## Bước 3 — Triển khai lên Cloudflare Workers

1. Nếu muốn đổi tên Worker, sửa dòng `name = "lablog-pro"` trong `wrangler.toml` rồi commit.
2. Vào https://dash.cloudflare.com → **Workers & Pages → Create → Import a repository** → chọn repo `lablog-pro`.
   - *Build command*: **để trống** (lệnh build đã khai báo trong `wrangler.toml`)
   - *Deploy command*: `npx wrangler deploy` (mặc định)
   - Bấm **Deploy**.
3. Vào Worker → **Settings → Variables and Secrets → Add**:

   | Tên | Loại | Giá trị |
   |---|---|---|
   | `APPS_SCRIPT_URL` | **Secret** | URL `/exec` ở Bước 1.7 |
   | `PROXY_KEY` | **Secret** | Giá trị `PROXY_KEY` ở Bước 1.6 |
   | `AI_MODEL` | Text *(tùy chọn)* | Đổi model Trợ lý AI miễn phí, mặc định `@cf/google/gemma-4-26b-a4b-it` |
   | `GEMINI_API_KEY` | **Secret** *(tùy chọn)* | Dùng Gemini (có tra cứu Google) thay cho Trợ lý miễn phí |
   | `GEMINI_MODEL` | Text *(tùy chọn)* | Mặc định `gemini-3.8-flash` |

   Trợ lý AI **tự bật, miễn phí, không cần khóa** nhờ mục `[ai]` trong `wrangler.toml`.

4. Vào **Deployments** → chạy lại bản mới nhất (hoặc push một commit) để biến có hiệu lực.
5. Kiểm tra: mở `https://<ten-worker>.<tai-khoan>.workers.dev/api/health`. Kết quả đúng:
   ```json
   {"ok":true,"worker":true,"appsScript":true,"keyMatches":true,"gemini":false}
   ```
   - `appsScript:false` → sai `APPS_SCRIPT_URL` hoặc Web app chưa để quyền *Bất kỳ ai*.
   - `keyMatches:false` → `PROXY_KEY` trên Cloudflare khác với trong Apps Script.
6. Điền `APP_URL` (Bước 1, thuộc tính tập lệnh) bằng địa chỉ này để nút trong email trỏ đúng trang.

Từ đây, mỗi lần `git push` lên `main`, Cloudflare tự build và triển khai lại. `keep_vars = true` trong `wrangler.toml` giữ nguyên các biến đã đặt trên dashboard. Gắn tên miền riêng ở **Settings → Domains & Routes**.

---

## Bước 4 — Đăng nhập lần đầu

1. Mở trang, đăng nhập bằng email + mật khẩu Admin ở Bước 1.6.
2. Bấm vào tên mình (góc phải) → **Đổi mật khẩu**.
3. (Tùy chọn) Cùng menu → **Nạp danh mục thiết bị mẫu**: thêm 6 thiết bị kèm SOP/checklist, 10 vật tư tiêu hao, ghi chú cấu hình, lịch sử bảo trì và 6 đề tài mẫu. Không ghi đè dữ liệu đã có; sửa/xóa từng mục sau trong ứng dụng hoặc trực tiếp trên Sheet.
4. Mục **Quản Lý Người Dùng → Cấp Tài Khoản Mới**: nhập email, để trống mật khẩu → hệ thống tạo mật khẩu và **gửi email** cho người đó.
5. In mã QR dán lên từng máy (mục Danh Mục Thiết Bị → QR). Quét bằng điện thoại sẽ mở thẳng thẻ thiết bị để nhận máy, xem SOP.

---

### Không đăng nhập được Admin ("Email hoặc mật khẩu không đúng")

- Mật khẩu Admin là chuỗi **10 ký tự ngẫu nhiên** hiện trong *Nhật ký thực thi* lần chạy `caiDat` — không phải `123456`.
- Email Admin là **email Google đã chạy `caiDat`** (xem sheet `NguoiDung`, dòng có `role` = `admin`).
- Mất mật khẩu: trong Apps Script chọn hàm **`datLaiMatKhauAdmin`** → **Chạy** → mở *Nhật ký thực thi* lấy mật khẩu mới. Hàm này cũng gỡ khóa nếu đã gõ sai 5 lần. Không cần triển khai lại Web app.

## Trợ lý AI

| | Cloudflare Workers AI *(mặc định)* | Google Gemini *(tùy chọn)* |
|---|---|---|
| Cài đặt | Không cần gì — có sẵn trong `wrangler.toml` | Thêm Secret `GEMINI_API_KEY` |
| Chi phí | Miễn phí 10.000 neuron/ngày ≈ **150–200 câu hỏi/ngày**, đặt lại 7h sáng | Gói miễn phí có giới hạn theo phút/ngày |
| Tra cứu Google | Không (trả lời từ kiến thức chung + dữ liệu phòng Lab) | Có, kèm nguồn |
| Dữ liệu câu hỏi | Cloudflare không dùng để huấn luyện | Gói miễn phí: Google có thể dùng để cải thiện sản phẩm |

Khi đã thêm `GEMINI_API_KEY`, hệ thống dùng Gemini; nếu Gemini hết hạn mức sẽ **tự chuyển** sang Workers AI. Hết lượt miễn phí trong ngày, người dùng thấy thông báo "đã dùng hết lượt, mở lại lúc 7 giờ sáng". Model miễn phí đổi được bằng biến `AI_MODEL`, ví dụ `@cf/qwen/qwen3-30b-a3b-fp8` (rẻ hơn, ~230 câu/ngày) hoặc `@cf/aisingapore/gemma-sea-lion-v4-27b-it` (chuyên ngôn ngữ Đông Nam Á, ~100 câu/ngày). Theo dõi lượt dùng ở Cloudflare → **AI → Workers AI**.

## Tốc độ tải dữ liệu

| Tình huống | Cách hệ thống xử lý |
|---|---|
| Mở trang đăng nhập | Chỉ tải phần giao diện cần thiết (~98 KB nén). Trong lúc gõ mật khẩu, trang đã "đánh thức" Apps Script và tải sẵn màn hình Tổng quan. |
| Bấm Đăng nhập | **Một** lần gọi máy chủ trả về cả phiên đăng nhập lẫn toàn bộ dữ liệu. Apps Script lấy dữ liệu từ bộ nhớ đệm (CacheService), không đọc lại 9 sheet. |
| Mở lại trang / tải lại (F5) | Hiện **ngay** bản dữ liệu lần trước lưu trong trình duyệt, cập nhật ngầm phía sau. |
| Tự làm mới mỗi 60 giây | Máy chủ chỉ trả "không đổi" nếu chưa ai sửa gì (rất nhẹ); có thay đổi mới tải lại. |
| Chuyển tab | Các tab đã được tải ngầm ngay sau khi đăng nhập. |

Lần đăng nhập đầu tiên trong ngày có thể chậm hơn 1–3 giây vì Google cần khởi động lại script. Nếu tài khoản Cloudflare còn suất lịch chạy (gói miễn phí có 5), bỏ dấu `#` ở mục `[triggers]` trong `wrangler.toml` để Worker "đánh thức" Apps Script 5 phút/lần trong giờ làm việc.

**Bộ nhớ đệm và sửa tay trên Sheet:** sửa tay được tự động nhận biết (trigger `khiSheetThayDoi`), người dùng thấy thay đổi trong vòng 1 phút. Nếu chưa thấy, mở menu **LabLog Pro → Xóa bộ nhớ đệm** trên Google Sheet. Thao tác ghi (đặt lịch, nhận/trả máy…) luôn đọc thẳng từ Sheet nên không bao giờ dựa trên dữ liệu cũ.

## Quy tắc nghiệp vụ (kiểm tra ở máy chủ)

- **Đặt lịch**: tự duyệt nếu khung giờ trống; chặn trùng giờ (kể cả khi 2 người bấm cùng lúc — có khóa ghi), chặn giờ đã qua, chặn máy đang bảo trì. Gửi email xác nhận.
- **Nhắc lịch**: email tự động khoảng 15–45 phút trước giờ bắt đầu.
- **Nhận máy**: trong ngày của lịch, từ 30 phút trước giờ bắt đầu đến trước giờ kết thúc. Nhận máy đột xuất (không có lịch) bị chặn nếu khung giờ hiện tại đã có người khác đặt.
- **Trả máy**: chỉ người nhận máy hoặc Admin. Hệ thống tự tính thời lượng, giá vật tư lấy theo danh mục, **trừ tồn kho vật tư**. Báo sự cố hoặc tình trạng *Hư hỏng* → máy tự chuyển **Bảo trì** và email cho mọi Admin.
- **Ghi nhận bảo trì** (Admin) → máy về trạng thái Sẵn sàng.
- **Phân quyền**: thiết bị, người dùng, bảo trì, vật tư — chỉ Admin. Ghi chú nhanh, đề tài — người tạo hoặc Admin sửa/xóa. Người dùng chỉ thấy hộp thư của mình.
- **Tài khoản**: mật khẩu băm SHA-256 có muối; phiên đăng nhập 6 giờ kể từ lần thao tác cuối; sai mật khẩu 5 lần khóa 15 phút; quên mật khẩu bằng mã 6 số qua email; đổi mật khẩu thì các phiên cũ tự hết hiệu lực.
- Mọi thao tác ghi và các lần đăng nhập sai được lưu ở sheet **LichSuThaoTac** (thời gian, người thực hiện, nội dung). Đăng nhập thành công không ghi để đăng nhập nhanh hơn.
- Sai mật khẩu: khóa 15 phút sau 5 lần sai cho cùng một email; hoặc 50 lần sai từ cùng một địa chỉ IP (nhiều máy trong trường dùng chung IP nên ngưỡng này cao).

## Các sheet dữ liệu

| Sheet | Nội dung |
|---|---|
| `NguoiDung` | Tài khoản (cột `passwordHash`, `salt` là mật khẩu đã băm — **không sửa tay**) |
| `ThietBi` | Danh mục thiết bị; cột `sopSteps`, `videoTutorial`, `quickChecklist`, `maintenanceConfig` dạng JSON |
| `LichDat` | Lịch đặt máy |
| `NhatKySuDung` | Nhật ký nhận/trả máy |
| `ThongBao` | Hộp thư trong ứng dụng (bản lưu email đã gửi) |
| `GhiChuNhanh` | Ghi chú cấu hình theo thiết bị |
| `BaoTri` | Phiếu bảo trì / hiệu chuẩn |
| `DeTai` | Đề tài / dự án nghiên cứu |
| `VatTu` | Danh mục vật tư tiêu hao và tồn kho |
| `LichSuThaoTac` | Nhật ký thao tác hệ thống |

Có thể sửa trực tiếp trên Sheet (đổi tên phòng, thêm vật tư, chỉnh tồn kho…). Cột được nhận theo **tên ở dòng 1**, nên được phép đổi thứ tự cột hoặc thêm cột ghi chú riêng. **Không đổi tên cột** và không xóa cột `id`. Màn hình người dùng tự cập nhật trong vòng 1 phút.

> **Không chia sẻ file Google Sheet** cho người không phải quản trị: sheet chứa email, số điện thoại và mật khẩu đã băm.

---

## Chạy thử trên máy (tùy chọn)

```bash
npm install
cp .dev.vars.example .dev.vars     # điền APPS_SCRIPT_URL và PROXY_KEY thật
npx wrangler login                 # một lần — Trợ lý AI miễn phí chạy trên máy chủ Cloudflare
npm run dev:worker                 # build giao diện + chạy Worker ở http://localhost:8787
```

Khi sửa giao diện liên tục: chạy `npx wrangler dev` ở một cửa sổ, `npm run dev` ở cửa sổ khác rồi mở http://localhost:5173 (tự tải lại khi sửa code, `/api` được chuyển sang Worker).

Kiểm tra kiểu TypeScript: `npm run lint`.

## Giới hạn cần biết

- Mỗi thao tác qua Apps Script mất khoảng 1–3 giây. Apps Script cho tối đa ~30 yêu cầu đồng thời — đủ cho một phòng Lab/khoa.
- Gmail cá nhân gửi tối đa **100 email/ngày**; tài khoản Google Workspace của trường: 1.500/ngày. Hết hạn mức thì hộp thư trong ứng dụng vẫn ghi nhận, chỉ email thật không đi.
- Dữ liệu được tải toàn bộ khi đăng nhập; hợp với quy mô vài chục nghìn dòng nhật ký. Nếu sau vài năm quá lớn, có thể chuyển các dòng cũ sang file lưu trữ.
- Gói Cloudflare Workers miễn phí: 100.000 yêu cầu/ngày.

## Thay đổi so với bản AI Studio

- Dữ liệu từ `localStorage` của từng trình duyệt → **Google Sheets dùng chung**, nhiều người cùng thấy một lịch.
- Bỏ đăng nhập 1 chạm bằng tài khoản mẫu, bỏ "chuyển tài khoản kiểm thử", bỏ mật khẩu mặc định `123456`. Thêm đổi mật khẩu, quên mật khẩu qua email, Admin duyệt tài khoản tự đăng ký.
- Email thật (xác nhận lịch, nhắc lịch, báo sự cố, cấp tài khoản) thay cho hộp thư mô phỏng.
- Server Express → Cloudflare Worker. Trợ lý AI chạy miễn phí bằng Cloudflare Workers AI (Gemini là tùy chọn), yêu cầu đăng nhập, giới hạn 30 câu/10 phút/người, và báo lỗi rõ ràng thay vì trả lời soạn sẵn.
- Sửa ngày "hôm nay" bị lệch (trước 7 giờ sáng hiển thị ngày hôm qua do tính theo giờ UTC).
- Sửa thanh điều hướng và các thanh lọc bị tràn ngang trên màn hình laptop 1280–1440px và điện thoại.
- Quét QR khi chưa đăng nhập: sau khi đăng nhập tự mở đúng thẻ thiết bị.
