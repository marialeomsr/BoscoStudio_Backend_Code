# Bosco Studio – Photography Studio Management (single owner)

SQL Server (database-first) → ASP.NET Core 8 Web API → Angular (standalone, signals, Material).

```
BoscoStudio.sln
├─ Database/
│  ├─ PhotoStudioDB.sql                      ← full schema + seed (fresh install, run in SSMS)
│  └─ 002_EventTypes_Documents_Upgrade.sql   ← upgrade for a database created from the FIRST version of the script
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

## Re-scaffolding after a schema change

Edit/extend the SQL, apply it, then from `BoscoStudio/`:

```powershell
dotnet ef dbcontext scaffold "Server=MARIALEO;Database=PhotoStudioDB;User Id=sa;Password=ciglobal123;TrustServerCertificate=True;" Microsoft.EntityFrameworkCore.SqlServer --output-dir Domain/Entities --context-dir Infrastructure/Data --context PhotoStudioDbContext --namespace BoscoStudio.Domain.Entities --context-namespace BoscoStudio.Infrastructure.Data --data-annotations --no-onconfiguring --force
```

`--no-onconfiguring` keeps the connection string out of the generated context (it is registered in `Program.cs`).
Hand-written code lives in `Domain/Partials`, `Application` and `Infrastructure/Security`, so `--force` never touches it.

## Local setup

1. **Database**
   * *New machine:* SSMS → connect to `MARIALEO` (SQL auth, `sa`) → open `Database/PhotoStudioDB.sql` → Execute.
     (Command line: `sqlcmd -S MARIALEO -U sa -P ciglobal123 -C -I -i Database\PhotoStudioDB.sql` – `-I` is required.)
   * *Existing database from the first version:* run only `Database/002_EventTypes_Documents_Upgrade.sql`.
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

## Screens

Login · Dashboard · Orders (list, create/edit form, detail with payments / expenses / albums / deliverables, quotation & invoice, delete) ·
Calendar (Month/Week/Day) · Albums · Payments ledger · Quotations & invoices (list, print/PDF view, edit) ·
**Settings** (studio details printed on documents, event types, packages per event type).

## Not built yet

Editing client records; multi-line custom invoice items; changing the owner password from the UI.
