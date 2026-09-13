#!/usr/bin/env python3
# SessionStart 배너 헬퍼 — 입력 T/R/N(탭 구분). 읽는 쪽은 Claude 이므로 정렬 표를 쓰지 않는다(spec 2026-09-13 §6.3).
# systemMessage = 사람 화면 한 줄 요약 · additionalContext = 전체 행
import sys, json
title, rows, notes = None, [], []
for line in sys.stdin:
    p = line.rstrip("\n").split("\t")
    if p[0] == "T":
        title = p[1] if len(p) > 1 else ""
    elif p[0] == "R":
        rows.append(((p[1] if len(p) > 1 else ""), (p[2] if len(p) > 2 else "")))
    elif p[0] == "N":
        notes.append(p[1] if len(p) > 1 else "")
ctx = "\n".join(([title] if title else []) + [("%s %s" % kv).rstrip() for kv in rows] + notes)
n_open = sum(1 for k, _ in rows if k.startswith(("⏸", "▶")))
msg = "%s · 대기 %d건 · 상세는 Claude 컨텍스트" % (title or "세션 시작", n_open)
sys.stdout.write(json.dumps({"systemMessage": msg, "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}, ensure_ascii=False) + "\n")
