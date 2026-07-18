# Siri → print any label (interactive)

Tell Siri to run the shortcut, and it asks **which label**, then the fields that
label needs (cart, aisle, rack… — they change per label), then **how many**, and
queues the print. The Print Station by the Zebra prints it.

Base URL: `https://vistaauction.vercel.app`

## API it uses

### `GET /api/templates`
Lists the labels and the fields each one needs.
```json
{
  "names": ["Vista cart sticker", "Lot number (large)"],
  "templates": [
    { "id": "…", "name": "Vista cart sticker", "width": 609, "height": 406,
      "variables": [
        { "key": "cart_number", "label": "Cart number", "default": "302" },
        { "key": "prefix", "label": "Location prefix", "default": "CLT1-GL" }
      ] }
  ]
}
```

### `POST /api/print`
Queues a job. The server renders the chosen label's ZPL and attaches it, so the
Print Station prints it verbatim.
```json
{ "template": "Vista cart sticker",
  "quantity": 2,
  "data": { "cart_number": "302", "prefix": "CLT1-GL" } }
```
Response includes a `spoken` line for Siri to read back. If a required field is
missing it returns `400` with `{ "missing": ["cart_number"] }`.

> If you set `PRINT_API_KEY` in Vercel, send it as header `x-api-key` on both
> calls. If it's unset, the endpoints are open (fine for first-run testing).

## Build the Shortcut (iOS Shortcuts app)

1. **Get Contents of** `https://vistaauction.vercel.app/api/templates`
   (Method GET; add header `x-api-key` if you set a key.)
2. **Get Dictionary Value** `names` from the result → **Choose from List**
   ("Which label?"). Save the pick as **ChosenName**.
3. **Get Dictionary Value** `templates` (list). **Find** the item where `name`
   is **ChosenName** → **Get Dictionary Value** `variables`. Save as **Vars**.
4. Add a **Dictionary** action named **Data** (empty). Then **Repeat with Each**
   item in **Vars**:
   - **Ask for Input** — prompt: *Get `label` from the current item* (e.g.
     "Cart number"). Default: *Get `default` from the current item*.
   - **Set Dictionary Value** on **Data**: key = *Get `key` from the current
     item*, value = the input you just got.
5. **Ask for Input** — "How many?" (Number, default 1) → **Quantity**.
6. **Get Contents of** `https://vistaauction.vercel.app/api/print`
   - Method: **POST**, Request Body: **JSON**:
     - `template` = **ChosenName**
     - `quantity` = **Quantity**
     - `data` = **Data**
     - (header `x-api-key` if you set a key)
7. **Get Dictionary Value** `spoken` from the response → **Speak** it.

Name the shortcut e.g. **"Print a label"** and say *"Hey Siri, print a label."*

### Simple version (cart only)
If you just want the fast cart path, skip steps 1–4 and POST:
`{ "template": "cart_label", "cart_number": "<spoken number>", "quantity": 1 }`
