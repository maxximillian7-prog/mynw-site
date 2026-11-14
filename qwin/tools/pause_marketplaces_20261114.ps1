# Qwin: reversible pause of eBay and Etsy (Windows PowerShell 5.1+)
# No database deletion, no git reset; files are backed up OUTSIDE QwinGit.
param([switch]$Build,[switch]$Install)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$root=Join-Path $env:USERPROFILE 'Downloads\QwinGit'
$builder=Join-Path $root 'scripts\build_android_local.ps1'
if(-not (Test-Path -LiteralPath (Join-Path $root 'pubspec.yaml'))) {throw 'QwinGit project not found'}
$plan=@'
{"version":"2026-11-14-pause-2","edits":[{"path":"lib/services/neon_gateway.dart","edits":[{"old":"bool get etsyEnabled=>etsyUrl.isNotEmpty;","new":"bool get etsyEnabled=>false; // Temporarily disabled; endpoints and credentials retained."},{"old":"bool get ebayEnabled=>ebayUrl.isNotEmpty;","new":"bool get ebayEnabled=>false; // Temporarily disabled; endpoints and credentials retained."},{"old":"if(ebayUrl.isEmpty)return {'available':false,'items':<dynamic>[]};","new":"if(!ebayEnabled||ebayUrl.isEmpty)return {'available':false,'items':<dynamic>[]};"},{"old":"if(ebayUrl.isEmpty||id.length>150)return null;","new":"if(!ebayEnabled||ebayUrl.isEmpty||id.length>150)return null;"}]},{"path":"lib/ui/experience.dart","edits":[{"old":"if(uri.host=='ebay'){","new":"if(uri.host=='ebay'&&widget.store.neon?.ebayEnabled==true){"},{"old":"if(uri.host=='etsy'){","new":"if(uri.host=='etsy'&&widget.store.neon?.etsyEnabled==true){"},{"old":"if(selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&","new":"if(widget.store.neon?.ebayEnabled==true&&\n           selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&"},{"old":"SliverToBoxAdapter(child:QwinEbayProductionSearch(","new":"if(widget.store.neon?.ebayEnabled==true) SliverToBoxAdapter(child:QwinEbayProductionSearch("},{"old":"      const Divider(height:6),\n      CheckboxListTile(\n        contentPadding:EdgeInsets.zero,\n        title:const Text('Etsy'","new":"      if(widget.store.neon?.etsyEnabled==true)...[\n      const Divider(height:6),\n      CheckboxListTile(\n        contentPadding:EdgeInsets.zero,\n        title:const Text('Etsy'"},{"old":"          if(inEtsy)unawaited(_refreshDestinationCategory());\n        }:null),\n      const Divider(height:6),\n      CheckboxListTile(\n        contentPadding:EdgeInsets.zero,\n        title:const Text('eBay'","new":"          if(inEtsy)unawaited(_refreshDestinationCategory());\n        }:null),\n      ],\n      if(widget.store.neon?.ebayEnabled==true)...[\n      const Divider(height:6),\n      CheckboxListTile(\n        contentPadding:EdgeInsets.zero,\n        title:const Text('eBay'"},{"old":"          if(inEbay)unawaited(_refreshDestinationCategory());\n        }:null),\n      const SizedBox(height:9),","new":"          if(inEbay)unawaited(_refreshDestinationCategory());\n        }:null),\n      ],\n      const SizedBox(height:9),"},{"old":"if(!olxLinked||!etsyLinked||!ebayLinked)","new":"if(!olxLinked)"}]},{"path":"lib/ui/screens.dart","edits":[{"old":"      const SizedBox(height:12),\n      Card(child:Padding(padding:const EdgeInsets.all(16),\n        child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[\n          Row(children:[\n            const Icon(Icons.handyman_outlined","new":"      const SizedBox(height:12),\n      if(widget.store.neon?.etsyEnabled==true)\n      Card(child:Padding(padding:const EdgeInsets.all(16),\n        child:Column(crossAxisAlignment:CrossAxisAlignment.start,children:[\n          Row(children:[\n            const Icon(Icons.handyman_outlined"},{"old":"if(signedIn)EbayConnectionPanel(store:widget.store,locale:widget.locale),","new":"if(signedIn&&widget.store.neon?.ebayEnabled==true)EbayConnectionPanel(store:widget.store,locale:widget.locale),"},{"old":"subtitle:const Text('OLX · Etsy · eBay'),","new":"subtitle:const Text('OLX Portugal'),"}]},{"path":"lib/ui/inbox.dart","edits":[{"old":"length:4,child:Column(children:[","new":"length:2,child:Column(children:["},{"old":"          Tab(text:QwinStrings.t(locale,'inboxOlx')),\n          const Tab(text:'Etsy'),\n          const Tab(text:'eBay')]),","new":"          Tab(text:QwinStrings.t(locale,'inboxOlx'))]),"},{"old":"        _ThreadsTab(store:store,locale:locale,source:'olx',active:active),\n        QwinEtsyAlertsTab(store:store,locale:locale,active:active),\n        QwinEbayMessagesTab(store:store,locale:locale,active:active),","new":"        _ThreadsTab(store:store,locale:locale,source:'olx',active:active),"},{"old":"import 'etsy_notifications.dart';\n","new":""},{"old":"import 'ebay_messages.dart';\n","new":""},{"old":"if(mounted)setState((){rows=result;error=null;});","new":"if(mounted)setState((){\n        rows=result.where((row){\n          final text='${row['title']??''} ${row['preview']??''}'.toLowerCase();\n          return !text.contains('etsy')&&!text.contains('ebay');\n        }).toList();\n        error=null;\n      });"}]},{"path":"lib/ui/listing_editor.dart","edits":[{"old":"if(platforms.containsKey('etsy'))","new":"if(widget.store.neon?.etsyEnabled==true&&platforms.containsKey('etsy'))"}]}]}
'@ | ConvertFrom-Json
$pending=@()
foreach($file in $plan.edits) {
  $target=Join-Path $root ($file.path -replace '/','\')
  if(-not (Test-Path -LiteralPath $target -PathType Leaf)){throw "Missing source file: $target"}
  $original=[IO.File]::ReadAllText($target,[Text.Encoding]::UTF8)
  $next=$original.Replace(([string][char]13+[char]10),([string][char]10))
  foreach($edit in $file.edits){
    $old=[string]$edit.old
    $new=[string]$edit.new
    $n=([regex]::Matches($next,[regex]::Escape($old))).Count
    if($n -eq 1){$next=$next.Replace($old,$new)}
    elseif($n -eq 0 -and ($new.Length -eq 0 -or $next.Contains($new))){
      Write-Host "Already applied: $($file.path)" -ForegroundColor DarkGray
    }else{throw "Unexpected source at $($file.path); anchor occurrences=$n. No files modified."}
  }
  $pending+= [pscustomobject]@{Path=$target;Relative=$file.path;Old=$original;New=$next}
}
$backupRoot=Join-Path $env:USERPROFILE ('Downloads\Qwin_External_Backups\Paused_Marketplaces_'+(Get-Date -Format 'yyyyMMdd_HHmmss'))
foreach($item in $pending){
  $dest=Join-Path $backupRoot ($item.Relative -replace '/','\')
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest)|Out-Null
  [IO.File]::WriteAllText($dest,$item.Old,[Text.UTF8Encoding]::new($false))
}
foreach($item in $pending){
  if($item.Old.Replace(([string][char]13+[char]10),([string][char]10)) -ne $item.New){
    [IO.File]::WriteAllText($item.Path,$item.New,[Text.UTF8Encoding]::new($false))
    Write-Host "Updated $($item.Relative)" -ForegroundColor Green
  }
}
Write-Host 'eBay and Etsy hidden; Qwin Market and OLX preserved.' -ForegroundColor Green
Write-Host "Backups: $backupRoot"
if($Build -or $Install){
  Push-Location $root
  try{
    if($Install){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder -Install}
    else {& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder}
    if($LASTEXITCODE -ne 0){throw "Build stopped: exit code $LASTEXITCODE"}
  }finally{Pop-Location}
}