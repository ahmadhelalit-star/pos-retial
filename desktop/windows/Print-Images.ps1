param([Parameter(Mandatory)][string]$InputPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$payload=Get-Content -LiteralPath $InputPath -Raw | ConvertFrom-Json
$settings=[Drawing.Printing.PrinterSettings]::new();$settings.PrinterName=[string]$payload.printer
if(!$settings.IsValid){throw 'Configured Windows printer is unavailable'}
if(!$payload.pages.Count){throw 'No printable pages'}
$document=[Drawing.Printing.PrintDocument]::new();$document.DocumentName='Sham Touch Retail '+$payload.id;$document.PrinterSettings=$settings
$document.PrintController=[Drawing.Printing.StandardPrintController]::new()
$document.DefaultPageSettings.Margins=[Drawing.Printing.Margins]::new(0,0,0,0)
$first=$payload.pages[0];$document.DefaultPageSettings.PaperSize=[Drawing.Printing.PaperSize]::new('Retail',[int][Math]::Round($first.widthMm/25.4*100),[int][Math]::Ceiling($first.heightMm/25.4*100))
$script:retailPrintIndex=0
$settingsHandler=[Drawing.Printing.QueryPageSettingsEventHandler]{param($sender,$eventArgs)
    $page=$payload.pages[$script:retailPrintIndex]
    $eventArgs.PageSettings.PaperSize=[Drawing.Printing.PaperSize]::new('Retail',[int][Math]::Round($page.widthMm/25.4*100),[int][Math]::Ceiling($page.heightMm/25.4*100))
}
$handler=[Drawing.Printing.PrintPageEventHandler]{param($sender,$eventArgs)
    $page=$payload.pages[$script:retailPrintIndex];$image=[Drawing.Image]::FromFile([IO.Path]::GetFullPath($page.image))
    try{$eventArgs.Graphics.TranslateTransform(-$eventArgs.PageSettings.HardMarginX,-$eventArgs.PageSettings.HardMarginY);$rect=[Drawing.RectangleF]::new(0,0,[single]($page.widthMm/25.4*100),[single]($page.contentHeightMm/25.4*100));$eventArgs.Graphics.DrawImage($image,$rect)}finally{$image.Dispose()}
    $script:retailPrintIndex++;$eventArgs.HasMorePages=$script:retailPrintIndex -lt $payload.pages.Count
}
$document.add_PrintPage($handler)
$document.add_QueryPageSettings($settingsHandler)
try{$document.Print();[Console]::Write('{"spooled":true}')}finally{$document.remove_PrintPage($handler);$document.remove_QueryPageSettings($settingsHandler);$document.Dispose()}
