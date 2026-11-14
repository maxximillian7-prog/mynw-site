# Qwin - hidden paused marketplaces + multilingual official OLX category search.
# For Windows PowerShell 5.1 and QwinGit with existing local patches.
# Nothing deleted. All modifications are validated and backed up outside the repo.
param([switch]$Build,[switch]$Install)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root=Join-Path $env:USERPROFILE 'Downloads\QwinGit'
if(-not (Test-Path (Join-Path $root 'pubspec.yaml'))) {throw 'QwinGit is missing'}
$required=@(
 'lib/services/neon_gateway.dart',
 'lib/ui/experience.dart',
 'lib/ui/screens.dart',
 'lib/ui/inbox.dart',
 'lib/ui/listing_editor.dart'
)
$original=@{}
$staged=@{}
foreach($rel in $required) {
 $path=Join-Path $root ($rel -replace '/','\')
 if(-not (Test-Path -LiteralPath $path)) {throw "Missing source: $rel"}
 $raw=[IO.File]::ReadAllText($path,[Text.Encoding]::UTF8)
 $original[$rel]=$raw
 $staged[$rel]=$raw.Replace([string][char]13+[char]10,[string][char]10)
}
function Replace-One {
 param([string]$Path,[string]$From,[string]$To,[bool]$Mandatory=$true)
 $s=[string]$staged[$Path]
 if($s.Contains($To)){return}
 $count=([regex]::Matches($s,[regex]::Escape($From))).Count
 if($count -eq 1){$staged[$Path]=$s.Replace($From,$To);return}
 if($Mandatory){throw "Source mismatch in $Path; expected one anchor, got $count. Nothing written."}
 Write-Warning "Optional UI pattern missing in $Path; preserved unchanged."
}
function Replace-Regex {
 param([string]$Path,[string]$Pattern,[string]$Replacement)
 $s=[string]$staged[$Path]
 $staged[$Path]=[regex]::Replace($s,$Pattern,$Replacement)
}
# Download exact, reviewed Dart module from the site repository.
$sourceUrl='https://raw.githubusercontent.com/maxximillian7-prog/mynw-site/main/qwin/tools/qwin_category_keywords_20261114.dart'
$tmp=Join-Path $env:TEMP ('qwin_keywords_'+[guid]::NewGuid().ToString('N')+'.dart')
try{
 Invoke-WebRequest -Uri $sourceUrl -OutFile $tmp -UseBasicParsing
 $newModule=[IO.File]::ReadAllText($tmp,[Text.Encoding]::UTF8)
}finally{Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue}
if($newModule.Length -lt 9000 -or
  -not $newModule.Contains('class QwinCategoryKeywords') -or
  -not $newModule.Contains('class QwinCategoryKeywordSearch')){
 throw 'Category module validation failed. Nothing modified.'
}
$moduleRel='lib/ui/qwin_category_keywords.dart'
$modulePath=Join-Path $root ($moduleRel -replace '/','\')
if(Test-Path $modulePath){
 $original[$moduleRel]=[IO.File]::ReadAllText($modulePath,[Text.Encoding]::UTF8)
} else {
 $original[$moduleRel]=$null
}
$staged[$moduleRel]=$newModule

# Marketplace feature gates: keep all URLs, credentials, records, sources.
$gateway='lib/services/neon_gateway.dart'
Replace-One $gateway 'bool get etsyEnabled=>etsyUrl.isNotEmpty;' 'bool get etsyEnabled=>false; // Temporarily disabled'
Replace-One $gateway 'bool get ebayEnabled=>ebayUrl.isNotEmpty;' 'bool get ebayEnabled=>false; // Temporarily disabled'
$g=[string]$staged[$gateway]
if(-not ($g -match 'bool get etsyEnabled\s*=>\s*false') -or
   -not ($g -match 'bool get ebayEnabled\s*=>\s*false')){
 throw 'Required feature gates are not disabled. No files changed.'
}
# Also prevent buyer Browse calls from cached widgets.
$g=$g.Replace("if(ebayUrl.isEmpty)return {'available':false,'items':<dynamic>[]};",
  "if(!ebayEnabled||ebayUrl.isEmpty)return {'available':false,'items':<dynamic>[]};")
$g=$g.Replace("if(ebayUrl.isEmpty||id.length>150)return null;",
  "if(!ebayEnabled||ebayUrl.isEmpty||id.length>150)return null;")
$staged[$gateway]=$g

$experience='lib/ui/experience.dart'
Replace-One $experience "import 'olx_category_picker.dart';" ("import 'olx_category_picker.dart';"+[char]10+"import 'qwin_category_keywords.dart';")
Replace-One $experience 'QwinSellerCategorySearch(' 'QwinCategoryKeywordSearch('

# Home: a keyword category search in all common user languages, using only actual OLX IDs.
$ex=[string]$staged[$experience]
$begin=$ex.IndexOf('class _QwinMarketExperienceState')
$end=$ex.IndexOf('class QwinProductCard')
if($begin -lt 0 -or $end -le $begin){throw 'Market view layout not recognized. No files modified.'}
$home=$ex.Substring($begin,$end-$begin)
if(-not $home.Contains('QwinCategoryKeywordSearch(')){
 $anchor='OlxCategoryPanel(catalog:widget.store.catalog,'
 $idx=$home.IndexOf($anchor)
 if($idx -lt 0){throw 'Home category picker not found. No files modified.'}
 $insert=@'
QwinCategoryKeywordSearch(
              catalog:widget.store.catalog,
              locale:widget.locale,
              sellerOnly:false,
              onSelected:(node){
                setState(()=>selectedOlxCategory=node.id);
                _queueQwinServerSearch();
              }),
            const SizedBox(height:9),
'@
 $home=$home.Insert($idx,$insert)
}
# Do not show even old cached external eBay items in the local feed.
$oldWhere="items=items.where((x){"
$newWhere="items=items.where((x){"+[char]10+"      if(x.isExternal&&x.externalSource=='ebay')return false;"
if(-not $home.Contains("if(x.isExternal&&x.externalSource=='ebay')return false;")){
 if(-not $home.Contains($oldWhere)){throw 'Feed filter not found. No files modified.'}
 $home=$home.Replace($oldWhere,$newWhere)
}
if($home.Contains('if(selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&')){
 $home=$home.Replace('if(selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&',
     'if(widget.store.neon?.ebayEnabled==true&&selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&')
}
# The eBay buyer widget was separate from the seller gate: hide the entire sliver.
$pattern='SliverToBoxAdapter[ \t\r\n]*\([ \t\r\n]*child[ \t]*:[ \t\r\n]*QwinEbayProductionSearch[ \t]*\('
$m=[regex]::Match($home,$pattern)
if($m.Success){
 $start=[math]::Max(0,$m.Index-130)
 $prefix=$home.Substring($start,$m.Index-$start)
 if(-not $prefix.Contains('ebayEnabled==true')){
  $home=$home.Insert($m.Index,'if(widget.store.neon?.ebayEnabled==true) ')
 }
}
$ex=$ex.Substring(0,$begin)+$home+$ex.Substring($end)
# Old deep-links should not try to reopen disabled providers.
$ex=$ex.Replace("if(uri.host=='ebay'){","if(uri.host=='ebay'&&widget.store.neon?.ebayEnabled==true){")
$ex=$ex.Replace("if(uri.host=='etsy'){","if(uri.host=='etsy'&&widget.store.neon?.etsyEnabled==true){")
# A bookmarked external item cannot bypass the paused eBay UI.
$oldDirect="if(item.isExternal)return _ebayItemDetail(item);"
$newDirect="if(item.isExternal){"+[char]10+
  "      if(widget.store.neon?.ebayEnabled!=true)return Scaffold("+[char]10+
  "        appBar:AppBar(),body:Center(child:Text("+[char]10+
  "          QwinStrings.t(widget.locale,'itemUnavailable'))));"+[char]10+
  "      return _ebayItemDetail(item);"+[char]10+"    }"
if($ex.Contains($oldDirect)){$ex=$ex.Replace($oldDirect,$newDirect)}
$staged[$experience]=$ex

# Seller: recognize the kind of item from edited description and visual evidence
# BEFORE applying brand/logo-biased generic category search.
$ex=[string]$staged[$experience]
$semanticMarker='final local=official.searchAll('
if(-not $ex.Contains('QwinCategoryKeywords.find(official,query,')){
 $semantic=@'
      final semantic=QwinCategoryKeywords.find(official,query,
        description:[detail,evidence].join(' '),locale:widget.locale,
        sellerOnly:true,limit:12,prioritizeDescription:true);
      for(final node in semantic){
        if(rejectedOlxSuggestionIds.contains(node.id)||!seen.add(node.id)||
          QwinProductIntent.contradicts(query,detail,
            official.pathLabel(node.id,'pt')))continue;
        matches.add({'id':node.id,'is_leaf':true,'name':node.namePt});
      }
'@
 if(-not $ex.Contains($semanticMarker)){throw 'Seller category search changed; no files modified.'}
 $ex=$ex.Replace($semanticMarker,$semantic+$semanticMarker)
}
if(-not $ex.Contains('...QwinCategoryKeywords.portugueseTerms(productContext,max:8),')){
 $ex=$ex.Replace('        ...primary,'+([char]10),
   '        ...primary,'+([char]10)+
   '        ...QwinCategoryKeywords.portugueseTerms(productContext,max:8),'+([char]10))
}
# Always keep legacy Etsy/eBay switches behind the disabled feature gates.
# No user-facing channel labels on the Qwin Market home.
$staged[$experience]=$ex

# Profile integration screen: hide the entire Etsy card and eBay panel, not
# merely their network requests. Apply even if earlier patch did not match.
$screens='lib/ui/screens.dart'
$screen=[string]$staged[$screens]
$marker="QwinStrings.t(widget.locale,'etsyConnection')"
$pos=$screen.IndexOf($marker)
if($pos -ge 0){
 $card=$screen.LastIndexOf('Card(', $pos)
 if($card -lt 0 -or $pos-$card -gt 1500){throw 'Etsy integration card cannot be identified. Nothing written.'}
 $from=[math]::Max(0,$card-135)
 $prefix=$screen.Substring($from,$card-$from)
 if(-not $prefix.Contains('etsyEnabled==true') -and
    -not $prefix.Contains('if(false)')){
  $screen=$screen.Insert($card,'if(widget.store.neon?.etsyEnabled==true) ')
 }
}
$screen=[regex]::Replace($screen,
 'if\s*\(\s*signedIn\s*\)\s*EbayConnectionPanel\s*\(',
 'if(signedIn&&widget.store.neon?.ebayEnabled==true)EbayConnectionPanel(')
$screen=$screen.Replace('OLX · Etsy · eBay','OLX Portugal')
$screen=$screen.Replace('OLX / Etsy / eBay','OLX Portugal')
$screen=$screen.Replace('OLX, Etsy, eBay','OLX Portugal')
$staged[$screens]=$screen

# Inbox: show only Qwin and OLX tabs. Older notifications are kept in DB.
$inbox='lib/ui/inbox.dart'
$box=[string]$staged[$inbox]
$box=$box.Replace('length:4,child:Column(children:[','length:2,child:Column(children:[')
$box=$box.Replace("          const Tab(text:'Etsy'),"+([char]10)+
  "          const Tab(text:'eBay')]),","          ]),")
# The tab spelling above differs between branches; prefer a complete-structure update.
$box=[regex]::Replace($box,
 "\s*const Tab\(text:'Etsy'\),\s*const Tab\(text:'eBay'\)\]\)",
 '])')
$box=[regex]::Replace($box,
 '\s*QwinEtsyAlertsTab\(store:store,locale:locale,active:active\),\s*QwinEbayMessagesTab\(store:store,locale:locale,active:active\),','')
$staged[$inbox]=$box

# Editing previously-created listings must not expose a disabled Etsy toggle.
$edit='lib/ui/listing_editor.dart'
$v=[string]$staged[$edit]
$v=$v.Replace("if(platforms.containsKey('etsy'))",
 "if(widget.store.neon?.etsyEnabled==true&&platforms.containsKey('etsy'))")
$staged[$edit]=$v

# Preflight cross-file contracts before writing any file.
if(-not ([string]$staged[$experience]).Contains("QwinCategoryKeywordSearch(") -or
   -not ([string]$staged[$experience]).Contains("QwinCategoryKeywords.find(official,query,") -or
   -not ([string]$staged[$experience]).Contains("import 'qwin_category_keywords.dart';")){
 throw 'Category UI/algorithm validation failed; no files modified.'
}
if(-not ([string]$staged[$inbox]).Contains('length:2,child:Column(children:[')){
 throw 'Two-tab inbox validation failed; no files modified.'
}

$stamp=Get-Date -Format 'yyyyMMdd_HHmmss'
$backup=Join-Path $env:USERPROFILE ('Downloads\Qwin_External_Backups\Category_And_UI_'+$stamp)
foreach($rel in @($original.Keys)){
 if($null -eq $original[$rel]){continue}
 $dst=Join-Path $backup ($rel -replace '/','\')
 New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
 [IO.File]::WriteAllText($dst,[string]$original[$rel],[Text.UTF8Encoding]::new($false))
}
# Commit after all preflight checks and backups pass.
foreach($rel in @($staged.Keys)){
 $dst=Join-Path $root ($rel -replace '/','\')
 $old=$original[$rel]
 $new=[string]$staged[$rel]
 if($null -ne $old -and ([string]$old).Replace([string][char]13+[char]10,[string][char]10) -ceq $new){continue}
 New-Item -ItemType Directory -Path (Split-Path -Parent $dst) -Force | Out-Null
 [IO.File]::WriteAllText($dst,$new,[Text.UTF8Encoding]::new($false))
 Write-Host "UPDATED: $rel" -ForegroundColor Green
}
Write-Host "Backup: $backup" -ForegroundColor Cyan
Write-Host 'UI hidden: eBay and Etsy. Active channels: Qwin Market and OLX.' -ForegroundColor Green
Write-Host 'Search RU/PT/EN/UK/ES/FR/DE/IT: matches only official OLX IDs.' -ForegroundColor Green
if($Build -or $Install){
 $builder=Join-Path $root 'scripts\build_android_local.ps1'
 if(-not (Test-Path $builder)){throw 'Qwin local build script missing'}
 Push-Location $root
 try{
   if($Install){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder -Install}
   else{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder}
   if($LASTEXITCODE -ne 0){throw "Build exit code $LASTEXITCODE"}
 }finally{Pop-Location}
}
