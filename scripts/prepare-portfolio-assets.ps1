param(
  [Parameter(Mandatory = $true)]
  [string]$ArchivePath
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$outputRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "public\media\portfolio"))
$dataRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot "src\data"))
$resolvedArchive = (Resolve-Path -LiteralPath $ArchivePath -ErrorAction Stop).Path

if (-not (Test-Path -LiteralPath $resolvedArchive -PathType Leaf)) {
  throw "Portfolio archive not found: $resolvedArchive"
}

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg is required to prepare portfolio assets."
}

$assets = @(
  @{ file = "Sermova-Logo-3.jpg"; slug = "sermova-logo-paper"; group = "sermova"; alt = "SERMOVA logo embossed on textured white paper"; focal = "50% 50%" },
  @{ file = "Sermova-Logo-5.jpg"; slug = "sermova-building-sign"; group = "sermova"; alt = "SERMOVA exterior building sign"; focal = "50% 45%" },
  @{ file = "Sermova Logo 2.jpg"; slug = "sermova-logo-sketch"; group = "sermova"; alt = "SERMOVA logo development sketches"; focal = "50% 50%" },
  @{ file = "Sermova-Logo-8.jpg"; slug = "sermova-flags"; group = "sermova"; alt = "SERMOVA identity applied to outdoor flags"; focal = "50% 50%" },
  @{ file = "Sermova-Logo-4.jpg"; slug = "sermova-facade"; group = "sermova"; alt = "SERMOVA signage mounted on a building facade"; focal = "50% 50%" },
  @{ file = "Sermova-Logo-7.jpg"; slug = "sermova-vehicle"; group = "sermova"; alt = "SERMOVA vehicle graphics on a white SUV"; focal = "54% 50%" },
  @{ file = "Sermova-Logo-9.jpg"; slug = "sermova-brand-system"; group = "sermova"; alt = "SERMOVA brand system across digital and printed applications"; focal = "50% 50%" },
  @{ file = "Sermova-Logo-10.jpg"; slug = "sermova-billboard"; group = "sermova"; alt = "SERMOVA outdoor billboard application"; focal = "50% 50%" },

  @{ file = "Bright Clean Logo Presentation Mockups (1) copy (1).jpg"; slug = "altec-logo-paper"; group = "altec"; alt = "ALTEC Pro logo embossed on white paper"; focal = "50% 50%" },
  @{ file = "Sign_Mockup_(6).jpg"; slug = "altec-building-sign"; group = "altec"; alt = "ALTEC Pro rooftop signage on a glass building"; focal = "50% 42%" },
  @{ file = "Office Mockup Vol 22 B copy.jpg"; slug = "altec-office-sign"; group = "altec"; alt = "ALTEC Pro interior office signage"; focal = "50% 50%" },
  @{ file = "sketch copy.jpg"; slug = "altec-sketch"; group = "altec"; alt = "ALTEC Pro identity sketching process"; focal = "50% 50%" },
  @{ file = "Pick up.jpg"; slug = "altec-vehicle"; group = "altec"; alt = "ALTEC Pro vehicle livery on a service van"; focal = "50% 50%" },
  @{ file = "Mockup_set copy 2.jpg"; slug = "altec-brand-system"; group = "altec"; alt = "ALTEC Pro identity across stationery and digital devices"; focal = "50% 50%" },
  @{ file = "Free Outdoor Flag Poles Mockup copy.jpg"; slug = "altec-flags"; group = "altec"; alt = "ALTEC Pro identity applied to outdoor flags"; focal = "50% 50%" },

  @{ file = "Wall Logo Mockup (1).jpg"; slug = "identity-wall-mark"; group = "identity"; alt = "Dimensional brand mark mounted on a timber wall"; focal = "50% 50%" },
  @{ file = "01_sketch_mockup.jpg"; slug = "identity-sketch-one"; group = "identity"; alt = "Designer drawing an identity concept on tracing paper"; focal = "50% 50%" },
  @{ file = "05_sketch_mockup.jpg"; slug = "identity-sketch-two"; group = "identity"; alt = "Energy consulting logo sketch in progress"; focal = "50% 50%" },
  @{ file = "03_sketch_mockup.jpg"; slug = "identity-sketch-three"; group = "identity"; alt = "Designer refining an energy consulting symbol"; focal = "50% 50%" },
  @{ file = "02_sketch_mockup.jpg"; slug = "identity-sketch-four"; group = "identity"; alt = "Identity construction sketch with ruler and pencil"; focal = "50% 50%" },
  @{ file = "collage_20160128151249499.jpg"; slug = "identity-process-collage"; group = "identity"; alt = "Identity process collage from sketches to final mark"; focal = "50% 50%" },

  @{ file = "Flyera1.jpg"; slug = "shop-flyer"; group = "shop"; alt = "Red and black promotional flyer design"; focal = "50% 50%" },
  @{ file = "Tshirt.jpg"; slug = "shop-tshirt"; group = "shop"; alt = "Printed white team T-shirt"; focal = "50% 42%" },
  @{ file = "Qeramik Vizitkarta.jpg"; slug = "shop-business-cards"; group = "shop"; alt = "Ceramik business cards presented in a clean stack"; focal = "50% 50%" },
  @{ file = "2-Badge Mockup.jpg"; slug = "shop-badges"; group = "shop"; alt = "Custom printed round badges"; focal = "50% 50%" },
  @{ file = "Mocku up ushqimi.jpg"; slug = "shop-menu"; group = "shop"; alt = "Restaurant menu and food photography layout"; focal = "50% 50%" },
  @{ file = "5. Open Notebook Mockup.jpg"; slug = "shop-notebook"; group = "shop"; alt = "Open branded notebook with green cover"; focal = "50% 50%" },
  @{ file = "Spiral_Book_Mockup_1 copy.jpg"; slug = "shop-spiral-book"; group = "shop"; alt = "Branded spiral notebook cover"; focal = "50% 50%" },
  @{ file = "Shkrepsa_kimika _mockup.jpg"; slug = "shop-pens"; group = "shop"; alt = "Custom printed promotional pens"; focal = "50% 50%" },
  @{ file = "Deko Fix.jpg"; slug = "shop-brochure"; group = "shop"; alt = "Open product brochure with detailed layouts"; focal = "50% 50%" },
  @{ file = "Prezentimi Logos.jpg"; slug = "shop-apparel-kit"; group = "shop"; alt = "Branded apparel and promotional kit"; focal = "50% 50%" },
  @{ file = "Brochure-A4d.jpg"; slug = "shop-catalog"; group = "shop"; alt = "Open A4 product catalog held in hand"; focal = "50% 50%" },
  @{ file = "Rollup_Stand_mockup.jpg"; slug = "shop-rollup"; group = "shop"; alt = "Freestanding printed roll-up banner"; focal = "50% 50%" },
  @{ file = "3-Free_Round_Sticker_Mockup_6 copy.jpg"; slug = "shop-stickers"; group = "shop"; alt = "Round branded stickers arranged on a pale background"; focal = "50% 50%" },

  @{ file = "DSCN9926.jpg"; slug = "production-cutting"; group = "production"; alt = "CUBE production specialist cutting a large-format graphic"; focal = "58% 50%" },
  @{ file = "DSCN9928.jpg"; slug = "production-detail"; group = "production"; alt = "Close view of hand-finished large-format production work"; focal = "50% 48%" }
)

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("cube-portfolio-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null

$archive = [System.IO.Compression.ZipFile]::OpenRead($resolvedArchive)
$manifest = @()

try {
  foreach ($asset in $assets) {
    $matches = @($archive.Entries | Where-Object {
      -not [string]::IsNullOrWhiteSpace($_.Name) -and $_.Name -ceq $asset.file
    })

    if ($matches.Count -ne 1) {
      throw "Expected one archive entry for '$($asset.file)', found $($matches.Count)."
    }

    $entry = $matches[0]
    $sourcePath = Join-Path $temporaryRoot ([System.IO.Path]::GetRandomFileName() + ".jpg")
    $inputStream = $entry.Open()
    $outputStream = [System.IO.File]::Create($sourcePath)
    try {
      $inputStream.CopyTo($outputStream)
    } finally {
      $outputStream.Dispose()
      $inputStream.Dispose()
    }

    $image = [System.Drawing.Image]::FromFile($sourcePath)
    try {
      $sourceWidth = $image.Width
      $sourceHeight = $image.Height
    } finally {
      $image.Dispose()
    }

    $longEdge = [Math]::Max($sourceWidth, $sourceHeight)
    $targetEdges = @($(@(960, 1600, 2400) | Where-Object { $_ -le $longEdge }))
    if ($targetEdges.Count -eq 0) {
      $targetEdges = @($longEdge)
    } elseif ($longEdge -lt 2400 -and $longEdge -notin $targetEdges) {
      $targetEdges = @($targetEdges + $longEdge | Sort-Object -Unique)
    }

    $variants = @()
    foreach ($edge in $targetEdges) {
      if ($sourceWidth -ge $sourceHeight) {
        $targetWidth = $edge
        $targetHeight = [int](2 * [Math]::Round(($sourceHeight * $edge / $sourceWidth) / 2))
      } else {
        $targetHeight = $edge
        $targetWidth = [int](2 * [Math]::Round(($sourceWidth * $edge / $sourceHeight) / 2))
      }

      $fileName = "$($asset.slug)-$edge.webp"
      $destination = Join-Path $outputRoot $fileName
      $scaleFilter = "scale=$targetWidth`:$targetHeight`:flags=lanczos"

      & ffmpeg -hide_banner -loglevel error -y -i $sourcePath -map_metadata -1 -frames:v 1 -vf $scaleFilter -c:v libwebp -preset picture -quality 84 -compression_level 6 $destination
      if ($LASTEXITCODE -ne 0) {
        throw "ffmpeg failed while converting '$($asset.file)' to '$fileName'."
      }

      $variants += [ordered]@{
        src = "/media/portfolio/$fileName"
        width = $targetWidth
        height = $targetHeight
      }
    }

    $manifest += [ordered]@{
      key = $asset.slug
      source = $asset.file
      group = $asset.group
      alt = $asset.alt
      focal = $asset.focal
      width = $sourceWidth
      height = $sourceHeight
      variants = $variants
    }

    Remove-Item -LiteralPath $sourcePath -Force
  }
} finally {
  $archive.Dispose()
  $resolvedTemporaryRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
  $systemTemporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if (-not $resolvedTemporaryRoot.StartsWith($systemTemporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean unexpected temporary path: $resolvedTemporaryRoot"
  }
  if (Test-Path -LiteralPath $resolvedTemporaryRoot -PathType Container) {
    Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force
  }
}

$json = $manifest | ConvertTo-Json -Depth 8
$sourceManifest = Join-Path $dataRoot "portfolio-media.json"
$publicManifest = Join-Path $outputRoot "manifest.json"
[System.IO.File]::WriteAllText($sourceManifest, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($publicManifest, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

Write-Host "Prepared $($manifest.Count) curated portfolio images in $outputRoot"
