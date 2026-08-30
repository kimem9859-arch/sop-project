#!/usr/bin/env bash
# SOP 절차서 빌드: HTML -> ODT -> (바닥글 삽입) -> DOCX -> PDF
# 사용법: bash docs/SOP-빌드.sh
set -e
cd "$(dirname "$0")"
NAME="SOP-PECVD정비-표준작업절차서"
SOF=/home/kimem/.claude/plugins/cache/anthropic-agent-skills/document-skills/3b3fad96af16/skills/docx/scripts/office/soffice.py
WORK=$(mktemp -d)
cp "$NAME.html" "$WORK/sop.html"
cd "$WORK"
# 1) HTML -> ODT  (HTML -> DOCX 직행은 표 폭이 뭉개진다)
python3 "$SOF" --headless --convert-to odt:"writer8" sop.html >/dev/null 2>&1
# 2) ODT 에 바닥글(문서번호·Rev·쪽/총쪽) 주입
python3 - <<'PY'
import zipfile,re
z=zipfile.ZipFile('sop.odt'); items={n:z.read(n) for n in z.namelist()}
s=items['styles.xml'].decode('utf-8')
fs=('<style:header-style/><style:footer-style><style:header-footer-properties '
    'fo:min-height="0.24in" fo:margin-top="0.2in" style:dynamic-spacing="false"/></style:footer-style>')
s=re.sub(r'(<style:page-layout style:name="Mpm[13]">.*?</style:page-layout-properties>)',
         lambda m:m.group(0)+fs, s, flags=re.S)
s=s.replace('<office:styles>','<office:styles>'
  '<style:style style:name="SOPFooter" style:family="paragraph">'
  '<style:paragraph-properties fo:text-align="center" style:justify-single-word="false"/>'
  '<style:text-properties fo:font-size="8.5pt" fo:color="#444444"/></style:style>',1)
footer=('<style:footer><text:p text:style-name="SOPFooter">SOP-PECVD-PM-001 · Rev. 0 · '
        '<text:page-number text:select-page="current">1</text:page-number> / '
        '<text:page-count>1</text:page-count></text:p></style:footer>')
for name,lay,mdp in (('Standard','Mpm1','1'),('HTML','Mpm3','2')):
    old='<style:master-page style:name="%s" style:page-layout-name="%s" draw:style-name="Mdp%s"/>'%(name,lay,mdp)
    if old in s: s=s.replace(old, old[:-2]+'>'+footer+'</style:master-page>')
items['styles.xml']=s.encode('utf-8')
zo=zipfile.ZipFile('sop2.odt','w',zipfile.ZIP_DEFLATED)
zo.writestr('mimetype',items.pop('mimetype'),zipfile.ZIP_STORED)
for n,d in items.items(): zo.writestr(n,d)
zo.close()
PY
# 3) ODT -> DOCX -> PDF
python3 "$SOF" --headless --convert-to docx:"MS Word 2007 XML" sop2.odt >/dev/null 2>&1
python3 "$SOF" --headless --convert-to pdf sop2.docx >/dev/null 2>&1
cd - >/dev/null
cp "$WORK/sop2.docx" "$NAME.docx"
cp "$WORK/sop2.pdf"  "$NAME.pdf"
rm -rf "$WORK"
echo "완료: $NAME.docx / $NAME.pdf ($(pdfinfo "$NAME.pdf" | awk '/Pages/{print $2}')쪽)"
