# Renders docs/pitch/deck.html to a 16:9 PDF on the Desktop.
#
#   powershell -File scripts/build-deck.ps1
#
# Headless Chrome rather than the print dialog: the dialog defaults to A4 with
# margins and background graphics OFF, which silently drops every background
# colour in the deck and letterboxes 16:9 pages onto portrait paper.
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" }
$src = Join-Path $PSScriptRoot "..\docs\pitch\deck.html" | Resolve-Path
$out = Join-Path ([Environment]::GetFolderPath("Desktop")) "Rukhsat-Pitch-Deck.pdf"

# -replace takes a regex, so a lone backslash is an invalid pattern — escape it.
$url = "file:///" + ($src.Path -replace '\\', '/')

& $chrome --headless --disable-gpu --no-pdf-header-footer `
  --virtual-time-budget=10000 `
  --print-to-pdf="$out" $url

if (Test-Path $out) { Write-Output "written: $out" } else { Write-Output "FAILED" }
