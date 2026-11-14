# Qwin UI + multilingual category search v10 (Windows PowerShell 5.1+)
# Uses only ASCII in the installer. Does not delete existing app data or accounts.
# Existing sources are backed up outside QwinGit before any writes.
param([switch]$Build,[switch]$Install)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$root=Join-Path $env:USERPROFILE 'Downloads\QwinGit'
if(-not (Test-Path (Join-Path $root 'pubspec.yaml'))){throw 'QwinGit not found'}
$relPaths=@(
  'lib/services/neon_gateway.dart',
  'lib/ui/experience.dart',
  'lib/ui/screens.dart',
  'lib/ui/inbox.dart',
  'lib/ui/listing_editor.dart',
  'lib/ui/qwin_category_keywords.dart'
)
$original=@{}
$staged=@{}
foreach($rel in $relPaths){
  $full=Join-Path $root ($rel -replace '/','\')
  if(Test-Path -LiteralPath $full){
    $raw=[IO.File]::ReadAllText($full,[Text.Encoding]::UTF8)
    $original[$rel]=$raw
    $staged[$rel]=$raw.Replace(([string][char]13+[char]10),([string][char]10))
  }elseif($rel -eq 'lib/ui/qwin_category_keywords.dart'){
    $original[$rel]=$null
    $staged[$rel]=''
  }else{throw "Missing Qwin source: $rel. No files changed."}
}
function Update-Exact([string]$rel,[string]$from,[string]$to,[bool]$required=$true){
  $value=[string]$staged[$rel]
  if($value.Contains($to)){return}
  $count=([regex]::Matches($value,[regex]::Escape($from))).Count
  if($count -eq 1){
    $staged[$rel]=$value.Replace($from,$to)
  }elseif($required){
    throw "Source changed at $rel (anchor=$count). No files changed."
  }else{
    Write-Warning "Optional anchor unavailable in $rel; preserving that section"
  }
}
function Get-Section([string]$content,[string]$begin,[string]$end){
  $i=$content.IndexOf($begin,[StringComparison]::Ordinal)
  if($i -lt 0){throw "Missing section start: $begin. No files changed."}
  $j=$content.IndexOf($end,$i+[Math]::Max(1,$begin.Length),[StringComparison]::Ordinal)
  if($j -lt 0){throw "Missing section end: $end. No files changed."}
  return [pscustomobject]@{Before=$content.Substring(0,$i);Body=$content.Substring($i,$j-$i);After=$content.Substring($j)}
}
function Guard-Widget([string]$content,[string]$label,[string]$widget,[string]$feature){
  $pos=$content.IndexOf($label,[StringComparison]::Ordinal)
  if($pos -lt 0){Write-Warning "Label not present: $label";return $content}
  $before=$content.Substring(0,$pos)
  $expr='(?m)^[ \t]*'+[regex]::Escape($widget)+'[ \t]*\('
  $hits=[regex]::Matches($before,$expr)
  if($hits.Count -eq 0){Write-Warning "Widget not located before $label";return $content}
  $hit=$hits[$hits.Count-1]
  $insertAt=$hit.Index+$hit.Value.IndexOf($widget,[StringComparison]::Ordinal)
  if($pos-$insertAt -gt 1800){Write-Warning "Unexpected widget layout near $label";return $content}
  $guard="if(widget.store.neon?."+$feature+"==true) "
  $start=[Math]::Max(0,$insertAt-180)
  if($content.Substring($start,$insertAt-$start).Contains($guard.Trim())){return $content}
  return $content.Insert($insertAt,$guard)
}
# Download only data/code from a trusted reviewed repository (no execution).
$base='https://raw.githubusercontent.com/maxximillian7-prog/mynw-site/main/qwin/tools/'
$keywordUrl=$base+'qwin_category_keywords_20261114.dart'
$temp=Join-Path $env:TEMP ('qwin_categories_'+[guid]::NewGuid().ToString('N')+'.dart')
try{
  Invoke-WebRequest -Uri $keywordUrl -OutFile $temp -UseBasicParsing
  $module=[IO.File]::ReadAllText($temp,[Text.Encoding]::UTF8)
}finally{Remove-Item -LiteralPath $temp -ErrorAction SilentlyContinue}
if($module.Length -lt 10000 -or
   -not $module.Contains('class QwinCategoryKeywordSearch') -or
   -not $module.Contains('class QwinCategoryKeywords') -or
   -not $module.Contains('QwinLocalTranslation.searchVariants(q)')){
  throw 'Category module did not validate. No files changed.'
}
$staged['lib/ui/qwin_category_keywords.dart']=$module

# Keep provider OAuth and data; turn off the visible and callable features.
$gateway='lib/services/neon_gateway.dart'
$gate=[string]$staged[$gateway]
foreach($provider in @('etsy','ebay')){
  $pattern='bool get '+$provider+'Enabled\s*=>[^;]+;'
  $replacement='bool get '+$provider+'Enabled=>false;'
  $hits=[regex]::Matches($gate,$pattern)
  if($hits.Count -ne 1){throw "Cannot locate unique $provider gate. No files changed."}
  $gate=[regex]::Replace($gate,$pattern,$replacement)
}
$gate=$gate.Replace("if(ebayUrl.isEmpty)return {'available':false,'items':<dynamic>[]};",
  "if(!ebayEnabled||ebayUrl.isEmpty)return {'available':false,'items':<dynamic>[]};")
$gate=$gate.Replace('if(ebayUrl.isEmpty||id.length>150)return null;',
  'if(!ebayEnabled||ebayUrl.isEmpty||id.length>150)return null;')
$staged[$gateway]=$gate

# Home feed and listing wizard. All category IDs still come from official OLX.
$rel='lib/ui/experience.dart'
$src=[string]$staged[$rel]
if(-not $src.Contains("import 'qwin_category_keywords.dart';")){
  $import="import 'olx_category_picker.dart';"
  if(-not $src.Contains($import)){throw 'Cannot locate category picker import. No files changed.'}
  $src=$src.Replace($import,$import+[char]10+"import 'qwin_category_keywords.dart';")
}
$section=Get-Section $src 'class _QwinMarketExperienceState' 'class QwinProductCard'
$marketText=[string]$section.Body
if(-not $marketText.Contains('QwinCategoryKeywordSearch(')){
  $anchor='OlxCategoryPanel(catalog:widget.store.catalog'
  $where=$marketText.IndexOf($anchor)
  if($where -lt 0){throw 'Home category grid changed. No files changed.'}
  $injection=@'
QwinCategoryKeywordSearch(
               catalog:widget.store.catalog,
               locale:widget.locale,
               sellerOnly:false,
               onSelected:(node)=>setState(()=>selectedOlxCategory=node.id)),
             const SizedBox(height:11),
             '@
  $marketText=$marketText.Insert($where,$injection)
}
$filter='items=items.where((x){'
if(-not $marketText.Contains("if(x.isExternal&&x.externalSource=='ebay')return false;")){
  if(-not $marketText.Contains($filter)){throw 'Home feed filter changed. No files changed.'}
  $marketText=$marketText.Replace($filter,$filter+[char]10+
    "      if(x.isExternal&&x.externalSource=='ebay')return false;")
}
$marketText=$marketText.Replace('if(selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&',
  'if(widget.store.neon?.ebayEnabled==true&&selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&')
$marketText=$marketText.Replace('if(widget.store.neon?.ebayEnabled==true&&if(widget.store.neon?.ebayEnabled==true&&',
  'if(widget.store.neon?.ebayEnabled==true&&')
$src=$section.Before+$marketText+$section.After

# Add search to the seller's actual OLX category selection step.
$section=Get-Section $src 'Widget _categoryStep()' 'List<String> _guidedQuestions()'
$sellerText=[string]$section.Body
if(-not $sellerText.Contains('QwinCategoryKeywordSearch(')){
  $pick=[regex]::Match($sellerText,'OlxCategoryPanel[ \t]*\(')
  if(-not $pick.Success){throw 'Seller category picker changed. No files changed.'}
  $injection=@'
QwinCategoryKeywordSearch(
         catalog:widget.store.catalog,
         locale:widget.locale,
         productTitle:title.text,
         productDescription:description.text,
         sellerOnly:true,
         onSelected:(node)=>unawaited(_confirmOlxLeaf(node))),
       const SizedBox(height:10),
       '@
  $sellerText=$sellerText.Insert($pick.Index,$injection)
}
$src=$section.Before+$sellerText+$section.After

# For products with clear text evidence, use local official-taxonomy suggestions
# before provider's potentially brand-biased automatic suggestions.
$start=$src.IndexOf('Future<void> _loadOlxSuggestions(')
$stop=$src.IndexOf('QwinCategory _matchLocalCategory(',[Math]::Max($start,0))
if($start -ge 0 -and $stop -gt $start){
  $chunk=$src.Substring($start,$stop-$start)
  if(-not $chunk.Contains('QwinCategoryKeywords.find(')){
    $anchor='setState(()=>loadingOlxSuggestions=true);'
    if($chunk.Contains($anchor)){
      $addition=@'
final verifiedLocal=QwinCategoryKeywords.find(
        widget.store.catalog,query,description:description.text,
        locale:widget.locale,sellerOnly:true,limit:5,
        prioritizeDescription:true);
    if(verifiedLocal.isNotEmpty){
      setState((){
        suggestedForTitle=query;
        olxSuggestions=[
          for(final category in verifiedLocal)
            <String,dynamic>{'id':category.id,'name':category.namePt,
              'is_leaf':category.isLeaf},
        ];
      });
      if(selectedCategoryId==null){
        unawaited(_confirmOlxLeaf(verifiedLocal.first,fromAuto:true));
      }
      return;
    }
    '@
      $chunk=$chunk.Replace($anchor,$addition+$anchor)
      $src=$src.Substring(0,$start)+$chunk+$src.Substring($stop)
    }else{Write-Warning 'AI suggestions structure changed: manual category search will still work'}
  }
}else{Write-Warning 'AI suggestions method changed: manual category search will still work'}
$src=$src.Replace("if(uri.host=='etsy'){",
  "if(uri.host=='etsy'&&widget.store.neon?.etsyEnabled==true){")
$src=$src.Replace("if(uri.host=='ebay'){",
  "if(uri.host=='ebay'&&widget.store.neon?.ebayEnabled==true){")
# Previously-linked account hints are not presented on the sales channels screen.
$src=Guard-Widget $src "title:const Text('Etsy'" 'CheckboxListTile' 'etsyEnabled'
$src=Guard-Widget $src "title:const Text('eBay'" 'CheckboxListTile' 'ebayEnabled'
$src=$src.Replace('if(inEtsy)...[','if(widget.store.neon?.etsyEnabled==true&&inEtsy)...[')
$src=$src.Replace('if(inEbay)...[','if(widget.store.neon?.ebayEnabled==true&&inEbay)...[')
$src=$src.Replace('if(widget.store.neon?.ebayEnabled==true&&if(inEbay)...[',
  'if(widget.store.neon?.ebayEnabled==true&&inEbay)...[')
$src=$src.Replace('if(widget.store.neon?.etsyEnabled==true&&if(inEtsy)...[',
  'if(widget.store.neon?.etsyEnabled==true&&inEtsy)...[')
$staged[$rel]=$src

# Integrations in profile: only Qwin and OLX visible.
$rel='lib/ui/screens.dart'
$src=[string]$staged[$rel]
$src=Guard-Widget $src "QwinStrings.t(widget.locale,'etsyConnection')" 'Card' 'etsyEnabled'
$src=[regex]::Replace($src,
  'if[ \t]*\([ \t]*signedIn[ \t]*\)[ \t]*EbayConnectionPanel[ \t]*\(',
  'if(signedIn&&widget.store.neon?.ebayEnabled==true)EbayConnectionPanel(')
$src=$src.Replace(('OLX '+[char]183+' Etsy '+[char]183+' eBay'),'OLX Portugal')
$src=$src.Replace('OLX / Etsy / eBay','OLX Portugal')
$src=$src.Replace('OLX, Etsy, eBay','OLX Portugal')
$staged[$rel]=$src

# Two chat tabs. Keep old messages in DB but hide paused-provider tabs.
$rel='lib/ui/inbox.dart'
$src=[string]$staged[$rel]
$src=$src.Replace('length:4,child:Column(children:[','length:2,child:Column(children:[')
$src=[regex]::Replace($src,
  "\s*const Tab\(text:'Etsy'\),\s*const Tab\(text:'eBay'\)",
  '')
$src=[regex]::Replace($src,
  '\s*QwinEtsyAlertsTab\(\s*store:store,locale:locale,active:active\s*\),\s*QwinEbayMessagesTab\(\s*store:store,locale:locale,active:active\s*\),',
  '')
$src=$src.Replace("import 'etsy_notifications.dart';"+[char]10,'')
$src=$src.Replace("import 'ebay_messages.dart';"+[char]10,'')
$staged[$rel]=$src
$rel='lib/ui/listing_editor.dart'
$src=[string]$staged[$rel]
$src=$src.Replace("if(platforms.containsKey('etsy'))",
  "if(widget.store.neon?.etsyEnabled==true&&platforms.containsKey('etsy'))")
$staged[$rel]=$src

# Preflight: no source files are written until ALL checks have passed.
if(-not ([string]$staged['lib/ui/experience.dart']).Contains('QwinCategoryKeywordSearch(') -or
   -not ([string]$staged['lib/ui/experience.dart']).Contains("import 'qwin_category_keywords.dart';")){
  throw 'Category integration missing; no files changed.'
}
if(-not ([string]$staged['lib/ui/inbox.dart']).Contains('length:2,child:Column(children:[')){
  throw 'Inbox still has more than two visible tabs. No files changed.'
}
$stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
$backup=Join-Path $env:USERPROFILE ('Downloads\Qwin_External_Backups\Qwin_UI_Categories_v10_'+$stamp)
foreach($rel in $relPaths){
  if($null -eq $original[$rel]){continue}
  $out=Join-Path $backup ($rel -replace '/','\')
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $out)|Out-Null
  [IO.File]::WriteAllText($out,[string]$original[$rel],[Text.UTF8Encoding]::new($false))
}
foreach($rel in $relPaths){
  $out=Join-Path $root ($rel -replace '/','\')
  $before=$original[$rel]
  $after=[string]$staged[$rel]
  if($null -ne $before -and ([string]$before).Replace(([string][char]13+[char]10),([string][char]10)) -ceq $after){continue}
  [IO.File]::WriteAllText($out,$after,[Text.UTF8Encoding]::new($false))
  Write-Host "Updated $rel" -ForegroundColor Green
}
Write-Host "Backup: $backup" -ForegroundColor Cyan
Write-Host 'Qwin Market + OLX preserved; eBay/Etsy UI paused.' -ForegroundColor Green
if($Build -or $Install){
  $builder=Join-Path $root 'scripts\build_android_local.ps1'
  if(-not (Test-Path $builder)){throw 'Android build script missing'}
  Push-Location $root
  try{
    if($Install){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder -Install}
    else{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder}
    if($LASTEXITCODE -ne 0){throw "Build failed with exit code $LASTEXITCODE"}
  }finally{Pop-Location}
}
