<#
    send-raw.ps1 — send a file's raw bytes straight to a Windows printer queue.
    Used by agent.mjs in "windows" mode so ZPL reaches the Zebra untouched by
    the driver's rasterizer (Zebra printers interpret ZPL directly).

    Usage:
      powershell -ExecutionPolicy Bypass -File send-raw.ps1 -PrinterName "ZDesigner GK420d" -Path "C:\temp\label.txt"

    Find your exact printer name with:  Get-Printer | Format-Table Name
#>
param(
    [Parameter(Mandatory = $true)][string]$PrinterName,
    [Parameter(Mandatory = $true)][string]$Path
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Error "File not found: $Path"
    exit 1
}

# Minimal RAW-datatype spooler client via winspool.drv. Sending with the "RAW"
# datatype tells Windows to pass the bytes to the device unmodified.
$signature = @'
using System;
using System.IO;
using System.Runtime.InteropServices;

public static class RawPrinter
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct DOCINFO { public string pDocName; public string pOutputFile; public string pDatatype; }

    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFO di);
    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", SetLastError = true)]
    static extern bool WritePrinter(IntPtr hPrinter, byte[] buf, int count, out int written);

    public static void Send(string printerName, byte[] bytes)
    {
        IntPtr h;
        if (!OpenPrinter(printerName, out h, IntPtr.Zero))
            throw new Exception("OpenPrinter failed for '" + printerName + "' (error " + Marshal.GetLastWin32Error() + ")");
        try {
            DOCINFO di = new DOCINFO();
            di.pDocName = "Vista Cart Sticker";
            di.pDatatype = "RAW";
            if (!StartDocPrinter(h, 1, ref di)) throw new Exception("StartDocPrinter failed (error " + Marshal.GetLastWin32Error() + ")");
            try {
                if (!StartPagePrinter(h)) throw new Exception("StartPagePrinter failed (error " + Marshal.GetLastWin32Error() + ")");
                int written;
                if (!WritePrinter(h, bytes, bytes.Length, out written))
                    throw new Exception("WritePrinter failed (error " + Marshal.GetLastWin32Error() + ")");
                EndPagePrinter(h);
            } finally { EndDocPrinter(h); }
        } finally { ClosePrinter(h); }
    }
}
'@

Add-Type -TypeDefinition $signature -Language CSharp
$bytes = [System.IO.File]::ReadAllBytes($Path)
[RawPrinter]::Send($PrinterName, $bytes)
Write-Output "Sent $($bytes.Length) bytes to '$PrinterName'."
