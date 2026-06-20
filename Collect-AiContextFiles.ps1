param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$Paths
)

$ErrorActionPreference = "Stop"

$Name = "AiContext"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$runDir = (Get-Location).Path

function Find-RepoRoot {
    param([string]$StartPath)

    $current = Get-Item (Resolve-Path $StartPath)

    while ($null -ne $current) {
        $marker = Join-Path $current.FullName "package.json"

        if (Test-Path $marker) {
            return $current.FullName
        }

        $parentPath = Split-Path $current.FullName -Parent

        if ([string]::IsNullOrWhiteSpace($parentPath) -or $parentPath -eq $current.FullName) {
            break
        }

        $current = Get-Item $parentPath
    }

    return $null
}

$repoRoot = Find-RepoRoot $runDir

if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    $repoRoot = Find-RepoRoot $scriptDir
}

if ([string]::IsNullOrWhiteSpace($repoRoot)) {
    throw "Cannot find repo root. Expected to find package.json in current folder or parent folders."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputDir = Join-Path $repoRoot "$Name-$timestamp"

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

function Normalize-InputPath {
    param([string]$PathText)

    if ([string]::IsNullOrWhiteSpace($PathText)) {
        return $null
    }

    $p = $PathText.Trim()
    $p = $p.Trim(",")
    $p = $p.Trim('"')
    $p = $p.Trim("'")
    $p = $p.Trim()

    if ([string]::IsNullOrWhiteSpace($p)) {
        return $null
    }

    return $p
}

function Get-SafeFileNameFromRelativePath {
    param([string]$RelativePath)

    return $RelativePath `
        -replace "[:\\\/]", "__" `
        -replace "\s+", "_"
}

function Copy-AiContextFile {
    param([string]$InputPath)

    $cleanPath = Normalize-InputPath $InputPath

    if ($null -eq $cleanPath) {
        return
    }

    if ([System.IO.Path]::IsPathRooted($cleanPath)) {
        $sourcePath = $cleanPath
        $displayPath = $cleanPath
    }
    else {
        # Relative paths resolve from repo root (folder containing package.json)
        $sourcePath = Join-Path $repoRoot $cleanPath
        $displayPath = $cleanPath
    }

    if (-not (Test-Path $sourcePath)) {
        Write-Warning "File not found: $displayPath"
        return
    }

    $item = Get-Item $sourcePath

    if ($item.PSIsContainer) {
        Write-Warning "Skipped folder, file expected: $displayPath"
        return
    }

    $safeName = Get-SafeFileNameFromRelativePath $displayPath
    $targetPath = Join-Path $outputDir $safeName

    Copy-Item $sourcePath $targetPath -Force
    Write-Host "Copied: $displayPath"
}

if ($null -eq $Paths -or $Paths.Count -eq 0) {
    Write-Host "Paste file paths below. Press Ctrl+Z then Enter when done:"
    $stdinLines = @()

    while ($line = [Console]::In.ReadLine()) {
        $stdinLines += $line
    }

    $Paths = $stdinLines
}

$manifestPath = Join-Path $outputDir "_manifest.txt"

"Created: $(Get-Date)" | Out-File $manifestPath -Encoding UTF8
"ScriptDir: $scriptDir" | Out-File $manifestPath -Encoding UTF8 -Append
"RunDir: $runDir" | Out-File $manifestPath -Encoding UTF8 -Append
"RepoRoot: $repoRoot" | Out-File $manifestPath -Encoding UTF8 -Append
"OutputDir: $outputDir" | Out-File $manifestPath -Encoding UTF8 -Append
"" | Out-File $manifestPath -Encoding UTF8 -Append
"Input paths:" | Out-File $manifestPath -Encoding UTF8 -Append

foreach ($path in $Paths) {
    $clean = Normalize-InputPath $path

    if ($null -ne $clean) {
        $clean | Out-File $manifestPath -Encoding UTF8 -Append
        Copy-AiContextFile $clean
    }
}

Write-Host ""
Write-Host "Done."
Write-Host "Output folder:"
Write-Host $outputDir
