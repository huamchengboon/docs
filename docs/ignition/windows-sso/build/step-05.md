# Step 5: Group Policy for the browsers

This is what turns “password form” into “silent”. Without it, Edge/Chrome do not send the user’s Windows credentials to AD FS.
{ .lead }

Two things are required on each client, and one GPO provides both:

- **Intranet zone** — Windows/Edge only auto-sign-in to sites in the Local Intranet zone. A name with a dot (`adfs.example.local`) is *not* an intranet site by default, so map it explicitly (zone value `1`).
- **Allow-list for Negotiate** — Edge and Chrome need `AuthServerAllowlist` to attempt Kerberos/NTLM against a fully-qualified host.

```powershell title="PS>"
Import-Module GroupPolicy
$name = 'SSO - AD FS Intranet Zone'
$gpo  = Get-GPO -Name $name -ErrorAction SilentlyContinue
if (-not $gpo) { $gpo = New-GPO -Name $name -Comment 'Treat AD FS as intranet so browsers send Windows credentials (Kerberos) for SSO' }
$site = 'adfs.example.local'

$zk = 'HKLM\Software\Policies\Microsoft\Windows\CurrentVersion\Internet Settings\ZoneMapKey'
Set-GPRegistryValue -Name $name -Key $zk -ValueName "https://$site" -Type String -Value '1'
Set-GPRegistryValue -Name $name -Key $zk -ValueName "http://$site"  -Type String -Value '1'
foreach ($k in 'HKLM\Software\Policies\Microsoft\Edge','HKLM\Software\Policies\Google\Chrome') {
  Set-GPRegistryValue -Name $name -Key $k -ValueName 'AuthServerAllowlist' -Type String -Value $site
}

$dom = (Get-ADDomain).DistinguishedName
if (-not ((Get-GPInheritance -Target $dom).GpoLinks | Where DisplayName -eq $name)) {
  New-GPLink -Name $name -Target $dom -LinkEnabled Yes
}
gpupdate /force
```

!!! danger "Script bug we hit"

    Writing the link test as `if (-not (…).GpoLinks | Where …)` negates the wrong thing and silently *skips* creating the link. Wrap the whole pipeline in its own parentheses as above, and always confirm with `(Get-GPInheritance -Target $dom).GpoLinks`.

!!! tip "Verify on a client"

    `gpupdate /force`, then in Edge open `edge://policy` — `AuthServerAllowlist` must be listed. In `inetcpl.cpl → Security → Local intranet → Sites → Advanced` the AD FS URL is shown as managed by policy. Firefox ignores these policies (it has its own `network.negotiate-auth.trusted-uris`).
