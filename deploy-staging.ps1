# deploy-staging.ps1 — deploy frontend staging + atualiza alias
Set-Location "$PSScriptRoot\Site\frontend"
$result = npx vercel deploy --yes 2>&1 | Out-String
Write-Host $result
$url = ($result | Select-String -Pattern 'Preview: (https://\S+)').Matches.Groups[1].Value
if ($url) {
    Write-Host "Aliasing $url -> agriflow-staging.vercel.app"
    npx vercel alias set $url agriflow-staging.vercel.app
} else {
    Write-Host "Nao foi possivel extrair a URL do deploy."
}
