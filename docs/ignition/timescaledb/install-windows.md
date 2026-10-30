# Install on Windows

Install PostgreSQL, then add the TimescaleDB extension to it.
{ .lead }

## 1. Install PostgreSQL

Use either method.

=== "Command line"

    ```powershell title="powershell, as administrator"
    winget install postgresql.postgresql
    winget install postgresql.pgadmin
    ```

=== "Installer"

    1. Download PostgreSQL for **Windows x86-64** from the [PostgreSQL download page](https://www.postgresql.org/download/) (the Community download page on enterprisedb.com).
    2. Run the installer and keep the defaults. Set a password for the `postgres` user and remember it.

The [Documentation PDF](TimescaleDB%20Documentation.pdf#page=2) used PostgreSQL 16. The original page of this guide was written for version 11, so the example paths below say `<version>`.

## 2. Install TimescaleDB

TimescaleDB is an extension for PostgreSQL. Windows builds are zip files on the [TimescaleDB releases page](https://github.com/timescale/timescaledb/releases). The [Documentation PDF](TimescaleDB%20Documentation.pdf#page=2) used this release for PostgreSQL 16:

`https://github.com/timescale/timescaledb/releases/download/2.13.1/timescaledb-postgresql-16-windows-amd64.zip`

Pick the zip that matches **your** PostgreSQL major version (14, 15, 16 and so on). A zip built for a different PostgreSQL version will not load.

1. Download the TimescaleDB zip and extract the `timescaledb` folder to the desktop.

2. Add PostgreSQL's `bin` folder to the system `Path` variable, so the setup program can find `pg_config`.

    1. Search for **Environment Variables** and click **Edit the system environment variables**.
    2. On the **Advanced** tab, click **Environment Variables**.
    3. Select `Path` in the **System variables** table and click **Edit…**.
    4. Double-click the next empty row and paste the path to PostgreSQL's `bin` folder, for example:

        ```text
        C:\Program Files\PostgreSQL\<version>\bin
        ```

    5. Click **OK** on each window.

3. Stop the PostgreSQL service.

4. Right-click `setup.exe` in the extracted `timescaledb` folder and choose **Run as administrator**. A command prompt opens.

5. Press `y` to tune the PostgreSQL installation.

6. When asked, paste the path to PostgreSQL's **data** folder and press Enter:

    ```text
    C:\Program Files\PostgreSQL\<version>\data
    ```

7. Keep typing `y` and Enter until it stops asking.

!!! warning "Access denied"

    If the setup fails with *access denied*, you did not run `setup.exe` as administrator.

8. Start the PostgreSQL service again, or restart the PC as the [Documentation PDF](TimescaleDB%20Documentation.pdf#page=2) does.

## 3. Create the database and load the extension

Use `psql` or [pgAdmin](https://www.pgadmin.org/). pgAdmin comes with the PostgreSQL installer and `winget` installs it too.

```powershell title="powershell"
psql -U postgres
```

```sql title="psql"
CREATE DATABASE tsdb;
\c tsdb
CREATE EXTENSION IF NOT EXISTS timescaledb;
\dx
\q
```

`\dx` must list `timescaledb` with its version. Next: [create the Ignition user and allow the Gateway to connect](database-access.md).
