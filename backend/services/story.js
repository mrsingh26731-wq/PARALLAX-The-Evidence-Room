export const story = {
  id: "case-074",
  title: "The Northline Incident",
  description:
    "Bellwether · 17 October 2026. A missing report. An unfamiliar search. A trail of permissions.",
  status: "OPEN",
};
export const documents = [
  [
    "ev-01",
    "The first signal",
    "DATABASE",
    "PUBLIC",
    "At 08:42 a valid contractor session searched the archive from an unfamiliar network. A login alone did not establish malicious intent.",
  ],
  [
    "ev-02",
    "A query out of place",
    "DOCUMENT",
    "INTERNAL",
    "At 08:47 the input ' OR '1'='1 appeared in an archive search. The prepared statement treated it as a literal search term. Zero records matched. No SQL injection succeeded.",
  ],
  [
    "ev-03",
    "The access ledger",
    "ACCESS",
    "INTERNAL",
    "At 08:49 the same account requested the sealed payroll report. The classification check denied access. At 09:12 analyst Mara Vale opened the incident summary under an assigned case membership.",
  ],
  [
    "ev-04",
    "Witness statement",
    "PERSON",
    "CONFIDENTIAL",
    "Fictional witness: Mara Vale, archive analyst. I moved report NL-19 to the restricted collection during the 08:30 review. The document was not deleted. Its old listing disappeared because its classification changed.",
  ],
  [
    "ev-05",
    "The sealed report",
    "DOCUMENT",
    "RESTRICTED",
    "Fictional employee sample: Rowan Hale, staff reference NL-204. The report contains a fictional payroll correction. Encrypted at rest; its absence from the ordinary listing reflects a legitimate classification change, not exfiltration.",
  ],
  [
    "ev-06",
    "Preservation receipt",
    "EVENT",
    "INTERNAL",
    "At 09:25 the incident team preserved the request log, checked its digest and recorded custody. Hash verification detects content changes relative to the trusted keyed manifest; it does not prove the original statement was true.",
  ],
  [
    "ev-07",
    "Encryption review",
    "DOCUMENT",
    "CONFIDENTIAL",
    "At 10:10 the security team verified AES-256-GCM envelopes. An altered authentication tag was rejected. A database snapshot alone did not reveal protected content; access to the application keys would change that threat model.",
  ],
  [
    "ev-08",
    "The finding",
    "FINDING",
    "PUBLIC",
    "At 11:40 the team concluded: the injection attempt failed, the restricted read was denied, and the missing report was reclassified. The unfamiliar login still requires a separate credential investigation. There is no evidence in this case of successful data extraction.",
  ],
].map(([id, title, category, classification, content], i) => ({
  id,
  case_id: story.id,
  title,
  category,
  classification,
  content,
  version: 1,
  x: 80 + (i % 3) * 320,
  y: 70 + Math.floor(i / 3) * 210,
}));
export const timeline = documents.map((e, i) => ({
  id: `time-${i}`,
  case_id: story.id,
  evidence_id: e.id,
  title: e.title,
  description:
    "Fictional scenario event — open the related evidence to investigate.",
  occurred_at: `2026-10-17T${["08:42", "08:47", "08:49", "09:00", "09:12", "09:25", "10:10", "11:40"][i]}:00Z`,
  fictional: true,
}));
export const connections = [
  ["ev-01", "ev-02", "prompted review"],
  ["ev-02", "ev-03", "followed by"],
  ["ev-03", "ev-05", "access denied"],
  ["ev-04", "ev-05", "explains absence"],
  ["ev-06", "ev-02", "preserves"],
  ["ev-07", "ev-05", "protects"],
  ["ev-05", "ev-08", "supports conclusion"],
].map(([source, target, label], i) => ({
  id: `edge-${i}`,
  case_id: story.id,
  source,
  target,
  label,
}));
export function publicStory() {
  return {
    case: story,
    evidence: documents.map((e) => ({
      ...e,
      content: e.classification === "PUBLIC" ? e.content : undefined,
      locked: e.classification !== "PUBLIC",
    })),
    timeline,
    connections,
  };
}
