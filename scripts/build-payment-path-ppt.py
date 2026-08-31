# -*- coding: utf-8 -*-
"""
토스페이먼츠 카드사 심사용 **결제경로 PPT** 생성기.

토스 「계약과정 FAQ」 §6:
  "결제경로 파일은 '메인 페이지 - 상품 선택 - 결제 - 결제창 확인'의 흐름을 담은
   PPT 파일이에요. 카드사 심사를 빠르게 통과하기 위해 꼭 준비해주셔야 해요."
  "PDF파일이 아닌, PPT 파일로 계약담당자에게 보내주셔야 해요."
  "결제경로 파일이 없으면 심사 진행이 불가해요."

우리는 두 가지 유형에 동시에 해당한다 → 슬라이드를 둘 다 만족하게 구성한다:
  · 충전업종  — 크레딧(이용권)을 미리 충전해 쓰는 구조
  · 정기결제  — 월 구독(빌링)

스크린샷은 실제 프로덕션 화면을 브라우저로 직접 캡처한 것이다(합성/모형 아님).
심사관이 같은 경로를 그대로 따라갈 수 있도록 각 장에 **URL과 조작**을 적는다.

실행: python scripts/build-payment-path-ppt.py <스크린샷폴더> <출력.pptx>
"""
import sys
from pathlib import Path

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from PIL import Image

# 16:9
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x66, 0x6C, 0x78)
BRAND = RGBColor(0x31, 0x82, 0xF6)   # 토스 계열 블루
BG = RGBColor(0xF7, 0xF8, 0xFA)

# (파일명, 단계라벨, 제목, 설명줄들)
SLIDES = [
    ("01-main.png", "STEP 1", "메인 페이지",
     ["https://mathlab.para-x.co.kr",
      "서비스 소개 페이지입니다. 상단 우측 [로그인] 후 [결제] 메뉴로 이동합니다.",
      "비회원도 서비스 내용과 가격 정책을 확인할 수 있습니다."]),
    ("02-footer.png", "STEP 1-1", "사업자정보 (하단 푸터)",
     ["상호 · 대표자명 · 사업자등록번호 · 사업장 주소 · 유선번호 · 개인정보보호책임자를 표기합니다.",
      "통신판매업 신고번호는 신고 완료 후 이 영역에 추가 기재할 예정입니다.",
      "이용약관 / 개인정보처리방침 / 취소·환불 정책 링크를 함께 제공합니다."]),
    ("03-products.png", "STEP 2", "상품 선택",
     ["https://mathlab.para-x.co.kr/billing",
      "월 결제(정기결제) 3종과 횟수 결제(일회성 이용권) 3종을 판매합니다.",
      "모든 상품에 판매 가격을 표기하며, 표기 금액과 실제 결제 금액은 동일합니다.",
      "예시: [기출분석 3회 ₩30,000] 클릭 → 결제 화면으로 이동"]),
    ("04-checkout.png", "STEP 3", "결제",
     ["https://para-x.co.kr/checkout.html",
      "주문 내용(상품명 · 주문번호 · 결제금액)과 서비스 제공기간을 표시합니다.",
      "결제수단: 신용·체크카드 / 퀵계좌이체 / 토스페이 / 페이코 / 카카오페이 / 네이버페이",
      "결제 서비스 이용약관 및 개인정보 처리 동의 후 [결제하기]를 누릅니다."]),
    ("05-paywindow.png", "STEP 4", "결제창 확인 (신용카드)",
     ["[신용·체크카드] 선택 → 카드사 선택 → [결제하기] 클릭 시 카드사 인증창이 열립니다.",
      "화면은 KB국민카드 인증창 예시입니다.",
      "카드사 인증 완료 시 결제가 승인됩니다."]),
    ("06-success.png", "STEP 5", "결제 완료 및 상품 지급",
     ["결제 승인 즉시 이용권이 학원 계정에 자동 지급됩니다.",
      "결제금액 · 충전 수량 · 주문번호를 표시하고 영수증을 제공합니다.",
      "[MathLAB으로 돌아가기]로 지급된 이용권을 즉시 확인·사용할 수 있습니다."]),
    ("07-refund.png", "참고", "취소·환불 정책",
     ["https://para-x.co.kr/refund.html",
      "무형(디지털) 재화로, 서비스 제공기간은 충전일로부터 1년입니다.",
      "결제일로부터 7일 이내 미사용분 전액 환불, 일부 사용 시 잔여분 환불(정기결제는 일할 계산).",
      "결제 화면과 상품 안내에도 유효기간을 함께 표기합니다."]),
]


def add_text(slide, left, top, width, height, text, size, bold=False,
             color=INK, align=PP_ALIGN.LEFT, spacing=1.0):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    lines = text if isinstance(text, list) else [text]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line
        p.alignment = align
        p.line_spacing = spacing
        for r in p.runs:
            r.font.size = Pt(size)
            r.font.bold = bold
            r.font.color.rgb = color
            r.font.name = "맑은 고딕"
    return box


def fit(img_path, max_w, max_h):
    """비율을 유지하며 (max_w, max_h) 안에 들어가는 크기를 계산한다."""
    with Image.open(img_path) as im:
        w, h = im.size
    scale = min(max_w / w, max_h / h)
    return int(w * scale), int(h * scale)


def build(shot_dir: Path, out: Path):
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    blank = prs.slide_layouts[6]

    # ── 표지 ──
    s = prs.slides.add_slide(blank)
    bg = s.shapes.add_shape(1, 0, 0, SLIDE_W, SLIDE_H)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG
    bg.line.fill.background()
    bg.shadow.inherit = False

    bar = s.shapes.add_shape(1, 0, Inches(2.55), SLIDE_W, Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = BRAND
    bar.line.fill.background()
    bar.shadow.inherit = False

    add_text(s, Inches(1.0), Inches(1.5), Inches(11.3), Inches(0.6),
             "결제경로 안내", 40, bold=True)
    add_text(s, Inches(1.0), Inches(2.75), Inches(11.3), Inches(0.5),
             "파라엑스 (Para-X) · MathLAB 기출분석", 20, color=MUTED)
    add_text(s, Inches(1.0), Inches(3.6), Inches(11.3), Inches(2.2), [
        "서비스 유형   무형(디지털) 재화 — 배송 없음",
        "결제 유형     충전업종(일회성 이용권) + 정기결제(월 구독)",
        "서비스 제공기간   일회성 이용권 충전일로부터 1년 / 구독 1개월 단위",
        "결제 연동     토스페이먼츠 결제위젯 (직접 연동, 호스팅사 미사용)",
        "심사용 계정   요청 시 별도 전달 (비회원 접근 불가 영역 확인용)",
    ], 15, color=INK, spacing=1.9)

    # ── 본문 ──
    for fname, step, title, notes in SLIDES:
        path = shot_dir / fname
        if not path.exists():
            print(f"  !! 누락: {fname}")
            continue
        s = prs.slides.add_slide(blank)

        add_text(s, Inches(0.55), Inches(0.32), Inches(2.0), Inches(0.35),
                 step, 13, bold=True, color=BRAND)
        add_text(s, Inches(0.55), Inches(0.62), Inches(12.2), Inches(0.5),
                 title, 26, bold=True)

        # 설명은 우측 열, 이미지는 좌측 — 가로 스크린샷도 세로 스크린샷도 담기게
        img_max_w = Emu(int(Inches(8.0)))
        img_max_h = Emu(int(Inches(5.5)))
        w, h = fit(path, int(img_max_w), int(img_max_h))
        left = Inches(0.55)
        top = Emu(int(Inches(1.45)) + max(0, (int(img_max_h) - h) // 2))
        pic = s.shapes.add_picture(str(path), left, top, width=Emu(w), height=Emu(h))
        pic.line.color.rgb = RGBColor(0xDD, 0xE1, 0xE6)
        pic.line.width = Pt(0.75)

        add_text(s, Inches(8.85), Inches(1.5), Inches(3.95), Inches(5.0),
                 [f"• {n}" for n in notes], 12.5, color=INK, spacing=1.6)

    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    print(f"생성 완료: {out}  (슬라이드 {len(prs.slides.__iter__.__self__._sldIdLst)}장)")


if __name__ == "__main__":
    build(Path(sys.argv[1]), Path(sys.argv[2]))
