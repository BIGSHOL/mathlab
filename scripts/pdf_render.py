# -*- coding: utf-8 -*-
"""PDF(이미지 슬라이드) → 페이지별 PNG 렌더 + 컨택트 시트 생성.
실행: python scripts/pdf_render.py
"""
import fitz
from PIL import Image, ImageDraw
import os

PDF = r'C:\Users\user\Documents\카카오톡 받은 파일\260531 중고교 시험분석 설명회.pdf'
OUT = r'D:\mathlab\.tmp_pdf'
os.makedirs(OUT, exist_ok=True)

doc = fitz.open(PDF)
n = len(doc)
pages = []
for i in range(n):
    pix = doc[i].get_pixmap(matrix=fitz.Matrix(2, 2))  # 144 DPI
    p = os.path.join(OUT, f'p{i+1:03d}.png')
    pix.save(p)
    pages.append(p)

# 컨택트 시트: 6장/시트 (2열 x 3행), 각 페이지 라벨
PER = 6
COLS, ROWS = 2, 3
THUMB_W = 560
sheets = 0
for start in range(0, n, PER):
    chunk = pages[start:start + PER]
    thumbs = []
    for idx, pth in enumerate(chunk):
        im = Image.open(pth).convert('RGB')
        ratio = THUMB_W / im.width
        th = im.resize((THUMB_W, int(im.height * ratio)))
        d = ImageDraw.Draw(th)
        d.rectangle([0, 0, 120, 34], fill='red')
        d.text((6, 6), f'P{start + idx + 1}', fill='white')
        thumbs.append(th)
    cell_h = max(t.height for t in thumbs)
    sheet = Image.new('RGB', (THUMB_W * COLS + 30, cell_h * ROWS + 40), 'white')
    for k, th in enumerate(thumbs):
        r, c = k // COLS, k % COLS
        sheet.paste(th, (c * (THUMB_W + 10) + 10, r * (cell_h + 10) + 10))
    sp = os.path.join(OUT, f'sheet_{sheets + 1:02d}.png')
    sheet.save(sp)
    sheets += 1

print(f'pages={n} sheets={sheets} out={OUT}')
