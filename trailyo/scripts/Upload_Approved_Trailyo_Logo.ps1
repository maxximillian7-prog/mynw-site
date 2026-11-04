# Publish the owner-approved transparent Trailyo wordmark to mynw.app.
# This only adds trailyo/assets/trailyo-logo.png, preserving all legal pages.
#Requires -Version 7
[CmdletBinding()]
param(
  [string]$Logo = (Join-Path $env:USERPROFILE 'Downloads\trailyo_logo_64.png'),
  [string]$WebsiteFolder = (Join-Path $env:USERPROFILE 'Downloads\mynw-site')
)
$ErrorActionPreference='Stop'
if (!(Test-Path $Logo)){throw "Approved Trailyo PNG not found: $Logo"}
if (!(Get-Command git -ErrorAction SilentlyContinue)){throw 'Install Git first'}
if (!(Test-Path (Join-Path $WebsiteFolder '.git'))) {
  if (Test-Path $WebsiteFolder){throw 'Target directory exists but is not a Git repository'}
  & git clone 'https://github.com/maxximillian7-prog/mynw-site.git' $WebsiteFolder
  if ($LASTEXITCODE -ne 0){throw 'Git clone failed'}
}
Push-Location $WebsiteFolder
try{
  $remote = (& git remote get-url origin).Trim()
  if ($remote -notmatch 'maxximillian7-prog/mynw-site(\.git)?$'){throw "Unexpected site Git origin: $remote"}
  $dirty=@(& git status --porcelain)
  if ($dirty.Count -gt 0){$dirty|ForEach-Object{Write-Warning $_};throw 'Website folder has uncommitted changes'}
  & git pull --ff-only origin main
  if ($LASTEXITCODE -ne 0){throw 'Site pull failed'}
  $destination = Join-Path (Get-Location).Path 'trailyo\assets\trailyo-logo.png'
  Copy-Item -LiteralPath $Logo -Destination $destination -Force
  & git add -- 'trailyo/assets/trailyo-logo.png'
  $changed=@(& git diff --cached --name-only)
  if ($changed.Count -eq 0) {
    Write-Host 'Approved Trailyo logo is already published or identical.' -ForegroundColor Green
  } else {
    & git commit -m 'Publish approved Trailyo wordmark'
    if ($LASTEXITCODE -ne 0){throw 'Git commit failed'}
    & git push origin main
    if ($LASTEXITCODE -ne 0){throw 'Git push failed; local commit retained'}
    Write-Host 'Approved wordmark published at /trailyo/assets/trailyo-logo.png' -ForegroundColor Green
  }
} finally { Pop-Location }
