import assert from "node:assert/strict";
import { decideJobVisibility, deliveryRequest } from "./job_visibility.ts";

const input = deliveryRequest.parse({ courseId: "biology-101", learnerId: "learner-7", deadline: "2026-10-20T09:00:00.000Z", jobName: "send-course" });
const result = decideJobVisibility(input, new Date("2026-10-24T09:00:00.000Z"), false);
assert.deepEqual(result, { courseId: "biology-101", learnerId: "learner-7", status: "report", reason: "delivery failed after learner deadline" });
assert.throws(() => deliveryRequest.parse({ courseId: "", learnerId: "learner-7", deadline: "bad", jobName: "send-course" }));
console.log("job visibility decision tests passed");
