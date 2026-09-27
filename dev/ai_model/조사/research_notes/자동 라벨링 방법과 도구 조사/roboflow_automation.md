# Roboflow ecosystem routes to automated / AI-assisted YOLO bounding-box labeling, and how far an agent (Claude Code) can drive them

Research date: 2026-09-28. Most sources are live Roboflow docs pages, fetched as Markdown (`<page>.md`) on this date. "Documented" means stated in a cited source. "Inferred" means my reasoning, not a source statement. No Roboflow login or API key was used.

Note for the report writer: this Claude Code session already lists two deferred tools, `mcp__roboflow__authenticate` and `mcp__roboflow__complete_authentication`. So the hosted Roboflow MCP server is already registered here and is waiting for an OAuth sign-in. I did not call either tool, as the constraints required. This comes from the session's tool list, not from the web.

---

## Q1. Roboflow MCP server: does it exist, what tools does it expose, and can it upload, annotate, run inference or auto-label? What auth does it use?

### Takeaway
There is an official **hosted** Roboflow MCP server at `https://mcp.roboflow.com/mcp`. It uses **OAuth, with no API key**. Its docs list **141 tools**, and these cover the whole labeling loop: zip image upload, `annotations_save` for writing labels onto an existing image, `autolabel_start`/`autolabel_job_get`, annotation job assignment, review and accept, `models_infer`, `workflows_run`/`workflow_specs_run`, version export, and a recipe for uploading custom weights. It **cannot upload images and annotations in one step**. Images go in as a zip, and labels are saved per image in a second step. Roboflow does not publish a local, self-run version. The only local MCP servers are small third-party projects.

### Cited Findings
- The hosted endpoint is `https://mcp.roboflow.com/mcp`. The docs give this install line for Claude Code: `claude mcp add -s user roboflow --transport http https://mcp.roboflow.com/mcp`. It can also be added as a Claude.ai connector that "works everywhere - Claude.ai, Claude Desktop, and Claude Code". — [Roboflow Docs: MCP Server](https://docs.roboflow.com/agents/mcp-server)
- Auth: "The Roboflow MCP server uses OAuth for authentication - no API key needed. You'll be prompted to sign in to Roboflow on first use." Each tool declares the OAuth scopes it needs, and the client gets only the scopes approved at sign-in. Example scopes are `workspace:read project:read model:infer offline_access`. Gateways that need pre-registered credentials can use an OAuth app created under Workspace Settings > Developer. — [MCP Server docs](https://docs.roboflow.com/agents/mcp-server)
- Tool count: the docs say "The server exposes 141 tools". I counted 141 tool rows in the page's tables. An earlier search-engine summary of Roboflow marketing pages said "67 tools". I did not verify that figure, and it is probably an older count. — [MCP Server docs](https://docs.roboflow.com/agents/mcp-server)
- Tools relevant to labeling, verbatim from the docs:
  - **Images:** `image_upload` ("Upload local image files to a project via a zip"), `image_upload_status`, `images_search`, `images_workspace_search` (RoboQL), `images_update_metadata`, `images_batch_update_metadata`.
  - **Annotation:** `annotations_save` ("Save an annotation for an existing image"), `autolabel_start` ("Start a hosted auto label job over a batch of images"), `autolabel_job_get`.
  - **Batches:** `annotation_batches_list/get/create/merge/delete`, plus admin list/get/images_list.
  - **Annotation Jobs:** `annotation_jobs_list/get/create/update`, `annotation_jobs_images_list/add/reassign`, `annotation_jobs_submit_for_review`, `annotation_jobs_return_for_edits`, `annotation_jobs_review_image(s)`, `annotation_jobs_accept_into_dataset` ("Finalize job images into the Dataset and assign splits"), `annotation_jobs_move_to_unassigned`, `annotation_jobs_delete_annotations`.
  - **Versions:** `versions_generate`, `versions_get`, `versions_export`, `versions_delete`.
  - **Models:** `trainings_*`, `models_list/get`, `models_infer` ("Run hosted inference on an image using a trained model"), `models_upload_custom_weights` ("Get the recipe for uploading locally trained weights to Roboflow").
  - **Model evaluations:** `model_evals_get_confusion_matrix`, `..._performance_by_class`, `..._image_predictions`, and others.
  - **Workflows:** `workflows_run` ("Execute a saved Workflow on one or more images"), `workflow_specs_run` ("Execute a Workflow from an inline JSON definition"), `workflow_specs_validate`, `workflow_blocks_list/get_schema`, `workflows_create/update`.
  - **Media:** `media_upload`, `media_analyze` ("Analyze an image or short video with a vision model").
  - Also: Universe search, project fork, API key management, Trash restore, Active Learning, devices and cloud storage.
  - Source for all of the above: [MCP Server docs](https://docs.roboflow.com/agents/mcp-server)
- Uploading images with annotations through MCP: "The zip holds images only, so labels are saved in a second step" (`image_upload` is "Images only, no annotation files"; then `annotations_save`). — [Upload a Dataset docs, MCP section](https://docs.roboflow.com/datasets/create-and-upload/upload-a-dataset)
- The MCP server starts Auto Label jobs with an OAuth access token. "A job started with a token runs on the project's billing API key." There is a restriction: "If the app's access is limited to project folders, it can start a job with a foundation model only. A custom model or a saved Workflow returns a 403 with errorType FOLDER_SCOPED_TOKEN_REFERENCE … Start those jobs with a workspace API key." — [Auto Label docs, HTTP API](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
- July 2026 changelog: "You can now upload locally trained model weights to Roboflow directly from Claude Code, Cursor, or any MCP client … Supported architectures include YOLOv5 through YOLOv12, YOLO26, YOLO-NAS, RF-DETR, Florence-2, and PaliGemma." — [Changelog, Jul 2026](https://docs.roboflow.com/reference/changelog/changelog/july-2026/mcp-server-upload-custom-model-weights-from-your-ai-assistant)
- Roboflow also publishes "Agent Skills", described as "knowledge for your agents" (repo `roboflow/computer-vision-skills`, last pushed 2026-09-25). It also has an in-app "Roboflow Agent" that can run Auto Label. — [Roboflow Docs: Agents](https://docs.roboflow.com/agents/agents); [GitHub roboflow/computer-vision-skills](https://github.com/roboflow/computer-vision-skills)
- Roboflow's blog (published 2026-05-20, updated 2026-07-27) says the MCP lets agents "create projects, auto-label images, pull datasets from Roboflow Universe, train models, and build deployable Workflows without any SDK to install". A second post (2026-05-12) demos Claude Code zipping and uploading local images and then "kick[ing] off auto-labeling with a foundation model". — [Roboflow blog: Roboflow MCP](https://blog.roboflow.com/mcp-server/); [Roboflow blog: Computer Vision MCP Server](https://blog.roboflow.com/computer-vision-mcp-server/)
- Local or third-party alternatives are unofficial and have no stars: `nickedridge-wq/roboflow-mcp` (pushed 2026-03-25), `MayankD409/Roboflow-MCP-Server` (2026-07-13), `eusef/Eusef_Roboflow_MCP` (2026-03-29). — [GitHub search results](https://github.com/nickedridge-wq/roboflow-mcp); [MayankD409](https://github.com/MayankD409/Roboflow-MCP-Server)

### Inferences
- An agent could run the entire semi-automatic loop from the terminal through MCP: upload a zip → `annotations_save` per image with our own YOLOv8n pre-labels, or `autolabel_start` → create an annotation job → a human reviews in the web UI → `annotation_jobs_accept_into_dataset` → `versions_export`. The one step that still needs a human in a browser is box correction or review. That is intentional, since the docs pitch it as "You handle what you're best at (seeing, labeling, judging results), your agent handles the rest".
- One-time human action: someone has to complete the OAuth sign-in (`mcp__roboflow__authenticate`) in a browser. After that the agent acts with the scopes that were granted.
- `annotations_save` works one image at a time. For thousands of pre-labels, the SDK or CLI zip upload (Q3) is probably more efficient than one MCP call per image. This is inferred from the tool descriptions, not measured.
- `models_upload_custom_weights` only returns a recipe. The weights upload itself still runs locally through the SDK or CLI (inferred from the tool description).

### Gaps
- The docs do not say whether the MCP server, or specific tools such as `autolabel_start`, are available on the free Public plan. They do not document per-plan tool gating.
- I found no documentation on how the hosted server receives "local image files" (for example, a signed URL that the client PUTs to). The exact mechanism, and any size or count limits on MCP `image_upload`, are not documented on the page I read.
- The docs do not give the input schema of `annotations_save`, so I could not confirm that it accepts YOLO txt with a labelmap. The equivalent REST endpoint does (Q3).

---

## Q2. Auto Label, Label Assist, Box Prompting and Smart Select: backing models, custom-model use, few-shot/visual prompts, credit cost, plan and publicity constraints

### Takeaway
Roboflow has four AI labeling features: **Auto Label** (bulk, background job), **Label Assist** (runs a trained model when each image opens in the annotator), **Box Prompting** (few-shot visual examples, in the UI only), and **Smart Select** (SAM click-to-polygon). As of September 2026, Auto Label uses **GPT-6 Astra, SAM 3, Gemini 3.7 Flash, a model trained in Roboflow on the same dataset, or a saved Workflow**. **Grounding DINO is no longer in the Auto Label list.** Roboflow's own docs say foundation-model Auto Label "cannot distinguish specific variants", which matches our failed B3↔EMO result. Base cost is **1 credit per 1,000 auto-labeled images**. Interactive AI labeling costs **1 credit per 100 images**. GPT-6 Astra and Gemini add third-party model charges on top. The free "Public" tier shown on the pricing page has **15 credits per month** and **all data is public on Universe**.

### Cited Findings
**Feature set and backing models**
- The docs list four AI labeling features. **Label Assist:** "Use a model you have already trained". **Smart Select:** "Use the Segment Anything Model in your browser to annotate polygon masks with a single click". **Box Prompting:** "Draw examples of an object in an image, then let Box Prompting find all other instances". **Auto Label:** "Use a foundation model (GPT-6 Astra, SAM 3, or Gemini), a trained model, or a saved Workflow". — [AI Labeling docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling)
- Auto Label sources, verbatim:
  - GPT-6 Astra (Boxes), detection only.
  - GPT-6 Astra (Masks).
  - GPT-6 Astra + SAM 3 (Polygons).
  - SAM 3 ("labels objects from text prompts", detection and segmentation).
  - Gemini (Boxes), "Gemini 3.7 Flash draws bounding boxes", detection only.
  - "Models trained in Roboflow", with the note: "Only models from the same dataset as your Annotation Batch are currently supported."
  - "A saved Workflow compatible with your project type".
  - GPT-6 Astra (Boxes) is the default on object-detection projects.
  - Source: [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
- Documented limitation: "You should not use a foundation model like SAM 3 if you need to identify specific variants of an object. For example, Auto Label cannot distinguish between different types of crack, or identify unique defects in electronics." And: "Auto Label will be unable to label images according to specific requirements, such as distinguishing the brand of an aluminum can." — [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
- Class descriptions act as prompts: "GPT-6 Astra, SAM 3, and Gemini all search with the description and save what they find under the class name … Auto Label rejects a preview or a job when two classes share one." — [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
  - Conflicting source: Roboflow's Gemini blog (2026-08-28) says "Gemini reads only the class name (not the description field)" and that "Every box comes back at full confidence" with "no per-class score". — [Roboflow blog: Gemini 3.7 Flash Auto Label](https://blog.roboflow.com/how-to-auto-label-image-data-with-gemini-3-7-in-roboflow/)
- The GPT-6 Astra changelog (Sep 2026) says the model "reads open vocabulary class names, visible text, and the relationship between objects", for example "medicine bottle, but only if the bottle is the one at the very front of a row". It is available "in the Roboflow app or with Roboflow MCP". — [Changelog, Sep 2026](https://docs.roboflow.com/reference/changelog/changelog/september-2026/gpt-6-astra-in-auto-label-automate-data-annotation-with-plain-language-prompts)
- GPT-6 Astra and Gemini (Boxes) "return every label at full confidence, so they have no threshold to set". — [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
- History and deprecation: SAM 3-powered Auto Label was announced in November 2025. That changelog page has since moved, so I only saw it as a search snippet. Before that, Roboflow published Grounding DINO / Grounded SAM 2 auto-label notebooks. Grounding DINO no longer appears among the current Auto Label options, and I found no official deprecation notice. — [Search snippet: Changelog Nov 2025 "Auto Label Data with SAM 3"](https://docs.roboflow.com/changelog/explore-by-month/november-2025/auto-label-data-with-sam-3); [roboflow/notebooks grounded-sam-2-auto-label](https://github.com/roboflow/notebooks/blob/main/notebooks/grounded-sam-2-auto-label.ipynb); [current Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)

**Using our own model, workflows and visual examples**
- Auto Label with our own model: in the API, `modelType: "custom_roboflow"` with `modelOptions.modelId: "your-model/1"`. In the CLI, `--model-type roboflow`. When no ontology is given, the ontology comes from the model's trained classes. — [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
- Auto Label with a Workflow (July 2026): "Slice large images with SAHI to catch small objects, combine models with consensus voting or two-stage crop and classify pipelines, filter predictions with custom logic, or label with foundation models like Gemini, Claude, and GPT." Only mapped classes are written back, with per-class confidence thresholds. — [Changelog, Jul 2026](https://docs.roboflow.com/reference/changelog/changelog/july-2026/auto-label-with-workflows-label-data-with-any-model-or-custom-logic); [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
- Label Assist can use "a previous version of a trained model or a public model on Roboflow Universe". Classes can be deselected or remapped. It "will run when you open an image in the annotation tool", so it is interactive and runs per image. — [Label Assist docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/model-assisted-labeling)
- Weights trained outside Roboflow can be uploaded. A "Versioned Deployment" is described as "Ideal for using model on Label Assist". The docs attach version pins: "YOLOv8 models must be trained on `ultralytics==8.0.196`" and "YOLOv11 models must be trained on `ultralytics<=8.3.40`". The upload commands are `version.deploy("yolov8", ...)` or `roboflow upload_model ... -t yolov8`. — [Upload Custom Model Weights docs](https://docs.roboflow.com/models/model-weights/upload-custom-weights)
- Roboflow Instant is a few-shot model that is "free to train". It "automatically trains … as soon as you approve a new batch", when a project has fewer than 1,000 images. Instant models can be used in Label Assist (June 2025 changelog). — [Roboflow Instant docs](https://docs.roboflow.com/models/train/roboflow-instant); [Changelog Jun 2025](https://docs.roboflow.com/changelog/explore-by-month/june-2025/use-instant-models-in-label-assist)
- Box Prompting is the one feature with visual, few-shot and negative examples:
  - "Box Prompting takes one (or more) prompt bounding boxes … Each example fine-tunes a model that improves with each image."
  - It supports "Convert to Negative" and trains on human-drawn or human-edited annotations.
  - Limitation: "The Box Prompting model has to downscale images … optimal results with images 1000px or less in either dimension", with a warning at 2000px+ when boxes are smaller than about 5% of width or height.
  - It is web-UI only. I found no API, CLI or MCP tool for it.
  - Source: [Box Prompting docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/box-prompting-ai-labeling)
- Smart Select is SAM running in the browser, for polygons. — [Smart Select docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/smart-select)

**Credit cost and plans**
- Credit rates from the credits page (last updated 2026-03-30):
  - "Auto Labeling: 1000 AI-Labeled Images" per credit.
  - "Interactive AI labeling: 100 AI-Labeled images" per credit.
  - Uploads: 10,000 images per credit. Storage: 5,000 images stored per credit.
  - Self-hosted inference is free.
  - Source: [roboflow.com/credits](https://roboflow.com/credits)
- Per-model costs and extra charges:
  - The `GET /{workspace}/autolabel/models` endpoint (or `roboflow autolabel models`) returns each model's "credits it uses per image" and `available: false when your plan does not include the model`.
  - Previews are free: "All test results are free & don't use any credits".
  - "Gemini (Boxes) and workflows that call an outside AI model add usage charges for that model on top of the credits."
  - For GPT-6 Astra, "OpenAI token use is billed on top of the credits per image".
  - "Core's paid monthly credit tiers include access to a Roboflow-provided OpenAI key".
  - Source for all of the above: [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
- Since September 2026, a workspace can store its own OpenAI or Gemini key, and those Auto Label jobs are "billed by the provider". — [Changelog Sep 2026](https://docs.roboflow.com/reference/changelog/changelog/september-2026/auto-label-run-with-your-openai-or-gemini-key)
- The Gemini blog gives an example ("labeling 42 images costs 0.042 credits because Auto Label processes 1,000 images per credit") and says "This tool is currently available within paid Roboflow plans". — [Roboflow blog: Gemini 3.7 Flash](https://blog.roboflow.com/how-to-auto-label-image-data-with-gemini-3-7-in-roboflow/)
- Pricing page, live on 2026-09-28:
  - **Public**: "Free … 15 credits / month", 2 users, **10 projects**, 250,000-image workspace limit, "Data and models are open source on Roboflow Universe". It shows a check mark for AI Labeling, Model Weights Upload, Batch Processing and Foundation Models.
  - **Core**: $99 per month billed monthly, or $79 per month billed annually; "Private data & models"; 20 projects.
  - Source: [roboflow.com/pricing](https://roboflow.com/pricing)
  - Conflicting source: the docs' Plans page describes a newer structure, "Core includes private projects. Its Free Tier includes 10 credits that refresh every month". It also says "Existing Public workspaces retain … All of your datasets and models listed publicly on Universe". — [Plans docs](https://docs.roboflow.com/platform/billing-and-plans/plans)
- On the free tier: "running out of included and prepaid credits means you will no longer be able to use many features … until your included credits reset". "The Core plan's Free Tier does not include Flex Usage." — [credits page FAQ](https://roboflow.com/credits); [Credits docs](https://docs.roboflow.com/platform/billing-and-plans/credits)
- Existing annotations: an Auto Label job asks whether to "Keep Existing Annotations" or "Replace Existing Annotations". API default: `preserveExistingAnnotations=false`, which replaces them. CLI warning: "By default the job replaces the annotations already on the batch images." — [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)

### Inferences
- **B3 (pink, top-right) vs EMO (red, bottom-center).** Neither SAM 3 nor Grounding DINO text prompts can be expected to separate these two. Roboflow itself says foundation models cannot distinguish "specific variants", and our earlier Grounding DINO test failed the same way.
  - GPT-6 Astra's claimed "relationship between objects" reasoning, with descriptions like "the pink button at the top-right of the panel", is the only zero-shot option that could in principle use position. This is untested. It is billed per OpenAI token, and the Gemini blog says Gemini is available only on paid plans.
  - A Workflow-based Auto Label (detector → crop → classifier, or custom position logic) is the documented way to encode such rules. However, a color or position rule is essentially the rejected color-rule approach again (122 errors).
- **Best Roboflow-side route for us:** keep pre-labeling with **our own YOLOv8n**, which reached about 92% box coverage. There are three ways to do it:
  - (a) Run it **locally for 0 credits** and push the boxes in as predictions (`is_prediction=True`, see Q3).
  - (b) Upload the weights to Roboflow and use them in Label Assist (0.01 credit/image, interactive) or Auto Label `custom_roboflow` (about 0.001 credit/image, batch).
  - (c) Use Box Prompting in the UI for hard frames.
  - Route (b) has two caveats. The weights must match the pinned Ultralytics version. And Auto Label accepts "only models from the same dataset as your Annotation Batch". The docs do not say whether weights uploaded to a version count.
- **Budget example (inferred):** Auto Label with our own model on 2,000 frames costs about 2 credits. Label Assist on the same 2,000 frames costs about 20 credits, which is more than the 15-credit free month. Storage and upload credits come on top.
- **Box Prompting.** Our frames are 768×1024, just above the 1000 px optimum. Buttons are about 19–94 px wide in 640-wide frames, roughly 3–15% of width. So the 2000px/5% warning does not apply, but downscaling may still hurt the smallest buttons.
- **Test set.** Never run Label Assist, Auto Label or `is_prediction` uploads on test-split images, because that would make the evaluation circular. Auto Label runs on an upload batch, so keeping test images in a separate batch that never gets an auto-label job is a practical guard.
- **Public plan.** On the free Public plan, every uploaded frame, including the human-labeled test set, is publicly visible on Universe. The report writer should check that this is acceptable given the GitHub anonymity rule.

### Gaps
- I could not retrieve the actual per-model credits-per-image values for GPT-6 Astra, SAM 3 and Gemini. The endpoint that returns them needs an API key, and the docs table did not render.
- The search snippet claiming "Grounding DINO consumes one credit per image" was not confirmed on any fetched page. Treat it as unverified or outdated.
- It is not documented whether uploaded (non-Roboflow-trained) YOLOv8 weights are accepted as `custom_roboflow` in Auto Label. They are documented for Label Assist.
- The user remembers a "3-project limit". The current pricing page shows 10 projects for Public. The older limit may belong to a legacy plan, and I could not verify it.
- I could not tell which Auto Label models the free tier marks as `available`.

---

## Q3. Roboflow Python SDK and CLI: uploading with existing YOLO/COCO labels, batch jobs, labels-only download, job assignment, and writing predictions back

### Takeaway
Yes, all of this is scriptable. The `roboflow` package (v1.5.1, released 2026-09-24) can do the following:
- Upload images **together with** YOLO or COCO labels: per image with `project.upload(image_path, annotation_path, ...)`, or in bulk with `workspace.upload_dataset(...)` or `roboflow upload` using YOLO `.txt` plus `data.yaml`.
- Attach labels to images already uploaded, with `project.save_annotation(image_id, annotation_path, annotation_labelmap=..., annotation_overwrite=True)`.
- Mark labels as **predictions awaiting review** with `is_prediction=True`.
- Create and assign annotation jobs, and start or track **Auto Label jobs**. The CLI emits `--json` output built "for agents".

Cloud Batch Processing (running Workflows over many images) is driven by `inference-cli` (`inference rf-cloud ...`). It returns JSON results rather than writing annotations. Writing predictions back as labels is done by Auto Label with a Workflow, or by the Workflow "Roboflow Dataset Upload" block with `persist_predictions`.

### Cited Findings
- `Project.upload(image_path=..., annotation_path=..., split=..., batch_name=..., tag_names=..., is_prediction=False, num_retry_uploads=...)`. `single_upload()` is the lower-level variant that "returns the raw API responses". — [Manage Images docs](https://docs.roboflow.com/datasets/manage/manage-images)
- `project.save_annotation(image_id=..., annotation_path=..., is_prediction=False, annotation_overwrite=True)`. "Pass `annotation_labelmap="./labelmap.yaml"` to map class indices into class names." It is intended for "adding labels created elsewhere, or for promoting a model prediction to ground truth". — [Manage Images docs](https://docs.roboflow.com/datasets/manage/manage-images)
- REST: `POST https://api.roboflow.com/dataset/{project}/annotate/{image_id}` accepts a Darknet/YOLO TXT with a JSON `labelmap` (for example `{"0":"flower","1":"leaf"}`). `prediction=true` saves the label as a model prediction, which moves the image to a Review job. `predictionRouting=unassigned` skips that move. — [Manage Images docs](https://docs.roboflow.com/datasets/manage/manage-images)
  - Conflicting source: the Upload page says "You can only upload annotations with their associated images. You cannot upload annotations for images that have already been imported into your dataset." — [Upload Images, Videos, and Annotations docs](https://docs.roboflow.com/datasets/create-and-upload/adding-data). This contradicts the `save_annotation` and REST `annotate/{image_id}` documentation. It probably refers to the web drag-and-drop uploader only.
- Bulk upload:
  - `workspace.upload_dataset("./dataset/", "my-detector", num_workers=10, project_license="MIT", project_type="object-detection", batch_name=None, num_retries=0, is_prediction=False)`.
  - "For YOLO, drop matching `.txt` files plus a `data.yaml`". Split is set by the folder names `train`, `valid` or `test`.
  - REST and CLI zip upload: up to 2 GB and 10,000 files per zip via the REST endpoint, and up to 8 GB and 100,000 files via the SDK.
  - `annotationOverwrite` defaults to false: "an image already in the project keeps the annotations it has, and the zip's annotation for it is skipped".
  - "Zip uploads do not support `--is-prediction`".
  - Source for all of the above: [Upload a Dataset docs](https://docs.roboflow.com/datasets/create-and-upload/upload-a-dataset); [Adding Data docs](https://docs.roboflow.com/datasets/create-and-upload/adding-data)
- CLI:
  - `roboflow image upload photo.jpg -p PROJECT -a annotation.txt -m labelmap --is-prediction -b batch -s split`.
  - The command groups are `auth, workspace, project, version, image, model, train, infer, search, deployment, workflow, folder, annotation, autolabel, universe, video, batch (coming soon)`.
  - "supports structured JSON output for use with AI coding agents"; "Exit codes are consistent: 0 = success, 1 = error, 2 = auth error, 3 = not found."
  - Source: [CLI docs](https://docs.roboflow.com/reference/platform/cli); [Manage Images docs](https://docs.roboflow.com/datasets/manage/manage-images)
- Job assignment:
  - SDK: `project.get_batches()`, `project.get_annotation_jobs()`, `project.create_annotation_job(name, batch_id, num_images, labeler_email, reviewer_email)`.
  - CLI: `roboflow annotation batch list|get`, plus job commands.
  - Source: [Manage Annotation Workflow docs](https://docs.roboflow.com/datasets/annotate/annotate/manage-annotation-workflow)
- Auto Label from a script:
  - SDK: `workspace.autolabel_models()`, `project.autolabel(batch_id, model=..., ontology=..., preserve_existing_annotations=True)`, `project.autolabel_preview(model, image, ontology=...)` (free), `project.autolabel_job(job_id)`.
  - CLI: `roboflow autolabel models|preview|start|job`, with `--model-type roboflow`, `--confidence-thresholds`, `--preserve-existing`, `--json`.
  - REST: `POST /{ws}/{project}/autolabel` with `batchId`, `modelType`, `ontology`, `confidenceThresholds`, `runNMS`, `modelOptions`, `preserveExistingAnnotations`.
  - The REST endpoints "require scoped API keys with the `annotationJob.create` and `annotationJob.read` scopes", or an OAuth token.
  - Source for all of the above: [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)
- Batch Processing:
  - It runs Workflows over large image sets on cloud machines, and "You will then receive a JSON file with the output".
  - CLI: `inference rf-cloud data-staging create-batch-of-images ...` and `inference rf-cloud batch-processing process-images-with-workflow ...`.
  - Cost: 1 credit = 1 hour of CPU or 15 minutes of GPU.
  - Source: [Batch Processing docs](https://docs.roboflow.com/deployment/roboflow-cloud/batch-processing); [credits page](https://roboflow.com/credits)
  - Conflicting source: the Batch Processing docs say it "is available on Growth and Enterprise plans". The live pricing page shows a check mark for Batch Processing on the Public, Core and Enterprise columns. — [roboflow.com/pricing](https://roboflow.com/pricing)
- Writing predictions back:
  - The Workflow block `roboflow_core/roboflow_dataset_upload@v2` "Optionally persists model predictions as annotations if `persist_predictions` is enabled, allowing predictions to serve as pre-labels for review".
  - It also *re-compresses* images: "`compression_level` … JPEG compression quality … Default is 95", which was **75 in v1**. `max_image_size` defaults to (1920, 1080), which was (512, 512) in v1.
  - Source: [Roboflow Dataset Upload block docs](https://docs.roboflow.com/workflows/blocks/blocks/data-storage/roboflow-dataset-upload)
- The Asset Library can run a Workflow over selected images as a Batch Processing job. It writes back **tags and attributes**, not boxes, through the "Roboflow Asset Library Attributes" block. — [Asset Library docs](https://docs.roboflow.com/platform/workspaces/asset-library)

### Inferences
- **Cleanest agent-driven pre-label path, requiring no Roboflow AI features and no labeling credits:**
  1. Run our YOLOv8n locally.
  2. Write YOLO `.txt` files plus a labelmap.
  3. Upload with `project.upload(..., is_prediction=True, batch_name="prelabel-rN")`, or use `save_annotation(..., annotation_labelmap=..., annotation_overwrite=...)` for images already present.
  4. Create an annotation job for the human reviewer.
  5. Export after acceptance.
  - Each step has SDK, CLI and MCP equivalents.
- Class mapping matters. The labelmap order must match our 8-class index order. `annotation_overwrite` or `preserveExistingAnnotations` defaults must be set deliberately, because Auto Label *replaces* by default while zip uploads *skip* by default.
- Do not use the Dataset Upload Workflow block for our frames. It re-encodes to JPEG (quality 95 by default in v2, 75 in v1) and resizes. That compounds the heavy compression our frames already have (quality about 53).

### Gaps
- I did not verify whether the default (non-scoped) workspace API key used by the SDK/CLI already carries the `annotationJob.create` scope on the free plan. The pricing page lists "Scoped API Keys" as an Enterprise add-on.
- `roboflow batch` in the main CLI is marked "(coming soon)". Batch Processing is only available through `inference-cli` for now.

---

## Q4. Autodistill: how it works, supported base models, local GPU use, CLI, output format and weaknesses

### Takeaway
Autodistill is Roboflow's open-source (Apache 2.0) framework with this pipeline: **base model + ontology → auto-labeled dataset → target model**. It runs locally, and there is a one-line CLI. Its plugins cover GroundedSAM, Grounded SAM 2 (Florence-2 + SAM 2), GroundingDINO, OWL-ViT, OWLv2, YOLO-World, Florence-2, DETIC, CoDet, LLaVA, Kosmos-2, Gemini, Roboflow Universe models and cloud APIs. It is **effectively dormant**: the last PyPI release was 0.1.29 on 2024-11-26, the last push to the main repo was 2025-05-14, and the plugins were last touched in 2024. For fine-grained classes it has the same zero-shot weakness as Roboflow's Auto Label.

### Cited Findings
- "To use autodistill, you input unlabeled data into a Base Model which uses an Ontology to label a Dataset that is used to train a Target Model which outputs a Distilled Model". The ontology is `CaptionOntology({"prompt": "class"})`. — [autodistill README](https://github.com/autodistill/autodistill)
- CLI: `autodistill images --base="grounding_dino" --target="yolov8" --ontology '{"prompt": "label"}' --output="./dataset"`. This labels every image in `images/` and trains YOLOv8, and "The resulting dataset will be saved in a folder called dataset". Python usage: `GroundedSAM(ontology=...).label(...)`, then `YOLOv8("yolov8n.pt").train(...)`. — [autodistill README](https://github.com/autodistill/autodistill)
- Object-detection base models in the README table: Grounded SAM 2, DETIC, GroundedSAM, GroundingDINO, OWL-ViT, SAM-CLIP, LLaVA-1.5, Kosmos-2, OWLv2, Roboflow Universe Models, CoDet, Azure Custom Vision, AWS Rekognition, Google Vision. Target models include YOLOv8, YOLO-NAS, YOLOv5 and DETR. — [autodistill README](https://github.com/autodistill/autodistill)
- Plugin repos and their last push dates:
  - `autodistill-florence-2` ("Use Florence 2 to auto-label data"), 2024-08-15.
  - `autodistill-yolo-world`, 2024-02-16.
  - `autodistill-owlv2`, 2024-02-20.
  - `autodistill-grounded-sam-2` ("Segment Anything 2, grounded with Florence-2"), 2024-08-07.
  - `autodistill-roboflow-universe`, 2024-02-08.
  - Source: [autodistill-florence-2](https://github.com/autodistill/autodistill-florence-2); [autodistill-yolo-world](https://github.com/autodistill/autodistill-yolo-world); [autodistill-owlv2](https://github.com/autodistill/autodistill-owlv2); [autodistill-grounded-sam-2](https://github.com/autodistill/autodistill-grounded-sam-2); [autodistill-roboflow-universe](https://github.com/autodistill/autodistill-roboflow-universe)
- Maintenance status: PyPI `autodistill` latest is 0.1.29 (2024-11-26). The GitHub repo was last pushed 2025-05-14; it is not archived and has 53 open issues. — [PyPI autodistill](https://pypi.org/project/autodistill/); [GitHub autodistill](https://github.com/autodistill/autodistill)
- The README states the limitation itself: "Foundation models know a lot about a lot, but for production we need models that know a lot about a little". It says base models are "not perfect yet", and that target models "don't generalize well beyond the information described in their Dataset". — [autodistill README](https://github.com/autodistill/autodistill)
- The Roboflow Auto Label docs point to Autodistill for those who "would rather auto-label on your own hardware". — [Auto Label docs](https://docs.roboflow.com/datasets/annotate/annotate/ai-labeling/auto-label)

### Inferences
- Output is a YOLO-style dataset folder, since the target is YOLOv8 and the dataset is written to `./dataset`. The exact file layout was not re-verified in this session. That output fits our training pipeline.
- Its base models are the same open-vocabulary detectors (GroundingDINO, OWL-ViT/v2, YOLO-World, Florence-2) that failed on B3↔EMO. Autodistill adds no disambiguation power beyond what those models already have.
- Because it is dormant (pinned 2024 dependencies), expect installation friction with current torch and Ultralytics versions. I did not test this.
- A GPU is needed for practical speed, which rules out the Pi 5. Running on the desktop would be the practical option.

### Gaps
- I did not fetch the docs.autodistill.com pages for a documented GPU or CPU requirement, or for exact output directory specifics.
- I found no published evaluation of autodistill on fine-grained, same-shape, color-differentiated classes.

---

## Q5. Roboflow Inference (`inference` package) run locally: can it serve zero-shot models (Grounding DINO, OWLv2, YOLO-World, SAM 3, Florence-2) for free?

### Takeaway
Yes. Roboflow Inference is Apache-2.0 (core), latest v1.7.2 released 2026-09-25. It ships local implementations of Grounding DINO, OWLv2, YOLO-World, SAM/SAM 2/SAM 3, Florence-2, PaliGemma, Qwen-VL, Moondream2 and others. **Self-hosted inference uses no credits.** Two models are **not available on Roboflow's Serverless Cloud API**: Grounding DINO and OWLv2 have to be run self-hosted or on a Dedicated Deployment. OWLv2 in Inference and SAM 3 accept **visual exemplar boxes**, and SAM 3 also accepts **negative exemplars**. These are the only zero-shot few-shot mechanisms in the ecosystem that an agent can drive from a script.

### Cited Findings
- "Roboflow Inference is an open-source (Apache 2.0) computer vision inference server for deploying … foundation models (CLIP, SAM 2, Florence-2, PaliGemma, Grounding DINO, YOLO-World, and more) … runs on CPU, GPU, NVIDIA Jetson, Raspberry Pi, Docker". — [inference.roboflow.com/llms.txt](https://inference.roboflow.com/llms.txt)
- The repo contains model packages for `grounding_dino`, `owlv2`, `yolo_world`, `sam`, `sam2`, `sam3`, `florence2`, `paligemma`, `moondream2`, `qwen25vl`, `qwen3vl`, `smolvlm`, `perception_encoder`, `rfdetr`, `yolov8` and others. — [GitHub roboflow/inference, inference/models](https://github.com/roboflow/inference/tree/main/inference/models)
- "Inference you run on your own hardware does not use credits." "Without an API Key, you can access a wide range of pre-trained and foundational models and run public Workflows." A key is needed for private models and Workflows. — [roboflow/inference README](https://github.com/roboflow/inference); also "Self-hosted inference does not use credits" — [Credits docs](https://docs.roboflow.com/platform/billing-and-plans/credits)
  - Caveat: the Grounding DINO self-hosted example still passes an API key: `model = GroundingDINO(api_key="YOUR_API_KEY")` after `pip install "inference[grounding-dino]"`. — [Grounding DINO model page](https://docs.roboflow.com/models/supported-models/grounding-dino)
- "Grounding DINO is not available on the Serverless Cloud API. Run it on a Dedicated Deployment or self-hosted Inference." — [Grounding DINO model page](https://docs.roboflow.com/models/supported-models/grounding-dino)
- OWLv2: "You provide one or more example bounding boxes on a reference image, and OWLv2 detects similar objects in target images without any training … The implementation in Inference detects objects from *visual* examples". It is not on the Serverless API. — [OWLv2 model page](https://docs.roboflow.com/models/supported-models/owlv2)
- SAM 3:
  - `/sam3/concept_segment` accepts text, "exemplar box" prompts, or both. "`box_labels` … `1` marks a positive exemplar …, `0` marks a negative exemplar (exclude objects like this)", and "excluding lookalikes with negative exemplars" is given as a use.
  - Self-hosted: `docker run ... --gpus=all roboflow/inference-server:latest` or `pip install "inference-gpu[sam3]"`.
  - Fine-tuning SAM 3 on Roboflow requires paid usage-based plans.
  - Source: [SAM3 model page](https://docs.roboflow.com/models/supported-models/sam3)
- YOLO-World and Florence-2 are available on the Serverless API and self-hosted. — [YOLO-World page](https://docs.roboflow.com/models/supported-models/yolo-world); [Florence-2 page](https://docs.roboflow.com/models/supported-models/florence-2)
- Serverless (hosted) prices per 1,000 images:
  - YOLO-World 0.1875 credits.
  - Grounding DINO 0.75 and OWLv2 0.75. These are listed in the price table even though the model pages say they are not on Serverless, which is an internal inconsistency.
  - SAM 3: 0.5. SAM 2: 0.3125. Roboflow Instant: 0.75. YOLOv8/v11/RF-DETR: 0.125.
  - Source: [Model pricing docs](https://docs.roboflow.com/deployment/roboflow-cloud/serverless-api/model-pricing)
- The Inference server can also be self-hosted on a Raspberry Pi. — [Inference Server docs](https://docs.roboflow.com/deployment/self-hosted/inference-server)
- The self-hosted commercial model license is an "Enterprise add-on". — [roboflow/inference README](https://github.com/roboflow/inference)

### Inferences
- **Most promising free, scriptable zero-shot experiment for B3 vs EMO:** SAM 3 run locally on a GPU, prompted with a positive exemplar box on a B3 and a **negative exemplar on EMO**, and the reverse for EMO. A second option is OWLv2 with visual examples of each button. Both are agent-drivable: HTTP to `localhost:9001` or in-process Python, with 0 credits. Neither is validated on our heavily compressed frames or on buttons 19–94 px wide.
- Of these tools, only Box Prompting (web UI) and these local visual-exemplar models take few-shot visual prompts. The text-only routes (Grounding DINO, YOLO-World, SAM 3 text) are unlikely to separate pink from red.
- Heavy models (SAM 3, Florence-2, Grounding DINO) are impractical on the Pi 5. The desktop with a CUDA GPU would host them. The desktop's GPU availability is not researched here.
- Licensing is fine for research or internal labeling use. The commercial self-host license only matters for deployment.

### Gaps
- I found no benchmark of OWLv2 or SAM 3 exemplar prompting on small, same-shape, color-differentiated objects.
- It is unclear whether Grounding DINO self-hosted truly needs an API key: the example uses one, while the README says foundation models work without one.

---

## Q6. JPEG re-encoding (we measured quality ≈75): can originals be exported, and can only the annotations be downloaded?

### Takeaway
Yes, originals can be exported officially. `workspace.search_export(query="*", format="yolov8", dataset=..., location=...)` (requires roboflow ≥ 1.2.14), or the CLI `roboflow search-export "*" -f coco -d <project> -l ./original-images`, "builds the ZIP from your source files, so the images keep their original bytes and their original file extension". Normal version exports are compressed on purpose. There is **one important catch**: **SDK versions before 1.3.6 (released 2026-04-27) re-encoded images via Pillow on upload**. So for images uploaded with an older SDK, the stored "original" may itself already be a re-encoded copy. I found **no documented "labels-only" export option**. Annotations can be fetched per image through the REST image-details endpoint, or you can export and discard the images.

### Cited Findings
- "Are the downloaded images the original quality? No. To prevent training slowdowns, we compress images at a level that maintains a balance between training speed and resolution". For originals: "clicking on a image … selecting 'Download Image'", or use the CLI or Image Search API for many images. — [Download a Dataset docs](https://docs.roboflow.com/datasets/create-and-upload/download-a-dataset)
- "To download the original, full-resolution images for an entire dataset, use `search_export`. It builds the ZIP from your source files, so the images keep their original bytes and their original file extension. This method requires `roboflow` version 1.2.14 or later." Supported formats include coco, yolov8, voc and folder. Filters such as `tag:`, `split:`, `class:` and `filename:` are allowed, but not semantic search. CLI: `roboflow search-export "*" -f coco -d my-dataset-id -l ./original-images`. — [Export a Dataset Version docs](https://docs.roboflow.com/datasets/versions/dataset-versions/exporting-data)
- "As of `roboflow` 1.3.6, the SDK uploads the original image bytes rather than re-encoding via Pillow. This restores parity with the web uploader". — [Manage Images docs](https://docs.roboflow.com/datasets/manage/manage-images); same note in [Upload a Dataset docs](https://docs.roboflow.com/datasets/create-and-upload/upload-a-dataset)
- PyPI release dates: roboflow 1.2.14 on 2026-02-18, 1.3.6 on 2026-04-27, latest 1.5.1 on 2026-09-24. — [PyPI roboflow](https://pypi.org/project/roboflow/)
- `GET https://api.roboflow.com/:workspace/:project/images/:image_id` returns `annotation.boxes[]` (label, x, y, width, height), `split`, `tags`, and `urls.original`. — [Manage Images docs](https://docs.roboflow.com/datasets/manage/manage-images)
- The Workflow Dataset Upload block recompresses to JPEG at `compression_level` 95 in v2 and 75 in v1. — [Roboflow Dataset Upload block docs](https://docs.roboflow.com/workflows/blocks/blocks/data-storage/roboflow-dataset-upload)
- Class names are sanitized on upload and export: `/.[]#~*` become `-`, and `|'"` are removed. — [Adding Data docs](https://docs.roboflow.com/datasets/create-and-upload/adding-data)

### Inferences
- Our measured quality of about 75 is consistent with **Pillow's default JPEG save quality of 75**. That default is general Pillow knowledge and was not fetched in this session. Two explanations fit:
  - (a) The frames were uploaded with a pre-1.3.6 SDK that re-encoded them via Pillow.
  - (b) The frames came from a normal version export, which Roboflow compresses without documenting the level.
  - Which one applies can be checked by running `search_export` on one project and comparing SHA-256 or estimated quality against our local originals. If they match the originals byte for byte, the loss happened only in version export.
- Recommended practice: keep local originals as the single source of truth. Upload with SDK 1.3.6 or later, or through the web UI. Use Roboflow only for boxes. Retrieve labels via `search_export` in YOLO format, or through the image-details API, and join them back to the local originals by filename.
- Watch for class-name sanitization when mapping labels back. Our class names (B1–B4, EMO, screwdriver, wrench, pliers) contain no affected characters, so they are safe.

### Gaps
- I found no documented export option that skips images and returns annotations only.
- Roboflow does not document the compression level it uses for version exports.
- It is undocumented whether images uploaded with a pre-1.3.6 SDK can be recovered in their true original form. Most likely they cannot, because only the re-encoded bytes were ever sent.

---

### Summary matrix for the report writer (inferred from the findings above)

| Route | Box source | Handles B3 vs EMO? | Cost | Agent-drivable from terminal? |
|---|---|---|---|---|
| Own YOLOv8n run locally → SDK/CLI upload with `is_prediction=True` | our model | best available (about 92% coverage on mock console) | 0 labeling credits (upload/storage credits only) | Yes (SDK, CLI, or MCP `image_upload` + `annotations_save`) |
| Auto Label `custom_roboflow` | our model (must be in Roboflow; same dataset) | same as our model | about 1 credit per 1,000 images | Yes (REST/SDK/CLI/MCP `autolabel_start`); a workspace API key is needed if OAuth is folder-scoped |
| Label Assist | trained or Universe model | same as the model | about 1 credit per 100 images | No: interactive web UI only |
| Auto Label with SAM 3, Gemini or GPT-6 Astra | zero-shot text | unlikely (documented "cannot distinguish specific variants"); GPT-6 Astra position reasoning untested | 1 credit per 1,000 images, plus OpenAI or Gemini usage; Gemini paid-only per blog | Yes (preview is free) |
| Auto Label with a Workflow | any blocks (SAHI, crop+classify, LLM) | only if the logic encodes it (risk of the rejected color-rule approach) | credits plus any third-party model charges | Yes (build via MCP `workflows_create`; start in UI or API) |
| Box Prompting | few-shot visual, with negatives | possibly, with negatives; downscaling hurts small objects | about 1 credit per 100 images (interactive rate, inferred) | No: web UI only |
| Local Inference: SAM 3 or OWLv2 exemplars | few-shot visual (SAM 3 positive and negative) | untested; the most plausible zero-shot bet | free (own GPU) | Yes |
| Autodistill | zero-shot base models | no (same base models) | free (own GPU) | Yes (CLI); dormant since 2024–25 |
