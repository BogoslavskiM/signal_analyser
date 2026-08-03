---
id: HND-0009
type: FYI
from: backender
to: frontend
title: TASK-0016 final session HTTP contract
task_section: ../tasks/TASK-0016-session-persistence-backend.md#scope
description: >
  GET /api/session responds no-store with {ok:true,document}; persist only
  opaque response.document. POST /api/session exact body is
  {state_revision:Int,document:Object}; success returns revision metadata and
  requires subsequent GET /api/state. 422 is a structured invalid/schema/
  version error; 409 is stale_state with current revision. Existing APIs are
  unchanged.
---
