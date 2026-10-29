import { z } from "zod";
const id = z.string().min(1).max(100),
  text = z.string().trim().min(1).max(12000),
  role = z.enum(["ADMIN", "INVESTIGATOR", "REVIEWER"]);
const evidenceInput = z.object({
  title: text.max(160),
  category: z.enum([
    "DOCUMENT",
    "PERSON",
    "EVENT",
    "ACCESS",
    "DATABASE",
    "FINDING",
  ]),
  classification: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]),
  content: text,
  version: z.number().int().positive().optional(),
});
const fail = (status, message) => {
  throw Object.assign(Error(message), { status });
};

export { id, text, role, evidenceInput, fail };
