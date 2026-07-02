param(
  [int]$Port = 5193
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path "dist").Path

Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class MouseBridge {
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);

  [DllImport("user32.dll")]
  public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

  [DllImport("user32.dll")]
  public static extern int GetSystemMetrics(int nIndex);
}
"@

$MOUSEEVENTF_LEFTDOWN = 0x0002
$MOUSEEVENTF_LEFTUP = 0x0004

function Write-Text($Response, [int]$Status, [string]$Text, [string]$ContentType = "text/plain; charset=utf-8") {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $Response.StatusCode = $Status
  $Response.ContentType = $ContentType
  $Response.Headers.Add("Access-Control-Allow-Origin", "*")
  $Response.Headers.Add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.Close()
}

function Get-BodyJson($Request) {
  $reader = New-Object System.IO.StreamReader($Request.InputStream, $Request.ContentEncoding)
  $raw = $reader.ReadToEnd()
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @{}
  }
  return $raw | ConvertFrom-Json
}

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".wasm" { "application/wasm" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    default { "application/octet-stream" }
  }
}

function Serve-File($Response, [string]$RelativePath) {
  $clean = [System.Uri]::UnescapeDataString($RelativePath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($clean)) {
    $clean = "index.html"
  }

  $full = [System.IO.Path]::GetFullPath((Join-Path $Root $clean))
  if (-not $full.StartsWith($Root)) {
    Write-Text $Response 403 "Forbidden"
    return
  }

  if (-not (Test-Path $full -PathType Leaf)) {
    $full = Join-Path $Root "index.html"
  }

  $bytes = [System.IO.File]::ReadAllBytes($full)
  $Response.StatusCode = 200
  $Response.ContentType = Get-ContentType $full
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.Close()
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "Mouse bridge serving $Root at http://127.0.0.1:$Port"

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  $path = $request.Url.AbsolutePath

  try {
    if ($request.HttpMethod -eq "OPTIONS") {
      Write-Text $response 204 ""
      continue
    }

    if ($path -eq "/api/health") {
      Write-Text $response 200 '{"ok":true}' "application/json; charset=utf-8"
      continue
    }

    if ($path -eq "/api/mouse/move" -and $request.HttpMethod -eq "POST") {
      $body = Get-BodyJson $request
      $x = [Math]::Max(0, [int]$body.x)
      $y = [Math]::Max(0, [int]$body.y)
      [MouseBridge]::SetCursorPos($x, $y) | Out-Null
      Write-Text $response 200 '{"ok":true}' "application/json; charset=utf-8"
      continue
    }

    if ($path -eq "/api/mouse/click" -and $request.HttpMethod -eq "POST") {
      [MouseBridge]::mouse_event($MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
      Start-Sleep -Milliseconds 45
      [MouseBridge]::mouse_event($MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
      Write-Text $response 200 '{"ok":true}' "application/json; charset=utf-8"
      continue
    }

    Serve-File $response $path
  } catch {
    Write-Text $response 500 ("Error: " + $_.Exception.Message)
  }
}
