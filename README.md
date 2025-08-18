# Trình đánh dấu timestamp & highlight (smithsonian)

> Dự án xây dựng công cụ web để **đánh dấu thời điểm phát (ms)** cho **câu** và **từ**, xuất ra JSON theo format yêu cầu, và **phát lại kèm highlight**.

---

## Giới thiệu
Dự án cung cấp một workflow đầy đủ:

1. **Nhập file**: người dùng nạp `smithsonian.ogg` (âm thanh) và `smithsonian.txt` (văn bản gốc).
2. **Biên tập (Edit)**: nghe –  
   - **Zoom timeline** theo mili-giây để đánh dấu chính xác.  
   - **Đánh mốc câu** (t0/t1), tự động đánh dấu từ .  
   - Bỏ qua **tên người nói** khi xác định vị trí ký tự đầu câu (`b`) và độ dài (`e`).  
   - Hỗ trợ **Clear**, **Restart project**, **Save mark**.  
3. **Phát + Highlight**: chuyển sang giao diện phát dựa trên các mốc đã lưu, **highlight theo thời gian** ở cấp độ câu và từ (mô phỏng “bài 01”).

Kết quả là 1 file JSON gồm 2 khối: `sentence` (mảng các câu) và `word` (mảng các từ, theo thứ tự phát).

---

## Mục tiêu
- Đánh dấu **chính xác đến millisecond**.  
- Thao tác **zoom/scroll timeline** mượt trên file dài, từ ngắn.  
- Giao diện **nghe – tạm dừng – đặt mốc**.  
- Xuất/nhập **JSON đúng schema** để tái sử dụng cho việc phát & highlight.  
- Dễ khởi chạy, không phụ thuộc backend phức tạp (chạy thuần trình duyệt). 

---

## Công nghệ sử dụng
- **Frontend Framework**: Vue 3
- **Ngôn ngữ**: JavaScript
- **CSS**: TailwindCSS
- **WaveSurfer.js** để biểu diễn waveform, zoom và scrub.
- **Local Storage / Pinia** để lưu các file text, audio gốc và sau khi cắt.  

---

## Giao diện cơ bản
  **1. Màn hình 1 – Nhập file**
  - Chọn file: smithsonian.ogg + smithsonian.txt.
  - Nút Next → Edit khi đủ file.
  **2. Màn hình 2 – Edit (đánh dấu)**
  - Waveform + playhead + zoom slider.
  - Phụ đề hightlight gợi ý từ .txt.
  - Chi tiết câu: hiển thị văn bản, đánh mốc từ.
  - Nút: Play/Pause, Clear, Restart, Save mark.
  - Thanh phóng to timeline (Zoom).
  **3. Màn hình 3 – Phát + Highlight**
  - Hiển thị câu, highlight chi tiết từ đang phát.
  - Thanh tiến trình đồng bộ với audio.

---

## Demo (Mô phỏng)
[Demo video](./Demo-bai4.mp4)
