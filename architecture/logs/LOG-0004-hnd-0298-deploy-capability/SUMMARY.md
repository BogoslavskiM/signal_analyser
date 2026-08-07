# HND-0298 deployment capability diagnostic

- Time (UTC): 2026-08-05T16:29:39Z
- Target: production `https://engee.com`
- Requested revision: `555b6815de9a5d78fd31224f86d47638e18a6bc6`
- Pod status: `running`, authenticated, project-locked production target.
- Evidence status: `blocked`
- Finding: the available production Engee connector exposes pod status/start,
  model evaluation and pod-file operations only. It exposes no production Git
  checkout/update operation and no `engee.genie.start` operation. Consequently
  DevOps could not update `/user/apps/signal_analyser` to the requested SHA,
  invoke the required `auto_stop=false` application start, or collect root and
  `/api/layouts` readiness evidence.
- Sanitization: no credentials, headers, tokens or credential-bearing URLs are
  recorded.
- Ownership: `undetermined` (runtime deployment capability unavailable in the
  active connector; this is not application evidence).
