import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowRight,
  Lock,
  FileText,
  KeyRound,
  Check,
  Download,
} from "lucide-react";
import { api } from "./api";
import { useApp } from "./context";
import { Heading, ErrorNote } from "./components";
const missions = [
  [
    "The first signal",
    "Open “The first signal” in the board. The server records an authorized read.",
    "board",
  ],
  [
    "Who had access?",
    "Inspect “The sealed report” and follow the server’s Access X-Ray.",
    "board",
  ],
  [
    "The query that failed",
    "Replay a quoted attack sample through the protected database query.",
    "replay",
  ],
  [
    "The sealed report",
    "Recover the synthetic Cipher Room exhibit, then answer the check below.",
    "cipher",
  ],
  [
    "The final verdict",
    "Submit a supported conclusion after completing the first four chapters.",
    "report",
  ],
];
function Missions({ guest, c, base }) {
  const { run } = useApp();
  const q = useQuery({
    queryKey: ["progress", c],
    queryFn: () => api(`/cases/${c}/progress`),
    enabled: !guest,
  });
  const [answer, setAnswer] = useState("");
  return (
    <>
      <Heading
        eyebrow="GUIDED INVESTIGATION / 8–15 MINUTES"
        title="Follow the evidence."
      >
        Five chapters. Build your conclusion on what the records actually show.
      </Heading>
      <div className="content-panel">
        <div className="progress-strip">
          <span>
            {guest
              ? "PUBLIC WALKTHROUGH"
              : `${q.data?.length || 0} / 5 CHAPTERS VERIFIED`}
          </span>
          <div>
            {missions.map((_, i) => (
              <i
                key={i}
                className={
                  q.data?.some((p) => p.chapter === i + 1) ? "done" : ""
                }
              />
            ))}
          </div>
        </div>
        <ErrorNote error={q.error} />
        {missions.map(([t, d, p], i) => (
          <div className="mission" key={t}>
            <span className="mission-number">0{i + 1}</span>
            <div>
              <span className="eyebrow">
                {q.data?.some((x) => x.chapter === i + 1)
                  ? "VERIFIED BY SERVER"
                  : "CHAPTER " + String(i + 1).padStart(2, "0")}
              </span>
              <h2>{t}</h2>
              <p>{d}</p>
            </div>
            <Link
              className="round-button"
              aria-label={"Open " + t}
              to={`${base}/${p}?case=${c}`}
            >
              <ArrowUpRight />
            </Link>
          </div>
        ))}
        {guest ? (
          <p className="demo-note">
            Guest exploration does not persist chapter completion. Sign in to
            save verified progress.
          </p>
        ) : (
          <div className="knowledge-check">
            <h3>Chapter 04 · Check your understanding</h3>
            <label>
              Why does the database snapshot alone not reveal plaintext?
              <select
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              >
                <option value="">Choose your answer</option>
                <option value="base64">
                  Base64 hides the message securely
                </option>
                <option value="key-outside-database">
                  The encryption key is held outside the database
                </option>
                <option value="hash-is-encryption">
                  The SHA-256 hash decrypts the text
                </option>
              </select>
            </label>
            <button
              className="button primary"
              disabled={!answer}
              onClick={() =>
                run(
                  () =>
                    api(`/cases/${c}/check`, "POST", {
                      answer,
                    }),
                  "Chapter verified",
                ).catch(() => {})
              }
            >
              Check answer <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
function Report({ guest, story, c }) {
  const { run } = useApp(),
    [report, setReport] = useState(null),
    [finding, setFinding] = useState(""),
    [conclusion, setConclusion] = useState("");
  return (
    <>
      <Heading
        eyebrow="INVESTIGATION / CONCLUSION"
        title="The final verdict."
        action={
          <button
            className="button outline"
            disabled={!report}
            onClick={() => window.print()}
          >
            <Download size={16} /> Print / save PDF
          </button>
        }
      >
        A conclusion is only as strong as the evidence behind it.
      </Heading>
      <div className="content-panel">
        <div className="verdict-layout">
          <div>
            <span className="eyebrow">CASE 074 / RECONSTRUCT THE INCIDENT</span>
            <h2>
              Missing does not
              <br />
              <em>mean stolen.</em>
            </h2>
            <p>
              The search log, access ledger and classification trail each answer
              a different question. What do they establish together?
            </p>
            <ul className="findings-list">
              <li>
                <Check size={17} /> Query input remained data
              </li>
              <li>
                <Lock size={17} /> Restricted reads required clearance
              </li>
              <li>
                <KeyRound size={17} /> Confidential content was encrypted
              </li>
            </ul>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!guest)
                await run(
                  () =>
                    api(`/cases/${c}/verdict`, "POST", {
                      finding,
                      conclusion,
                    }),
                  "Verdict saved",
                ).catch(() => {});
            }}
          >
            <label>
              What happened to the missing report?
              <select
                required
                value={finding}
                onChange={(e) => setFinding(e.target.value)}
              >
                <option value="">Choose a finding</option>
                <option value="reclassified">
                  It was moved to a restricted classification
                </option>
                <option value="exfiltrated">
                  The SQL injection extracted it
                </option>
                <option value="deleted">It was permanently deleted</option>
              </select>
            </label>
            <label>
              Your reasoning
              <textarea
                required
                minLength={10}
                maxLength={4000}
                rows={5}
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="Connect the access ledger, query result and classification change…"
              />
            </label>
            {guest ? (
              <p className="small">
                Sign in to submit and preserve your conclusion.
              </p>
            ) : (
              <button className="button primary">
                Submit conclusion <ArrowRight size={16} />
              </button>
            )}
          </form>
        </div>
        <button
          className="button outline"
          onClick={() =>
            guest
              ? setReport({
                  case: story?.case,
                  records:
                    story?.evidence?.map((e) => ({
                      ...e,
                      content: e.content || "[REDACTED — public preview]",
                    })) || [],
                  fictional: true,
                  generatedAt: new Date().toISOString(),
                  conclusion:
                    finding === "reclassified"
                      ? conclusion
                      : "Guest draft — not verified",
                })
              : run(() => api(`/cases/${c}/report`))
                  .then(setReport)
                  .catch(() => {})
          }
        >
          Generate authorized report <FileText size={16} />
        </button>
        {report && (
          <article className="print-report">
            <div className="eyebrow">
              PARALLAX /{" "}
              {report.fictional ? "FICTIONAL SCENARIO" : "CASE REPORT"}
            </div>
            <h2>{report.case?.title}</h2>
            <p>Generated {new Date(report.generatedAt).toLocaleString()}</p>
            {report.conclusion && <blockquote>{report.conclusion}</blockquote>}
            {report.records.map((e) => (
              <section key={e.id}>
                <span className="classification">{e.classification}</span>
                <h3>{e.title}</h3>
                <p>{e.content}</p>
              </section>
            ))}
          </article>
        )}
      </div>
    </>
  );
}
export { Missions, Report };
