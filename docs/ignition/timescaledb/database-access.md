# Database access

Create the database and user Ignition will use, then let the Ignition Gateway connect over the network.
{ .lead }

Run these on the **database host**, after [Windows](install-windows.md) or [Ubuntu](install-ubuntu.md) is installed.

## Create the user and database

On Ubuntu, switch to the `postgres` account first. On Windows, run `psql -U postgres` instead.

```bash title="bash (Ubuntu)"
sudo -i -u postgres
psql
```

First set the password of the `postgres` administrator account, then create the Ignition user and database.

```sql title="psql"
\password postgres
CREATE USER ignition WITH PASSWORD 'choose-a-long-random-password';
CREATE DATABASE tsdb;
GRANT ALL PRIVILEGES ON DATABASE tsdb TO ignition;
\c tsdb
CREATE EXTENSION IF NOT EXISTS timescaledb;
\dx
```

You will use the same user, password and database name in Ignition. The [Setup PDF](TimescaleDB%20+%20Ignition%20Setup.pdf#page=4) uses user `ignition`, database `tsdb` and the weak password `12345`.

The first time the extension loads it prints a *WELCOME TO TimescaleDB* banner and the version. `\dx` must then list two extensions: `plpgsql` and `timescaledb` with its version (2.13.1 in the lab).

!!! warning "Choose a real password"

    `12345` appears in the PDF only as a lab example. Anyone who can reach the database port can try it.

On Ubuntu, leave `psql` with `\q`, then `exit` to return to your own account.

## Let the Ignition Gateway connect

PostgreSQL only listens on the local machine by default. When the Gateway is a different machine, change two files and open the port. On Ubuntu the files are in `/etc/postgresql/<version>/main/`. On Windows they are in PostgreSQL's `data` folder.

### 1. Listen on the network: `postgresql.conf`

Open the file with `sudo nano /etc/postgresql/<version>/main/postgresql.conf` and find this line:

```text
#listen_addresses = 'localhost'
```

Remove the `#` and change the value. `'*'` listens on every address; a single address such as the host's own IP is tighter.

```text
listen_addresses = '*'
port = 5432
max_connections = 75
```

`max_connections = 75` is what `timescaledb-tune` chose for the lab machine; keep your own value. Changes to these settings need a restart. The [Setup PDF](TimescaleDB%20+%20Ignition%20Setup.pdf#page=5) shows the file.

### 2. Allow the Gateway: `pg_hba.conf`

This file decides who may connect and how they prove who they are. Find the IPv4 line:

```text
host    all    all    127.0.0.1/32    scram-sha-256
```

!!! danger "What the PDFs did, and why not to do it"

    Both PDFs change that line to `host all all 0.0.0.0/0 trust`. That accepts a connection from **any address** with **no password check**, as **any** user including `postgres`. It makes the lab easy, and it is not safe on any real network.

Add a line that allows only the Ignition user, to only the one database, from only the Gateway's address. Replace `192.0.2.10` with your Gateway's IP, or use its subnet such as `192.0.2.0/24`:

```text
host    tsdb    ignition    192.0.2.10/32    scram-sha-256
```

Leave the original `127.0.0.1/32` line in place so local tools such as `psql` and pgAdmin on the host keep working.

If the Gateway cannot connect after you switch to `scram-sha-256`, first check that it uses the 42.x JDBC driver from [Ignition setup](ignition-setup.md#1-update-the-jdbc-driver).

### 3. Open the port in the firewall

=== "Ubuntu"

    ```bash title="bash"
    sudo ufw allow from 192.0.2.10 to any port 5432 proto tcp
    ```

    The PDF opens the port to everyone with `sudo ufw allow 5432/tcp`. Naming the Gateway's address as above is tighter.

=== "Windows"

    ```powershell title="powershell, as administrator"
    New-NetFirewallRule -DisplayName 'PostgreSQL (TCP 5432)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5432 -RemoteAddress 192.0.2.10
    ```

### 4. Restart PostgreSQL

```bash title="bash (Ubuntu)"
sudo service postgresql restart
```

On Windows, restart the `postgresql-x64-<version>` service in the **Services** console, or restart the PC.

!!! tip "Test it from the Gateway machine"

    Before touching Ignition, check the port is reachable. From the Gateway machine in PowerShell: `Test-NetConnection <database-host-ip> -Port 5432` must show `TcpTestSucceeded : True`.

Next: [configure Ignition](ignition-setup.md).
