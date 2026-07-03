#!/usr/bin/env python3
# SessionStart 훅 공용 배너 헬퍼.
# stdin(탭 구분)으로 표 데이터를 받아 Claude Code 훅용 JSON을 stdout에 출력한다:
#   systemMessage    → 사용자에게 보이는 배너
#   additionalContext → 모델 컨텍스트 주입(같은 내용)
# 입력 라인 형식:
#   T<TAB><제목>
#   R<TAB><키><TAB><값>
#   N<TAB><각주>            (표 아래 전체폭 라인)
# CJK/이모지 폭을 인식해 박스 표를 정렬한다. (평문 섞이면 JSON 파싱이 깨지므로 stdout은 JSON만.)
import sys, json, unicodedata

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

MAXV = 46  # 값 열 최대 표시폭(초과 시 … 로 절단 — 좁은 터미널에서 표 깨짐 방지)

def trunc(s, maxw=MAXV):
    if width(s) <= maxw:
        return s
    out = ''
    w = 0
    for ch in s:
        cw = width(ch)
        if w + cw > maxw - 1:
            break
        out += ch
        w += cw
    return out + '…'

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
        v = trunc(parts[2]) if len(parts) > 2 else ''
        rows.append((k, v))
    elif tag == 'N':
        notes.append(parts[1] if len(parts) > 1 else '')

out = []
if title:
    out.append(title)
if rows:
    kw = max(width(k) for k, _ in rows)
    vw = max(width(v) for _, v in rows)
    out.append('┌' + '─' * (kw + 2) + '┬' + '─' * (vw + 2) + '┐')
    for k, v in rows:
        out.append('│ ' + pad(k, kw) + ' │ ' + pad(v, vw) + ' │')
    out.append('└' + '─' * (kw + 2) + '┴' + '─' * (vw + 2) + '┘')
out.extend(notes)

msg = '\n'.join(out)
sys.stdout.write(json.dumps({
    "systemMessage": msg,
    "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": msg},
}, ensure_ascii=False) + '\n')
