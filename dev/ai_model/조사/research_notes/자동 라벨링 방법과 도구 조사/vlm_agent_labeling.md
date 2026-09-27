# VLMs and AI coding agents as bounding-box annotators ("the AI agent does the labeling")

Research date: 2026-09-28. All live leaderboards and pricing below are snapshots on that date and change often. Claims tagged "(search snippet)" come from a search-result summary; I could not read the primary page in full.

## Q1. Claude (Anthropic) vision: documented box/point output, measured accuracy, limits, per-image cost

### Takeaway
Anthropic documents bounding-box and point output as a supported workflow. Claude returns absolute pixel coordinates in the image it sees after resizing, and the docs describe those coordinates as "approximate". Anthropic publishes no box-accuracy benchmark such as mAP or IoU. The only Claude detection numbers I found are third-party. The best-documented is Roboflow's Vision Evals (Sept 2026), where Claude Opus 5.5 scores 74.4% on a detection score whose headline metric is mAP@50. The dataset behind it is undisclosed. On that eval Claude Sonnet 5 scores only 36.1%.

### Cited Findings
**What Anthropic documents (primary docs, current as of 2026-09-28)**
- Claude "can locate and label regions of an image (for example, returning bounding boxes for tables, form fields, chart elements, or UI components)". — [Claude docs: Coordinates and bounding boxes](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates)
- Claude "works best with absolute pixel coordinates". It "does not work well when you ask for normalized coordinates, for example ... between 0 and 1000". The docs say to ask for `[x1, y1, x2, y2]` pixels and use structured outputs to get JSON. — [Claude docs: Coordinates](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates)
- Returned coordinates are in the resized image Claude sees. Claude resizes to satisfy both an edge limit and a visual-token limit, then pads the bottom and right edges to a multiple of 28 px. The docs say to rescale by the resized size, not the padded size. They call an overlooked token-limit resize "the most common cause of misaligned coordinates". An `"oversized_image": "error"` transformation turns silent resizing into a 400 error. — [Claude docs: Coordinates](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates)
- Precision caveat, verbatim: "Small elements lose precision when an image is downscaled: for fine targets, crop the region of interest and send the crop (offset returned coordinates by the crop origin), or use a high-resolution-tier model." The docs also advise stating the coordinate format in the prompt and spot-checking results visually "before processing at scale". — [Claude docs: Coordinates](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates)
- Documented limitations include "Spatial reasoning: Claude's coordinate and localization outputs are approximate ... verify outputs before relying on them". Also: "Claude might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images under 200 pixels". And counting "might not always be precisely accurate, especially with large numbers of small objects". — [Claude docs: Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- On heavy JPEG compression, the docs say it "can introduce artifacts that are detrimental to model performance, especially when multiple compression passes are applied". — [Claude docs: Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- Token cost is `ceil(w/28) × ceil(h/28)` visual tokens, with one token per 28×28 patch. There are two resolution tiers:
  - Standard (1568 px long edge, 1568 tokens) covers models before Claude 4.7.
  - High-resolution (2576 px, 4784 tokens) covers "Claude 4.7 and later models".
  - Worked example: 1000×1000 costs ~$1.30 per 1k images on Haiku 4.5 and ~$6.48 per 1k on Opus 5.

  — [Claude docs: Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- Request limits:
  - Up to 600 images per API request (100 for 200k-context models).
  - 8000×8000 px maximum.
  - A stricter per-image limit applies above 20 images, so keep images ≤2000 px.
  - 10 MB per image and 32 MB per request.

  — [Claude docs: Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- Claude Opus 4.7 was released April 16, 2026.
  - It accepts "images up to 2,576 pixels on the long edge (~3.75 megapixels)".
  - It scored "98.5% on our visual-acuity benchmark versus 54.5% for Opus 4.6". That benchmark is aimed at computer use and dense screenshots, not natural-image detection.

  — [Anthropic: Introducing Claude Opus 4.7](https://www.anthropic.com/news/claude-opus-4-7)
- Anthropic's "What's new in Claude Opus 4.7" doc reportedly lists these improvements:
  - Low-level perception: pointing, measuring, counting.
  - Natural-image bounding-box localization and detection.
  - Coordinates that "map 1:1 to actual image pixels".

  No numbers are given. My fetch of that URL redirected to the Opus 5.5 page, so this is a search snippet. — [What's new in Claude Opus 4.7 (search snippet)](https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7)
- Opus 5.5 behavior notes:
  - Thinking cannot be disabled.
  - Forced tool use (`tool_choice: any/tool`) returns 400. Use structured outputs or strict tools for box JSON instead.
  - Opus 5.5 has "sharper reading of charts, diagrams, and screenshots".

  — [What's new in Claude Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/whats-new-opus-5-5)

**Third-party measurements of Claude box accuracy**
- Roboflow Vision Evals, object detection, updated Sept 22, 2026. Headline metric is mAP@50; mAP@75 and mAP@50:95 are on the task page. Each model runs 3 repetitions at low and high reasoning effort.
  - Claude scores: Opus 5.5 74.4%, Fable 5.1 61.4%, Fable 5 56.4%, Opus 5 54.4%, Sonnet 5 36.1%.
  - Other models: GPT-6 Astra 82.1%, Qwen 3.8 Max 76.7%, Gemini 3.5 Flash 70.6%.
  - The dataset, image count, classes and object sizes are not disclosed.

  — [Roboflow Vision Evals](https://playground.roboflow.com/evals); [Roboflow detection leaderboard](https://playground.roboflow.com/models/task/object-detection)
- Latency and cost on the same leaderboard:
  - Opus 5.5 averaged 17.55 s per call and costs $0.014 per sample.
  - GPT-6 Astra: 10.96 s. Gemini 3.5 Flash: 20.60 s.

  — [Roboflow detection leaderboard](https://playground.roboflow.com/models/task/object-detection); [Roboflow Vision Evals](https://playground.roboflow.com/evals)
- Head-to-head, Claude Opus 5 vs Gemini 3.1 Pro (Sept 22, 2026):

  | Metric | Claude Opus 5 | Gemini 3.1 Pro |
  |---|---|---|
  | Object detection | 54.4% | 67.4% |
  | Identification | 90.6% | 100% |
  | Counting | 70.3% | 71.6% |
  | Detection cost per sample | $0.027 | $0.010 |
  | Latency | 7.4 s | 7.8 s |

  — [Roboflow Playground: Claude Opus 5 vs Gemini 3.1 Pro](https://playground.roboflow.com/models/compare/claude-opus-5-vs-gemini-3-1-pro)
- Roboflow on Opus 4.7 (May 6, 2026):
  - Overall 73.13% (9th of 63 models), Object Understanding 85.7%, Defect Detection 80%.
  - Object Counting was only 30%, which Roboflow calls a "significant blind spot". Average response time was 17.82 s.
  - Roboflow recommends Claude for training-time labeling paired with a small deployable detector (RF-DETR), not for real-time inference.

  — [Roboflow: Claude Opus 4.7 benchmarks & auto-labeling](https://blog.roboflow.com/claude-opus-4-7/)
- Older academic data (Claude 3.x era, mid-2025 papers):
  - Ramachandran et al. (EPFL, ICLR 2026) used COCO detection with prompt chaining (recursive 3×3 grid zoom). Claude 3.5 Sonnet scored AP 14.78 / AP50 31.69, against GPT-4o at 31.87 / 60.62 and Gemini 2.0 Flash at 19.85 / 44.17. Their specialist Co-DETR scored AP 80.23.
  - The paper says "many MFMs fail at predicting the coordinates directly". GPT-4o direct prompting reached only AP50 17.69, versus 60.62 with chaining.

  — [arXiv 2507.01955](https://arxiv.org/html/2507.01955)
- The Qwen3-VL technical report (Nov 2025) lists Claude Opus 4.1 with "–" for RefCOCO-avg and ODinW-13, meaning it was not evaluated or reported. Claude Opus 4.1 scored 93.1 thinking / 91.9 non-thinking on CountBench, which is multiple-choice counting. — [Qwen3-VL Technical Report, arXiv 2511.21631 Table 2](https://arxiv.org/pdf/2511.21631)
- Wonderful Team (2024): when asked to judge whether a box was good enough, GPT-4o succeeded 97% of the time and Claude 3 Opus 33%. This is historical and pre-dates Claude 4.x. — [arXiv 2407.19094 (search snippet)](https://arxiv.org/pdf/2407.19094)
- CURIE (2025, scientific images): IoU Gemini 2.0 Flash 0.49, Gemini 1.5 Pro 0.42, Claude 3 Opus 0.39. — [arXiv 2503.13517 (search snippet)](https://arxiv.org/pdf/2503.13517)
- GUI grounding is a separate skill from natural-image boxes. The aggregator benchlm.ai lists Claude Opus 4.8 at 87.9% on ScreenSpot-Pro, which is click accuracy on high-res screenshots. I did not verify this against an Anthropic primary source. — [benchlm.ai ScreenSpot-Pro (aggregator)](https://benchlm.ai/benchmarks/screenspot-pro)

### Inferences
- The project's 768×1024 frames cost ceil(768/28)×ceil(1024/28) = 28×37 = **1,036 visual tokens**. That fits both tiers, so no server-side resize happens and returned pixel coordinates map 1:1 onto the frame. Coordinate drift from resizing is therefore avoidable for this dataset, provided the `oversized_image: "error"` guard is set.
- The button crops are tiny. A 94×94 crop costs ceil(94/28)² = 16 tokens and a 19 px crop costs 1 token. This is well below the documented "<200 px" accuracy warning. Any crop sent to Claude should be upscaled to at least about 200–300 px and should keep some surrounding context.
- The Roboflow scores almost certainly reflect medium-to-large objects in ordinary photos, and the dataset is undisclosed. They do not predict localization of 19–94 px buttons in blurred, q≈53 JPEG head-camera frames. No public benchmark measures Claude on objects this small.
- Claude results vary widely by tier. Sonnet 5 scored 36.1% against Opus 5.5 at 74.4%. A cheap Claude model is therefore a poor box-drawer.

### Gaps
- Anthropic's model or system cards publish no mAP, IoU or RefCOCO number for any Claude model. I found only qualitative claims such as "better bounding-box detection in natural images" (Opus 4.7) and "approximate" (docs).
- Roboflow Vision Evals does not disclose dataset composition, object-size distribution or run-to-run variance. The leaderboard also changed between Sept 5 (53 models) and Sept 22 (59 models).
- I found no public measurement of Claude on small-object detection, such as COCO APsmall.

## Q2. Native detection and grounding in other VLMs, with benchmarks

### Takeaway
Gemini returns `box_2d` as `[ymin, xmin, ymax, xmax]` normalized to 0–1000. Qwen3-VL also uses 0–1000; Qwen2.5-VL used absolute pixels. Both are trained for grounding and lead the open benchmarks (RefCOCO about 89–92, ODinW-13 about 45–49 mAP for Qwen3-VL). On out-of-distribution, multi-domain detection (RF100-VL), every MLLM collapses:
- zero-shot, Gemini 2.5 Pro reaches 11.6 mAP and Qwen2.5-VL-72B 5.6 mAP;
- even with 10 examples per class, MLLMs reach only 7.5–9.2 mAP, while a fine-tuned GroundingDINO reaches about 33 mAP.

Specialist detectors fine-tuned on a few examples beat in-context MLLMs by 3–4×.

### Cited Findings
**Gemini**
- Gemini object detection returns `[ymin, xmin, ymax, xmax]` "normalized to 0-1000" as `box_2d`, plus `label`. Segmentation adds a polygon mask.
  - The docs recommend minimal thinking for segmentation.
  - Images of 384 px or smaller cost 258 tokens. Larger images are tiled into 768×768 tiles at 258 tokens each, adjustable with `media_resolution`.
  - Up to 3,600 images per request.

  — [Gemini API: Image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- On COCO val (5,000 images, mAP@[.5:.95]), Gemini 2.5 Pro scored 0.340 with structured output, about YOLOv3 level. Gemini 3 Pro Preview scored 0.407, about YOLOv4 level. SOTA Co-DETR is about 0.60.
  - Adding a thinking budget of 1024–2048 tokens "degraded performance significantly".
  - Mask generation looped infinitely on about 5% of requests.
  - Small, distant or occluded objects needed explicit prompt emphasis.
  - Invalid outputs were 5–6 per 5,000 images.

  Source: independent blog, July 2025, updated Nov 19, 2025. — [simedw: Is Gemini 2.5 good at bounding boxes?](https://simedw.com/2025/07/10/gemini-bounding-boxes/)
- Coordinate format matters. Gemini 3.5 Flash does best with YXYX normalized to 0–1000; GPT-5.6 does best with absolute XYXY pixels. Using the wrong format cost about 15 mAP. GPT-5.6 Sol boxes became misplaced or rotated on images of about 2000×2000 px or larger. — [Roboflow: GPT-5.6 (July 16, 2026)](https://blog.roboflow.com/openai-gpt-5-6/)

**Qwen**
- Qwen3-VL (arXiv 2511.21631v2, Nov 27, 2025): "Different from Qwen2.5-VL, we adopt a normalized coordinate system scaled to the range [0, 1000]". This implies Qwen2.5-VL used absolute pixel coordinates. — [Qwen3-VL Technical Report](https://arxiv.org/pdf/2511.21631)
- Qwen3-VL 2D grounding, from Tables 2–4 (instruct / thinking where both are reported):

  | Model | RefCOCO-avg | ODinW-13 mAP | CountBench |
  |---|---|---|---|
  | Qwen3-VL-235B-A22B | 91.9 / 92.1 | 48.6 / 43.2 | 93.0 / 93.7 |
  | Qwen3-VL-32B | 91.9 | 46.6 | — |
  | Qwen3-VL-8B | 89.1 | 44.7 | — |
  | Qwen3-VL-4B | 89.0 | 48.2 | — |
  | Qwen3-VL-2B | 85.6 | 43.4 | — |
  | Gemini 2.5 Pro | 74.6 | 33.7–34.5 | — |
  | GPT-5 (high) | 66.8 | — | — |
  | Claude Opus 4.1 | — | — | 93.1 / 91.9 |

  ODinW-13 mAP is computed "by setting confidence scores to 1.0" with all categories in the prompt. Claude Opus 4.1 has no reported RefCOCO or ODinW result. — [Qwen3-VL Technical Report](https://arxiv.org/pdf/2511.21631)

**RF100-VL (out-of-distribution, 100 datasets; arXiv 2505.20612 v4, Oct 22, 2025)**
- Zero-shot mAP: GroundingDINO 15.7 (about 16 in the paper's text), OWLv2 13.6, MQ-GLIP-Text 12.2, Gemini 2.5 Pro 11.6, Detic 9.5, Qwen2.5-VL-72B 5.6. Medical datasets scored under 2%.
- 10-shot fine-tuned GroundingDINO reached about 33.3–33.6, against 7.5–9.2 for MLLMs "even with annotator instructions". Specialists win by 3–4×.
- MLLMs lack per-box confidence scores and NMS. Qwen2.5-VL does better with single-class prompts and Gemini 2.5 Pro with multi-class prompts.

— [RF100-VL arXiv HTML](https://arxiv.org/html/2505.20612); [search summary of RF100-VL](https://arxiv.org/pdf/2505.20612)
- DetPO (ECCV 2026, rev. June 30, 2026) is a gradient-free prompt optimization for black-box MLLM few-shot detection. It improves over prior black-box approaches "by up to 9.7 mAP" on Roboflow20-VL and LVIS, and confirms that MLLMs "struggle with out-of-distribution detection". — [arXiv 2603.23455](https://arxiv.org/abs/2603.23455)

**GPT and others**
- GPT-5.5 scored only 13.8 mAP@50 on Roboflow's detection eval. GPT-5.6 Sol/Terra/Luna reached 46.2/44.7/43.3. Cost per image: Sol about 2.5¢ (~10 s), Terra about 1¢ (~6 s), Luna under 0.5¢; Gemini 3.5 Flash about 0.8¢. — [Roboflow: GPT-5.6](https://blog.roboflow.com/openai-gpt-5-6/)
- LandingAI internal benchmark: 100 PixMo-Points images, with attributes such as color, possession and orientation.
  - F1 scores: Agentic OD 79.7% (P 82.6%, R 77.0%), OWLv2 43.2%, Florence-2 39.7%, Qwen2.5-VL-7B 35.1%, GPT-4o 0%.

  — [LandingAI: What is Agentic Object Detection (Feb 24, 2025)](https://landing.ai/blog/what-is-agentic-object-detection)

### Inferences
- "Can output boxes" is not the same as "can label my data". On in-distribution COCO-like objects, the best VLMs are now in the YOLOv3–v4 range or better. On niche, out-of-distribution objects such as named console buttons, RF100-VL shows MLLMs near 5–12 mAP. The project's classes are defined by identity and position (B1–B4, EMO), not by generic nouns, which puts them squarely in the out-of-distribution regime.
- Among open-weight options, Qwen3-VL-4B/8B could run locally as a grounding model (ODinW-13 44.7–48.2). Even so, it would still need a human check on 19–94 px buttons.

### Gaps
- For Molmo pointing, I found only indirect evidence (LandingAI uses Molmo's PixMo-Points dataset) and no Molmo accuracy numbers in my sources.
- Florence-2 numbers appear only in LandingAI's internal benchmark.
- RF100-VL: the fetched table and the search summary disagree slightly, giving GroundingDINO zero-shot as 15.7 vs "16" and 10-shot as 33.6 vs 33.3. These are probably rounding or version differences between v1 and v4. I did not check per-model 10-shot numbers for Gemini and Qwen separately; only the 7.5–9.2 range is given.
- The Ramachandran Co-DETR "AP 80.23" is far above Co-DETR's usual COCO AP of about 66. Their protocol, which appears to use class-given, prompt-chained evaluation, differs from standard COCO, so their numbers are comparable only internally.

## Q3. The VLM as a verifier or classifier on detector crops, not as a box-drawer

### Takeaway
VLMs are much stronger at semantic tasks (what is this?) than geometric ones (where exactly?). Verifying detector proposals therefore plays to their strength. Two caveats apply:
- Fine-grained color discrimination is still weak. On ColorBench's Color Comparison task the best models score about 71%, against 79.8% for humans.
- Compression and blur hurt. Claude's docs warn about heavy JPEG compression and images under 200 px.

I found no published accuracy for "pink vs red button on q≈53 JPEG crops". It would have to be measured on a human-labeled subset.

### Cited Findings
- MFMs "perform semantic tasks notably better than geometric ones" and are "not close to state-of-the-art specialist models at any task". — [Ramachandran et al., arXiv 2507.01955 (ICLR 2026)](https://arxiv.org/abs/2507.01955)
- Roboflow "Identification" scores (Sept 2026): Claude Opus 5 90.6% and Gemini 3.1 Pro 100%. The same models scored 54.4% and 67.4% on detection. — [Roboflow compare page](https://playground.roboflow.com/models/compare/claude-opus-5-vs-gemini-3-1-pro)
- ColorBench (arXiv 2504.10514 v2, June 12, 2025; NeurIPS 2025) evaluated 32 VLMs. Claude was not included.
  - Color Comparison (fine-grained discrimination): Gemini-2 CoT 71.3%, GPT-4o CoT 71.3%, humans 79.8%.
  - Overall perception and reasoning: best proprietary with CoT 59.6%, GPT-4o without CoT 52.9%, best open-source 48.8%.
  - Color robustness: GPT-4o only 46.2% (69.9% with CoT).
  - "Current VLLMs struggle to reliably distinguish fine-grained colors, even under ideal conditions with single-object scenes". Color cues "can also mislead", and grayscale improved illusion and mimicry tasks.

  — [ColorBench arXiv HTML](https://arxiv.org/html/2504.10514v2); [ColorBench abstract](https://arxiv.org/abs/2504.10514)
- VLM-RobustBench (Mar 6, 2026) tested Qwen, InternVL, Molmo and Gemma, not API models.
  - Low-severity glass blur cost about 8 pp on MMBench. Resampling and geometric distortions cost up to 34 pp, and Qwen3-VL-235B dropped 30.7 pp in its worst case.
  - "Current VLMs are semantically strong but spatially fragile".

  — [arXiv 2603.06148](https://arxiv.org/abs/2603.06148)
- Another robustness study reports that JPEG compression and motion blur degrade VLM performance markedly, and names high-level JPEG compression as the hardest condition. — [arXiv 2509.12492 (search snippet)](https://arxiv.org/abs/2509.12492)
- Claude docs: heavy JPEG compression "can introduce artifacts that are detrimental to model performance". Also: "Avoid cropping out key visual context solely to enlarge the text", and accuracy degrades on images under 200 px. — [Claude docs: Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- A published verifier design ("No Labels, No Problem", arXiv 2512.08889):
  - An Object-Detection Verifier receives the clean image plus an annotated image with numbered boxes and returns `keep_indices` / `drop_indices`.
  - In a per-crop mode, it checks whether the labeled object is the dominant, clearly visible subject.

  — [arXiv 2512.08889 (search snippet)](https://arxiv.org/pdf/2512.08889)
- LandingAI says its agentic approach does well on "objects with attributes (color, possession, orientation)" but is still working on negative prompts, where the requested object is absent. — [LandingAI](https://landing.ai/blog/what-is-agentic-object-detection)

### Inferences
- **B3 pink vs EMO red.** Pure color is exactly where VLMs are weakest: about 71% on fine color comparison even for top models on clean images. The frames are q≈53 JPEG with blur, which lowers this further. A VLM verifier should get these inputs:
  - the full frame with the candidate box drawn and numbered, so it can use layout: B3 is top-right and EMO is bottom-center;
  - an upscaled crop of at least about 224 px with context padding;
  - a cached reference sheet with one clean crop per button.

  It should answer over a closed set: {B1, B2, B3, B4, EMO, not-a-button}. Position and shape priors are likely more reliable than hue. This is an untested hypothesis, and accuracy must be measured on human-labeled frames.
- **The false-positive types are semantic,** so a VLM should handle them well: a white glove predicted as B2, or a red handle fragment between fingers predicted as EMO. "Is this a console button or part of a glove/tool handle?" is an identification question, where scores are about 90–100%.
- **Tool classes** (screwdriver, wrench, pliers held in a gloved hand) are generic nouns with clear shape differences. VLM classification of tool crops is likely reliable. Tight localization is still the detector's job.
- Crop verification is very cheap in tokens: 16–64 tokens per crop plus a cached reference prompt.

### Gaps
- I found no study measuring VLM crop classification accuracy against JPEG quality near 50, or on red/pink/magenta discrimination specifically.
- ColorBench did not evaluate any Claude model, and I found no color benchmark that includes Claude.

## Q4. Agentic labeling workflows (2025–2026) and how human review is structured

### Takeaway
The tooling is mature. Roboflow, Label Studio and FiftyOne all ship MCP servers that Claude Code can drive. The pattern that works in practice is not "the agent draws every box". It is: agent orchestrates, a detector or VLM pre-labels, the agent pushes predictions into an annotation tool, humans review in that tool, and the agent exports and trains. The only published multi-VLM consensus pipeline (Roboflow, July 2026) has no accuracy numbers and no human-review stage.

### Cited Findings
- The Roboflow MCP server (docs changelog: April 2026) exposes 67 tools across projects, datasets, training, Workflows and Universe. It supports Claude.ai, Claude Desktop, Claude Code, Cursor and Codex, and uses OAuth with no API key. — [Roboflow MCP blog](https://blog.roboflow.com/mcp-server/); [Roboflow MCP changelog, April 2026](https://docs.roboflow.com/changelog/explore-by-month/april-2026/mcp-server)
- Roboflow MCP annotation tools:
  - `annotations_save`, `autolabel_start` ("hosted auto label job over a batch of images"), `autolabel_job_get`, and batch create/merge/delete.
  - 14 job-management tools: create jobs, assign images, submit for review, return for edits with reassignment, review individual images or bulk-update statuses, and accept into the dataset.
  - The underlying auto-label models and pricing are not documented on the page.

  — [Roboflow docs: MCP Server](https://docs.roboflow.com/agents/mcp-server)
- Roboflow multi-model auto-labeling (July 10, 2026):
  - Gemini proposes detections; GPT and Claude independently evaluate them; a rules block requires 2-of-3 agreement before writing to the dataset.
  - Rationale: "If a model experiences a random hallucination, it won't get a second vote".
  - The post gives no accuracy or cost numbers. Human involvement is only optional visualization for debugging.

  — [Roboflow: Multi-Model Auto Labeling](https://blog.roboflow.com/multi-model-auto-labeling/)
- Roboflow Workflows offers an Anthropic Claude block with a selectable model version, e.g. Opus 4.7, which can be used for auto-labeling. — [Roboflow: Claude Opus 4.7](https://blog.roboflow.com/claude-opus-4-7/)
- The official Label Studio MCP server (HumanSignal, June 2, 2025) lets an LLM create projects, import and list tasks, get annotations and add model predictions. The post frames it as "not a replacement for the UI, it's a complement". — [Label Studio blog](https://labelstud.io/blog/integrating-label-studio-with-model-context-protocol-mcp/); [FlowHunt listing](https://www.flowhunt.io/mcp-servers/label-studio/)
- The FiftyOne MCP server (Voxel51) exposes 45+ (later 80+) tools and operators: dataset operations, model inference, brain computations and App control. Agent "skills" cover annotation-quality audits and class-distribution analysis. — [voxel51/fiftyone-mcp-server](https://github.com/voxel51/fiftyone-mcp-server); [FiftyOne Agents docs](https://docs.voxel51.com/agents/index.html)
- Mcity's MSight agent is an MCP agent combining FiftyOne, Label Studio, CVAT and detectors (RF-DETR, YOLO, HF). It auto-labels and then exports to CVAT or Label Studio for review. — [mcity/mcity_MSight_agent](https://github.com/mcity/mcity_MSight_agent)
- LandingAI Agentic Object Detection (Feb 2025) uses "planning, code generation, and tool use" to reason about the image; see Q2 for its F1 numbers. — [LandingAI](https://landing.ai/blog/what-is-agentic-object-detection)
- Detector-based auto-labeling baseline (Voxel51 and U. Michigan, arXiv 2506.02359, June 2025), using YOLO-World at confidence 0.2:
  - Models trained on auto-labels vs human labels, mAP50: VOC 0.715 vs 0.756, COCO 0.460 vs 0.496, but BDD 0.271 vs 0.434.
  - Auto-labeling all train sets took 1.27 h and $1.18, against about 6,703 h and about $124k for human labeling.
  - A low confidence threshold, favoring recall, gave better downstream models than a high one.
  - It degraded on rare or fine-grained classes and under domain shift.

  — [arXiv 2506.02359](https://arxiv.org/html/2506.02359)

### Inferences
- **Recommended hybrid for this project** (inferred from the evidence above):
  1. Detector proposes. Run the project's YOLOv8n button model plus a tool detector at a **low confidence threshold**, since the Voxel51 result shows recall-favoring thresholds are better downstream.
  2. VLM verifies and classifies each box over the closed set {B1..B4, EMO, not-a-button} or {screwdriver, wrench, pliers, none}. Use the full frame with the box drawn, an upscaled crop and cached reference images, via Batch API with structured output.
  3. Route by agreement.
     - Detector and VLM agree: auto-accept, but spot-check a random sample.
     - They disagree, especially on B3 vs EMO, B2 from a glove, or EMO from a red fragment: send to a human.
     - The VLM says not-a-button: send to a human as a suspected false positive.
  4. Humans review in Roboflow annotation jobs (or Label Studio), created and tracked by Claude Code through MCP.
  5. The test set is human-labeled from scratch and never routed through YOLO or the VLM.
- **Claude Code reading images directly** (the Read tool in an interactive session) is the least efficient form of "agent does the labeling".
  - Every image stays in context and is resent each turn. The docs warn this inflates payload and latency, so a 5,000-image session is impractical and gets no batch discount.
  - No measurement exists of its box accuracy.
  - Better: Claude Code writes and runs a script that calls the Batch API, converts outputs to YOLO txt, and uploads them as predictions for review.
- This environment already has a Roboflow MCP server configured (unauthenticated `mcp__roboflow__authenticate`), so the review-job flow is directly reachable.

### Gaps
- I found no official CVAT MCP server; CVAT appears only inside third-party agents such as Mcity.
- Roboflow does not document the models behind `autolabel_start`.
- I found no published measurement of the accuracy or human-correction rate of any VLM-verifier or consensus pipeline.

## Q5. Throughput and cost for about 2,000–5,000 images

### Takeaway
API cost is small. Labeling or verifying 5,000 frames costs roughly $5–$130 depending on model, and half that with batch APIs. Throughput is also not the bottleneck: one Claude batch holds up to 100,000 requests and most finish within an hour. The real costs are human review time and building the evaluation set.

### Cited Findings
- Claude prices per MTok, input / output (Sept 2026):

  | Model | Standard | Batch (50% off) |
  |---|---|---|
  | Opus 5.5 | $4 / $20 | $2 / $10 |
  | Opus 5 | $5 / $25 | $2.50 / $12.50 |
  | Sonnet 5 | $2 / $10 | $1 / $5 |
  | Haiku 4.5 | $1 / $5 | $0.50 / $2.50 |
  | Fable 5.1 | $10 / $50 | $5 / $25 |

  Cache reads cost 0.1× input (0.05× on Opus 5.5), and caching stacks with the batch discount. Claude 4.7+ tokenizers produce about 30% more text tokens. — [Claude docs: Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Claude Message Batches:
  - Up to 100,000 requests or 256 MB per batch; "most batches completing within 1 hour"; expiry at 24 h; results kept 29 days; vision supported.
  - Batch cache hits are best-effort, typically 30–98%.

  — [Claude docs: Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- Gemini prices per MTok, input / output (Sept 2026):

  | Model | Price |
  |---|---|
  | 3.5 Flash | $1.50 / $9 |
  | 3.1 Pro Preview | $2 / $12 |
  | 2.5 Flash | $0.30 / $2.50 |
  | 2.5 Flash-Lite | $0.10 / $0.40 |
  | 3.7 / 3.8 Flash (promo through Dec 31, 2026) | $0.75 / $3.75 |
  | Robotics-ER 2 Preview | $1 / $5 |

  The Batch API is 50% off. — [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Measured cost per sample on detection tasks:

  | Model | Cost per sample |
  |---|---|
  | Claude Opus 5.5 | $0.014 |
  | Claude Opus 5 | $0.027 |
  | Gemini 3.1 Pro | $0.010 |
  | Gemini 3.5 Flash | ~$0.008 |
  | GPT-5.6 Sol | ~$0.025 |
  | GPT-5.6 Terra | ~$0.01 |
  | GPT-5.6 Luna | <$0.005 |

  — [Roboflow Vision Evals](https://playground.roboflow.com/evals); [Roboflow compare](https://playground.roboflow.com/models/compare/claude-opus-5-vs-gemini-3-1-pro); [Roboflow GPT-5.6](https://blog.roboflow.com/openai-gpt-5-6/)
- Latency per call is about 6–20 s: Opus 5.5 17.55 s, Opus 4.7 17.82 s, Opus 5 7.4 s, Gemini 3.1 Pro 7.8 s, Gemini 3.5 Flash 20.6 s. — [Roboflow leaderboard](https://playground.roboflow.com/models/task/object-detection); [Roboflow Opus 4.7](https://blog.roboflow.com/claude-opus-4-7/)
- For comparison, detector auto-labeling of all of VOC, COCO, LVIS and BDD train sets cost $1.18 and 1.27 h (YOLO-World). — [arXiv 2506.02359](https://arxiv.org/html/2506.02359)

### Inferences (my arithmetic, not measured)
Assumptions: a 768×1024 frame is 1,036 image tokens plus about 400 prompt tokens, roughly 1.45k input. Output is about 150 tokens of JSON, or about 1k with thinking.

| Model | Per frame (no thinking) | 5,000 frames, standard | 5,000 frames, batch |
|---|---|---|---|
| Haiku 4.5 | ~$0.0022 | ~$11 | ~$5.5 |
| Sonnet 5 | ~$0.0044 | ~$22 | ~$11 |

- With about 1k thinking tokens, Haiku 4.5 rises to about $32 and Sonnet 5 to about $64 for 5,000 frames at standard price.
- Opus 5.5 always thinks: about 1.45k × $4/M + 1k × $20/M ≈ $0.026 per frame, so about $129 standard or about $64 batch. Roboflow's measured $0.014 per sample implies about $70.
- Gemini 2.5 Flash would cost about $5 for 5,000 frames. By the documented tiling rule a 768×1024 image is about 2 tiles, or 516 tokens. This rule may differ under `media_resolution` on newer models.
- Crop-verification mode costs a fraction of full-frame labeling. Each upscaled crop is about 64 tokens, and the reference sheet is cached.
- For 2,000 frames, divide all figures by 2.5.
- Human review dominates the budget. Even at 92% YOLO pre-label correctness, 5,000 frames with several boxes each leave hundreds of boxes to fix.

### Gaps
- I did not fetch Anthropic's or Google's per-tier rate-limit tables, so I have no concrete RPM or ITPM numbers.
- Gemini 3.x image tokenization under `media_resolution` was not verified for 768×1024.

## Q6. Risks: hallucinated boxes, coordinate drift, run-to-run inconsistency, evaluation circularity

### Takeaway
The documented failure modes are:
- hallucinated or absent-object boxes, and poor negative handling;
- wrong coordinate convention, which costs about 15 mAP;
- silent server-side resizing;
- instability on large images;
- degradation when thinking is enabled (Gemini);
- invalid or looping outputs;
- weak counting and small-object recall.

No source quantifies run-to-run box variance. VLM labels must never enter the test set, and in this project the test set stays human-only.

### Cited Findings
- **Resizing** is "the most common cause of misaligned coordinates". Wrong-tier limits "silently shift every coordinate". Guard with `"oversized_image": "error"`. — [Claude docs: Coordinates](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates)
- **Normalized coordinates**: Claude "does not work well" with 0–1000. — [Claude docs](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates)
- **Wrong coordinate format** cost about 15 mAP; boxes became misplaced or rotated on images of about 2000×2000 px or larger. — [Roboflow GPT-5.6](https://blog.roboflow.com/openai-gpt-5-6/)
- **Thinking budget** degraded Gemini 2.5 detection significantly; about 5% of mask requests looped infinitely; 5–6 invalid outputs per 5,000 images. — [simedw](https://simedw.com/2025/07/10/gemini-bounding-boxes/)
- **Hallucination under multi-model consensus**: Roboflow motivates 2-of-3 cross-family voting as a guard against "random hallucination". — [Roboflow multi-model](https://blog.roboflow.com/multi-model-auto-labeling/)
- **Negative prompts** (the requested object is absent) remain an open problem for agentic OD. GPT-4o scored F1 0% on LandingAI's attribute benchmark. — [LandingAI](https://landing.ai/blog/what-is-agentic-object-detection)
- **Direct coordinate prediction** failed for many MFMs; GPT-4o direct AP50 was 17.69 vs 60.62 chained. — [arXiv 2507.01955](https://arxiv.org/html/2507.01955)
- **Counting blind spot**: Opus 4.7 scored 30% on Roboflow's counting prompts; Claude docs say counts "might not always be precisely accurate". — [Roboflow Opus 4.7](https://blog.roboflow.com/claude-opus-4-7/); [Claude docs: Vision](https://platform.claude.com/docs/en/build-with-claude/vision)
- **No calibrated confidence**: MLLMs lack per-box confidence and NMS, which hurts mAP and makes thresholding impossible. Qwen3-VL's ODinW evaluation sets every confidence to 1.0. — [RF100-VL](https://arxiv.org/html/2505.20612); [Qwen3-VL report](https://arxiv.org/pdf/2511.21631)
- **Run-to-run variance**: Roboflow runs every eval task 3 times and reports means, so it treats variance as real, but it publishes no variance figures. — [Roboflow Vision Evals](https://playground.roboflow.com/evals)
- **Test-set quality**: RF100-VL used "exhaustively verified and re-annotated labels" for its test sets. — [RF100-VL search summary](https://arxiv.org/pdf/2505.20612)
- **Circularity**: detector-based auto-labels still lag human labels, most under domain shift (BDD mAP50 0.271 vs 0.434). Auto-labels are therefore not a substitute for human ground truth when measuring a model. — [arXiv 2506.02359](https://arxiv.org/html/2506.02359)

### Inferences
- **Evaluation circularity.** If YOLO or a VLM pre-labels the test set, the test set inherits their biases, and the B3→EMO bias would go unmeasured. This matches the project rule that the test set is human-labeled only.
  - Using the VLM verifier on train/val is acceptable.
  - If the VLM-verified labels also train YOLO, the val metric partly measures agreement with the VLM, so keep a human-only val slice too.
- **Consistency.** Run the VLM at a fixed model version and effort level. Temperature control may not exist for thinking-always-on models such as Opus 5.5. Store raw JSON responses for audit. Consider 2-run or 2-model agreement as the auto-accept criterion.
- **Coordinate hygiene.**
  - Send 768×1024 as-is (1,036 tokens, no resize) with `oversized_image: "error"`.
  - Ask Claude for absolute `[x1, y1, x2, y2]` and Gemini for `box_2d` 0–1000 `[ymin, xmin, ymax, xmax]`.
  - Convert to YOLO normalized `cx cy w h` in code, clamping to image bounds.
  - Visually spot-check 20–50 frames before any batch run, as Anthropic advises.

### Gaps
- No published study measures run-to-run IoU or label-flip variance for Claude, Gemini or GPT box outputs.
- No study quantifies hallucinated-box rates on egocentric, blurred, low-quality industrial frames.
