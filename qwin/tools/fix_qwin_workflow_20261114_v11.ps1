# Qwin seller UX v11. Windows PowerShell 5.1 compatible (ASCII installer).
# Non-destructive: verify all anchors before any source write and back up outside Git.
param([switch]$Build,[switch]$Install,[switch]$CheckOnly)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$root=Join-Path $env:USERPROFILE 'Downloads\QwinGit'
if(-not (Test-Path (Join-Path $root 'pubspec.yaml'))){throw 'QwinGit project missing'}
$files=@(
 'lib/ui/experience.dart',
 'lib/ui/screens.dart',
 'lib/ui/inbox.dart',
 'lib/l10n/qwin_strings.dart',
 'lib/services/olx_catalog.dart',
 'lib/services/neon_gateway.dart',
 'lib/ui/listing_editor.dart',
 'lib/ui/qwin_seller_category_picker.dart',
 'lib/ui/qwin_category_keywords.dart',
 'test/qwin_category_keywords_test.dart'
)
$before=@{}
$staged=@{}
foreach($rel in $files){
  $path=Join-Path $root ($rel -replace '/','\')
  if(Test-Path -LiteralPath $path){
    $s=[IO.File]::ReadAllText($path,[Text.Encoding]::UTF8)
    $before[$rel]=$s
    $staged[$rel]=$s.Replace([string][char]13+[char]10,[string][char]10)
  }elseif($rel -in @('lib/ui/qwin_category_keywords.dart','test/qwin_category_keywords_test.dart')){
    $before[$rel]=$null
    $staged[$rel]=''
  }else{
    throw "Required Qwin file missing: $rel. No files changed."
  }
}
function Replace-Section {
  param([string]$Source,[string]$Begin,[string]$End,[string]$Fragment)
  $i=$Source.IndexOf($Begin,[StringComparison]::Ordinal)
  if($i -lt 0){throw "Section not found: $Begin. No files changed."}
  $j=$Source.IndexOf($End,$i+$Begin.Length,[StringComparison]::Ordinal)
  if($j -lt 0){throw "Section terminator missing: $End. No files changed."}
  return $Source.Substring(0,$i)+$Fragment+$Source.Substring($j)
}
function Read-Remote {
  param([string]$Name)
  $url='https://raw.githubusercontent.com/maxximillian7-prog/mynw-site/main/qwin/tools/'+$Name+'?ui=11'
  $tmp=Join-Path $env:TEMP ('qwin_ui_'+[guid]::NewGuid().ToString('N')+'.txt')
  try{
    Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing
    $body=[IO.File]::ReadAllText($tmp,[Text.Encoding]::UTF8).Replace(
      [string][char]13+[char]10,[string][char]10)
    if($body.Length -lt 80 -or $body.StartsWith('<!DOCTYPE')){
      throw "Bad downloaded fragment: $Name"
    }
    return $body
  }finally{Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue}
}
$fragmentBase='ui_fix_20261114/'
$platform=Read-Remote ($fragmentBase+'platform_step.dartpart')
$category=Read-Remote ($fragmentBase+'category_step.dartpart')
$integrations=Read-Remote ($fragmentBase+'integration_screen.dartpart')
$homeButtons=Read-Remote ($fragmentBase+'home_controls.dartpart')
$autoCandidates=Read-Remote ($fragmentBase+'auto_candidates.dartpart')
$autoSelect=Read-Remote ($fragmentBase+'auto_select.dartpart')
$otherTranslations=Read-Remote ($fragmentBase+'translate_other_languages.dartpart')
$module=Read-Remote 'qwin_category_keywords_20261114.dart'
$testModule=Read-Remote 'qwin_category_keywords_test_20261114.dart'
if(-not $module.Contains('class QwinCategoryKeywords') -or
   -not $category.Contains('QwinSellerCategoryPicker(') -or
   -not $integrations.Contains('OLX Portugal') -or
   -not $homeButtons.Contains("t('filters')")){
  throw 'Downloaded UI fragments did not validate. No files changed.'
}
$staged['lib/ui/qwin_category_keywords.dart']=$module
$staged['test/qwin_category_keywords_test.dart']=$testModule

# Official OLX taxonomy: use local storage for a full month; allow manual refresh.
$catalog=[string]$staged['lib/services/olx_catalog.dart']
$catalog=$catalog.Replace('millisecondsSinceEpoch-fetchedAt<6*3600*1000',
  'millisecondsSinceEpoch-fetchedAt<30*24*3600*1000')
$catalog=$catalog.Replace("return translations==null?null:lang=='ru'?translations[0]:translations[1];",
  "return translations==null?null:lang=='ru'?translations[0]:lang=='en'?translations[1]:null;")
if(-not $catalog.Contains("import 'local_translation.dart';")){
  $anchor="import 'neon_gateway.dart';"
  if(-not $catalog.Contains($anchor)){throw 'Catalog imports changed. No files changed.'}
  $catalog=$catalog.Replace($anchor,$anchor+[char]10+"import 'local_translation.dart';")
}
$oldVisibility="if(locale=='pt'||gateway?.aiEnabled!=true||"+[char]10+
  '       gateway?.userId==null)return Future<void>.value();'
$newVisibility="if(locale=='pt')return Future<void>.value();"+[char]10+
  "    if({'ru','en'}.contains(locale)&&"+[char]10+
  '       (gateway?.aiEnabled!=true||gateway?.userId==null))return Future<void>.value();'
if($catalog.Contains($oldVisibility)){
  $catalog=$catalog.Replace($oldVisibility,$newVisibility)
}
if(-not $catalog.Contains('Non-RU/EN translations are performed once on device')){
  $start=$catalog.IndexOf('Future<void> _translateBatch(')
  if($start -lt 0){throw 'Catalog translation method missing. No files changed.'}
  $marker='    translating=true;notifyListeners();'
  $pos=$catalog.IndexOf($marker,$start,[StringComparison]::Ordinal)
  if($pos -lt 0){throw 'Catalog translation injection point missing. No files changed.'}
  $catalog=$catalog.Insert($pos,$otherTranslations)
}
$staged['lib/services/olx_catalog.dart']=$catalog

# Pause only Etsy/eBay. OLX MUST remain connected and enabled.
$gateway=[string]$staged['lib/services/neon_gateway.dart']
foreach($brand in @('etsy','ebay')){
  $pattern='bool get '+$brand+'Enabled\s*=>[^;]+;'
  $count=[regex]::Matches($gateway,$pattern).Count
  if($count -ne 1){throw "Gateway feature gate ambiguous: $brand. No files changed."}
  $gateway=[regex]::Replace($gateway,$pattern,
    'bool get '+$brand+'Enabled=>false;')
}
if(-not ($gateway -match 'bool get olxEnabled\s*=>') -or
   -not $gateway.Contains('bool get ebayEnabled=>false;')){
  throw 'OLX config or eBay pause gate missing. No files changed.'
}
$gateway=$gateway.Replace(
  "if(ebayUrl.isEmpty)return {'available':false,'items':<dynamic>[]};",
  "if(!ebayEnabled||ebayUrl.isEmpty)return {'available':false,'items':<dynamic>[]};")
$staged['lib/services/neon_gateway.dart']=$gateway

# Home: ONE search at the top, two symmetric filter/category buttons.
$xp=[string]$staged['lib/ui/experience.dart']
$imports=@(
 "import 'qwin_category_keywords.dart';",
 "import 'qwin_seller_category_picker.dart';"
)
$importAnchor="import 'olx_category_picker.dart';"
if(-not $xp.Contains($importAnchor)){throw 'Experience imports changed. No files changed.'}
foreach($item in $imports){
  if(-not $xp.Contains($item)){
    $xp=$xp.Replace($importAnchor,$importAnchor+[char]10+$item)
  }
}
# Legacy second category-search widget is removed with the old home controls.
$marketStart=$xp.IndexOf('class _QwinMarketExperienceState')
$marketEnd=$xp.IndexOf('class QwinProductCard',$marketStart)
if($marketStart -lt 0 -or $marketEnd -lt $marketStart){
  throw 'Qwin market layout not recognized. No files changed.'
}
$market=$xp.Substring($marketStart,$marketEnd-$marketStart)
$searchStart=$market.IndexOf('TextField(controller:search')
if($searchStart -lt 0){throw 'Main search not found. No files changed.'}
$filters=$market.IndexOf('SizedBox(width:double.infinity,child:OutlinedButton.icon(',
  $searchStart,[StringComparison]::Ordinal)
if($filters -lt 0){throw 'Current filter layout not found. No files changed.'}
$endMark='const SizedBox(height:21),'
$end=$market.IndexOf($endMark,$filters,[StringComparison]::Ordinal)
if($end -lt 0 -or $end-$filters -gt 9000){
  throw 'Home category control boundary not found. No files changed.'
}
$market=$market.Substring(0,$filters)+$homeButtons+
  $market.Substring($end+$endMark.Length)
# Avoid duplicate if v10 or earlier patch already wrapped eBay paging.
$market=$market.Replace('if(selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&',
  'if(widget.store.neon?.ebayEnabled==true&&selectedOlxCategory==null&&widget.store.ebayBrowseAvailable&&')
if(-not $market.Contains("if(x.isExternal&&x.externalSource=='ebay')return false;")){
  $filter='items=items.where((x){'
  if($market.Contains($filter)){
    $market=$market.Replace($filter,$filter+[char]10+
      "      if(x.isExternal&&x.externalSource=='ebay')return false;")
  }
}
if(-not $market.Contains('_queueQwinServerSearch()')){
  # Legacy branch can still filter its in-memory Qwin feed.
  $market=$market.Replace('                            _queueQwinServerSearch();','')
}
$xp=$xp.Substring(0,$marketStart)+$market+$xp.Substring($marketEnd)

# Seller category: one AI-selected official leaf, confirmation, manual change.
$xp=Replace-Section $xp 'Widget _categoryStep()' 'List<String> _guidedQuestions()' $category
$xp=Replace-Section $xp 'Widget _platformStep()' 'Widget _destinationCategoryInfo()' $platform
# Updated AI description is available before the category step. Use its
# product kind (not just brand/model) against the cached OLX catalogue.
$start=$xp.IndexOf('Future<void> _loadOlxSuggestions(')
$stop=$xp.IndexOf('QwinCategory _matchLocalCategory(',$start)
if($start -ge 0 -and $stop -gt $start){
  $part=$xp.Substring($start,$stop-$start)
  if($part.Contains('final local=official.searchAll(')){
    if(-not $part.Contains('for(final category in QwinCategoryKeywords.find(')){
      $part=$part.Replace('final local=official.searchAll(',
        $autoCandidates+'final local=official.searchAll(')
    }
    # When local matching succeeds, avoid unnecessary repeated API suggestions.
    $part=$part.Replace('if(!widget.store.isGuest&&widget.store.neon?.olxEnabled==true){',
      'if(matches.isEmpty&&!widget.store.isGuest&&widget.store.neon?.olxEnabled==true){')
    if(-not $part.Contains('if(selectedCategoryId==null&&matches.isNotEmpty)')){
      $needle='      });'+[char]10+'    }catch(_){'
      if($part.Contains($needle)){
        $part=$part.Replace($needle,'      });'+[char]10+$autoSelect+'    }catch(_){')
      }else{throw 'Automatic OLX category selection anchor missing. No files changed.'}
    }
  }
  $xp=$xp.Substring(0,$start)+$part+$xp.Substring($stop)
}
# OLX account state belongs to its own OAuth broker. Always re-check it
# when the user presses Refresh on the marketplace choice step.
$linkStart=$xp.IndexOf('Future<void> _loadPlatformConnections()')
if($linkStart -ge 0){
  $linkEnd=$xp.IndexOf('Future<void> _refreshDestinationCategory()',$linkStart)
  if($linkEnd -gt $linkStart){
    $linkBody=$xp.Substring($linkStart,$linkEnd-$linkStart)
    if(-not $linkBody.Contains("final currentOlx=await neon.olxAction('status');")){
      $mark='if(neon.etsyEnabled){'
      $i=$linkBody.IndexOf($mark,[StringComparison]::Ordinal)
      if($i -ge 0){
        $block=@'
if(neon.olxEnabled){
      try{
        final currentOlx=await neon.olxAction('status');
        if(mounted&&neon.userId==accountId){
          setState((){
            olxLinked=currentOlx['connected']==true;
            if(!olxLinked)inOlx=false;
          });
        }
      }catch(_){/* Do not infer a disconnect on temporary API failures. */}
    }
    
'@
        $linkBody=$linkBody.Insert($i,$block)
        $xp=$xp.Substring(0,$linkStart)+$linkBody+$xp.Substring($linkEnd)
      }
    }
  }
}
$xp=$xp.Replace("if(uri.host=='ebay'){",
  "if(uri.host=='ebay'&&widget.store.neon?.ebayEnabled==true){")
$xp=$xp.Replace("if(uri.host=='etsy'){",
  "if(uri.host=='etsy'&&widget.store.neon?.etsyEnabled==true){")
$xp=$xp.Replace("if(inEbay)...[",
  "if(widget.store.neon?.ebayEnabled==true&&inEbay)...[")
$xp=$xp.Replace("if(inEtsy)...[",
  "if(widget.store.neon?.etsyEnabled==true&&inEtsy)...[")
# The final screen must go to the CURRENT marketplace step, not always step 0.
$finalStart=$xp.IndexOf('Widget _finalStep()')
if($finalStart -lt 0){throw 'Final publish screen missing. No files changed.'}
$final=$xp.Substring($finalStart)
$targetStep=if($xp.Contains('if(step==3)_platformStep()')){3}else{0}
$final=$final.Replace('onPressed:()=>setState(()=>step=0)',
  ('onPressed:()=>setState(()=>step='+$targetStep+')'))
$xp=$xp.Substring(0,$finalStart)+$final
# Remove obsolete seller category-search widget import if no longer used.
if(-not $xp.Contains('QwinSellerCategorySearch(')){
  $xp=$xp.Replace("import 'qwin_seller_category_search.dart';"+[char]10,'')
}
$staged['lib/ui/experience.dart']=$xp

# Restore the OLX integration card even when the seller has not linked an account.
$profile=[string]$staged['lib/ui/screens.dart']
$profile=Replace-Section $profile 'Widget _integrationScreen(){' '@override Widget build(BuildContext context){' $integrations
$profile=$profile.Replace(('OLX '+[char]183+' Etsy '+[char]183+' eBay'),
  'OLX Portugal')
$staged['lib/ui/screens.dart']=$profile

# Remove deprecated provider mentions from home banner in all three UI languages.
$l10n=[string]$staged['lib/l10n/qwin_strings.dart']
$bannerPattern="'compactBanner'\s*:\s*\{[^\r\n]+\},"
$bannerMatch=[regex]::Matches($l10n,$bannerPattern)
if($bannerMatch.Count -ne 1){throw 'Home banner translations changed. No files changed.'}
$banner="'compactBanner': {'ru': 'Qwin Market + OLX Portugal', "+ 
  "'en': 'Qwin Market + OLX Portugal', 'pt': 'Qwin Market + OLX Portugal'},"
$l10n=[regex]::Replace($l10n,$bannerPattern,$banner)
$staged['lib/l10n/qwin_strings.dart']=$l10n

# Chats: two tabs, expose title and photo when the advert was published via Qwin.
$inbox=[string]$staged['lib/ui/inbox.dart']
$inbox=$inbox.Replace('length:4,child:Column(children:[',
  'length:2,child:Column(children:[')
$inbox=[regex]::Replace($inbox,
  "\s*const Tab\(text:'Etsy'\),\s*const Tab\(text:'eBay'\)",'')
$inbox=[regex]::Replace($inbox,
  '\s*QwinEtsyAlertsTab\(\s*store:store,locale:locale,active:active\s*\),\s*QwinEbayMessagesTab\(\s*store:store,locale:locale,active:active\s*\),','')
$inbox=$inbox.Replace("import 'etsy_notifications.dart';"+[char]10,'')
$inbox=$inbox.Replace("import 'ebay_messages.dart';"+[char]10,'')
$titleOld="      final advertId=thread['advert_id']?.toString()??'';"+[char]10+
  "      return advertId.isEmpty?'OLX "+[char]183+" Chat':'OLX "+[char]183+" #"+'$advertId'+"';"
$titleNew="      final title=thread['advert_title']?.toString().trim()??'';"+[char]10+
  "      if(title.isNotEmpty)return title;"+[char]10+
  "      final advertId=thread['advert_id']?.toString()??'';"+[char]10+
  "      return advertId.isEmpty?'OLX Chat':'OLX #"+'$advertId'+"';"
if($inbox.Contains($titleOld)){$inbox=$inbox.Replace($titleOld,$titleNew)}
# A Qwin-published OLX advert has its source listing and thumbnail.
$loadAnchor='      if(mounted)setState(()=>threads=rows);'
if($inbox.Contains($loadAnchor)){
  $metaCode=@'
      if(widget.source=='olx'&&rows.isNotEmpty){
        final numbers=rows.map((row)=>row['advert_id']?.toString()??'')
          .where((id)=>RegExp(r'^[0-9]{1,18}$').hasMatch(id)).toSet();
        if(numbers.isNotEmpty){
          try{
            final ids=numbers.take(50).join(',');
            final linked=await widget.store.neon!.list(
              'qwin_olx_publications?select=listing_id,olx_advert_id'
              '&olx_advert_id=in.($ids)&limit=100');
            final byAdvert=<String,String>{
              for(final item in linked)
                if(item['olx_advert_id']!=null&&item['listing_id']!=null)
                  item['olx_advert_id'].toString():item['listing_id'].toString(),
            };
            for(final row in rows){
              final listingId=byAdvert[row['advert_id']?.toString()];
              if(listingId==null)continue;
              final item=widget.store.listingFor(listingId);
              if(item==null)continue;
              row['advert_title']=item.translations[widget.locale]?['title']??item.title;
              row['qwin_listing_id']=listingId;
            }
          }catch(_){/* OLX thread access stays available. */}
        }
      }
'@
  $inbox=$inbox.Replace($loadAnchor,$metaCode+$loadAnchor)
}
$leadingOld="          leading:widget.source=='qwin'?"+[char]10+
  "            _ThreadListingThumbnail(store:widget.store,"+[char]10+
  "              listing:widget.store.listingFor(thread['listing_id']?.toString()??'')):"
$leadingNew="          leading:(widget.source=='qwin'||thread['qwin_listing_id']!=null)?"+[char]10+
  "            _ThreadListingThumbnail(store:widget.store,"+[char]10+
  "              listing:widget.store.listingFor((widget.source=='qwin'"+[char]10+
  "                ?thread['listing_id']:thread['qwin_listing_id'])?.toString()??'')):"
if($inbox.Contains($leadingOld)){$inbox=$inbox.Replace($leadingOld,$leadingNew)}
$staged['lib/ui/inbox.dart']=$inbox

# Hide Etsy in editor but leave previously stored connection data untouched.
$editor=[string]$staged['lib/ui/listing_editor.dart']
$editor=$editor.Replace("if(platforms.containsKey('etsy'))",
  "if(widget.store.neon?.etsyEnabled==true&&platforms.containsKey('etsy'))")
$staged['lib/ui/listing_editor.dart']=$editor

# Strict preflight. Abort with all files unmodified if any required UI is absent.
if(-not ([string]$staged['lib/ui/inbox.dart']).Contains("final title=thread['advert_title']")){
  throw 'OLX conversation title patch not applied. No files changed.'
}
if(-not ([string]$staged['lib/ui/experience.dart']).Contains("Widget _categoryStep()=>") -or
   -not ([string]$staged['lib/ui/experience.dart']).Contains('QwinSellerCategoryPicker(') -or
   -not ([string]$staged['lib/ui/screens.dart']).Contains('olxAvailable') -or
   -not ([string]$staged['lib/ui/experience.dart']).Contains('QwinCategoryKeywordSearch(') -or
   -not ([string]$staged['lib/ui/inbox.dart']).Contains('length:2,child:Column(children:[')){
  throw 'Qwin patch cross-file preflight failed. No files changed.'
}
Write-Host 'Preflight OK. Qwin, OLX, main search, categories and integration card ready.' -ForegroundColor Green
if($CheckOnly){return}

$backup=Join-Path $env:USERPROFILE (
  'Downloads\Qwin_External_Backups\Workflow_v11_'+(Get-Date -Format 'yyyyMMdd_HHmmss'))
foreach($rel in $files){
  if($null -eq $before[$rel]){continue}
  $target=Join-Path $backup ($rel -replace '/','\')
  New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent)|Out-Null
  [IO.File]::WriteAllText($target,[string]$before[$rel],[Text.UTF8Encoding]::new($false))
}
foreach($rel in $files){
  $target=Join-Path $root ($rel -replace '/','\')
  $old=$before[$rel]
  $new=[string]$staged[$rel]
  if($null -ne $old -and ([string]$old).Replace(
      [string][char]13+[char]10,[string][char]10) -ceq $new){continue}
  New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent)|Out-Null
  [IO.File]::WriteAllText($target,$new,[Text.UTF8Encoding]::new($false))
  Write-Host "UPDATED $rel" -ForegroundColor Green
}
Write-Host "Backups: $backup" -ForegroundColor Cyan
if($Build -or $Install){
  Push-Location $root
  try{
    $builder='scripts\build_android_local.ps1'
    if(-not (Test-Path $builder)){throw 'Qwin Android build helper missing'}
    if($Install){& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder -Install}
    else{& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $builder}
    if($LASTEXITCODE -ne 0){throw "Android build failed, exit $LASTEXITCODE"}
  }finally{Pop-Location}
}
