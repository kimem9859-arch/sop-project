# A. 데이터셋·도구 공식 지침

> 조사일 2026-09-15. PDF 논문은 arXiv/CVF 원본을 내려받아 `pdftotext`로 본문(부록 포함)을 직접 grep·발췌했다. HTML 지침은 원본을 받아 태그만 제거해 확인했다. 인용문은 원문 그대로 옮겼다(PDF 줄바꿈만 이었다).
> 용어: **modal** = 보이는 부분만 박스 / **amodal** = 가려진 부분까지 추정한 전체 박스.

## 요약표

| 출처 | ① modal/amodal | ② 갈라진 물체 | ③ 건너뛰기 기준 | 원문 위치 |
|---|---|---|---|---|
| PASCAL VOC2007 | **modal** (보이는 영역, 보이는 모든 픽셀) | 명시 없음. "보이는 모든 픽셀 포함" 규정에 따르면 조각을 모두 감싸는 박스 하나(추론) | 보이는 부분이 10~20% 미만 / 매우 작음 / 무엇인지 확실치 않음 | VOC2007 guidelines "What to label", "Bounding box" |
| PASCAL VOC2011/2012 | **modal** (위와 같음) + 가림이 5% 넘으면 Occluded 표시 | 명시 없음(위와 같은 추론) | 10~20% 미만 보임 **"클래스를 확신할 수 없을 정도로"**(예시 추가) | VOC2012 페이지(제목 "VOC2011 Annotation Guidelines") |
| MS COCO | 마스크는 **modal**(보이는 픽셀). 박스는 마스크에서 계산(논문 실험 절) | **한 인스턴스가 폴리곤 여러 개를 가질 수 있다고 명시("예: 가려졌을 때")**. pycocotools는 조각들을 마스크 하나로 합친다 → 박스는 모든 조각을 감쌈(추론) | 명시 없음. 한 이미지에 10~15개가 넘으면 나머지는 crowd | 논문 §4.3·§7, 부록 I / cocodataset.org format-data / pycocotools `annToRLE` |
| Open Images V4 | **modal** ("보이는 모든 부분을 담는 가장 작은 박스") | 명시 없음. 위 정의상 조각 전체를 담는 박스 하나(추론). extreme clicking = 물체 위의 실제 극점 4개 클릭 | 명시 없음. 속성 표시만: Occluded·Truncated·GroupOf(5개 초과가 서로 심하게 가림) | arXiv 1811.00982 §2.4.1, §2.4.2, §2.4.5 |
| LVIS | 마스크 기반. 가림 규정은 ⚠️ 미확인 | ⚠️ 미확인 | ⚠️ 미확인 | arXiv 1908.03195 |
| Objects365 | 가림 규정 없음. 박스 규칙은 "클래스를 헷갈리게 하지 않는 가장 큰 박스" | ⚠️ 미확인 | ⚠️ 미확인 | ICCV 2019 논문 §3.2.3 |
| KITTI | 가림 상태를 0~3 정수로 표시. 2D 박스가 보이는 부분인지 전체인지는 ⚠️ 미확인 | 규정 없음 | 난이도별 평가에서만 거름: Easy=완전히 보임, Moderate=일부 가림, Hard=보기 어려움 | devkit readme, 2D 벤치마크 페이지 |
| Cityscapes | 인스턴스 마스크는 결과적으로 보이는 픽셀(가려진 물체를 먼저 그리고 가리는 물체를 위에 덮어 그림) | 가림으로 인한 분리 규정은 없음. 경계가 안 보이면 묶어서 "group" | 명시 없음 | arXiv 1604.01685 부록 B / 공식 dataset-overview |
| CrowdHuman | **둘 다 제공**: full box(가려진 부분까지 완성) + visible box + head box | 해당 없음 | 명시 없음(사람 모양 물체는 무시 영역) | arXiv 1805.00123 §3.2, §4.4 |
| EPIC-KITCHENS VISOR | **modal** ("보이는 부분만") | **작은 조각 여러 개로 된 물체는 조각마다 칠한 뒤 하나로 합침** | 없거나 가려졌거나 심하게 흐리면 annotator가 무시할 수 있음 | arXiv 2209.13064 부록 Fig.16 규칙 (f)(g), 부록 entity 준비 |
| 100DOH | 손 박스·접촉 물체 박스만. 가림 규정 ⚠️ 미확인 | ⚠️ 미확인 | 결론이 안 난 이미지는 제외 | arXiv 2006.06669 §3.1 |
| EgoHOS | 가림 규정 ⚠️ 미확인 | ⚠️ 미확인 | ⚠️ 미확인 | arXiv 2208.03826 |
| Ultralytics 문서 | 규정 없음(일관성만 강조) | 규정 없음 | 규정 없음 | docs guides/data-collection-and-annotation |
| CVAT 문서 | 규정 없음. `Occluded` 속성(Q키, 점선 표시)만 있음 | 규정 없음 | 규정 없음 | docs.cvat.ai objects-sidebar |
| AWS SageMaker Ground Truth 문서(기본 템플릿) | **modal** (보이지 않는 부분은 추정해도 넣지 말 것) | 규정 없음 | 규정 없음 | sms-bounding-box 템플릿 |
| Roboflow | 공식 docs에는 없음. **블로그**는 amodal 권장 | 없음 | "가려진 것도 라벨하라" | (블로그) tips-for-how-to-label-images |
| Labelbox · Label Studio | ⚠️ 미확인 | ⚠️ 미확인 | ⚠️ 미확인 | 검색으로 찾지 못함 |

## 출처별 원문 인용

### PASCAL VOC2007
URL: http://host.robots.ox.ac.uk/pascal/VOC/voc2007/guidelines.html
- 원문: "All objects of the defined categories, unless: you are unsure what the object is. the object is very small (at your discretion). less than 10-20% of the object is visible." ("What to label")
- 뜻: 정해진 클래스 물체는 전부 라벨한다. 예외는 무엇인지 확실치 않을 때, 매우 작을 때(판단에 맡김), 보이는 부분이 10~20% 미만일 때.
- 원문: "Mark the bounding box of the visible area of the object (not the estimated total extent of the object)." / "Bounding box should contain all visible pixels, except where the bounding box would have to be made excessively large to include a few additional pixels (<5%) e.g. a car aerial." ("Bounding box")
- 뜻: 박스는 보이는 영역에 그린다(추정한 전체 크기가 아님). 보이는 픽셀은 모두 넣는다. 다만 몇 픽셀(5% 미만)을 넣으려고 박스가 지나치게 커지는 경우는 예외(예: 자동차 안테나).
- 원문: "If more than 15-20% of the object is occluded and lies outside the bounding box, mark as Truncated. Do not mark as truncated if the occluded area lies within the bounding box." ("Occlusion/ truncation")
- 뜻: 15~20% 넘게 가려졌고 그 부분이 박스 밖에 있으면 Truncated로 표시한다. 가려진 부분이 박스 안에 있으면 표시하지 않는다.
- 원문: "If an object is occluded by a close-fitting occluder e.g. clothing, mud, snow etc., then the occluder should be treated as part of the object." ("Clothing/mud/ snow etc.")
- 뜻: 옷·진흙·눈처럼 딱 붙어 가리는 것은 물체의 일부로 취급한다. (장갑 낀 손에 참고할 만한 조항)

### PASCAL VOC2011/2012
URL: http://host.robots.ox.ac.uk/pascal/VOC/voc2012/guidelines.html (페이지 제목은 "VOC2011 Annotation Guidelines")
- 원문: "less than 10-20% of the object is visible, such that you cannot be sure what class it is. e.g. if only a tyre is visible it may belong to car or truck so cannot be labelled car, but feet/faces can only belong to a person." ("What to label")
- 뜻: 10~20% 미만만 보여서 **클래스를 확신할 수 없을 때** 건너뛴다. 예: 타이어만 보이면 차인지 트럭인지 모르니 car로 라벨하지 않지만, 발·얼굴은 사람일 수밖에 없으니 라벨한다. → 2007보다 기준이 "보이는 비율"에서 "**클래스를 알아볼 수 있나**"로 구체화됐다.
- 원문: "Mark the bounding box of the visible area of the object (not the estimated total extent of the object)." (2007과 같음)
- 원문: "If more than 15-20% of the object lies outside the bounding box mark as Truncated. The flag indicates that the bounding box does not cover the total extent of the object." ("Truncation")
- 뜻: 물체의 15~20% 넘게 박스 밖에 있으면 Truncated. 박스가 물체 전체를 덮지 못한다는 표시다.
- 원문: "If more than 5% of the object is occluded within the bounding box, mark as Occluded. The flag indicates that the object is not totally visible within the bounding box." ("Occlusion")
- 뜻: 박스 안에서 5% 넘게 가려졌으면 Occluded. **가려진 부분이 박스 안에 있을 수 있다는 전제** = 조각들을 모두 감싼 박스 하나를 가정한 것으로 읽힌다(추론).
- 원문(분할 지침): "If a number of small objects are occluding an object e.g. cutlery/silverware on a dining table, they can be considered part of that object." ("Objects on tables etc.")
- 뜻: 식탁 위 식기처럼 작은 물체 여러 개가 가리면 가려진 물체의 일부로 봐도 된다.
- 갈라진 물체(조각마다 박스를 따로 그릴지 여부): VOC2007·2011/2012 지침에 **명시 없음**.

### MS COCO
- 원문: "After 10-15 instances of a category were segmented in an image, the remaining instances were marked as "crowds" using a single (possibly multi-part) segment." (arXiv 1405.0312 §4.3)
- 뜻: 한 이미지에서 같은 클래스를 10~15개 분할한 뒤 남은 것은 "crowd"로, 여러 부분일 수도 있는 세그먼트 하나로 표시했다.
- 원문: "we take a subset of 55,000 images from our dataset and obtain tight-fitting bounding boxes from the annotated segmentation masks." (§7 Algorithmic Analysis, "Bounding-box detection")
- 뜻: 라벨된 분할 마스크에서 딱 맞는 박스를 계산해 썼다. ⚠️ 논문의 **예비 실험** 설명이다. 공개 `bbox` 필드 전체의 생성 규칙으로 명시된 문장은 아니다.
- 원문: "The segmentation format depends on whether the instance represents a single object (iscrowd=0 in which case polygons are used) or a collection of objects (iscrowd=1 in which case RLE is used). Note that a single object (iscrowd=0) may require multiple polygons, for example if occluded." (https://cocodataset.org/#format-data · "1. Object Detection", 원본 github cocodataset/cocodataset.github.io `dataset/format-data.htm`)
- 뜻: 물체 하나(iscrowd=0)는 폴리곤으로 표현하는데, **가려졌을 때처럼 폴리곤이 여러 개 필요할 수 있다.** → 가림으로 갈라진 물체 = **한 인스턴스 안에 조각 폴리곤 여러 개**(조각마다 따로 인스턴스를 만들지 않음).
- 원문(공식 API 코드 주석): "# polygon -- a single object might consist of multiple parts" / "# we merge all parts into one mask rle code" (https://github.com/cocodataset/cocoapi/blob/master/PythonAPI/pycocotools/coco.py · `annToRLE`)
- 뜻: 물체 하나가 여러 조각일 수 있고, 조각들을 마스크 하나로 합친다.
- 마스크가 보이는 픽셀만인지(modal): 부록 I 인스턴스 분할 절에 "exact polygonal masks around each object instance" 수준만 있고, "보이는 부분만"이라는 문장은 ⚠️ 논문에서 찾지 못함. 위 "가려지면 폴리곤이 여러 개" 규정은 보이는 부분만 칠한다는 전제에서만 성립한다(추론).
- `bbox`가 모든 조각을 감싸는지: 명시 문장은 ⚠️ 미확인. 마스크에서 박스를 계산한다는 §7 서술과 조각들을 한 마스크로 합친다는 API를 합치면 **모든 조각을 감싼다**(추론).
- ③ 가림 때문에 건너뛰는 기준: ⚠️ 논문·format 페이지에서 찾지 못함.

### Open Images V4
URL: https://arxiv.org/abs/1811.00982
- 원문: "As instruction, our annotators were given the following general definition: Given a target class, a perfect box is the smallest possible box that contains all visible parts of the object (Figure 6 left)." (§2.4.1 "What is a perfect bounding box?")
- 뜻: 완벽한 박스는 **물체의 보이는 부분을 모두 담는 가장 작은 박스**다. → modal. "all visible parts"라서 조각이 여럿이면 모두 담는 박스 하나(추론. 갈라진 물체를 직접 다룬 문장은 없음).
- 원문: "In extreme clicking, annotators are asked to click on four physical points on the object: the top, bottom, left- and right-most points. This task is more natural and these points are easy to find." (§2.4.2)
- 뜻: extreme clicking(극점 클릭)은 물체 위에 실제로 있는 맨 위·아래·왼쪽·오른쪽 점 4개를 찍는 방식이다. 가려진 부분을 추정하는 방식이 아니다. 가려진 부분을 따로 어떻게 다루는지 적은 문장은 ⚠️ 미확인.
- 원문: "GroupOf: the box covers more than 5 instances of the same class which heavily occlude each other. Partially occluded: the object is occluded by another object in the image. Truncated: the object extends outside of the image." (§2.4.5 Attributes)
- 뜻: GroupOf = 같은 클래스 5개 초과가 서로 심하게 가림. Partially occluded = 이미지 속 다른 물체에 가려짐. Truncated = 이미지 밖으로 나감.
- 원문: "In COCO, after having individually segmented 10-15 instances in an image, other instances in the same image were grouped together in a single, possibly disconnected, crowd segment." (§2.4.5)
- 뜻: (Open Images 저자가 COCO를 설명한 문장) COCO의 crowd 세그먼트는 서로 떨어져 있을 수도 있는 세그먼트 하나다.
- 원문(공식 사이트): "drew a single box around groups of objects (e.g., a bed of flowers or a crowd of people) if they had more than 5 instances which were heavily occluding each other and were physically touching" (https://storage.googleapis.com/openimages/web/factsfigures_v7.html)
- 뜻: 서로 심하게 가리고 실제로 붙어 있는 물체가 5개를 넘으면 무리 전체에 박스 하나를 그렸다.
- ③ 건너뛰기: 가림 비율로 제외한다는 규정은 ⚠️ 찾지 못함. 속성으로 표시만 한다.

### LVIS
URL: https://arxiv.org/abs/1908.03195
- 파이프라인(카테고리 찾기 → 전수 표시 → 인스턴스 분할 → 검증) 설명만 있다. "occlu" 검색 결과 0건. 보이는 부분만인지, 가려서 갈라진 물체, 건너뛰기 기준 모두 ⚠️ 미확인(찾아본 곳: 본문 전체 grep "occlu", "visible", "bounding box", "part").

### Objects365
URL: https://openaccess.thecvf.com/content_ICCV_2019/papers/Shao_Objects365_A_Large-Scale_High-Quality_Dataset_for_Object_Detection_ICCV_2019_paper.pdf
- 원문: "The annotator is required to cover the largest bounding box which would not lead to the ambiguities of defining the object category. For example, we need to include the decoration part of the clock in the left figure of Figure 4 as the decoration part belongs to the clock and would not lead to misunderstanding of the object category." (§3.2.3 "Bounding Box Rules")
- 뜻: 클래스를 헷갈리게 하지 않는 범위에서 가장 큰 박스를 그린다(시계 장식은 넣고, 시계탑 전체로 넓히면 "tower"가 되니 넣지 않는다). 가림·조각에 관한 규정은 아니다.
- 가림 관련: 본문 "occlu"·"visible" 검색 결과 0건 → ⚠️ 미확인.

### KITTI
- 원문: "occluded    Integer (0,1,2,3) indicating occlusion state: 0 = fully visible, 1 = partly occluded 2 = largely occluded, 3 = unknown" / "truncated    Float from 0 (non-truncated) to 1 (truncated), where truncated refers to the object leaving image boundaries" (devkit_object readme.txt. 공식 zip의 사본: https://raw.githubusercontent.com/bostondiditeam/kitti/master/resources/devkit_object/readme.txt, 같은 문구가 NVIDIA DIGITS README에도 있음. ⚠️ cvlibs.net 원본 zip은 직접 열지 않음)
- 뜻: 가림 상태는 0 완전히 보임 / 1 일부 가림 / 2 크게 가림 / 3 모름. 잘림(truncation)은 이미지 경계 밖으로 나간 정도(0~1).
- 원문: "we additionally labeled the left/right boundaries of each object by making use of Mechanical Turk. We also collected labels of the object's occlusion state, and computed the object's truncation via backprojecting a car/pedestrian model into the image plane." (같은 readme)
- 뜻: 3D 박스에 더해 좌우 경계를 크라우드소싱으로 라벨하고, 가림 상태를 수집하고, 잘림은 모델을 역투영해 계산했다.
- 평가 난이도(https://www.cvlibs.net/datasets/kitti/eval_object.php?obj_benchmark=2d, WebFetch 요약): Easy "Min. bounding box height: 40 Px, Max. occlusion level: Fully visible, Max. truncation: 15%" / Moderate "25 Px, Partly occluded, 30%" / Hard "25 Px, Difficult to see, 50%".
- 뜻: 라벨을 빼는 규정이 아니라, **평가할 때** 가림·잘림·크기로 난이도를 나눈다.
- 2D 박스가 보이는 부분인지 전체인지: ⚠️ 미확인(readme·벤치마크 페이지에 명시 없음. CrowdHuman 논문 표1은 KITTI에 "Visible BBox ×"로 적었는데 이는 2차 인용이다).

### Cityscapes
- 원문: "The annotators were instructed to make use of the depth ordering and occlusions of the scene to accelerate labeling, analogously to LabelMe [60]; see Fig. 6 for an example. In doing so, distant objects are annotated first, while occluded parts are annotated with a coarser, conservative boundary (possibly larger than the actual object). Subsequently, the occluder is annotated with a polygon that lies in front of the occluded part. Thus, the boundary between these objects is shared and consistent." (arXiv 1604.01685 부록 B "Class Definitions")
- 뜻: 먼 물체부터 칠하고, 가려진 부분은 넉넉한 경계로 대충 그린 뒤 가리는 물체를 그 위에 덮어 그린다. 그래서 두 물체가 경계를 공유한다. → 최종 라벨은 보이는 픽셀이다(덮어쓴 결과. 추론).
- 원문: "Holes in an object through which a background region can be seen are considered to be part of the object. This allows keeping the labeling effort within reasonable bounds such that objects can be described via simple polygons forming simply-connected sets." (같은 절)
- 뜻: 물체에 뚫린 구멍으로 배경이 보여도 물체의 일부로 친다(구멍 없는 단순 폴리곤으로 그리기 위해).
- 원문: "Single instance annotations are available. However, if the boundary between such instances cannot be clearly seen, the whole crowd/group is labeled together and annotated as group, e.g. car group." (https://www.cityscapes-dataset.com/dataset-overview/ · Features/Classes)
- 뜻: 인스턴스별 라벨이 있지만, 인스턴스 사이 경계가 안 보이면 묶어서 "group"(예: car group)으로 라벨한다.
- **가림 때문에 한 인스턴스가 둘로 나뉘는 경우를 다룬 문장**: ⚠️ 미확인(논문 본문·부록, 공식 overview 확인).

### CrowdHuman
URL: https://arxiv.org/abs/1805.00123
- 원문: "We annotate a full bounding box of each individual exhaustively. If the individual is partly occluded, the annotator is required to complete the invisible part and draw a full bounding box." / "We crop each annotated instance from the images, and send these cropped regions for annotators to draw a visible bounding box." / "We further send the cropped regions to annotate a head bounding box." (§3.2 Image Annotation)
- 뜻: 사람마다 full box를 빠짐없이 그린다. 일부 가려졌으면 **안 보이는 부분을 채워** 전체 박스를 그린다(amodal). 그다음 잘라낸 영역에 visible box(보이는 부분)를, 이어서 head box를 그린다.
- 원문: "Visible Body Detection As the human have different poses and occlusion conditions, the visible regions may be quite different for each individual person, which brings many difficulties to human detection." / "Full Body Detection Detecting full body regions is more difficult than detecting the visible part as the detectors should predict the occluded boundaries of the full body. To make matters worse, the ground-truth annotation might be suffered from high variance caused by different decision-makings by different annotators." (§4.4)
- 뜻: 세 종류를 **각각 별도 검출 과제**(보이는 몸 / 전체 몸 / 머리)의 정답으로 쓴다. 전체 몸 검출은 가려진 경계를 예측해야 해서 더 어렵고, **정답 자체도 annotator마다 판단이 달라 편차가 크다**고 저자가 인정한다.
- 원문: "the crowd occlusion makes the detector sensitive to the NMS threshold" 요지 (Abstract/§1: 겹친 박스가 NMS에 억제됨) — 둘 다 제공하는 이유로 서술된 부분. 정확한 한 문장은 PDF 줄바꿈이 두 단으로 섞여 원문 복원을 보장하지 못해 요지만 적는다.

### EPIC-KITCHENS VISOR (손에 쥔 물체)
URL: https://arxiv.org/abs/2209.13064 (부록 Figure 16 규칙)
- 원문: "(a) For left and right hands, segmentations include all visible parts of the hand and arms."
- 뜻: 손 마스크는 손과 팔의 보이는 부분 전부.
- 원문: "Next, (f) if partial occlusions occur, we instruct the user to only separate the visible parts of the occluded objects. For example, the knife is above the butter which is in the package."
- 뜻: 일부 가림이 있으면 **가려진 물체는 보이는 부분만** 나눠 칠한다(modal).
- 원문: "(g) For objects with several small pieces, e.g., the pieces of carrots, we instruct users to segment each piece individually and merge the segmentations into one."
- 뜻: 여러 조각으로 된 물체(당근 조각들)는 조각마다 칠한 뒤 **하나로 합친다**. ⚠️ 이 규칙은 "물체 자체가 여러 조각"인 경우이고, "손에 가려 한 물체가 갈라져 보이는" 경우를 직접 말한 것은 아니다.
- 원문: "(c) if the object is contained within another (but still partially or fully visible), we ask the user to only segment the visible parts of the contained object and ignore the container."
- 뜻: 다른 물체 안에 들어 있어도 보이면 그 보이는 부분만 칠한다.
- 원문: "Pixel-label annotators can choose to ignore an entity if absent, occluded, highly-blurred or incorrect altogether." (부록 Entity preparation)
- 뜻: 물체가 없거나, 가려졌거나, 심하게 흐리거나, 목록이 틀렸으면 annotator가 건너뛸 수 있다. 가림 **비율** 기준은 없다.
- 박스: VISOR는 마스크 데이터셋이다. 박스 규칙은 ⚠️ 없음.

### 100DOH (100 Days of Hands)
URL: https://arxiv.org/abs/2006.06669
- 원문: "For every hand in each image, we obtained the following annotations: (a) a bounding box around the hand; (b) side: left / right, ... (d) a bounding box around the object the person is contacting irrespective of name." (§3.1 Annotation)
- 뜻: 손마다 손 박스, 좌우, 접촉 상태, 접촉한 물체의 박스(이름 없이)를 라벨했다.
- 원문: "We only included images on which we could get conclusive judgments from workers." (§3.1)
- 뜻: 작업자 판단이 확정된 이미지만 넣었다.
- 손에 가려진 물체 박스를 보이는 부분만 그리는지, 갈라지면 어떻게 하는지: ⚠️ 미확인(본문 grep "occlu", "visible"은 성능 논의에서만 나옴. 상세 지침 문서는 공개본에서 찾지 못함).

### EgoHOS
URL: https://arxiv.org/abs/2208.03826
- 손·상호작용 물체의 픽셀 마스크 데이터셋. 가림·조각 처리 지침 문장은 ⚠️ 미확인(본문·부록 grep "occlu"는 "hand see through" 응용에서만 나옴).

### Ultralytics 공식 문서
URL: https://docs.ultralytics.com/guides/data-collection-and-annotation/ (원본 md: github ultralytics/ultralytics `docs/en/guides/data-collection-and-annotation.md`)
- 원문: "**Consistency**: Keep your annotations uniform. Set standard criteria for annotating different types of data, so all annotations follow the same rules." (Establishing Labeling Rules)
- 원문: "**Clear Annotation Guidelines**: Provide detailed instructions with examples to ensure all annotators interpret tasks consistently. For instance, when labeling birds, specify whether to include the entire bird or just specific parts."
- 뜻: 기준을 정해 일관되게 적용하라. 새를 라벨한다면 새 전체를 넣을지 일부만 넣을지 **스스로 정해 명시하라**. → Ultralytics는 가림 규칙을 정해 주지 않고 **사용자 몫**으로 둔다. "occlu"·"partial"·"visible" 검색 0건.

### CVAT 공식 문서
URL: https://docs.cvat.ai/docs/annotation/annotation-editor/objects-sidebar/
- 원문: "A shape can be **Occluded**. Shortcut: **Q**. Such shapes have dashed boundaries." (Objects properties)
- 뜻: 도형에 Occluded 속성을 켤 수 있고(Q키), 켜면 테두리가 점선이 된다. 가림 **표시 기능**만 있고, 박스를 어떻게 그릴지 정한 규칙은 ⚠️ 미확인.

### AWS SageMaker Ground Truth 공식 문서 (추가로 찾음)
URL: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-bounding-box.html · "Provide a Template for Bounding Box Labeling Jobs" 기본 템플릿의 full-instructions
- 원문: "Boxes should fit tight around each object" / "Do not include parts of the object are overlapping or that cannot be seen, even though you think you can interpolate the whole shape." / "If the target is off screen, draw the box up to the edge of the image."
- 뜻: 박스는 물체에 딱 맞게. **겹쳐 가려졌거나 안 보이는 부분은 전체 모양을 짐작할 수 있어도 넣지 말 것**(modal). 화면 밖으로 나가면 이미지 가장자리까지만.
- 주의: 수정해 쓰라고 준 **예시 템플릿** 문구다(원문 영어 문법 오류도 그대로 옮김).

### Roboflow
- 공식 docs(https://docs.roboflow.com/llms-full.txt, 약 600KB 전문): "occlu" 검색 0건 → 공식 규정 ⚠️ 없음. help.roboflow.com의 "Labeling Guide: Object Detection"은 docs.roboflow.com으로 넘어가며 404.
- (블로그) 원문: "it is commonly best practice to label the occluded object as if it were fully visible - rather than drawing a bounding box for only the partially visible portion" / "Both objects should be labeled, even if the bounding boxes overlap. (It is a common misconception that boxes cannot overlap.)" (https://blog.roboflow.com/tips-for-how-to-label-images/ · "Label Occluded Objects", Joseph Nelson. WebFetch 요약본에서 인용)
- 뜻: 가려진 물체도 **다 보이는 것처럼(amodal)** 라벨하는 것이 흔한 관행이라고 한다. 박스가 겹쳐도 둘 다 라벨한다. ⚠️ 블로그이고 근거 데이터는 없다. 위 1차 자료들(VOC·Open Images·SageMaker)과 **반대**다.

### Labelbox · Label Studio
- ⚠️ 미확인(찾아본 곳: WebSearch "Labelbox docs occluded", "Label Studio docs occlusion". 결과는 편집기 사용법·템플릿 페이지뿐, 가림 규칙 없음).

## 결론 (1차 자료만으로 말할 수 있는 것 / 없는 것)

**말할 수 있는 것**
1. **① 일반 물체 검출 데이터셋의 기본은 modal(보이는 부분만)이다.** VOC 2007·2011/2012, Open Images V4("smallest possible box that contains all visible parts"), AWS Ground Truth 기본 템플릿이 명시한다. COCO·VISOR·Cityscapes는 마스크가 보이는 픽셀 기준이다. **amodal(전체 추정)을 명시한 1차 자료는 CrowdHuman뿐**이고, 그마저 visible box를 함께 주면서 "full box 정답은 annotator마다 편차가 크다"고 인정한다. Roboflow의 amodal 권장은 블로그다.
2. **② 가림으로 갈라진 물체를 직접 다룬 1차 자료는 COCO뿐이다**: "a single object (iscrowd=0) may require multiple polygons, for example if occluded". 조각마다 인스턴스를 따로 만들지 않고 **인스턴스 하나에 조각 여러 개**다. 공식 API는 조각들을 마스크 하나로 합친다. VISOR도 여러 조각 물체를 "merge the segmentations into one"으로 하나로 합친다. Open Images "all visible parts"와 VOC "all visible pixels"도 문장 그대로 적용하면 박스 하나다. → **"보이는 조각을 모두 감싼 박스 하나"가 여러 출처에서 같은 방향으로 나온다.** "조각마다 박스"나 "가장 큰 조각만"을 규정한 출처는 **찾지 못했다**.
   - 단, "COCO bbox 필드가 모든 조각을 감싼다"는 명시 문장은 없다. §7의 "마스크에서 박스 계산"과 API의 조각 병합에서 끌어낸 추론이다.
3. **③ 건너뛰는 수치 기준은 VOC만 준다**: 보이는 부분 10~20% 미만. VOC2011/2012는 여기에 "클래스를 확신할 수 없을 정도로"를 붙였다(발은 사람일 수밖에 없으니 라벨함). Open Images·KITTI·CVAT는 건너뛰지 않고 **속성으로 표시**하는 방식이다(Occluded·Truncated / 0~3). KITTI는 가림 정도를 평가 난이도로만 쓴다. VISOR는 "가려졌으면 무시 가능"이라고만 적었고 비율 기준은 없다.
4. 장갑 참고: VOC는 "close-fitting occluder e.g. clothing … treated as part of the object"(딱 붙어 가리는 옷 등은 물체의 일부). VISOR는 장갑을 별도 클래스(left/right glove)로 두고, 손에 낀 장갑을 손처럼 취급한다.

**말할 수 없는 것**
- 손가락 끝에 일부 가려진 **작은 버튼**, 손에 쥐어 **두 조각으로 갈라진 공구**를 직접 다룬 공식 규정은 찾지 못했다(100DOH·EgoHOS·VISOR 모두 해당 문장 없음).
- modal과 amodal 중 어느 쪽이 **YOLO 검출 성능에 유리한지**를 보인 근거는 이 조사 범위(라벨링 지침)에 없다.
- Ultralytics는 가림 규칙을 정하지 않고 "스스로 정해 일관되게 쓰라"고만 한다. 따라서 **우리 규칙은 우리가 정해 문서화해야 한다.**

## 조회 통계·못 찾은 것
- 원문 확보·확인: PDF 9편(COCO 1405.0312, Open Images 1811.00982, LVIS 1908.03195, CrowdHuman 1805.00123, Cityscapes 1604.01685, VISOR 2209.13064, 100DOH 2006.06669, EgoHOS 2208.03826, Objects365 ICCV'19). HTML 원본 6건(VOC2007, VOC2011/2012, COCO format-data, pycocotools coco.py, Ultralytics md, Roboflow llms-full.txt). 공식 페이지 WebFetch 6건(Ultralytics, CVAT objects-sidebar, Open Images v7 factsfigures, KITTI 2D benchmark, SageMaker bbox, Cityscapes overview은 curl). KITTI devkit readme는 공식 zip 사본(GitHub). WebSearch 3회. 블로그 1건(Roboflow, 표시함).
- 원문 대신 WebFetch 요약에서 가져온 인용(작은 모델이 옮긴 것이라 원문과 조금 다를 수 있음): Open Images v7 사이트 문장, KITTI 난이도 표, CVAT 문장, Roboflow 블로그 문장.
- ⚠️ 못 찾은 것:
  - VOC2008~2010 지침 페이지(열어 보지 않음. 2011/2012가 가장 최신이고 2007과 비교함)
  - COCO: "마스크는 보이는 부분만"과 "bbox = 모든 조각을 감싸는 박스"를 명시한 문장, 가림 건너뛰기 기준
  - Open Images: extreme clicking에서 가려진 극점을 어떻게 처리하는지(Papadopoulos et al. 2017 원 논문은 열지 않음)
  - LVIS·Objects365·100DOH·EgoHOS의 가림 규정
  - KITTI 2D 박스가 보이는 부분인지 전체인지
  - Cityscapes에서 가림으로 나뉜 인스턴스의 처리
  - Labelbox·Label Studio 문서의 가림 규칙
  - Roboflow 공식 docs의 가림 규칙(블로그에만 있음)
  - CrowdHuman이 visible box와 full box를 둘 다 제공하는 이유를 한 문장으로 적은 원문(두 단 PDF 줄바꿈이 섞여 요지만 적음)
