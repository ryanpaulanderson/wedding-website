// Test-only TLS proxy in front of the normal Next.js production server.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";

const certificateDirectory = mkdtempSync(join(tmpdir(), "wedding-admin-https-"));
const keyPath = join(certificateDirectory, "key.pem");
const certificatePath = join(certificateDirectory, "certificate.pem");
const configPath = join(certificateDirectory, "openssl.cnf");
writeFileSync(
  configPath,
  `[req]
prompt = no
distinguished_name = subject
x509_extensions = extensions
[subject]
CN = 127.0.0.1
[extensions]
subjectAltName = IP:127.0.0.1
`,
);
try {
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-config",
      configPath,
      "-keyout",
      keyPath,
      "-out",
      certificatePath,
    ],
    { stdio: "ignore" },
  );
} catch (error) {
  rmSync(certificateDirectory, { recursive: true, force: true });
  throw error;
}

const application = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3001"],
  { stdio: "inherit", env: process.env },
);
const proxy = https.createServer(
  { key: readFileSync(keyPath), cert: readFileSync(certificatePath) },
  (request, response) => {
    const upstream = http.request(
      {
        hostname: "127.0.0.1",
        port: 3001,
        method: request.method,
        path: request.url,
        headers: { ...request.headers, "x-forwarded-proto": "https" },
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    request.on("aborted", () => upstream.destroy());
    request.pipe(upstream);
  },
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  proxy.close();
  proxy.closeAllConnections();
  application.kill("SIGTERM");
  rmSync(certificateDirectory, { recursive: true, force: true });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
application.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
  stop();
});
application.on("exit", (code) => {
  if (!stopping) process.exitCode = code || 1;
  stop();
});
proxy.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
  stop();
});
proxy.listen(3443, "127.0.0.1");
