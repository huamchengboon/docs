# Step 4: Register Ignition in AD FS

An **application group** with a confidential server application (the OIDC client) and a web API (so claims reach the ID token).
{ .lead }

!!! note "Why a web API too?"

    The claims in the ID token come from the *issuance transform rules* of the relying party the client asks for. Giving the Web API the **same identifier as the client id** makes AD FS use its rules for the ID token, so UPN, e-mail, username and groups arrive. Without it the token contains only a few default claims.

```powershell title="PS>"
$grp      = 'Ignition SCADA'
$clientId = 'ignition-perspective'
$redirect = 'https://ignition.example.local:8043/data/federate/callback/oidc'   # exactly Ignition's value

New-AdfsApplicationGroup -Name $grp -ApplicationGroupIdentifier $clientId           # NOTE: New-, not Add-

$app = Add-AdfsServerApplication -Name 'Ignition Gateway - Server app' `
         -ApplicationGroupIdentifier $clientId -Identifier $clientId `
         -RedirectUri $redirect -GenerateClientSecret
# The secret is shown only once - store it with a locked-down ACL:
Set-Content C:\adfs-setup\ignition-client-secret.txt $app.ClientSecret -Encoding ASCII
icacls C:\adfs-setup\ignition-client-secret.txt /inheritance:r /grant:r "Administrators:F" "SYSTEM:F" | Out-Null

Add-AdfsWebApiApplication -Name 'Ignition Gateway - Web API' `
  -ApplicationGroupIdentifier $clientId -Identifier $clientId -AccessControlPolicyName 'Permit everyone'

$rules = @'
@RuleName = "AD attributes"
c:[Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname", Issuer == "AD AUTHORITY"]
 => issue(store = "Active Directory", types = ("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"), query = ";userPrincipalName,mail,sAMAccountName;{0}", param = c.Value);

@RuleName = "AD groups as roles"
c:[Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/windowsaccountname", Issuer == "AD AUTHORITY"]
 => issue(store = "Active Directory", types = ("http://schemas.microsoft.com/ws/2008/06/identity/claims/role"), query = ";tokenGroups;{0}", param = c.Value);
'@
Set-AdfsWebApiApplication -TargetName 'Ignition Gateway - Web API' -IssuanceTransformRules $rules

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

```powershell title="PS>"
# e.g. Ignition moved to another host/port:
Set-AdfsServerApplication -TargetName 'Ignition Gateway - Server app' -RedirectUri 'https://newhost:8043/data/federate/callback/oidc'
Get-AdfsServerApplication | Select Name,Identifier,RedirectUri
# a second application (another OIDC app) = another New-AdfsApplicationGroup + Add-AdfsServerApplication with its own client id/secret
```

!!! tip "Test without Ignition"

    Open `https://adfs.example.local/adfs/ls/idpinitiatedsignon.aspx` on a domain PC: it should show you signed in. (It is disabled by default; enable with `Set-AdfsProperties -EnableIdPInitiatedSignonPage $true` if you want it.)
