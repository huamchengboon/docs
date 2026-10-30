# Migrate from SQL Server

Move an existing history database from Microsoft SQL Server to PostgreSQL with TimescaleDB.
{ .lead }

This page follows the [Documentation PDF](TimescaleDB%20Documentation.pdf#page=4), which gives the outline and the Timescale commands. It is a skeleton, not a tested recipe for an Ignition historian, and it was written around a generic table with a column called `time`.

!!! warning "Read this before you start"

    - **Test on a copy first.** Do the whole migration on a copy of the history database, and keep the SQL Server database untouched until the new one has been checked.
    - **The Ignition tables belong together.** The history data refers to tags by `tagid`, and the tag list lives in `sqlth_te`, with related tables `sqlth_scinfo`, `sqlth_drv`, `sqlth_sce` and `sqlth_partitions` (see [Maintenance](maintenance.md#look-at-or-reset-ignitions-tables)). If data partitioning was on in SQL Server, the history is spread over several data tables, listed in `sqlth_partitions`. Bring all of them over together, or the tag ids will not match.
    - **The PDF's examples use a `time` column.** Ignition's data table uses a millisecond number in `t_stamp`. Use the hypertable commands from [Hypertable setup](hypertable.md) for it, not the generic ones below.

## Steps

1. **Install PostgreSQL and TimescaleDB, create the database and connect Ignition**, as in [Install on Windows](install-windows.md) or [Install on Ubuntu](install-ubuntu.md), [Database access](database-access.md) and steps 1 to 3 of [Ignition setup](ignition-setup.md). Do not enable history on any tag yet.

2. **Generate a script of the schema from SQL Server.** In SQL Server Management Studio, script the tables.

3. **Dump the tables** (the data) from SQL Server.

4. **Load the schema script** into PostgreSQL. SQL Server's script syntax is not the same as PostgreSQL's, so expect to fix some of it by hand.

5. **Convert the data table to a hypertable.** The PDF's generic form is:

    ```sql
    SELECT create_hypertable('<table_name>', by_range('time'));
    ```

    For Ignition's `t_stamp` column use the form from [Hypertable setup, step 1](hypertable.md#1-convert-the-table-to-a-hypertable), with the millisecond chunk interval and `unix_now` function.

6. **Add an index.** The PDF's example is `CREATE INDEX ON conditions(time, <column_name>) WITH (timescaledb.transaction_per_chunk);`. `conditions` is the table name from Timescale's own example, so use your own table. The `transaction_per_chunk` setting makes Timescale build the index chunk by chunk.

7. **Add compression:**

    ```sql
    ALTER TABLE <table_name>
    SET (
        timescaledb.compress,
        timescaledb.compress_segmentby = '<column_name>',
        timescaledb.compress_orderby = 'time DESC'
    );

    SELECT compress_chunk(c) from show_chunks('<table_name>') c;

    SELECT add_compression_policy('<table_name>', INTERVAL '8 days');
    ```

    The second statement compresses every existing chunk right away, so the loaded data does not wait for the policy. The `INTERVAL '8 days'` form is for a table with a real time-stamp column. For Ignition's millisecond column the age is a number, as in [Hypertable setup, step 4](hypertable.md#4-add-the-compression-and-retention-policies).

8. **Load the dumped data** into the new tables.

9. **In Ignition, set the storage provider** of your tags to the new PostgreSQL database, then re-check history in a trend.

!!! note "Not covered by the PDF"

    The PDF does not say how to dump, convert or load the data, or how to carry over Ignition's tag ids. Check the result by comparing row counts and by looking at a known tag's trend before and after.
