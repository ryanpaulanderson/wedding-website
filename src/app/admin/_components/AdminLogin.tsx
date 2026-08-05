import { signInToAdmin } from "../actions";
import styles from "./AdminLogin.module.css";

type AdminLoginProps = {
  hasPasswordError: boolean;
  isUnavailable: boolean;
};

export function AdminLogin({ hasPasswordError, isUnavailable }: AdminLoginProps) {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#admin-login">
        Skip to admin sign in
      </a>

      <main className={styles.main} id="admin-login">
        <section className={styles.card} aria-labelledby="admin-title">
          <div className={styles.brand} aria-hidden="true">
            C<span>/</span>R
          </div>
          <p className={styles.eyebrow}>Private administration</p>
          <h1 id="admin-title">Admin portal</h1>
          <p className={styles.intro}>
            Sign in with the dedicated admin passphrase to manage wedding responses.
          </p>

          {isUnavailable ? (
            <div className={styles.notice} role="alert">
              <p>Admin access is unavailable.</p>
              <p>Configure the private admin credentials for this environment and redeploy.</p>
            </div>
          ) : (
            <form className={styles.form} action={signInToAdmin}>
              <label className={styles.label} htmlFor="admin-password">
                Admin passphrase
              </label>
              <input
                aria-describedby={hasPasswordError ? "admin-password-error" : "admin-password-hint"}
                aria-invalid={hasPasswordError || undefined}
                autoComplete="current-password"
                autoFocus={hasPasswordError}
                className={styles.input}
                id="admin-password"
                maxLength={256}
                name="password"
                required
                type="password"
              />
              <p className={styles.hint} id="admin-password-hint">
                This is separate from the private-preview password.
              </p>
              {hasPasswordError ? (
                <p className={styles.error} id="admin-password-error" role="alert">
                  Unable to sign in with those credentials.
                </p>
              ) : null}
              <button className={styles.button} type="submit">
                Sign in
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
