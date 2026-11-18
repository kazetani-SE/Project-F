# Supabase CLI chỉ tự đọc .env ở root. Nạp riêng App Password từ backend/.env để team giữ một file secret.
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backendEnv = Join-Path $projectRoot 'backend/.env'

if (-not (Test-Path -LiteralPath $backendEnv)) {
    throw "Thiếu backend/.env. Hãy tạo file này từ backend/.env.example."
}

$passwordLine = Get-Content -LiteralPath $backendEnv |
    Where-Object { $_ -match '^PROJECTF_SMTP_APP_PASSWORD=' } |
    Select-Object -First 1
$password = if ($passwordLine) { $passwordLine.Substring($passwordLine.IndexOf('=') + 1).Trim().Trim('"') } else { '' }
if ([string]::IsNullOrWhiteSpace($password)) {
    throw "Thiếu PROJECTF_SMTP_APP_PASSWORD trong backend/.env."
}

$previousPassword = $env:PROJECTF_SMTP_APP_PASSWORD
try {
    $env:PROJECTF_SMTP_APP_PASSWORD = $password
    Push-Location $projectRoot
    try {
        & npx supabase start
        if ($LASTEXITCODE -ne 0) {
            throw "Không thể khởi động Supabase local (exit code $LASTEXITCODE)."
        }
    } finally {
        Pop-Location
    }
} finally {
    $env:PROJECTF_SMTP_APP_PASSWORD = $previousPassword
}
