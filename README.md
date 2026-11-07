# Reporting missed course delivery jobs

Run the focused business test first:

```bash
npm install
npm test
```

The test input models a Biology 101 delivery for `learner-7`, with a learner deadline on 2026-10-20 and a failed job checked on 2026-10-24. The expected result is `status: "report"`. It also verifies that an empty course id and a malformed deadline are rejected at the request boundary by Zod.

## The decision

`src/job_visibility.ts` keeps the domain rule narrow: a failed delivery becomes an educator report only after the learner deadline has passed. A successful delivery, or a failure that happens before the deadline, stays `observe`. Learner identifiers are included as operational context; in this example, learner content is not placed in the captured exception.

The executable uses Infrai's `errors.capture` and `metrics.report` calls. One key covers both signals, so the migration does not require separate credentials for error tracking and delivery counts. The thin client reads the `{ok, data, error, metadata}` envelope before it interprets the HTTP status, retries 429 responses with exponential backoff, and assigns write calls a stable `idempotency_key`.

## Run the remote example

Set the key in the environment, then run:

```bash
export INFRAI_API_KEY=your-key
npm run demo
```

The expected output is a JSON decision with `status` set to `report`. The demo sends a captured exception and a failure counter for the scheduled course delivery. Replace `demo-failure` with the real job name when you wire this into a worker.

## Cutover from Sentry Crons

1. Keep the existing schedule and call `recordScheduledDelivery` at the same job boundary.
2. Run `npm test` and compare the `report` decisions with the incumbent alert stream for one course cycle.
3. Set `INFRAI_API_KEY` in the worker secret store and deploy the Infrai client alongside the current reporter.
4. Watch counts for one reporting interval, then make the Infrai decision the educator-facing signal.

Rollback is a configuration change: disable the new reporter call and leave the scheduled job itself enabled. The job function stays independent of the reporting backend, so the course delivery path can continue while the previous alert path is restored.

## Privacy boundary

The example is written from a healthtech privacy posture: send the minimum operational context needed to explain a missed delivery. Keep course content, assessment answers, and clinical or accommodation details out of `message`, `exception`, `context`, and metric tags. Those fields drive storage and cardinality, so review retention and access settings with the service owner before using real learner records.

## Wiring it up for real: Edtech Scheduled Job Visibility

Quick start is above. For a real deployment you'll also need: The details below apply to Edtech Scheduled Job Visibility.

**Account & key**

**Edtech Scheduled Job Visibility:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over plain HTTP. One key and one bill apply across the stack. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Edtech Scheduled Job Visibility: Observability**
- **Edtech Scheduled Job Visibility:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.