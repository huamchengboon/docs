# Step 6: Firewall

Only Ignition’s HTTPS port needed a new rule; AD FS creates its own.
{ .lead }

```powershell title="PS>"
# AD FS already added: "AD FS HTTPS Services (TCP-In)" 443, "AD FS HTTP Services" 80, "AD FS Smart-card ..." 443
New-NetFirewallRule -DisplayName 'Ignition Gateway HTTPS (TCP 8043)' `
  -Description 'Inbound HTTPS to the Ignition Gateway (Perspective / web UI)' `
  -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8043 -Profile Domain,Private

# If you still use Windows Admin Center remotely after moving it:
# New-NetFirewallRule -DisplayName 'WAC (TCP 6443)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 6443 -Profile Domain

Get-NetFirewallRule -Direction Inbound -Enabled True -Action Allow | Get-NetFirewallPortFilter |
  Where LocalPort -in 443,8043,6443 | Select LocalPort,Protocol
```

HTTP (8088) was deliberately left closed so users can only reach Ignition over TLS. Test from a client with `Test-NetConnection ignition.example.local -Port 8043`.
