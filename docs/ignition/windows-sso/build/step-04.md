# Step 4: Register Ignition in AD FS

An **application group** with a confidential server application (the OIDC client) and a web API (so claims reach the ID token).
{ .lead }

!!! note "Why a web API too?"

    The claims in the ID token come from the *issuance transform rules* of the relying party the client asks for. Giving the Web API the **same identifier as the client id** makes AD FS use its rules for the ID token, so UPN, e-mail, username and groups arrive. Without it the token contains only a few default claims.

Run the five parts below in order, in the same PowerShell window.

### 4.1 Create the application group

`$redirect` must be exactly the redirect URI Ignition shows. The command is `New-AdfsApplicationGroup`, not `Add-`.

```powershell title="PS>"
$grp      = 'Ignition SCADA'
$clientId = 'ignition-perspective'
$redirect = 'https://ignition.example.local:8043/data/federate/callback/oidc'

New-AdfsApplicationGroup -Name $grp -ApplicationGroupIdentifier $clientId
```

### 4.2 Add the server application and keep its secret

The client secret is shown only once, so the script stores it straight away in a file that only Administrators and SYSTEM can read.

```powershell title="PS>"
$app = Add-AdfsServerApplication -Name 'Ignition Gateway - Server app' `
         -ApplicationGroupIdentifier $clientId -Identifier $clientId `
         -RedirectUri $redirect -GenerateClientSecret

Set-Content C:\adfs-setup\ignition-client-secret.txt $app.ClientSecret -Encoding ASCII
icacls C:\adfs-setup\ignition-client-secret.txt /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null
```

### 4.3 Add the web API with the same identifier

```powershell title="PS>"
Add-AdfsWebApiApplication -Name 'Ignition Gateway - Web API' `
  -ApplicationGroupIdentifier $clientId -Identifier $clientId -AccessControlPolicyName 'Permit everyone'
```

### 4.4 Set the claim rules

The first rule sends the UPN, e-mail and username. The second sends every AD group as a role.

```powershell title="PS>"
$rules = @'
@RuleName = "AD attributes"
c:[Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname", Issuer == "AD AUTHORITY"]
 => issue(store = "Active Directory", types = ("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"), query = ";userPrincipalName,mail,sAMAccountName;{0}", param = c.Value);

@RuleName = "AD groups as roles"
c:[Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname", Issuer == "AD AUTHORITY"]
 => issue(store = "Active Directory", types = ("http://schemas.microsoft.com/ws/2008/06/identity/claims/role"), query = ";tokenGroups;{0}", param = c.Value);
'@
Set-AdfsWebApiApplication -TargetName 'Ignition Gateway - Web API' -IssuanceTransformRules $rules
```

### 4.5 Let the client ask for the scopes it needs

```powershell title="PS>"
Grant-AdfsApplicationPermission -ClientRoleIdentifier $clientId -ServerRoleIdentifier $clientId `
  -ScopeNames 'openid','profile','email','allatclaims'
```

## What the claims become

| AD source | Claim in the ID token | Ignition user attribute (Step 8) |
| --- | --- | --- |
| stable object id (AD FS) | `sub` | **ID** |
| sAMAccountName | `unique_name` (e.g. `ssotest`) | **Username** |
| userPrincipalName | `upn` | (available) |
| mail | `email` | **Email** (empty if the AD user has no mail) |
| group membership (tokenGroups) | `role` — one value per group | **Roles** |

## Changing it later

For example, when Ignition moves to another host or port, change the redirect URI and check it:

```powershell title="PS>"
Set-AdfsServerApplication -TargetName 'Ignition Gateway - Server app' `
  -RedirectUri 'https://newhost:8043/data/federate/callback/oidc'

Get-AdfsServerApplication | Select Name,Identifier,RedirectUri
```

To add a second OIDC application, run another `New-AdfsApplicationGroup` and `Add-AdfsServerApplication` with its own client id and secret.

!!! tip "Test without Ignition"

    Open `https://adfs.example.local/adfs/ls/idpinitiatedsignon.aspx` on a domain PC: it should show you signed in. (It is disabled by default; enable with `Set-AdfsProperties -EnableIdPInitiatedSignonPage $true` if you want it.)
