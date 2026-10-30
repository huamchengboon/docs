# Step 3: AD FS install

KDS root key → service account → role → free port 443 → farm → browser User-Agent list.
{ .lead }

## 3.1 KDS root key and the gMSA

A group-managed service account needs a KDS root key in the forest. A new key normally becomes usable after 10 hours (so every DC has replicated it). On a **single** DC lab you can back-date it, as the first line does. In production, create the key and wait 10 hours instead.

Windows Server 2025 does not allow RC4, so the last two lines make the account AES-only. The value shown should be `24`.

```powershell title="PS>"
if (-not (Get-KdsRootKey)) {
  Add-KdsRootKey -EffectiveTime ((Get-Date).AddHours(-10))
}
Get-KdsRootKey | Select KeyId,EffectiveTime

New-ADServiceAccount -Name adfs-svc -DNSHostName adfs.example.local `
  -PrincipalsAllowedToRetrieveManagedPassword 'DC01$'

Set-ADServiceAccount adfs-svc -KerberosEncryptionType AES128,AES256
Get-ADServiceAccount adfs-svc -Properties msDS-SupportedEncryptionTypes |
  Select Name,'msDS-SupportedEncryptionTypes'
```

!!! danger "The encryption-type trap"

    A fresh gMSA has `msDS-SupportedEncryptionTypes = 28` (RC4 + AES). The server only supports AES (`24`), so `Install-ADServiceAccount` fails with *“The provided context did not match the target”* and the event log (`Microsoft-Windows-ManagedServiceAccount/Operational`, IDs 9000–9002) says *“not all the supported encryption types of the account are supported by the local machine”*. Setting the account to AES-only fixes it. (A reboot is also needed after the account is created so the server’s Kerberos ticket reflects its permission — or run `klist purge -li 0x3e7`.)

## 3.2 Install the role

The install ends with *“You must restart this server to finish the installation process.”* Restart straight away.

```powershell title="PS>"
Install-WindowsFeature ADFS-Federation -IncludeManagementTools
Restart-Computer
```

## 3.3 Free port 443 (Windows Admin Center was using it)

AD FS (HTTP.sys) must listen on 443. In this lab Windows Admin Center (WAC) was already bound to 443 through Kestrel. Move WAC to 6443 by editing its settings file in **two** places and restarting its service:

```powershell title="PS>"
$f = 'C:\Program Files\WindowsAdminCenter\Service\appsettings.json'
Copy-Item $f C:\adfs-setup\appsettings.json.bak -Force

$t = Get-Content $f -Raw
$t = $t.
  Replace('"Url":  "https://*:443"','"Url":  "https://*:6443"').
  Replace('"https://+:443"','"https://+:6443"')
Set-Content $f $t -Encoding UTF8

Restart-Service WindowsAdminCenter

Get-NetTCPConnection -State Listen |
  Where LocalPort -in 443,6443 |
  Select LocalPort,@{n='Proc';e={(Get-Process -Id $_.OwningProcess).Name}}
```

!!! warning "After this"

    WAC is at `https://<server>:6443` and its old firewall rule (443) no longer matches — add a rule for 6443 if you use WAC remotely. Its self-signed certificate had also expired (May 2026); that is cosmetic but worth replacing. If your server has no WAC, skip this step. Use `Get-NetTCPConnection -LocalPort 443` to find whatever else holds 443.

## 3.4 Install the gMSA locally and create the farm

`Test-ADServiceAccount` must print `True`. `$thumb` is the AD FS certificate thumbprint from Step 2.2.

```powershell title="PS>"
Install-ADServiceAccount adfs-svc
Test-ADServiceAccount adfs-svc

$thumb = 'A1B2C3D4E5F60718293A4B5C6D7E8F9012345678'
Install-AdfsFarm -CertificateThumbprint $thumb `
  -FederationServiceName 'adfs.example.local' `
  -FederationServiceDisplayName 'Example SSO' `
  -GroupServiceAccountIdentifier 'EXAMPLE\adfs-svc$' `
  -OverwriteConfiguration -Confirm:$false
```

Expected warnings, all harmless in a lab: the KDS key may not have replicated to other DCs (only matters with more than one DC); *“A machine restart is required”* (restart once more); and the certificate does not contain all UPN suffixes (only for device registration).

## 3.5 Allow Chromium-based browsers to use Windows sign-in

AD FS only offers silent Windows authentication to browsers whose User-Agent is on the `WIASupportedUserAgents` list. The default list covers IE and legacy Edge. Chromium Edge and Chrome identify as `Mozilla/5.0`, so add it, then restart the service:

```powershell title="PS>"
$ua = (Get-AdfsProperties).WIASupportedUserAgents
if ($ua -notcontains 'Mozilla/5.0') {
  Set-AdfsProperties -WIASupportedUserAgents ($ua + 'Mozilla/5.0')
}

Restart-Service adfssrv

(Get-AdfsProperties).WIASupportedUserAgents -join ' | '
```

## 3.6 Verify AD FS is healthy

Run the commands below and compare with this table.

| Command | Expected result |
| --- | --- |
| `Get-Service adfssrv` | Running |
| `Get-AdfsSslCertificate` | adfs, localhost and certauth.adfs, all with your thumbprint |
| `setspn -L adfs-svc` | `host/adfs.example.local`, the SPN Kerberos needs |
| `setspn -X` | No duplicate SPNs |
| `Invoke-WebRequest …/openid-configuration` | `200` |

```powershell title="PS>"
Get-Service adfssrv
Get-AdfsProperties | Select HostName,Identifier,HttpsPort
Get-AdfsSslCertificate

setspn -L adfs-svc
setspn -X

(Invoke-WebRequest https://adfs.example.local/adfs/.well-known/openid-configuration -UseBasicParsing).StatusCode
```

!!! success "Good result"

    The discovery document returns HTTP 200 with `issuer = https://adfs.example.local/adfs`, an authorize endpoint `…/adfs/oauth2/authorize/`, a token endpoint `…/adfs/oauth2/token/` and keys at `…/adfs/discovery/keys`.
