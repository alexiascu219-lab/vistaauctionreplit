# Vista Auction — Siri → Zebra sticker printing

Print a cart sticker on your Zebra printer **just by asking Siri** — or with one
tap from the Cart Yard board. This folder holds the small "print agent" that
runs on the Windows PC next to the Zebra printer.

```
  "Hey Siri, print cart sticker"
            │
            ▼
   Siri Shortcut  ──HTTPS POST──►  /api/print   ──►  Supabase print queue
                                                          │
                                   (this PC polls) ◄───────┘
                                        │
                                        ▼
                                  Zebra printer  🖨️  ► sticker
```

Three parts, set up once:

1. **Database** — two SQL files create the queue.
2. **Server** — the `/api/print` endpoints (already in this repo's `api/` folder) with a couple of secrets.
3. **This agent** — runs on the Zebra PC and does the actual printing.
4. **Siri Shortcut** — the voice trigger on your iPhone/iPad/Mac/Watch.

---

## 1. Database (once)

In the Supabase SQL editor, run these two files from the repo root:

- `print_jobs_schema.sql` — the print queue table
- `cart_tracking_schema.sql` — the cart board (if you haven't already)

---

## 2. Server secrets (once)

Set these environment variables on your host (Vercel → Project → Settings →
Environment Variables), then redeploy:

| Variable | What it's for |
| --- | --- |
| `PRINT_API_KEY` | Secret Siri sends when queuing a job. Make up a long random string. |
| `PRINT_AGENT_KEY` | Secret **this agent** uses to claim jobs. A different long random string. |
| `SUPABASE_SERVICE_ROLE_KEY` | *(optional)* lets the API bypass RLS. If omitted it falls back to the anon key, which also works. |

> Until you set the keys the endpoint runs **unguarded** so you can test — set
> them before real use so strangers can't trigger prints.

Generate a good secret (macOS/Linux):

```bash
openssl rand -hex 24
```

Quick test that the server is up (replace the URL + key):

```bash
curl -X POST https://YOUR-SITE.vercel.app/api/print \
  -H "x-api-key: YOUR_PRINT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cart_number":"12"}'
```

You should get back `{"ok":true,...}` and see the job appear in the **Print
Queue** on the Cart Yard board (`/carts`).

---

## 3. The print agent (on the Zebra PC)

### Install Node

Install the LTS build from <https://nodejs.org> (any version 18 or newer).
Confirm in PowerShell:

```powershell
node -v
```

### Copy this folder over

Copy the whole `print-agent` folder onto the Zebra PC, e.g. to
`C:\VistaPrint\print-agent`.

### Configure it

Copy `config.example.json` to `config.json` and fill it in. Pick **one** print
mode:

#### Mode A — `network` (recommended)

Send ZPL straight to the printer over the network. Works with any networked
Zebra, no driver needed. Find the printer's IP on its LCD menu or your router.

```json
{
  "apiBase": "https://YOUR-SITE.vercel.app",
  "agentKey": "the same value as PRINT_AGENT_KEY",
  "agentName": "front-desk-zebra",
  "printMode": "network",
  "printerHost": "192.168.1.50",
  "printerPort": 9100
}
```

#### Mode B — `windows` (USB / installed driver)

Use the Zebra driver already installed in Windows. Get the exact name with
`Get-Printer | Format-Table Name` in PowerShell.

```json
{
  "apiBase": "https://YOUR-SITE.vercel.app",
  "agentKey": "the same value as PRINT_AGENT_KEY",
  "printMode": "windows",
  "printerName": "ZDesigner GK420d"
}
```

#### Mode C — `folder` (use your ZebraDesigner Professional label)

Hand each job to **ZebraDesigner Automation**, which opens *your* designed label
and fills in the fields — see [section 5](#5-using-your-zebradesigner-label).

```json
{
  "apiBase": "https://YOUR-SITE.vercel.app",
  "agentKey": "the same value as PRINT_AGENT_KEY",
  "printMode": "folder",
  "watchFolder": "C:\\VistaPrint\\incoming"
}
```

### Test it

```powershell
cd C:\VistaPrint\print-agent
node agent.mjs --test 12       # prints one sticker for "Cart 12"
node agent.mjs --dry-run --once  # shows the ZPL without printing
```

### Run it for real

```powershell
node agent.mjs
```

Leave that window open and it will print jobs as they arrive. To keep it running
after reboots, use **Task Scheduler**:

1. Task Scheduler → **Create Task**
2. General → *Run whether user is logged on or not*
3. Triggers → **At startup**
4. Actions → **Start a program**
   - Program: `node`
   - Arguments: `agent.mjs`
   - Start in: `C:\VistaPrint\print-agent`
5. Settings → *If the task fails, restart every 1 minute*

(Prefer a real service? Install [NSSM](https://nssm.cc) and point it at
`node C:\VistaPrint\print-agent\agent.mjs`.)

---

## 4. The Siri Shortcut (on your iPhone/iPad/Mac)

Open the **Shortcuts** app → **+** to create a new shortcut.

1. Add action **Text**. Leave it empty — this holds the cart number.
   *(To be asked every time, instead add **Ask for Input** → prompt
   "Which cart?" → Input type **Number**, and use its result below.)*
2. Add action **Get Contents of URL**. Tap **Show More** and set:
   - **URL**: `https://YOUR-SITE.vercel.app/api/print`
   - **Method**: `POST`
   - **Headers**:
     - `x-api-key` → `YOUR_PRINT_API_KEY`
     - `Content-Type` → `application/json`
   - **Request Body**: **JSON**
     - `cart_number` → *(the Text / Ask-for-Input value from step 1)*
     - `requested_by` → `Siri`
     - `source` → `siri`
3. *(Optional)* Add **Get Dictionary Value** → key `spoken`, then **Show
   Result** / **Speak Text** so Siri reads the confirmation back.
4. Rename the shortcut to exactly what you want to say, e.g.
   **"Print cart sticker."** That phrase becomes the Siri trigger.

Now say **"Hey Siri, print cart sticker,"** tell it the number, and the Zebra
prints within a few seconds. Add a Home Screen icon or a Back-Tap for one-tap
printing.

**Fixed-number variant:** to print a specific cart with no questions, put the
number straight into the Text action (step 1) and name the shortcut
"Print cart twelve."

**Number words:** the endpoint understands `"12"` and simple words like
`"twelve"`. For reliability, prefer the numeric **Ask for Input** approach.

---

## 5. Using your ZebraDesigner Professional label

Two ways to use a label you've designed in ZebraDesigner:

### Option 1 — ZebraDesigner Automation watch folder (`folder` mode)

If you have **ZebraDesigner Automation**, this agent drops a `.csv` and `.json`
for every job into your `watchFolder`. Configure an Automation trigger:

1. Create a **File** trigger watching `C:\VistaPrint\incoming` for `*.csv`.
2. Add a **Print label** action; pick your `.nlbl` label.
3. Map the label variables to the CSV columns: `cart_number`, `zone`, `spot`,
   `quantity`.
4. Add a step to **delete/move** the processed `.csv` so it isn't reprinted.

Your exact design (logos, fonts, barcodes) prints for every queued job.

### Option 2 — capture the ZPL from ZebraDesigner (`network`/`windows` mode)

Design your label in ZebraDesigner, then export it as ZPL and drop it in as the
template:

1. In ZebraDesigner, set the printer to a **ZDesigner** driver and enable
   **Print to file** (or the driver's *Store label as ZPL* option). Print once
   to capture the `^XA … ^XZ` code.
2. Save that code as `print-agent/templates/cart-label.zpl`.
3. Replace the cart-number text with `${cart_number}` and (optionally) the
   barcode data with `${barcode}`. Any `${name}` is filled from the job's data.

The built-in `templates/cart-label.zpl` is a clean 3" × 2" starting point —
edit `^PW` (width) and `^LL` (length) to match your label stock.

---

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Missing configuration` on start | Fill in `config.json` (or env vars). The message lists exactly what's missing. |
| `poll failed (401)` | `agentKey` doesn't match `PRINT_AGENT_KEY` on the server. |
| `Timed out talking to printer` | Wrong `printerHost`, printer off, or port 9100 blocked. `ping` the printer. |
| Prints blank/garbled in `windows` mode | The driver is rasterizing. Prefer `network` mode, or make sure you send raw ZPL. |
| Job stuck on **printing** | The agent claimed it but crashed mid-print. Restart the agent; re-queue from the board. |
| Siri says it worked but nothing prints | The agent isn't running, or is pointed at a different printer. Check its console window. |

Watch what's happening any time from the **Print Queue** panel on `/carts` —
every job shows queued → printing → printed (or the error message).

---

## 7. Security notes

- Keep `PRINT_API_KEY` and `PRINT_AGENT_KEY` secret; rotate them if a device is lost.
- The agent only needs the two keys and the printer address — **not** your
  Supabase service key. That stays on the server.
- The print queue is a low-sensitivity internal tool (cart numbers only). No
  customer data is ever sent to the printer.
