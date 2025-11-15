$port = 8000
$path = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server running at http://localhost:$port/"
Write-Host "Press Ctrl+C to stop the server"
Write-Host ""

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $localPath = $request.Url.LocalPath
    if ($localPath -eq "/") {
        $localPath = "/index.html"
    }
    
    $filePath = Join-Path $path $localPath.TrimStart('/')
    
    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $extension = [System.IO.Path]::GetExtension($filePath)
        
        $contentType = switch ($extension) {
            ".html" { "text/html" }
            ".css" { "text/css" }
            ".js" { "application/javascript" }
            ".json" { "application/json" }
            default { "application/octet-stream" }
        }
        
        $response.ContentType = $contentType
        $response.ContentLength64 = $content.Length
        $response.StatusCode = 200
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
        $response.ContentLength64 = $notFound.Length
        $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }
    
    $response.Close()
}

