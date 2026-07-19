#!/usr/bin/env python3
# statusLine 커맨드 — 세션 대화창 하단 바 렌더러(공식 레퍼런스 2줄 + 세션마무리 표시기).
# 입력: stdin 세션 JSON / 출력: stdout 평문(각 줄이 하단 바의 한 행).
# 이 환경 관행대로 jq 비의존(python3만). 기존 훅과 동일하게 session_id는 env var 우선.
#
# 1줄: 🤖 [모델] | 📁 <디렉터리> | 🌿 <브랜치><git상태> | <세션마무리 아이콘>
#   git상태: ✎N(미커밋 변경 N개·노랑) / ⬆N(미푸시 커밋 N개·마젠타) / ✓(완전 깨끗+동기화·희미) / 생략(추적 원격 없음).
#   마무리 원형(⚪✅🔵)과 위치·모양·색이 달라 구분.
# 2줄: context <진행바> NN% | plan <진행바> NN% | ⏱️ Nm Ns
#
# 세션마무리 표시기(핵심): 현재 session_id(전체 UUID)로 두 워크로그의 헤딩 블록 수 N을 센다.
#   ⚪ 미마무리(N=0) / ✅ 마무리함 / 🔵 마무리 후 새 작업(마무리 뒤 코드변경 발생 → 재마무리 권장).
#   아이콘만 표시(글자 없음). 한 세션에 마무리가 여러 번 일어날 수 있어(설계상 명시) 3상태로 처리.
#   staleness 판정용 상태파일: /tmp/claude-statusline-wrap-<sid> = "N 기준선(누적 코드변경량)".
import json
import os
import subprocess
import sys
import time

# ── ANSI 색 ──────────────────────────────────────────────
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
MAGENTA = "\033[35m"
DIM = "\033[2m"
RESET = "\033[0m"

# 마무리 뒤 "새 작업"으로 볼 최소 코드변경 줄 수(마무리 커밋 등 소음 무시용).
WRAP_STALE_THRESHOLD = 3

# 플랜(구독) 사용량 한도 창: "five_hour"(5시간 롤링·작업세션을 실제 막는 한도) 또는 "seven_day"(7일 주간).
# rate_limits는 Claude.ai 구독(Pro/Max)에서 첫 API 응답 후에만 들어옴 → 없으면 dim 자리표시.
PLAN_WINDOW = "five_hour"

WORKLOGS = ("docs/작업로그.md", "docs/claude-code-작업로그.md")


def read_stdin_json():
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def git_branch(cwd):
    try:
        out = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=cwd, capture_output=True, text=True, timeout=2,
        )
        return out.stdout.strip() or None
    except Exception:
        return None


def git_ahead(cwd):
    """원격보다 앞선(미푸시) 커밋 수. 추적 원격(upstream) 없으면 None."""
    try:
        out = subprocess.run(
            ["git", "rev-list", "--count", "@{upstream}..HEAD"],
            cwd=cwd, capture_output=True, text=True, timeout=2,
        )
        if out.returncode != 0:
            return None
        return int(out.stdout.strip())
    except Exception:
        return None


def git_dirty(cwd):
    """커밋 안 한 변경(스테이지·비스테이지·untracked) 파일 수."""
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=cwd, capture_output=True, text=True, timeout=2,
        )
        if out.returncode != 0:
            return 0
        return sum(1 for ln in out.stdout.splitlines() if ln.strip())
    except Exception:
        return 0


def count_wrap_blocks(project_dir, sid):
    """워크로그 헤딩(`## … · session <uuid> …`)에서 현재 세션 블록 수를 센다."""
    if not sid:
        return 0
    needle = "session " + sid
    n = 0
    for rel in WORKLOGS:
        path = os.path.join(project_dir, rel)
        try:
            with open(path, encoding="utf-8") as f:
                for line in f:
                    # 헤딩 라인 한정 → 커밋 인용·산문 언급·하단 폐기(백틱)섹션 오탐 회피.
                    if line.startswith("## ") and needle in line:
                        n += 1
        except FileNotFoundError:
            continue
        except Exception:
            continue
    return n


def wrap_state_path(sid):
    return "/tmp/claude-statusline-wrap-%s" % (sid or "unknown")


def read_wrap_state(sid):
    try:
        with open(wrap_state_path(sid), encoding="utf-8") as f:
            parts = f.read().strip().split()
            return int(parts[0]), int(parts[1])
    except Exception:
        return 0, 0


def write_wrap_state(sid, n, base_lines):
    try:
        with open(wrap_state_path(sid), "w", encoding="utf-8") as f:
            f.write("%d %d" % (n, base_lines))
    except Exception:
        pass


def wrap_indicator(project_dir, sid, lines_changed):
    """세션마무리 아이콘만 반환(글자 없음, 3상태 + 재작업 감지)."""
    n = count_wrap_blocks(project_dir, sid)
    prev_n, base = read_wrap_state(sid)

    if n == 0:
        return "%s⚪%s" % (DIM, RESET)

    if n > prev_n:
        # 방금 새 마무리 감지 → 기준선(현재 누적 코드변경량) 저장.
        write_wrap_state(sid, n, lines_changed)
        return "%s✅%s" % (GREEN, RESET)

    if n < prev_n:  # 로그 편집 등으로 감소 → 상태 재동기화
        write_wrap_state(sid, n, lines_changed)
        base = lines_changed

    if lines_changed - base > WRAP_STALE_THRESHOLD:
        return "%s🔵%s" % (CYAN, RESET)
    return "%s✅%s" % (GREEN, RESET)


def fmt_hm(rem):
    """남은 초 → 'HHh MMm' (5시간 창 리셋 카운트다운)."""
    rem = max(0, int(rem))
    return "%02dh %02dm" % (rem // 3600, (rem % 3600) // 60)


def fmt_dhm(rem):
    """남은 초 → 'Dd HHh MMm' (7일 창 리셋 카운트다운)."""
    rem = max(0, int(rem))
    return "%dd %02dh %02dm" % (rem // 86400, (rem % 86400) // 3600, (rem % 3600) // 60)


def bar(pct, width=10):
    """색상 진행바 + 백분율 문자열(라벨 없음)."""
    pct = max(0, min(100, int(pct)))
    if pct >= 90:
        color = RED
    elif pct >= 70:
        color = YELLOW
    else:
        color = GREEN
    filled = pct * width // 100
    return "%s%s%s %d%%" % (color, "█" * filled + "░" * (width - filled), RESET, pct)


def main():
    d = read_stdin_json()

    model = (d.get("model") or {}).get("display_name") or "?"
    ws = d.get("workspace") or {}
    cur_dir = ws.get("current_dir") or d.get("cwd") or os.getcwd()
    project_dir = ws.get("project_dir") or cur_dir
    dirname = os.path.basename(cur_dir.rstrip("/")) or cur_dir

    sid = d.get("session_id") or os.environ.get("CLAUDE_CODE_SESSION_ID", "")

    cost = d.get("cost") or {}
    dur_ms = cost.get("total_duration_ms") or 0
    lines_changed = (cost.get("total_lines_added") or 0) + (cost.get("total_lines_removed") or 0)

    cw = d.get("context_window") or {}
    ctx_pct = cw.get("used_percentage")
    ctx_pct = 0 if ctx_pct is None else ctx_pct

    # 플랜(구독) 사용량 한도 — 없으면(비구독·첫 응답 전) dim 자리표시.
    rl = d.get("rate_limits") or {}
    plan_pct = (rl.get(PLAN_WINDOW) or {}).get("used_percentage")
    reset5 = (rl.get("five_hour") or {}).get("resets_at")
    reset7 = (rl.get("seven_day") or {}).get("resets_at")

    branch = git_branch(cur_dir)
    wrap = wrap_indicator(project_dir, sid, lines_changed)

    # ── 1줄 ──
    seg1 = "🤖 %s[%s]%s | 📁 %s" % (CYAN, model, RESET, dirname)
    if branch:
        dirty = git_dirty(cur_dir)      # 미커밋 변경 파일 수
        ahead = git_ahead(cur_dir)      # 미푸시 커밋 수(원격 없으면 None)
        git_extra = ""
        if dirty > 0:                   # 커밋 안 함 → 노랑 연필
            git_extra += " %s✎%d%s" % (YELLOW, dirty, RESET)
        if ahead is not None:
            if ahead > 0:               # 미푸시 커밋 → 마젠타 화살표
                git_extra += " %s⬆%d%s" % (MAGENTA, ahead, RESET)
            elif dirty == 0:            # 완전히 깨끗+동기화일 때만 체크
                git_extra += " %s✓%s" % (DIM, RESET)
        seg1 += " | 🌿 %s%s" % (branch, git_extra)
    seg1 += " | %s" % wrap
    print(seg1)

    # ── 2줄: context <바> % | plan <바> % 🕐 5h (..) 📅 7d (..) | ⏱️ ──
    if plan_pct is not None:
        plan_seg = "Usage %s" % bar(plan_pct)
        now = time.time()
        timers = []
        if reset5 is not None:
            timers.append("🕐 5h (%s)" % fmt_hm(reset5 - now))
        if reset7 is not None:
            timers.append("📅 7d (%s)" % fmt_dhm(reset7 - now))
        if timers:
            plan_seg += " " + " ".join(timers)
    else:
        plan_seg = "Usage %s—%s" % (DIM, RESET)

    dur_sec = int(dur_ms) // 1000
    mins, secs = dur_sec // 60, dur_sec % 60
    seg2 = "Context %s | %s | ⏱️ %dm %ds" % (bar(ctx_pct), plan_seg, mins, secs)
    print(seg2)


if __name__ == "__main__":
    main()
