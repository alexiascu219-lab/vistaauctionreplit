# Bridge: Vista → ZebraDesigner (print with Zebra's official software)

You can drive **ZebraDesigner** from the website: pick a design, type a number
range, and have Zebra's own software print every label. This document explains
what's possible, what each Zebra tier gives you, and exactly how to set it up.

## Can the website print through ZebraDesigner? — Yes.

The browser can't talk to local software directly, so the flow goes through the
**Vista Print Station** desktop app (the .exe) already running on the PC next to
the printer:

```
Website (pick design + range)
   │  queues one "bridge" job to Supabase
   ▼
Vista Print Station (.exe) claims the job
   │  writes  <watched folder>/job-<id>.csv   (one row per number)
   │  writes  <watched folder>/vista-data.csv (rolling latest range)
   │  writes  <watched folder>/job-<id>.json  (trigger: label + rows)
   ▼
ZebraDesigner opens the .nlbl, binds columns → variables, prints the range
```

The Print Station does the range→CSV expansion; ZebraDesigner does the actual
rendering and printing. So the labels are produced by **Zebra's official
software**, exactly as you asked.

## Which Zebra tier do I need?

| Tier | Hands-off? | How it consumes the bridge |
| --- | --- | --- |
| **ZebraDesigner Automation** (paid) | ✅ Fully automatic | A **file trigger** watches the folder; each `job-*.csv` prints the whole range with no clicks. This is the true "website → prints" path. |
| **ZebraDesigner Professional** | ⚙️ One click | Bind the label's variables to its `vista-<label>.csv` and use **Print → All records**. Every job rewrites that file, so you just hit Print. |
| **ZebraDesigner (free)** | ⚙️ Manual import | Same as Pro but you import the CSV each run. |

> Don't have (or want) ZebraDesigner? The built-in **Vista (ZPL)** engine already
> prints the same designs directly to the Zebra — the bridge is only for teams
> who prefer to keep their labels in ZebraDesigner.

## Setup

### 1. In the Print Station (.exe) → Printers
1. Set **Connection** to **ZebraDesigner**.
2. **Browse** to a watched folder, e.g. `C:\Vista\ZD`.
3. Set the **Default .nlbl label file** (e.g. `cart-tag.nlbl`) — used when the
   website doesn't specify one.
4. Click **Write bridge test (3 rows)** and confirm `job-*.csv` + `vista-data.csv`
   appear in the folder.

### 2. In ZebraDesigner — design the label
- Create your label and add **variables** whose names match the CSV columns
  (the website sends your template's variable keys, e.g. `cart_number`, `prefix`,
  plus `quantity` and `label`).
- Bind each text/barcode to its variable.
- **Automation:** create a **File trigger** on the watched folder, filter
  `job-*.csv`, map CSV columns → variables, set copies from the `quantity`
  column, action = Print. Deploy/start the trigger.
- **Professional/free:** set the label's data source to a **Text file /
  database** = the label's stable CSV, then Print → *All records*.

### ZebraDesigner Professional — exact steps (one-time per label)
Each label writes its own stable file `vista-<label>.csv` (e.g. label
`Cart Tag.nlbl` → `C:\Vista\ZD\vista-cart-tag.csv`), so multiple labels never
overwrite each other. Bind once:

1. **File → New / open your label** in ZebraDesigner Professional.
2. **Data sources → Add database → Text file.** Browse to
   `C:\Vista\ZD\vista-cart-tag.csv` (match your label's slug — lowercase, spaces
   and dots become `-`).
3. Delimiter **Comma**, **first row = field names** (the CSV has a header row).
   Finish the wizard. You'll see fields `cart_number`, `prefix`, `quantity`,
   `label`.
4. **Bind each label object** to its field (double-click the text/barcode →
   Data source → the matching database field).
5. (Optional) Set **copies from a field**: label Properties → Print quantity →
   *Variable* → `quantity` — so per-row copies are honoured.
6. **Print** dialog → **All records** → Print. Because the file is refreshed on
   every send, you only ever click Print.

To reprint the same range later, just Print again; to print a new range, send a
new run from the website first, then Print.

### 3. On the website → Label Studio → Print
1. Pick the design.
2. Switch **Print engine** to **ZebraDesigner**.
3. (Optional) type the exact **.nlbl** file name for this run.
4. Enter a **range** (e.g. `397-432`) — the panel shows how many labels.
5. **Send to ZebraDesigner**. The Print Station writes the CSV; ZebraDesigner
   prints the range.

## CSV format the bridge writes

```
cart_number,prefix,quantity,label
397,CLT1-GL,2,cart-tag.nlbl
398,CLT1-GL,2,cart-tag.nlbl
399,CLT1-GL,2,cart-tag.nlbl
```

- One row per number in the range.
- Columns are your template's variable keys, then `quantity` (copies per row)
  and `label` (the .nlbl to open).
- `job-<id>.csv` is unique per job (good for Automation triggers);
  `vista-data.csv` holds the latest range for any label; `vista-<label>.csv`
  holds the latest range for that specific label (the file Professional binds to).

## Notes
- The bridge routes through ZebraDesigner **whenever a job carries bridge data**,
  regardless of the station's connection mode — so one station can print some
  jobs as raw ZPL and others through ZebraDesigner.
- If the watched folder isn't set, bridge jobs report an error in the queue
  instead of silently dropping.
