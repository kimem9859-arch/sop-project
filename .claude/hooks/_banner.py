#!/usr/bin/env python3
# SessionStart 훅 공용 배너 헬퍼.
# stdin(탭 구분)으로 표 데이터를 받아 Claude Code 훅용 JSON을 stdout에 출력한다:
#   systemMessage    → 사용자에게 보이는 배너
#   additionalContext → 모델 컨텍스트 주입(같은 내용)
# 입력 라인 형식:
#   T<TAB><제목>
#   R<TAB><키><TAB><값>
#   N<TAB><각주>            (표 아래 전체폭 라인)
# 값이 길면 셀 안에서 여러 줄로 접어(word-wrap) 전체 내용을 보존한다(잘림 없음).
# CJK/이모지 폭을 인식해 박스 표를 정렬한다. (평문 섞이면 JSON 파싱이 깨지므로 stdout은 JSON만.)
import sys, json, unicodedata

WRAP = 46  # 값 열 최대 표시폭(초과분은 다음 줄로 접힘 → 좁은 터미널 박스 깨짐 방지)

def width(s):
    w = 0
    for ch in s:
        o = ord(ch)
        if unicodedata.combining(ch) or o == 0xFE0F:
            continue
        ea = unicodedata.east_asian_width(ch)
        if ea in ('W', 'F') or 0x1F300 <= o <= 0x1FAFF or 0x2600 <= o <= 0x27BF:
            w += 2
        else:
            w += 1
    return w

def pad(s, target):
    return s + ' ' * max(0, target - width(s))

def wrap(s, maxw=WRAP):
    # 표시폭 기준으로 접기. 공백 경계 우선, 없으면 글자 단위.
    lines, cur, curw = [], '', 0
    for word in _tokens(s):
        ww = width(word)
        if curw and curw + ww > maxw:
            lines.append(cur); cur, curw = '', 0
        if ww > maxw:  # 단어 자체가 폭 초과 → 글자 단위 분해
            for ch in word:
                cw = width(ch)
                if curw + cw > maxw:
                    lines.append(cur); cur, curw = '', 0
                cur += ch; curw += cw
        else:
            cur += word; curw += ww
    if cur or not lines:
        lines.append(cur)
    return [ln.rstrip() if ln != ' ' else ln for ln in lines]

def _tokens(s):
    # 공백을 보존하며 토큰화(단어+뒤따르는 공백을 한 덩어리로)
    out, buf = [], ''
    for ch in s:
        buf += ch
        if ch == ' ':
            out.append(buf); buf = ''
    if buf:
        out.append(buf)
    return out

title = None
rows = []
notes = []
for line in sys.stdin:
    line = line.rstrip('\n')
    if not line:
        continue
    parts = line.split('\t')
    tag = parts[0]
    if tag == 'T':
        title = parts[1] if len(parts) > 1 else ''
    elif tag == 'R':
        k = parts[1] if len(parts) > 1 else ''
        v = parts[2] if len(parts) > 2 else ''
        rows.append((k, v))
    elif tag == 'N':
        notes.append(parts[1] if len(parts) > 1 else '')

# 값을 여러 줄로 접고, 이어지는 줄은 키 칸을 비워 확장
expanded = []
for k, v in rows:
    wl = wrap(v)
    for i, ln in enumerate(wl):
        expanded.append((k if i == 0 else '', ln))

out = []
if title:
    out.append(title)
if expanded:
    kw = max(width(k) for k, _ in expanded)
    vw = max(width(v) for _, v in expanded)
    out.append('┌' + '─' * (kw + 2) + '┬' + '─' * (vw + 2) + '┐')
    for k, v in expanded:
        out.append('│ ' + pad(k, kw) + ' │ ' + pad(v, vw) + ' │')
    out.append('└' + '─' * (kw + 2) + '┴' + '─' * (vw + 2) + '┘')
out.extend(notes)

msg = '\n'.join(out)
sys.stdout.write(json.dumps({
    "systemMessage": msg,
    "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": msg},
}, ensure_ascii=False) + '\n')
