# Qwin OLX v12 - Windows PowerShell 5.1+, ASCII installer
param([switch]$Build,[switch]$Install,[switch]$CheckOnly)
$ErrorActionPreference='Stop'
$root=Join-Path $env:USERPROFILE 'Downloads\QwinGit'
if(-not (Test-Path (Join-Path $root 'pubspec.yaml'))){throw 'QwinGit not found'}
$paths=@('lib/services/neon_gateway.dart','lib/ui/experience.dart','lib/ui/inbox.dart','lib/ui/listing_editor.dart')
$original=@{};$stage=@{}
foreach($rel in $paths){
  $file=Join-Path $root ($rel -replace '/','\')
  if(-not (Test-Path $file)){throw "Missing $rel. No files changed"}
  $original[$rel]=[IO.File]::ReadAllText($file,[Text.Encoding]::UTF8)
  $stage[$rel]=([string]$original[$rel]).Replace(([string][char]13+[char]10),([string][char]10))
}
function RemotePart([string]$name){
  $sha='14fe45a807c55e2c70cad5650181eb9f1987ec28'
  $url="https://raw.githubusercontent.com/maxximillian7-prog/mynw-site/$sha/qwin/tools/olx_v12/$name"
  $tmp=Join-Path $env:TEMP ('qwin12_'+[guid]::NewGuid().ToString('N')+'.txt')
  try{
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
    $value=[IO.File]::ReadAllText($tmp,[Text.Encoding]::UTF8)
    if($value.Length -lt 180 -or $value.StartsWith('<!DOCTYPE')){throw "Invalid fragment: $name"}
    return $value.Replace(([string][char]13+[char]10),([string][char]10))
  }finally{Remove-Item $tmp -ErrorAction SilentlyContinue}
}
function One([string]$rel,[string]$old,[string]$new){
  $s=[string]$stage[$rel]
  if($s.Contains($new)){return}
  $n=([regex]::Matches($s,[regex]::Escape($old))).Count
  if($n -ne 1){throw "Qwin local source differs: $rel, anchor count=$n. No files changed"}
  $stage[$rel]=$s.Replace($old,$new)
}
$renew=RemotePart 'renewal_switch.dartpart'
$period=RemotePart 'expiry_ui.dartpart'
$thumb=RemotePart 'thread_thumbnail.dartpart'
$sync=RemotePart 'collection_sync.dartpart'
if(-not $renew.Contains('value:olxAutoExtend') -or -not $sync.Contains('sync_statuses') -or
   -not $period.Contains('olxValidTo') -or -not $thumb.Contains('_OlxAdvertThumbnail')){
  throw 'Remote fragments invalid. No files changed'
}
$gw='lib/services/neon_gateway.dart'
One $gw "'threads','thread_messages','thread_send','thread_mark_read','account_profile'" "'sync_status','sync_statuses','threads','thread_messages','thread_send','thread_mark_read','account_profile'"

$ex='lib/ui/experience.dart'
$s=[string]$stage[$ex]
$begin=$s.IndexOf('class _QwinCollectionExperienceState')
$end=$s.IndexOf('class QwinProductDetail',$begin)
if($begin -lt 0 -or $end -lt $begin){throw 'My Ads section not found. No files changed'}
$section=$s.Substring($begin,$end-$begin)
if(-not $section.Contains('Future<void> _refreshMine()')){
  if(-not $section.Contains('  bool gridMode=true;')){throw 'My Ads state changed. No files changed'}
  $section=$section.Replace('  bool gridMode=true;','  bool gridMode=true;'+[char]10+$sync.TrimEnd())
}
$section=$section.Replace('onRefresh:widget.store.refresh,child:CustomScrollView(slivers:[',
   'onRefresh:_refreshMine,child:CustomScrollView(slivers:[')
if(-not $section.Contains('onRefresh:_refreshMine')){throw 'My Ads refresh missing. No files changed'}
$s=$s.Substring(0,$begin)+$section+$s.Substring($end)
if(-not $s.Contains('  bool olxAutoExtend=false;')){
  $old='  bool inQwin=true,inOlx=false,inEtsy=false,inEbay=false;'
  if(-not $s.Contains($old)){throw 'Wizard channels changed. No files changed'}
  $s=$s.Replace($old,$old+[char]10+'  bool olxAutoExtend=false;')
}
if(-not $s.Contains('value:olxAutoExtend,')){
  $old='        onChanged:olxLinked?(v)=>setState(()=>inOlx=v??false):null),'
  if(-not $s.Contains($old)){throw 'OLX checkbox changed. No files changed'}
  $s=$s.Replace($old,$old+[char]10+$renew.TrimEnd())
}
if(-not $s.Contains("'auto_extend_enabled':olxAutoExtend,")){
  $old="'olx_language':olxLanguage,"
  if(-not $s.Contains($old)){throw 'OLX draft map changed. No files changed'}
  $s=$s.Replace($old,$old+[char]10+"      'auto_extend_enabled':olxAutoExtend,")
}
$reset='        inQwin=true;inOlx=false;inEtsy=false;inEbay=false;'
if(-not $s.Contains('inEbay=false;olxAutoExtend=false;')){
  if(-not $s.Contains($reset)){throw 'Wizard reset changed. No files changed'}
  $s=$s.Replace($reset,$reset+'olxAutoExtend=false;')
}
$s=$s.Replace('fit:BoxFit.cover,width:123,height:146))',
  'fit:BoxFit.contain,width:123,height:146))')
$s=$s.Replace('height:210,fit:BoxFit.cover))','height:210,fit:BoxFit.contain))')
$stage[$ex]=$s

$ib='lib/ui/inbox.dart'
$s=[string]$stage[$ib]
if(-not $s.Contains("thread['advert_title']")){
  $old="      final advertId=thread['advert_id']?.toString()??'';"
  if(-not $s.Contains($old)){throw 'Thread title lookup changed. No files changed'}
  $s=$s.Replace($old,"      final advertTitle=thread['advert_title']?.toString().trim()??'';"+[char]10+
    "      if(advertTitle.isNotEmpty)return advertTitle;"+[char]10+$old)
}
if(-not $s.Contains("_OlxAdvertThumbnail(url:thread['advert_image_url']")){
  $old="            const CircleAvatar(backgroundColor:Color(0xFFE4F1FF),"+[char]10+
       "              child:Icon(Icons.language,color:Color(0xFF0B50CD))),"
  if(-not $s.Contains($old)){throw 'OLX thread image placeholder changed. No files changed'}
  $s=$s.Replace($old,"            _OlxAdvertThumbnail(url:thread['advert_image_url']?.toString()),")
}
if(-not $s.Contains('class _OlxAdvertThumbnail extends StatelessWidget')){
  $old='class _ThreadListingThumbnail extends StatelessWidget'
  if(-not $s.Contains($old)){throw 'Thread thumbnail widget missing. No files changed'}
  $s=$s.Replace($old,$thumb+[char]10+$old)
}
$stage[$ib]=$s

$ed='lib/ui/listing_editor.dart'
$s=[string]$stage[$ed]
if(-not $s.Contains('  String? olxValidTo;')){
  $old='  Map<String,String> platforms={};'
  if(-not $s.Contains($old)){throw 'Listing editor state changed. No files changed'}
  $s=$s.Replace($old,$old+[char]10+'  String? olxValidTo;'+[char]10+'  bool? olxAutoExtend;')
}
if(-not $s.Contains("final live=await neon!.olxAction('sync_status'")){
  $old='      final values=await widget.store.listingPlatforms(widget.listing.id);'
  if(-not $s.Contains($old)){throw 'Listing editor loader changed. No files changed'}
  $block=@'
      String? liveValidTo;
      bool? liveRenewal;
      final neon=widget.store.neon;
      if(neon?.olxEnabled==true && !widget.store.isGuest){
        try{
          final live=await neon!.olxAction('sync_status',data:{
            'listing_id':widget.listing.id,
          });
          liveValidTo=live['valid_to']?.toString();
          liveRenewal=live['auto_extend_enabled']==true;
        }catch(_){/* Preserve cached OLX state. */}
      }
'@
  $s=$s.Replace($old,$block.TrimEnd()+[char]10+$old)
}
if(-not $s.Contains('if(liveValidTo!=null)olxValidTo=liveValidTo;')){
  $old='        platforms=values;'
  if(-not $s.Contains($old)){throw 'Editor status state changed. No files changed'}
  $s=$s.Replace($old,$old+[char]10+'        if(liveValidTo!=null)olxValidTo=liveValidTo;'+
    [char]10+'        if(liveRenewal!=null)olxAutoExtend=liveRenewal;')
}
if(-not $s.Contains('OLX auto-renew disabled')){
  $chip=$s.IndexOf('Chip(label:Text(')
  if($chip -lt 0){throw 'Listing marketplace chips missing. No files changed'}
  $end=$s.IndexOf('            ]),',$chip)
  if($end -lt 0 -or $end-$chip -gt 300){throw 'Listing chip boundary changed. No files changed'}
  $end += ('            ]),').Length
  $s=$s.Insert($end,([string][char]10)+$period.TrimEnd())
}
$s=$s.Replace('width:121,height:139,fit:BoxFit.cover))',
  'width:121,height:139,fit:BoxFit.contain))')
$stage[$ed]=$s

if(-not ([string]$stage[$gw]).Contains("'sync_status','sync_statuses'") -or
   -not ([string]$stage[$ex]).Contains('onRefresh:_refreshMine') -or
   -not ([string]$stage[$ex]).Contains("'auto_extend_enabled':olxAutoExtend") -or
   -not ([string]$stage[$ib]).Contains('_OlxAdvertThumbnail(url:') -or
   -not ([string]$stage[$ed]).Contains('OLX auto-renew disabled')){
  throw 'Cross-file preflight failed. No files changed'
}
Write-Host 'Qwin OLX v12 preflight OK' -ForegroundColor Green
if($CheckOnly){return}
$backup=Join-Path $env:USERPROFILE ('Downloads\Qwin_External_Backups\OLX_v12_'+(Get-Date -Format 'yyyyMMdd_HHmmss'))
foreach($rel in $paths){
  $p=Join-Path $backup ($rel -replace '/','\')
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $p)|Out-Null
  [IO.File]::WriteAllText($p,[string]$original[$rel],[Text.UTF8Encoding]::new($false))
}
foreach($rel in $paths){
  $p=Join-Path $root ($rel -replace '/','\')
  $old=([string]$original[$rel]).Replace(([string][char]13+[char]10),([string][char]10))
  $new=[string]$stage[$rel]
  if($old -ceq $new){continue}
  [IO.File]::WriteAllText($p,$new,[Text.UTF8Encoding]::new($false))
  Write-Host "UPDATED $rel" -ForegroundColor Green
}
Write-Host "Backups: $backup" -ForegroundColor Cyan
if($Build -or $Install){
  Push-Location $root
  try{
    $builder=Join-Path $root 'scripts\build_android_local.ps1'
    if(-not (Test-Path $builder)){throw 'Android build helper missing'}
    if($Install){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder -Install}
    else{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder}
    if($LASTEXITCODE -ne 0){throw "Build failed: $LASTEXITCODE"}
  }finally{Pop-Location}
}
