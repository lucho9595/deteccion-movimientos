$ErrorActionPreference = "Continue"
$CommandFile = Join-Path (Get-Location).Path ".mouse-command.json"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class MouseAgentNative {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
"@

$lastSeq = ""
Write-Host "Mouse Windows activo. Deja esta ventana abierta."
Write-Host "Archivo de comandos: $CommandFile"

while ($true) {
  if (Test-Path $CommandFile) {
    $raw = Get-Content -Raw $CommandFile
    if (-not [string]::IsNullOrWhiteSpace($raw)) {
      $command = $raw | ConvertFrom-Json
      $seq = "$($command.seq)"

      if ($seq -ne $lastSeq) {
        $lastSeq = $seq

        if ($command.type -eq "move") {
          [MouseAgentNative]::SetCursorPos([int]$command.x, [int]$command.y) | Out-Null
        }

        if ($command.type -eq "click") {
          [MouseAgentNative]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
          Start-Sleep -Milliseconds 45
          [MouseAgentNative]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
        }
      }
    }
  }

  Start-Sleep -Milliseconds 16
}
