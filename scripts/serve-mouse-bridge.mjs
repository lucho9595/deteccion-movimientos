import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { extname, join, normalize, resolve } from "node:path";

const port = Number(process.argv[2] ?? 5194);
const root = resolve("dist");
const powershell = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

const mouseType = `
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class MouseBridgeNative {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
'@;
`;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
};

createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      send(response, 204, "");
      return;
    }

    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

    if (url.pathname === "/api/health") {
      send(response, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/mouse/move" && request.method === "POST") {
      const body = await readJson(request);
      await runPowerShell(`${mouseType}
        [MouseBridgeNative]::SetCursorPos(${Math.max(0, Math.round(Number(body.x)))}, ${Math.max(0, Math.round(Number(body.y)))}) | Out-Null;
      `);
      send(response, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
      return;
    }

    if (url.pathname === "/api/mouse/click" && request.method === "POST") {
      await runPowerShell(`${mouseType}
        [MouseBridgeNative]::mouse_event(0x0002,0,0,0,[UIntPtr]::Zero);
        Start-Sleep -Milliseconds 45;
        [MouseBridgeNative]::mouse_event(0x0004,0,0,0,[UIntPtr]::Zero);
      `);
      send(response, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
      return;
    }

    serveFile(response, url.pathname);
  } catch (error) {
    send(response, 500, error instanceof Error ? error.message : "Unknown error");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Mouse bridge serving ${root} at http://127.0.0.1:${port}`);
});

function send(response, status, body, contentType = "text/plain; charset=utf-8") {
  const bytes = Buffer.from(body);
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": contentType,
    "Content-Length": bytes.length,
  });
  response.end(bytes);
}

function serveFile(response, pathname) {
  const normalized = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(root, normalized);

  if (!filePath.startsWith(root)) {
    send(response, 403, "Forbidden");
    return;
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(root, "index.html");
  }

  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => {
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    execFile(
      powershell,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { windowsHide: false },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }
        resolve();
      },
    );
  });
}
