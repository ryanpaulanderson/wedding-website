import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { createPasswordHash, MAX_PASSWORD_LENGTH } from "../src/lib/credential-security";

const MIN_ADMIN_PASSWORD_LENGTH = 16;

function removeLastCharacter(value: string): string {
  return Array.from(value).slice(0, -1).join("");
}

function readHiddenLine(prompt: string): Promise<string> {
  const input = process.stdin;
  const output = process.stdout;

  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    return Promise.reject(new Error("Run this command in an interactive terminal."));
  }

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (result?: string, error?: Error) => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      output.write("\n");

      if (error) {
        reject(error);
        return;
      }

      resolve(result ?? "");
    };

    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          finish(undefined, new Error("Credential generation cancelled."));
          return;
        }

        if (character === "\r" || character === "\n") {
          finish(value);
          return;
        }

        if (character === "\u007F" || character === "\b") {
          if (value.length > 0) {
            value = removeLastCharacter(value);
            output.write("\b \b");
          }
          continue;
        }

        if (character >= " " && character !== "\u007F") {
          value += character;
          output.write("*");
        }
      }
    };

    output.write(prompt);
    input.setEncoding("utf8");
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

export function validateAdminPassphrase(password: string): string | null {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `The admin passphrase must contain at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return `The admin passphrase cannot exceed ${MAX_PASSWORD_LENGTH} characters.`;
  }

  return null;
}

async function main() {
  const password = await readHiddenLine("Admin passphrase: ");
  const validationError = validateAdminPassphrase(password);

  if (validationError) {
    throw new Error(validationError);
  }

  const confirmation = await readHiddenLine("Confirm passphrase: ");

  if (confirmation !== password) {
    throw new Error("The passphrases did not match.");
  }

  const passwordHash = await createPasswordHash(password);
  const sessionSecret = randomBytes(32).toString("base64url");

  process.stdout.write(
    [
      "\nSet these values in exactly one private environment. Do not commit them:",
      `ADMIN_PASSWORD_HASH=\"${passwordHash}\"`,
      `ADMIN_SESSION_SECRET=\"${sessionSecret}\"`,
      "",
    ].join("\n"),
  );
}

const isEntryPoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isEntryPoint) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Credential generation failed.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
