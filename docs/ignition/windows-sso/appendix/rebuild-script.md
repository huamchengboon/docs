# Rebuild script

One place to copy from. It is the same commands as above, grouped into phases with the required restarts marked. Run it **phase by phase** in an elevated Windows PowerShell 5.1, reading the output between phases — it was not executed as a single script.
{ .lead }

## Settings

Edit these values first. Every phase below uses them, so run all phases in the same PowerShell window, or run this block again after a restart.

```powershell title="Build-SSO.ps1"
$Domain   = 'example.local'
$NetBIOS  = 'EXAMPLE'
$DcName   = 'DC01'
$Ip       = '10.0.0.10'
$AdfsHost = "adfs.$Domain"
$IgnHost  = "ignition.$Domain"
$IgnPort  = 8043
$CaConfig = "$DcName.$Domain\example-CA"
$Work     = 'C:\adfs-setup'
New-Item -ItemType Directory -Force $Work | Out-Null
```

## Phase 1. DNS, KDS key, gMSA, role

The DNS client line makes the DC resolve through itself. Back-dating the KDS key is for a lab only; in production, wait 10 hours. **Restart the server** when this phase finishes.

```powershell title="Build-SSO.ps1"
foreach ($h in 'adfs','ignition') {
  if (-not (Get-DnsServerResourceRecord -ZoneName $Domain -Name $h -ErrorAction SilentlyContinue)) {
    Add-DnsServerResourceRecordA -ZoneName $Domain -Name $h -IPv4Address $Ip
  }
}
Set-DnsClientServerAddress -InterfaceAlias 'Ethernet 2' -ServerAddresses $Ip

if (-not (Get-KdsRootKey)) {
  Add-KdsRootKey -EffectiveTime ((Get-Date).AddHours(-10))
}
New-ADServiceAccount -Name adfs-svc -DNSHostName $AdfsHost -PrincipalsAllowedToRetrieveManagedPassword ($DcName + '$')
Set-ADServiceAccount adfs-svc -KerberosEncryptionType AES128,AES256

$cfg = (Get-ADRootDSE).configurationNamingContext
dsacls "CN=WebServer,CN=Certificate Templates,CN=Public Key Services,CN=Services,$cfg" /G "${NetBIOS}\Domain Controllers:CA;Enroll"

Get-Certificate -Template WebServer `
  -DnsName $AdfsHost,"certauth.$AdfsHost" `
  -SubjectName "CN=$AdfsHost" `
  -CertStoreLocation Cert:\LocalMachine\My

Install-WindowsFeature ADFS-Federation -IncludeManagementTools
```

## Phase 2. gMSA, farm, browser list

If Windows Admin Center or IIS holds port 443, free it first as in [Step 3.3](../build/step-03.md): in WAC's `appsettings.json`, change `Url` `https://*:443` and `HttpSysUrls` `https://+:443` to 6443, then restart the `WindowsAdminCenter` service.

The script stops if the gMSA is not usable; see [Troubleshooting](../troubleshooting.md). **Restart again** after `Install-AdfsFarm` if it asks, then run the last three lines.

```powershell title="Build-SSO.ps1"
Install-ADServiceAccount adfs-svc
if (-not (Test-ADServiceAccount adfs-svc)) {
  throw 'gMSA not usable - see Troubleshooting'
}

$thumb = (Get-ChildItem Cert:\LocalMachine\My | Where Subject -eq "CN=$AdfsHost" | Select -First 1).Thumbprint
Install-AdfsFarm -CertificateThumbprint $thumb -FederationServiceName $AdfsHost -FederationServiceDisplayName 'Example SSO' `
  -GroupServiceAccountIdentifier "$NetBIOS\adfs-svc`$" -OverwriteConfiguration -Confirm:$false

$ua = (Get-AdfsProperties).WIASupportedUserAgents
if ($ua -notcontains 'Mozilla/5.0') {
  Set-AdfsProperties -WIASupportedUserAgents ($ua + 'Mozilla/5.0')
}
Restart-Service adfssrv
```

## Phase 3. OIDC client for Ignition

Between the web API and the permission lines, also set the two claim rules from [Step 4.4](../build/step-04.md) with `Set-AdfsWebApiApplication -TargetName 'Ignition Gateway - Web API' -IssuanceTransformRules $rules`.

```powershell title="Build-SSO.ps1"
$clientId = 'ignition-perspective'
$redirect = "https://${IgnHost}:${IgnPort}/data/federate/callback/oidc"

New-AdfsApplicationGroup -Name 'Ignition SCADA' -ApplicationGroupIdentifier $clientId

$app = Add-AdfsServerApplication -Name 'Ignition Gateway - Server app' `
  -ApplicationGroupIdentifier $clientId -Identifier $clientId `
  -RedirectUri $redirect -GenerateClientSecret
Set-Content "$Work\ignition-client-secret.txt" $app.ClientSecret -Encoding ASCII
icacls "$Work\ignition-client-secret.txt" /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null

Add-AdfsWebApiApplication -Name 'Ignition Gateway - Web API' `
  -ApplicationGroupIdentifier $clientId -Identifier $clientId `
  -AccessControlPolicyName 'Permit everyone'

Grant-AdfsApplicationPermission -ClientRoleIdentifier $clientId -ServerRoleIdentifier $clientId `
  -ScopeNames 'openid','profile','email','allatclaims'
```

## Phase 4. GPO, firewall, test user

Run the Group Policy commands from [Step 5](../build/step-05.md) and the firewall rule from [Step 6](../build/step-06.md) with `-LocalPort $IgnPort`. Then create the test user. Its random password is saved to a file only Administrators and SYSTEM can read.

```powershell title="Build-SSO.ps1"
$pw = -join ((65..90)+(97..122)+(48..57) | Get-Random -Count 14 | % {[char]$_})
$pw += 'a1!Z'

New-ADUser -Name 'SSO Test' -SamAccountName ssotest `
  -UserPrincipalName "ssotest@$Domain" -EmailAddress "ssotest@$Domain" `
  -AccountPassword (ConvertTo-SecureString $pw -AsPlainText -Force) `
  -Enabled $true -PasswordNeverExpires $true `
  -Path "CN=Users,$((Get-ADDomain).DistinguishedName)"

Set-Content "$Work\ssotest-password.txt" $pw -Encoding ASCII
icacls "$Work\ssotest-password.txt" /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null
```

## Phases 5 and 6. Ignition

- **Phase 5**, after installing Ignition ([Step 7](../build/step-07.md)): the Ignition certificate ([Step 2.4](../build/step-02.md)), the SSL wizard, and the `cacerts` import ([Step 7.4](../build/step-07.md)).
- **Phase 6**: the Ignition identity provider, attribute mapping, project, permissions and view ([Steps 8 to 10](../build/step-08.md)). These are done in the web UI and the Designer.
