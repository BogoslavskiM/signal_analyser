---
id: HND-0376
type: task
from: orchestrator
to: frontend
title: Make workspace dialog failure-safe and remove Plotly modebar DOM
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Production live Plotly and real zoom/pan/autoscale now pass. Fix the two
  remaining frontend-owned failures. First, the main workspace-import dialog is
  opened directly by Signals + (the removed intermediate add-actions popup must
  not be restored). It must take focus immediately, remain a valid blocking
  overlay while api/workspace/variables returns 502, leave loading state, show a
  retryable error, keep focus inside, close on Escape and restore focus to +.
  Second, after every Plotly.react completion remove any generated .modebar and
  .modebar-container nodes because graph tool buttons are explicitly forbidden;
  preserve _fullLayout/_fullData and all gestures. Do not address the transient
  unrepeatable 404 unless an exact URL is evidenced. Preserve all other popup
  stacking and no-plot-shift behavior. The application must fill the complete
  current tab/container responsively; 1024/1280/1440 are test checkpoints, not
  hard canvas sizes. Minimum readable dimensions are allowed; remove only fixed
  page dimensions that prevent expansion or leave unused outer space, while
  keeping zone proportions responsive.
allowed_paths:
  - public/**
acceptance_criteria:
  - Signals + directly opens the main workspace dialog; no intermediate menu.
  - 502 results in visible retry state, modal focus ownership and Escape restoration.
  - No modebar/modebar-container remains after render or gestures.
  - Live Plotly internals and zoom/pan/autoscale remain functional.
  - Shell fills the current viewport/container without hard-size clipping.
  - Complete frontend corpus passes.
requested_skills: [frontend/frontend-workflow, frontend/dialog-system, frontend/graph-output-zone]
---
