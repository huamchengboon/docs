# Step 1: DNS

Create the two host names, and make the server use its own DNS.
{ .lead }

Kerberos, the browser’s intranet-zone decision, and both TLS certificates all depend on host *names*. Create an A record for each service in your AD-integrated zone, both pointing at the server.

```powershell title="PS> on the DC"
$zone = 'example.local'
$ip   = '10.0.0.10'
foreach ($h in 'adfs','ignition') {
  if (-not (Get-DnsServerResourceRecord -ZoneName $zone -Name $h -ErrorAction SilentlyContinue)) {
    Add-DnsServerResourceRecordA -ZoneName $zone -Name $h -IPv4Address $ip
  }
}
Get-DnsServerResourceRecord -ZoneName $zone -RRType A | Where HostName -in 'adfs','ignition'
```

## Make sure the server resolves through itself

A domain controller must list **itself** first in its DNS client settings. In this lab it pointed at `10.0.0.1` (the Hyper-V host), so the DC’s own scripts could not resolve `adfs.example.local` even though its DNS server answered correctly. After the change, `adfs.example.local` must resolve to `10.0.0.10`.

```powershell title="PS>"
Set-DnsClientServerAddress -InterfaceAlias 'Ethernet 2' -ServerAddresses '10.0.0.10','10.0.0.1'
Clear-DnsClientCache

Resolve-DnsName adfs.example.local
Resolve-DnsName ignition.example.local
```

!!! tip "Clients too"

    Every client (and any separate Ignition server) must use this DNS server, otherwise it cannot resolve `adfs.example.local`. The public domain `ignition.example.com` that was used at first is not part of this setup; use a name inside your AD DNS zone.
