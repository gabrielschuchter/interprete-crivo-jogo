param(
  [Parameter(Mandatory=$true)][string]$src,
  [Parameter(Mandatory=$true)][string]$out,
  [int]$canvas = 1200,
  [int]$thresh = 235,
  [int]$pad = 30
)
# White-key (remove near-white baked background) + 1px erode (kill halo) +
# crop to bounding box + center on a FIXED square canvas (no rescale unless the
# subject is larger than the canvas). Using one fixed canvas for every frame of
# an animation keeps the body registered so frames don't jump.
Add-Type -AssemblyName System.Drawing

$s = New-Object System.Drawing.Bitmap($src)
$b = New-Object System.Drawing.Bitmap($s.Width,$s.Height,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g=[System.Drawing.Graphics]::FromImage($b); $g.DrawImage($s,0,0,$s.Width,$s.Height); $g.Dispose(); $s.Dispose()

for($y=0;$y -lt $b.Height;$y++){ for($x=0;$x -lt $b.Width;$x++){
  $p=$b.GetPixel($x,$y)
  $mx=[Math]::Max($p.R,[Math]::Max($p.G,$p.B)); $mn=[Math]::Min($p.R,[Math]::Min($p.G,$p.B))
  if($p.R -ge $thresh -and $p.G -ge $thresh -and $p.B -ge $thresh -and ($mx-$mn) -le 18){
    $b.SetPixel($x,$y,[System.Drawing.Color]::FromArgb(0,0,0,0))
  }
}}
$w=$b.Width;$h=$b.Height; $clear=New-Object System.Collections.Generic.List[int[]]
for($y=0;$y -lt $h;$y++){ for($x=0;$x -lt $w;$x++){
  if($b.GetPixel($x,$y).A -gt 8){ $edge=$false
    for($dy=-1;$dy -le 1 -and -not $edge;$dy++){ for($dx=-1;$dx -le 1;$dx++){
      $nx=$x+$dx;$ny=$y+$dy
      if($nx -lt 0 -or $ny -lt 0 -or $nx -ge $w -or $ny -ge $h){$edge=$true;break}
      if($b.GetPixel($nx,$ny).A -le 8){$edge=$true;break}
    }}
    if($edge){$clear.Add(@($x,$y))}
  }
}}
foreach($c in $clear){ $b.SetPixel($c[0],$c[1],[System.Drawing.Color]::FromArgb(0,0,0,0)) }

$minx=$w;$miny=$h;$maxx=-1;$maxy=-1
for($y=0;$y -lt $h;$y++){ for($x=0;$x -lt $w;$x++){ if($b.GetPixel($x,$y).A -gt 16){
  if($x -lt $minx){$minx=$x}; if($x -gt $maxx){$maxx=$x}; if($y -lt $miny){$miny=$y}; if($y -gt $maxy){$maxy=$y} }}}
$cw=$maxx-$minx+1;$ch=$maxy-$miny+1

$avail = $canvas - $pad*2
$scale = 1.0
if([Math]::Max($cw,$ch) -gt $avail){ $scale = $avail / [Math]::Max($cw,$ch) }
$dw=[int]($cw*$scale); $dh=[int]($ch*$scale)

$o=New-Object System.Drawing.Bitmap($canvas,$canvas,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g=[System.Drawing.Graphics]::FromImage($o)
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$ox=[int](($canvas-$dw)/2); $oy=[int](($canvas-$dh)/2)
$rsrc=New-Object System.Drawing.Rectangle($minx,$miny,$cw,$ch)
$rdst=New-Object System.Drawing.Rectangle($ox,$oy,$dw,$dh)
$g.DrawImage($b,$rdst,$rsrc,[System.Drawing.GraphicsUnit]::Pixel); $g.Dispose(); $b.Dispose()
$o.Save($out,[System.Drawing.Imaging.ImageFormat]::Png); $o.Dispose()
Write-Output ("OK $out  bbox=${cw}x${ch}  scale=$([Math]::Round($scale,3))  canvas=$canvas")
