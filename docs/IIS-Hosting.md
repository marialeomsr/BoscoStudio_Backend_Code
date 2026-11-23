# Hosting Bosco Studio on this machine's IIS

You get two IIS sites:

| Site | What | Address | Folder |
|---|---|---|---|
| **BoscoStudio-Web** | the Angular website | http://localhost:8080 | `C:\inetpub\BoscoStudio\web` |
| **BoscoStudio-API** | the ASP.NET Core 8 API | http://localhost:8081 | `C:\inetpub\BoscoStudio\api` |

The website calls the API at `http://localhost:8081/api` (set in
`frontend\src\app\environments\environment.production.ts`). The database stays on SQL Server `MARIALEO`.

## One-time setup

**1. IIS** – already running on this machine (the `W3SVC` service). If IIS Manager is missing:
Windows Features → tick *Internet Information Services* (and *IIS Management Console*).

**2. .NET 8 Hosting Bundle** – lets IIS run the API. Without it the API gives HTTP 500.19.
Download "Hosting Bundle" from https://dotnet.microsoft.com/download/dotnet/8.0 and install it,
then run `iisreset` in an administrator command prompt.

**3. IIS URL Rewrite module** – lets the website reopen pages such as `/orders/5` after a refresh.
Download from https://www.iis.net/downloads/microsoft/url-rewrite and install it.

## Deploy (and every later update)

Open **PowerShell as Administrator** and run:

```powershell
powershell -ExecutionPolicy Bypass -File D:\LEO\Studio\BoscoStudio\deploy\Deploy-IIS.ps1
```

The script publishes the API, builds the Angular app, copies both to `C:\inetpub\BoscoStudio`, creates the two
app pools (*No Managed Code*) and the two sites, and starts them. Running it again is safe: it only updates the
files. Then open **http://localhost:8080** and sign in.

## Settings to check in the published API (`C:\inetpub\BoscoStudio\api\appsettings.json`)

- `ConnectionStrings:PhotoStudioDb` – the SQL Server login the API uses.
- `Jwt:SigningKey` – **change it** to your own long random text (32+ characters). Everyone is signed out when it changes.
- `Cors:AllowedOrigins` – must contain the address of the website (`http://localhost:8080` and
  `http://MARIALEO:8080` are already there).

After editing, recycle the app pool: IIS Manager → Application Pools → BoscoStudioApi → Recycle.
(The next deploy overwrites this file with the one from the project, so make lasting changes in
`BoscoStudio\appsettings.json` of the project too.)

## Using it from other computers on the network

1. Open ports 8080 and 8081 in Windows Firewall (inbound TCP).
2. In `environment.production.ts` change `apiUrl` to `http://MARIALEO:8081/api`, then run the deploy script again.
3. Other computers open `http://MARIALEO:8080`.
4. If they use another name or an IP address, add `http://thatname:8080` to `Cors:AllowedOrigins`.

## If something goes wrong

| What you see | Usual cause |
|---|---|
| **500.19** on the API site | Hosting Bundle not installed (step 2) – install it and run `iisreset`. |
| **500.19** on the website | URL Rewrite module not installed (step 3). |
| **502.5 / 500.30** on the API | The API failed to start. Set `stdoutLogEnabled="true"` in `C:\inetpub\BoscoStudio\api\web.config`, create a `logs` folder there, recycle the pool and read `logs\stdout…log`. Most often a wrong connection string. |
| Login page loads but sign-in says it cannot reach the server | API site stopped, wrong `apiUrl`, or the CORS origin is missing in `appsettings.json`. Check http://localhost:8081/api/auth/branding in the browser – it should show the studio name. |
| Refreshing a page gives 404 | URL Rewrite missing, or `web.config` is not in the `web` folder. |
| Database errors | SQL Server must allow the login in the connection string (SQL authentication, `sa`) from this machine. |
| Swagger page missing | Swagger only runs in the Development environment, so it is off in IIS (normal). |

## Notes

- Visual Studio's own IIS Express (port 44388) is separate. You can keep using it for development; the website
  built for IIS talks to port 8081, while `ng serve` still uses the development address.
- The SQL `sa` password is stored in plain text in `appsettings.json`. For anything beyond this machine, use a
  dedicated SQL login with limited rights and keep the password out of the project.
