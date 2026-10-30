# References

Sources, credits and further reading.
{ .lead }

## This guide's sources

- [TimescaleDB + Ignition Setup (PDF)](TimescaleDB%20+%20Ignition%20Setup.pdf): the Ubuntu and Ignition walk-through. © 2024 Agile Automation Technology, LLC, by Peter Tiagunov, revision 1.1, 12 February 2024.
- [TimescaleDB Documentation (PDF)](TimescaleDB%20Documentation.pdf): the Windows install, the SQL Server comparison and the migration outline.
- The original page of this guide, which covered the Windows install and the hypertable commands. It is now spread over [Install on Windows](install-windows.md) and [Hypertable setup](hypertable.md).

## Compared against

- [Integrate Ignition with Tiger Cloud](https://www.tigerdata.com/docs/integrate/data-ingestion-streaming/ignition) (Tiger Data documentation, undated, read 30 October 2026): the current Ignition setup with the columnstore names and millisecond policy ages.
- [Ignition and TimescaleDB: a perfect pairing](https://www.tigerdata.com/blog/ignition-and-timescaledb-perfect-pairing) (Tiger Data blog, 17 April 2026, by Doug Pagnutti): the background and the same steps. It uses `INTERVAL` ages for the policies, which this guide does not follow (see [Hypertable setup](hypertable.md#4-add-the-compression-and-retention-policies)).

## Credits in the Setup PDF

The Ubuntu part is partly based on Timescale's [Linux installation guide](https://docs.timescale.com/self-hosted/latest/install/installation-linux/), with additions for Ignition. The lab used a free ESXi 7.0U3g host from VMware, PostgreSQL 14.10, pgAdmin 4 version 8.2, and a time-limited licence of Ignition 8.1.37 LTS.

## Further reading

**Ignition and Timescale**

- [Ignition Tag Historian module](https://inductiveautomation.com/resources/article/scada-historian)
- [Ad Hoc Trends on the Ignition Exchange](https://inductiveautomation.com/exchange/46/overview)
- [Ignition and TimescaleDB, from Tiger Data](https://www.tigerdata.com/blog/ignition-and-timescaledb-perfect-pairing)
- [Install self-hosted TimescaleDB on Linux](https://docs.timescale.com/self-hosted/latest/install/installation-linux/)
- [TimescaleDB releases](https://github.com/timescale/timescaledb/releases)

**BRIN indexes**

- [BRIN indexes, PostgreSQL documentation](https://www.postgresql.org/docs/current/brin-intro.html)
- [BRIN index for PostgreSQL: don't forget the benefits, by Percona](https://www.percona.com/blog/brin-index-for-postgresql-dont-forget-the-benefits/)
- [Postgres indexing: when does BRIN win? by Paul Ramsey](https://www.crunchydata.com/blog/postgres-indexing-when-does-brin-win)
- [Create a BRIN index at a fraction of the normal size, by Digoal Zhou](https://www.alibabacloud.com/blog/create-an-brin-index-at-a-fraction-of-the-normal-size_595138)

**Autovacuum**

- [Optimizing Postgres autovacuum for high-churn tables, by Adam Hendel](https://tembo.io/blog/optimizing-postgres-auto-vacuum)
- [Enabling and disabling autovacuum in PostgreSQL, by Hans-Jürgen Schönig](https://www.cybertec-postgresql.com/en/enabling-and-disabling-autovacuum-in-postgresql/)

**Newer TimescaleDB versions**

- [`add_compression_policy`](https://docs.tigerdata.com/api/latest/compression/add_compression_policy/) and [`add_columnstore_policy`](https://docs.timescale.com/api/latest/hypercore/add_columnstore_policy/)
- [Pull request 7443: aliases for the compression functions](https://github.com/timescale/timescaledb/pull/7443)
