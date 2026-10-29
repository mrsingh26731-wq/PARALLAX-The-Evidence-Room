import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-mark">
        P<span> /</span>
      </span>
      PARALLAX<small>THE EVIDENCE ROOM</small>
    </Link>
  );
}
function Heading({ eyebrow, title, children, action }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading" role="status">
      <div />
      <span>Opening the archive…</span>
    </div>
  );
}
function ErrorNote({ error }) {
  return error ? (
    <div className="error" role="alert">
      {error.message}
    </div>
  ) : null;
}
function Modal({ title, close, children }) {
  const ref = React.useRef();
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    function key(e) {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = ref.current.querySelectorAll(
          "button,input,select,textarea,a[href]",
        );
        if (!els.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      old?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button aria-label="Close dialog" onClick={close}>
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function Form({ fields, submit, label }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: Object.fromEntries(
      fields.map(([k, l, t, v]) => [k, v || ""]),
    ),
  });
  return (
    <form
      onSubmit={handleSubmit(async (b) => {
        try {
          await submit(b);
        } catch {}
      })}
    >
      {fields.map(([key, label, type]) => (
        <label key={key}>
          {label}
          {Array.isArray(type) ? (
            <select {...register(key)} required>
              {type.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea required {...register(key)} />
          ) : (
            <input type={type} required {...register(key)} />
          )}
        </label>
      ))}
      <button className="button outline" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : label}
      </button>
    </form>
  );
}
export { Brand, Heading, Loading, ErrorNote, Modal, Form };
