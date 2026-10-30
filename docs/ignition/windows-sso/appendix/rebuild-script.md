# Rebuild script

One place to copy from. It is the same commands as above, grouped into phases with the required restarts marked. Run it **phase by phase** in an elevated Windows PowerShell 5.1, reading the output between phases — it was not executed as a single script.
{ .lead }

```powershell title="Build-SSO.ps1"
# ====== EDIT THESE ======
$Domain   = 'example.local'; $NetBIOS = 'EXAMPLE'
$DcName   = 'DC01'; $Ip = '10.0.0.10'
$AdfsHost = "adfs.$Domain";    $IgnHost = "ignition.$Domain"; $IgnPort = 8043
$CaConfig = "$DcName.$Domain\example-CA"
$Work     = 'C:\adfs-setup'; New-Item -ItemType Directory -Force $Work | Out-Null

# ====== PHASE 1: DNS, KDS key, gMSA, role ======
foreach ($h in 'adfs','ignition') { if (-not (Get-DnsServerResourceRecord -ZoneName $Domain -Name $h -ErrorAction SilentlyContinue)) { Add-DnsServerResourceRecordA -ZoneName $Domain -Name $h -IPv4Address $Ip } }
Set-DnsClientServerAddress -InterfaceAlias 'Ethernet 2' -ServerAddresses $Ip   # the DC resolves via itself
if (-not (Get-KdsRootKey)) { Add-KdsRootKey -EffectiveTime ((Get-Date).AddHours(-10)) }   # lab only
New-ADServiceAccount -Name adfs-svc -DNSHostName $AdfsHost -PrincipalsAllowedToRetrieveManagedPassword ($DcName + '$')
Set-ADServiceAccount adfs-svc -KerberosEncryptionType AES128,AES256
$cfg = (Get-ADRootDSE).configurationNamingContext
dsacls "CN=WebServer,CN=Certificate Templates,CN=Public Key Services,CN=Services,$cfg" /G "${NetBIOS}\Domain Controllers:CA;Enroll"
Get-Certificate -Template WebServer -DnsName $AdfsHost,"certauth.$AdfsHost" -SubjectName "CN=$AdfsHost" -CertStoreLocation Cert:\LocalMachine\My
Install-WindowsFeature ADFS-Federation -IncludeManagementTools
# >>> RESTART the server now <<<

# ====== PHASE 2: free 443 (only if WAC/IIS holds it), gMSA, farm, UA list ======
# (WAC) edit appsettings.json: Url https://*:443 -> 6443 and HttpSysUrls https://+:443 -> 6443 ; Restart-Service WindowsAdminCenter
Install-ADServiceAccount adfs-svc ; if (-not (Test-ADServiceAccount adfs-svc)) { throw 'gMSA not usable - see Troubleshooting' }
$thumb = (Get-ChildItem Cert:\LocalMachine\My | Where Subject -eq "CN=$AdfsHost" | Select -First 1).Thumbprint
Install-AdfsFarm -CertificateThumbprint $thumb -FederationServiceName $AdfsHost -FederationServiceDisplayName 'Example SSO' `
  -GroupServiceAccountIdentifier "$NetBIOS\adfs-svc`$" -OverwriteConfiguration -Confirm:$false
# >>> RESTART again if asked <<<
$ua = (Get-AdfsProperties).WIASupportedUserAgents
if ($ua -notcontains 'Mozilla/5.0') { Set-AdfsProperties -WIASupportedUserAgents ($ua + 'Mozilla/5.0') }
Restart-Service adfssrv

# ====== PHASE 3: OIDC client for Ignition ======
$clientId = 'ignition-perspective'
$redirect = "https://${IgnHost}:${IgnPort}/data/federate/callback/oidc"
New-AdfsApplicationGroup -Name 'Ignition SCADA' -ApplicationGroupIdentifier $clientId
$app = Add-AdfsServerApplication -Name 'Ignition Gateway - Server app' -ApplicationGroupIdentifier $clientId -Identifier $clientId -RedirectUri $redirect -GenerateClientSecret
Set-Content "$Work\ignition-client-secret.txt" $app.ClientSecret -Encoding ASCII
icacls "$Work\ignition-client-secret.txt" /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null
Add-AdfsWebApiApplication -Name 'Ignition Gateway - Web API' -ApplicationGroupIdentifier $clientId -Identifier $clientId -AccessControlPolicyName 'Permit everyone'
# $rules = (the two claim rules from Step 4) ; Set-AdfsWebApiApplication -TargetName 'Ignition Gateway - Web API' -IssuanceTransformRules $rules
Grant-AdfsApplicationPermission -ClientRoleIdentifier $clientId -ServerRoleIdentifier $clientId -ScopeNames 'openid','profile','email','allatclaims'

# ====== PHASE 4: GPO + firewall + test user ======
# (GPO commands from Step 5) ; New-NetFirewallRule ... -LocalPort $IgnPort (Step 6)
$pw = -join ((65..90)+(97..122)+(48..57) | Get-Random -Count 14 | % {[char]$_}); $pw += 'a1!Z'
New-ADUser -Name 'SSO Test' -SamAccountName ssotest -UserPrincipalName "ssotest@$Domain" -EmailAddress "ssotest@$Domain" `
  -AccountPassword (ConvertTo-SecureString $pw -AsPlainText -Force) -Enabled $true -PasswordNeverExpires $true -Path "CN=Users,$((Get-ADDomain).DistinguishedName)"
Set-Content "$Work\ssotest-password.txt" $pw -Encoding ASCII
icacls "$Work\ssotest-password.txt" /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null

# ====== PHASE 5 (after installing Ignition, Step 7): Ignition certificate (Step 2.4), SSL wizard, cacerts import (Step 7.4) ======
# ====== PHASE 6: Ignition IdP, attribute mapping, project, permissions, view (Steps 8-10) - done in the web UI / Designer ======
```
