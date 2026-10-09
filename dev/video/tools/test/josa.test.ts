import {test} from "node:test";
import assert from "node:assert/strict";
import {josa} from "../../src/lib/josa.ts";

// 받침 있으면 앞 것(을·이) · 없으면 뒤 것(를·가) — 「렌치을(를)」 같은 겸용 표기를 없앤다
test("받침에 따라 조사를 고른다", () => {
  assert.equal(josa("렌치", "을", "를"), "렌치를");
  assert.equal(josa("드라이버", "이", "가"), "드라이버가");
  assert.equal(josa("공구", "을", "를"), "공구를");
  assert.equal(josa("버튼", "을", "를"), "버튼을");
  assert.equal(josa("B2", "을", "를"), "B2를");
});
