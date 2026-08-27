#!/usr/bin/env python3
"""V4 품질 채점 — **링크로 여러 명이 채점하는 설문 페이지**를 만든다.

    python3 quality_form.py v4_quality_raw.json --out v4_quality_form.html

만들어진 HTML 을 Artifact 로 게시하면 링크가 나오고, 팀원이 각자 채점해 제출한다.
제출은 **페이지가 자기 자신의 새 버전으로 저장**한다(서버 없음).

🔴 **채점자에게 결과를 보여주지 않는다** — 이 페이지에는 집계 화면이 아예 없다.
   숨기는 것이 아니라 만들지 않는 것이다(2026-08-27 사용자 결정). 종합은 관리자가
   원자료를 읽어서 한다.

🔴 **A/B/C 배치는 `quality_probe.blind_items()` 하나에서 온다** — 마크다운 채점표와
   같은 함수를 쓴다. 따로 섞으면 매핑 키 하나로 둘 다 복원할 수 없다.

⚠️ **팀원에게 「편집 가능」으로 공유해야 제출이 저장된다.** 읽기 전용 뷰어는 저장이
   거부되므로, 그 경우 페이지가 **점수를 복사해 전달할 텍스트**를 대신 보여준다.
"""

import argparse
import json
import sys

from quality_probe import FORM_TITLE, VIEW_CRITERIA, blind_items

TEMPLATE = r"""<title>__TITLE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gothic+A1:wght@700;800&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">
<style>
:root{
  --ground:#F1F4F5; --panel:#FFFFFF; --panel-2:#F7F9FA;
  --ink:#10161B; --muted:#5A666F; --line:#D8DFE3;
  --accent:#0F5C63; --accent-ink:#FFFFFF; --accent-soft:#E2EEEF;
  --ok:#2E7D32; --ok-soft:#E4F0E5;
  --warn:#9A6A05; --warn-soft:#F6ECD9;
  --bad:#B3261E; --bad-soft:#F7E3E1;
  --shadow:0 1px 2px rgba(16,22,27,.06), 0 8px 24px -16px rgba(16,22,27,.35);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ground:#0F1419; --panel:#171F26; --panel-2:#1D262E;
    --ink:#E7EDF1; --muted:#95A3AD; --line:#2A343D;
    --accent:#4BA9A2; --accent-ink:#08181A; --accent-soft:#173231;
    --ok:#6FBE74; --ok-soft:#17281A;
    --warn:#D6A63B; --warn-soft:#2B2314;
    --bad:#E0716A; --bad-soft:#2E1917;
    --shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 28px -18px rgba(0,0,0,.9);
  }
}
:root[data-theme="dark"]{
  --ground:#0F1419; --panel:#171F26; --panel-2:#1D262E;
  --ink:#E7EDF1; --muted:#95A3AD; --line:#2A343D;
  --accent:#4BA9A2; --accent-ink:#08181A; --accent-soft:#173231;
  --ok:#6FBE74; --ok-soft:#17281A;
  --warn:#D6A63B; --warn-soft:#2B2314;
  --bad:#E0716A; --bad-soft:#2E1917;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 10px 28px -18px rgba(0,0,0,.9);
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font-family:"IBM Plex Sans KR","Noto Sans KR",system-ui,sans-serif;
  font-size:16px; line-height:1.65; -webkit-font-smoothing:antialiased;
}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace}
h1,h2,h3{font-family:"Gothic A1","IBM Plex Sans KR",sans-serif; text-wrap:balance; margin:0}
.wrap{max-width:60rem; margin:0 auto; padding:0 1.25rem}

/* ── 상단 고정 바 ─────────────────────────────────── */
.bar{
  position:sticky; top:0; z-index:10; background:var(--panel);
  border-bottom:1px solid var(--line);
}
.bar-in{display:flex; align-items:center; gap:1rem; flex-wrap:wrap; padding:.85rem 0}
.bar h1{font-size:1.05rem; font-weight:800; letter-spacing:-.01em; flex:0 0 auto}
.bar .spacer{flex:1 1 auto}
.who{display:flex; align-items:center; gap:.5rem}
.who label{font-size:.72rem; letter-spacing:.09em; text-transform:uppercase; color:var(--muted)}
input[type=text]{
  font:inherit; font-size:.92rem; color:var(--ink); background:var(--panel-2);
  border:1px solid var(--line); border-radius:6px; padding:.4rem .6rem; width:9rem;
}
input[type=text]:focus-visible{outline:2px solid var(--accent); outline-offset:1px}
.count{font-size:.85rem; color:var(--muted)}
.count b{color:var(--ink); font-variant-numeric:tabular-nums}
.gauge{width:100%; height:3px; background:var(--line)}
.gauge i{display:block; height:100%; width:0; background:var(--accent); transition:width .2s}
button{font:inherit; cursor:pointer}
.send{
  background:var(--accent); color:var(--accent-ink); border:0; border-radius:6px;
  padding:.5rem 1.1rem; font-weight:600; font-size:.92rem;
}
.send[disabled]{background:var(--line); color:var(--muted); cursor:not-allowed}

/* ── 안내 ────────────────────────────────────────── */
.intro{padding:2rem 0 .5rem}
.intro h2{font-size:1.5rem; font-weight:800; letter-spacing:-.02em; margin-bottom:.6rem}
.intro p{color:var(--muted); max-width:44rem; margin:0 0 .6rem}
.legend{display:flex; gap:.5rem; flex-wrap:wrap; margin-top:1rem; padding:0; list-style:none}
.legend li{
  background:var(--panel); border:1px solid var(--line); border-radius:6px;
  padding:.45rem .7rem; font-size:.85rem;
}
.legend b{font-weight:600}
.note{
  margin-top:1rem; border-left:3px solid var(--accent); background:var(--accent-soft);
  padding:.7rem .9rem; font-size:.88rem; border-radius:0 6px 6px 0;
}

/* ── 문항 ────────────────────────────────────────── */
.q{padding:2.25rem 0 .75rem}
.eyebrow{
  font-size:.72rem; letter-spacing:.14em; text-transform:uppercase;
  color:var(--muted); display:flex; align-items:center; gap:.55rem;
}
.eyebrow .n{color:var(--accent); font-weight:600}
.ask{
  font-family:"Gothic A1",sans-serif; font-weight:700; font-size:1.22rem;
  line-height:1.5; margin:.45rem 0 0; text-wrap:balance;
}
.cards{display:flex; flex-direction:column; gap:.85rem; margin-top:1.1rem}
.card{
  background:var(--panel); border:1px solid var(--line); border-radius:10px;
  box-shadow:var(--shadow); overflow:hidden;
}
.card.done{border-color:var(--accent)}
.said{display:flex; gap:.9rem; padding:1rem 1.1rem}
.tag{
  flex:0 0 auto; width:1.9rem; height:1.9rem; border-radius:6px;
  background:var(--panel-2); border:1px solid var(--line);
  display:grid; place-items:center; font-weight:600; font-size:.9rem;
}
.card.done .tag{background:var(--accent); color:var(--accent-ink); border-color:var(--accent)}
.said p{margin:.1rem 0 0}
.cut{
  display:inline-block; margin-left:.4rem; font-size:.7rem; color:var(--warn);
  border:1px solid var(--warn); border-radius:4px; padding:0 .3rem; vertical-align:middle;
}
.rows{border-top:1px solid var(--line); background:var(--panel-2)}
.row{
  display:flex; align-items:center; gap:.75rem; flex-wrap:wrap;
  padding:.5rem 1.1rem; border-bottom:1px solid var(--line);
}
.row:last-child{border-bottom:0}
.row .name{font-size:.85rem; font-weight:500; flex:0 0 4.5rem}
.row .hint{font-size:.78rem; color:var(--muted); flex:1 1 12rem; min-width:0}
.pick{display:flex; gap:.3rem; flex:0 0 auto}
.pick button{
  width:2.4rem; height:2rem; border-radius:6px; border:1px solid var(--line);
  background:var(--panel); color:var(--muted); font-weight:600; font-size:.95rem;
}
.pick button:hover{border-color:var(--muted)}
.pick button:focus-visible{outline:2px solid var(--accent); outline-offset:1px}
.pick button[aria-pressed="true"][data-v="O"]{background:var(--ok-soft); border-color:var(--ok); color:var(--ok)}
.pick button[aria-pressed="true"][data-v="△"]{background:var(--warn-soft); border-color:var(--warn); color:var(--warn)}
.pick button[aria-pressed="true"][data-v="X"]{background:var(--bad-soft); border-color:var(--bad); color:var(--bad)}

/* ── 끝 ──────────────────────────────────────────── */
.end{padding:2.5rem 0 4rem; display:flex; flex-direction:column; gap:.9rem; align-items:flex-start}
.err{color:var(--bad); font-size:.9rem}
.done-screen{max-width:34rem; margin:0 auto; padding:5rem 1.25rem}
.done-screen h2{font-size:1.6rem; font-weight:800; margin-bottom:.7rem}
.done-screen p{color:var(--muted)}
textarea{
  font-family:"IBM Plex Mono",monospace; font-size:.8rem; width:100%; min-height:9rem;
  background:var(--panel-2); color:var(--ink); border:1px solid var(--line);
  border-radius:8px; padding:.7rem;
}
@media (prefers-reduced-motion: reduce){*{transition:none!important; animation:none!important}}
</style>

<script id="ITEMS" type="application/json">__ITEMS__</script>
<script id="CRITERIA" type="application/json">__CRITERIA__</script>
<script id="SUBMISSIONS" type="application/json">[]</script>
<script id="META" type="application/json">__META__</script>

<div id="app"></div>
<noscript><div class="wrap"><p style="padding:3rem 0">이 채점표는 자바스크립트가 있어야 열립니다.</p></div></noscript>

<script>
(function(){
  var $ = function(s,r){return (r||document).querySelector(s)};
  var read = function(id){try{return JSON.parse(document.getElementById(id).textContent)}catch(e){return null}};
  var ITEMS = read("ITEMS") || [], CRIT = read("CRITERIA") || [], META = read("META") || {};
  var SUBS = read("SUBMISSIONS") || [];
  var DRAFT = "v4q-draft-v1", MARK = "v4q-sent-v1";
  var scores = {}, name = "";

  try{ var d = JSON.parse(localStorage.getItem(DRAFT)||"{}"); scores = d.scores||{}; name = d.name||""; }catch(e){}
  var total = ITEMS.reduce(function(n,it){return n + it.options.length*CRIT.length}, 0);

  function saveDraft(){ try{ localStorage.setItem(DRAFT, JSON.stringify({name:name, scores:scores})) }catch(e){} }
  function filled(){ return Object.keys(scores).length }
  function keyOf(pid,label,crit){ return pid+"/"+label+"/"+crit }

  function el(tag, cls, text){
    var n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text != null) n.textContent = text;
    return n;
  }

  function alreadySent(){ try{ return localStorage.getItem(MARK) === "1" }catch(e){ return false } }

  function renderDone(msg, extra){
    var app = $("#app"); app.innerHTML = "";
    var box = el("div","done-screen");
    box.appendChild(el("h2", null, "제출됐습니다"));
    box.appendChild(el("p", null, msg));
    if(extra) box.appendChild(extra);
    app.appendChild(box);
    window.scrollTo(0,0);
  }

  function render(){
    var app = $("#app"); app.innerHTML = "";

    // 상단 바
    var bar = el("div","bar"), barIn = el("div","bar-in");
    var barWrap = el("div","wrap"); barWrap.appendChild(barIn);
    var h1 = el("h1", null, META.title || "응답 채점"); barIn.appendChild(h1);
    var who = el("div","who");
    var lab = el("label", null, "채점자"); lab.setAttribute("for","who-name");
    var inp = el("input"); inp.type="text"; inp.id="who-name"; inp.placeholder="이름";
    inp.value = name; inp.autocomplete="off";
    inp.addEventListener("input", function(){ name = inp.value.trim(); saveDraft(); sync() });
    who.appendChild(lab); who.appendChild(inp); barIn.appendChild(who);
    barIn.appendChild(el("div","spacer"));
    var cnt = el("div","count"); cnt.id="count"; barIn.appendChild(cnt);
    var send = el("button","send", "제출"); send.id="send";
    send.addEventListener("click", submit); barIn.appendChild(send);
    var gauge = el("div","gauge"); var gi = el("i"); gi.id="gi"; gauge.appendChild(gi);
    bar.appendChild(barWrap); bar.appendChild(gauge); app.appendChild(bar);

    var wrap = el("div","wrap"); app.appendChild(wrap);

    // 안내
    var intro = el("div","intro");
    intro.appendChild(el("h2", null, "어느 답이 현장에서 쓸 만한가"));
    var p1 = el("p", null, "정비 작업자가 장갑을 낀 채 귀로만 듣는 상황입니다. 같은 질문에 세 개의 답이 있고, 어느 것이 어느 모델인지는 가려져 있습니다. 문항마다 순서를 따로 섞었으므로 A·B·C는 문항 간에 같은 모델이 아닙니다.");
    intro.appendChild(p1);
    intro.appendChild(el("p", null, "네 가지를 각각 O · △ · X로 봐 주세요. 다른 사람의 채점은 보이지 않습니다."));
    var lg = el("ul","legend");
    CRIT.forEach(function(c){
      var li = el("li"); var b = el("b", null, c[0]);
      li.appendChild(b); li.appendChild(document.createTextNode(" — " + c[1]));
      lg.appendChild(li);
    });
    intro.appendChild(lg);
    wrap.appendChild(intro);

    // 문항
    ITEMS.forEach(function(it, qi){
      var q = el("section","q");
      var eb = el("div","eyebrow");
      eb.appendChild(el("span","n mono", String(qi+1).padStart(2,"0")));
      eb.appendChild(el("span","mono", it.pid));
      q.appendChild(eb);
      q.appendChild(el("h3","ask", it.prompt));
      var cards = el("div","cards");
      it.options.forEach(function(o){
        var card = el("article","card"); card.dataset.k = it.pid+"/"+o.label;
        var said = el("div","said");
        said.appendChild(el("div","tag", o.label));
        var body = el("div");
        var para = el("p", null, o.text);
        if(o.truncated){ var c = el("span","cut","잘림"); para.appendChild(c) }
        body.appendChild(para); said.appendChild(body); card.appendChild(said);
        var rows = el("div","rows");
        CRIT.forEach(function(c){
          var row = el("div","row");
          row.appendChild(el("div","name", c[0]));
          row.appendChild(el("div","hint", c[1]));
          var pick = el("div","pick");
          ["O","△","X"].forEach(function(v){
            var b = el("button", null, v);
            b.dataset.v = v; b.type="button";
            b.setAttribute("aria-label", c[0]+" "+v);
            var k = keyOf(it.pid, o.label, c[0]);
            b.setAttribute("aria-pressed", scores[k] === v ? "true" : "false");
            b.addEventListener("click", function(){
              scores[k] = v; saveDraft();
              Array.prototype.forEach.call(pick.children, function(x){
                x.setAttribute("aria-pressed", x.dataset.v === v ? "true" : "false");
              });
              markCard(card, it.pid, o.label);
              sync();
            });
            pick.appendChild(b);
          });
          row.appendChild(pick); rows.appendChild(row);
        });
        card.appendChild(rows); cards.appendChild(card);
        markCard(card, it.pid, o.label);
      });
      q.appendChild(cards); wrap.appendChild(q);
    });

    var end = el("div","end");
    var msg = el("div","err"); msg.id="msg"; end.appendChild(msg);
    wrap.appendChild(end);
    sync();
  }

  function markCard(card, pid, label){
    var done = CRIT.every(function(c){ return scores[keyOf(pid,label,c[0])] });
    card.classList.toggle("done", done);
  }

  function sync(){
    var n = filled();
    var cnt = $("#count"); if(cnt){ cnt.innerHTML = "<b>"+n+"</b> / "+total }
    var gi = $("#gi"); if(gi){ gi.style.width = (total ? (n/total*100) : 0) + "%" }
    var send = $("#send"); if(send){ send.disabled = !(n === total && name.length > 0) }
  }

  function firstMissing(){
    for(var i=0;i<ITEMS.length;i++){
      var it = ITEMS[i];
      for(var j=0;j<it.options.length;j++){
        for(var k=0;k<CRIT.length;k++){
          if(!scores[keyOf(it.pid, it.options[j].label, CRIT[k][0])]) return it.pid+"/"+it.options[j].label;
        }
      }
    }
    return null;
  }

  function buildDoc(subs){
    var root = document.documentElement.cloneNode(true);
    var app = root.querySelector("#app"); if(app) app.innerHTML = "";
    var s = root.querySelector("#SUBMISSIONS"); if(s) s.textContent = JSON.stringify(subs);
    return "<!doctype html>\n" + root.outerHTML;
  }

  function submit(){
    var miss = firstMissing();
    var msg = $("#msg");
    if(miss){ msg.textContent = "아직 안 고른 항목이 있습니다 — " + miss; return }
    if(!name){ msg.textContent = "이름을 적어 주세요."; return }
    msg.textContent = "";
    var send = $("#send"); send.disabled = true; send.textContent = "저장 중";

    var mine = {who:name, at:new Date().toISOString(), scores:scores};
    var next = SUBS.concat([mine]);

    var payload = JSON.stringify(mine, null, 2);
    claude.use("artifact").then(function(artifact){
      if(!artifact) throw new Error("no-capability");
      return artifact.publish(buildDoc(next));
    }).then(function(){
      try{ localStorage.setItem(MARK, "1"); localStorage.removeItem(DRAFT) }catch(e){}
      renderDone("채점이 저장됐습니다. 고맙습니다.");
    }).catch(function(){
      // 읽기 전용으로 열렸거나 저장이 거부된 경우 — 옮겨 적을 수 있게 내어 준다.
      var box = document.createElement("div");
      var ta = document.createElement("textarea");
      ta.readOnly = true; ta.value = payload;
      var p = document.createElement("p");
      p.textContent = "이 화면에서는 저장이 되지 않습니다(보기 전용으로 열렸습니다). 아래 내용을 복사해 전달해 주세요.";
      box.appendChild(p); box.appendChild(ta);
      renderDone("채점은 끝났지만 저장되지 않았습니다.", box);
      try{ ta.select() }catch(e){}
    });
  }

  if(alreadySent()){
    renderDone("이미 제출하셨습니다.");
  } else {
    render();
  }
})();
</script>
"""


def build(data, out_path):
    items, _key = blind_items(data["rows"])
    meta = {
        "when": data["meta"]["when"],
        "num_predict": data["meta"]["num_predict"],
        "title": FORM_TITLE,
    }
    html = (TEMPLATE
            .replace("__ITEMS__", json.dumps(items, ensure_ascii=False))
            .replace("__CRITERIA__", json.dumps([list(c) for c in VIEW_CRITERIA], ensure_ascii=False))
            .replace("__META__", json.dumps(meta, ensure_ascii=False))
            .replace("__TITLE__", FORM_TITLE))
    with open(out_path, "w") as f:
        f.write(html)
    n_opt = sum(len(i["options"]) for i in items)
    print(f"{out_path} — 문항 {len(items)} · 응답 {n_opt} · 채점 항목 {n_opt * len(VIEW_CRITERIA)}")
    return items


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("raw")
    ap.add_argument("--out", default="v4_quality_form.html")
    args = ap.parse_args()
    with open(args.raw) as f:
        build(json.load(f), args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
