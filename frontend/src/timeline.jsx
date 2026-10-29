import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { api } from "./api";
import { Heading, ErrorNote } from "./components";
function Timeline({ guest, story, c, base }) {
  const [date, setDate] = useState("2026-10-17"),
    [selected, setSelected] = useState(null);
  const q = useQuery({
    queryKey: ["timeline", c],
    queryFn: () => api(`/cases/${c}/timeline`),
    enabled: !guest,
  });
  const es = guest ? story?.timeline : q.data;
  return (
    <>
      <Heading eyebrow="THE ORDER OF EVENTS" title="A trail through time.">
        Read the sequence. Separate a suspicious attempt from a successful
        breach.
      </Heading>
      <div className="content-panel">
        <div className="timeline-toolbar">
          <span className="eyebrow">FICTIONAL SCENARIO EVENTS</span>
          <label>
            Date{" "}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button className="text-link" onClick={() => setDate("")}>
            Show all
          </button>
        </div>
        <ErrorNote error={q.error} />
        <div className="timeline">
          {(es || [])
            .filter((e) => !date || e.occurred_at.startsWith(date))
            .map((e, i) => (
              <button
                className={selected?.id === e.id ? "event selected" : "event"}
                key={e.id}
                onClick={() => setSelected(e)}
              >
                <time>
                  {new Date(e.occurred_at).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  })}
                  <small>UTC</small>
                </time>
                <span className="event-dot" />
                <div>
                  <span className="eyebrow">
                    EVENT {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3>{e.title}</h3>
                  <p>{e.description}</p>
                </div>
                <ArrowUpRight size={20} />
              </button>
            ))}
        </div>
        {!es?.length && (
          <p>
            No scenario events for this case. Actual activity appears in Custody
            & audit.
          </p>
        )}
        {selected && (
          <div className="timeline-detail">
            <span className="eyebrow">
              RELATED RECORD / {selected.evidence_id}
            </span>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <Link
              className="button outline"
              to={`${base}/board?case=${c}&evidence=${selected.evidence_id}`}
            >
              Inspect in the evidence board <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
export { Timeline };
