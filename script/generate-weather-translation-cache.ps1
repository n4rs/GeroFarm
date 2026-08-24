$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sourceJson = & node --use-system-ca "$root\node_modules\tsx\dist\cli.mjs" "$PSScriptRoot\export-weather-translation-source.ts" | ConvertFrom-Json -AsHashtable
$language = @{
  "pt-PT"="pt"; "pt-BR"="pt"; "en"="en"; "fr"="fr"; "es"="es"; "nl"="nl"; "de"="de"; "ja"="ja"; "he"="he"; "tr"="tr"; "ar"="ar"; "pl"="pl"; "hr"="hr"; "el"="el"; "sv"="sv"; "no"="nb"; "da"="da"; "it"="it"; "uk"="uk"; "ro"="ro"; "fi"="fi"; "bg"="bg"; "hu"="hu"; "is"="is"; "sk"="sk"; "lt"="lt"; "sl"="sl"; "lv"="lv"
}
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function New-TranslatorToken {
  $page = (Invoke-WebRequest -Uri "https://www.bing.com/translator" -WebSession $session -UseBasicParsing).Content
  $script:ig = [regex]::Match($page, 'IG:"([^"]+)"').Groups[1].Value
  $protection = [regex]::Match($page, 'params_AbusePreventionHelper\s*=\s*\[([^\]]+)\]').Groups[1].Value.Split(',')
  $script:key = $protection[0]
  $script:token = $protection[1].Trim('"')
  if (-not $script:ig -or -not $script:key -or -not $script:token) { throw "Translator bootstrap response changed" }
}

function Invoke-TranslationBatch([string[]]$values, [string]$target) {
  $lines = for ($index = 0; $index -lt $values.Count; $index++) { "[[[{0:d3}]]] {1}" -f $index, $values[$index] }
  $text = $lines -join "`n"
  for ($attempt = 0; $attempt -lt 5; $attempt++) {
    try {
      $result = Invoke-RestMethod -Uri "https://www.bing.com/ttranslatev3?isVertical=1&IG=$script:ig&IID=translator.5028.1" -Method Post -WebSession $session -Body @{fromLang="en";to=$target;text=$text;token=$script:token;key=$script:key}
      $translated = [string]$result[0].translations[0].text
      $matches = [regex]::Matches($translated, '\[\[\[(\d{3})\]\]\]\s*([\s\S]*?)(?=\r?\n\[\[\[\d{3}\]\]\]|$)')
      if ($matches.Count -eq $values.Count) { return @($matches | ForEach-Object { $_.Groups[2].Value.Trim() }) }
    } catch {
      New-TranslatorToken
    }
    Start-Sleep -Milliseconds (500 * ($attempt + 1))
  }
  throw "Translation batch failed for $target"
}

New-TranslatorToken
$keys = @($sourceJson.source.Keys)
$result = [ordered]@{}
foreach ($locale in $sourceJson.supportedLocales) {
  if ($locale -eq "en") { $result[$locale] = $sourceJson.source; continue }
  $copy = [ordered]@{}
  for ($cursor = 0; $cursor -lt $keys.Count; $cursor += 12) {
    $count = [Math]::Min(12, $keys.Count - $cursor)
    $batchKeys = @($keys[$cursor..($cursor + $count - 1)])
    $batchValues = @($batchKeys | ForEach-Object { [string]$sourceJson.source[$_] })
    $translated = Invoke-TranslationBatch $batchValues $language[$locale]
    for ($index = 0; $index -lt $batchKeys.Count; $index++) { $copy[$batchKeys[$index]] = $translated[$index] }
  }
  $result[$locale] = $copy
  Write-Host "$locale`: $($keys.Count)"
}
$json = $result | ConvertTo-Json -Depth 5 -Compress
[IO.File]::WriteAllText((Join-Path $root ".weather-translation-cache.json"), $json, [Text.UTF8Encoding]::new($false))
