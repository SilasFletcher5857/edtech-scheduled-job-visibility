import { z } from "zod";
import { infrai } from "./infrai.ts";

export const deliveryRequest = z.object({
  courseId: z.string().min(1),
  learnerId: z.string().min(1),
  deadline: z.string().datetime(),
  jobName: z.string().min(1),
});

export type DeliveryRequest = z.infer<typeof deliveryRequest>;

export type JobDecision = {
  courseId: string;
  learnerId: string;
  status: "report" | "observe";
  reason: string;
};

export function decideJobVisibility(input: DeliveryRequest, now: Date, jobSucceeded: boolean): JobDecision {
  const overdue = new Date(input.deadline).getTime() < now.getTime();
  const report = !jobSucceeded && overdue;
  return {
    courseId: input.courseId,
    learnerId: input.learnerId,
    status: report ? "report" : "observe",
    reason: report ? "delivery failed after learner deadline" : "no educator report is needed",
  };
}

export async function recordScheduledDelivery(raw: unknown, now = new Date()): Promise<JobDecision> {
  const input = deliveryRequest.parse(raw);
  try {
    await runDeliveryJob(input);
    const decision = decideJobVisibility(input, now, true);
    await infrai.metrics.report({ name: "course_delivery_success", value: 1, type: "counter", tags: { courseId: input.courseId }, idempotency_key: `${input.jobName}:${input.learnerId}:success` });
    return decision;
  } catch (cause) {
    const decision = decideJobVisibility(input, now, false);
    await infrai.errors.capture({ title: `${input.jobName} failed`, message: String(cause), exception: String(cause), level: "error", fingerprint: [input.courseId, input.jobName], context: { courseId: input.courseId, learnerId: input.learnerId, deadline: input.deadline }, idempotency_key: `${input.jobName}:${input.learnerId}:failure` });
    await infrai.metrics.report({ name: "course_delivery_failure", value: 1, type: "counter", tags: { courseId: input.courseId, status: decision.status }, idempotency_key: `${input.jobName}:${input.learnerId}:failure-metric` });
    return decision;
  }
}

async function runDeliveryJob(input: DeliveryRequest): Promise<void> {
  if (input.jobName === "demo-failure") throw new Error("course delivery job failed");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await recordScheduledDelivery({ courseId: "biology-101", learnerId: "learner-7", deadline: "2026-10-20T09:00:00.000Z", jobName: "demo-failure" }, new Date("2026-10-24T09:00:00.000Z"));
  console.log(JSON.stringify(result));
}
