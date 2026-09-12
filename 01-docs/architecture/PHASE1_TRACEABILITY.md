# DEVOS Phase 1 — Traceability Matrix (Gates × Deliverables × AC groups × Files)

Outcome chain: USER IDEA → UNDERSTAND → CLASSIFY → VALIDATE STACK → BUILD PLAN → CREATE/SELECT PROJECT → DIRECTORIES → FILES → CODE → STATIC INTEGRITY → APPLY → SYNC → AI STREAM → SUMMARY/DIFF → INSPECT → EDIT → SAVE → COMPLETE.

## Gate order (mandatory, no skip)

G0 Repo Safety → G1 Architecture → G2 Contract/Requirements/Plan → G3 Generation Transaction/State Machine → G4 Filesystem/Security → G5 Generation/Static Integrity → G6 AI Streaming → G7 Workspace/Monaco/Summary/Diff → G8 User Control → G9 Local Quality/Regression → G10 Production Deployment → G11 Live Production Builder → G12 Final Certification.

## Deliverable → Gate → AC group → Implementation file(s)

- D-01 Architecture Map → G1 → (all) → PHASE1_ADR.md (this record).
- D-02 Normalized Build Spec → G2 → AC-01–10 → schemas/builder.py (BuildSpec, Requirement{class:EXPLICIT|INFERRED|OPTIONAL|UNSUPPORTED}), services/builder_service.py normalize().
- D-03 Generation Transaction → G3 → AC-21–25 → models/generation.py (generation_request_id,user_id,project_id,prompt,normalized_build_spec,mode,status,created/modified/deleted/failed lists,started_at,completed_at), schemas/builder.py (GenerationResponse).
- D-04 Generation State Machine → G3 → AC-21–25 → builder_service transitions IDLE→PLANNING→GENERATING→APPLYING→SYNCING→COMPLETED; failures PARTIAL|FAILED|CANCELLED (+BLOCKED for unsupported/env) never mapped to COMPLETED; retry reconciles by identity.
- D-05 Requirement Classification → G2 → AC-01–10 → builder_service.classify_requirements (EXPLICIT/INFERRED/OPTIONAL/UNSUPPORTED, no silent substitution).
- D-06 User-Visible Build Plan → G2/G7 → AC-11–20 → BuilderPanel.tsx plan view; backend plan step of builder_service.
- D-07 Project Creation/Selection → G3/G4 → AC-21–25 → reuse ProjectService + projectsApi; builder accepts project_id (select) or creates via existing POST /projects.
- D-08 Directory Generation → G4/G5 → AC-26–30 → builder_service plan dirs → FileService.create_folder (path-validated).
- D-09 File Generation → G4/G5 → AC-26–30 → FileService.create_file/save_file (containment + sensitive + caps).
- D-10 Multi-File Code Generation → G5 → AC-31–35 → builder_service templates: Todo App React+Express+PostgreSQL (frontend/ + server/ + README + .env.example; NO shell).
- D-11 Static Generation Integrity → G5 → AC-36–40 → builder_service.verify_integrity (files, imports, deps, config, FE/BE routes, methods, payloads, response shapes, db refs, env, planned-vs-actual, FE/BE consistency).
- D-12 README/Documentation → G5 → AC-46–50 → generated README.md + setup instructions (part of template, integrity-checked).
- D-13 Real AI Streaming → G6 → AC-51–55 → api/v1/builder.py SSE stream endpoint (reuse AIService provider pattern) + apiClient.stream in BuilderPanel.
- D-14 File Application → G5/G7 → AC-56–60 → builder apply step writes via FileService; response lists applied/skipped/failed.
- D-15 Workspace Synchronization → G7 → AC-56–60 → BuilderPanel onApplied → fileRefreshToken + openFile Bronze path (reuse WorkspacePage callbacks).
- D-16 Change Summary → G7 → AC-61–65 → GenerationResponse summary (created/modified/deleted counts + per-file ops).
- D-17 Diff where supported → G7 → AC-61–65 → Monaco-side diff presentation of generated vs prior content (read-only compare; supported file types).
- D-18 Retry/Reconciliation → G3/G8 → AC-66–70 → retry endpoint reconciles by generation_request_id + file identity; never duplicates projects/dirs/files/routes/deps/docs/records.
- D-19 User Inspection → G7/G8 → AC-61–65 → Explorer + Monaco open/preview of every generated file.
- D-20 User Edit/Save → G8 → AC-66–70 → CodeViewer dirty/save (existing onSave) — builder files are ordinary workspace files.
- D-21 Security Boundary → G4/G8 → AC-66–70 → FileService.validate_safe_path + is_sensitive + operation allowlist + ownership checks; NO shell execution; secrets redacted.
- D-22 Focused Phase 1 QA → G9 → AC-71–75 → 04-tests/api/test_builder.py + prod-phase1-builder.spec.ts (primary Todo test + 10 negative cases).
- D-23 Local Quality Package → G9 → AC-71–75 → type-check+lint+build+pytest+--list+focused regression evidence.
- D-24 Production Evidence Package → G10/G11 → AC-71–75 → deployment identity + health + live builder run (real Chromium + real production).
- D-25 Final Certification Report → G12 → AC-01–75 → per-AC PASS/FAIL/UNVERIFIED + Required/Conditional PASS + PRODUCTION VERIFIED/NOT VERIFIED.

## Negative coverage (invariant: FAILURE MUST NOT LOOK LIKE SUCCESS)

unsupported technology/stack, missing env, AI/provider failure, stream interruption, file-write failure, retry, existing-project modification, unsafe path, duplicate generation → each yields BLOCKED/FAILED/PARTIAL with explicit error, never COMPLETED.

## AC preservation note

Authoritative AC-01…AC-75 full wording was not pasted beyond the group ranges (AC-01–10 Request/Understanding … AC-71–75 Production/Regression). Grouping is preserved exactly; each AC will be reported individually PASS/FAIL/UNVERIFIED with objective evidence. No replacement criteria invented.
