# Model-level approaches for automatic bounding-box labeling (2024–2026): open-vocabulary, visual-prompt/few-shot, video propagation, pseudo-labeling, layout rules, label-noise evidence

> Scope note: researched 2026-09-28. Every number below is a *reported* number from the cited source unless it is under "Inferences". Project context (8 classes: 5 identity-named console buttons B1–B4/EMO + 3 hand tools; ego head-cam 768×1024, JPEG q≈53, blur, hand occlusion; B3-pink vs EMO-red confusion) is used only to judge usefulness.

## 1. Text-prompted open-vocabulary detectors (Grounding DINO 1.x, DINO-X, OWLv2, YOLO-World, YOLOE, Florence-2, SAM 3, T-Rex2): accuracy, color/attribute and small-object failures, speed, license, local GPU

### Takeaway
Text-prompted detectors are good at generic categories ("button", "screwdriver") but weak at color/attribute discrimination and near-useless zero-shot on specialized/industrial domains (RF100-VL "Industrial" zero-shot ≈ 8–10 mAP). No benchmark shows any of them reliably separating two same-shape objects by a color adjective such as pink vs red; SAM 3 (Nov 2025) is the only one that explicitly targets attribute discrimination (presence token) and it still lists fine-grained/out-of-domain concepts as a limitation.

### Cited Findings

**Model roster (date · license · headline zero-shot numbers)**

| Model (date) | License / access | Reported accuracy | Speed / size |
|---|---|---|---|
| Grounding DINO (arXiv Mar 2023, ECCV 2024) | Apache-2.0, open weights — [GitHub API](https://github.com/IDEA-Research/GroundingDINO), [HF](https://huggingface.co/IDEA-Research/grounding-dino-base) | LVIS minival zero-shot 27.4 AP (Swin-T), 33.9 AP (Swin-L); ODinW-35 avg 22.3/26.1 — [T-Rex2 Table 1](https://arxiv.org/pdf/2403.14610). ODinW-13 49.2 but RF100-VL only 15.7 mAP — [RF100-VL](https://arxiv.org/pdf/2505.20612) | 172M params (Swin-T) — [YOLOE Table 1](https://arxiv.org/html/2503.07465) |
| Grounding DINO 1.5 Pro / Edge (May 2024) | Delivered via IDEA "API" repo — [arXiv 2405.10300](https://arxiv.org/abs/2405.10300), [API README](https://github.com/IDEA-Research/Grounding-DINO-1.5-API/blob/master/README.md) | Pro: 54.3 AP COCO, 55.7 AP LVIS-minival zero-shot; Edge: 36.2 AP LVIS-minival — [arXiv 2405.10300](https://arxiv.org/abs/2405.10300) | Edge 75.2 FPS with TensorRT — same |
| Grounding DINO 1.6 Pro (2024) | API — [DINO-X paper](https://arxiv.org/html/2411.14347v3) | 55.4 AP COCO, 57.7 AP LVIS-minival, 51.1 AP LVIS-val — [DINO-X paper](https://arxiv.org/html/2411.14347v3) | — |
| DINO-X Pro (Nov 2024) | API — [DINO-X-API](https://github.com/IDEA-Research/DINO-X-API) | 56.0 AP COCO, 59.8 AP LVIS-minival, 52.4 AP LVIS-val; rare classes 63.3 / 56.5 AP; supports text, visual and "customized" prompts and a prompt-free mode — [arXiv 2411.14347](https://arxiv.org/abs/2411.14347) | — |
| OWLv2 / OWL-ST (Jun 2023, NeurIPS 2023) | Apache-2.0, open weights — [HF](https://huggingface.co/google/owlv2-base-patch16-ensemble) | 44.6% zero-shot LVIS mAP_rare (L/14), 47.2% (G/14) — [arXiv 2306.09683](https://arxiv.org/abs/2306.09683). RF100-VL zero-shot 13.6 mAP (Industrial 7.8) — [RF100-VL](https://arxiv.org/pdf/2505.20612) | — |
| YOLO-World (Jan 2024, CVPR 2024) | GPL-3.0 (repo) — [GitHub API](https://github.com/AILab-CVC/YOLO-World) | 35.4 AP LVIS at 52.0 FPS on V100 — [arXiv 2401.17270](https://arxiv.org/abs/2401.17270); v2-S/M/L 24.4/32.4/35.5 AP — [YOLOE Table 1](https://arxiv.org/html/2503.07465) | v2-L 80.0 FPS T4 — same |
| YOLOE (Mar 2025, ICCV 2025) and YOLOE-26 (Ultralytics, 2026) | AGPL-3.0 — [THU-MIG repo](https://github.com/THU-MIG/yoloe), [HF](https://huggingface.co/jameslahm/yoloe) | YOLOE-v8-L 35.9 AP (text) / 34.2 AP (visual) LVIS; +3.5 AP over YOLO-Worldv2-S at 1.4× speed — [arXiv 2503.07465](https://arxiv.org/html/2503.07465). YOLOE-26x 40.6 (text) / 38.5 (visual) mAP50-95 LVIS — [Ultralytics docs](https://docs.ultralytics.com/models/yoloe/) | v8-L 102.5 FPS T4; "inference needs an NVIDIA GPU with 4-8 GB of VRAM" — [Ultralytics docs](https://docs.ultralytics.com/models/yoloe/) |
| Florence-2 (arXiv Nov 2023; HF weights Jun 2024) | MIT — [HF](https://huggingface.co/microsoft/Florence-2-large) | seq2seq model doing captioning, detection, grounding, segmentation from text task prompts; trained on FLD-5B (5.4B annotations / 126M images) — [arXiv 2311.06242](https://arxiv.org/abs/2311.06242) | — (numbers not retrieved; see Gaps) |
| T-Rex2 (Mar 2024, ECCV 2024) | API only ("API code for T-Rex2"; repo license NOASSERTION); free API for educators/students/researchers — [GitHub](https://github.com/IDEA-Research/T-Rex) | Swin-L LVIS-minival: text 54.9 AP, visual 47.6 AP; ODinW-35: text 22.0, visual 27.8; Roboflow100: text 10.5, visual 18.5 — [arXiv 2403.14610 Table 1](https://arxiv.org/pdf/2403.14610) | — |
| SAM 3 "Segment Anything with Concepts" (Meta, released 2025-11-19; SAM 3.1 "Object Multiplex" 2026-03-27) | "SAM License" (custom); HF checkpoints gated/manual approval — [GitHub](https://github.com/facebookresearch/sam3), [HF API](https://huggingface.co/facebook/sam3) | ODinW13 zero-shot 61.0 AP vs 58.7 for GDINO-1.5-Pro; 10-shot 71.8 vs 67.9; RF100-VL zero-shot 15.2, 10-shot 36.5 — [arXiv 2511.16719](https://arxiv.org/html/2511.16719v1). LVIS mask AP: 47.0 (vs 38.5 previous best) per [Ultralytics](https://docs.ultralytics.com/models/sam-3) vs 48.5 AP per [alphaXiv/search summary of paper Table 1](https://www.alphaxiv.org/abs/2511.16719) — conflicting | "30 ms for a single image with 100+ detected objects" on H200 — [arXiv](https://arxiv.org/html/2511.16719v1). Params: 848M per [GitHub README](https://github.com/facebookresearch/sam3) vs 473.6M / 3.45 GB per [Ultralytics](https://docs.ultralytics.com/models/sam-3) — conflicting |

**Domain transfer (the most relevant benchmark for a custom industrial console)**
- RF100-VL (arXiv May 2025; 100 Roboflow Universe datasets, 7 domains): zero-shot mAP on all 100 datasets — Detic 9.5, GroundingDINO 15.7, OWLv2 13.6, MQ-GLIP 12.2, Qwen2.5-VL-72B 5.6, Gemini 2.5 Pro 11.6; on the **Industrial** split — GroundingDINO 10.3, OWLv2 7.8, Gemini 2.5 Pro 8.6 — [RF100-VL Table 2](https://arxiv.org/pdf/2505.20612).
- Same paper: fully-supervised YOLOv8n reaches 54.9 mAP on RF100-VL, versus 15.7 for the best zero-shot model — [RF100-VL](https://arxiv.org/pdf/2505.20612).
- "Multi-Modal Annotator Instructions Provide Limited Benefit" — rich class descriptions gave inconsistent gains (Qwen2.5-VL improves, Gemini 2.5 Pro degrades, 11.6 → 4.5 mAP) — [RF100-VL](https://arxiv.org/pdf/2505.20612).
- Specialist open-vocabulary detectors (Detic, GroundingDINO, OWLv2, MQ-GLIP) "consistently outperform MLLMs like Qwen 2.5 VL, Gemini 2.5 Pro" on detection — [RF100-VL](https://arxiv.org/pdf/2505.20612).

**Color / attribute and position discrimination**
- OVDEval (AAAI 2024; hard negatives built by swapping attribute words): Color NMS-AP — GLIP 3.7, FIBER 6.8, Grounding DINO 9.4, Detic 3.9, MDETR 3.1, OmDet 22.9; authors: "all models exhibit poor performance on color and material tasks" — [arXiv 2308.13177](https://arxiv.org/html/2308.13177v2).
- OVDEval Position subset ("identifying specific objects among multiple visually similar items… based on the spatial relationships"; negatives swap left/right/above/under): Grounding DINO 67.5 NMS-AP, far above GLIP 30.9 and Detic 12.2, attributed to RefCOCO pre-training — [arXiv 2308.13177](https://arxiv.org/html/2308.13177v2).
- FG-OVD (CVPR 2024, "The devil is in the fine-grained details"): with only 2 candidate captions (N=2), Color mAP — OWLv2 53.3, OWL-ViT 43.8, ViLD 43.2, Grounding DINO 41.0, CORA 25.0, Detic 21.5; "Color is the easiest feature for most detectors"; pattern (19.2–36.0) and transparency (12.2–34.1) are harder — [arXiv 2311.17518](https://arxiv.org/html/2311.17518).
- Follow-ups (2024–2026) still frame fine-grained attributes as unsolved: "Existing approaches primarily focus on class-level discrimination, often failing to capture fine-grained object attributes such as color, pattern, and material" — [HA-FGOVD arXiv 2409.16136](https://arxiv.org/pdf/2409.16136), [FG-OVD with fine-grained prompts arXiv 2503.14862](https://arxiv.org/html/2503.14862v2), [DSAA arXiv 2605.18023](https://arxiv.org/pdf/2605.18023).
- SAM 3 adds a "presence token" to improve discrimination between closely related prompts (README example: "a player in white" vs "a player in red") — [SAM 3 GitHub](https://github.com/facebookresearch/sam3). Yet the paper/docs list limits: struggles with "out-of-domain terms", restricted to "simple noun phrases", not for "long referring expressions or queries requiring reasoning"; "Performance may degrade on extremely rare or fine-grained concepts"; occlusion and blur "obscure the extent of the object" — [arXiv 2511.16719](https://arxiv.org/html/2511.16719v1), [Ultralytics SAM 3](https://docs.ultralytics.com/models/sam-3).
- YOLOE docs: "Zero-shot accuracy is well below a model trained on your classes"; prompts describing "state, context or comparison" have "no reliable handle to match on" — [Ultralytics YOLOE](https://docs.ultralytics.com/models/yoloe/).

**Speed/threshold behavior as auto-labelers (Voxel51, Jun 2025, L40S GPU)**
- Auto-labeling VOC took 197.2 s (YOLO-World, 72.9M), 204.9 s (YOLOE, 35.2M), 2,290.3 s (Grounding DINO-T, 172.2M) — [arXiv 2506.02359 Table 1](https://arxiv.org/pdf/2506.02359).
- "GDINO has the greatest sensitivity to changes in α"; its VOC F1 falls from 0.759 at α=0.5 to 0.034 at α=0.9 — [arXiv 2506.02359](https://arxiv.org/pdf/2506.02359).

**Local GPU (RTX 50-series / sm_120)**
- PyTorch 2.7 (Apr 2025) is the first stable release with Blackwell support and cu128 wheels — [PyTorch blog](https://pytorch.org/blog/pytorch-2-7/).
- SAM 3 requires Python ≥3.12, PyTorch ≥2.7, CUDA ≥12.6 — [SAM 3 GitHub](https://github.com/facebookresearch/sam3).
- Grounding DINO's custom deformable-attention CUDA op failed on RTX 5090 with "ms_deformable_im2col_cuda: no kernel image is available"; reported cause was installing with `--no-build-isolation`, fixed by rebuilding without it — [Grounded-SAM-2 issue #114](https://github.com/IDEA-Research/Grounded-SAM-2/issues/114); setup notes — [Medium](https://medium.com/@limyoonaxi/running-grounded-sam-2-groundingdino-and-pointnet-on-rtx-5090-setup-notes-and-pitfalls-478ffc79e457).

### Inferences
- For the project, text prompts can at best produce generic boxes ("round button", "screwdriver", "pliers", "wrench"). Distinguishing B3-pink from EMO-red by a color word is exactly the weakest measured capability (OVDEval Color ≤ 23 NMS-AP for all models; GDINO 9.4). This matches the project's own observation that Grounding DINO via Roboflow could not separate B3 from EMO.
- Grounding DINO's comparatively strong *Position* score (67.5) suggests "button on the top right" prompts are somewhat better than color prompts, but OVDEval position phrases are relational to other named objects in natural photos, not a fixed panel; still unproven for this use.
- SAM 3 is the most promising text/exemplar model to *try* (presence token, negative exemplars, open weights), but its RF100-VL zero-shot (15.2) is not better than GDINO (15.7), so domain gap remains. Weights are gated (manual approval) and licensed under a custom SAM License — acceptable for a student demo but must be checked before redistribution.
- On an RTX 5060 (sm_120), pure-PyTorch models (Ultralytics YOLOE/YOLO-World, OWLv2 via HF, Florence-2 via HF, SAM 2/3) should run once PyTorch ≥2.7 cu128 is installed; Grounding DINO needs its CUDA op rebuilt for sm_120 (or the HF transformers port, which does not need the custom op — not verified here). API-only models (GDINO 1.5/1.6, DINO-X, T-Rex2) avoid local GPU issues but send frames off-site.
- VRAM: RTX 5060 VRAM size was not checked in this research; SAM 3 at 848M params would be ~1.7 GB in fp16 weights alone (arithmetic, not measured).

### Gaps
- No source reports small-object AP (e.g., objects 19–94 px) for these OVD models on a comparable domain; LVIS APs/APm/APl were not retrieved.
- SAM 3 LVIS numbers and parameter count conflict between the paper summary, GitHub and Ultralytics (47.0 vs 48.5 mask AP; 848M vs 473.6M params); the primary PDF table was not read directly.
- Florence-2 detection accuracy numbers (COCO/LVIS) were not retrieved.
- I did not verify whether Grounding DINO 1.5/1.6/DINO-X weights have ever been released publicly; they appeared API-only in the sources seen.
- No benchmark tests pink-vs-red or low-exposure color discrimination specifically.

## 2. Visual-prompt / exemplar-based detection and few-shot fine-tuning — can any be taught "this specific button" from a handful of examples?

### Takeaway
Visual prompts (T-Rex2, YOLOE-VP, DINO-X, SAM 3 exemplars) help most on long-tail/unusual domains (T-Rex2 visual beats text on Roboflow100: 18.5 vs 10.5 AP), but they are designed to find *all instances of a concept*, not one instance among look-alikes. The strongest evidence for learning new concepts from few examples is gradient fine-tuning: 10-shot fine-tuned Grounding DINO reaches 33.6 mAP on RF100-VL (vs 15.7 zero-shot), SAM 3 36.5, and CVPR 2025 challenge winners ~50 mAP — still far below full supervision (YOLOv8n 54.9). Instance-level matching (DINOv2 template embeddings, NIDS-Net) is the literature closest to "this specific button".

### Cited Findings
- T-Rex2 (ECCV 2024) supports an "interactive visual prompt" workflow (draw boxes on the current image) and a "generic visual prompt" workflow where embeddings from example boxes on n images are averaged and applied to other images — [arXiv 2403.14610](https://arxiv.org/pdf/2403.14610), [GitHub](https://github.com/IDEA-Research/T-Rex).
- T-Rex2 Swin-L: text vs visual prompt — LVIS-minival 54.9 vs 47.6 AP (text better on common classes); ODinW-35 22.0 vs 27.8 and Roboflow100 10.5 vs 18.5 AP (visual better on uncommon domains) — [T-Rex2 Table 1](https://arxiv.org/pdf/2403.14610).
- YOLOE visual prompts (SAVPE): LVIS protocol averages visual embeddings from N=16 randomly sampled training images per category; YOLOE-v8-L visual 34.2 AP vs T-Rex2 visual 37.4 AP (Swin-T), YOLOE claiming +3.3 AP_r over T-Rex2 — [arXiv 2503.07465](https://arxiv.org/html/2503.07465).
- Ultralytics YOLOE: visual prompts are given as `bboxes` + `cls` arrays, optionally on a separate `refer_image`; results come back as generic names "object0, object1"; fine-tuning via full fine-tune or linear probing — [Ultralytics YOLOE](https://docs.ultralytics.com/models/yoloe/).
- SAM 3: prompts can be a noun phrase, "a positive or negative image exemplar, or both"; with 1 exemplar box on COCO, SAM 3 reaches 78.1 AP+ vs T-Rex2 58.5; text+image prompts beat text-only by +18.3 (COCO), +10.3 (LVIS), +20.5 (ODinW) AP+; "After 3 clicks, interactive PCS outperforms text-only by +21.6 cgF1" — [arXiv 2511.16719](https://arxiv.org/html/2511.16719v1), [Ultralytics SAM 3](https://docs.ultralytics.com/models/sam-3). SAM 3 repo also ships fine-tuning code — [GitHub](https://github.com/facebookresearch/sam3).
- DINO-X supports "visual prompt, and customized prompt" in addition to text — [arXiv 2411.14347](https://arxiv.org/abs/2411.14347).
- Few-shot (10 instances/class) on RF100-VL: fine-tuned GroundingDINO 33.6 mAP (Industrial 37.8); YOLOv8n 20.2 (21.7 with federated loss); Detic w/ federated loss 22.8; MQ-GLIP image-only prompts 6.4; Gemini 2.5 Pro with images 9.8 — [RF100-VL Table 2](https://arxiv.org/pdf/2505.20612). Authors: "fine-tuning GroundingDINO achieves the best few-shot performance… large-scale task-specific pre-training makes it easier to learn new concepts" — same.
- CVPR 2025 Foundational FSOD challenge (Roboflow20-VL, 10-shot): winner BEATON 50.4 mAP (Industrial 62.0) vs GroundingDINO fine-tune 33.4 — [RF100-VL Table 3](https://arxiv.org/pdf/2505.20612).
- Instance-level detection: NIDS-Net (arXiv May 2024, IROS 2025; MIT) detects/segments *specific object instances* given "a few examples of each instance" — Grounding DINO + SAM produce proposals, DINOv2 foreground-averaged patch embeddings plus a weight adapter "enhance the distinctiveness of instance embeddings", then proposals are matched to templates; reports SOTA on four instance-detection datasets and seven BOP benchmarks — [arXiv 2405.17859](https://arxiv.org/abs/2405.17859), [GitHub](https://github.com/IRVLUTD/NIDS-Net).
- In the project-agnostic Voxel51 study, the downstream detector architecture mattered more than label source: "switching from YOLO11n with human labels to YOLO11s with AL increases VOC mAP 2–5% and COCO mAP 9–11%" — [arXiv 2506.02359](https://arxiv.org/pdf/2506.02359).

### Inferences
- Exemplar/visual prompting encodes "what the object looks like"; B3 (pink) and EMO (red with white rim) are both round buttons, so an averaged exemplar embedding may cover both. SAM 3's *negative exemplar* (mark EMO as negative when prompting for B3) is the one mechanism that directly targets this, but no source measured it on near-identical instances.
- For a fixed console with 5 buttons that never change, the task is closer to *instance detection* (NIDS-Net style: generic proposal → per-crop embedding match against templates) or simply supervised training, than to open-vocabulary detection.
- The project's existing loop (own YOLOv8n pre-labels covering ~92% of boxes) is already the "label few → train small → pre-label rest" pattern that RF100-VL and Voxel51 show beats zero-shot VLMs on specialized domains; a larger student (YOLO11s/m) or a fine-tuned GDINO/SAM 3 teacher on the desktop GPU is the evidence-backed upgrade path.

### Gaps
- No paper found that measures exemplar-prompt detectors on *distinguishing two instances of the same shape differing only by color*.
- No published numbers for "label 20–50 images" loops specifically; RF100-VL uses 10 instances/class, which is a different unit.
- NIDS-Net's exact template count and AP numbers were not extracted.

## 3. Video label propagation (SAM 2 / 2.1, SAM 3 video, SAMURAI, Cutie, XMem): fast head motion, blur, hand occlusion

### Takeaway
Keyframe-then-propagate works on stable scenes, but every primary source lists exactly the project's conditions as failure modes: fast motion, long occlusion, similar-looking nearby objects, and egocentric camera motion. Propagation should be treated as a pre-label generator with re-prompting on failure frames, not as ground truth.

### Cited Findings
- SAM 2 (Jul 2024; SAM 2.1 checkpoints Sep 2024; Apache-2.0) limitations: "may fail to segment objects across shot changes and can lose track of or confuse objects in crowded scenes, after long occlusions or in extended videos"; "struggles with accurately tracking objects with very thin or fine details especially when they are fast-moving"; "nearby objects with similar appearance (e.g., multiple identical juggling balls)" are hard; each object is tracked separately "without inter-object communication"; mitigation = refinement clicks on additional frames — [arXiv 2408.00714 App. C](https://arxiv.org/pdf/2408.00714), license — [HF](https://huggingface.co/facebook/sam2.1-hiera-large).
- SAMURAI (Nov 2024; Apache-2.0): SAM 2 "faces challenges… particularly when managing crowded scenes with fast-moving or self-occluding objects"; its fixed-window memory ignores memory quality "leading to error propagation"; SAMURAI adds motion-aware memory selection without retraining, +7.1% AUC on LaSOT_ext and +3.5% AO on GOT-10k — [arXiv 2411.11922](https://arxiv.org/abs/2411.11922).
- A 2025 analysis: under "long-term occlusion, fast motion, or visually similar distractors, unreliable frames are frequently written into memory, leading to error accumulation and identity drift" — [arXiv 2512.22624](https://arxiv.org/html/2512.22624) (from search summary of the abstract).
- Cutie (Oct 2023, MIT): object-level memory reading; pixel-level memory "struggles due to matching noise, especially in the presence of distractors"; +8.7 J&F over XMem on MOSE at similar speed — [arXiv 2310.12982](https://arxiv.org/abs/2310.12982). XMem (2022) is MIT — [GitHub API](https://github.com/hkchengrex/XMem).
- EgoTracks (Jan 2023, Ego4D-based): egocentric video has "frequent large camera motions and hand interactions with objects commonly lead to occlusions or objects exiting the frame"; SOTA single-object trackers "score poorly" vs popular benchmarks; the re-detection problem is under-emphasized elsewhere — [arXiv 2301.03213](https://arxiv.org/abs/2301.03213).
- SAM 3 video: propagates instance identities; reports cgF1 36.4 on its SmartGlasses (egocentric) domain vs 50.8 on YT-Temporal-1B, and MOSEv2 60.3 J&F vs 53.8 previous best (Ultralytics quotes 60.1); "inference latency scales with the number of objects, sustaining near real-time performance for ∼5 concurrent objects" (H200) — [arXiv 2511.16719](https://arxiv.org/html/2511.16719v1), [Ultralytics](https://docs.ultralytics.com/models/sam-3).

### Inferences
- The project's hardest frames (a hand covering the button being pressed; fast head turns with blur) are the documented SAM 2 failure cases; the pressed button is also the one that matters most for SOP events, so propagated labels are least reliable exactly where they matter.
- A fixed console helps: the 5 buttons move rigidly together, so one could propagate a *panel* (homography/layout, see §5) rather than 5 independent masks; individual SAM 2 tracks of the pink and red buttons are at risk of identity swap ("similar appearance" failure).
- Tools (screwdriver/wrench/pliers in gloved hands) are the better fit for propagation: single salient object, but hand occlusion and exit/re-entry (EgoTracks) still require periodic re-prompting.
- Practical protocol implied by the sources: prompt a keyframe, propagate, then re-prompt at detected failure frames (low mask score / box jump) and have a human spot-check; SAM 2's own paper recommends refinement clicks.

### Gaps
- No benchmark quantifying SAM 2 / Cutie accuracy vs motion-blur magnitude or JPEG quality was found.
- No egocentric-specific SAM 2 numbers on EgoTracks or VISOR were retrieved (only a secondary claim that SAM 2 does better on hands than objects in a long-term VOS benchmark).
- Compute of SAM 3 video on an 8-GB-class consumer GPU is unreported.

## 4. Pseudo-labeling, self-training and active learning for detection: gains, confirmation bias, thresholds, review sampling

### Takeaway
Self-training reliably helps when labeled data is scarce (~+10 mAP at 0.5–2% labels on COCO), and auto-labels from foundation models can train detectors to within ~4–5 mAP50 of human labels on common-object datasets — but all methods name pseudo-label bias/noise as the core risk. Low confidence thresholds (≈0.2–0.5) maximize downstream mAP for generic classes because recall matters more than precision; label-cleaning tools that flag suspicious boxes for human review recover much of the damage.

### Cited Findings
- Unbiased Teacher (Feb 2021) identifies "the pseudo-labeling bias issue" in semi-supervised detection; with a class-balance loss to down-weight over-confident pseudo-labels it gains "around 10 mAP… against the supervised baseline when using only 0.5, 1, 2% of labeled data on MS-COCO" — [arXiv 2102.09480](https://arxiv.org/abs/2102.09480).
- Efficient Teacher (Feb 2023, first SSOD for YOLOv5): one-stage anchor-based detectors get "serious inconsistency problems" from pseudo labels; its Pseudo Label Assigner "prevents the occurrence of bias caused by a large number of low-quality pseudo labels" — [arXiv 2302.07577](https://arxiv.org/abs/2302.07577).
- Label mismatch "leads to severe confirmation bias during self-training"; remedy = category-specific, adaptively updated confidence thresholds — [Label Matching SSOD, CVPR 2022](https://openaccess.thecvf.com/content/CVPR2022/papers/Chen_Label_Matching_Semi-Supervised_Object_Detection_CVPR_2022_paper.pdf).
- OWLv2's web-scale self-training deliberately applies "only weak confidence filtering" ("let the data do the work") — [arXiv 2306.09683](https://arxiv.org/abs/2306.09683).
- Voxel51 "Auto-Labeling Data for Object Detection" (Jun 2025; 445 training runs; YOLO-World, YOLOE, GDINO-T as labelers; YOLO11 students; L40S):
  - Human vs auto-label (YOLO-World, α=0.2) training: VOC YOLO11n 0.756 vs 0.715 mAP50, YOLO11s 0.817 vs 0.768; COCO YOLO11n 0.496 vs 0.460, YOLO11s 0.588 vs 0.538 — [arXiv 2506.02359 Table 5](https://arxiv.org/pdf/2506.02359).
  - Cost: VOC human labeling 78 h / $1,442 vs auto-labeling 0.06 h / $0.05; all four datasets 6,703 h / $124,092 vs 1.27 h / $1.18 — same, Table 4.
  - "the top mAP50 results for each AL model use relatively low α settings between peak AL recall and AL F1 score"; "using high α causes a collapse of F1 scores" — same. Peak F1 thresholds differ by dataset (e.g., YOLOW-0.5 on VOC, YOLOE-0.3 on LVIS, YOLOW-0.05 on BDD) — same.
  - On LVIS (1,203 classes) no student exceeded 0.09 mAP50 even with human labels; hard, rare, out-of-distribution classes (BDD driving views, LVIS "eye dropper") are where AL degrades — same.
- VLM pseudo-labels + per-object co-teaching (Nov 2025): two YOLO models filter unreliable boxes by per-object loss; KITTI mAP@0.5: YOLOv5m on raw VLM pseudo-labels 31.12% → 46.61% with co-teaching → 57.97% after adding 10% ground truth — [arXiv 2511.09955](https://arxiv.org/abs/2511.09955).
- CLOD / "Combating noisy labels in object detection datasets" (Nov 2022; journal 2025): flags missing, spurious, mislabeled and mislocated boxes; finds "nearly 80% of artificially disturbed bounding boxes with a false positive rate below 0.1"; cleaning with the most confident suggestions improved mAP by 16–46% — [arXiv 2211.13993](https://arxiv.org/abs/2211.13993), [Springer ML](https://link.springer.com/article/10.1007/s10994-025-06976-x).
- Active learning: PPAL (Nov 2022) = two-stage uncertainty (category-wise difficulty-calibrated) + diversity (k-Means++) sampling; detector-agnostic; outperforms prior AL on COCO/VOC — [arXiv 2211.11612](https://arxiv.org/abs/2211.11612).

### Inferences
- The "low threshold is best" result is for *generic* classes where the main risk is missing boxes. For identity classes where the main risk is *swapped* classes (B3↔EMO), §6 shows categorization noise is the most damaging type, so thresholding should be on *class margin* (top-1 vs top-2 score between B3 and EMO), not only on objectness — boxes with small margin go to human review.
- Confirmation-bias risk is concrete here: if the pre-label model systematically calls dim-exposure B3 "EMO", retraining on accepted pre-labels will entrench it. Mitigations with source support: human review of a sample stratified by uncertainty (PPAL), automatic flagging (CLOD-style), co-teaching of two models, and never letting pre-labels touch the test set.
- Given 92% coverage already, the marginal value lies in the remaining 8% plus confusion-pair review, not in replacing the loop with a foundation model.

### Gaps
- No source gave a recommended human-review sampling rate (e.g., "review x% of accepted pre-labels"); this remains a practitioner choice.
- The 0.7 threshold commonly used in teacher–student SSOD was not confirmed from a primary source in this session.

## 5. Rule-based post-processing: assigning identity classes by spatial layout on fixed panels

### Takeaway
Direct literature on "detect generic buttons, then name them by relative position on a fixed panel" for dataset labeling is sparse; the closest body of work is robotic elevator-button recognition, which uses grid/layout fitting to recover missed buttons, correct perspective and fix misrecognized labels. Open-vocabulary position prompts (Grounding DINO) are a weaker alternative.

### Cited Findings
- Elevator panels: an algorithm fits a grid with a Gaussian Mixture Model "based on button recognition results, then utilizes the estimated grid centers as reference features to estimate camera motions for correcting perspective distortions", without explicit feature matching; evaluated on 50 panel images from different viewpoints — [arXiv 1912.11774](https://arxiv.org/abs/1912.11774).
- Related elevator-button work reports that buttons follow a regular grid so "through fitting a grid… buttons not detected by the detector can be retrieved", and misrecognized characters "can even be corrected by leveraging the rules of button layout" — [arXiv 2007.11806](https://arxiv.org/pdf/2007.11806) (quoted via search summary), [OCR-RCNN, IROS 2018](https://ieeexplore.ieee.org/document/8594071/), [large-scale elevator button dataset arXiv 2103.09030](https://arxiv.org/pdf/2103.09030).
- Template/homography registration of a known layout (store template images + homographies, match by RANSAC) is a standard pattern in patents — e.g., [US 11361532 OCR-based object registration](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11361532), [US 8849624 control-panel simulation](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8849624).
- Model-based position reasoning exists but is limited: Grounding DINO scores 67.5 NMS-AP on OVDEval's Position subset (others 12–34) — [arXiv 2308.13177](https://arxiv.org/html/2308.13177v2).

### Inferences
- For this project, a layout rule is attractive because the 5 buttons have a fixed geometric arrangement (B2 top-left, B3 top-right, B1 bottom-left, B4 bottom-right, EMO bottom-center). Relative position is invariant to exposure and JPEG color shifts — the exact conditions that break the hue rule (122 B3↔EMO errors).
- Failure modes to expect (inferred): partial views where only 1–2 buttons are visible (no reference frame), strong head roll, and a hand occluding a button so the "grid" has a hole. Mitigation: require ≥3 visible buttons (or a panel-edge/template homography) before assigning by layout; otherwise fall back to human labeling or appearance.
- A hybrid is supported in spirit by the elevator literature: detector → layout fit → use layout to correct/complete appearance-based labels, with disagreements routed to review.

### Gaps
- I found no peer-reviewed study that uses layout rules specifically to *auto-label training data* for a fixed control/instrument panel and reports label accuracy.
- No accuracy numbers retrieved for the elevator layout-correction step itself.

## 6. Evidence on label noise: wrong labels vs missing labels in detector training

### Takeaway
Across studies, **wrong class labels (categorization noise) hurt more than missing boxes**, and mixed noise compounds super-additively at higher rates. At 20% noise on COCO (Faster R-CNN), class noise cost 2.4 AP vs 1.3 AP for missing boxes; a 2024 study on YOLOv5/YOLOv8/Faster R-CNN ranks uniform class noise worst, then spurious boxes, then missing boxes.

### Cited Findings
- Universal Noise Annotation (UNA, Dec 2023), COCO, Faster R-CNN-FPN-R50, clean 37.4 AP: at 5/10/15/20% noise — categorization −0.9/−1.4/−1.7/−2.4; localization −0.4/−0.8/−1.7/−2.0; missing −0.3/−0.6/−1.0/−1.3; bogus (extra) boxes −0.2/−0.5/−0.8/−0.9; all four combined (UNA) −1.7/−4.3/−7.5/−10.8 — [arXiv 2312.13822 Table 2](https://arxiv.org/pdf/2312.13822).
- UNA authors: "categorization noise had the most significant negative impact… Categorization noise may work as adversarial noise that disrupts the learning process of other clean label"; at 20% the combined drop (10.8) exceeds the sum of individual drops (6.7), i.e., noise types interact at higher levels; noise also lowers confidence scores in ways mAP may not reflect — [arXiv 2312.13822](https://arxiv.org/pdf/2312.13822).
- "Beyond clean data" (Knowledge-Based Systems vol. 304, 2024; YOLOv5, YOLOv8, Faster R-CNN on COCO, VOC, ExDARK): "Uniform label noise was the most detrimental to the quality of the models, followed by spurious boxes and missing boxes" — [ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S095070512401178X), [ACM DL](https://dl.acm.org/doi/abs/10.1016/j.knosys.2024.112544).
- CLOD: cleaning flagged boxes improved mAP by 16–46% depending on dataset — [arXiv 2211.13993](https://arxiv.org/abs/2211.13993).
- VLM pseudo-labels without filtering trained a YOLOv5m to 31.12% mAP@0.5 on KITTI vs 57.97% with co-teaching + 10% GT — [arXiv 2511.09955](https://arxiv.org/abs/2511.09955).

### Inferences
- The B3↔EMO swap is the most harmful noise type (categorization) and it is *systematic* (dim exposure), not uniform random as in the benchmarks — systematic confusion between a specific pair is likely worse than the uniform-noise numbers suggest because it teaches a consistent wrong boundary (inference, not measured).
- Operational rule implied: when the labeler is unsure between B3 and EMO, it is better to leave the box for human review (or temporarily unlabeled) than to guess, since missing-box noise costs roughly half as much as class noise in UNA.
- Symmetric-noise benchmarks use COCO-scale data; with an 8-class, few-thousand-image dataset, per-class effects will be larger in relative terms (inference).

### Gaps
- A widely repeated claim that detectors keep ">80% of their health with up to 40% label corruption" appeared only in a search-engine summary; I could not pin it to a primary source, so it is excluded.
- No study found on *class-pair-specific* (systematic) confusion noise in detection, which is the project's actual case.
- The "Beyond clean data" paper's exact per-noise-type mAP numbers were behind a paywall and not extracted.
