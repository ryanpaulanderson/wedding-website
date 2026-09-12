export type DeclineValues = { names: string; email: string };
export type DeclineFormState = {
  status: "idle" | "error" | "success";
  values: DeclineValues;
  errors?: Partial<DeclineValues>;
  message?: string;
};
export function validateDecline(input: { names: unknown; email: unknown }): DeclineFormState {
  const values = {
    names: typeof input.names === "string" ? input.names.trim() : "",
    email: typeof input.email === "string" ? input.email.trim().toLowerCase() : "",
  };
  const errors: Partial<DeclineValues> = {};
  if (
    !values.names ||
    values.names.length > 1000 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(values.names)
  ) {
    errors.names = "Please enter the names of everyone unable to attend (up to 1,000 characters).";
  }
  const emailParts = values.email.split("@");
  if (
    values.email.length > 254 ||
    emailParts.length !== 2 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}$/.test(emailParts[0]) ||
    emailParts[0].startsWith(".") ||
    emailParts[0].endsWith(".") ||
    emailParts[0].includes("..") ||
    !emailParts[1]?.includes(".") ||
    !emailParts[1].split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    errors.email = "Please enter a valid email address.";
  }
  return { status: Object.keys(errors).length ? "error" : "idle", values, errors };
}
