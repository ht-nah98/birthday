"""Tách nền ảnh 1–2 người (rembg u2net, CPU) → assets/cut/pNN.png. Ảnh nhóm bị mất mặt: KHÔNG tách."""
import pathlib
from PIL import Image, ImageOps
from rembg import new_session, remove
R = pathlib.Path(__file__).resolve().parent.parent; (R / 'assets/cut').mkdir(exist_ok=True)
s = new_session('u2net', providers=['CPUExecutionProvider'])
for n in ('02', '03', '04', '05', '07', '09', '13'):
    im = ImageOps.exif_transpose(Image.open(R / f'assets/src/p{n}.jpg')).convert('RGB'); im.thumbnail((1920, 1920))
    remove(im, session=s, post_process_mask=True).save(R / f'assets/cut/p{n}.png'); print(n, flush=True)
