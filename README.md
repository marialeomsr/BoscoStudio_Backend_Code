# Bosco Studio – Photography Studio Management (single owner)

SQL Server (database-first) → ASP.NET Core 8 Web API → Angular (standalone, signals, Material).

```
BoscoStudio.sln
├─ Database/
│  ├─ PhotoStudioDB.sql                      ← full schema + seed (fresh install, run in SSMS)
│  ├─ 002_EventTypes_Documents_Upgrade.sql   ← upgrade for a database created from the FIRST version of the script
│  └─ 003_TaxSplit_Roles_Upgrade.sql         ← adds owner roles + CGST/SGST tax split (run after 002)
├─ BoscoStudio/                      ← ASP.NET Core Web API (.NET 8)
│  ├─ Api/
│  │  ├─ Controllers/                ← thin HTTP layer: Auth, Orders, Payments, Albums, Documents, Catalog, Lookups, Dashboard
│  │  └─ Middleware/                 ← ExceptionHandlingMiddleware (exception → ProblemDetails)
│  ├─ Application/
│  │  ├─ Common/                     ← status constants + lifecycle rules, custom exceptions
│  │  ├─ Dtos/                       ← request/response contracts (mirrored in Angular)
│  │  ├─ Mapping/                    ← explicit entity → DTO mappers
│  │  ├─ Services/                   ← ALL business logic (Order, Payment, Album, Document, Catalog, StudioSettings, Dashboard)
│  │  └─ Validators/                 ← FluentValidation rules
│  ├─ Domain/
│  │  ├─ Entities/                   ← SCAFFOLDED – never edit, overwritten by --force
│  │  └─ Partials/                   ← hand-written `partial class` extensions (Order.Logic.cs)
│  ├─ Infrastructure/
│  │  ├─ Data/                       ← SCAFFOLDED PhotoStudioDbContext – never edit
│  │  └─ Security/                   ← JWT issuing + BCrypt login
│  ├─ Program.cs                     ← DI, JWT, CORS, Swagger, pipeline
│  └─ appsettings.json               ← connection string, JWT settings, CORS origins
└─ frontend/                         ← Angular workspace
   └─ src/app/
      ├─ core/                       ← models (DTO interfaces), api (StudioApi), auth (service/guard/interceptor), layout (shell)
      ├─ shared/                     ← status badge, confirm dialog, INR pipe, date + error helpers
      ├─ features/                   ← lazy routes: login, dashboard, orders, calendar, albums, payments, invoices, settings
      └─ environments/environment.ts ← API base URL
```

Request trace: `Controller → IXxxService → PhotoStudioDbContext → SQL`. Nothing else.

## Local setup

1. **Database**
   * *New machine:* SSMS → connect to `MARIALEO` (SQL auth, `sa`) → open `Database/PhotoStudioDB.sql` → Execute.
     (Command line: `sqlcmd -S (Server Name) -U sa -P (Password) -C -I -i Database\PhotoStudioDB.sql` – `-I` is required.)
   * *Existing database from the first version:* run `Database/002_EventTypes_Documents_Upgrade.sql` and then `Database/003_TaxSplit_Roles_Upgrade.sql` (existing owners become Admin).
     It adds the EventTypes table, links orders/packages to it, and removes duplicate quotations (keeps the oldest per order).
   Verify: `SELECT * FROM PhotoStudioDB.dbo.OwnerAccounts;` returns one row.
2. **API** – `cd BoscoStudio; dotnet run --launch-profile http` → <http://localhost:5238/swagger>
   (or press F5 in Visual Studio with the IIS Express profile → <https://localhost:44388/swagger>).
3. **Frontend** – `cd frontend; npm install; npm start` → <http://localhost:4200>.
4. **Sign in** – `owner` / `Owner@123`. Change it: generate a hash with any BCrypt tool (cost 11) and
   `UPDATE OwnerAccounts SET PasswordHash = '<hash>'`.

Before real use: replace `Jwt:SigningKey` (use `dotnet user-secrets`) and move the `sa` password out of appsettings.

## Business rules enforced in the services

* Status moves: forward (skips allowed), one step back, Cancel before Delivered, Cancelled → Pending to reopen.
* No double booking: overlapping slots on the same date are rejected (409) unless `allowOverlap` is sent.
* Event types are owner-managed (Settings → Event types). A package belongs to one event type (or any); an order's package must match its event type.
* Payments cannot exceed the pending balance or be added to cancelled orders.
* Albums move one stage at a time; "Sent to Print Lab" needs a vendor; milestone dates are stamped automatically.
* **Deleting an order** is allowed even when albums were added (albums, schedule, deliverables and the quotation go with it).
  It is blocked once payments or an invoice exist – Cancel the order instead to keep the books intact.
* **One quotation and one invoice per order** (unique index on `OrderId, DocumentType`). Creating a second is refused (409); open the
  existing one and use **Edit** (due date, notes, terms). Amounts always come from the order, so edit the order to change price/discount/tax.
* Invoices can be issued once an order is Confirmed; quotations any time before cancellation.
* Order / quotation / invoice numbers (`ORD-2026-001`, `QTN-2026-001`, `INV-2026-001`) come from `usp_GetNextDocumentNumber`; the prefixes are editable in Settings.
* Net profit = payments received − order expenses − album print costs (do not also log print cost as an expense).

* **Custom items:** a quotation / invoice can have several items (Edit on the document). Their total becomes the order's package amount, so
  the order stays the single source of truth for discount, tax and balance. It is refused if the new total is below what was already paid, or
  if the order is Delivered/Cancelled. A new invoice starts with the quotation's items. If the order price is later changed, single-item
  documents follow it; multi-item documents show a warning until their items are saved again.
* **Clients:** edits show on all of the client's orders and documents. A client with orders cannot be deleted. An identical name + phone is refused.
* **Password:** changed in Settings → Account (current password required, min. 8 characters); you are signed out afterwards.

* **Discount and tax on documents:** the document editor has Discount and Tax % next to the items, with a live breakdown. They are written
  through to the order (one set of figures everywhere). Refused if the discount exceeds the items total, if the new total is below what was
  paid, or if the order is Delivered/Cancelled.
* **Owner accounts:** several people can sign in (Settings → Owners). Each can change their own username (needs their password, then a new token
  is issued), add/remove other owners and set another owner's password. You cannot remove yourself or the last owner. A removed owner is
  signed out on their next request. What each owner may do depends on their role (below).

* **Roles** (set per owner in Settings → Owners, enforced by the API with 403, and hidden in the UI):

  | | Admin | Manager | Staff |
  |---|---|---|---|
  | Orders, calendar, albums, clients, record payments, deliverables | yes | yes | yes |
  | Delete orders / payments / expenses / clients / albums | yes | yes | no |
  | Create and edit quotations and invoices (view them is allowed for all) | yes | yes | no |
  | Settings: studio details, event types, packages | yes | no | no |
  | Owner accounts and roles | yes | no | no |

  Everyone can change their own username / password under **My account** (top bar). Changing a role signs that person out so they get the new
  access on their next login. There is always at least one Admin.
* **Tax lines:** per order (and in the document editor) choose one tax line or CGST + SGST. The tax % is split in half for the two lines; the
  total is identical. Order, quotation and invoice all show the same lines.
* **Validation** (API: `Application/Validators/Rules.cs`, forms: `frontend/src/app/shared/validators.ts` - keep them in step):
  phone 7-15 digits (leading + allowed), email format, names need letters, amounts 0 to 99,999,999.99 with 2 decimals, percentages 0-100,
  event / due dates 2000 to +10 years, payment / expense / delivery dates not in the future, album sheets 1-500, links must be http(s),
  GST/VAT number 5-20 letters or digits, passwords 8+ characters with a letter and a number, text lengths match the database columns.
## Screens

Login · **Home** (quick actions, KPI cards, overdue "Needs update" alert, upcoming / completed shoots, payments to collect with call + WhatsApp,
6-month revenue vs expenses chart, albums by stage) · Orders (list, create/edit form, detail with payments / expenses / albums / deliverables, quotation & invoice, delete) ·
Calendar (Month/Week/Day) · Albums (incl. edit print vendor) · **Clients** · Payments ledger · Quotations & invoices (list, print/PDF view,
edit incl. items) · **Settings** (studio details printed on documents, event types, packages per event type, account password).

## Not built yet

Password reset by email; separate CGST/SGST rates (today the tax % is split in half); more granular permissions than the three roles.
