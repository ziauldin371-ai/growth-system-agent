# Create review zip package
$ErrorActionPreference = "Stop"

$projectRoot = "D:\shoaib\zia automation"
$zipPath = Join-Path $projectRoot "growth-system-agent-review.zip"
$tempStageDir = Join-Path $env:TEMP "growth-system-agent-stage-$(Get-Random)"

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

if (Test-Path $tempStageDir) {
    Remove-Item -Recurse -Force $tempStageDir
}

New-Item -ItemType Directory -Path $tempStageDir | Out-Null

Write-Host "Staging files into: $tempStageDir"

$excludeDirs = @(
    "node_modules",
    ".next",
    ".git",
    ".data",
    "coverage",
    "test-results",
    "playwright-report",
    "dist",
    "build",
    ".temp"
)

$excludeFilePatterns = @(
    "^\.env$",
    "^\.env\.local$",
    "^\.env\..*\.local$",
    "^growth-system-agent-review\.zip$",
    "\.tsbuildinfo$"
)

# Recursively copy all files except excluded dirs and files
Get-ChildItem -Path $projectRoot -Force | ForEach-Object {
    $item = $_
    $itemName = $item.Name

    if ($item.PSIsContainer) {
        if ($excludeDirs -contains $itemName) {
            Write-Host "Skipping directory: $itemName"
            return
        }

        # Copy directory recursively with exclusions
        $targetDir = Join-Path $tempStageDir $itemName
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null

        Get-ChildItem -Path $item.FullName -Recurse -Force | ForEach-Object {
            $child = $_
            $relPath = $child.FullName.Substring($item.FullName.Length)
            $destPath = Join-Path $targetDir $relPath

            # Check if any parent part of child is excluded
            $parts = $relPath.Split([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
            foreach ($p in $parts) {
                if ($excludeDirs -contains $p) {
                    return
                }
            }

            if ($child.PSIsContainer) {
                if (-not (Test-Path $destPath)) {
                    New-Item -ItemType Directory -Path $destPath -Force | Out-Null
                }
            } else {
                # Check file exclusion
                $fileName = $child.Name
                $skip = $false
                foreach ($pattern in $excludeFilePatterns) {
                    if ($fileName -match $pattern) {
                        $skip = $true
                        break
                    }
                }
                if (-not $skip) {
                    $parentDest = Split-Path -Parent $destPath
                    if (-not (Test-Path $parentDest)) {
                        New-Item -ItemType Directory -Path $parentDest -Force | Out-Null
                    }
                    Copy-Item -Path $child.FullName -Destination $destPath -Force
                }
            }
        }
    } else {
        # Top level file
        $skip = $false
        foreach ($pattern in $excludeFilePatterns) {
            if ($itemName -match $pattern) {
                $skip = $true
                break
            }
        }
        if (-not $skip) {
            Copy-Item -Path $item.FullName -Destination (Join-Path $tempStageDir $itemName) -Force
        } else {
            Write-Host "Skipping top-level file: $itemName"
        }
    }
}

Write-Host "Files staged successfully. Compressing to zip..."

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempStageDir, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Clean up stage directory
Remove-Item -Recurse -Force $tempStageDir

$zipItem = Get-Item $zipPath
$sizeMB = [math]::Round($zipItem.Length / 1MB, 2)
$sizeKB = [math]::Round($zipItem.Length / 1KB, 2)

Write-Host "`nZip successfully created!"
Write-Host "Path: $($zipItem.FullName)"
Write-Host "Size: $sizeMB MB ($sizeKB KB, $($zipItem.Length) bytes)"

# List top-level items inside zip
Write-Host "`nTop-level folders inside zip:"
$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$topLevelFolders = New-Object System.Collections.Generic.HashSet[string]
$topLevelFiles = New-Object System.Collections.Generic.HashSet[string]

foreach ($entry in $archive.Entries) {
    $normalized = $entry.FullName.Replace('\', '/')
    $parts = $normalized.Split('/')
    if ($parts.Length -gt 1) {
        $topLevelFolders.Add($parts[0]) | Out-Null
    } else {
        $topLevelFiles.Add($parts[0]) | Out-Null
    }
}

$archive.Dispose()

$sortedFolders = $topLevelFolders | Sort-Object
foreach ($folder in $sortedFolders) {
    Write-Host " [DIR]  $folder/"
}

Write-Host "`nTop-level root files inside zip:"
$sortedFiles = $topLevelFiles | Sort-Object
foreach ($file in $sortedFiles) {
    Write-Host " [FILE] $file"
}
