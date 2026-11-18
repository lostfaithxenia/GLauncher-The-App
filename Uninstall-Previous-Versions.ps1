# GLauncher - Safe Previous Version Uninstaller
# Safely removes previous versions (Game Launcher, Test Launcher v2, untitled-game-launcher)
# without touching any of your actual games or GLauncher Alpha.

$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms | Out-Null

function Show-Banner {
    Clear-Host
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host "        GLauncher - Previous Version Cleanup & Uninstaller        " -ForegroundColor Cyan
    Write-Host "==================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "REASSURANCE & SAFETY GUARANTEE:" -ForegroundColor Green
    Write-Host "  * Your actual games, saves, Steam/Roblox files, and personal"
    Write-Host "    documents will NEVER be touched or deleted."
    Write-Host "  * GLauncher Alpha (the new version) will NOT be removed."
    Write-Host "  * Nothing will be deleted until you review the exact list"
    Write-Host "    of found items and give your final confirmation."
    Write-Host ""
}

function Select-FolderDialog {
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "Select the folder containing the previous version of the launcher"
    $dialog.ShowNewFolderButton = $false
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        return $dialog.SelectedPath
    }
    return $null
}

function Find-OldLauncherItemsInFolder([string]$Folder) {
    $found = @()
    if (-not (Test-Path $Folder)) { return $found }

    $oldExePatterns = @(
        "Game Launcher.exe",
        "GameLauncher-Portable.exe",
        "GameLauncher-win64.zip",
        "Test Launcher v2.exe",
        "TestLauncher-v2-Portable.exe"
    )

    foreach ($name in $oldExePatterns) {
        $p = Join-Path $Folder $name
        if (Test-Path $p) {
            $found += [PSCustomObject]@{ Type = "Old Launcher File"; Path = $p }
        }
    }

    # Check if this folder itself is an unpacked old launcher folder (contains old exe + resources\app.asar)
    $hasOldExe = (Test-Path (Join-Path $Folder "Game Launcher.exe")) -or (Test-Path (Join-Path $Folder "Test Launcher v2.exe"))
    $hasGLauncher = Test-Path (Join-Path $Folder "GLauncher.exe")
    if ($hasOldExe -and -not $hasGLauncher -and (Test-Path (Join-Path $Folder "resources\app.asar"))) {
        $found += [PSCustomObject]@{ Type = "Old Launcher App Folder"; Path = $Folder }
    }

    # Also check one level down for win-unpacked or named subfolders
    Get-ChildItem -Path $Folder -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $sub = $_.FullName
        if ($_.Name -match "^(Game Launcher|Test Launcher v2|win-unpacked)$") {
            $subHasOld = (Test-Path (Join-Path $sub "Game Launcher.exe")) -or (Test-Path (Join-Path $sub "Test Launcher v2.exe"))
            $subHasNew = Test-Path (Join-Path $sub "GLauncher.exe")
            if ($subHasOld -and -not $subHasNew) {
                $found += [PSCustomObject]@{ Type = "Old Launcher Folder"; Path = $sub }
            }
        }
    }

    return $found
}

function Find-AutoOldLauncherItems {
    $items = @()

    $searchDirs = @(
        [Environment]::GetFolderPath("Desktop"),
        (Join-Path $env:USERPROFILE "Downloads"),
        [Environment]::GetFolderPath("MyDocuments"),
        (Join-Path $env:LOCALAPPDATA "Programs\Game Launcher"),
        (Join-Path $env:LOCALAPPDATA "Programs\Test Launcher v2"),
        (Join-Path $env:LOCALAPPDATA "Programs\untitled-game-launcher"),
        (Join-Path $env:ProgramFiles "Game Launcher"),
        (Join-Path ${env:ProgramFiles(x86)} "Game Launcher")
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

    foreach ($dir in $searchDirs) {
        $items += Find-OldLauncherItemsInFolder $dir
    }

    # Old AppData userData folders
    $oldAppData = @(
        (Join-Path $env:APPDATA "untitled-game-launcher"),
        (Join-Path $env:APPDATA "test-launcher-v2"),
        (Join-Path $env:APPDATA "Game Launcher"),
        (Join-Path $env:APPDATA "Test Launcher v2")
    )
    foreach ($ad in $oldAppData) {
        if (Test-Path $ad) {
            $items += [PSCustomObject]@{ Type = "Old Launcher Settings/Cache"; Path = $ad }
        }
    }

    # Old Desktop / Start Menu shortcuts
    $shortcutDirs = @(
        [Environment]::GetFolderPath("Desktop"),
        (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs")
    )
    foreach ($sd in $shortcutDirs) {
        if (Test-Path $sd) {
            Get-ChildItem -Path $sd -Filter "*.lnk" -Recurse -ErrorAction SilentlyContinue | Where-Object {
                $_.BaseName -match "^(Game Launcher|Test Launcher v2|Untitled Game Launcher)$"
            } | ForEach-Object {
                $items += [PSCustomObject]@{ Type = "Old Shortcut"; Path = $_.FullName }
            }
        }
    }

    # Deduplicate by Path
    return $items | Sort-Object Path -Unique
}

Show-Banner
Write-Host "How would you like to locate any previous versions of the launcher?" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [1] I want to browse and choose the folder containing the original version"
Write-Host "  [2] Let this tool automatically search my PC for previous versions"
Write-Host "  [Q] Cancel and exit (no changes will be made)"
Write-Host ""

$choice = Read-Host "Enter your choice (1, 2, or Q)"
$targets = @()

if ($choice -eq '1') {
    Write-Host ""
    Write-Host "Opening folder picker... Please select the folder where your old launcher is located." -ForegroundColor Cyan
    $picked = Select-FolderDialog
    if (-not $picked) {
        Write-Host "No folder selected. Exiting safely with no changes made." -ForegroundColor Yellow
        Pause
        exit 0
    }
    Write-Host "Scanning: $picked" -ForegroundColor Gray
    $targets = Find-OldLauncherItemsInFolder $picked
} elseif ($choice -eq '2') {
    Write-Host ""
    Write-Host "Automatically scanning common folders, shortcuts, and old launcher data..." -ForegroundColor Cyan
    $targets = Find-AutoOldLauncherItems
} else {
    Write-Host ""
    Write-Host "Cancelled. No files were changed." -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    exit 0
}

Write-Host ""
if (-not $targets -or $targets.Count -eq 0) {
    Write-Host "Good news! No previous versions of the launcher were found." -ForegroundColor Green
    Write-Host "You are all set to install or run GLauncher Alpha cleanly." -ForegroundColor Green
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host "Found the following previous launcher item(s):" -ForegroundColor Yellow
Write-Host ""
foreach ($t in $targets) {
    Write-Host ("  - [{0}] {1}" -f $t.Type, $t.Path) -ForegroundColor White
}
Write-Host ""
Write-Host "Reminder: Your games and GLauncher Alpha will NOT be affected." -ForegroundColor Green
$confirm = Read-Host "Would you like to remove these previous version item(s)? (Y/N)"

if ($confirm -notin @('Y', 'y', 'YES', 'yes')) {
    Write-Host ""
    Write-Host "No problem! Nothing was removed." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "Closing any running old launcher processes..." -ForegroundColor Cyan
Get-Process -Name "Game Launcher", "Test Launcher v2" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 400

foreach ($t in $targets) {
    if (Test-Path $t.Path) {
        try {
            Remove-Item -Path $t.Path -Recurse -Force -ErrorAction Stop
            Write-Host "  [Removed] $($t.Path)" -ForegroundColor Green
        } catch {
            Write-Host "  [Skipped - In Use or Protected] $($t.Path)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Cleanup complete! Your PC is clean and ready for a fresh GLauncher Alpha setup." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
