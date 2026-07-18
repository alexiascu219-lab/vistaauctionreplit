# Vista Print Station (Windows desktop app)

A small desktop app for the PC next to the Zebra printer. It shows the live
**print queue**, prints cart stickers on the Zebra, and works with your
**ZebraDesigner** designs — the desktop counterpart to the Siri / web print flow.

It's the packaged, GUI version of `print-agent/`: same print engine, but with a
window, a system-tray icon, one-click settings, and a start/stop switch.

## Get the .exe (no build tools needed)

The app is compiled automatically by GitHub Actions:

1. Open the repo's **Actions** tab → **Build Print Station (Windows)**.
2. Open the latest run → **Artifacts** → download **VistaPrintStation-windows**.
3. Unzip it. You get:
   - `Vista Print Station Setup <version>.exe` — installer, and
   - `VistaPrintStation-portable-<version>.exe` — no-install portable build.

(Or publish a GitHub **Release** and the `.exe` files attach to it automatically.)

The app is unsigned, so Windows SmartScreen shows "More info → Run anyway" the
first time.

## First-run setup

Open the app → **Settings**:

- **Connection**
  - *Site URL* — where `/api/print` lives (your deployed Vista site).
  - *Agent key* — the same value as `PRINT_AGENT_KEY` on the server.
  - *Supabase URL* + *anon key* — so the Queue tab can show job history (public keys).
- **Printer** — pick one **Print mode**:
  - **Network** *(recommended)* — enter the Zebra's IP; ZPL is sent straight to it. No driver, works headless.
  - **Windows driver** — enter the installed printer name (`Get-Printer` in PowerShell); ZPL goes through the driver as raw.
  - **ZebraDesigner** — for your `.nlbl` designs: set the folder that **ZebraDesigner Automation** watches; each job's data is dropped there and Automation prints your label.
- Set the **Designs folder** to where your `.nlbl` files live so they appear on the **Designs** tab.

Hit **Save settings**, then **Start printing**. Use **Test print** to fire one sticker.

## Using your ZebraDesigner `.nlbl` designs

- With **ZebraDesigner Automation**: choose **ZebraDesigner** mode and point it at
  the watch folder — your exact label prints for every job.
- With **ZebraDesigner Professional** (no Automation): Professional can't accept
  unattended jobs, so use **Network** or **Windows** mode with the built-in ZPL
  template (reliable, no ZebraDesigner needed at print time). The Designs tab
  still lists your `.nlbl` files and opens them in ZebraDesigner for editing.

## Running all the time

The app minimises to the **system tray** (it keeps printing in the background).
Tick **"Start printing when the app opens"** in Settings, and add a shortcut to
`shell:startup` (Win+R → `shell:startup`) so it launches on boot.

## Develop / build locally

```bash
cd print-app
npm install
npm start          # run the app
npm run dist       # build the Windows .exe into print-app/dist
```

Requires Node 18+ and (for `npm run dist` on Windows) the standard
electron-builder toolchain, which it downloads on first run.
