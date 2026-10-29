import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { api } from "./api";
import { useApp } from "./context";
import { Modal } from "./components";
function EvidenceForm({ c, initial, close }) {
  const { run, user } = useApp(),
    {
      register,
      handleSubmit,
      formState: { isSubmitting },
    } = useForm({
      defaultValues: initial || {
        category: "DOCUMENT",
        classification: "INTERNAL",
      },
    });
  return (
    <Modal title={initial ? "Revise evidence" : "Add a record"} close={close}>
      <form
        onSubmit={handleSubmit(async (b) => {
          try {
            await run(
              () =>
                api(
                  initial ? `/evidence/${initial.id}` : `/cases/${c}/evidence`,
                  initial ? "PATCH" : "POST",
                  {
                    ...b,
                    ...(initial
                      ? {
                          version: initial.version,
                          classification:
                            user.role === "ADMIN"
                              ? b.classification
                              : initial.classification,
                        }
                      : {}),
                  },
                ),
              "Evidence saved",
            );
            close();
          } catch {}
        })}
      >
        <label>
          Public metadata title
          <input required maxLength={160} {...register("title")} />
        </label>
        <div className="form-grid">
          <label>
            Category
            <select {...register("category")}>
              {[
                "DOCUMENT",
                "PERSON",
                "EVENT",
                "ACCESS",
                "DATABASE",
                "FINDING",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Classification
            <select
              {...register("classification")}
              disabled={!!initial && user.role !== "ADMIN"}
            >
              {["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]
                .filter(
                  (x) =>
                    x !== "RESTRICTED" ||
                    user.role === "ADMIN" ||
                    initial?.classification === x,
                )
                .map((x) => (
                  <option key={x}>{x}</option>
                ))}
            </select>
          </label>
        </div>
        <label>
          Protected content
          <textarea
            rows={8}
            required
            maxLength={12000}
            {...register("content")}
          />
        </label>
        <p className="small">
          Titles are visible to case members. Keep sensitive information in the
          encrypted content field.
        </p>
        <button disabled={isSubmitting} className="button primary">
          {isSubmitting ? "Saving…" : "Save record"}
          <ArrowRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
export { EvidenceForm };
