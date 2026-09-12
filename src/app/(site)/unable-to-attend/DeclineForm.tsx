"use client";
import { useActionState, useEffect, useRef } from "react";
import { submitEarlyDecline } from "./actions";
import type { DeclineFormState } from "@/features/early-declines/validation";
import styles from "./DeclineForm.module.css";

const initialState: DeclineFormState = { status: "idle", values: { names: "", email: "" } };
export function DeclineForm() {
  const [state, action, pending] = useActionState(submitEarlyDecline, initialState);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status !== "idle") feedback.current?.focus();
  }, [state]);
  if (state.status === "success")
    return (
      <div className={styles.success} tabIndex={-1} ref={feedback} role="status">
        <h2>Thank you for letting us know.</h2>
        <p>
          We’re sorry you won’t be able to celebrate with us. Your notice has been recorded. If
          you’ve already submitted with this email address, we’ve kept your original notice.
        </p>
        <p>
          If your plans change or you need to update the names, please email Ryan at{" "}
          <a href="mailto:ryan@ryanpaulanderson.com">ryan@ryanpaulanderson.com</a>.
        </p>
      </div>
    );
  return (
    <form action={action} className={styles.form}>
      {state.status === "error" && (
        <div ref={feedback} tabIndex={-1} role="alert" className={styles.error}>
          <p>{state.message ?? "Please check the highlighted fields below."}</p>
        </div>
      )}
      <div>
        <label htmlFor="decline-names">Name(s) unable to attend (required)</label>
        <p id="names-hint">Include everyone you’re replying for, up to 1,000 characters.</p>
        <textarea
          id="decline-names"
          name="names"
          autoComplete="name"
          required
          maxLength={1000}
          rows={4}
          defaultValue={state.values.names}
          aria-invalid={Boolean(state.errors?.names)}
          aria-describedby={`names-hint${state.errors?.names ? " names-error" : ""}`}
        />
        {state.errors?.names && (
          <p id="names-error" className={styles.error}>
            {state.errors.names}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="decline-email">Email address (required)</label>
        <p id="email-hint">
          We’ll send a confirmation here. Please submit once for everyone listed above.
        </p>
        <input
          id="decline-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          defaultValue={state.values.email}
          aria-invalid={Boolean(state.errors?.email)}
          aria-describedby={`email-hint${state.errors?.email ? " email-error" : ""}`}
        />
        {state.errors?.email && (
          <p id="email-error" className={styles.error}>
            {state.errors.email}
          </p>
        )}
      </div>
      <p className={styles.privacy}>
        We’ll use these details to update our invitation plans and contact you about this notice.
      </p>
      <button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Let us know"}
      </button>
      <p aria-live="polite">{pending ? "Saving your notice…" : ""}</p>
    </form>
  );
}
