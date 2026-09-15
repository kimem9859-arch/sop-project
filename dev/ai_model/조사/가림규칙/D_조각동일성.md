# D. 갈라진 조각의 동일 물체 판단·불확실 처리

> 조사일 2026-09-15 · 조사원: Claude Opus 5 · 1차 자료만(논문 PDF 본문·부록은 curl → `pdftotext`, 웹 지침은 curl 원문 HTML).
> 원문 사본 위치: `scratchpad/occlusion/src/`(같은 폴더의 다른 조사원 파일과 공유).
> 이미 확보된 것(재조사 안 함): VOC2006 · Open Images V4 「all visible parts」 · COCO 「multiple polygons … if occluded」.

## 요약표

| 출처 | ④ 같은 물체 판단 기준 | ⑤ 불확실 시 처리 | 원문 위치 |
|---|---|---|---|
| COCO (1405.0312) | **명시 기준 없음.** 작업자가 인스턴스마다 십자 표시 1개 → 그 표시 1개당 분할 과제 1개. 중복은 「이미 마스크로 덮인 표시는 무시」로 해소 | 품질 검증은 3~5명 투표(4/5 미만 폐기·재작업). 인스턴스가 너무 많아 구분이 어려우면 crowd | §4.2·§4.3, 부록 I "Instance Spotting"·"Instance Segmentation"·"Segmentation Verification" |
| COCOA (1509.01329) | **명시 기준 없음.** 깊이 순서를 매기게 해 「가림을 포함한 장면 기하를 추론」하게 함 | 깊이 순서가 모호하면 「렌더링이 맞게」·「가장 덜 틀린 것」 선택. 극단적이면 물체를 부분으로 나눠 라벨. 주관적 판단은 작업자 재량(검수에서 고치지 않음) | §2 가이드라인 (3), 부록 A.2 Corner Cases, A.3 |
| KINS (CVPR 2019) | **명시 기준 없음.** 전문가 1명이 박스로 인스턴스를 먼저 정하고 가림 순서를 매김 | 3명 독립 라벨 → 다수결. 합의 안 되는 부분은 「높은 확신에 이를 때까지 반복」. 범주 불명 차량은 `misc` | §3.1 (2)(3), (1) |
| Cityscapes (1604.01685 · 웹 Dataset Overview) | **명시 기준 없음.** 먼 물체부터 칠하고 가리는 물체를 위에 덮음 | 인스턴스 사이 경계가 분명히 안 보이면 **group 라벨**(평가 제외). 가림·거리 때문에 식별 어려운 영역은 `static`(void) | 부록 B, 표 8 `static`, 웹 Class Definitions 각주 `*` |
| Mapillary Vistas (ICCV 2017) | **명시 기준 없음.** Cityscapes 방식(뒤→앞 z-순서) | 범주별 「fallback annotation solutions」가 보충자료에 있다고만 적힘(⚠️ 보충자료 미확인) | §2.1.2 |
| ADE20K (1608.05442) | **명시 기준 없음.** 가려진 영역까지 전체를 칠하고, 겹침은 폴리곤 점 수로 깊이 결정 | 언급 없음(가림·잘림 여부만 속성으로 기록) | §2.1 |
| LVIS (1908.03195) | **명시 기준 없음.** 2단계에서 인스턴스마다 점 1개 표시(COCO와 같은 구조) | 분할 검증에서 2명 이상 거절 시 재작업(4회 반복) | §3.1 Stage 2~4 |
| Objects365 (ICCV 2019) | 언급 없음 | 범주 모호 → 「기능 우선」 규칙. 박스 모호 → 「범주 정의에 모호함이 생기지 않는 가장 큰 박스」 | §3.2.3 |
| VOC2007·2011 지침 | 분할 물체 언급 없음(가림 플래그만) | **「무엇인지 확신이 없으면 라벨하지 않는다」.** 10~20% 미만만 보여 클래스를 확신할 수 없어도 라벨하지 않음 | "What to label" |
| EPIC-KITCHENS VISOR (2209.13064) | **가장 가까운 규칙**: 여러 작은 조각으로 된 물체는 조각마다 칠한 뒤 **하나로 병합**. 부분 가림은 보이는 부분만 분리 | 손-물체 접촉 판단에서 합의 불가 → `inconclusive`, **학습·평가에서 제외**. 가려진 엔티티는 작업자가 무시 가능 | 부록 C.3 그림 16 (f)(g), §3.3, 부록 B.1 |
| Waymo Open Dataset 라벨 명세 | 영상에서 물체마다 트랙 1개. 2D 박스는 보이는 모든 부분 포함 | 가려져 데이터가 부족하면 「best-effort」 | docs/labeling_specifications.md |
| nuScenes 작업 지침 | 언급 없음(가시율 4단계 속성) | 언급 없음 | docs/instructions_nuscenes.md |
| CVAT 공식 문서 | `Occluded` 속성(가려짐 표시)·`Group`(`group_id`로 도형 묶기). **묶는 기준은 정하지 않음** | 언급 없음 | shape-mode-basics.md, shape-grouping.md |
| AWS SageMaker Ground Truth 박스 템플릿 | 언급 없음 | 「보이지 않는 부분은 모양을 짐작할 수 있어도 넣지 말 것」(가림 처리이지 동일성 기준 아님) | sms-bounding-box 템플릿 full-instructions |

## 출처별 원문 인용

### 1. COCO — Lin et al., arXiv 1405.0312
URL: https://arxiv.org/pdf/1405.0312

- §4.2 Instance Spotting:
  > "for each image, a worker was asked to place a cross on top of each instance of a specific category found in the previous stage."
  > 뜻: 작업자는 이미지마다 그 범주의 인스턴스 하나하나 위에 십자 표시를 하나씩 둔다.
- 부록 I "Instance Spotting":
  > "Workers are then asked to spot and click on up to 10 total instances of the given category, placing a single cross anywhere within the region of each instance."
  > 뜻: 인스턴스마다 그 영역 안 아무 곳에 십자 하나를 찍는다(최대 10개).
- 부록 I "Instance Segmentation" — 인스턴스 대응 문제 해소 방식:
  > "instance annotations across different workers may refer to different or redundant instances. To resolve this correspondence ambiguity, we sequentially post AMT segmentation tasks, ignoring instance annotations that are already covered by an existing segmentation mask."
  > 뜻: 작업자마다 찍은 표시가 서로 다른 인스턴스일 수도, 같은 인스턴스일 수도 있다. 이 대응 모호성은 분할 과제를 순서대로 올리고, 이미 만든 마스크 안에 들어가는 표시는 무시하는 방식으로 해결한다.
  - ➜ 해석: 「이 조각들이 같은 물체인가」는 **분할 작업자 한 명의 판단**에 맡겨지고, 그 판단을 대체하는 기준 문장은 없다. 다만 마스크 하나가 여러 표시를 덮으면 같은 인스턴스로 취급한다.
- §4.3 검증:
  > "Multiple workers (3 to 5) were asked to judge each segmentation and indicate whether it matched the instance well or not. Segmentations of insufficient quality were discarded and the corresponding instances added back to the pool of unsegmented objects."
  > 뜻: 3~5명이 분할이 인스턴스와 잘 맞는지 판정하고, 품질이 모자라면 폐기하고 다시 작업 목록에 넣는다.
- §4.3 crowd:
  > "many instances of the same category may be tightly grouped together and distinguishing individual instances is difficult. After 10-15 instances of a category were segmented in an image, the remaining instances were marked as “crowds” using a single (possibly multi-part) segment."
  > 뜻: 같은 범주 인스턴스가 빽빽해 개별 구분이 어려울 때, 10~15개를 칠한 뒤 나머지는 조각이 여럿일 수 있는 하나의 crowd 영역으로 표시한다.
  - ➜ crowd 는 **개수가 많을 때**의 규칙이지 「조각 하나가 같은 물체인지 모를 때」의 규칙은 아니다.

### 2. COCOA — Zhu et al., Semantic Amodal Segmentation, arXiv 1509.01329
URL: https://arxiv.org/pdf/1509.01329

- §2 가이드라인 (3) Depth ordering:
  > "In ambiguous cases, the depth order is specified so that edges are correctly ‘rendered’ (e.g., eyes go in front of the face). … Depth ordering encourages annotators to reason about scene geometry, including occlusion, and therefore improves the quality of amodal annotation."
  > 뜻: 모호하면 경계가 맞게 그려지도록 순서를 정한다. 깊이 순서는 작업자가 가림을 포함한 장면 구조를 추론하게 만든다.
- 부록 A.2 Corner Cases — Intertwined depth:
  > "Two regions might not have a valid depth ordering … In such cases we instruct the annotators to pick the depth ordering which is ‘least wrong’. In extreme cases, annotators may label parts of an object so that visibility and occlusion information are correctly specified (e.g., by marking the woman’s hands in Figure 11c)."
  > 뜻: 올바른 깊이 순서가 없으면 「가장 덜 틀린」 순서를 고른다. 극단적이면 물체를 부분으로 나눠 라벨해서라도 보임·가림 정보를 맞춘다.
- 부록 A.2 — Groups:
  > "For groups of similar objects (e.g. a crowd of people or bunch of bananas), annotators are instructed to mark a single region enclosing the entire group"
  > 뜻: 비슷한 물체 무리는 전체를 감싸는 영역 하나로 표시한다.
- 부록 A.3 — 불확실 판단의 검수 처리:
  > "We differentiate between obvious errors, which we ask workers to correct, and subjective judgements, which differ between individuals … Subjective judgements, on the other hand, are left to annotators’ discretion."
  > "common subjective judgements include the semantic label used, the exact location of hidden edges, and whether a region was sufficiently salient to warrant annotation."
  > 뜻: 명백한 오류만 고치게 하고, 사람마다 다른 주관적 판단(이름, 가려진 경계의 정확한 위치, 라벨할 만큼 두드러지는가)은 작업자 재량에 둔다.
  - ➜ 「가려진 부분이 어떻게 이어지는가」가 **주관적 판단으로 분류**돼 검수 대상에서 빠진다는 점이 ⑤에 간접 근거.
- ⚠️ CVPR 보충자료 PDF(openaccess 경로 추정)는 HTML 오류 페이지만 받음. arXiv 판의 부록 A 로 대체 확인.

### 3. KINS — Qi et al., Amodal Instance Segmentation with KINS Dataset, CVPR 2019
URL: https://openaccess.thecvf.com/content_CVPR_2019/papers/Qi_Amodal_Instance_Segmentation_With_KINS_Dataset_CVPR_2019_paper.pdf

- §3.1:
  > "First, for each image, one expert annotator locates instances within specific categories in the box level and indicates their relative occlusion order. Afterwards, three annotators label the corresponding amodal masks for each image regarding these box-level instances."
  > 뜻: 전문가 한 명이 먼저 박스로 인스턴스를 정하고 가림 순서를 표시한다. 그다음 세 명이 그 인스턴스별로 가려진 부분까지 포함한 마스크를 칠한다.
  - ➜ 인스턴스 동일성은 **전문가 1인의 박스 단계에서 확정**된다. 판단 기준 문장은 없다.
- §3.1 (3) Dense Annotation:
  > "A special focus in this step is to figure out occluded invisible parts by three annotators independently. Given slightly different predictions for the occluded pixels, our final annotation is decided by majority voting on the instance mask. For the parts that do not reach consensus, e.g., location of invisible car wheels as shown in Figure 3, more annotation iterations are involved until high confidence is reached for the wheel position."
  > 뜻: 가려진 부분은 세 명이 독립으로 추정해 다수결로 정한다. 합의가 안 되는 부분은 확신이 높아질 때까지 라벨을 반복한다.
- §3.1 (1):
  > "Here ‘misc’ refers to ambiguous vehicles that even experienced annotators cannot specify the category."
  > 뜻: 숙련 작업자도 범주를 정할 수 없는 모호한 차량은 `misc`.

### 4. D2S amodal (D2SA) — Follmann et al., arXiv 1804.08864
URL: https://arxiv.org/pdf/1804.08864
- 본문에 작업자 지침 서술 없음(데이터 구성: amodal·visible·invisible 마스크만 기술).
- ⚠️ 미확인(찾아본 곳: arXiv 본문 grep "annotat/occlu/ambigu/separate") — 조각 동일성·불확실 처리 지침 없음.

### 5. Cityscapes — Cordts et al., arXiv 1604.01685 · 공식 웹
URL: https://arxiv.org/pdf/1604.01685 · https://www.cityscapes-dataset.com/dataset-overview/

- 부록 B:
  > "The annotators were instructed to make use of the depth ordering and occlusions of the scene to accelerate labeling … distant objects are annotated first, while occluded parts are annotated with a coarser, conservative boundary (possibly larger than the actual object). Subsequently, the occluder is annotated with a polygon that lies in front of the occluded part."
  > 뜻: 먼 물체를 먼저, 가려진 부분은 넉넉하게 칠하고, 그 위에 가리는 물체 폴리곤을 덮는다.
- 웹 Class Definitions 각주 `*`:
  > "Single instance annotations are available. However, if the boundary between such instances cannot be clearly seen, the whole crowd/group is labeled together and annotated as group, e.g. car group."
  > 뜻: 인스턴스 사이 경계가 분명히 보이지 않으면 무리 전체를 함께 칠해 group 으로 표시한다(예: car group).
- 웹 각주 `+`:
  > "This label is not included in any evaluation and treated as void"
  > 뜻: 이 라벨은 평가에서 빠지고 void 로 취급.
- 논문 표 8 `static`:
  > "This includes areas of the image that are difficult to identify/label due to occlusion/distance"
  > 뜻: 가림·거리 때문에 식별·라벨이 어려운 영역을 포함한다(void 그룹).
  - ➜ 경계·식별이 불확실할 때 **개별 인스턴스로 억지로 쪼개지 않고 group 또는 void 로 보낸다**는 규칙. 「같은 물체 조각인지」가 아니라 「서로 다른 인스턴스의 경계」 불확실에 대한 것.

### 6. Mapillary Vistas — Neuhold et al., ICCV 2017
URL: https://openaccess.thecvf.com/content_ICCV_2017/papers/Neuhold_The_Mapillary_Vistas_ICCV_2017_paper.pdf
- §2.1.2:
  > "Each annotator is encouraged to start with annotating the images with object categories from back to front … Consequently, sky might be annotated with a single polygon despite showing several areas in the image."
  > 뜻: 뒤에서 앞으로 칠하므로, 하늘은 화면에 여러 조각으로 보여도 폴리곤 하나로 칠할 수 있다.
  > "Designing the annotation protocol for each object category requires a well-defined object taxonomy and systematic instructions including fallback annotation solutions for each object category (see, supplementary material for category descriptions)."
  > 뜻: 범주마다 대체 라벨 방안을 포함한 지침이 있다(보충자료).
- ⚠️ 보충자료 미확인(찾아본 곳: 본문 PDF, 웹 검색). 하늘(stuff) 예시는 인스턴스가 아니므로 우리 공구에 직접 적용하지 않음.

### 7. ADE20K — Zhou et al., arXiv 1608.05442
URL: https://arxiv.org/pdf/1608.05442
- §2.1:
  > "Given that the objects appearing in the dataset are fully annotated, even in the regions where these are occluded, there are multiple areas where the polygons from different regions overlap."
  > "When objects only partially overlap, we look at the region of intersection between the two polygons, and set as the closest object the one whose polygon has more points in the region of intersection."
  > 뜻: 가려진 영역까지 칠하므로 겹침이 생기고, 겹침 구역에 폴리곤 점이 더 많은 쪽을 앞 물체로 본다(후처리 규칙).
- 동일성·불확실 처리 작업자 지침: ⚠️ 없음(찾아본 곳: 본문 전체 grep).

### 8. LVIS — Gupta et al., arXiv 1908.03195
URL: https://arxiv.org/pdf/1908.03195
- Stage 2:
  > "take each image i ∈ Pc and mark all instances of c in i with a point."
  > 뜻: 해당 범주의 모든 인스턴스에 점을 하나씩 찍는다.
- Stage 4:
  > "If two or more annotators reject the mask, then we requeue the instance for stage 3 segmentation. Thus we only accept a segmentation if 4 annotators agree it is high-quality."
  > 뜻: 2명 이상 거절하면 재작업, 4명이 동의해야 채택.
- 조각 동일성·불확실 처리: ⚠️ 없음.

### 9. Objects365 — Shao et al., ICCV 2019
원문: 로컬 `src/obj365.pdf`(같은 폴더 다른 조사원이 받은 사본, 쪽 번호 8432 = ICCV 2019 판) · ⚠️ 공식 URL 은 이번에 직접 확인 안 함(CVF open access ICCV 2019 경로로 추정)
- §3.2.3:
  > "Classification Rule It defines a clear priority order with function-first principle for the ambiguity case in labeling."
  > 뜻: 모호할 때는 기능을 우선하는 우선순위로 범주를 정한다.
  > "The annotator is required to cover the largest bounding box which would not lead to the ambiguities of defining the object category."
  > 뜻: 범주 정의에 모호함이 생기지 않는 한도에서 가장 큰 박스로 감싼다.
- 가림으로 갈라진 조각: ⚠️ 언급 없음.

### 10. PASCAL VOC 2007·2011 Annotation Guidelines
URL: http://host.robots.ox.ac.uk/pascal/VOC/voc2011/guidelines.html (직접 수신 성공) · VOC2007 동일 경로 voc2007
- VOC2011 "What to label":
  > "All objects of the defined categories, unless: you are unsure what the object is. the object is very small (at your discretion). less than 10-20% of the object is visible, such that you cannot be sure what class it is. e.g. if only a tyre is visible it may belong to car or truck so cannot be labelled car, but feet/faces can only belong to a person."
  > 뜻: 정해진 범주의 모든 물체를 라벨하되, ① 무엇인지 확신이 없거나 ② 아주 작거나 ③ 10~20% 미만만 보여 클래스를 확신할 수 없으면 라벨하지 않는다. 바퀴만 보이면 승용차인지 트럭인지 모르므로 car 로 라벨할 수 없지만, 발·얼굴은 사람에게만 속하므로 라벨한다.
  - ➜ 「보이는 조각이 **그 물체에만 속한다고 확정되는가**」가 라벨 여부의 기준이라는 예시(바퀴 vs 발·얼굴). 조각의 **소속 판단 기준**으로 확장 해석할 수 있는 유일한 1차 문장(단, 원래는 범주 판단 조항).
- VOC2011 Occlusion:
  > "If more than 5% of the object is occluded within the bounding box, mark as Occluded."
- VOC2011 Difficult images:
  > "Images which are overly difficult to segment to the required accuracy can be left unlabelled e.g. a nest of bicycles."
  > 뜻: 요구 정확도로 분할하기 너무 어려운 이미지는 라벨하지 않고 둘 수 있다(예: 뒤엉킨 자전거 더미).
- VOC2011 Clothing/mud/snow:
  > "If an object is ‘occluded’ by a close-fitting occluder e.g. clothing, mud, snow etc., then the occluder should be treated as part of the object."
- 「class cannot be determined」 문구 그대로는 없음 → 실제 문구는 위의 "such that you cannot be sure what class it is".

### 11. EPIC-KITCHENS VISOR — Darkhalil et al., arXiv 2209.13064
URL: https://arxiv.org/pdf/2209.13064

- 부록 C.3 그림 16:
  > "(f) if partial occlusions occur, we instruct the user to only separate the visible parts of the occluded objects. For example, the knife is above the butter which is in the package."
  > 뜻: 부분 가림이면 가려진 물체의 보이는 부분만 분리해 칠한다.
  > "(g) For objects with several small pieces, e.g., the pieces of carrots, we instruct users to segment each piece individually and merge the segmentations into one."
  > 뜻: 여러 작은 조각으로 된 물체(당근 조각들)는 조각마다 칠한 뒤 하나로 병합한다.
  > "(h) we mention that if objects are truly tiny and overlapping, e.g., noodles, they can have their internal borders ignored."
  - ➜ (g)는 **물리적으로 떨어진 조각을 한 엔티티로 합치는** 1인칭 데이터셋의 유일한 명시 규칙. 단 당근 조각은 「가림으로 갈라진 한 물체」가 아니라 「실제로 여러 조각인 한 엔티티」이고, 같은 엔티티라는 판단은 **내레이션이 지정한 엔티티 이름**에서 온다(동일성 판단 기준은 아님).
- §3.3 Hand-Object Relations:
  > "Human annotators select from these segments, or alternatively identify the hand as “not in physical contact” with any object or select “none of the above” for occluded hands. Where Annotators cannot come to a consensus, we mark these as inconclusive. We ignore hands annotated with “none of the above” or inconclusive decisions during training and evaluation."
  > 뜻: 합의가 안 되면 inconclusive 로 표시하고, 그런 것은 학습·평가에서 제외한다.
- 부록 B.1:
  > "Pixel-label annotators can choose to ignore an entity if absent, occluded, highly-blurred or incorrect altogether."
  > 뜻: 엔티티가 없거나 가려졌거나 심하게 흐리거나 틀렸으면 작업자가 무시할 수 있다.
- §2(본문) "Each video was annotated by one annotator to maximise temporal consistency."
  > 뜻: 시간 일관성을 위해 영상 하나는 작업자 한 명이 전부 라벨한다.

### 12. 100DOH · EgoHOS · HOI4D
- EgoHOS (로컬 `egohos.pdf`): 가림·조각·불확실 관련 작업자 지침 문장 없음(grep "occlu/disconnect/uncertain" — 결과는 hand see-through 응용 서술뿐). ⚠️ 미확인.
- 100DOH·HOI4D: ⚠️ 미조회(시간 배분상 생략).

### 13. Waymo Open Dataset 라벨 명세 (공식 GitHub)
URL: https://github.com/waymo-research/waymo-open-dataset/blob/master/docs/labeling_specifications.md
> "2D bounding boxes are drawn as tightly as possible around objects in the camera images, and capture all visible parts of the object."
> "If an object is occluded and the data is insufficient to accurately draw the bounding box, bounding boxes are created on a best-effort basis."
> "A single track for each object is created for the duration of the video. When an object is entirely occluded in the middle of a track, it is marked as occluded for the part of the track when it is occluded."
> 뜻: 2D 박스는 보이는 모든 부분을 담는다 / 가려져 데이터가 부족하면 최선의 추정으로 박스를 만든다 / 영상에서 물체 하나당 트랙 하나, 중간에 완전히 가려지면 그 구간을 occluded 로 표시.
- ➜ 영상 트랙(앞뒤 프레임)이 **동일성의 근거**가 되는 구조. 조각 단위 규칙은 없음.

### 14. nuScenes 작업 지침 (공식 GitHub)
URL: https://github.com/nutonomy/nuscenes-devkit/blob/master/docs/instructions_nuscenes.md
> "If a pedestrian is carrying an object (bags, umbrellas, tools etc.), such object will be included in the bounding box for the pedestrian."
> 뜻: 보행자가 든 물건(가방·우산·공구)은 보행자 박스에 포함.
- 조각 동일성·불확실: ⚠️ 없음.

### 15. CVAT 공식 문서 (cvat-ai/cvat `site/content/en/docs`, develop 브랜치 원문)
- shape-mode-basics.md:
  > "Occlusion is an attribute used if an object is occluded by another object or isn't fully visible on the frame."
- objects-sidebar.md:
  > "A shape can be **Occluded**. Shortcut: **Q**. Such shapes have dashed boundaries."
- shape-grouping.md:
  > "This feature allows us to group several shapes." · "Grouped shapes will have `group_id` filed in dumped annotation."
  > 뜻: 여러 도형을 묶으면 내보낸 라벨에 `group_id`가 붙는다.
- ➜ 도구는 「조각 도형 여러 개를 한 물체로 묶는」 **수단**(group)만 제공하고, **언제 묶을지 기준은 두지 않는다.** 전체 docs(.md 전 파일) grep 결과 split/같은 물체 규칙 없음.

### 16. AWS SageMaker Ground Truth 박스 작업 템플릿
URL: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-bounding-box.html
> "Do not include parts of the object are overlapping or that cannot be seen, even though you think you can interpolate the whole shape."
> 뜻(원문 문법 그대로): 겹치거나 보이지 않는 부분은 전체 모양을 짐작할 수 있다고 생각해도 넣지 말 것.
- 조각 동일성·불확실 처리: ⚠️ 없음(템플릿 예시 지시문뿐).

### 17. Label Studio · Labelbox · Scale AI
- ⚠️ 미확인(찾아본 곳: 웹 검색 2회 — 결과는 블로그·마케팅 글뿐. 예: (블로그) labelyourdata.com, (블로그) basic.ai, (블로그) v7darwin.com — 근거로 쓰지 않음). 공식 문서에서 분할 물체·동일 인스턴스 규칙 발견 못 함.

## 결론 — 1차 자료로 정해지는 것 / 여전히 없는 것

### 정해지는 것
| # | 내용 | 근거 | 강도 |
|---|---|---|---|
| A | **동일성 판단은 어느 데이터셋도 기준 문장으로 정하지 않고, 인스턴스를 먼저 「한 점/한 박스」로 지정하는 단계의 사람 판단에 맡긴다** | COCO §4.2·부록 I, LVIS Stage 2, KINS §3.1 | 강(여러 출처 일치) — 단 「기준이 없다」는 사실에 대한 강도 |
| B | 가림 관계는 **깊이 순서(누가 앞인가)**를 명시하게 해 작업자가 장면 구조로 추론하게 한다 | COCOA §2(3), Cityscapes 부록 B, Vistas §2.1.2, KINS §3.1(2) | 중(동일성 기준이 아니라 추론 보조 수단) |
| C | 물리적으로 떨어진 조각을 **한 엔티티로 병합**하는 규칙은 1인칭 데이터셋에 있다 | VISOR 그림 16(g) | 중(가림 분할이 아니라 실제 조각 사례) |
| D | 조각이 **그 물체에만 속한다고 확정되지 않으면 라벨하지 않는다**(바퀴 vs 발·얼굴) | VOC2011 "What to label" | 중(원래 범주 판단 조항 → 소속 판단으로 확장 해석) |
| E | 불확실·합의 불가 → **학습·평가에서 제외**(void/ignore/inconclusive) | VISOR §3.3, Cityscapes `+`·`static`, VOC "unsure → 라벨 안 함" | 강(서로 독립한 3개 출처 일치) |
| F | 불확실 → **여러 명 다수결, 합의 안 되면 반복** | KINS §3.1(3), COCO·LVIS 검증 투표 | 중(인력 전제 — 1인 라벨 환경엔 그대로 못 씀) |
| G | 인스턴스 경계가 불분명하면 **group 라벨**로 묶고 평가 제외 | Cityscapes 웹 각주 `*` | 중(「서로 다른 여러 물체」 경우 — 우리 「한 물체인지」와 방향 반대) |
| H | 가려진 경계의 정확한 위치 같은 것은 **주관적 판단 → 작업자 재량, 검수에서 안 고침** | COCOA 부록 A.3 | 약~중 |

### 여전히 없는 것
- 🔴 **④ 「조각 A와 B가 같은 물체다」를 판정하는 명시 기준**(예: 두 조각이 한 직선으로 이어지는가, 가림막이 그 사이에 있는가, 색·재질이 같은가) — **조사한 1차 자료 전부에 없음.**
- 🔴 **⑤ 「같은 물체인지」 자체가 불확실할 때** 전용 규칙 — 없음. 있는 것은 **범주 불확실(VOC·KINS misc·Objects365)**, **경계 불확실(Cityscapes group)**, **관계 불확실(VISOR inconclusive)**에 대한 규칙뿐이며, 이를 유추 적용해야 한다.
- 박스 검출(YOLO) 포맷에 「무시 영역(ignore/void)」을 표기하는 방법 — 이번 조사 범위 밖(⚠️ 미확인).

## 우리 규칙 ④⑤ 제안 (근거 있는 것만)

### ④ 같은 물체 판단 기준
- **1차 자료 없음** — 명시 기준을 쓴 공개 데이터셋·도구 지침을 찾지 못했다. 아래는 **우리 결정**으로 표시해야 하며 공개 지침을 인용해선 안 된다.
- 근거 있는 부분(유추):
  - ④-1 **조각이 그 공구에만 속한다고 확정될 때만 같은 물체로 합친다** — VOC2011 「바퀴는 car/truck 모두 가능하니 라벨 안 함, 발·얼굴은 사람에게만 속하니 라벨」의 논리(결론 D, 중). 예: 드라이버 손잡이 조각과 금속 샤프트 조각 사이를 **손이 가리고 있고**, 화면에 같은 종류 공구가 하나뿐이면 합친다.
  - ④-2 **가림막(손)이 두 조각 사이에 있다는 깊이 관계를 먼저 확인한다** — COCOA·Cityscapes·KINS 가 깊이 순서로 가림 추론을 시킨 방식(결론 B, 중). 「손이 앞, 공구가 뒤」가 성립하지 않으면(예: 두 조각 사이에 손이 아닌 배경이 보임) 합치지 않는다.
  - ④-3 **앞뒤 프레임에서 같은 공구가 온전히 보였는지 참고한다** — Waymo 「물체 하나당 트랙 하나」, VISOR 「영상 하나는 한 사람이 라벨」(결론 A 보조, 약). 단 우리는 트랙 라벨이 아니므로 참고 수단일 뿐 판정 기준으로 인용하지 않는다.
- 🔴 위 ④-1~④-3 의 **조합·세부 조건(직선 연속성, 색·재질 일치 등)**은 1차 자료 없음 → 우리 결정으로 기록.

### ⑤ 판단 불가 시 처리
- 근거 있는 선택지(유추, 결론 E 강):
  - ⑤-A **그 물체는 라벨하지 않고, 이미지(프레임)를 학습·평가에서 제외한다** — VISOR inconclusive 제외, Cityscapes void, VOC 「unsure → 라벨 안 함」. 추천안.
    - 이유: 검출 박스에서 「라벨 안 함」만 하면 그 공구가 **배경(음성)으로 학습**된다. 세 출처가 공통으로 「평가·학습에서 빼는」 쪽을 택한 이유와 같다. YOLO 포맷에 무시 영역 표기가 있는지 미확인이므로 **프레임 제외**가 가장 안전하다.
  - ⑤-B 조각마다 따로 박스 — **1차 자료 없음**(어느 지침도 「모르면 쪼개라」고 하지 않는다. COCOA 「극단적이면 부분 라벨」은 깊이 순서 모순 해결용이라 해당 안 됨).
  - ⑤-C 다수결·반복 — KINS·COCO·LVIS 근거(결론 F, 중)지만 **라벨러가 1명이면 쓸 수 없다.** 2인 이상 라벨 체계가 생기면 ⑤-A 앞 단계로 추가할 수 있다.
- 기록 규칙: 제외한 프레임은 이유(「동일성 불확실」)를 남긴다 — VISOR 가 inconclusive 를 **표시한 뒤** 제외한 방식(근거 약~중).

## 조회 통계·못 찾은 것

- 원문 확인 1차 자료 **16건**: COCO · COCOA(arXiv 부록 포함) · KINS · D2SA · Cityscapes(논문+웹) · Mapillary Vistas · ADE20K · LVIS · Objects365 · VOC2007·2011 지침 · VISOR · EgoHOS · Waymo 명세 · nuScenes 지침 · CVAT 문서 전체(.md 약 160개 grep) · SageMaker Ground Truth 템플릿.
- 참고로 grep 만 한 로컬 사본: Open Images V4(1811.00982, 기확보 범위라 GroupOf 정의만 확인).
- 웹 검색 6회 · WebFetch 2회(CVAT 사이트는 도구가 거부/404 → GitHub 원문으로 대체).
- ⚠️ 못 찾은 것:
  - COCOA **CVPR 보충자료 PDF**(추정 URL 이 HTML 오류) — arXiv 부록 A 로 대체.
  - Mapillary Vistas **보충자료**(범주별 fallback 지침) — 미확인.
  - COCO 작업자 **실제 AMT 지시문 전문** — 논문엔 인터페이스 설명만 있고 지시문 원문 없음.
  - Label Studio · Labelbox · Scale AI 공식 문서의 분할 물체 규칙 — 검색에서 블로그만 나옴.
  - 100DOH · HOI4D 작업자 지침 — 미조회.
  - VOC2012 지침 원문(2011 과 같은 페이지 구조로 추정하나 별도 확인 안 함).
