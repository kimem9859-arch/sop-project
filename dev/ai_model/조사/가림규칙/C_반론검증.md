# C. 반론·실무 검증

> 조사일 2026-09-15 · 조사원 = 반대 입장 검증(Claude Opus 5) · 1차 자료만 판정 근거로 씀. `(비1차)`는 참고용.
> 유지보수자 신분은 GitHub API `author_association` 로 확인했다(MEMBER = Ultralytics 조직원, COLLABORATOR = 저장소 협력자).

## 잠정안 (가)(나)(다) 판정표

| 항목 | 반례 근거 있음/없음 | 강도(강/중/약) | 핵심 출처 |
|---|---|---|---|
| (가) 가려지면 보이는 부분만(modal) | **있음** — 단 「과제가 다를 때」의 반례 | **중** | 반례: Ultralytics 협력자 Y-T-G #20275(추적엔 전체 박스), Ultralytics 조직원 Laughing-q #1240(전체 범위가 필요하면 amodal도 됨), Roboflow 공식 블로그(가려져도 전체처럼), CrowdHuman(전신 박스 병행), COCOA(전체 범위 라벨도 작업자 간 일관됨). 지지: VOC2006, Open Images V4, Waymo 2D, glenn-jocher #22857, Ultralytics Academy |
| (나) 두 조각은 박스 하나로 | **거의 없음** (조각별 박스 권고는 못 찾음) | **약** | 지지: glenn-jocher #22857(「한 대상에 박스 두 개 쓰지 말라」), COCO 형식(한 물체에 폴리곤 여러 개 + 감싸는 박스 하나), VOC2006. 약한 반례: Laughing-q #1240(박스에 다른 물체가 많이 들어가지 않게), glenn-jocher #22857(가림막이 클래스로 학습되면 hard negative 추가, 또는 분할/OBB로) |
| (다) 30% 이하·불확실 → 라벨 안 함 | **있음** (누락 라벨 = 배경 학습) | **중** | 반례: Soft Sampling 논문, Ultralytics Academy(부분 라벨 → 「가끔은 배경」 학습), KITTI DontCare. 완화: Ultralytics 에는 **무시 플래그가 없다**(소스 확인). 지지: glenn-jocher #21447(구별 못 할 것은 비워둬도 됨), VOC2006(<10~20% 보이면 라벨 안 함), glenn #22857(~75% 가려지면 건너뜀) |
| 질문 4 (손끝×modal 박스 궁합) | **직접 연구 근거 없음** | — | ⚠️ 미확인. 간접: 산업 1인칭 HOI 논문은 손·물체 박스 IoU로 접촉을 판정(arXiv 2507.13326), VISOR는 「겹침과 접촉 구분이 어렵다」고 명시 |

---

## 질문별 원문 인용

### Q1. (가)의 반례 — amodal(전체 범위) 권장 1차 자료

**① Ultralytics 조직원 Laughing-q — #1240 (MEMBER)**
질문자가 「pixel-based(보이는 부분) vs amodal」을 그림으로 물음.
> "For me I'd like to recommend `pixel-based`, with each box does not contain many parts of other boxes which is better for training. But if it's a special case that you want to detect the whole part of the car(including visible and invisible parts), you can also take the `amodal` way, it could work."
> → (뜻) 나는 보이는 부분 박스를 권한다 — 박스에 다른 박스 영역이 많이 섞이지 않아 학습에 낫다. 다만 **보이지 않는 부분까지 물체 전체를 검출하고 싶은 특수한 경우엔 amodal도 된다.**
- https://github.com/ultralytics/ultralytics/issues/1240#issuecomment-1452861434
- 판정: (가) **지지**. 반례는 「전체 범위가 필요한 과제」로 한정.

**② Ultralytics 협력자 Y-T-G — #20275 (COLLABORATOR)**
질문: 겹친 축구 선수, 보이는 부분만 vs 전신 추정.
> "Labeling full would be better for tracking since it would keep the sizes of the boxes consistent even if occluded.."
> → (뜻) **추적(tracking)** 에는 전체 라벨이 낫다 — 가려져도 박스 크기가 일정하게 유지되니까.
- https://github.com/ultralytics/ultralytics/issues/20275#issuecomment-2820476392
- 판정: (가)의 **실질 반례**. 이유 = 박스 크기 안정성. 우리 버튼 판정도 「박스 위치·크기 안정」이 중요하다는 점에서 관련 있음(아래 Q4).

**③ Ultralytics 협력자 Y-T-G · 조직원 glenn-jocher — #21828 (분할, 못 더미에서 가운데가 끊긴 물체)**
> Y-T-G: "For small occlusive, like you showed in first image, you label the occluded part like it's visible by guessing the actual contour."
> → (뜻) 작은 가림이면 가린 부분도 **보이는 것처럼 실제 윤곽을 추정해** 라벨한다.
> glenn-jocher: "For occlusions, keep annotating the full object contour as if visible—that's standard for instance segmentation"
> → (뜻) 가림이 있으면 **보이는 것처럼 전체 윤곽**을 계속 라벨하라 — 인스턴스 분할의 표준이다.
- https://github.com/ultralytics/ultralytics/issues/21828#issuecomment-3227284705
- https://github.com/ultralytics/ultralytics/issues/21828#issuecomment-3229389918
- ⚠️ **같은 glenn-jocher 가 #23783 에서는 반대로 말함** (분할, 2026년 댓글):
> "for YOLO segmentation you generally should annotate only the visible region of each instance (and omit fully-occluded instances), otherwise you're asking for amodal segmentation which Ultralytics YOLO doesn't target"
> → (뜻) YOLO 분할은 대체로 **보이는 영역만** 라벨하라. 아니면 Ultralytics YOLO가 목표로 하지 않는 amodal 분할을 요구하는 셈이다.
- https://github.com/ultralytics/ultralytics/issues/23783#issuecomment-4015791014
- 판정: **유지보수자 답변끼리 일관되지 않다.** 둘 다 분할(segment) 과제이고, 검출(detect)에 대해선 아래 #22857이 modal로 명확함.

**④ Roboflow 공식 블로그 — "How to Label Image Data for Computer Vision Models" (Joseph Nelson, Roboflow 공동창업자)** — 회사 공식 블로그이나 docs가 아님 → `(준1차: 도구사 공식 블로그)`
> "It is best practice to label objects even when they are occluded. Moreover, it is commonly best practice to label the occluded object as if it were fully visible - rather than drawing a bounding box for only the partially visible portion of the object."
> → (뜻) 가려져도 라벨하는 것이 모범 관행이다. 나아가 **가려진 물체를 완전히 보이는 것처럼** 라벨하는 것이 흔한 모범 관행이다 — 보이는 부분만 박스치지 말고.
> "Even if object is blocking view of another, it is best to label them both as if they were both fully visible."
- https://blog.roboflow.com/tips-for-how-to-label-images/
- 판정: (가)의 **가장 직접적인 반례**. 단 근거(왜 낫나)는 제시하지 않음 — 체스 말 예시뿐. Roboflow **docs(docs.roboflow.com)** 에서 같은 규정은 ⚠️ 미확인.

**⑤ CrowdHuman (arXiv 1805.00123, 초록)**
> "Each human instance is annotated with a head bounding-box, human visible-region bounding-box and human full-body bounding-box."
> → (뜻) 사람마다 머리 박스·**보이는 영역 박스·전신 박스**를 모두 단다.
- https://arxiv.org/abs/1805.00123
- 판정: 가림이 심한 과제에서는 **둘 다** 단다는 선례. 한 가지만 고르라는 근거는 아님.

**⑥ nuScenes 작업자 지침 (3D 직육면체)**
> "For objects with few LIDAR or RADAR points, use the images to make sure boxes are correctly sized. If you see that a cuboid is too short in the image view, adjust it to cover the entire object based on the image view."
> → (뜻) 점이 적은 물체는 영상으로 크기를 확인하고, 짧으면 **물체 전체를 덮도록** 늘린다.
- https://github.com/nutonomy/nuscenes-devkit/blob/master/docs/instructions_nuscenes.md
- 판정: 3D 과제(물리적 크기가 필요) — 2D 검출 라벨 규칙의 반례로는 **약함**.

**⑦ Waymo Open Dataset 논문 (arXiv 1912.04838, ar5iv 본문)**
> "We annotated each object with a tightly fitting 4-DOF image axis-aligned 2D bounding box which is complementary to the 3D boxes and their amodal 2D projections."
> → (뜻) 카메라 영상엔 **꼭 맞는** 축정렬 2D 박스를 달았고, 이는 3D 박스와 그 **amodal 2D 투영**을 보완한다.
- https://ar5iv.labs.arxiv.org/html/1912.04838
- 판정: 2D 박스는 modal 쪽, amodal은 3D에서 파생 — (가) **지지**. ("visible parts only" 문구 자체는 검색 요약에만 있고 원문에서 ⚠️ 미확인.)

**⑧ COCOA — Semantic Amodal Segmentation (Zhu et al., arXiv 1509.01329, 초록)**
> "we create an amodal segmentation of each image: the full extent of each region is marked, not just the visible pixels. ... We show that the proposed full scene annotation is surprisingly consistent between annotators, including for regions and edges."
> → (뜻) 보이는 픽셀뿐 아니라 **전체 범위**를 표시했고, 이 라벨은 **작업자 간에 놀랄 만큼 일관**됐다.
- https://arxiv.org/abs/1509.01329
- 판정: 우리 근거 중 「작업자마다 추정이 달라진다」를 **약화시키는 반례**. 단 BSDS 500장·분할 과제, 다수 작업자 조건.

**⑨ (가)를 지지하는 1차 자료 (대조용)**
- VOC2006 지침: "Mark the bounding box of the visible area of the object (not the estimated total extent of the object)." → 보이는 영역의 박스(추정 전체 범위 아님). https://www.robots.ox.ac.uk/~vgg/projects/pascal/VOC/voc2006/guidelines.html
- Open Images V4 논문 §2.4.1: "a perfect box is the smallest possible box that contains all visible parts of the object" → 완벽한 박스 = 물체의 **보이는 부분을 모두 담는 가장 작은 박스**. https://arxiv.org/html/1811.00982
- glenn-jocher #22857 (MEMBER, 검출): "draw a tight box around the *visible pixels only* (don't "guess" the hidden extent)" → **보이는 픽셀만** 꼭 맞게, 숨은 범위를 추정하지 말라. https://github.com/ultralytics/ultralytics/issues/22857#issuecomment-3679897821
- Ultralytics Academy "Annotation Best Practices": "box the visible part — not where you imagine the rest continues" → 보이는 부분을 박스치라, 나머지가 이어진다고 상상한 곳이 아니라. https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices (WebFetch 요약 경유 인용 — 원문 대조 ⚠️ 부분 확인)

**Q1 결론**: amodal을 **권장**하는 1차 자료는 있다(Roboflow 블로그, Y-T-G 추적, 분할 한정 유지보수자 답변 일부). 권장 이유는 **① 추적 시 박스 크기 안정 ② 「물체 전체」가 과제 목표일 때**. 검출(detect) 과제에 대한 Ultralytics 유지보수자 최신 답변(#22857)과 VOC·Open Images·Waymo 2D는 modal. → (가)는 뒤집힐 정도는 아니나, **「왜 modal인가」의 근거 중 '작업자 추정 불일치'는 COCOA로 약화**된다.

---

### Q2. (나)의 반례 — 조각별 박스 / 감싸면 오검출

**① glenn-jocher — #22857 (MEMBER) — 가장 직접적인 답**
> "draw one tight axis-aligned box around the visible pixels only, even if that box includes some rifle/background; don't split one body part into multiple boxes just to avoid overlap."
> → (뜻) 보이는 픽셀을 감싸는 **꼭 맞는 박스 하나**를 그려라 — 그 박스에 소총·배경이 일부 들어가더라도. 겹침을 피하려고 **한 부위를 박스 여러 개로 쪼개지 말라.**
- https://github.com/ultralytics/ultralytics/issues/22857#issuecomment-4526160135

> "I wouldn't use two `body` boxes for one target; keep one consistent rule and label a single tight box around the visible part ... If beams are being learned as part of the class, that usually points to annotation consistency plus missing hard negatives, so add more beam-heavy negatives and, if you need to exclude occluders precisely, switch that class to segmentation or OBB instead of splitting one instance into multiple detect boxes"
> → (뜻) 한 대상에 박스 두 개는 쓰지 않겠다. 가림막(빔)이 클래스의 일부로 학습되면 대개 라벨 일관성 + **hard negative(가림막만 있는 음성 사례) 부족** 문제이니 그런 음성 이미지를 늘리고, 가림막을 정밀히 빼야 하면 **박스를 쪼개지 말고 분할·OBB로 바꿔라.**
- https://github.com/ultralytics/ultralytics/issues/22857#issuecomment-4587806314
- 판정: (나) **강하게 지지**. 동시에 「감싼 박스 안의 가림막이 학습될 수 있다」는 위험을 유지보수자가 **인정**하고 대응책(음성 사례 추가)을 제시 — 이것이 (나)의 약한 반례이자 보완점.

**② COCO 데이터 형식 (cocodataset.org, Data format §1)**
> "Note that a single object (iscrowd=0) may require multiple polygons, for example if occluded. ... In addition, an enclosing bounding box is provided for each object"
> → (뜻) 한 물체(iscrowd=0)도 **가려지면 폴리곤이 여러 개** 필요할 수 있다. 그리고 물체마다 **감싸는 박스(하나)** 를 준다.
- https://cocodataset.org/#format-data
- 판정: 조각은 여러 폴리곤이지만 **인스턴스·박스는 하나** → (나) 지지.
- Ultralytics 쪽도 COCO 다중 폴리곤을 **한 인스턴스로 이어 붙인다**: glenn-jocher #6289 "the `merge_multi_segment` function in `ultralytics/data/converter.py` is specifically designed to address this issue. This function connects multiple segments with minimum distance between them, precisely for handling cases like occluded objects." → 여러 조각을 최소 거리로 연결해 가려진 물체를 하나로 처리. https://github.com/ultralytics/ultralytics/issues/6289#issuecomment-2808810530

**③ VOC2006 지침**
> "If more than 15-20% of the object is occluded and lies outside the bounding box, mark as 'Truncated'. Do not mark as truncated if the occluded area lies within the bounding box."
> → (뜻) 가린 부분이 **박스 안에 있으면** 잘림으로 표시하지 않는다 — 즉 가운데가 가려져도 박스는 가린 영역을 포함할 수 있음을 전제.
- https://www.robots.ox.ac.uk/~vgg/projects/pascal/VOC/voc2006/guidelines.html

**④ Open Images V4** — 갈라진 물체에 대한 명시 규칙은 ⚠️ 미확인. 정의("smallest possible box that contains **all** visible parts")상 모든 조각을 담는 박스 하나가 된다(해석). `Partially occluded` 속성만 표시: "Partially occluded: the object is occluded by another object in the image." https://arxiv.org/html/1811.00982

**⑤ 약한 반례 — Laughing-q #1240**: "each box does not contain many parts of other boxes which is better for training" → 박스에 다른 물체가 많이 섞이지 않는 게 학습에 낫다. (조각 분리를 권한 것은 아니고 modal vs amodal 맥락.)

**⑥ 손은 박스에 넣지 말라 — glenn-jocher #16181 (MEMBER)**
> "label only the weapon itself, not the hand. This approach enhances model accuracy by focusing on the object of interest and improves generalization across different scenarios."
> → (뜻) 쥔 칼·총은 **무기만** 라벨하고 손은 넣지 말라.
- https://github.com/ultralytics/ultralytics/issues/16181#issuecomment-2341275823
- 판정: 「손을 의도적으로 박스에 포함하지 말라」는 뜻. (나)의 「보이는 조각을 모두 감싸는 박스」는 결과적으로 가운데 손을 포함하지만 **목적이 물체 범위**이므로 충돌은 아님(해석).

**Q2 결론**: 조각마다 따로 박스치라는 1차 자료는 **찾지 못했다**. 반대로 Ultralytics 유지보수자가 **명시적으로 금지**(#22857). 남는 위험은 「박스 안 손이 공구 클래스 특징으로 학습」 — 유지보수자 처방은 **손만 있는 음성 사례 추가**.

---

### Q3. (다)의 반례 — 라벨 안 하면 배경으로 학습

**① Soft Sampling for Robust Object Detection (Wu et al., arXiv 1806.06986, 초록)**
> "We study the robustness of object detection under the presence of missing annotations. In this setting, the unlabeled object instances will be treated as background, which will generate an incorrect training signal for the detector. Interestingly, we observe that after dropping 30% of the annotations (and labeling them as background), the performance of CNN-based object detectors like Faster-RCNN only drops by 5% on the PASCAL VOC dataset."
> → (뜻) 라벨이 빠진 물체는 **배경으로 취급돼 틀린 학습 신호**를 만든다. 다만 라벨 30%를 빼도 Faster-RCNN 성능은 VOC에서 **5%만** 떨어졌다.
- https://arxiv.org/abs/1806.06986
- 판정: 해악은 **실재하나 크기는 제한적**(무작위 30% 누락 기준, 2단계 검출기). 심하게 가려진 사례만 빠지는 우리 경우와 분포가 다름 → 직접 수치 인용은 불가.

**② Ultralytics Academy — Annotation Best Practices** (WebFetch 요약 경유 — 원문 대조 ⚠️ 부분 확인)
> "A model trained on partially-labeled images learns 'sometimes objects are background' — and stops finding them."
> → (뜻) 일부만 라벨된 이미지로 학습하면 「가끔 물체는 배경」이라고 배워 **찾기를 멈춘다.**
> "Handle occluded / partial objects consistently. Pick one rule (e.g. 'label if ≥ 50% visible') and stick to it."
> → (뜻) 가림 물체는 **규칙 하나를 정해 일관되게**(예: 50% 이상 보이면 라벨).
- https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices

**③ glenn-jocher — #21447 (MEMBER) — 우리 (다)와 같은 딜레마**
> "Keep frames with mixed visibility but only annotate the clearly identifiable animals, leaving severely occluded ones unannotated. ... For frames with only ambiguous/truncated animals, exclude them completely to maintain dataset quality."
> → (뜻) 섞인 프레임은 유지하고 뚜렷한 것만 라벨, 심하게 가려진 것은 비워둔다. **애매한 것만 있는 프레임은 통째로 뺀다.**
- https://github.com/ultralytics/ultralytics/issues/21447#issuecomment-3090827761

> "if there are truly no distinguishable animal features visible, labeling those pixels as background creates conflicting training signals."
> → (뜻) 구별할 특징이 정말 없는데 그 픽셀을 배경으로 두면 **충돌하는 신호**가 생긴다(→ 그런 프레임은 삭제 권장).
- https://github.com/ultralytics/ultralytics/issues/21447#issuecomment-3105974470

> "The key distinction is whether there are *identifiable animal features* present, not whether you can determine the exact species from that portion alone."
> → (뜻) 기준은 **그 물체라는 특징이 보이느냐**이지, 그 조각만으로 **세부 종류까지 확정**할 수 있느냐가 아니다.
- https://github.com/ultralytics/ultralytics/issues/21447#issuecomment-3151841707
- 이후 정정: "A single generic hind leg in isolation ... likely doesn't provide enough distinctive characteristics" → 특징 없는 조각 하나는 라벨 불필요. https://github.com/ultralytics/ultralytics/issues/21447#issuecomment-3170527635
- 판정: (다)의 **「정체를 확신할 수 없으면」** 에 대한 부분 반례 — 세부 클래스(버튼 5종 중 어느 것)가 조각만으로 안 갈려도 **특징이 뚜렷하면 라벨하라**는 방향. 단 우리 버튼 5종은 클래스 자체가 판정 대상이라 동물 종 사례와 같지 않음(해석).

**④ 가림 비율 기준 (다른 1차 자료의 문턱)**
- VOC2006: "All objects of the defined categories, unless: you are unsure what the object is. ... less than 10-20% of the object is visible." → 정체가 불확실하거나 **10~20% 미만** 보이면 라벨 안 함.
- glenn-jocher #22857: "If a head/body is heavily distorted, very blurred, or ~75% occluded and you can't label it consistently, skip it" → **~75% 가려지고** 일관되게 못 달면 건너뜀.
- Academy 예시: ≥50% 보이면 라벨.
- 판정: 30% 문턱은 **1차 자료 범위(10~50%) 안**. 어느 값이 옳다는 근거는 없고 「일관성」이 공통 요구.

**⑤ 무시(ignore) 영역의 공식 방법**
- KITTI object devkit readme:
> "'DontCare' labels denote regions in which objects have not been labeled ... You can use the don't care labels in the training set to avoid that your object detector is harvesting hard negatives from those areas, in case you consider non-object regions from the training images as negative examples."
> → (뜻) DontCare = 라벨 안 한 영역. **학습에서 그 영역을 음성으로 캐지 않게** 쓸 수 있다.
> https://raw.githubusercontent.com/bostondiditeam/kitti/master/resources/devkit_object/readme.txt (KITTI 공식 devkit 사본 — 원 배포처 cvlibs.net 대조 ⚠️ 미확인)
- VOC `difficult`: "Reasons for marking an object as difficult included small image area, blur, clutter, high level of occlusion, occlusion of a very characteristic part of the object" (VOC2006 지침) → 가림이 심하면 difficult.
- COCO `iscrowd`: 평가 코드 pycocotools `cocoeval.py` 109행 `gt['ignore'] = 'iscrowd' in gt and gt['iscrowd']` → crowd 는 **평가에서 무시**. https://github.com/cocodataset/cocoapi/blob/master/PythonAPI/pycocotools/cocoeval.py

**⑥ 🔴 Ultralytics 는 검출 학습용 무시 플래그를 지원하지 않는다 (소스 확인, main 브랜치 2026-09-15)**
- `ultralytics/data/converter.py` 302행 (COCO→YOLO 변환): `if ann.get("iscrowd", False): continue` → crowd 라벨은 **그냥 버린다**(= 그 영역은 배경이 됨).
- `ultralytics/data/dataset.py` 710행 (grounding 데이터셋): `if ann["iscrowd"]: continue` — 같음.
- `ultralytics/cfg/datasets/VOC.yaml` 72행: `if cls in names and int(obj.find("difficult").text) != 1:` → **difficult 물체는 라벨에서 제외**(= 배경).
- `ultralytics/utils/loss.py`: `ignore` 는 **의미론적 분할 손실(ignore_index=255)에만** 존재(1419·1442행). `v8DetectionLoss`(337행~) 및 `tal.py` 에 무시 영역 처리 없음.
- 판정: YOLO 라벨 형식(`cls x y w h`)에 `difficult`·ignore 칸이 없고, 공식 변환기도 해당 물체를 **삭제**한다. 즉 Ultralytics 에서 「라벨 안 함」은 곧 **배경 처리**이며, 이를 피하는 공식 방법은 **프레임 삭제**(glenn #21447) 뿐이다. 이미지를 마스킹(회색 칠)하는 방법은 ⚠️ 1차 자료 미확인.

**Q3 결론**: 반례 근거는 **실재**(Soft Sampling·Academy·KITTI). Ultralytics 에는 무시 플래그가 없어 해를 피할 공식 수단은 **애매한 것만 있는 프레임 삭제**. 해악의 크기는 제한적(Soft Sampling 30% 누락 → 5% 하락)이라 (다) 자체를 버릴 근거는 아님.

---

### Q4. 손끝 좌표 × 박스 겹침 판정과 modal 박스의 궁합

**직접 근거: ⚠️ 미확인** — 「가림에 따라 modal 박스가 줄어 접촉 판정이 불리해진다」를 다룬 HOI·1인칭 연구는 찾지 못함.

**간접 근거**
- 산업 1인칭 HOI 실시간 시스템 (arXiv 2507.13326 §4.3, WebFetch 요약 경유): "among all detected objects, the one with the highest IoU with the hand bounding boxes is selected as the active object, provided the IoU exceeds a predefined threshold." → 검출된 물체 중 **손 박스와 IoU가 가장 큰 것**을 능동 물체로 고른다(문턱 이상일 때). 가림이 판정에 미치는 영향은 논문에서 **언급 없음**. https://arxiv.org/html/2507.13326v1
- EPIC-KITCHENS VISOR (arXiv 2209.13064 §5.2): "Predicting hand contact state and segmenting contacted objects is hard due to the difficulty of distinguishing hand overlap and contact, the diversity of held objects, and hand-object and hand-hand occlusion." → 접촉 판정이 어려운 이유 = **손이 겹친 것과 닿은 것을 구분하기 어려움**, 손-물체 가림. https://arxiv.org/html/2209.13064
- VISOR 접촉 라벨: "We identify candidate segments as those sharing a border with the hand." → 손과 **경계를 공유하는** 영역을 접촉 후보로 봄(= 가림막인 손과 물체의 경계가 접촉 단서). 같은 출처.
- ENIGMA-51 (arXiv 2309.14809 §3.2, WebFetch 요약 경유): 접촉 상태는 박스 겹침이 아니라 **상호작용 종류 라벨**(first-contact/take 등)로 부여. https://arxiv.org/html/2309.14809
- glenn-jocher #23783: "box detection can still "find" a fully/mostly occluded small object using context cues, but segmentation is pixel-supervised and can only predict what's actually visible" → 박스 검출은 **맥락 단서로 거의 가려진 작은 물체도 찾을 수 있다.** https://github.com/ultralytics/ultralytics/issues/23783#issuecomment-4015791014

**추론(1차 자료 아님 — 검증 필요 표시)**
- 버튼: 손끝이 버튼 윗부분을 덮으면 modal 박스는 **덮이지 않은 쪽으로 줄어들고**, 손끝 좌표는 박스 **가장자리 또는 바깥**에 놓일 수 있다 → 「손끝이 박스 안」 판정이 가장 필요할 때 실패할 가능성. 이것은 Y-T-G #20275의 「가려져도 크기 일정」 논리와 같은 방향의 우려.
- 공구: (나) 규칙이면 쥔 손이 박스 안에 들어가 겹침이 자동 성립 → 「쥐었는가」 판정에는 유리. 반대로 손만 공구 옆에 있어도 겹칠 수 있음(VISOR의 「겹침 vs 접촉」 난점).
- 우리 파이프라인의 실제 영향은 **데이터로 측정해야** 한다(CLAUDE.md §5 「놓친 눌림 3종」 분류와 연결).

---

### Q5. Ultralytics GitHub 유지보수자 답변 원문 (occluded / partially visible / split / amodal)

| 이슈 | 답변자(신분) | 과제 | 요지(원문 핵심구) |
|---|---|---|---|
| #1240 | Laughing-q (MEMBER) | detect | "recommend `pixel-based`" · 전체 필요 시 "`amodal` way, it could work" |
| #20275 | Y-T-G (COLLABORATOR) | detect | "Labeling full would be better for tracking" |
| #21447 | glenn-jocher (MEMBER) | detect | 애매한 것 비우기 · 애매한 것만 있는 프레임 삭제 · 「identifiable features」 기준 |
| #21828 | Y-T-G / glenn-jocher | segment | 작은 가림은 "as if visible" 전체 윤곽 |
| #22857 | glenn-jocher (MEMBER) | detect | "visible pixels only" · "don't split one body part into multiple boxes" · "I wouldn't use two `body` boxes for one target" · ~75% 가림 skip |
| #23783 | glenn-jocher (MEMBER) | segment | "annotate only the visible region ... amodal segmentation which Ultralytics YOLO doesn't target" |
| #6289 | glenn-jocher (MEMBER) | segment | `merge_multi_segment` 로 가려져 갈라진 조각을 한 인스턴스로 |
| #16181 | glenn-jocher (MEMBER) | detect | "label only the weapon itself, not the hand" |

※ #21447 질문자(일반 사용자)의 규칙 「가장자리가 보이고 가운데만 가려지면 전체를 감싼다 / 나머지가 완전히 가려졌거나 화면 밖이면 보이는 부분만」은 **유지보수자가 반박하지 않았으나 명시 승인도 없음** `(비1차)`. 이 규칙은 우리 (나)와 결과가 같다.

---

## 잠정안을 고친다면 어떻게 (근거 있는 것만)

1. **(가) 유지, 근거 문장 교체** — 「작업자마다 추정이 달라진다」는 COCOA가 반박(전체 범위 라벨도 작업자 간 일관). 근거는 **VOC2006 + Open Images V4 정의 + Ultralytics 유지보수자 검출 답변(#22857) + Academy** 로 바꾸는 편이 안전하다. amodal 반례(#20275 추적, Roboflow 블로그)는 「박스 크기 안정」이 목적일 때라는 **적용 범위와 함께** 기록.
2. **(나) 유지 + 보완 1줄** — 「조각마다 박스 금지」를 명시(#22857). 감싼 박스 안의 손이 공구 특징으로 학습되는 위험엔 유지보수자 처방대로 **공구 없이 손(맨손·장갑)만 있는 음성 이미지**를 넣는다(#22857 "add more beam-heavy negatives"). 손을 **일부러** 넓혀 넣지는 않는다(#16181).
3. **(다) 보완 — 「애매한 것만 있는 프레임은 삭제」 추가** — Ultralytics 에는 difficult·ignore 칸이 없고 변환기가 그런 라벨을 버린다(소스 확인). 따라서 라벨 안 한 물체 = 배경. 섞인 프레임은 유지하되 **애매한 대상만 남는 프레임은 학습셋에서 제외**(#21447). 문턱 30%는 1차 자료 범위(VOC 10~20% ~ Academy 50%) 안이므로 **값은 유지 가능**, 핵심은 일관성.
4. **(다)의 「정체를 확신할 수 없으면」 문구 정밀화** — glenn #21447: 기준은 「그 물체라는 특징이 보이는가」이지 「세부 종류 확정」이 아니다. 단 우리 버튼 5종은 **클래스가 곧 판정 대상**이므로, 「버튼인 것은 확실한데 5종 중 무엇인지 모름」 사례를 어떻게 할지는 **별도 결정 필요**(1차 자료로 정할 수 없음).
5. **버튼에 한해 modal 박스의 손끝 판정 영향을 측정 항목으로** — 직접 연구 근거는 없음(⚠️). Q4 추론은 가설일 뿐이므로 규칙을 바꾸기 전 **눌림 근처 프레임에서 modal 라벨 박스 vs 손끝 위치**를 실측해 확인. (amodal 전환 권고는 근거 부족으로 **하지 않음**.)

## 조회 통계·못 찾은 것

**조회 통계**: WebSearch 6회 · WebFetch 약 20회 · Bash(curl로 GitHub API·원문·Ultralytics 소스) 약 12회. GitHub 이슈 댓글 원문 확인 9건(#1240, #20275, #21447, #21828, #22857, #23783, #6289, #16181, 그 외 검색 결과 목록). Ultralytics 소스 파일 7개 grep(converter.py, dataset.py, utils.py, loss.py, tal.py, augment.py, VOC.yaml).

**못 찾은 것 (⚠️ 미확인)**
- Roboflow **공식 docs**(docs.roboflow.com)의 가림 라벨 규정 — 블로그만 확인.
- CVAT·Labelbox 공식 지침의 가림 박스 범위 규정 — CVAT 페이지 추출 실패, Labelbox 미조회.
- PASCAL VOC 2011/2012 지침(host.robots.ox.ac.uk 접속 거부) — 2006판(Oxford VGG 사본)만 확인.
- Waymo 2D 라벨 "visible parts only" 원문 문구 — 논문에선 "tightly fitting … complementary to … amodal 2D projections"만 확인. 공식 라벨 규격서 미조회.
- 100DOH(Shan et al. 2020) 물체 박스 작업 지침 — PDF 텍스트 추출 도구 없음(pdftotext·pypdf 미설치).
- **modal 박스 × 손끝 접촉 판정** 영향을 다룬 1차 연구 — 없음.
- 갈라진 물체를 **조각별 박스**로 치라는 1차 자료 — 없음.
- 이미지 마스킹(무시 영역 칠하기)을 Ultralytics가 권장하는지 — 미확인.
- Ultralytics Academy·2507.13326·ENIGMA-51 인용은 WebFetch 요약 모델 경유라 **글자 단위 원문 대조는 미완**(요지는 일치).
