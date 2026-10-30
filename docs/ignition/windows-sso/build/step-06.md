# Step 6: Firewall

Only Ignition’s HTTPS port needed a new rule; AD FS creates its own.
{ .lead }

AD FS already added *AD FS HTTPS Services (TCP-In)* on 443, *AD FS HTTP Services* on 80 and *AD FS Smart-card …* on 443. Add the rule for Ignition:

```powershell title="PS>"
New-NetFirewallRule -DisplayName 'Ignition Gateway HTTPS (TCP 8043)' `
  -Description 'Inbound HTTPS to the Ignition Gateway (Perspective / web UI)' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8043 -Profile Domain,Private
```

If you still use Windows Admin Center remotely after moving it to 6443 in Step 3, add a rule for it too:

```powershell title="PS>"
New-NetFirewallRule -DisplayName 'WAC (TCP 6443)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 6443 -Profile Domain
```

Then list the open ports:

```powershell title="PS>"
Get-NetFirewallRule -Direction Inbound -Enabled True -Action Allow |
  Get-NetFirewallPortFilter |
  Where LocalPort -in 443,8043,6443 |
  Select LocalPort,Protocol
```

HTTP (8088) was deliberately left closed so users can only reach Ignition over TLS. Test from a client with `Test-NetConnection ignition.example.local -Port 8043`.
