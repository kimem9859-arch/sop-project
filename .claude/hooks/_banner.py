#!/usr/bin/env python3
# SessionStart 배너 헬퍼 — 입력 T/R/N/H(탭 구분). 읽는 쪽이 Claude 인 전체 행엔 정렬 표를 쓰지 않는다(spec 2026-09-13-하네스 §6.3).
# systemMessage = 사람 화면 현황 요약 최대 4줄(spec 2026-09-13-배너-현황요약 §3.1) · additionalContext = 전체 행
import datetime, io, json, os, re, sys

CUT = 30  # 글자 단위(바이트 자르기는 한글을 깬다)


def cut(s):
    s = re.sub(r"\s+", " ", s.replace("**", "")).strip()
    return s if len(s) <= CUT else s[:CUT] + "…"


def today():
    try:
        return datetime.date.fromisoformat(os.environ["BANNER_TODAY"])
    except (KeyError, ValueError):
        return datetime.date.today()


def deadline(path, now):
    """hanium-docs 「### 일정」 절 표에서 오늘 이후 첫 마감 → '이름 D-N (MM-DD)'. 없으면 None."""
    found, in_sec = [], False
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.startswith("#"):
                    in_sec = line.startswith("### 일정")
                    continue
                m = in_sec and re.match(r"^\|\s*([^|]+?)\s*\|\s*\**(\d{4}-\d{2}-\d{2})", line)
                if m:
                    d = datetime.date.fromisoformat(m.group(2))
                    if d >= now:
                        found.append((d, m.group(1)))
    except (OSError, ValueError):
        return None
    if not found:
        return None
    d, name = min(found)
    return "%s D-%d (%s)" % (cut(name), (d - now).days, d.strftime("%m-%d"))


def summary(rows, hanium, now):
    lines = ["🚀 SOP 가디언"]
    dl = deadline(hanium, now) if hanium else None
    if dl:
        lines[0] += " · " + dl
    joined = [("%s %s" % kv).strip() for kv in rows]
    seg = []
    for l in joined:
        m = l.startswith("📌") and re.search(r"\d{4}-(\d{2}-\d{2}(?:~(?:\d{2}-)?\d{1,2})?)", l)
        if m:
            seg.append("📅 %s 기록" % m.group(1))
            break
    wait = [l for l in joined if l.startswith("⏸")]
    seg.append("⏸️ 대기 %d" % len(wait))  # U+FE0F — 없으면 폭 1로 계산돼 그림과 글자가 겹친다(2026-09-13 V4)
    red = [l for l in wait if re.match(r"⏸\s*🔴", l)]  # 줄 앞 태그만(본문 속 🔴 제외)
    if red:
        title = red[0].replace("⏸", "", 1).replace("🔴", "", 1).split(" — ")[0]
        seg.append("🔴 " + cut(title) + (" 외 %d" % (len(red) - 1) if len(red) > 1 else ""))
    lines.append(" · ".join(seg))
    nxt = next((l for l in joined if l.startswith("▶")), None)
    if nxt:
        body = re.sub(r"^▶\s*(다음)?(\([^)]*\))?:?", "", nxt)
        m = re.search(r"①\s*(.*?)(?=\s*②|$)", body)
        lines.append("▶️ 다음 " + cut(m.group(1) if m else body))
    issues = []
    for k, v in rows:
        if k.startswith("🔄"):
            name, state = k[1:].strip(), v.strip()
            if name == "sop-project":
                b = re.search(r"behind \d+", state)
                if b:
                    issues.append("sop-project " + b.group())
                elif "미설정" in state or "없음" in state:
                    issues.append("sop-project " + state)
            else:  # 커밋 안 한 변경은 매 세션 떠서 소음 — 뺀다(2026-09-13 V4 사용자 결정)
                state = state.replace("로컬변경", "").strip()
                if state and state != "동기화됨":
                    issues.append("%s %s" % (name, state))
        elif k.startswith("📭"):
            issues.append("기록 안 끝난 세션 " + re.sub(r"\D", "", v))  # 미기재 + 부분기재(spec 2026-09-14-작업마무리-이어받기 §5)
    if issues:
        lines.append("⚠️ " + " · ".join(issues))
    return "\n".join(re.sub(r" {2,}", " ", l) for l in lines)


title, rows, notes, hanium = None, [], [], None
# 깨진 바이트가 섞여도 죽지 않게(죽으면 session_id 까지 사라진다)
for line in io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8", errors="replace"):
    p = line.rstrip("\n").split("\t")
    if p[0] == "T":
        title = p[1] if len(p) > 1 else ""
    elif p[0] == "R":
        rows.append(((p[1] if len(p) > 1 else ""), (p[2] if len(p) > 2 else "")))
    elif p[0] == "N":
        notes.append(p[1] if len(p) > 1 else "")
    elif p[0] == "H":
        hanium = p[1] if len(p) > 1 else None
ctx = "\n".join(([title] if title else []) + [("%s %s" % kv).rstrip() for kv in rows] + notes)
try:
    msg = summary(rows, hanium, today())
except Exception:  # 요약이 실패해도 전체 행(session_id 포함)은 내보낸다
    msg = "🚀 SOP 가디언 · 요약 실패 — 상세는 Claude 컨텍스트"
sys.stdout.write(json.dumps({"systemMessage": msg, "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}, ensure_ascii=False) + "\n")
