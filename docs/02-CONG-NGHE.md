# Công nghệ

## Trong repo này
| Lớp | Dùng gì | Ở đâu |
|---|---|---|
| Engine | TypeScript + three.js, render HDR, bloom, halation, hạt phim, nhoè chuyển động bằng trung bình khung con | `app/src/engine/` (chép từ pdoom) |
| Cảnh | Một `Scene` chia hồi; lớp chữ Canvas2D; shader toàn màn hình; cảnh 3D | `app/src/scenes/trailer.ts` |
| Render | Chrome headless → khung RGBA qua WebSocket → ffmpeg x264 | `app/scripts/render.ts` |
| Đo nhạc | librosa | `tools/analyze_audio.py` |
| Tách nền | rembg u2net (CPU) | `tools/cutout.py` |

Hiệu ứng trong `trailer.ts`: shader ảnh `photo` (cắt theo tâm nhìn, lệch màu RGB, nhoè xuyên tâm, nhiễu lát ngang, đen trắng, 2.5D bằng lớp tách nền), `mask` (ảnh trong chữ), `embers` (tàn lửa), `flame` (nến, gió thổi, khói), `rays`, hành lang và tường ảnh 3D, chữ extrude vàng, hạt nổ.

Tốc độ đo trên RTX 4070 Ti: 17 ms/khung với 8 khung con (đoạn 37–39 s).

## Bẫy đã gặp
- **WSL2 (máy RTX 2060): Chromium chạy headless rơi về SwiftShader (CPU).** Phải chạy có cửa sổ, `--use-angle=gl`, với `GALLIUM_DRIVER=d3d12 LD_LIBRARY_PATH=/usr/lib/wsl/lib`. Script `tools/wsl_render.sh` làm sẵn những việc này, cửa sổ được đẩy ra ngoài màn hình. Máy không có Google Chrome nên dùng Chromium của Playwright (`PDOOM_CHROME`).
- **Vite trên /mnt/d (WSL) không nhận biết file đã sửa**, vì ổ này không có inotify, nên nó cứ phục vụ bản cũ. Đã bật `watch.usePolling` trong `vite.config.ts`.
- **`THREE.AdditiveBlending` nhân với alpha**: shader nào trả alpha = 0 sẽ không hiện gì. Dùng `additive()` trong `scenes/v2/kit.ts` (One/One).
- **`bun` không có trong PATH** của Node mặc định trên máy cũ: nằm ở bản Node 22.22.0.
- **Linux + NVIDIA phải dùng `--use-angle=vulkan`** (render.ts tự chọn), nếu không Chrome rơi về CPU.
- **Không dùng chung một Layer2D cho mặt nạ và chữ**: khung sau hiện lại chữ khung trước (thấy ở 38 s và tiêu đề). Đã tách `mtext`; nguyên nhân gốc trong Chrome chưa xác minh.
- **Font nét đơn (EMS/Hershey) thiếu toàn bộ chữ có dấu đã thử.** Archivo, Cormorant, IBM Plex Mono đủ dấu.
- **Bộ khớp lời của pdoom đặt tiếng Anh**: `pron.py` xoá ký tự ngoài a–z, `whisper_run.py` đặt `language="en"`. Muốn karaoke tiếng Việt phải sửa.
- **Không có hàm `fbm(vec2)`** trong GLSL chung: dùng `snoise`.
- **Flash cộng trắng lâu thành màn xám**: giữ bán rã 0,03 s và cắt ở 0,2 s.
- Film grain làm file nặng: bản CRF 17 là 471 MB, bản nhẹ 14 Mbit/s là 101 MB.

## Công cụ khác có trên máy cũ (không nằm trong repo)
| Việc | Công cụ | Ghi chú lúc khảo sát |
|---|---|---|
| Quy trình video, knowledge graph | `Best-Video` | HyperFrames, Remotion, GSAP, motion |
| MV 3D | `mascot-mv/studio3d` | Nguồn của engine ở đây |
| Video AI | Google Flow qua FlowKit | Tốn credit |
| Ảnh AI | Codex CLI | Script có sẵn từ chối brief có chữ "photo" |
| Giọng | OmniVoice | Chưa chạy thử |
| Nhạc AI | Suno; ACE-Step | ACE-Step mới có code, chưa thấy model |
| 3D | Blender 4.2; TRELLIS.2 | TRELLIS.2 từng chạy trên GPU L4 |
| ComfyUI | model SD1.5/SDXL cũ | Không phản hồi ở cổng 8188 |
