#!/usr/bin/env bash
# 커밋 비밀 검사(.githooks/pre-commit) 시험 — 가짜 비밀로 임시 저장소를 만들어 막히는지·통과하는지 본다.
# 실행: bash .githooks/test-pre-commit.sh   (마지막 줄 = 통과 N / 실패 N · 실패 0 이면 종료 코드 0)
# 🔴 여기 나오는 비밀은 전부 가짜다(실제 값을 시험에 쓰지 않는다).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
HOOK="$HERE/pre-commit"
pass=0; fail=0
ok()  { echo "  ✅ $1"; pass=$((pass+1)); }
bad() { echo "  ❌ $1"; fail=$((fail+1)); }

T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
cd "$T" && git init -q && git config user.email t@t && git config user.name t
mkdir -p .githooks arduino && cp "$HOOK" .githooks/pre-commit && chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
printf '.env\n**/wifi_credentials.h\n' > .gitignore
FAKE_PW='FakePass_9x7Q'; FAKE_KEY='rf_FAKE1234567890abcd'
# 🔑 패턴에 걸리는 시험 문자열은 실행할 때 이어 붙여 만든다 — 이 파일 자체가 훅에 걸리지 않게
PWLINE="const char* pass""word = \"Abcd1234xyz!\";"
GHP="ghp""_abcdefghijklmnopqrstuvwxyz0123456789"
PKEY="-----BEGIN OPENSSH PRIV""ATE KEY-----"
cat > arduino/wifi_credentials.h <<EOF
struct WifiCred { const char* ssid; const char* pass; };
static const WifiCred WIFI_CREDS[] = {
  { "OpenLab", "" },
  { "FakeNet", "$FAKE_PW" },
};
EOF
printf 'ROBOFLOW_API_KEY=%s\n' "$FAKE_KEY" > .env
git add .gitignore && git commit -qm init >/dev/null 2>&1 || { echo "초기 커밋 실패"; exit 1; }

try() {   # try <기대 막힘|통과> <설명> <파일> <내용> [env]
  local want="$1" desc="$2" file="$3" body="$4" envv="${5:-}" out rc
  mkdir -p "$(dirname "$file")"; printf '%s\n' "$body" > "$file"; git add -f "$file"
  out=$(env $envv git commit -qm "$desc" 2>&1); rc=$?
  if [ "$want" = 막힘 ]; then
    [ $rc -ne 0 ] && ok "막힘 — $desc" || bad "막혀야 하는데 통과 — $desc"
    printf '%s' "$out" | grep -qF -e "$FAKE_PW" -e "$FAKE_KEY" && bad "안내문에 비밀 값이 찍힘 — $desc" || ok "안내문에 값 없음 — $desc"
    git reset -q HEAD -- "$file"; rm -f "$file"
  else
    [ $rc -eq 0 ] && ok "통과 — $desc" || { bad "통과해야 하는데 막힘 — $desc"; printf '%s\n' "$out" | sed 's/^/      /'; git reset -q HEAD -- "$file"; rm -f "$file"; }
  fi
}

echo "[커밋 비밀 검사]"
try 막힘 "알려진 와이파이 비밀번호 값을 코드에 씀" sketch/a.ino "WiFi.begin(\"FakeNet\", \"$FAKE_PW\");"
try 막힘 "알려진 API 키 값을 문서에 씀"           docs/a.md "키는 $FAKE_KEY 입니다"
try 막힘 "비밀번호 대입(모르는 값)"                sketch/b.ino "$PWLINE"
try 막힘 "GitHub 토큰 모양"                        tool/c.py "TOKEN = \"$GHP\""
try 막힘 "개인 키 머리"                            k/d.txt "$PKEY"
try 막힘 ".env 파일 자체를 올림"                   .env "ROBOFLOW_API_KEY=$FAKE_KEY"
try 통과 "자리표시 키(YOUR_API_KEY)"               docs/e.md 'api_key="YOUR_API_KEY"'
try 통과 "자리표시 키(한글 안내)"                  docs/f.md 'export ROBOFLOW_API_KEY="발급받은 키"'
try 통과 "평범한 문서(비밀번호라는 낱말)"          docs/g.md '와이파이 비밀번호를 바꾸세요 — password 변경 절차는 아래.'
try 통과 "SSID 이름은 비밀이 아님"                 docs/h.md '공유기 이름은 FakeNet 이다.'
try 통과 "막힐 내용 + 건너뛰기 설정"               sketch/i.ino "$PWLINE" SECRET_SCAN_SKIP=1

echo "[사본 일치]"
ROOT="$(cd "$HERE/.." && pwd)"
for c in "$ROOT/Rpi5/.githooks/pre-commit" "$HOME/project-docs/.githooks/pre-commit"; do
  [ -e "$c" ] || { bad "사본 없음 — $c"; continue; }
  cmp -s "$HOOK" "$c" && ok "같음 — $c" || bad "다름 — $c"
done

echo "통과 $pass / 실패 $fail"
[ $fail -eq 0 ]
