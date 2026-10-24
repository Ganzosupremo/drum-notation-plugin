<#
.SYNOPSIS
    Separa la batería de una canción y la transcribe a un .mid para el plugin.

.EXAMPLE
    .\transcribe-drums.ps1 "C:\Musica\cancion.mp3"
    .\transcribe-drums.ps1 "C:\Musica\cancion.mp3" -Bpm 66 -KeepStem
    .\transcribe-drums.ps1 "C:\Musica\bateria.wav" -NoSeparate -OutDir "C:\Obsidian\Vault\midi"
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Audio,
    [string]$OutDir,
    [double]$Bpm,
    [switch]$NoSeparate,
    [switch]$KeepStem,
    [switch]$NoWarp,
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
$Image = "drum-transcription"

$audioFile = Get-Item -LiteralPath $Audio
if (-not $OutDir) { $OutDir = $audioFile.DirectoryName }
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$outPath = (Resolve-Path -LiteralPath $OutDir).Path

if ($Rebuild -or -not (docker images -q $Image)) {
    Write-Host "Construyendo la imagen $Image (la primera vez tarda bastante)..."
    docker build -t $Image $PSScriptRoot
    if ($LASTEXITCODE -ne 0) { throw "docker build falló" }
}

$containerArgs = @("/in/$($audioFile.Name)", "--output-dir", "/out")
if ($Bpm) { $containerArgs += @("--bpm", "$Bpm") }
if ($NoSeparate) { $containerArgs += "--no-separate" }
if ($KeepStem) { $containerArgs += "--keep-stem" }
if ($NoWarp) { $containerArgs += "--no-warp" }

docker run --rm `
    -v "$($audioFile.DirectoryName):/in:ro" `
    -v "${outPath}:/out" `
    $Image @containerArgs
if ($LASTEXITCODE -ne 0) { throw "La transcripción falló" }
