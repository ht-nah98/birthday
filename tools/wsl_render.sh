#!/usr/bin/env bash
# Chạy app/scripts/render.ts trên WSL2 bằng GPU NVIDIA (Chromium của Playwright, Mesa D3D12, cửa sổ đẩy ra ngoài màn hình).
# Không có biến này Chromium rơi về SwiftShader/llvmpipe (CPU). Dùng y hệt render.ts:
#   tools/wsl_render.sh sheet --url http://localhost:5391 --times 3,10 --cols 2 --out ../work/x.png
set -euo pipefail
cd "$(dirname "$0")/../app"
export PDOOM_CHROME="${PDOOM_CHROME:-$HOME/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome}"
export GALLIUM_DRIVER=d3d12 MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA LD_LIBRARY_PATH=/usr/lib/wsl/lib
exec bun scripts/render.ts "$@" --angle gl --headed
