import { useState } from "react";
import {
  ArrowRight,
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
  Eye,
} from "lucide-react";
import { api } from "./api";
import { useApp } from "./context";
import { Heading } from "./components";
function Replay({ guest, c }) {
  const { run } = useApp(),
    [input, setInput] = useState("' OR '1'='1"),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false);
  const attack = /\bor\b|--|;|union/i.test(input);
  const toyRows = /^'\s+OR\s+'1'\s*=\s*'1$/i.test(input.trim())
    ? ["Northline incident summary", "Preserved request log", "Archive index"]
    : input === "Northline incident summary"
      ? [input]
      : [];
  return (
    <>
      <Heading eyebrow="SECURITY EXHIBIT / 02" title="The query that failed.">
        One input. Two ways of reading it. Only one keeps data in its place.
      </Heading>
      <div className="content-panel">
        <div className="exhibit-intro">
          <span className="number-watermark">02</span>
          <span className="eyebrow">BREACH REPLAY · THE MALFORMED QUERY</span>
          <h2>
            What if a search
            <br />
            <em>became an instruction?</em>
          </h2>
          <p>
            At 08:47, an unfamiliar search string entered the Northline archive.
            Reconstruct how the protected database handled it.
          </p>
        </div>
        <div className="query-input">
          <label>
            INTERCEPTED INPUT
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={160}
            />
          </label>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setResult(
                  guest
                    ? {
                        query:
                          "SELECT id, label FROM demo_records WHERE label = $1",
                        parameters: [input],
                        rows:
                          input === "Northline incident summary"
                            ? [
                                {
                                  id: 1,
                                  label: input,
                                },
                              ]
                            : [],
                        simulated: true,
                      }
                    : await run(() =>
                        api("/lab/query", "POST", {
                          input,
                        }),
                      ),
                );
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Inspecting…" : "Replay input"}
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="preset-row">
          <span>TRY A SAMPLE</span>
          {[
            "' OR '1'='1",
            "Northline incident summary",
            "'; DROP TABLE evidence; --",
          ].map((x) => (
            <button
              key={x}
              onClick={() => {
                setInput(x);
                setResult(null);
              }}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="split-exhibit">
          <section className="unsafe">
            <span className="eyebrow">
              UNSAFE CONSTRUCTION / SIMULATION ONLY
            </span>
            <h3>When the boundary disappears.</h3>
            <pre>{`SELECT * FROM records\nWHERE label = '${input}'`}</pre>
            <p>
              {attack
                ? "This illustrative string would mix untrusted input with query syntax. No vulnerable SQL is executed."
                : "Ordinary input can appear safe; concatenating it still creates an unsafe design."}
            </p>
            <p className="toy-parser">
              Toy-parser illustration: {toyRows.length} synthetic matches.{" "}
              {toyRows.length > 1
                ? "The exact OR tautology preset broadens selection."
                : "Other syntax is not interpreted."}{" "}
              This deliberately limited simulation is not a SQL engine.
            </p>
            <span className="classification restricted">
              ILLUSTRATION — NEVER EXECUTED
            </span>
          </section>
          <section className="safe">
            <span className="eyebrow">PARALLAX / PARAMETERIZED QUERY</span>
            <h3>A value stays a value.</h3>
            <pre>
              SELECT id, label FROM demo_records
              <br />
              WHERE label = <strong>$1</strong>
            </pre>
            <div className="parameter">
              <span>$1</span>
              <code>{input}</code>
              <Lock size={16} />
            </div>
            {result ? (
              <>
                <p>
                  <b>{result.rows.length} matching records.</b>{" "}
                  {result.simulated
                    ? "Static guest illustration. Sign in to run the real PostgreSQL query."
                    : "Executed by PostgreSQL with a bound parameter."}
                </p>
                {result.rows.map((r) => (
                  <p key={r.id}>{r.label}</p>
                ))}
              </>
            ) : (
              <p>Replay the input to inspect the result.</p>
            )}
          </section>
        </div>
        <div className="exhibit-foot">
          <ShieldCheck />
          <p>
            <b>The protection is structural.</b> The input is passed separately
            from SQL. This is not a filter that guesses which words look
            malicious.
          </p>
        </div>
      </div>
    </>
  );
}
function Cipher({ guest }) {
  const { run } = useApp(),
    [data, setData] = useState(null),
    [answer, setAnswer] = useState("key-outside-database");
  return (
    <>
      <Heading
        eyebrow="SECURITY EXHIBIT / 03"
        title="What lies behind the seal."
      >
        A document can exist in the database without revealing what it says.
      </Heading>
      <div className="content-panel">
        <div className="cipher-art">
          <div className="cipher-sheet">
            <span className="eyebrow">SYNTHETIC EXHIBIT / NO PRIVATE DATA</span>
            <h2>
              Readable by permission.
              <br />
              <em>Protected by design.</em>
            </h2>
            <div className="cipher-lines">
              {data?.envelope
                ? data.envelope.ciphertext
                : "a3f9 · 74ce · 819b · 20a1 · 5fd8 · 32be"}
            </div>
            <div className="cipher-seal">
              <KeyRound size={28} />
              <span>
                AES
                <br />
                256 GCM
              </span>
            </div>
          </div>
          <aside>
            <span className="eyebrow">AUTHENTICATED ENCRYPTION</span>
            <h3>
              Three parts.
              <br />
              One protected record.
            </h3>
            <p>
              A fresh nonce makes each encryption distinct. The authentication
              tag rejects altered ciphertext. The key stays on the server.
            </p>
            <button
              className="button primary"
              onClick={() =>
                guest
                  ? setData({
                      synthetic: true,
                      illustration: true,
                      plaintext: "Synthetic archive exhibit",
                      recovered: "Synthetic archive exhibit",
                      verified: true,
                    })
                  : run(() =>
                      api("/lab/cipher", "POST", {
                        tamper: false,
                      }),
                    )
                      .then(setData)
                      .catch(() => {})
              }
            >
              Recover exhibit <Unlock size={16} />
            </button>
            <button
              className="text-link"
              onClick={() =>
                guest
                  ? setData({
                      illustration: true,
                      verified: false,
                    })
                  : run(() =>
                      api("/lab/cipher", "POST", {
                        tamper: true,
                      }),
                    )
                      .then(setData)
                      .catch(() => {})
              }
            >
              Alter the tag & try again <ArrowRight size={16} />
            </button>
          </aside>
        </div>
        {guest && (
          <div className="demo-note">
            Guest mode is an illustration. Sign in for actual server-side
            encryption and authenticated recovery.
          </div>
        )}
        {data && (
          <div className="cipher-result">
            <h3>
              {data.verified
                ? "Authorized recovery complete"
                : "Recovery rejected — authentication failed"}
            </h3>
            <p>{data.recovered || "No plaintext returned."}</p>
            {data.envelope && (
              <pre>{JSON.stringify(data.envelope, null, 2)}</pre>
            )}
          </div>
        )}
        <RoleLab />
        <div className="glossary">
          {[
            ["Plaintext", "The readable content before encryption."],
            ["Ciphertext", "Encrypted bytes, Base64-encoded for storage."],
            ["Nonce", "12 fresh random bytes for each encryption."],
            [
              "Authentication tag",
              "Detects tampering with the ciphertext or context.",
            ],
            ["Server key", "A 256-bit secret outside the database."],
            ["Permission", "Checked before actual evidence is decrypted."],
          ].map(([t, d]) => (
            <div key={t}>
              <span>{t}</span>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function RoleLab() {
  const [rows, setRows] = useState(null);
  const { notify } = useApp();
  return (
    <section className="role-lab">
      <div className="section-head">
        <div>
          <span className="eyebrow">ACCESS X-RAY / ROLE COMPARISON LAB</span>
          <h3>Same record. Different clearance.</h3>
        </div>
        <button
          className="button outline"
          onClick={async () => {
            try {
              setRows(await api("/lab/roles"));
            } catch (e) {
              notify(e.message);
            }
          }}
        >
          Compare synthetic roles <Eye size={16} />
        </button>
      </div>
      <p className="small">
        Read-only policy evaluation of a synthetic restricted record. Every
        synthetic role has case membership; none has a grant. This does not
        switch your real account.
      </p>
      {rows && (
        <div className="role-results">
          {rows.map((r) => (
            <div key={r.role}>
              <b>{r.role}</b>
              <span className={r.decision.allowed ? "allow" : "deny"}>
                {r.decision.allowed ? "GRANTED" : "DENIED"}
              </span>
              <p>
                {r.decision.allowed
                  ? "Administrator clearance includes restricted records."
                  : "A valid record-specific access grant is required."}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
export { Replay, Cipher };
