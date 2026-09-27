# Labeling programs / CLIs / libraries for model-assisted bounding-box labeling and human review (state as of 2026-09)

> Researcher notes. Every "Cited Findings" bullet has a source URL. "Inferences" are my reasoning, not documented facts. Items that rest only on aggregator/review sites (not vendor docs) are tagged **[aggregator]**. Research date: 2026-09-28.

## Overall comparison (objective): which tool does what, headless-ness, custom-model support, export, license, hardware

### Takeaway
No GUI labeling tool offers a true headless "auto-label a folder with my YOLO model" command except CVAT (via `cvat-cli task auto-annotate` against a running CVAT server). The simplest agent-scriptable path is Ultralytics `yolo predict save_txt=True` (or a Python loop) for pre-labels, followed by human review in a GUI (X-AnyLabeling via `xanylabeling convert --task yolo2xlabel`, or Label Studio via `label-studio-converter import yolo --out-type predictions`, or CVAT). Label-error ranking is available locally in FiftyOne (open-source `compute_mistakenness`) and cleanlab (`cleanlab.object_detection`).

### Cited Findings (matrix; each cell sourced in the per-tool sections below)

| Tool | Type / license | How auto-label is invoked | Headless / scriptable? | Own YOLO model | Few-shot / visual prompt | Video propagation | YOLO export | HW notes |
|---|---|---|---|---|---|---|---|---|
| X-AnyLabeling v4.0.6 (2026-09-05) | Desktop GUI, GPL-3.0 | GUI: Auto-Labeling panel (Ctrl+A), batch over images (Ctrl+B, "Auto Run", start/end range since v4.0.6) | CLI only has `help/checks/version/config/convert` — no headless inference; X-AnyLabeling-Server (AGPL-3.0, REST) for remote inference | ONNX + YAML config (no direct `.pt` documented); built-in Ultralytics training → "Apply" registers `best.onnx` | YOLOE visual prompt (per image, not batch), GeCo/GeCo2 exemplar counting, SAM 3, Rex-Omni, CountGD | SAM2-Video / SAM3-Video with Rectangle output on frame folders; Keep Previous Annotation (Ctrl+P); MOT | Yes (`xlabel2yolo`), also COCO/VOC/DOTA/MOT… | Win/Linux CPU, CUDA11/12/13 builds; macOS arm64; Python 3.11–3.13 |
| CVAT Community (self-host) | Web app, MIT | `cvat-cli task auto-annotate <task> --function-file f.py` (local model, uploads results); Nuclio functions in UI | Yes (cvat-cli / cvat-sdk `annotate_task`) | Yes — any Python function (Ultralytics example in docs) | SAM interactor (Nuclio) | Keyframe interpolation (track mode); TransT tracker (Nuclio); SAM2 tracker = Enterprise/Online only | "Ultralytics YOLO Detection" format | Docker Compose, Ubuntu x86_64 / Win10 WSL2+Docker Desktop; ARM64 not documented |
| CVAT Online/Enterprise | SaaS / paid | + "AI agents" (`function create-native`, `function run-agent`) | Yes | Yes (agents run on your GPU) | — | SAM2 tracker via agent (CVAT ≥2.42) | Same | Agent runs on user HW |
| Label Studio | Web app, Apache-2.0 | ML backend (YOLO backend in Docker) or import predictions JSON | Import via API/SDK; `label-studio-converter import yolo --out-type predictions` | YOLO backend: `.pt` in `/app/models`, `ALLOW_CUSTOM_MODEL_PATH=true` | SAM/SAM2/Grounding DINO backends are interactive only | `VideoRectangle` + botsort/bytetrack via YOLO backend | Yes (via converter) | `pip install label-studio`, Python ≥3.10 |
| Ultralytics (library/CLI) | Library/CLI | `yolo predict ... save_txt=True save_conf=True`; `auto_annotate()` (det+SAM → **polygons**) | Fully headless | Native `.pt` | YOLOE `visual_prompts` + `refer_image`; SAM 3 exemplar boxes | SAM3VideoSemanticPredictor | Native YOLO txt | Runs on CPU (Pi) or GPU (needs sm_120-capable torch on RTX 5060) |
| FiftyOne (OSS) | Library + local app | `dataset.apply_model(YOLO("best.pt"), label_field=...)` | Fully headless | Native Ultralytics object | YOLO-World/YOLOE via zoo/Ultralytics | — | `fo.types.YOLOv5Dataset` | Local |
| FiftyOne Enterprise | Paid | Verified Auto-Labeling (confidence-filtered approval UI) | — | fixed-vocab + zero-shot models | — | — | — | Delegated ops on your GPU |
| cleanlab | Library | `find_label_issues`, `get_label_quality_scores` | Fully headless | Consumes any model's predictions | — | — | n/a | CPU |
| supervision | Library | `Detections.from_ultralytics`, `DetectionDataset.from_yolo/as_yolo` | Headless | Yes | — | — | Yes | CPU |
| autodistill | Library/CLI, Apache-2.0 | `autodistill images --base=... --target=...` | Headless | base = foundation models (GroundingDINO, OWLv2…) | text ontology | — | YOLO | **last PyPI release 2024-11-26 — stale** |
| AnyLabeling (original) v0.4.43 | Desktop GUI, GPL-3.0 | GUI | No | YOLOv8, SAM/SAM2/SAM3 | SAM3 text prompt | — | — | Active |
| labelImg | Desktop, MIT | none | — | — | — | — | — | **Archived 2024-02-29 — deprecated** |
| Make Sense | Browser (local), GPL-3.0 | YOLOv5 tfjs / COCO-SSD in browser | No | YOLOv5 exported to tfjs | — | — | Yes | Browser only |
| T-Rex Label | Web SaaS | Visual prompt box → finds similar objects, propagates across images | No | No | Yes (core feature) | — | — | Cloud (upload images) |

### Inferences
- For this project (own console_v2 YOLOv8n for buttons, weak tool_v3), the pre-labeler should be the user's own model; an AI agent can drive it fully headless with Ultralytics on the Pi's Python 3.12 venv (CPU) or on WSL2, and the human-review step is where a GUI is needed. X-AnyLabeling-CPU.exe (already installed) is sufficient for review; GPU is not needed for YOLOv8n ONNX inference on a few thousand 768×1024 images.
- CVAT is the only option where the *same* scripted command both runs the custom model and lands results in a multi-user review UI, but it costs a Docker stack on x86_64 (desktop/WSL2), not the Pi.

### Gaps
- No single source compares these tools side by side for 2026; the matrix is assembled from per-tool docs.

---

## X-AnyLabeling: auto-labeling features, custom YOLOv8 ONNX, batch "Auto Run", foundation-model integrations, CLI/headless, Server, CPU vs GPU builds, YOLO export

### Takeaway
X-AnyLabeling (v4.0.6, 2026-09-05) is the richest local GUI for model-assisted boxes: custom YOLO via ONNX+YAML, batch run over a folder with start/end range, YOLOE/SAM3/Grounding DINO/Florence-2/Rex-Omni/GeCo integrations, SAM2/SAM3 video propagation — but it has **no headless auto-labeling CLI**; its CLI is for format conversion only, and remote inference goes through X-AnyLabeling-Server.

### Cited Findings
- Versions: v4.0.0 (2026-08-04) … v4.0.6 (2026-09-05). v4.0.6 added "optional start and end image ranges for Auto Run" and "external Ultralytics training with isolated Python workers"; v4.0.5 preserved nested YOLO directory structures on import/export; v4.0.0 added "Segment Everything workflow powered by the SAM2 Automatic Mask Generator" — [Releases](https://github.com/CVHub520/X-AnyLabeling/releases)
- Release assets for v4.0.6: `X-AnyLabeling-v4.0.6-CPU.exe` (354 MB), Windows CUDA11 / CUDA12 / CUDA13 exes; Linux CPU / CUDA11 / CUDA12 / CUDA13; `macOS-arm64-unsigned.zip`. No Linux aarch64 asset listed — [Releases](https://github.com/CVHub520/X-AnyLabeling/releases)
- Integrated models (README): "Grounding DINO, YOLO-World, YOLOE, SAM 3, LocateAnything" (grounding); Florence2, Rex-Omni; VLMs "Qwen3-VL, Gemini, ChatGPT, GLM"; "SAM 1/2/3, SAM-HQ, … EdgeSAM, EfficientViT-SAM"; "SAM2-Video" and "SAM3-Video"; YOLO v5–12, YOLOX, RT-DETR, D-FINE; counting "CountGD, GeCO, GeCo2" — [GitHub README](https://github.com/CVHub520/X-AnyLabeling)
- Export formats: "COCO, VOC, YOLO, DOTA, MOT, MASK, PPOCR, MMGD, VLM-R1, and ShareGPT"; license "GNU General Public License v3.0" — [GitHub README](https://github.com/CVHub520/X-AnyLabeling)
- CLI subcommands are only `help, checks, version, config, convert`; "no dedicated headless auto-labeling or batch inference command documented". GUI launch flags: `--filename`, `--output`, `--config`, `--logger-level`, `--qt-image-allocation-limit` — [docs/en/cli.md](https://github.com/CVHub520/X-AnyLabeling/blob/main/docs/en/cli.md)
- `xanylabeling convert --task <task>`: import tasks `yolo2xlabel, voc2xlabel, coco2xlabel, dota2xlabel, mot2xlabel, …`; export tasks `xlabel2yolo, xlabel2voc, xlabel2coco, …`; params `--images, --labels, --output`, optional `--classes, --pose-cfg, --mode, --mapping, --skip-empty-files` — [docs/en/cli.md](https://github.com/CVHub520/X-AnyLabeling/blob/main/docs/en/cli.md)
- Custom model = ONNX file + YAML. Example YAML fields: `type`, `name`, `provider`, `display_name`, `model_path` (relative/absolute), `iou_threshold`, `conf_threshold`, `max_det`, `classes` (must match training order); also `agnostic` (class-agnostic NMS) and `filter_classes`. Guide says to "convert the PyTorch trained model to X-AnyLabeling's default ONNX file format"; direct `.pt` loading not documented. Ultralytics export: `yolo export model=... format=onnx` — [docs/en/custom_model.md](https://github.com/CVHub520/X-AnyLabeling/blob/main/docs/en/custom_model.md)
- Shortcuts: Ctrl+A opens Auto-Labeling panel; **Ctrl+B "Batch Auto-Labeling … Runs the selected model on multiple images"**; Ctrl+P "Keep Previous Annotation … Reuses the previous frame's annotations"; Label Manager (Alt+L) rename/delete/hide labels globally — [docs/en/user_guide.md](https://github.com/CVHub520/X-AnyLabeling/blob/main/docs/en/user_guide.md)
- Built-in Ultralytics training (Train > Ultralytics) needs a user-selected Python env with PyTorch+Ultralytics; after ONNX export, "Apply" "creates `<Project>/<Name>/<Name>.yaml`, references `weights/best.onnx`, registers the configuration as a custom model, and loads it in the main auto-labeling panel" — [Ultralytics training example](https://xanylabeling.com/examples/training/ultralytics)
- YOLOE: visual prompting = draw "+Rect" boxes then Send; "**Visual prompting is not available in batch mode due to its interactive nature**"; text prompts (`person.car.bicycle`) *are* supported in batch mode (Ctrl+B); prompt-free mode uses a predefined vocabulary — [YOLOE example](https://xanylabeling.com/examples/grounding/yoloe)
- GeCo: "a low-shot counting model that uses exemplar boxes to detect, segment, and count objects"; draw one or more exemplar boxes, press F, enter class name; outputs bounding boxes; model weights must be downloaded manually (exceed GitHub asset limits) — [GeCo example](https://xanylabeling.com/examples/counting/geco)
- SAM2 video: add points/rectangles on first frame, click **Auto Run** to propagate; output mode can be filtered to **Rectangle**; accepts a video (Ctrl+O) or a folder of frames (Ctrl+U), but only `*.jpg/*.jpeg`; docs refer to installing on "a GPU-enabled machine" — [SAM2 video example](https://xanylabeling.com/examples/interactive_video_object_segmentation/sam2)
- Pip install: package `x-anylabeling-cvhub` with extras `[cpu]`, `[gpu]` (CUDA 12.x, onnxruntime-gpu ≥1.18.1,<1.27.0, cuDNN 9), `[gpu-cu11]`, `[gpu-cu13]` (onnxruntime-gpu ≥1.27.0,<1.28.0); "Python 3.11 ~ 3.13 (Python 3.12 is recommended)" — [docs/en/get_started.md](https://github.com/CVHub520/X-AnyLabeling/blob/main/docs/en/get_started.md)
- X-AnyLabeling-Server: "lightweight and extensible serving framework for AI model inference, specifically designed for X-AnyLabeling", pluggable custom models, API guide + OpenAPI schema, Python 3.10+, **AGPL-3.0** — [X-AnyLabeling-Server](https://github.com/CVHub520/X-AnyLabeling-Server)

### Inferences
- Agent-scriptable X-AnyLabeling workflow = run inference outside it (Ultralytics), then `xanylabeling convert --task yolo2xlabel` to produce its JSON sidecars, human reviews in the GUI, then `xlabel2yolo`. Alternatively the human presses Ctrl+B with the console_v2 ONNX YAML loaded; the agent's job is then only to write the YAML and export ONNX.
- For the RTX 5060 (sm_120), the CUDA13 build/extra (ORT 1.27.x) is the most plausible GPU variant; the already-installed CPU exe sidesteps the Blackwell question entirely and is adequate for YOLOv8n.
- YOLOE/GeCo visual prompts can't encode "identity" classes (B3 pink vs EMO red) reliably; they are better suited for the 3 tool classes or for proposing boxes that a human then relabels. Because YOLOE visual prompts are per-image in the GUI, they do not give folder-wide propagation.
- Pi 5: pip install on aarch64 with Python 3.13 is within the documented Python range, but no aarch64 binary is published; feasibility depends on PyQt/onnxruntime aarch64 wheels (unverified).

### Gaps
- The exact `type:` string for YOLOv8/YOLO11 detection YAMLs (e.g., `yolov8`) was not visible in the fetched excerpt (only the YOLOv5 example).
- Whether Ctrl+B skips images that already have labels, and whether `yolo2xlabel` accepts 6-column lines (with confidence from `save_conf=True`) — not documented in the fetched pages.
- X-AnyLabeling-Server's exact endpoints and whether the desktop GUI's batch mode can use a server-hosted Ultralytics `.pt` — not detailed in the fetched README.
- No doc found confirming Blackwell (sm_120) works with X-AnyLabeling GPU builds.

---

## CVAT: custom-model auto-annotation (Nuclio, AI agents, cvat-cli), SAM/SAM2, video tracking, self-hosting, YOLO export

### Takeaway
CVAT is the most scriptable review platform: `cvat-cli task auto-annotate <task_id> --function-file my_yolo.py` runs *your* Ultralytics model locally and uploads boxes into a task on any CVAT server, including free self-hosted Community (MIT). AI agents/native functions and the SAM2 tracker are Online/Enterprise-only; Community gets Nuclio functions (SAM interactor, TransT tracker, YOLOv7…) and keyframe interpolation.

### Cited Findings
- Install `pip install cvat-cli` (Python ≥3.10). Syntax `cvat-cli <common options> <resource> <action> <options>`. Examples: `cvat-cli task auto-annotate 137 --function-module cvat_sdk.auto_annotation.functions.torchvision_detection -p model_name=str:fasterrcnn_resnet50_fpn_v2 -p box_score_thresh=float:0.5` and `cvat-cli task auto-annotate 138 --function-file path/to/my_func.py`; parameters passed as `-p name=type:value`. `function create-native`, `function run-agent`, `function delete` are labeled Enterprise/Cloud — [CVAT CLI docs](https://docs.cvat.ai/docs/api_sdk/cli/)
- SDK: function = `spec` (`DetectionFunctionSpec(labels=[label_spec(name, id, type="rectangle")…])`) + `detect(context, image)` returning `cvataa.rectangle(label, [x1,y1,x2,y2])`; `context.conf_threshold`; driver `cvataa.annotate_task(client, task_id, func, clear_existing=True, allow_unmatched_label=True, conf_threshold=0.5)`; predefined torchvision functions via `pip install "cvat-sdk[pytorch]"`; tracking functions (`TrackingFunctionSpec`, `init_tracking_state`, `track`) "operate exclusively in agent mode"; API applies to self-hosted Community — [CVAT auto-annotation API](https://docs.cvat.ai/docs/api_sdk/sdk/auto-annotation/)
- Official Ultralytics example function (`yolo11_func.py`): `_model = YOLO("yolo11n.pt")`, `spec` built from `_model.names`, `detect()` calls `_model.predict(source=image, conf=...)` and yields `cvataa.rectangle(...)`. Commands: `cvat-cli --server-host https://app.cvat.ai --auth "<user>:<password>" function create-native "YOLO11" --function-file yolo11_func.py` and `... function run-agent 58 --function-file yolo11_func.py`. Agents available in CVAT Online and Enterprise (≥2.25) — [CVAT AI agents announcement](https://cvat.ai/resources/blog/announcing-cvat-ai-agents)
- Ultralytics YOLO agent integration supports YOLOv5/v8/11 and Ultralytics-compatible models; tasks: classification, detection, instance seg, OBB, pose; "Available in: CVAT Online, CVAT Enterprise" — [CVAT changelog: Ultralytics YOLO](https://www.cvat.ai/resources/changelog/ultralytics-yolo-agentic-labeling)
- Edition matrix: Nuclio functions — Community Yes / Enterprise Yes / Online select only; third-party (HF, Roboflow) and native functions — Community **No**. Predefined interactors: SAM, IOG; detectors: YOLOv7, Faster/Mask RCNN, RetinaNet…; trackers: TransT, SAM 2 Tracker (Enterprise; needs native functions/agents) — [CVAT AI models](https://docs.cvat.ai/docs/annotation/auto-annotation/ai-models/)
- SAM2 tracker: agent variant for Online/Enterprise requires CVAT ≥2.42.0; Nuclio SAM2 tracker Enterprise-only; applied to existing polygons/masks to track forward N frames — [SAM2 tracker docs](https://docs.cvat.ai/docs/annotation/auto-annotation/segment-anything-2-tracker/), [SAM2 agent changelog](https://www.cvat.ai/resources/changelog/sam2-ai-agent-tracking)
- Track mode: update a few keyframes and intermediate frames are interpolated automatically — [CVAT track mode](https://docs.cvat.ai/docs/annotation/manual-annotation/modes/track-mode-basics/)
- Export: Ultralytics YOLO Detection / OBB / Segmentation / Pose; archive with `data.yaml`, `train.txt`, `images/train`, `labels/train`; import accepts `images/train/` or `train/images/` (Roboflow-style) — [CVAT Ultralytics YOLO format](https://docs.cvat.ai/docs/dataset_management/formats/format-yolo-ultralytics/)
- Community is "the free, self-hosted open-source edition", MIT license; features include SAM and TransT; 20+ formats incl. YOLO and Ultralytics YOLO — [cvat-ai/cvat](https://github.com/cvat-ai/cvat)
- Install: `docker compose up -d`; documented for Ubuntu 22.04/20.04 x86_64, Windows 10 via WSL2 + Docker Desktop, macOS; ARM64 not mentioned; serverless (Nuclio) needs a separate advanced guide — [CVAT installation](https://docs.cvat.ai/docs/administration/community/basics/installation/)

### Inferences
- For a solo user with Windows+WSL2: self-host CVAT Community in Docker, create a task, and let the agent run `cvat-cli task auto-annotate` with a ~20-line function wrapping console_v2 (and a second call with tool_v3, using `allow_unmatched_label` to merge). The model runs wherever cvat-cli runs (Pi CPU or WSL2 GPU), not inside CVAT. This avoids Nuclio entirely.
- The SAM2 tracker is out of reach on Community (tracking functions are agent-only); for head-camera video, Community users get linear keyframe interpolation, which is weak for fast head motion.
- Heavier than X-AnyLabeling for a single annotator (Docker, Postgres, Redis) — only worth it if multi-reviewer QA or scriptable task creation is desired.

### Gaps
- Exact CLI flag names for `--clear-existing`, `--allow-unmatched-labels`, `--conf-threshold` on `task auto-annotate` were not visible in the fetched excerpt (the SDK equivalents are documented).
- Current CVAT version number/date not captured (format page references v2.71–v2.76).
- No documented RAM/CPU minimums for self-hosting.

---

## Label Studio: ML backends (YOLO/Ultralytics, SAM, Grounding DINO), pre-annotation import, CLI

### Takeaway
Label Studio (Apache-2.0) supports custom Ultralytics `.pt` models through its Docker YOLO ML backend (batch pre-annotation, plus video tracking with BoT-SORT/ByteTrack), and scripted import of YOLO-format predictions via `label-studio-converter import yolo --out-type predictions`. SAM/SAM2/Grounding DINO backends are interactive-only.

### Cited Findings
- YOLO backend: `docker-compose up` → `http://localhost:9090`; custom models: put `.pt` in mounted `/app/models`, set `ALLOW_CUSTOM_MODEL_PATH=true`, reference with `model_path="my_custom_model.pt"` in the labeling config; control tags `RectangleLabels`, `PolygonLabels`, `Choices`, `VideoRectangle`; label mapping via `predicted_values`; video tracking `<VideoRectangle model_tracker="botsort" model_conf="0.25"/>` (botsort default, bytetrack option); env `LABEL_STUDIO_URL`, `LABEL_STUDIO_API_KEY` — [LS YOLO ML backend](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/yolo)
- Backend capability table: yolo = pre-annotation ✅ / interactive ❌; segment_anything_model, segment_anything_2_image, grounding_dino, grounding_sam = interactive ✅ / pre-annotation ❌; mmdetection = pre-annotation; repo license Apache-2.0 — [label-studio-ml-backend](https://github.com/HumanSignal/label-studio-ml-backend)
- Pre-annotation JSON: `predictions: [{model_version, score, result: [{type: "rectanglelabels", from_name, to_name, original_width, original_height, value: {x, y, width, height (percent), rectanglelabels: [...]}}]}]`; import via UI or API; "Predictions cannot be modified and are always read-only" — reviewer copies them into an annotation — [LS predictions guide](https://labelstud.io/guide/predictions)
- `label-studio-converter import yolo -i <dir> -o output.json --image-root-url "/data/local-files/?d=one/images"` with `--out-type predictions` to import as predictions; path relative to `LABEL_STUDIO_LOCAL_FILES_DOCUMENT_ROOT` — [LS YOLO import tutorial](https://labelstud.io/blog/tutorial-importing-local-yolo-pre-annotated-images-to-label-studio/), [label-studio-converter](https://github.com/HumanSignal/label-studio-converter)
- `pip install label-studio`, Python ≥3.10, Apache 2.0; label-studio-sdk includes a converter component; YOLO among export formats — [HumanSignal/label-studio](https://github.com/HumanSignal/label-studio)

### Inferences
- Label Studio is pip-installable (no Docker needed for the core app), so it could plausibly run on the Pi 5; the YOLO ML backend is Docker-based and would be better on WSL2. For this project the converter route (Ultralytics txt → LS predictions JSON) avoids the ML backend entirely and is agent-friendly.
- Review UX friction: predictions are read-only and must be accepted/copied per task, which is slower than X-AnyLabeling's direct-edit JSON for a single reviewer.

### Gaps
- Whether `label-studio-converter` is now folded into `label-studio-sdk` (the LS README mentions a converter inside the SDK) and which is the maintained entry point in 2026 — not confirmed.
- Current Label Studio version/date not captured.

---

## Ultralytics built-ins: auto_annotate, YOLO-World/YOLOE, SAM 3, `yolo predict save_txt`

### Takeaway
`yolo predict model=best.pt source=dir save_txt=True save_conf=True` is the most direct headless pre-labeler (YOLO txt, one file per image with detections). `auto_annotate()` is **not** a bbox tool — it writes SAM **polygon** labels. YOLOE visual prompts with `refer_image` and SAM 3 exemplar boxes give a scriptable "few examples → similar objects" path, but with generic class names and lower accuracy than a trained model.

### Cited Findings
- `auto_annotate(data, det_model="yolo26x.pt", sam_model="sam_b.pt", device="", conf=0.25, iou=0.45, imgsz=640, max_det=300, classes=None, output_dir=None)`; output = YOLO-format **segmentation polygons** ("class ID followed by polygon coordinates"); default dir `{parent}/{stem}_auto_annotate_labels` — [Ultralytics annotator reference](https://docs.ultralytics.com/reference/data/annotator/)
- `save_txt` (default False) saves `[class] [x_center] [y_center] [width] [height] [confidence]`; `save_conf` adds confidence; outputs under `runs/detect/predict/labels` (or `{project}/{name}`); `stream=True` recommended for large datasets — [Ultralytics predict mode](https://docs.ultralytics.com/modes/predict/)
- `Results.save_txt`: one line per detection `class x_center y_center width height [confidence] [track_id]`; "no file is written when no line remains" (i.e., no empty .txt for images without detections) — [Ultralytics Results reference](https://docs.ultralytics.com/reference/engine/results)
- Known pitfall: `yolo predict save_txt=True` appends results from different images with the same filename into one .txt — [ultralytics issue #22531](https://github.com/ultralytics/ultralytics/issues/22531)
- YOLOE visual prompts: `visual_prompts={"bboxes": np.array([...]), "cls": np.array([...])}` with `predictor=YOLOEVPSegPredictor`; can pass `refer_image=` so boxes describe objects in a reference image and are applied to a different target image; "Visual prompts do not carry your labels … the model reports them as `object0`, `object1` … Map them back to your own names yourself"; "Zero-shot accuracy is well below a model trained on your classes"; n/s scales run on CPU at reduced resolution — [Ultralytics YOLOE](https://docs.ultralytics.com/models/yoloe/)
- SAM 3 integrated into `ultralytics`; concept prompts by text or "Multiple bounding boxes as exemplars of the same visual concept"; `SAM3SemanticPredictor`, `SAM3VideoSemanticPredictor(source="video.mp4", text=[...], stream=True)`; `sam3.pt` "not automatically downloaded" — must request access on Hugging Face; output is masks (bbox output not explicitly documented) — [Ultralytics SAM 3](https://docs.ultralytics.com/models/sam-3/)

### Inferences
- For the agent: loop over images with `model.predict(..., conf=...)` in Python rather than CLI to (a) control class-ID remapping when merging console_v2 + tool_v3 outputs into one 8-class file, (b) always write empty .txt for negatives, (c) avoid the same-name append pitfall. This runs on the Pi's Python 3.12 venv (CPU) without any GUI.
- Boxes can be derived from SAM 3 masks trivially, so SAM 3 exemplar prompting is a candidate for tools (screwdriver/wrench/pliers) where tool_v3 is weak; it will not resolve B3-pink vs EMO-red identity.

### Gaps
- Whether `save_txt` overwrites or appends when re-running into an existing `labels/` dir with `exist_ok=True` — not confirmed.
- Ultralytics license (AGPL-3.0 per common knowledge) not re-verified in this pass.
- Whether YOLOE visual-prompt embeddings can be saved once and reused across a folder (beyond `refer_image` per call) — not documented in the fetched excerpt.

---

## FiftyOne (Voxel51): zero-shot zoo, (Verified) Auto-Labeling, mistakenness, review UI, YOLO export

### Takeaway
Open-source FiftyOne can run your Ultralytics model (`dataset.apply_model(YOLO("best.pt"))`), YOLO-World/YOLOE, compute detection mistakenness (missing/spurious/localization), hand samples to CVAT/Label Studio for edits, and export YOLO. "Verified Auto-Labeling" (confidence-filtered approve workflow, 2025) is **FiftyOne Enterprise only**.

### Cited Findings
- `dataset.apply_model(YOLO("yolov8s.pt"), label_field="boxes", confidence_thresh=0.5)`; YOLO-World via `YOLO("yolov8l-world.pt").set_classes([...])` or `foz.load_zoo_model("yolov8l-world-torch", classes=[...])`; YOLOE via `set_classes(classes, model.get_text_pe(classes))`; export `dataset.export(export_dir, dataset_type=fo.types.YOLOv5Dataset, label_field, split, classes)` — [FiftyOne Ultralytics integration](https://docs.voxel51.com/integrations/ultralytics.html)
- Mistakenness "also works on detection datasets to find missed objects, incorrect annotations, and localization issues"; populates `mistakenness`, `mistakenness_loc`, `possible_missing`, `possible_spurious`; needs model logits/confidences for best efficacy; other brain methods: hardness, uniqueness, near-duplicates, representativeness — [FiftyOne Brain](https://docs.voxel51.com/brain/index.html)
- Verified Auto-Labeling: "available in: Enterprise", "powered by delegated operations … using your existing GPU infrastructure"; zero-shot and fixed-vocabulary models (YOLO, SAM families); filter labels by min/max confidence and "Add # labels for approval" — [FiftyOne Auto-Labeling](https://docs.voxel51.com/enterprise/verified_auto_labeling.html)
- Annotation backends: CVAT, Label Studio, Labelbox, V7; round-trip via `annotate()` / `load_annotations` — [FiftyOne annotation workflows](https://docs.voxel51.com/workflows/annotation.html)

### Inferences
- A fully local, agent-driven QA loop: load YOLO dataset → `apply_model(console_v2)` → `compute_mistakenness(pred_field, label_field)` → sort by mistakenness / `possible_missing` → human reviews top-k in the FiftyOne App or via `annotate(backend="cvat")`. The open-source "verified" workflow can be approximated by confidence-filtered views, without Enterprise.

### Gaps
- Exact `compute_mistakenness` signature for detections not captured (redirected page gave a summary only).
- FiftyOne OSS license and ARM64 (Pi) support for its bundled MongoDB not verified in this pass.

---

## Other notable options: supervision, autodistill, AnyLabeling, labelImg, Make Sense, T-Rex Label, commercial (Roboflow, Encord, V7, Labelbox, SuperAnnotate, Landing AI)

### Takeaway
Among open tools, supervision is a useful glue library (Ultralytics → YOLO dataset), AnyLabeling (original) is still active but narrower than X-AnyLabeling, labelImg is archived/deprecated, autodistill is stale (last release Nov 2024), and Make Sense runs YOLOv5-tfjs in the browser. Commercial platforms all offer foundation-model auto-labeling (SAM/SAM 3, Grounding DINO) and bring-your-own-model, but require uploading data to a cloud; free tiers are limited or unclear.

### Cited Findings
- supervision: `DetectionDataset.from_yolo/from_coco/from_pascal_voc/...` and matching `as_*` exporters; `Detections.from_ultralytics()` and converters for Transformers, SAM, MMDetection, etc. — [supervision datasets](https://supervision.roboflow.com/datasets/), [roboflow/supervision](https://github.com/roboflow/supervision)
- autodistill: `autodistill images --base="grounding_dino" --target="yolov8" --ontology '{"prompt": "label"}' --output="./dataset"`; Python `base_model.label(input_folder=..., output_folder=...)`; base models incl. Grounded SAM 2, GroundingDINO, OWLv2; YOLO `data.yaml` output; Apache 2.0 — [autodistill GitHub](https://github.com/autodistill/autodistill). Latest PyPI release 0.1.29 on 2024-11-26 — [PyPI autodistill](https://pypi.org/project/autodistill/)
- AnyLabeling (vietanhdev): v0.4.43 current stable; CI tests Python 3.11–3.13 on Linux/Windows/macOS; YOLOv8 detection, SAM/MobileSAM/SAM2/SAM2.1/SAM3 (text prompt); GPL-3.0 — [vietanhdev/anylabeling](https://github.com/vietanhdev/anylabeling)
- labelImg: archived 2024-02-29; "no longer actively being developed"; points to Label Studio; MIT — [HumanSignal/labelImg](https://github.com/HumanSignal/labelImg)
- Make Sense: runs YOLOv5 via TensorFlow.js, COCO-SSD, PoseNet; can load "your own models trained thanks to YOLOv5 and exported to tfjs format"; images never leave the browser; exports YOLO/VOC/COCO/CSV…; GPL-3.0 — [SkalskiP/make-sense](https://github.com/SkalskiP/make-sense)
- T-Rex Label: browser-based, powered by T-Rex2 visual prompts; draw a box and it "detect[s] the rest of the similar objects"; "propagates the prompt across images—enabling batch annotation"; interactive visual-prompt features stated as free for the community — [T-Rex Label](https://trexlabel.com/en/), [IDEA-Research/T-Rex](https://github.com/IDEA-Research/T-Rex), [T-Rex Label free AI Mask (Medium)](https://medium.com/@ideacvr2024/free-to-use-t-rex-label-launches-automatic-mask-annotation-feature-with-tutorial-51909798f997)
- Roboflow Auto Label: foundation models (Grounding DINO; SAM 3 added Nov 2025) label all images from text prompts; test runs are free, full runs consume credits — [Roboflow Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label), [Roboflow changelog: SAM 3](https://docs.roboflow.com/reference/changelog/changelog/november-2025/auto-label-data-with-sam-3); a user reports a SAM 3 job returning 0 annotations yet consuming credits — [Roboflow forum](https://discuss.roboflow.com/t/auto-label-with-sam-3-completed-with-0-annotations-but-consumed-credits/12302)
- Labelbox: model-assisted labeling with Foundry models or your own model — [Labelbox MAL docs](https://docs.labelbox.com/docs/foundry-model-assisted-labeling), [Labelbox BYO model blog](https://labelbox.com/blog/bring-your-own-models-to-labelbox-with-new-custom-model-integration/); free plan 500 LBU/month, $0.10/LBU after **[aggregator]** — [autolabelling.com Labelbox](https://autolabelling.com/labelbox/)
- Encord: SAM segmentation & tracking in Annotate; BYO model / agents for pre-labeling — [Encord SAM docs](https://docs.encord.com/platform-documentation/Annotate/automated-labeling/annotate-sam), [Encord 2026 buyer's guide](https://encord.com/blog/best-data-labeling-platform-2026/); no permanent free tier **[aggregator]** — [autolabelling.com Encord](https://autolabelling.com/encord/)
- V7 Darwin: Auto-Annotate + SAM; free-plan info is contradictory across review sites; plans reportedly from $5,400 **[aggregator]** — [TrustRadius V7](https://www.trustradius.com/products/v7labs/pricing), [autolabelling.com V7](https://autolabelling.com/v7-labs/)
- SuperAnnotate: AI-assisted labeling and multi-stage review; free Starter plan vs "no free tier, 14-day trial" reports conflict **[aggregator]** — [Software Finder SuperAnnotate](https://softwarefinder.com/artificial-intelligence/superannotate)
- LandingLens (Landing AI): commercial "Visual Prompting" (label a few regions → model) — [Landing AI visual prompting](https://landing.ai/academy/visual-prompting), [PR Newswire launch](https://www.prnewswire.com/news-releases/landing-ai-launches-the-worlds-first-commercial-visual-prompting-capability-in-landinglens-301806231.html); free "Explore" plan ~1,000 credits/month, non-commercial only **[aggregator]** — [Software Finder LandingLens](https://softwarefinder.com/artificial-intelligence/landinglens)

### Inferences
- Commercial/cloud tools (T-Rex Label, Roboflow, Labelbox, Encord, V7, SuperAnnotate, LandingLens) require uploading project imagery; none is needed given local options, and GitHub-submission anonymity constraints make cloud accounts an extra exposure surface.
- autodistill is effectively unmaintained; its CLI pattern is reproducible with Ultralytics YOLOE/SAM 3 directly.

### Gaps
- Vendor-official pricing pages for Labelbox, Encord, V7, SuperAnnotate, LandingLens were not fetched; free-tier numbers are from aggregators and may be stale.
- supervision license and latest version not captured.
- Make Sense last-commit date not captured (maintenance status unclear).

---

## Which tools support "label a few → propagate to similar objects" (few-shot / visual prompt), and which support video keyframe propagation?

### Takeaway
Few-shot/visual-prompt: X-AnyLabeling (YOLOE visual prompt per image; GeCo/GeCo2/CountGD exemplar counting; SAM 3), T-Rex Label (visual prompt propagated across images, cloud), Ultralytics YOLOE `refer_image` and SAM 3 exemplars (scriptable), LandingLens (commercial). Video propagation: X-AnyLabeling SAM2/SAM3-Video (Rectangle output on frame folders), CVAT keyframe interpolation (all editions) + TransT (Nuclio) + SAM2 tracker (Enterprise/Online), Label Studio YOLO backend `VideoRectangle` with BoT-SORT/ByteTrack, Encord SAM tracking, Ultralytics `SAM3VideoSemanticPredictor`.

### Cited Findings
- X-AnyLabeling YOLOE visual prompts are interactive and "not available in batch mode" — [X-AnyLabeling YOLOE](https://xanylabeling.com/examples/grounding/yoloe)
- X-AnyLabeling GeCo: exemplar boxes → detect/count similar objects, bbox output — [X-AnyLabeling GeCo](https://xanylabeling.com/examples/counting/geco); CountGD, GeCo2 listed — [X-AnyLabeling README](https://github.com/CVHub520/X-AnyLabeling)
- T-Rex Label "automatically identifies similar targets … and propagates the prompt across images" — [T-Rex Label](https://trexlabel.com/en/)
- Ultralytics YOLOE `refer_image` applies prompts from a reference image to a target; results named `object0…` — [Ultralytics YOLOE](https://docs.ultralytics.com/models/yoloe/)
- Ultralytics SAM 3 exemplar boxes; SAM3 video predictor — [Ultralytics SAM 3](https://docs.ultralytics.com/models/sam-3/)
- X-AnyLabeling SAM2 video: prompt first frame → Auto Run propagation, Rectangle output mode, frame-folder input (jpg only) — [X-AnyLabeling SAM2 video](https://xanylabeling.com/examples/interactive_video_object_segmentation/sam2); SAM3-Video and MOT examples exist — [X-AnyLabeling examples](https://xanylabeling.com/examples)
- X-AnyLabeling Ctrl+P "Keep Previous Annotation … Reuses the previous frame's annotations" — [user guide](https://github.com/CVHub520/X-AnyLabeling/blob/main/docs/en/user_guide.md)
- CVAT track mode interpolation between keyframes — [CVAT track mode](https://docs.cvat.ai/docs/annotation/manual-annotation/modes/track-mode-basics/); TransT tracker (Nuclio, Community) and SAM2 tracker (Enterprise/agents) — [CVAT AI models](https://docs.cvat.ai/docs/annotation/auto-annotation/ai-models/)
- Label Studio `VideoRectangle model_tracker="botsort"|"bytetrack"` — [LS YOLO backend](https://github.com/HumanSignal/label-studio-ml-backend/tree/master/label_studio_ml/examples/yolo)
- Encord "SAM Segmentation & Tracking" — [Encord docs](https://docs.encord.com/platform-documentation/Annotate/automated-labeling/annotate-sam)
- LandingLens Visual Prompting — [Landing AI](https://landing.ai/academy/visual-prompting)

### Inferences
- For first-person 768×1024 frames with fast head motion, SAM2/SAM3-style mask propagation (X-AnyLabeling on GPU) should track far better than CVAT's linear interpolation; but since console_v2 already detects buttons per frame, per-frame detection + human correction is likely simpler than propagation for buttons. Propagation is more valuable for the tools (hand-held, occluded).
- Visual-prompt/few-shot methods group by appearance, so they are likely to merge or confuse identity classes that differ mainly by color/position (B3 pink vs EMO red); treat their output as box proposals needing human class assignment.

### Gaps
- No quantitative accuracy data found for any of these propagation tools on small objects or first-person video.
- SAM2/SAM3-Video CPU feasibility in X-AnyLabeling (vs GPU) not documented.

---

## Which tools can flag likely label errors to focus human review?

### Takeaway
Locally: cleanlab `object_detection` (label quality score per image; overlooked boxes, swapped class, bad localization; needs out-of-sample predictions via K-fold) and FiftyOne `compute_mistakenness` (mistakenness, localization, possible_missing, possible_spurious). FiftyOne Enterprise adds a confidence-filtered approval workflow.

### Cited Findings
- cleanlab inputs: labels `{'bboxes': [x1,y1,x2,y2], 'labels': [...]}` per image; predictions per image per class arrays of `[x1,y1,x2,y2,pred_prob]`; APIs `cleanlab.object_detection.filter.find_label_issues`, `cleanlab.object_detection.rank.get_label_quality_scores` (0–1), `cleanlab.object_detection.summary.visualize`; flags "overlooked an object", wrong class, imperfect box location; predictions should be "**out-of-sample** … via K-fold cross-validation" — [cleanlab object detection tutorial](https://docs.cleanlab.ai/stable/tutorials/object_detection.html)
- FiftyOne mistakenness fields and detection use — [FiftyOne Brain](https://docs.voxel51.com/brain/index.html)
- FiftyOne Enterprise Verified Auto-Labeling confidence filter + approval — [FiftyOne Auto-Labeling](https://docs.voxel51.com/enterprise/verified_auto_labeling.html)

### Inferences
- Use on train/val only. Project rule forbids model pre-labels on the test set; using the *evaluated* model to decide which test labels get re-checked would also bias the test set toward the model's view — if test QA is wanted, use a double human pass or a different model, and never auto-edit.
- cleanlab's K-fold requirement means training console_v2 K times (feasible for YOLOv8n on the RTX 5060 once sm_120 torch is set up, slow on the Pi CPU).

### Gaps
- cleanlab license (believed AGPL-3.0) and current version not verified in this pass.
- No benchmark found of cleanlab vs FiftyOne mistakenness precision on small-object datasets.

---

## Hardware fit: Raspberry Pi 5 (ARM, Py3.13 / Py3.12 venv) and Windows RTX 5060 (Blackwell sm_120) + WSL2

### Takeaway
Pi 5: only library/CLI routes (Ultralytics, cleanlab, supervision; likely Label Studio via pip) are realistic; CVAT has no documented ARM64 support and X-AnyLabeling ships no aarch64 binary. RTX 5060: PyTorch needs ≥2.7 with cu128 wheels; onnxruntime-gpu official wheels on Blackwell are reported (community source) to lack sm_120 kernels — verify before relying on X-AnyLabeling GPU builds; the CPU exe is safe.

### Cited Findings
- PyTorch 2.7 "introduces support for NVIDIA's new Blackwell GPU architecture and ships pre-built wheels for CUDA 12.8"; install `pip install torch==2.7.0 --index-url https://download.pytorch.org/whl/cu128` — [PyTorch 2.7 blog](https://pytorch.org/blog/pytorch-2-7/), [SaladCloud RTX 5090 guide](https://docs.salad.com/container-engine/tutorials/machine-learning/pytorch-rtx5090)
- Older wheels error with "RTX 5060 with CUDA capability sm_120 is not compatible with the current PyTorch installation" — [PyTorch forums sm_120 RTX 5060](https://discuss.pytorch.org/t/pytorch-support-for-sm-120-nvidia-geforce-rtx-5060/220941)
- Community claim (Feb 2026): "The official PyPI `onnxruntime-gpu` package does not include `sm_120` kernels, so `CUDAExecutionProvider` is unavailable on Blackwell cards and all operations fall back to CPU" — [Natfii/onnxruntime-gpu-blackwell](https://github.com/Natfii/onnxruntime-gpu-blackwell); an ORT 1.23.0 user on RTX 5090 Laptop hit "cudaErrorInvalidPtx: a PTX JIT compilation failed" — [onnxruntime issue #26177](https://github.com/microsoft/onnxruntime/issues/26177) (closed; resolution not visible). A search summary stated "onnxruntime-gpu 1.28+ supports sm_120 natively" but I could not trace it to a primary source — conflicting/unverified.
- X-AnyLabeling GPU extras pin ORT <1.27 (CUDA 12) or 1.27.x (CUDA 13) — [get_started.md](https://github.com/CVHub520/X-AnyLabeling/blob/main/docs/en/get_started.md)
- CVAT install docs cover x86_64 Ubuntu and Windows via WSL2 + Docker Desktop; ARM64 not mentioned — [CVAT installation](https://docs.cvat.ai/docs/administration/community/basics/installation/)
- YOLOE n/s run on CPU at reduced resolution — [Ultralytics YOLOE](https://docs.ultralytics.com/models/yoloe/)

### Inferences
- A quick check on the desktop (`python -c "import onnxruntime as o; print(o.get_available_providers())"` plus a timed inference) settles the ORT/sm_120 question empirically; silent CPU fallback is the failure mode to watch for (consistent with the project's "check resource utilization first" lesson).
- For pre-labeling with YOLOv8n, CPU (Pi or desktop) is sufficient; GPU matters only for SAM2/SAM3 video propagation, Grounding DINO/Florence-2, and K-fold retraining for cleanlab.

### Gaps
- No primary source found stating which official onnxruntime-gpu release first ships sm_120 kernels.
- X-AnyLabeling / Label Studio install on Pi 5 aarch64 + Python 3.13 not verified by any source.
