#!/usr/bin/env python3
"""V4 품질 채점 — **구글폼을 만드는 Apps Script 코드**를 찍어낸다.

    python3 quality_form_gs.py v4_quality_raw.json --out v4_quality_form.gs

사용자가 `script.google.com` 에 붙여넣고 한 번 실행하면 폼과 응답 시트가 생긴다.
문항을 손으로 만들면 24개를 일일이 옮겨 적어야 하고, 그때 오타·누락이 난다.

🔴 **A/B/C 배치는 `quality_probe.blind_items()` 에서 온다** — 마크다운 채점표·설문
   페이지와 같은 배치라, 이미 받은 채점과 섞어서 집계할 수 있다.

🔴 **응답 요약 화면을 끈다**(`setPublishingSummary(false)`) — 채점자가 남의 답을
   보면 그쪽으로 끌려간다. 결과는 관리자만 본다.

⚠️ **이 코드는 실행해 보지 못한다**(구글 계정이 없다). 그래서 단계마다 로그를 찍어
   **어디서 멈췄는지 바로 보이게** 썼다.
"""

import argparse
import json
import sys

from quality_probe import FORM_TITLE, VIEW_CRITERIA, blind_items

GS = r"""/**
 * __TITLE__ — 채점 폼 생성기
 * 자동 생성됨 (dev/llm_bench/quality_form_gs.py) · 응답 수집 __WHEN__
 *
 * 쓰는 법
 *   1. script.google.com → 새 프로젝트 → 이 코드를 전부 붙여넣기
 *   2. 함수 목록에서 buildScoringForm 을 고르고 실행
 *   3. 권한 승인(폼·스프레드시트를 만들기 위해 필요)
 *   4. 실행 로그에 찍힌 「응답 링크」를 팀원에게 전달
 */

var TITLE = __TITLE_JSON__;
var CRITERIA = __CRITERIA__;   // [[이름, 설명], ...] — 그리드의 행
var CHOICES = ["O", "△", "X"]; // 그리드의 열
var ITEMS = __ITEMS__;         // 문항 8개 × 응답 3개

function buildScoringForm() {
  var form = FormApp.create(TITLE);
  console.log("① 폼 생성됨: " + form.getEditUrl());

  form.setDescription(
    "정비 작업자가 장갑을 낀 채 화면을 보지 않고 귀로만 듣는 상황입니다.\n" +
    "같은 질문에 답이 셋 있고, 어느 것이 어느 모델인지는 가려져 있습니다.\n" +
    "문항마다 순서를 따로 섞었으므로 A·B·C 는 문항 간에 같은 모델이 아닙니다.\n\n" +
    "각 답을 네 가지로 봐 주세요 — O(좋음) · △(아쉬움) · X(나쁨).\n" +
    CRITERIA.map(function (c) { return "· " + c[0] + " — " + c[1]; }).join("\n")
  );
  form.setProgressBar(true);
  form.setShuffleQuestions(false);
  form.setAllowResponseEdits(false);
  try {
    form.setPublishingSummary(false);   // 채점자에게 집계를 보여주지 않는다
  } catch (e) {
    console.log("⚠️ 요약 화면 끄기 실패(무시하고 진행): " + e);
  }
  console.log("② 안내문 설정됨");

  form.addTextItem()
    .setTitle("채점자 이름")
    .setHelpText("여러 사람의 채점을 구분하는 데만 씁니다.")
    .setRequired(true);
  console.log("③ 이름 칸 추가됨");

  var made = 0;
  for (var i = 0; i < ITEMS.length; i++) {
    var it = ITEMS[i];
    form.addSectionHeaderItem()
      .setTitle("문항 " + (i + 1) + " / " + ITEMS.length + "  ·  " + it.pid)
      .setHelpText("질문: " + it.prompt);

    for (var j = 0; j < it.options.length; j++) {
      var o = it.options[j];
      var grid = form.addGridItem();
      // 🔴 제목에 문항 번호·이름을 넣는다 — 응답 시트의 열 이름이 **문항 제목에서만**
      //    나오기 때문이다. "보기 A" 로만 두면 96개 열 중 8개가 똑같은 이름이 되어
      //    어느 문항인지 순서로 추측해야 한다(2026-08-27 실물 시트에서 확인).
      grid.setTitle((i + 1) + ". " + it.pid + " · 보기 " + o.label)
        .setHelpText(o.text + (o.truncated ? "  (※ 생성 예산이 모자라 끊긴 답입니다)" : ""))
        .setRows(CRITERIA.map(function (c) { return c[0]; }))
        .setColumns(CHOICES)
        .setRequired(true);
      made++;
    }
  }
  console.log("④ 채점 그리드 " + made + "개 추가됨 (기대값 24)");

  var ss = SpreadsheetApp.create(TITLE + " (응답)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  console.log("⑤ 응답 시트 연결됨: " + ss.getUrl());

  console.log("");
  console.log("=== 팀원에게 보낼 링크 ===");
  console.log(form.getPublishedUrl());
  console.log("=== 응답이 쌓이는 시트 (관리자용) ===");
  console.log(ss.getUrl());
}
"""


def build(data, out_path):
    items, _key = blind_items(data["rows"])
    gs = (GS
          .replace("__TITLE_JSON__", json.dumps(FORM_TITLE, ensure_ascii=False))
          .replace("__TITLE__", FORM_TITLE)
          .replace("__WHEN__", data["meta"]["when"])
          .replace("__CRITERIA__", json.dumps([list(c) for c in VIEW_CRITERIA], ensure_ascii=False))
          .replace("__ITEMS__", json.dumps(items, ensure_ascii=False, indent=2)))
    with open(out_path, "w") as f:
        f.write(gs)
    n = sum(len(i["options"]) for i in items)
    print(f"{out_path} — 문항 {len(items)} · 그리드 {n} · 채점칸 {n * len(VIEW_CRITERIA)}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("raw")
    ap.add_argument("--out", default="v4_quality_form.gs")
    args = ap.parse_args()
    with open(args.raw) as f:
        build(json.load(f), args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
