# B. 학술 연구 근거

> 조사일 2026-09-15 · 모든 인용은 논문 PDF를 내려받아 `pdftotext`로 본문을 뽑은 뒤 해당 문장을 직접 대조했다(PDF 줄바꿈 하이픈만 이어 붙임). 학회명은 **본문·페이지에서 확인된 것만** 적고, 확인 못 한 것은 `⚠️ 학회 미확인`으로 표시했다.
> 용어: **modal 박스** = 보이는 부분만 감싼 박스 · **amodal 박스** = 가려진 부분까지 추정한 전체 박스 · **TAL** = Task-Aligned Learning(정답 배정 방식) · **mAP/AP** = 평균 정밀도 · **MR/mMR** = 로그 평균 미검출률(낮을수록 좋음).

## 질문별 결론 (한 줄씩, 출처 번호)

1. **amodal vs modal 학습 성능 비교** — 같은 검출기·같은 평가로 「박스 정의만 바꿔」 비교한 통제 실험은 **⚠️ 미확인(찾지 못함)**. 대신 가까운 근거는 이렇다. ① 평가 기준과 **같은 정의로 학습한 모델이 그 기준에서 이긴다**(COCOA 가림 물체: visible 평가에서 modal 학습 MRCNN APV 21.6 > amodal 학습 18.5, amodal 평가에서는 거꾸로 15.0 < 25.4)[4]. ② amodal 전체 박스는 「가려진 경계를 추정」해야 해서 더 어렵고 정답 자체의 사람 간 편차가 크다고 저자들이 명시한다[1][5]. ③ 반대로 **형태가 단순·강체인 물체는 amodal 라벨도 일관적**이고(COCOA 영역 일치도 중앙값 amodal 0.723 vs 자체 modal 0.756)[3], 가림 정도에 따라 모양이 변하는 modal 박스는 「정렬이 안 맞는 학습 샘플」이 되어 해롭다는 보고가 있다[13]. ④ 가림이 심하면 amodal 검출은 사실상 안 된다(가시율 0~10% 구간 AP 0.24~1.30)[20].
2. **라벨 비일관성·박스 노이즈** — 박스 좌표 노이즈는 **분류보다 위치 정확도를 크게 깎고**[7], γ=0.1(박스 폭의 10% 표준편차) 노이즈로 FCOS AP 38.5→33.5, **높은 IoU 임계일수록 더 크게 떨어진다**[8]. 40% 노이즈에선 AP50 58.1→28.9로 붕괴[7], VOC mAP@.5 78.2→59.3[6]. 사람끼리 같은 박스를 다시 그려도 IoU 0.87~0.88이 한계[22]이고, **가림이 심하거나 모양이 복잡하면 사람 간 불일치가 커진다**[3][1].
3. **가림 하 검출 학습 데이터 처리 권고** — 보행자 계열은 **전체 박스(full)로 검출 + 보이는 박스(visible)는 가림률 계산·보조 감독용**으로 둘 다 라벨한다[1][11][12][13]. 학습은 가림률 ≤0.35(「reasonable」) 샘플로 하고 **판단 불가 영역은 ignore(무시) 영역으로 처리하면 1.33 MR 개선**[13]. 범용 가이드라인(PASCAL VOC)은 **보이는 부분 박스 + 가시 10~20% 미만이면 라벨하지 않음 + 심한 가림은 difficult 표시**[23]. Open Images도 「보이는 모든 부분을 포함하는 가장 작은 박스」 + IsOccluded 속성[22].
4. **손에 쥔 물체 데이터셋의 정의** — VISOR는 **「부분 가림이면 보이는 부분만」 분할**하고, 여러 조각으로 된 물체는 **조각별로 그린 뒤 하나로 합친다**(사람 간 일치 90.3 IoU)[15]. EgoHOS는 손·접촉 물체의 픽셀 마스크 + 손-물체 접촉 경계를 라벨[16]. 100DOH는 물체 박스를 「손이 접촉한 물체 둘레의 박스(이름 무관)」로만 정의 — **가려진 부분 포함 여부는 ⚠️ 미확인**[14]. TAO-Amodal은 **카메라를 든 사람의 손이 보이는 경우처럼 물체가 카메라 뒤에 걸친 경우 가림 범위를 라벨하지 않는다**고 명시[20]. HOI4D·TEgO·Ego4D의 2D 박스 가림 정의는 **⚠️ 미확인**.
5. **작은 물체의 일부 가림과 IoU** — 6×6 픽셀 물체는 같은 위치 오차에서 IoU가 0.53→0.06으로 급락(36×36은 0.90→0.65), 이 민감도가 **정답 배정(label assignment)을 부정확하게 만든다**[18]. 「보이는 박스로 작게 라벨」한 경우를 직접 실험한 연구는 **⚠️ 미확인** — 단, [18]과 TAL의 IoU^6 가중(Ultralytics 기본 β=6.0)[19]을 합치면 **작은 박스일수록 몇 픽셀의 라벨 흔들림이 배정·학습에 크게 증폭된다**는 방향은 강하게 지지된다(추론).
- **(보너스) 조각으로 갈라진 물체** — 가림체에 의해 마스크가 여러 조각으로 나뉜 물체(Separated COCO)는 COCO에서도 **한 인스턴스로 라벨**되어 있고, 최신 검출기의 재현율이 일반 부분가림 물체의 **약 절반**(Swin-T Mask R-CNN 31.94% vs 58.81%)[21]. VISOR도 조각들을 **하나로 합친다**[15].

## 논문별 원문 인용과 실험 결과

### [1] CrowdHuman: A Benchmark for Detecting Human in a Crowd (Shao, Zhao, Li, Xiao, Yu, Zhang, Sun — Megvii, arXiv 2018 · ⚠️ 학회 미확인) — https://arxiv.org/abs/1805.00123
- 원문: "Each human instance is annotated with a head bounding-box, human visible-region bounding-box and human full-body bounding-box."
  - 뜻: 사람마다 머리 박스·보이는 영역 박스·전신 박스 3종을 라벨했다.
- 원문: "We annotate a full bounding box of each individual exhaustively. If the individual is partly occluded, the annotator is required to complete the invisible part and …"
  - 뜻: 일부 가려져도 라벨러가 안 보이는 부분을 채워 전신 박스를 그리게 했다.
- 원문: "Detecting full body regions is more difficult than detecting the visible part as the detectors should predict the occluded boundaries of the full body. To make matters worse, the ground-truth annotation might be suffered from high variance caused by different decision-makings by different annotators."
  - 뜻: 전신(amodal) 검출은 가려진 경계를 추정해야 해서 보이는 부분 검출보다 어렵고, **정답 라벨 자체가 라벨러마다 판단이 달라 편차가 크다.**
- 수치(원문 표): Table 6 visible body — FPN Recall 91.51 / AP 85.60 / mMR 55.94, RetinaNet 90.96 / 77.19 / 65.47. Table 7 full body — FPN 90.24 / 84.95 / 50.42, RetinaNet 93.80 / 80.83 / 63.33.
  - ⚠️ 두 표는 **정답 박스 정의가 달라 서로 다른 과제**다. 「visible 학습이 full보다 낫다/못하다」의 근거로 쓸 수 없다(저자도 그렇게 비교하지 않음).
- 우리에게 주는 의미: 대규모 벤치마크조차 amodal 라벨의 **사람 간 편차**를 약점으로 명시한다. modal·amodal을 둘 다 라벨하는 방식(가림률 계산 가능)이 표준 선택지 중 하나다.

### [2] Amodal Completion and Size Constancy in Natural Scenes (Kar, Tulsiani, Carreira, Malik — ICCV 2015, arXiv 표기) — https://arxiv.org/abs/1509.08147
- 원문: "We first introduce the task of amodal bounding box completion, which aims to infer the the full extent of the object instances in the image."
  - 뜻: 보이는 박스로부터 물체 전체 범위(amodal 박스)를 추정하는 과제를 제안.
- 원문: "We compare against the baseline of using the modal bounding box itself as the amodal bounding box (modal bbox) which is in fact the correct prediction for all untruncated instances."
- 수치(Table 1, PASCAL VOC, 예측 amodal 박스와 정답 amodal 박스의 평균 IoU): modal bbox 그대로 — all 0.66 / trun/occ 0.59 / trunc 0.52 / occ 0.64 · class specific 0.68 / 0.62 / 0.57 / 0.65 · class agnostic 0.68 / 0.62 / 0.56 / 0.65.
  - 뜻: **가림(occ)만 있는 경우 modal 박스를 그대로 써도 0.64, 학습한 amodal 회귀는 0.65** — 개선은 주로 화면 밖 잘림(trunc)에서 나왔다.
- 원문: "the instances detected correctly by the detector tend to be cleaner ones and thus the baseline (modal bbox) of using the detector box output as the amodal box also does reasonably well."
- 우리에게 주는 의미: 가림이 작으면 modal과 amodal 박스 차이 자체가 작다(IoU 0.64 수준 차이). 버튼의 손끝 가림처럼 **일부만 가려진 경우 두 정의의 실질 차이는 제한적**일 수 있다.

### [3] Semantic Amodal Segmentation — COCOA (Zhu, Tian, Metaxas, Dollár — arXiv 1509.01329 v2 2016 · ⚠️ 학회 미확인) — https://arxiv.org/abs/1509.01329
- 원문: "we create an amodal segmentation of each image: the full extent of each region is marked, not just the visible pixels."
- 원문: "The region consistency of our amodal regions is substantially higher than the consistency of the original modal regions: median of 0.723 versus 0.425. … We note that the modal region consistency of our annotations is 0.756, slightly higher than for amodal regions, as expected."
  - 뜻: 라벨러 간 영역 일치도(F) 중앙값 — 이 데이터셋의 amodal 0.723, 같은 라벨의 modal 0.756(약간 높음), 원래 BSDS modal 0.425. (BSDS와의 큰 차이는 지시문을 좁힌 효과라고 저자가 설명)
- 원문: "Naturally, annotations are most consistent for regions with simple shapes and little occlusions. On the other hand, when the object is highly articulated and/or severely occluded, annotators tend to disagree more."
  - 뜻: **단순한 모양·가림 적음 → 일치, 관절 많은 모양·심한 가림 → 불일치.**
- 원문: "Note that the amodal segments have simpler shapes than the modal segments."
- 우리에게 주는 의미: 버튼(단순한 원·사각 강체, 가림 작음)은 amodal 라벨도 일관되게 그릴 수 있는 조건에 해당한다. 공구가 손에 크게 가리는 경우는 불일치가 커지는 조건이다.

### [4] Learning to See the Invisible: End-to-End Trainable Amodal Instance Segmentation — D2S amodal (Follmann, König, Härtinger, Klostermann — MVTec, arXiv 2018 · ⚠️ 학회 미확인) — https://arxiv.org/abs/1804.08864
- 원문(초록): "Using special data augmentation techniques, we show that amodal segmentation on D2S amodal is possible with reasonable performance, even without providing amodal training data."
- 수치(Table 3, COCOA no stuff, occluded 열 APA / APV): MRCNN-101(modal 학습) 15.0 / **21.6** · AmodalMRCNN-101(amodal 학습) **25.4** / 18.5 · ORCNN 20.8 / 21.4.
  - 뜻: **보이는 부분(APV)으로 채점하면 modal 학습이, 전체(APA)로 채점하면 amodal 학습이 이긴다.** 평가 정의와 학습 정의가 일치해야 한다.
- 수치(Table 4, COCOA cls, all APV): MRCNN-101 44.9 > AmodalMRCNN-101 40.5. 원문: "For visible masks, the best results are obtained with MRCNN. This makes sense, as the model was trained to predict visible masks on COCO."
- 수치(Table 6, D2S amodal val): ORCNN APA 62.1 / APV 66.2 · ORCNN(modal aug, modal 라벨만으로 합성 학습) 59.9 / 62.6. 원문: "The model performs only slightly worse than ORCNN trained on D2S amodal train. This is in difference to COCOA, where data augmentation using modal annotations did not help".
  - 뜻: 산업용 강체 상품(D2S)은 modal 라벨 + 합성 가림으로도 amodal을 거의 따라잡았지만, 일반 장면(COCOA)에선 실패.
- 원문: "if the ground truth invisible masks are small, then small differences of the invisible mask proposal already lead to a small IoU value."
- 우리에게 주는 의미: 「누르려는 버튼」 판정에 쓰는 박스가 **어떤 정의여야 하는지(보이는 부분 vs 버튼 전체)를 먼저 정하고 학습·평가를 같은 정의로 맞추는 것**이 핵심이다. 강체·단순 형상 조건에선 amodal 추정이 잘 된다는 사례.

### [5] Amodal Instance Segmentation with KINS Dataset (Qi, Jiang, Liu, Shen, Jia — CVPR 2019) — https://openaccess.thecvf.com/content_CVPR_2019/papers/Qi_Amodal_Instance_Segmentation_With_KINS_Dataset_CVPR_2019_paper.pdf
- 원문(초록): "this task lacks data with large-scale and detailed annotation, due to the difficulty of correctly and consistently labeling invisible parts".
  - 뜻: 안 보이는 부분을 정확·일관되게 라벨하기 어렵다.
- 원문: "It is worth mentioning that inferring the occluded part is subjective and open-ended. However, due to our strict tagging criteria and human prior knowledge of instances, the amodal annotations in KINS are rather consistent."
- 수치(Table 3, 라벨러 3명 × 4개월 간격 2회 마스크 IoU): 대각(동일인 재라벨) 0.836 / 0.840 / 0.835, 다른 사람 간 0.802~0.818, 다수결 0.843.
- 원문: "bounding boxes in KITTI detection dataset are annotated without considering occluded pixels. Hence in KINS, the boxes are generally larger."
- 원문: "increasing training iterations makes the network suffer from severe overfitting … With more iterations, occlusion regions shrink or disappear while the prediction of visible parts becomes stable."
  - 뜻: amodal 라벨로 Mask R-CNN을 오래 학습하면 **가려진 영역 예측이 줄어들고 보이는 부분으로 수렴**하는 과적합이 관찰됨.
- 우리에게 주는 의미: **엄격한 라벨 규칙 + 물체 형태 사전지식**이 있으면 amodal도 IoU 0.8대 일관성이 나온다. 규칙 문서화가 전제 조건.

### [6] Towards Noise-resistant Object Detection with Noisy Annotations (Li, Xiong, Socher, Hoi — Salesforce, arXiv 2020 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2003.01285
- 원문: "Noisy annotations are much more easily accessible, but they could be detrimental for learning."
- 원문: "For bounding box noise, we perturb the coordinates of all bounding boxes by a number of pixels uniformly drawn from [−wNb %, +wNb %] … Under 40% bbox noise, the average IoU between a noisy bbox and its corresponding clean bbox is only 0.45."
- 수치(Table 2, PASCAL VOC 2007 test mAP@.5, 라벨 노이즈 0%): Vanilla — bbox 노이즈 0% **78.2** / 20% **75.5** / 40% **59.3**.
- 우리에게 주는 의미: 20% 수준 박스 흔들림은 mAP@.5에 −2.7이지만 40%에선 −18.9로 비선형 붕괴. (mAP@.5는 느슨한 기준이라 엄격 기준에선 더 크다 → [8])

### [7] Robust Object Detection With Inaccurate Bounding Boxes — OA-MIL (Liu, Wang, Lu, Cao, Zhang, arXiv 2022 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2207.09697
- 원문(초록): "As the crowd-sourcing labeling process and the ambiguities of the objects may raise noisy bounding box annotations, the object detectors will suffer from the degenerated training data. … localization precision suffers significantly from inaccurate bounding boxes while classification accuracy is less affected".
  - 뜻: 물체 경계의 **모호함** 자체가 박스 노이즈의 원인이며, 노이즈는 분류보다 위치 정확도를 크게 해친다.
- 원문: "under 40% box noise, the vanilla model suffers from catastrophic performance drop, e.g., AP 50 drops from 58.1 to 28.9." (MS-COCO, FasterRCNN)
- 원문: "we observe that objects with different sizes suffer similarly under different noise levels." (단, 여기서 노이즈는 **박스 크기에 비례**하게 넣었다 — 식 (12))
- 실데이터: GWHD(밀 이삭) 「noisy」판(약 20% 박스 부정확) vs 「clean」판 — Vanilla FRCNN Test ADA 0.509 vs 0.511.
- 우리에게 주는 의미: 가려진 경계를 사람마다 다르게 추정하면 곧 이 「모호성 기인 박스 노이즈」가 된다.

### [8] Narrowing the Gap: Improved Detector Training with Noisy Location Annotations (Wang, Gao, Li, Hu, arXiv 2022 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2206.05708
- 원문(초록): "noticeable performance degradation is experimentally observed for both one-stage and two-stage detectors when noise is introduced to the bounding box annotations. For instance, our synthesized noise results in performance decrease from 38.9% AP to 33.6% AP for FCOS detector on COCO test split, and 37.8%AP to 33.7%AP for Faster R-CNN."
- 수치(Table I, COCO minival): FCOS(앵커 프리) γ=0 AP 38.5 / APs 22.5 → γ=0.05 37.1 (−1.4) / 21.6 → γ=0.1 33.5 (−5.3) / 19.6. Faster R-CNN 37.5 → 35.8 → 33.3. 실데이터 재라벨(12k): FCOS 22.8→21.2.
- 원문: "we can find that APs with higher IoU thresholds drop heavier, as shown in Fig. 5, which indicates that the noise prominently damages the ability of detectors to accurately locate objects."
- 우리에게 주는 의미: 앵커 프리 단일 단계(FCOS, YOLO와 같은 계열)도 **박스 폭의 5~10% 흔들림에 AP가 4~13% 상대 하락**. 버튼 박스 경계를 손끝 가림 때마다 다르게 그리면 정확히 이 조건이다.

### [9] Universal Noise Annotation: Unveiling the Impact of Noisy annotation on Object Detection (Ryoo et al. — LG AI Research·고려대, arXiv 2023 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2312.13822
- 수치(Table 2, COCO, Faster-RCNN-FPN-R50 12ep, clean 37.4): Localization 노이즈 5% 37.0 (−0.4) / 10% 36.6 (−0.8) / 15% 35.7 (−1.7) / 20% 35.4 (−2.0). Missing(누락) 20% 36.1 (−1.3). 4종 혼합(UNA) 20% 26.6 (−10.8).
- 원문: "as the noise level approaches 20%, the performance drop of UNA (∼ 10.8) becomes even greater than the sum of the performance drops from the other four noise types (2.4 + 2.0 + 1.4 + 0.9 = 6.7)."
- 원문: "These noise types can occur due to ambiguous definition of label".
- 우리에게 주는 의미: 「가림 시 건너뛰기(누락)」와 「경계 추정 흔들림(위치)」이 **동시에** 쌓이면 합보다 크게 나빠진다 → 건너뛰기 기준과 박스 정의를 함께 고정해야 한다.

### [10] Drawing the Same Bounding Box Twice? Coping Noisy Annotations in Object Detection with Repeated Labels (Tschirschwitz et al. — Bauhaus-Univ. Weimar, arXiv 2023 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2309.09742
- 원문: "datasets with high variance and low annotator consistency may benefit from multiple annotations per image, while in cases with low image variation and high annotator consistency, many images annotated once might suffice."
- 우리에게 주는 의미: 라벨러 일치도가 낮은 부류(심하게 가린 공구 등)만 골라 **이중 라벨·합의**하는 전략의 근거.

### [11] Repulsion Loss: Detecting Pedestrians in a Crowd (Wang, Xiao, Jiang, Shao, Sun, Shen — CVPR 2018) — https://arxiv.org/abs/1711.07752
- 원문: "Since the bounding box annotation of the visible part of each pedestrian is provided in CityPersons, the occlusion can be calculated as occ ≜ 1 − area(BBox_visible)/area(BBox). We define a ground-truth pedestrian whose occ ≥ 0.1 as an occlusion case".
- 원문: "the performance drops significantly from 14.6 MR−2 on the reasonable set to 18.6 MR−2 on the reasonable-occ subset; of all missed detections at 20, 100, and 500 false positives, occlusion makes up approximately 60%".
- 우리에게 주는 의미: 가림 연구의 표준은 **full + visible 두 박스를 라벨해 가림률을 계산**하고 가림 구간별로 성능을 따로 본다. (본 연구의 예측 박스는 full box)

### [12] Occlusion-aware R-CNN: Detecting Pedestrians in a Crowd (Zhang, Wen, Bian, Lei, Li — arXiv 2018 · ⚠️ 학회 미확인) — https://arxiv.org/abs/1807.08407
- 원문: "If half of the part c_i,j is visible, o*_i,j = 1, otherwise o*_i,j = 0." (보이는 영역 라벨로 부위별 가시성 정답을 만듦)
- 원문: "reduces 1.1% MR−2 on the Bare subset, 1.1% MR−2 on the Partial subset, and 4.0% MR−2 on the Heavy subset." (Bare ≤10%, Partial 10~35%, Heavy >35% 가림)
- 우리에게 주는 의미: visible 라벨은 검출 박스 정답이 아니라 **가시성 보조 감독**으로 쓰였다. YOLO 단일 헤드엔 바로 대응되지 않음(참고용).

### [13] CityPersons: A Diverse Dataset for Pedestrian Detection (Zhang, Benenson, Schiele — arXiv 2017 · ⚠️ 학회 미확인) — https://arxiv.org/abs/1702.05693
- 원문: "Simply using bounding boxes of these segments would raise three issues. … I2) Even after normalizing aspect ratio, the boxes would not align amongst each other. … They will be off in the vertical axis due to variable level of occlusion for each person. It has been shown that pedestrian detectors benefit from well aligned training samples [32], and conversely, training with misaligned samples will hamper results."
  - 뜻: 보이는 부분 박스는 **가림 정도에 따라 박스 위치·비율이 들쭉날쭉해져 학습 샘플 정렬이 깨지고, 이는 학습을 해친다** — 그래서 전체(amodal) 박스를 택함.
- 원문: "the full body is annotated by drawing a line from the top of the head to the middle of two feet, and the bounding box is generated using a fixed aspect ratio (0.41)."
  - 뜻: 형태 사전지식(고정 종횡비)으로 amodal 박스를 **규칙화**해 사람 간 편차를 줄였다.
- 원문: "ignore regions (areas where the annotator cannot tell if a person is present or absent, and person groups where individuals cannot be told apart). Simply treating these regions as background introduces confusing samples, and has a negative impact on the detector quality. By ensuring that during training the RPN proposals avoid sampling the ignore regions, we observe a 1.33 MR pp improvement."
- 원문: "Consistent with the reasonable evaluation protocol, we only use the reasonable subset of pedestrians for training" (reasonable = 높이 ≥50px, 가림률 [0, 0.35])
- 우리에게 주는 의미: ① 버튼처럼 **모양·크기가 고정된 강체**는 이 논리(가림에 따라 흔들리는 modal보다 규칙화된 amodal이 정렬에 유리)가 그대로 적용될 여지가 크다. ② 「판단 불가」 대상은 **배경으로 두지 말고 무시 처리**하는 편이 낫다는 실측 근거(단, YOLO/Ultralytics의 ignore 영역 지원 여부는 이번 조사 범위 밖 — ⚠️ 미확인).

### [14] Understanding Human Hands in Contact at Internet Scale — 100DOH (Shan, Geng, Shu, Fouhey — arXiv 2020 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2006.06669
- 원문: "(c) the hand contact state ({no contact, self-contact, other person contact, in contact with portable object, in contact with a non-portable object}) … and (d) a bounding box around the object the person is contacting irrespective of name."
- 원문: "We only included images on which we could get conclusive judgments from workers."
  - 뜻: 라벨러가 확정 판단을 못 한 이미지는 **제외**.
- 우리에게 주는 의미: 「쥐었는가」를 물체 박스 겹침으로 추론하지 않고 **손 박스에 접촉 상태(portable object)를 직접 분류**하는 설계가 있다. 물체 박스가 가려진 부분을 포함하는지는 본문에서 못 찾음(⚠️ 미확인).

### [15] EPIC-KITCHENS VISOR Benchmark: VIdeo Segmentations and Object Relations (Darkhalil, Shan, Zhu, Ma, Kar, Higgins, Fidler, Fouhey, Damen — arXiv 2022 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2209.13064
- 원문(부록 규칙 f): "if partial occlusions occur, we instruct the user to only separate the visible parts of the occluded objects."
  - 뜻: 부분 가림이면 **보이는 부분만** 분할(modal).
- 원문(규칙 g): "For objects with several small pieces, e.g., the pieces of carrots, we instruct users to segment each piece individually and merge the segmentations into one."
  - 뜻: 여러 조각은 **조각별로 그리고 하나로 합친다**(한 인스턴스).
- 원문: "Pixel-label annotators can choose to ignore an entity if absent, occluded, highly-blurred or incorrect altogether."
- 원문: "report 90.3 average pairwise mean IoU between all annotators … in line with the 90 IoU human agreement per instance reported for OpenImages [5] and much higher than the ≈80 IoU agreement reported for MS-COCO polygons".
- 우리에게 주는 의미: 1인칭 손-물체 데이터셋의 대표 정의 = **보이는 부분 + 조각은 한 인스턴스로 병합 + 가림·흐림 시 건너뛰기 허용**. 규칙을 명문화해 90 IoU 일치를 얻었다.

### [16] Fine-Grained Egocentric Hand-Object Segmentation: Dataset, Model, and Applications — EgoHOS (Zhang, Zhou, Stent, Shi — arXiv 2022 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2208.03826
- 원문: "we obtained the following per-pixel mask annotations if applicable: (a) left-hand; (b) right-hand; (c) left-hand object; (d) right-hand object; (e) two-hand object."
- 원문: "Our dataset is the first to label detailed hand-object contact boundaries." / "the contact boundary could provide a cue as to whether there is an interacting object for a given hand mask".
- 우리에게 주는 의미: 「쥠」 판정을 **손-물체 접촉 경계**로 푸는 설계 사례. 가려진 물체 부분의 정의 문장은 못 찾음(⚠️ 미확인).

### [17] HOI4D (Liu et al., arXiv 2203.01577) · EgoSurgery-Tool (Fujii, Saito, Kajita, arXiv 2406.03095) — 본문 검색만
- HOI4D 원문: "Annotating 3D hand poses and object poses together is not an easy task though due to reciprocal occlusions." — 2D 박스 가림 정의 **⚠️ 미확인**.
- EgoSurgery-Tool(머리 착용 카메라·수술 도구 박스): 초록에 "heavy occlusion"을 과제 난점으로 언급 — 가림 라벨 규칙 **⚠️ 미확인**.

### [18] A Normalized Gaussian Wasserstein Distance for Tiny Object Detection — NWD (Wang, Xu, Yang, Yu — arXiv 2110.13389 v2 2022 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2110.13389
- 원문(초록): "Intersection over Union (IoU) based metrics such as IoU itself and its extensions are very sensitive to the location deviation of the tiny objects, and drastically deteriorate the detection performance when used in anchor-based detectors."
- 원문: "for the tiny object with 6 × 6 pixels, a minor location deviation will lead to notable IoU drop (from 0.53 to 0.06), resulting in inaccurate label assignment. However, for the normal object with 36 × 36 pixels, the IoU changes slightly (from 0.90 to 0.65) with the same location deviation."
- 우리에게 주는 의미: 버튼이 480×640 화면에서 작을수록 **몇 픽셀의 박스 경계 차이(=라벨러별 가림 경계 추정 차이)가 정답 배정을 흔든다.** 보이는 부분만 라벨하면 박스가 더 작아져 이 민감도가 커지는 방향(추론, 직접 실험 ⚠️ 미확인).

### [19] TOOD: Task-aligned One-stage Object Detection (Feng, Zhong, Gao, Scott, Huang — arXiv 2108.07755 · ⚠️ 학회 미확인) + Ultralytics 로컬 코드
- 원문: "t = s^α × u^β, where s and u denote a classification score and an IoU value, respectively." / "we adopt α = 1 and β = 6 for our TAL."
- 로컬 확인: `/home/pi/env/rfenv/.../ultralytics/utils/loss.py`(ultralytics 8.4.117) `TaskAlignedAssigner(topk=tal_topk, …, alpha=0.5, beta=6.0, …)`.
- 뜻·수치(산술): IoU^6 — IoU 0.9→0.53, 0.8→0.26, 0.6→0.047.
- 우리에게 주는 의미: 예측과 라벨 박스 IoU가 0.8에서 0.6으로만 떨어져도 배정 점수 기여가 약 5.6배 줄어든다 → **라벨 박스 정의의 일관성이 이 배정기에서 특히 중요**(추론).

### [20] TAO-Amodal: A Benchmark for Tracking Any Object Amodally (Hsieh, Chen, Dave, Khurana, Ramanan — arXiv 2312.12433 v3 2024 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2312.12433
- 원문: "Since annotators can exhibit a large variation in annotating the precise shape of objects while they undergo partial or even complete occlusion, we annotate using bounding boxes instead of segmentation masks".
- 원문: "We do not label the extent of occlusion in cases where an object may be partially present behind the camera (e.g., a person holding the camera who has their hands visible in the image)."
- 원문: "when an object's location cannot be discerned confidently by the annotators, annotators are instructed to mark an is_uncertain flag. From the 23,449 boxes for invisible objects, 20,218 (85.8%) boxes are annotated confidently".
- 수치(Table 2, 가시율 구간별 검출 AP): ViTDet-L AP[0,0.1] 1.25 / AP[0.1,0.8] 15.06 / AP[0.8,1] 38.16. 최고 PCNet(COCO 범주) 1.30 / 20.61 / 53.13.
- 우리에게 주는 의미: 가시율 10% 미만은 amodal 검출이 사실상 불가(AP ≈1). 확신 없는 라벨엔 **불확실 표시**를 두는 규칙.

### [21] A Tri-Layer Plugin to Improve Occluded Detection (Zhan, Xie, Zisserman — arXiv 2210.10046 · ⚠️ 학회 미확인) — https://arxiv.org/abs/2210.10046
- 원문: "almost all large-scale detection datasets provide annotations on the visible part of objects, but no occlusion information is available."
- 원문: "If the mask is split into pieces, then the object is 'seperated' and should be in the Separated COCO split … otherwise, the object is put into the Occluded COCO split as 'partially occluded' object".
  - 뜻: COCO에서 **조각으로 갈라진 물체도 원래 한 인스턴스**로 라벨되어 있고, 그것만 따로 모아 평가셋을 만들었다.
- 수치(Table 4, 재현율 = 신뢰도 >0.3 & 마스크 IoU >0.75): Mask R-CNN Swin-T Occluded **58.81%** / Separated **31.94%** → 플러그인 62.00% / 34.72%. Cascade Swin-B 62.90% / 36.31%.
- 우리에게 주는 의미: 한 인스턴스로 라벨된 「갈라진 물체」는 최신 모델도 **재현율이 부분가림의 절반 수준**. 공구를 한 박스로 라벨할 경우 이 난도를 감안해야 한다(단 마스크 IoU 기준이라 박스 검출보다 엄격).

### [22] The Open Images Dataset V4 (Kuznetsova et al. — IJCV, 본문 「Pre-print accepted to IJCV」) — https://arxiv.org/abs/1811.00982
- 원문: "Given a target class, a perfect box is the smallest possible box that contains all visible parts of the object".
  - 뜻: 완벽한 박스 = **보이는 모든 부분을 포함하는 가장 작은 박스** → 가림체로 두 조각이 되어도 **두 조각을 모두 감싸는 한 박스**가 된다.
- 원문: "To ensure different annotators would consistently mark the same spatial extent, we manually annotated a perfect bounding box on two examples for each of the 600 object classes. Additionally, for 20% of the classes we identified common mistakes in pilot studies."
- 원문: "Partially occluded: the object is occluded by another object in the image."(속성)
- 원문: "We found this to be 0.87, which is very close to the human agreement of 0.88 IoU on PASCAL … The slight difference is mainly caused by objects being generally smaller in Open Images".
- 우리에게 주는 의미: 부류별 **정답 예시 2장 + 흔한 실수 예시**를 라벨러에게 보여주는 것이 일관성 확보 수단. 사람 재라벨 한계 IoU ≈0.87이며 **작은 물체일수록 낮아진다**.

### [23] PASCAL VOC2006 Annotation Guidelines (공식 벤치마크 문서) — https://www.robots.ox.ac.uk/~vgg/projects/pascal/VOC/voc2006/guidelines.html
- 원문: "All objects of the defined categories, unless: you are unsure what the object is. the object is very small (at your discretion). less than 10-20% of the object is visible."
  - 뜻: **대상이 뭔지 확신 없음 / 매우 작음 / 가시 10~20% 미만이면 라벨하지 않는다.**
- 원문: "Mark the bounding box of the visible area of the object (not the estimated total extent of the object)."
- 원문: "If an object is 'occluded' by a close-fitting occluder e.g. clothing, mud, snow etc., then the occluder should be treated as part of the object."
- 원문: "Reasons for marking an object as difficult included small image area, blur, clutter, high level of occlusion, occlusion of a very characteristic part of the object, etc."
- 우리에게 주는 의미: 건너뛰기 수치 기준의 유일한 공식 문서 근거 = **가시 10~20% 미만**. 「특징적인 부위가 가려짐」도 difficult 사유. (VOC2011 가이드라인 URL은 접속 거부로 2006판 사용)

### [24] Occlusion Handling in Generic Object Detection: A Review (arXiv 2101.08845, 2021) — 본문 검색만
- 원문: "KINS … contains amodal instance segmentation masks and corresponding occlusion order. Three expert annotators … crowdsourcing to ensure that the occluded regions were labeled consistently."
- 학습 데이터 가림 처리에 대한 **구체 권고 문장은 못 찾음**(⚠️ 미확인).

## 종합 — modal/amodal · 갈라진 물체 · 건너뛰기 기준에 대해 근거가 가리키는 방향 (근거 강도: 강/중/약)

**비유 한 줄**: 라벨 규칙은 「자로 재는 법」이다. 자를 긴 쪽으로 대든 짧은 쪽으로 대든 괜찮지만, **사람·장면마다 대는 법이 달라지면** 모델은 흔들리는 눈금을 배운다.

1. **정의보다 일관성이 먼저다 — 강.** 박스 폭의 5~10% 흔들림만으로 앵커 프리 검출기 AP가 상대 4~13% 떨어지고 엄격한 IoU 기준에서 더 크게 떨어진다[8]. 노이즈 종류가 겹치면 합보다 커진다[9]. 가려진 경계를 사람마다 다르게 추정하면 곧 이 노이즈다[1][7]. TAL의 IoU^6 배정[19]과 작은 물체의 IoU 민감도[18]가 이를 증폭하는 방향(이 부분은 추론).
2. **학습 정의 = 사용·평가 정의로 맞춘다 — 중.** visible로 채점하면 modal 학습이, 전체로 채점하면 amodal 학습이 이겼다[4]. 따라서 「손끝 좌표와 박스 겹침으로 누르려는 버튼 판정」에 필요한 박스가 **버튼 전체 영역인지 보이는 부분인지**를 먼저 정하는 것이 순서다.
   - 연구 근거는 아니지만 판정 로직으로 추론하면: 누를 때 손끝은 버튼의 가려진 쪽 위에 있으므로, 보이는 부분만 라벨하면 **손끝이 박스 가장자리나 밖에 놓이기 쉽다**(프로젝트 함정 「② 손끝이 ROI 밖」과 같은 형태). 이 점은 amodal 쪽에 유리한 추론이며, 실측으로 확인해야 한다.
3. **버튼(작고 모양·크기가 고정된 강체, 일부만 가림) → amodal(버튼 전체) 쪽이 근거와 잘 맞는다 — 중(간접).** 모양이 단순하고 가림이 적으면 amodal 라벨도 사람 간에 일관되고[3][5], 가림에 따라 흔들리는 modal 박스는 학습 샘플 정렬을 깨뜨린다는 보고가 있다[13]. 가림이 작을 때는 두 정의 차이도 작다(IoU 0.64 대 0.65)[2]. 조건: **보이는 윤곽으로 전체 경계를 확신할 수 있을 때만** amodal로 그린다. 전체 박스를 규칙화하는 방법(CityPersons의 고정 종횡비처럼 버튼 정면 크기 기준)을 두면 편차가 줄어든다[13].
4. **손으로 가운데를 쥐어 두 조각으로 갈라진 공구 → 박스 하나(두 조각을 모두 감싸는 박스) — 중.** 주요 표준이 한 인스턴스로 다룬다. Open Images는 「보이는 모든 부분을 포함하는 가장 작은 박스」[22], VISOR는 조각을 하나로 합치고[15], COCO의 갈라진 물체도 한 인스턴스다[21]. 조각별 박스로 라벨하라는 권고는 찾지 못했다. 다만 갈라진 물체는 재현율이 절반 수준으로 어렵다[21]. 「쥐었는가」 판정은 물체 박스 대신 **손의 접촉 상태를 직접 분류**하는 설계도 있다[14][16](설계 대안, 이번 결정 범위 밖).
5. **건너뛰기 기준 — 약~중.**
   - ① 공식 가이드라인의 수치 기준은 **가시 10~20% 미만이거나 대상이 뭔지 확신이 없으면 라벨하지 않음**이 유일하다[23](실험 근거는 없음).
   - ② 가시율 10% 미만은 amodal 검출 AP가 약 1이라 학습해도 이득이 거의 없다[20].
   - ③ 「판단 불가」를 **그냥 배경으로 두면 해롭고**, ignore(무시) 처리 시 1.33 MR 개선이 실측됐다[13]. 다만 Ultralytics가 ignore 영역을 지원하는지는 ⚠️ 미확인.
   - ④ 확신 없는 라벨에는 불확실·difficult 표시를 붙여 나중에 분리 평가할 수 있게 한다[20][23].
   - ⑤ 누락 노이즈와 위치 노이즈가 섞이면 악화가 커지므로[9], 건너뛰기 기준은 **문서로 고정하고 모든 라벨러가 같게** 적용한다.
6. **일관성 확보 수단 — 중.** 부류별 정답 예시와 흔한 실수 예시를 라벨러에게 보여준다[22]. 규칙을 명문화해 사람 간 일치 90 IoU를 얻은 사례가 있다[15]. 불일치가 큰 부류만 이중 라벨로 합의한다[10]. 사람 재라벨 한계는 IoU 약 0.87이고 작은 물체일수록 낮다[22].

**근거의 한계**: 대부분의 실험은 COCO·VOC·보행자(3인칭·큰 물체·2단계 검출기) 기반이다. **1인칭 저화질·손끝에 가린 작은 버튼·YOLO/INT8 조건에서 modal과 amodal을 직접 비교한 연구는 없다.** 위 방향은 프로젝트 데이터로 A/B 실측해 확인해야 하는 가설이다(같은 이미지를 두 정의로 라벨 → 같은 설정으로 학습 → 실제 판정 로직 기준으로 평가).

## 조회 통계·못 찾은 것
- **본문까지 읽음(PDF 텍스트 대조) 20편**: [1]~[16], [18]~[22]. **본문 일부 검색만 4건**: HOI4D, EgoSurgery-Tool, 서베이 [24], TOOD의 해당 식. **공식 문서 1건**: VOC2006 가이드라인. 로컬 코드 1건(Ultralytics 8.4.117 loss.py·tal.py). 웹검색 6회, WebFetch 17회, PDF 내려받기 26건.
- 블로그: 검색 결과에 여러 라벨링 업체 글이 섞여 나왔으나 **사용하지 않음**.
- **⚠️ 못 찾은 것**
  - 같은 검출기·같은 데이터에서 박스 정의(modal/amodal)만 바꿔 학습해 비교한 **박스 검출 통제 실험**(마스크 분할 [4]만 해당).
  - 작은 물체가 일부 가려질 때 visible 박스로 라벨하는 효과를 직접 잰 연구.
  - 100DOH·EgoHOS·HOI4D의 2D 물체 박스·마스크가 가려진 부분을 포함하는지를 밝힌 문장.
  - TEgO·Ego4D의 라벨 정의(미조회).
  - Ultralytics YOLO의 ignore 영역 지원 여부(조사 범위 밖).
  - VOC2011 가이드라인: 호스트 접속이 거부되어 2006판으로 대체.
  - 학회명: 본문에서 확인되지 않은 논문은 `⚠️ 학회 미확인`으로 표시.
- PDF 원본·텍스트는 `scratchpad/occlusion/pdf/`에 있다(재대조용).
