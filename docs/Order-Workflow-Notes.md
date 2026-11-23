# Bosco Studio – how an order works (notes for me)

These notes are only for understanding the flow. They are not part of the website.

## The big picture

```
Client  →  Order (quote)  →  Client says yes  →  Advance paid  →  Shoot day
        →  Selection & editing  →  Album (if any)  →  Delivery  →  Balance paid  →  Done
```

One **order** = one booking. Everything about the job (schedule, money, albums, checklist,
quotation, invoice) hangs on that order.

---

## 1. The six stages of an order

The status on the order page is the stage. Normally you move forward one stage at a time.

| Status | In plain words | What I do now |
|---|---|---|
| **Pre-Order** | Client asked for a price. Nothing is booked. | Create the **quotation** and send it. |
| **Pending** | Quotation is with the client; date not final. | Follow up. Ask for the booking advance. |
| **Confirmed** | Date is fixed and blocked on the calendar. | Record the **advance payment**. Create the **invoice**. Do the shoot. |
| **Shoot Completed** | The shoot is finished. | Start photo selection and editing. |
| **In Post-Production** | Photos / videos / album are being made. | Update the **Deliverables** checklist and the album steps. |
| **Delivered** | Everything handed over. | Collect any balance. Order is finished (it can no longer be edited). |

Special moves:
- **Cancelled** – possible any time before Delivered. Calendar slots are released, payments already
  received are kept. A cancelled order can be re-opened (it goes back to Pending).
- **Back one step** – allowed, to fix a mistake.
- **Skipping ahead** – allowed (for example Pending straight to Confirmed).

---

## 2. Creating an order – the package is Photo + Video + Album

A package is a bundle of up to three parts, **each with its own price**:

| Package example | Parts |
|---|---|
| Photo, video and album | Photo + Video + Album |
| Photo and video | Photo + Video |
| Photo only | Photo |
| Video only | Video |
| Album only | Album |

- **Settings → Packages**: the owner / admin adds or changes packages and the price of each part.
- **New order**: choose the package, then **tick or untick Photo / Video / Album**. Each part's price is
  filled in from the package and can be changed for this one order.
- **Order total** = ticked parts − discount + tax (GST). The total updates as you tick.
- Only the **shoot** takes a calendar slot. Album, editing and printing never block the calendar.

### Album sold later
If the client orders an album after the shoot (even after Delivered): open the order → **Albums → + Album**.
- If the order **already included** the Album part, its price is already in the total, so no extra price is asked.
- If it **did not**, enter the album's selling price – it is added to what the client owes.

---

## 3. Money

- **Payments** (on the order): booking advance, shoot-day payment, final balance, other.
  Paying more than the balance is blocked.
- **Balance due** = total (photoshoot + any albums sold later) − paid so far.
- **Expenses** (second shooter, travel, etc.) are recorded on the order. They are *not* shown in the
  Money box. Look at them in **Reports**.
- **Album printing cost** (what the print vendor charges me) is a cost, kept on the album. The price
  the client pays for the album is income.

---

## 4. Quotation and invoice

- **Quotation** – can be made any time (not for cancelled orders).
- **Invoice** – can be made once the order is **Confirmed** or later.
- Only **one quotation and one invoice per order**. If it exists, the button opens it instead.
- Where to create: the buttons at the top of the order page, or **Invoices → New quotation / New invoice**
  (pick the order).
- Items are one line per part (Photography, Videography, Album). If the price on the order changes and I
  did not customise the document, the document follows automatically.
- The **payment history** (with the balance after each payment) prints at the bottom of the document.

---

## 5. After the shoot – Deliverables (only what the order includes)

On the order page → **Deliverables → Update**:

- **Photo selection** (Photo or Album orders) – who selects (client / studio) and the status.
- **Photo editing** (Photo orders).
- **Teaser edit** and **Full film edit** (Video orders).
- **Delivery via** + **delivery link** + **Delivered on**.

Each item is Not Started → In Progress → Completed.

### Album steps (Albums section, one album at a time)
1. Photo Selection Pending
2. Sheet Designing
3. Client Proofing
4. Sent to Print Lab  (needs the print vendor name)
5. Album Received
6. Handed Over to Client

An album moves one step at a time. Once it has gone to print it cannot be deleted.

---

## 6. A normal order from start to finish (checklist for me)

1. Add the client (Clients menu, or inside the new-order form).
2. **Orders → New order**: client, event type, package, tick Photo / Video / Album, date and time slot.
   Start as Pre-Order.
3. **Create quotation**, send it to the client.
4. Client agrees → move to **Pending**, then **Confirmed** when the date is fixed.
5. Record the **booking advance** under Payments. **Create invoice**.
6. Shoot day → move to **Shoot Completed**.
7. Selection and editing → move to **In Post-Production**; keep **Deliverables** and the **album steps** updated.
8. Add the delivery link, hand over the album, mark the order **Delivered**.
9. Record the **final payment** so the balance is 0.

---

## 7. Reports

**Reports** (menu) – pick a date range; download Excel.
- **Summary tab**: orders, money received, expenses, net profit, and the lists of orders (with each
  order's expenses), payments and expenses.
- **Order activity tab**: who created each order and who last changed it, and when.

## 8. Who can do what

Everybody who signs in can **view** everything. Changing things depends on the role:

| Role | Can do |
|---|---|
| **Staff** | Create / edit orders, record payments, edit albums and clients. No deleting, no quotations/invoices. |
| **Manager** | Everything Staff can, plus deleting, and creating quotations / invoices. |
| **Admin** | Everything, plus Settings (packages, event types, studio details), owners and the **Sign-in log**. |

(An Admin can fine-tune the permissions of each person.)

## 9. Rules worth remembering

- A **Delivered** or **Cancelled** order cannot be edited.
- An order with **payments or an invoice cannot be deleted** – cancel it instead.
- The **discount** cannot be more than the package amount.
- Two bookings cannot overlap in time (the app warns; I can choose to book anyway).
- Money numbers on the order, invoice, dashboard and reports all come from the same order data.
