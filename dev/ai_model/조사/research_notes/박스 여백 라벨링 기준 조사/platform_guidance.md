# What labeling-tool, ML-platform and model-framework docs say about bounding-box tightness (tight vs margin), edge cases, and annotator consistency

Accessed 2026-09-28. Most quotes were taken from raw page text fetched with curl and grepped. Source-type tags:
- **[OFFICIAL DOCS]**: product documentation, model cards, or official course pages from the platform/framework owner
- **[VENDOR BLOG]**: the tool/platform company's own blog or guide (content marketing, but written by the tool owner)
- **[SERVICE-VENDOR MKTG]**: annotation-service companies' marketing/glossary pages (Taskmonk, BasicAI, Claru, Label Your Data, Sama, CNTXT, DataVLab). They give no evidence for their claims.
- **[ACADEMIC]**: peer-reviewed paper
- **[COMMUNITY]**: GitHub discussion by non-maintainers

Dates are given where the page shows one. Pages dated before 2024 are flagged. They are still live, but they fall outside the requested 2024–2026 window.

---

## Q1. Ultralytics (YOLO): Data Collection & Annotation guide, Tips for best training results, dataset format, Academy

### Takeaway
Ultralytics' official line is **zero margin**: "No space should exist between an object and its bounding box." The newer Ultralytics Academy lesson also calls for **visible-only (modal) boxes on occlusion** ("Only annotate what you can see"), labels a margin error outright, and says the occlusion rule is yours to choose as long as it is consistent (e.g. "label if ≥ 50% visible"). The main Data Collection guide covers consistency and inter-annotator agreement but says nothing about box tightness.

### Cited Findings
- [OFFICIAL DOCS] YOLOv5 "Tips for Best Training Results", Dataset section: "**Label accuracy.** Labels must closely enclose each object. No space should exist between an object and its bounding box. No objects should be missing a label." — [Ultralytics Docs: Tips for Best Training Results](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
- [OFFICIAL DOCS] Same page: "**Label consistency.** All instances of all classes in all images must be labeled. Partial labeling will not work." / "**Label verification.** View train_batch*.jpg on train start to verify your labels appear correct" / "**Background images.** … We recommend about 0-10% background images to help reduce FPs" — [same](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
- [OFFICIAL DOCS] Same page, small objects: "If there are many small objects then custom datasets will benefit from training at native or higher resolution." — [same](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
- [OFFICIAL DOCS] Data Collection & Annotation guide, "Setting Annotation Guidelines": "**Consistency:** Keep your annotations uniform. Set standard criteria for annotating different types of data, so all annotations follow the same rules." and "**Clarity and Detail:** Make sure your instructions are clear. Use examples and illustrations to show what's expected." — [Ultralytics Docs: Data Collection and Annotation](https://docs.ultralytics.com/guides/data-collection-and-annotation/)
- [OFFICIAL DOCS] Same guide: "Accuracy refers to how close the annotated data is to the true values… Precision indicates the consistency of annotations. It checks if you are giving the same label to the same object or feature throughout the dataset." Also: "Good inter-annotator agreement means that the guidelines are clear and everyone is following them the same way." Also: "For instance, when labeling birds, specify whether to include the entire bird or just specific parts." — [same](https://docs.ultralytics.com/guides/data-collection-and-annotation/)
- [OFFICIAL DOCS] The same guide suggests outlier detection on "bounding box coordinates, or object sizes" with "box plots, histograms, or z-scores". This is a way to catch inconsistent box sizing. — [same](https://docs.ultralytics.com/guides/data-collection-and-annotation/)
- [OFFICIAL DOCS] Dataset format page: boxes are "class x_center y_center width height", normalized 0–1. It says nothing on tightness. — [Ultralytics Docs: Object Detection Datasets](https://docs.ultralytics.com/datasets/detect/)
- [OFFICIAL COURSE] Ultralytics Academy, "Annotation Best Practices" (Lesson 4/10, no date shown): "Tight boxes / masks / keypoints — no slack between object and label." and "**Tight boxes / masks.** No slack — labels must closely enclose each object, with no space between an object and its bounding box." — [Ultralytics Academy: Annotation Best Practices](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
- [OFFICIAL COURSE] Same lesson, on consistency over volume: "A model trained on consistent, tight labels and 1500 images per class will outperform a model trained on sloppy labels and 5000." The lesson gives no evidence for this. — [same](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
- [OFFICIAL COURSE] Same lesson, occlusion rule: "**Handle occluded / partial objects consistently.** Pick one rule (e.g. "label if ≥ 50% visible") and stick to it." — [same](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
- [OFFICIAL COURSE] Same lesson, "Common annotation mistakes" (the lesson says these are "adapted from a deck by Alexis Schutzger"):
  - "1. **Extrapolating the object's shape.** Only annotate what you can see. When a forklift is half-hidden behind a rack, box the visible part — not where you imagine the rest continues."
  - "2. **Imprecise bounding boxes.** Boxes must hug the object. A box that leaves a margin of floor, or clips a person's feet, teaches the model the wrong extent."
  - "3. **Inconsistencies on similar objects.** Box similar objects the same way every time. If one forklift includes its forks and the next excludes them, the model gets mixed signals."
  - "7. **Duplicated box.** One object, one box."
  - Among the errors to catch by eye: "Boxes drawn around shadows, not objects."
  — [same](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
- [OFFICIAL COURSE] Same lesson, calibration: "Hand the same 50 images to every annotator. Compare results pairwise… Repeat until inter-rater agreement is high (~95% identical labels)." and "Without calibration, annotators silently develop different conventions and your dataset becomes the union of 20 inconsistent micro-datasets." Done-when criteria: "Inter-rater agreement on a 50-image sample is ≥ 90%" and "You've eyeballed the first 20 labeled images and confirmed boxes are tight." — [same](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
- [OFFICIAL COURSE] Same lesson, model-assisted labeling: "Always have a human review every label. Don't auto-accept high-confidence detections silently." — [same](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
- [OFFICIAL DOCS] The Ultralytics Platform annotation editor docs give occlusion guidance only for **keypoints**: "Occluded keypoints (behind other objects) should be marked with visibility 1 — the model learns to infer their position." — [Ultralytics Docs: Annotation Editor](https://docs.ultralytics.com/platform/data/annotation)
- [COMMUNITY, pre-2024] In the YOLOv5 GitHub discussion "Bounding box tightness" (#10813, Jan–Feb 2023), a non-maintainer commenter says: "as long as you do not have systematic bias (all your box a much bigger than objects, or all your box are left offset, etc), the noise in your annotation does not matter much." No Ultralytics maintainer answer was visible. — [GitHub ultralytics/yolov5 #10813](https://github.com/ultralytics/yolov5/discussions/10813)
- [COMMUNITY] In Ultralytics issue #21447 (Jul 2025), a user proposes a rule: "Objects where you can see edges but the middle is occluded the bounding box should enclose the entire object… When the rest of the object is completely occluded or cut off by the edge of the frame, the bbox should only cover the visible section". The issue was closed as stale with no official answer visible. — [GitHub ultralytics/ultralytics #21447](https://github.com/ultralytics/ultralytics/issues/21447)

### Inferences
- Ultralytics' own guidance pushes against any deliberate margin ("no space", "no slack", "a margin of floor… teaches the model the wrong extent").
- On partial occlusion, the Academy's rule is modal ("box the visible part"). A rule that says "draw the whole circle when a finger covers part of it" is amodal and **conflicts with the Academy wording**. The Academy does allow any consistent visibility threshold.
- For an axis-aligned box, modal and amodal boxes differ only when the occluder covers one of the object's extreme points (top-most, bottom-most, left-most or right-most). A finger lying across the middle of a circle leaves the modal and amodal boxes identical. The community rule in #21447 captures exactly this distinction.

### Gaps
- No Ultralytics docs page addresses motion-blurred or soft edges for boxes, or where exactly a "blurred edge" lies.
- No official Ultralytics statement answers the #10813 question (how much tightness noise matters); the only answer is a community one.
- The Academy lesson has no publication date and cites no evidence for its "1500 tight vs 5000 sloppy" claim.

---

## Q2. Roboflow: docs and official blog

### Takeaway
Roboflow's blog says **tight but never cutting off any part**, and **label occluded objects "as if [they] were fully visible"** (amodal). This is the opposite of the Ultralytics Academy and AWS template occlusion rule. Roboflow's 2026 robotics post softens this: both approaches are valid, "estimate the full object" suits minor occlusion (<30%) of predictable shapes, and consistency across 100% of the dataset is required. The robotics post also has the only explicit motion-blur decision framework found. Roboflow's product docs themselves contain no tightness rules.

### Cited Findings
- [VENDOR BLOG] "How to Label Image Data for Computer Vision Models", Joseph Nelson, published Jan 5, 2026:
  - "Bounding boxes should be tight around the objects of interest. However, they should never be so tight that they cut off any part of the object."
  - "Tight bounding boxes are critical for helping the model learn precisely which pixels correspond to the object of interest versus irrelevant parts of the image."
  — [Roboflow Blog: tips-for-how-to-label-images](https://blog.roboflow.com/tips-for-how-to-label-images/)
- [VENDOR BLOG] Same post:
  - "Our bounding boxes should enclose the entirety of the object of interest. Labeling only a portion of the object can confuse the model about what constitutes a complete object."
  - "It is best practice to label objects even when they are occluded. Moreover, it is commonly best practice to label the occluded object as if it were fully visible - rather than drawing a bounding box for only the partially visible portion of the object."
  - "Both objects should be labeled, even if the bounding boxes overlap. (It is a common misconception that boxes cannot overlap.)"
  — [same](https://blog.roboflow.com/tips-for-how-to-label-images/)
- [VENDOR BLOG] Same post, on instructions: "Your labeling instructions should incorporate the key best practices mentioned earlier, such as labeling the entire object, keeping bounding boxes tight, annotating all objects of interest, and erring on the side of greater specificity." It also says "labeling instructions depend heavily on the specific task." — [same](https://blog.roboflow.com/tips-for-how-to-label-images/)
- [VENDOR BLOG] "Data Annotation Explained" (published May 22, 2025) repeats the same rules: "label the occluded object as if it were fully visible" and "Bounding boxes should be tight around the objects of interest… But also be sure not to cut off any part of the object." — [Roboflow Blog: data-annotation](https://blog.roboflow.com/data-annotation/)
- [VENDOR BLOG] "Image Annotation Best Practices for Robotics" (published Feb 13, 2026):
  - "**The Rule:** Ensure your bounding boxes touch the outermost pixels of the object with zero wasted space. The edges of the box should align exactly with the visible boundaries of the object."
  - "a loose bounding box creates "background noise" inside the labelled region. This confuses the model about where the object truly ends, and the environment begins."
  - Recommended method: "Use Roboflow Annotate's zoom functionality to verify edges at the pixel level… When in doubt, zoom in at 200-400% to check alignment".
  — [Roboflow Blog: image-annotation-for-robotics](https://blog.roboflow.com/image-annotation-for-robotics/)
- [VENDOR BLOG] Same robotics post, occlusion:
  - "**Approach A: Label Only Visible Portions** - Draw bounding boxes or polygons around only the parts of the object you can see."
  - "**Approach B: Estimate the Full Object** - Draw the bounding box where you believe the full object would be if it weren't occluded. This works well when the occlusion is minor (<30%), and the object's shape is predictable."
  - Which to use: "Use Approach A (visible only) for bin picking and cluttered scenes where multiple objects overlap unpredictably"; "Use Approach B (full estimation) for navigation and tracking, where you want the model to maintain object identity even when partially hidden".
  - "**Critical requirement:** Whatever approach you choose, apply it consistently across 100% of your dataset. Mixed strategies confuse the model and degrade performance."
  — [same](https://blog.roboflow.com/image-annotation-for-robotics/)
- [VENDOR BLOG] Same robotics post, "Managing Motion Blur", decision framework:
  - "**Mild blur (edges still distinguishable):** Include and label normally. The model should learn to handle real-world blur."
  - "**Moderate blur (edges unclear but object identifiable):** Include only if this blur level is common in your deployment environment. Label with lower confidence."
  - "**Severe blur (cannot identify object edges as a human):** Exclude from the dataset."
  - The post also recommends 5–15% negative (empty) images.
  — [same](https://blog.roboflow.com/image-annotation-for-robotics/)
- [OFFICIAL DOCS] The Roboflow Annotate docs describe tools only, with no tightness guidance. One occlusion-related note covers segmentation: "Merge Masks… useful for joining multiple disjoint mask regions that represent the same underlying object - for example, two halves of an object split by an occluder." — [Roboflow Docs: Annotate an Image](https://docs.roboflow.com/annotate/use-roboflow-annotate)

### Inferences
- Roboflow's amodal default fits the project's "whole button circle under a finger" rule. The 2026 robotics post's condition ("minor (<30%)" occlusion and a "predictable" shape) describes a circular button partly covered by a fingertip well.
- Roboflow never recommends padding. Its only boundary caveat is "never so tight that they cut off any part of the object". That caveat is an argument for erring slightly outward when the edge is uncertain (e.g. blur), not for a fixed margin.
- "Label with lower confidence" for moderate blur has no direct equivalent in YOLO txt labels. In practice the choices are to label, to skip, or to exclude the image.

### Gaps
- No Roboflow doc gives a numeric tolerance (pixels or IoU) for tightness.
- No Roboflow source explains how to place a box edge on a soft or glowing boundary.
- The "<30%" threshold in the robotics post is stated without evidence.

---

## Q3. AWS: SageMaker Ground Truth bounding-box task, instruction pages, consolidation; Amazon Rekognition Custom Labels

### Takeaway
AWS's default Ground Truth worker-instruction template is the most explicit official text found. It says: tight, **visible-only** (do not interpolate occluded parts), **avoid shadows**, and **clip at the image edge** for truncation. Rekognition says "as close as possible". Ground Truth resolves annotator disagreement by IoU-matching and averaging boxes from (by default) 5 workers.

### Cited Findings
- [OFFICIAL DOCS] Ground Truth bounding-box worker template, `<full-instructions>` (default text shipped by AWS):
  - "Boxes should fit tight around each object"
  - "Do not include parts of the object are overlapping or that cannot be seen, even though you think you can interpolate the whole shape." (the grammar is AWS's)
  - "Avoid including shadows."
  - "If the target is off screen, draw the box up to the edge of the image."
  — [AWS Docs: Classify image objects using a bounding box](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-bounding-box.html)
- [OFFICIAL DOCS] The same page notes: "Amazon SageMaker Ground Truth is no longer open to new customers… we do not plan to introduce new features." — [same](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-bounding-box.html)
- [OFFICIAL DOCS] Instruction design page: "We recommend that you provide detailed instructions for completing the task with multiple examples showing edge cases and other difficult situations for labeling objects." Also: "Pictures are better than words." and "Your short instructions are more important than your full instructions." The template's short-instruction slots are "Good example" and "Bad example". — [AWS Docs: Create instruction pages](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-creating-instruction-pages.html)
- [OFFICIAL DOCS] Annotation consolidation: the console default is "Bounding boxes—5 workers". "Bounding box annotation consolidates bounding boxes from multiple workers. This function finds the most similar boxes from different workers based on the Jaccard index, or intersection over union, of the boxes and averages them." — [AWS Docs: Annotation consolidation](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-annotation-consolidation.html)
- [OFFICIAL DOCS] Rekognition Custom Labels: "Press the left mouse button and draw a box around the object. Try to draw the bounding box as close as possible to the object." — [AWS Docs: Labeling objects with bounding boxes](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/md-localize-objects.html)
- [OFFICIAL DOCS] Rekognition Custom Labels limits cover image size (min 64×64 px) and box count (max 50 per image). They set no minimum box size. — [AWS Docs: Rekognition Custom Labels limits](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/limits.html)

### Inferences
- The AWS default is modal on occlusion ("even though you think you can interpolate the whole shape"). It conflicts with Roboflow's amodal default and agrees with the Ultralytics Academy. AWS offers it as editable template text ("Only modify the short-instructions, full-instructions, and header"), so it is a default, not a hard requirement.
- "Avoid including shadows" is the closest official analogue to excluding a glow or halo around a lit button. A glow is light spill outside the physical object, like a shadow.
- IoU-weighted averaging of several workers' boxes treats random edge disagreement as noise to average out. It does not treat it as something a margin should absorb.

### Gaps
- AWS publishes no good/bad example images for tightness. The template leaves "Enter description of a correct bounding box label and add images" as a placeholder.
- The "series of tips" Rekognition shows before the editor is not reproduced in the docs.

---

## Q4. Google Cloud (Vertex AI / AutoML / Data Labeling Service) and Microsoft Azure (Custom Vision / Azure ML data labeling)

### Takeaway
Neither Google nor Microsoft sets a single tightness rule. Both treat **tight vs. loose / "some clearance"** as a **project decision the instructions must state explicitly**, along with occlusion, truncation, tiny objects and blur. Google's Vertex docs add hard minimum box sizes and say to train on blurry data if deployment data is blurry.

### Cited Findings
- [OFFICIAL DOCS] Vertex AI "Prepare image training data for object detection", bounding-box requirements: "**Bounding box edge length** At least 0.01 * length of a side of an image. For example, a 1000 * 900 pixel image would require bounding boxes of at least 10 * 9 pixels. Bound box minium size: 8 pixels by 8 pixels." (typo in the original). Also: "any scaled down annotations (bounding boxes and labels) are removed if they are less than 8 pixels by 8 pixels." — [Google Cloud Docs: Vertex AI object detection prepare data](https://docs.cloud.google.com/vertex-ai/docs/image-data/object-detection/prepare-data)
- [OFFICIAL DOCS] Same page: "The training data should be as close as possible to the data on which predictions are to be made. For example, if your use case involves blurry and low-resolution images (such as from a security camera), your training data should be composed of blurry, low-resolution images." Also: "if a human can't be trained to assign labels by looking at the image for 1-2 seconds, the model likely can't be trained to do it either." — [same](https://docs.cloud.google.com/vertex-ai/docs/image-data/object-detection/prepare-data)
- [OFFICIAL DOCS, archived, last updated 2023-09-25; the service page now redirects to the Vertex AI landing page] Google AI Platform Data Labeling Service, "Creating instructions for human labelers":
  - "for a bounding box task, describe how you want labelers to draw the bounding box. Should it be a tight box or a loose box? If there are multiple instances of the object, should they draw one big bounding box or multiple smaller boxes?"
  - Edge cases to clarify: "Do you need box if a person is occluded? Do you need a box for a person who is partially shown in the image?"
  - "For each label, give at least 3 positive examples and 1 negative example."
  - "We recommend having a small dataset labeled first, then adjusting your instructions based on what you see in the results you get back."
  — [Wayback copy of cloud.google.com/ai-platform/data-labeling/docs/instructions](https://web.archive.org/web/2023/https://cloud.google.com/ai-platform/data-labeling/docs/instructions)
- [OFFICIAL DOCS] Azure Machine Learning "Set up an image labeling project" (last updated 2026-01-27), "For bounding boxes, important questions include":
  - "How do you define the bounding box for this task? Should it stay entirely on the interior of the object or should it be on the exterior? Should it be cropped as closely as possible, or is some clearance acceptable?"
  - "What level of care and consistency do you expect the labelers to apply in defining bounding boxes?"
  - "What should the labelers do if the object is tiny? Should they label it as an object or should they ignore that object as background?"
  - "How should labelers handle an object that's only partially shown in the image?" / "…partially covered by another object?"
  - General questions: "What should they do if an object of interest is clipped by the edge of the image?" and "What should they do if they discover image quality issues, including poor lighting conditions, reflections, loss of focus…"
  — [Microsoft Learn: Set up an image labeling project](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-image-labeling-projects)
- [OFFICIAL DOCS] Azure ML "Label images" (labeler UI): "To create a rough bounding box, select and diagonally drag across your target. Drag the edges or corners to adjust the bounding box". It also has a "Template-based box tool" that makes same-size boxes. — [Microsoft Learn: Labeling images and text documents](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-label-data)
- [OFFICIAL DOCS] Azure Custom Vision quickstart: "Select and drag a rectangle around the object in your image." It gives no tightness rule, but says: "It's important to tag every instance of the objects you want to detect, because the detector uses the untagged background area as a negative example in training." — [Microsoft Learn: Build an object detector (Custom Vision)](https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/get-started-build-detector)

### Inferences
- Azure's wording ("interior of the object or… exterior", "some clearance") and Google's ("tight box or a loose box") are the strongest first-party evidence that tightness is a **convention to be fixed and documented**, not a single universal standard.
- Google's "match deployment blur" advice supports keeping blurred head-camera frames in the training set, not filtering them out.
- A 19–94 px wide button in a 640-wide frame is well above Vertex's 0.01×side (6.4 px) and 8×8 px minimums.

### Gaps
- No Google or Microsoft page found gives example images of correct vs. incorrect tightness.
- The Google Data Labeling Service instructions page is only available archived; the service's current status was not investigated further.

---

## Q5. Labeling-tool vendors: Labelbox, Scale AI, SuperAnnotate, V7 (Darwin), CVAT, Label Studio, Encord

### Takeaway
Tool-vendor blogs almost all say "pixel-perfect" and "touch the outermost pixels", arguing that gaps cause IoU mismatch. **CVAT's 2026 guideline articles** stand out: they tell you to *specify* whether a gap is acceptable "and if so, how many pixels wide", and they say loose and meticulous styles are each acceptable *with* a written target, but mixing them produces inconsistent data. Labelbox and Encord pages found contain no concrete tightness rule.

### Cited Findings
- [VENDOR BLOG] Scale AI, "Data Labeling: The Authoritative Guide" (page dated September 16, 2026), bounding-box best practices:
  - "**Hug the border as tightly as possible.** Accurate labels will capture the entire object and match the edges as closely as possible to the object's edges to reduce confusion for your model."
  - "**Avoid item overlap.** Due to IoU, bounding boxes work best when there is minimal overlap between objects."
  - "**Object size:** Smaller objects are better suited for bounding boxes… However, annotating tiny objects may require more advanced techniques."
  - On consistency: "If label accuracy is inconsistent across different labelers, this may indicate that your instructions are unclear or that you need to provide more training to your labelers."
  — [Scale AI Guide](https://scale.com/guides/data-labeling-annotation-guide)
- [VENDOR BLOG, pre-2024: Jul 6, 2021] V7, "How to Annotate with Bounding Boxes":
  - "**Ensure pixel-perfect tightness** The edges of bounding boxes should touch the outermost pixels of the object that is being labeled."
  - "Leaving gaps creates several IoU discrepancies… A model that works perfectly may punish itself because it hasn't predicted an area where you have left a gap during labeling data."
  - "we recommend assuming potential failures on objects smaller than 10x10 pixels, or 1.5% of the image dimensions, whichever is larger."
  - "you should avoid overlap at all costs."
  — [V7 Blog](https://www.v7darwin.com/blog/bounding-box-annotation)
- [VENDOR BLOG, pre-2024: September 7, 2021] SuperAnnotate, "Introduction to bounding box annotation: Best practices": "**Pixel-perfect tightness** Tightness is a top priority. The edges of a bounding box should be as close to the labeled object as possible. Consistent gaps may create issues with the IoU…" and "Annotation overlap should be avoided at all events." — [SuperAnnotate Blog](https://www.superannotate.com/blog/introduction-to-bounding-box-annotation-best-practices)
- [VENDOR BLOG] CVAT, "How to Create Data Annotation Guidelines" (published June 8, 2026):
  - "“Draw a box around the object” is a guaranteed path to inconsistent data. You also need to define how tight the annotation should be."
  - "**For bounding boxes, specify whether the box should encompass the outermost visible pixels of the object or whether a gap is acceptable, and if so, how many pixels wide it should be.**"
  - "For segmentation masks, define how closely the mask should follow the object boundary, how to handle soft or blurry edges, and whether small gaps, shadows, holes, or transparent regions should be included."
  — [CVAT Blog: annotation guidelines](https://www.cvat.ai/resources/blog/how-to-create-data-annotation-guidelines)
- [VENDOR BLOG] Same CVAT article:
  - "If your guidelines do not define the expected precision level, annotators will calibrate to their own standard. Some will work faster and looser. Others will be meticulous and slow. **Neither approach is wrong without a written target, but together they produce inconsistent data.**"
  - Suggested measurable criteria: "Acceptable IoU range for bounding boxes", "Minimum object size for annotation", "Rules for handling blurry, transparent, shadowed, or partially visible regions".
  — [same](https://www.cvat.ai/resources/blog/how-to-create-data-annotation-guidelines)
- [VENDOR BLOG] Same CVAT article, occlusion:
  - "Set a clear threshold: “If more than X% of the object is occluded, do not annotate.” Then define how the visible object should be annotated. Should the annotator draw the bounding box around only the visible portion, or estimate the full extent of the object behind the occlusion? The answer depends on the task."
  - "For many object detection and segmentation projects, labeling only the visible portion may be the right approach. For multi-object tracking, amodal perception, or tasks that require consistent object boundaries across frames, estimating the full object extent may be required."
  - Pilot advice: "Deliberately include difficult cases in the pilot: heavy occlusion, unusual poses, blurry boundaries… low-resolution objects".
  — [same](https://www.cvat.ai/resources/blog/how-to-create-data-annotation-guidelines)
- [VENDOR BLOG] CVAT, "Annotation Quality Assurance" (published March 30, 2026):
  - "One person might draw a bounding box tightly around an object; another might leave more margin… These differences are not necessarily mistakes and instead often reflect genuine ambiguity in the data quality or in the labeling guidelines."
  - Rule-based QA checks listed: "Shape inaccuracies like a bounding box that clips the edge of an object rather than enclosing it fully" and "Bounding boxes must meet a minimum pixel height or area."
  — [CVAT Blog: annotation QA](https://www.cvat.ai/resources/blog/annotation-quality-assurance)
- [OFFICIAL COURSE] CVAT Academy "Labeling Guidelines", "Annotation Accuracy": the spec "must clearly state: Whether pixel-perfect accuracy is required or if small offsets are acceptable". Corner cases to document: "Whether to label only visible parts or reconstruct hidden areas" and "Minimum pixel size for objects to be annotated". — [CVAT Academy: Labeling Guidelines](https://www.cvat.ai/academy/labeling-guidelines)
- [OFFICIAL DOCS] The CVAT manual page on rectangle annotation describes drawing methods only, with no tightness rule. — [CVAT Docs: Annotation with rectangles](https://docs.cvat.ai/docs/annotation/manual-annotation/shapes/annotation-with-rectangles/)
- [VENDOR BLOG, pre-2024: April 6, 2023] Label Studio, "Getting started with Object Detection": "Create bonding boxes that can encompass the entire relevant components visible in the photos." ("bonding" is sic.) — [Label Studio Blog](https://labelstud.io/blog/getting-started-with-object-detection/)
- [VENDOR BLOG] Labelbox, "Best practices for successful image annotation" (no date on page; a third party cites it as 2025): it lists considerations such as "how to represent occluded objects (objects hidden by other objects in the image), how to deal with parts of the image that are unrecognizable". It gives no tightness rule, and its "pixel-perfect labels" mention is product marketing ("tools… help reduce the time-consuming nature of creating consistent, pixel-perfect labels"). — [Labelbox Guide](https://labelbox.com/guides/image-annotation/)
- [VENDOR BLOG] Encord, "Bounding Box vs. Polygon vs. Segmentation vs. Keypoint": "Objects overlap heavily, since boxes handle occlusion poorly compared to instance masks". It gives no tightness guidance. — [Encord Blog](https://encord.com/blog/choosing-image-annotation-type/)

### Inferences
- The tool vendors split into two camps:
  - **Prescriptive** (Scale, V7, SuperAnnotate, Roboflow): "touch outermost pixels".
  - **Procedural** (CVAT 2026, Azure, Google): "decide and document the gap".
- None of the prescriptive pages give experimental evidence. Their shared rationale is IoU: a consistent label gap makes a correctly-localizing model look wrong, or teaches it the gap.
- CVAT's line that loose or meticulous is not wrong *by itself*, only *inconsistently*, is the clearest vendor statement that consistency outranks a particular tightness level.

### Gaps
- Labelbox's own docs bounding-box page (docs.labelbox.com/docs/bounding-box) returned 404, and no Labelbox tightness rule was found.
- No Encord tightness guidance was found.
- The "always ensure pixel-perfect tightness" phrase that search snippets attribute to CVAT Academy could not be verified in fetched page text.

---

## Q6. NVIDIA TAO / DeepStream and Apple Create ML

### Takeaway
NVIDIA's TAO model cards (PeopleNet, Retail Object Detection) publish concrete **ground-truth labeling guidelines**: minimum box 10 px, **boxes around the visible part** for occlusion/truncation, skip objects under ~60% visible (non-person), and include carried objects that don't change the silhouette. They say nothing on margin. Apple's current Create ML docs give no tightness rule. Apple's open-source Turi Create guide says tightness is **"only a convention"**.

### Cited Findings
- [OFFICIAL DOCS] TAO "Data Annotation Format" (KITTI): the fields are "Truncation: How much of the object has left image boundaries" and "Occlusion state [ 0 = fully visible, 1 = partly visible, 2 = largely occluded, 3 = unknown]". It contains no tightness guidance. — [NVIDIA TAO Docs: Data Annotation Format](https://docs.nvidia.com/tao/tao-toolkit/text/data_annotation_format.html)
- [OFFICIAL DOCS: model card, updated June 12, 2025] PeopleNet "Ground-truth labeling guidelines":
  - "All objects that fall under one of the three classes (person, face, bag) in the image and are larger than the smallest bounding-box limit for the corresponding class (height >= 10px OR width >= 10px @1920x1080) are labeled".
  - "If a person is carrying an object please mark the bounding-box to include the carried object as long as it doesn't affect the silhouette of the person."
  - "Occlusion: For partially occluded objects that do not belong a person class and are visible approximately 60% or are marked as visible objects with bounding box around visible part of the object… Objects under 60% visibility are not annotated."
  - "Occlusion for person class: If an occluded person's head and shoulders are visible and the visible height is approximately 20% or more, then these objects are marked by the bounding box around the visible part of the person object."
  - Truncation (non-person): "at the edge of the frame with visibility of 60% or more visible are marked with the truncation flag".
  — [NVIDIA NGC: PeopleNet model card](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/tao/models/peoplenet)
- [OFFICIAL DOCS: model card, updated August 19, 2024] Retail Object Detection: "If you are looking to transfer-learn or to fine-tune the models to adapt to your target environment and classes, please follow the guidelines below for better model accuracy." Also: "(height >= 10px OR width >= 10px)", "Occlusion: For partially occluded objects that are visible approximately 60% or are marked as visible objects with a bounding box around the visible part of the object… Objects under 60% visibility are not annotated." and "Truncation: An object, at the edge of the frame, which is 60% or more visible is marked with the truncation flag." — [NVIDIA NGC: Retail Object Detection model card](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/tao/models/retail_object_detection)
- [OFFICIAL DOCS, Apple open-source; project archived, pre-2024] Turi Create object-detection user guide:
  - "It is customary for bounding boxes to tightly surround instances. However, this is only a convention and it is entirely up to you and your training data to define how instances should be represented as boxes."
  - "try to be consistent with your notion of instances… If you leave some persons unmarked, the model can get confused".
  — [Turi Create User Guide: Object Detection](https://apple.github.io/turicreate/docs/userguide/object_detection/)
- [OFFICIAL, pre-2024: WWDC 2019 session 424] "Training Object Detection Models in Create ML" describes the annotation format (center x/y, width, height) and data balance. It says nothing on tightness. — [Apple Developer: WWDC19 424](https://developer.apple.com/videos/play/wwdc2019/424/)

### Inferences
- NVIDIA's production labeling rules are **modal** (visible part) with a visibility floor (~60%). The project's "draw if ≥1/3 visible" floor is looser than NVIDIA's 60% for non-person objects.
- The PeopleNet "include carried objects that don't change the silhouette" rule shows that production guidelines define the object's extent *semantically* (what counts as part of the object). They do not add a pixel margin. By analogy, deciding whether a button's shaded rim is "part of the button" is a definition choice to write down once.

### Gaps
- No DeepStream-specific labeling guidance was found.
- The NVIDIA/Appen TAO blog (Jan 25, 2022) contained no tightness text in the fetched version.
- Apple's current Create ML documentation has no annotation-quality guidance. The transcript of Apple Tech Talk 10155 ("Improve Object Detection models in Create ML") could not be retrieved.

---

## Q7. Padding on purpose vs. "padding hurts"; and "consistency matters more than exact tightness"

### Takeaway
No first-party platform or framework doc **recommends** a deliberate margin. The pixel-margin examples come only from annotation-service marketing pages (Taskmonk "2–3 pixel margin", BasicAI "if padding is necessary… consistent"), and none gives a reason. The one **evidence-backed** case for padding is academic and applies to **machine-generated boxes**: an auto-annotation pipeline adds "a few pixels on each side" because its predicted boxes tended to miss a few pixels. Several first-party sources (Google, Azure, CVAT, Turi Create, and the Ultralytics Academy's occlusion rule) put **explicit, consistent convention** above any universal tightness standard. No platform source presents data showing that consistency outranks tightness.

### Cited Findings
**Sources that allow or suggest a margin**
- [SERVICE-VENDOR MKTG, Oct 30, 2025] Taskmonk glossary:
  - "Decide how "tight" a box should be. For example, include a 2–3 pixel margin. Specify how to handle occlusions: label the visible part only, or approximate the full extent. Define how to treat truncation at image edges… Clearly state when to ignore tiny or heavily blurred objects."
  - Worked example: "Boxes must be tight, with a 2-pixel margin. For occlusions, workers label only the visible part."
  - QA: "Measurement often uses IoU… at thresholds such as 0.5 or 0.75. Stricter thresholds apply to small objects."
  - It gives no rationale for the margin.
  — [Taskmonk: Bounding Box Annotation](https://www.taskmonk.ai/glossary/bounding-box-annotation-definition)
- [SERVICE-VENDOR MKTG] BasicAI: "**Consistent Padding** If padding is necessary, apply consistent padding around the object within the bounding box. This ensures uniformity in the dataset and prevents the model from being biased by varying amounts of padding." The same page says: "Ensure that the bounding box fits tightly… Avoid including excessive empty space". — [BasicAI Blog: bounding box annotation tips](https://www.basic.ai/blog-post/bounding-box-annotation)
- [ACADEMIC] Geiß et al., "Automatic Bounding Box Annotation with Small Training Datasets for Industrial Manufacturing", *Micromachines* 2023;14(2):442 (pre-2024). In the post-processing of machine-predicted annotation boxes: "(P2) Add some additional slack; that is, increase the bounding box by a few pixels on each side." Results: "the carrot benefits from the additional slack in F+", and remaining errors are boxes where "only a few pixels are missing". The paper also reports: "the Faster R-CNN strongly benefits from using two post-processing steps that merge multiple bounding boxes and enlarge the final box." — [PMC9962188](https://pmc.ncbi.nlm.nih.gov/articles/PMC9962188/)
- [OFFICIAL DOCS] Azure ML asks: "Should it be cropped as closely as possible, or is some clearance acceptable?" — [Microsoft Learn](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-image-labeling-projects)
- [OFFICIAL DOCS, archived] Google asks: "Should it be a tight box or a loose box?" — [Wayback: Google DLS instructions](https://web.archive.org/web/2023/https://cloud.google.com/ai-platform/data-labeling/docs/instructions)
- [VENDOR BLOG] CVAT: "specify whether the box should encompass the outermost visible pixels of the object or whether a gap is acceptable, and if so, how many pixels wide it should be." — [CVAT Blog](https://www.cvat.ai/resources/blog/how-to-create-data-annotation-guidelines)

**Sources that say padding hurts**
- [OFFICIAL DOCS] Ultralytics: "No space should exist between an object and its bounding box." — [Ultralytics Tips](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
- [OFFICIAL COURSE] Ultralytics Academy: "A box that leaves a margin of floor, or clips a person's feet, teaches the model the wrong extent." — [Ultralytics Academy](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
- [VENDOR BLOG, 2021] V7: "Leaving gaps creates several IoU discrepancies… A model that works perfectly may punish itself because it hasn't predicted an area where you have left a gap". — [V7 Blog](https://www.v7darwin.com/blog/bounding-box-annotation)
- [VENDOR BLOG, 2021] SuperAnnotate: "Consistent gaps may create issues with the IoU". — [SuperAnnotate Blog](https://www.superannotate.com/blog/introduction-to-bounding-box-annotation-best-practices)
- [VENDOR BLOG, 2026] Roboflow robotics: "zero wasted space… a loose bounding box creates "background noise" inside the labelled region." — [Roboflow Blog](https://blog.roboflow.com/image-annotation-for-robotics/)
- [SERVICE-VENDOR MKTG, last updated 03.08.2026] DataVLab: "Bounding boxes must be tight and aligned with object edges without cutting into the object or leaving excessive padding… loose boxes mislead the model into associating unrelated background pixels with the object." — [DataVLab](https://datavlab.ai/post/how-to-annotate-images-for-object-detection)
- [SERVICE-VENDOR MKTG, Feb 10, 2025] Label Your Data: "Use precise box alignment, avoiding gaps between the object and bounding box edges." On occlusion: "Label only the visible portion of an occluded object." — [Label Your Data](https://labelyourdata.com/articles/data-annotation/bounding-box-annotation)

**Sources on consistency vs. exact tightness**
- [SERVICE-VENDOR MKTG] Claru:
  - "Best practice is to draw the tightest box that fully contains all visible pixels of the object, with zero padding… **consistent tightness matters more than absolute tightness: if some annotators include 5 pixels of padding while others include zero, the inconsistency introduces noise that degrades detector performance.**"
  - It cites inter-annotator targets of "mean pairwise IoU above 0.85" and says "Untrained annotators produce bounding boxes with mean pairwise IoU of 0.65-0.70". No source is given for these numbers.
  - It also claims "The COCO annotation guidelines specify that the box should enclose the entire object boundary including any protruding parts". This was **not verified** and should be treated as unconfirmed.
  — [Claru glossary](https://claru.ai/glossary/bounding-box-annotation)
- [VENDOR BLOG] CVAT: "Neither approach is wrong without a written target, but together they produce inconsistent data." — [CVAT Blog](https://www.cvat.ai/resources/blog/how-to-create-data-annotation-guidelines)
- [OFFICIAL, Apple Turi Create] "this is only a convention and it is entirely up to you and your training data to define how instances should be represented as boxes." — [Turi Create](https://apple.github.io/turicreate/docs/userguide/object_detection/)
- [SERVICE-VENDOR MKTG] Annotera: "Box tightness conventions — how much background to include around an object — must be defined explicitly before annotation begins because different tightness standards produce models with different IoU performance characteristics." — [Annotera](https://www.annotera.ai/blog/bounding-box-annotation-guide-object-recognition/)
- [COMMUNITY, 2023] This view points the other way on *random* variation: "as long as you do not have systematic bias… the noise in your annotation does not matter much." — [GitHub yolov5 #10813](https://github.com/ultralytics/yolov5/discussions/10813). It conflicts with Claru's claim that random padding variation "degrades detector performance". Neither side presents data.
- [SERVICE-VENDOR MKTG] CNTXT: "There are two main approaches to annotating occluded objects… The best approach will depend on the specific requirements of your model. Whichever approach you choose, it is crucial to apply it consistently." — [CNTXT AI](https://www.cntxt.tech/insights/annotating-with-bounding-boxes-quality-best-practices)
- [SERVICE-VENDOR MKTG] BasicAI (intro post): "Modal annotation labels only the visible portion of the object… reduces subjectivity under occlusion. The downside is that boxes can become small, fragmented, or unrepresentative." and "Amodal annotation… This reduces annotation consistency, but is critical for autonomous systems…". It recommends "enriching labels with attributes such as "occlusion" or "truncation."" — [BasicAI intro](https://www.basic.ai/blog-post/introduction-of-bounding-box-annotation)
- [SERVICE-VENDOR MKTG] Sama: "Occlusion occurs when objects overlap. Truncation happens when the image boundary cuts off an object. In each case, annotators would still draw a bounding box around the visible portion of the object." — [Sama](https://www.sama.com/blog/bounding-box-computer-vision)

### Inferences
- **No platform recommends padding for human labels.** The only rationale for padding with evidence behind it (Geiß et al.) is correcting a *systematic under-coverage bias of an automatic box generator*. That is directly relevant to a machine box-refiner. If an audit showed the 35%-transition refiner systematically cut inside the edge a human would draw (or outside it), a fixed per-side offset is the kind of correction that paper applied. The Ultralytics, V7 and Roboflow guidance implies the target of that correction should be the tight, human-agreed edge, not an added margin.
- **IoU sensitivity scales with object size** (arithmetic, not from a source). For a square object of side s, padding p px per side gives IoU = s²/(s+2p)² against the tight box:
  - s = 19 px: p = 1 → 0.82; p = 2 → 0.68
  - s = 40 px: p = 1 → 0.91
  - s = 94 px: p = 1 → 0.96; p = 2 → 0.92
  At COCO-style mAP50-95 thresholds, a 1–2 px convention difference on the smallest buttons alone moves boxes across the 0.75–0.95 IoU bins. The V7/SuperAnnotate "gaps create IoU discrepancies" argument therefore matters most for small objects. It also means train and evaluation labels must use the **same** edge definition.
- The two "consistency" claims make different predictions. Claru says random per-box variation hurts; the YOLOv5 community comment says only systematic bias matters. Both can be true in different senses. Systematic bias shifts what the model learns to output, which hurts only if evaluation labels use a different convention. Random variation mostly caps achievable IoU at high thresholds. No source here measures either effect.

### Gaps
- No first-party platform document gives a rationale for a pixel margin, or evidence that one helps or hurts.
- No first-party source defines where the "edge" of a motion-blurred or glowing object lies (e.g. a percentage of an intensity or colour transition). CVAT raises the question for masks ("how to handle soft or blurry edges") but leaves it to the project.
- Quantitative effects of label tightness or label noise on detector accuracy are outside the platform docs. They would need the research literature, which is covered by other notes (e.g. `looseness_effects.md` in this folder).

---

## Q8 (cross-cut). Edge-case guidance across sources: occlusion, truncation, blur, overlap, small objects

### Takeaway
Sources **disagree on occlusion**. Roboflow's blog is amodal ("as if fully visible"). The AWS template, Ultralytics Academy, NVIDIA model cards, Sama and Label Your Data are modal ("visible part"). CVAT, Azure, Google, CNTXT and Roboflow's robotics post say to choose per task and apply consistently. Truncation: clip at the image edge (AWS, NVIDIA). Blur: keep blurred data if deployment is blurred (Google). Roboflow gives a mild/moderate/severe rule. Small objects: minimums of 8–10 px or ~1–1.5% of image side. Shadows: exclude (AWS, Ultralytics Academy).

### Cited Findings
- **Occlusion, amodal:**
  - "label the occluded object as if it were fully visible" — [Roboflow Blog](https://blog.roboflow.com/tips-for-how-to-label-images/)
  - "Estimate the Full Object… works well when the occlusion is minor (<30%), and the object's shape is predictable." — [Roboflow robotics](https://blog.roboflow.com/image-annotation-for-robotics/)
- **Occlusion, modal:**
  - "Do not include parts of the object are overlapping or that cannot be seen, even though you think you can interpolate the whole shape." — [AWS GT](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-bounding-box.html)
  - "Only annotate what you can see." — [Ultralytics Academy](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
  - "bounding box around visible part of the object… Objects under 60% visibility are not annotated." — [NVIDIA PeopleNet](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/tao/models/peoplenet)
- **Occlusion, choose and be consistent:**
  - "Should the annotator draw the bounding box around only the visible portion, or estimate the full extent… The answer depends on the task." — [CVAT](https://www.cvat.ai/resources/blog/how-to-create-data-annotation-guidelines)
  - "How should labelers handle an object that's partially covered by another object?" — [Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-image-labeling-projects)
  - "Pick one rule (e.g. "label if ≥ 50% visible")" — [Ultralytics Academy](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
- **Visibility floors for annotating at all:**
  - ~60% for non-person objects, and person head+shoulders with ~20% height — [NVIDIA PeopleNet](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/tao/models/peoplenet), [NVIDIA Retail](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/tao/models/retail_object_detection)
  - "e.g. ≥ 50% visible" — [Ultralytics Academy](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
  - "If more than X% of the object is occluded, do not annotate." (template) — [CVAT](https://www.cvat.ai/resources/blog/how-to-create-data-annotation-guidelines)
- **Truncation:**
  - "If the target is off screen, draw the box up to the edge of the image." — [AWS GT](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-bounding-box.html)
  - Truncation flag at ≥60% visible — [NVIDIA Retail](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/tao/models/retail_object_detection)
  - "What should they do if an object of interest is clipped by the edge of the image?" — [Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-image-labeling-projects)
- **Blur:**
  - "if your use case involves blurry and low-resolution images… your training data should be composed of blurry, low-resolution images." — [Vertex AI](https://docs.cloud.google.com/vertex-ai/docs/image-data/object-detection/prepare-data)
  - Mild blur → label normally; moderate → include only if common in deployment; severe ("cannot identify object edges as a human") → exclude — [Roboflow robotics](https://blog.roboflow.com/image-annotation-for-robotics/)
  - "Clearly state when to ignore tiny or heavily blurred objects." — [Taskmonk](https://www.taskmonk.ai/glossary/bounding-box-annotation-definition)
  - Rules needed for "blurry, transparent, shadowed, or partially visible regions" — [CVAT](https://www.cvat.ai/resources/blog/how-to-create-data-annotation-guidelines)
- **Shadows and surrounding light:**
  - "Avoid including shadows." — [AWS GT](https://docs.aws.amazon.com/sagemaker/latest/dg/sms-bounding-box.html)
  - "Boxes drawn around shadows, not objects." listed as an error — [Ultralytics Academy](https://academy.ultralytics.com/courses/dataset-readiness-for-yolo/annotation-best-practices)
  - "Reflections and shadows: should they be excluded from the box?" listed as a guideline question — [Claru](https://claru.ai/glossary/bounding-box-annotation)
- **Overlap between different objects' boxes** (sources disagree):
  - "It is a common misconception that boxes cannot overlap." — [Roboflow](https://blog.roboflow.com/tips-for-how-to-label-images/)
  - "you should avoid overlap at all costs." — [V7](https://www.v7darwin.com/blog/bounding-box-annotation)
  - "bounding boxes work best when there is minimal overlap… using polygon or segmentation annotations may be better." — [Scale](https://scale.com/guides/data-labeling-annotation-guide)
  - The V7 and Scale advice is about choosing the annotation type, not a licence to shrink boxes.
- **Small objects:**
  - Min edge "0.01 * length of a side" and 8×8 px — [Vertex AI](https://docs.cloud.google.com/vertex-ai/docs/image-data/object-detection/prepare-data)
  - "potential failures on objects smaller than 10x10 pixels, or 1.5% of the image dimensions, whichever is larger" — [V7](https://www.v7darwin.com/blog/bounding-box-annotation)
  - "height >= 10px OR width >= 10px" — [NVIDIA](https://catalog.ngc.nvidia.com/orgs/nvidia/teams/tao/models/peoplenet)
  - Train at native or higher resolution when there are many small objects — [Ultralytics Tips](https://docs.ultralytics.com/yolov5/tutorials/tips_for_best_training_results/)
  - "What should the labelers do if the object is tiny?" — [Azure ML](https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-image-labeling-projects)

### Inferences
- The project's current rule mixes conventions: tight edges, amodal completion for partial finger occlusion, and a ≥1/3-visible floor.
  - The amodal part matches Roboflow, and the Roboflow robotics condition (minor occlusion, predictable shape).
  - It departs from the defaults of AWS, Ultralytics Academy and NVIDIA.
  - Every "choose per task" source (CVAT, Azure, Google, Ultralytics Academy) would accept it **if it is written down with examples and applied uniformly**, including in the test/validation labels.
- Because a box only records extremes, the amodal rule changes box coordinates only when the finger covers one of the circle's extreme edges. A written rule could state this explicitly, e.g. "complete the circle's extent when the covered part includes the circle's outer edge".
- The refiner's choice to include the shaded rim but exclude the glow is consistent with "outermost pixels of the object" (V7, Roboflow) and with "avoid shadows" (AWS), provided the rim is physically part of the button. The 35% threshold itself has no platform source.

### Gaps
- No source addresses JPEG compression artifacts at edges.
- No source addresses head-mounted or egocentric camera specifics.
- No source specifically addresses hand or finger occlusion of small objects. The PeopleNet "carried object" rule and Claru's "Objects in hand… where does the hand end and the object begin?" question are the nearest.
