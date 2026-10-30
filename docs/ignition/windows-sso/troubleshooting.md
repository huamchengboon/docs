# Troubleshooting

Every entry below happened during this build, plus the likely causes of the “still asks for a password” case. Search or expand.
{ .lead }

!!! note "Where to look first"

    AD FS
    :   Event Viewer → *Applications and Services Logs → AD FS → Admin* (and *AD FS Tracing* if enabled). `Get-WinEvent -LogName 'AD FS/Admin' -MaxEvents 20`

    Kerberos
    :   Security log 4624/4625 (logon) and 4768/4769 (tickets) on the DC; on the client `klist`, `klist purge`.

    Ignition
    :   `C:\Program Files\Inductive Automation\Ignition\logs\wrapper.log` (also *Status → Diagnostics → Logs*). Designer: *Tools → Console*. Launcher: `%USERPROFILE%\.ignition\clientlauncher-data\designerlauncher.log`.

    Browser
    :   DevTools (F12) → Network + Console; Perspective logs *“store.Auth: Redirecting to login URL …”*.

## A · Build & platform

??? note "Commands fail with “Access is denied” though I am Administrator <span class=&quot;tag&quot;>shell</span>"

    **Cause:** an un-elevated token (UAC filters the built-in Administrator; `IsInRole(Administrator)` returns False). DNS, CA, AD FS and feature installs all need elevation.

    **Fix:** start PowerShell / the tool “as administrator”. Check with `([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)`. Side effect: `Get-KdsRootKey` returns nothing when not elevated, which looks like “key missing”.

??? note "Server can’t resolve `adfs.example.local` although the DNS record exists <span class=&quot;tag&quot;>DNS</span>"

    **Cause:** the DC’s DNS client pointed at another resolver (the Hyper-V host `10.0.0.1`). The DNS *server* answered correctly (`Resolve-DnsName … -Server 127.0.0.1` worked).

    **Fix:** `Set-DnsClientServerAddress -InterfaceAlias 'Ethernet 2' -ServerAddresses '10.0.0.10','10.0.0.1'` then `Clear-DnsClientCache`.

??? note "Port 443 already in use before installing AD FS <span class=&quot;tag&quot;>AD FS</span>"

    **Cause:** Windows Admin Center (Kestrel) was bound to `*:443`. Find the owner: `Get-NetTCPConnection -LocalPort 443 -State Listen | % { (Get-Process -Id $_.OwningProcess).Name }`.

    **Fix:** move WAC to 6443 in `appsettings.json` (`Kestrel.Endpoints.WindowsAdminCenter.Url` **and** `HttpSysUrls`) and restart `WindowsAdminCenter`. Not recommended: running AD FS on a non-443 port (every URL, redirect and discovery value then needs the port).

??? note "`Install-ADServiceAccount`: “The provided context did not match the target” <span class=&quot;tag&quot;>gMSA</span>"

    **Cause 1 (the real one here):** encryption types. Event 9001: *not all the supported encryption types of the account are supported by the local machine*. Server 2025 has RC4 off; the gMSA defaulted to 28.

    **Fix 1:** `Set-ADServiceAccount adfs-svc -KerberosEncryptionType AES128,AES256` (value 24), `klist purge -li 0x3e7`, retry. Event 9000 *“Netlogon failed to retrieve the password … Object Name not found”* usually follows from the same cause.

    **Cause 2:** the computer is not in `PrincipalsAllowedToRetrieveManagedPassword`, or its Kerberos ticket pre-dates that change → reboot once. **Cause 3:** KDS root key missing/not yet effective (`Get-KdsRootKey`).

??? note "`CERTSRV_E_TEMPLATE_DENIED` / “can be issued only to a computer” <span class=&quot;tag&quot;>certificates</span>"

    **Cause:** WebServer is a machine template. `Get-Certificate` into `LocalMachine\My` enrolls as the *computer account*, which lacked Enroll. Requesting into `CurrentUser\My` as an admin fails with “can be issued only to a computer”.

    **Fix:** give *Domain Controllers* Enroll on the template (Step 2.1) and request into the machine store; for an externally generated CSR, submit it as `SYSTEM` via a one-shot scheduled task (Step 2.4b).

??? note "Certificate has “No alternative name” — browser says the name does not match <span class=&quot;tag&quot;>certificates</span>"

    **Cause:** Ignition’s built-in CSR form has no SAN field, so the CA issues a certificate with an empty SAN. Browsers and Java need the host name in the SAN.

    **Fix:** create the CSR with `keytool … -ext SAN=dns:host` (Step 2.4a), check `certutil -dump file.csr` shows *DNS Name=…*, and verify the issued cert the same way. Do **not** enable the CA’s `EDITF_ATTRIBUTESUBJECTALTNAME2` flag.

??? note "Gateway logs “Resource bytes are null”; hand-made views never load <span class=&quot;tag&quot;>Ignition files</span>"

    **Cause:** a template containing the word `files` was filled with `-replace 'FILE','view.json'`. PowerShell’s `-replace` is **case-insensitive**, so it also rewrote the JSON key `"files"` to `"view.jsons"`.

    **Fix:** the correct `resource.json` is `{"scope":"G","version":1,"restricted":false,"overridable":true,"files":["view.json"],"attributes":{}}`. Use `.Replace()` (case-sensitive) or `-creplace`. Then *Scan File System* or restart.

??? note "Silent installers return 0 but nothing is installed <span class=&quot;tag&quot;>install</span>"

    Ignition `--mode unattended` and Designer Launcher `-q` did not complete in this environment (the quiet run waited for a window). Run both installers interactively.

??? note "`certutil -ca.cert`: “Expected no more than 1 args” <span class=&quot;tag&quot;>PowerShell</span>"

    PowerShell splits at the dot. Quote it (`certutil '-ca.cert' out.cer`) or use `Export-Certificate`.

## B · Ignition

??? note "Nothing listens on 8043 after install <span class=&quot;tag&quot;>HTTPS</span>"

    **Cause:** HTTPS only starts after commissioning *and* after an SSL certificate is installed (Network → Web Server → Setup SSL / TLS). `StatusPing` says `COMMISSIONING` until the setup wizard is finished.

??? note "SSL wizard: “Unable to find a private key which matches the public key” <span class=&quot;tag&quot;>HTTPS</span>"

    **Cause:** a previous “No → CSR” attempt left a stored key (`Generated with previous CSR`), so the wizard compares your new certificate with the wrong key.

    **Fix:** at the private-key step click **Reset Step → Confirm**, supply the matching `ignition-key.pem`, then the certificate and CA again. Also confirm the certificate really belongs to that key (`keytool -list` shows one `PrivateKeyEntry` after importing the signed cert).

??? note "“Import Failed” when importing the AD FS metadata <span class=&quot;tag&quot;>IdP</span>"

    The **Gateway server** (not your browser) fetches that URL. It fails when the Gateway cannot **resolve** `adfs.example.local` (DNS), cannot **reach** 443, or does not **trust** the AD FS certificate (CA missing in the Gateway’s `cacerts`).

    This happened first with a Gateway hosted elsewhere (`ignition.example.com`) that had no route/DNS to the internal AD FS. Once Ignition ran on the same network and the CA was imported (Step 7.4) it returned **IMPORT COMPLETE**. Test from the Gateway host: `Invoke-WebRequest https://adfs.example.local/adfs/.well-known/openid-configuration` and the Java trust import.

??? note "Username shows a long random string <span class=&quot;tag&quot;>mapping</span>"

    The default mapping uses `sub` for both ID and Username. Change **Username** to `unique_name` (Step 8.2); keep ID = `sub`. Existing sessions keep the old value until they re-login.

??? note "Roles are empty or ugly <span class=&quot;tag&quot;>mapping</span>"

    The **Mapped User Attributes** test tab may omit roles, but `session.props.auth.user.roles` in a running session is populated: one entry per AD group. Each entry prints as a record (`[Domain Admins, Good_Unspecified, date]`), which wraps and overlaps other labels. The view’s script transform keeps only the first field of each entry (Appendix B). A group appears only if it is in the user’s token (`tokenGroups`), i.e. nested groups are included, distribution groups are not.

??? note "The Perspective page / Designer canvas is blank although labels exist <span class=&quot;tag&quot;>view</span>"

    **Cause:** root container `props.mode = "percent"`. Pixel positions were treated as percentages. `get_page_text`/DOM shows the text, the screen shows nothing.

    **Fix:** set the root `props.mode` to `"fixed"` (Designer: container → *Mode: Fixed*), keep `defaultSize` sensible, restart or rescan.

??? note "Gateway: “Unable to run action ‘system.onStartup’ … code could not be compiled” <span class=&quot;tag&quot;>scripting</span>"

    Event scripts stored in `view.json` are function **bodies**: every line must begin with a TAB (`"\tif not …:\n\t\tsystem.perspective.login()"`). In the Designer this is automatic. (A startup `system.perspective.login()` script is a fallback only; the Authenticated permission already forces login.)

??? note "The project page opens without asking anyone to log in <span class=&quot;tag&quot;>project</span>"

    Default Perspective permissions allow **Public**. In the Designer set *Project Properties → Perspective → Permissions* to **Authenticated** only and save. Verify the file `com.inductiveautomation.perspective\session-permissions\data.bin` changed. A browser then shows *“You must log in to continue”*.

??? note "Designer has no Perspective node; console shows JxBrowser / “Process exit code: 0” <span class=&quot;tag&quot;>Designer</span>"

    See Step 10. Add `-Dignition.chromium.switch.do-not-de-elevate` to that gateway’s **JVM Arguments** in the Designer Launcher (Manage) and restart the Designer. Other fixes in vendor notes (clearing the jxbrowser cache, antivirus exclusions, free disk space for the temp folder) apply when the exit code or stack differs.

??? note "Designer: “Missing Input — Please select an user source” / “Can’t get roles from the gateway” <span class=&quot;tag&quot;>Designer</span>"

    Choose `default` as the project’s User Source (required by the dialog, unused for SSO). The second message is expected with an external IdP; the settings were saved (check the project files’ timestamps).

??? note "Designer Launcher: “SSL Certificate must be imported” <span class=&quot;tag&quot;>Launcher</span>"

    The launcher uses its own Java trust. Click **Trust Certificate** after checking the subject, issuer (`example-CA`) and dates. It remembers the choice per gateway entry.

??? note "My edits to project files do not show up <span class=&quot;tag&quot;>projects</span>"

    The Gateway caches project resources. Use *Platform → System → Projects → Scan File System* (needs admin login) or `Restart-Service Ignition` (~1 min, sessions drop). Close the Designer first — saving from a stale Designer overwrites hand-edited files. Keep backups (the `.bak` copies in `C:\adfs-setup` were made before each change).

??? note "Log: “Could not read license from HASP key”; “Trial time reset” <span class=&quot;tag&quot;>licence</span>"

    Informational on a trial/unlicensed Gateway. The 2-hour trial is reset by restarting the Gateway; activate a licence for production.

## C · The SSO itself (client side)

???+ note "Edge/Chrome shows the AD FS **password form** instead of signing in silently <span class=&quot;tag&quot;>SSO</span>"

    Work through these in order — the first one that is wrong is almost always the cause.

    | # | Check | How | Fix |
    | --- | --- | --- | --- |
    | 1 | Client is domain-joined and the user logged on with a **domain** account | `whoami` → `EXAMPLE\user`; `systeminfo \| findstr Domain` | Join the domain; do not use a local account or RDP with saved local creds. |
    | 2 | URL uses the **FQDN**, not an IP / short name / `localhost` | Address bar | Use `adfs.example.local` / `ignition.example.local`. |
    | 3 | AD FS in the **Intranet** zone | `inetcpl.cpl` → Local intranet → Sites; `gpresult /h gp.html` | Step 5 GPO linked and applied (`gpupdate /force`, re-logon). |
    | 4 | Browser allowed to use Negotiate | `edge://policy` → `AuthServerAllowlist` | Step 5 values; Firefox needs its own setting. |
    | 5 | AD FS accepts the browser (**User-Agent**) | `(Get-AdfsProperties).WIASupportedUserAgents` | Add `Mozilla/5.0`; `Restart-Service adfssrv`. |
    | 6 | Intranet auth provider includes Windows auth | `(Get-AdfsGlobalAuthenticationPolicy).PrimaryIntranetAuthenticationProvider` | Must contain `WindowsAuthentication`. |
    | 7 | SPN exists once | `setspn -L adfs-svc`; `setspn -X` | Remove duplicates (`setspn -D`); the host SPN is created by the farm install. |
    | 8 | Time within 5 minutes of the DC | `w32tm /query /status` | Fix NTP; Hyper-V time-sync. |
    | 9 | The browser is not running “as another user”/InPrivate with different rules; no proxy intercepts | Normal window; `netsh winhttp show proxy` | Bypass the proxy for `*.example.local`. |

    To see what AD FS did, open the **AD FS/Admin** log right after a failed attempt and the DC’s Security log (4768/4769). If you see an NTLM logon (4624, package NTLM) instead of Kerberos tickets, check 2, 7 and 3.

??? note "The page goes blank on `/adfs/oauth2/authorize/wia` <span class=&quot;tag&quot;>SSO</span>"

    That endpoint is the Windows-authentication challenge. A real Windows browser handles it silently. Embedded or automation browsers (the preview pane used while building this) cannot negotiate and sit on a blank page. Test in Edge/Chrome. (In that same pane the normal AD FS *form* login still worked, which is how the first end-to-end test was done.)

??? note "Browser shows a certificate warning for AD FS or Ignition <span class=&quot;tag&quot;>TLS</span>"

    The client does not trust `example-CA` (non-domain PC, or the Enterprise CA root is not in *Trusted Root*). On a domain PC: `certutil -pulse`/`gpupdate`. On others import `example-ca.cer` into *Local Machine → Trusted Root Certification Authorities* (`certutil -addstore -f Root example-ca.cer`). Also confirm the browser URL name appears in the certificate’s **SAN**. Note: the template’s certificates only advertise an **LDAP** CRL/AIA location, so non-domain machines cannot check revocation unless you publish HTTP CDP/AIA.

??? note "AD FS error page / Ignition login ends with an OAuth error <span class=&quot;tag&quot;>OIDC</span>"

    - **Redirect URI mismatch** — compare `Get-AdfsServerApplication` `RedirectUri` with Ignition’s printed URI (scheme, host, port, path). Fix with `Set-AdfsServerApplication -RedirectUri`.
    - **Wrong/expired secret** (*invalid\_client* from the token endpoint; Ignition’s log shows a failed token exchange) — generate a new one: `Set-AdfsServerApplication -TargetName 'Ignition Gateway - Server app' -ResetClientSecret`, then paste the new value into the Ignition IdP.
    - **Scope not granted** — re-run `Grant-AdfsApplicationPermission … -ScopeNames openid,profile,email,allatclaims`.
    - **Ignition cannot reach/trust AD FS** — Step 7.4 and DNS from the Gateway host.
    - Always read the matching event in *AD FS/Admin*; it names the failing field.

??? note "`Add-AdfsApplicationGroup` is not recognised <span class=&quot;tag&quot;>cmdlet</span>"

    The cmdlet is `New-AdfsApplicationGroup`. The server/web-API cmdlets are `Add-AdfsServerApplication` / `Add-AdfsWebApiApplication`. A wrong name makes every following command fail with “No application group found with identifier …” and a script can still write an *empty* secret file — delete it and re-run.

??? note "After “Sign out” the user is signed straight back in <span class=&quot;tag&quot;>behaviour</span>"

    Expected with SSO: logging out of Ignition does not end the AD FS/Windows session, so the next visit re-authenticates silently. Single logout is not configured. Users who must switch identity need to sign out of Windows or use a different browser profile; *Always ask the IdP to re-authenticate* (project setting) forces a prompt.
