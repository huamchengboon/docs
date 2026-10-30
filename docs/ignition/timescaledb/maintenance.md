# Maintenance and queries

Checks to run after the first scheduled job, queries for day-to-day use, and how to start over.
{ .lead }

All SQL runs in `psql` or pgAdmin's Query Tool, connected to the `tsdb` database. `sqlth_1_data` is the table name from [Ignition setup](ignition-setup.md#5-check-the-tables-in-pgadmin). Use your own number if it differs.

## Health checks

### Did the jobs run?

After the first scheduled run, `last_run_status` must be `Success`:

```sql
SELECT job_id, last_successful_finish, last_run_status, job_status, next_start, total_runs, total_failures FROM timescaledb_information.job_stats WHERE hypertable_name = 'sqlth_1_data';
```

All jobs for every hypertable:

```sql
SELECT * FROM timescaledb_information.jobs;
```

### Chunks and sizes

The chunks of the hypertable (one per day):

```sql
SELECT show_chunks('sqlth_1_data');
```

The size of the whole database:

```sql
SELECT pg_size_pretty(pg_database_size('tsdb'));
```

The disk space used by one index on the hypertable, across all its chunks, in bytes:

```sql
SELECT hypertable_index_size('sqlth_1_data_tagid_t_stamp_brinx');
```

### Is autovacuum running?

```sql
SELECT relname, last_vacuum, last_autovacuum FROM pg_stat_user_tables WHERE last_autovacuum is NOT NULL ORDER BY last_autovacuum DESC;
```

Chunk tables (`_hyper_1_N_chunk`) should appear with recent dates.

## Change the policies

To change how long data is kept or when it is compressed, remove the old policy and add a new one. Ages are in milliseconds.

```sql
SELECT remove_retention_policy('sqlth_1_data');
SELECT add_retention_policy('sqlth_1_data', BIGINT '2592000000');
```

```sql
SELECT remove_compression_policy('sqlth_1_data');
SELECT add_compression_policy('sqlth_1_data', BIGINT '604800000');
```

| Age | Milliseconds |
| --- | --- |
| 7 days | `604800000` |
| 30 days | `2592000000` |
| 31 days | `2678400000` |
| 366 days | `31622400000` |

A new policy gets a new job number. Set its schedule again if you use fixed times ([Hypertable setup](hypertable.md#choose-when-the-jobs-run)).

## Useful queries on the history data

These work against Ignition's own tables. `sqlth_te` lists the tags: `id` is the `tagid` in the data table, and `tagpath` is the tag's name.

### Time stamps: number to date and back

Ignition's `t_stamp` is milliseconds since 1970. This shows the current time in both forms, and the newest sample's time in both forms:

```sql
SELECT now() AS Now_dt, CAST (extract(epoch from now()) *1000 AS BIGINT) AS Now_bigint, to_timestamp(MAX(t_stamp/1000)) AS MAX_dt, MAX(t_stamp) AS MAX_bigint FROM public.sqlth_1_data;
```

### The last 10 samples of a named tag

```sql
SELECT T1.tagid, T2.tagpath, T2.datatype, T1.floatvalue, T1.dataintegrity, T1.t_stamp, to_timestamp(T1.t_stamp/1000) t_stamp_dt from public.sqlth_1_data T1, public.sqlth_te T2 where T1.tagid = T2.id AND T2.tagpath ='sine60' ORDER BY T1.t_stamp DESC FETCH FIRST 10 ROWS ONLY;
```

`dataintegrity = 192` is Ignition's *good* quality code.

### Statistics per tag

Average, median, minimum, maximum and sample count for every tag with good-quality samples. The PDF used it to check the simulator tags:

```sql
select distinct t1.tagid, t2.tagpath, AVG(t1.floatvalue), PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t1.floatvalue) as median ,MIN(t1.floatvalue), MAX(t1.floatvalue), count(*) FROM public.sqlth_1_data t1,  public.sqlth_te t2 where t1.tagid = t2.id AND t1.dataintegrity =192 group by t1.tagid, t2.tagpath order by t1.tagid;
```

In the lab, the simulator's sine tags averaged about 50 with a minimum of 0 and a maximum of 100, as the simulator program defines them. The sample counts differ from tag to tag.

## Look at, or reset, Ignition's tables

!!! danger "Resetting deletes history"

    The `delete` statements below remove history and tag configuration. The Ignition history provider that uses this database **must be disabled** first. Run each statement on its own, only when you want to start over.

What each table holds, with the statement that shows it and the one that empties it:

| Table | Holds | Look at it | Empty it |
| --- | --- | --- | --- |
| `sqlth_1_data` | The history samples | `select count(*) from public.sqlth_1_data;` | `delete from public.sqlth_1_data;` |
| `sqlth_te` | Active and retired tags | `select id, tagpath, scid, datatype, querymode, TO_TIMESTAMP(created/1000), TO_TIMESTAMP(retired/1000) from public.sqlth_te;` | `delete from public.sqlth_te;` |
| `sqlth_scinfo` | Tags and their historian groups | `select * from public.sqlth_scinfo;` | `delete from public.sqlth_scinfo;` |
| `sqlth_drv` | Historian drivers, with hosts and tag providers | `select * from public.sqlth_drv;` | `delete from public.sqlth_drv;` |
| `sqlth_sce` | Driver time frames and rates | `select scid, TO_TIMESTAMP(start_time/1000), TO_TIMESTAMP(end_time/1000), rate from public.sqlth_sce;` | `delete from public.sqlth_sce;` |
| `sqlth_partitions` | Data partitions and drivers | `select pname, drvid, TO_TIMESTAMP(start_time/1000), TO_TIMESTAMP(end_time/1000), blocksize, flags from public.sqlth_partitions;` | `delete from public.sqlth_partitions;` |
| `sqlth_annotations`, `saved_graphs`, `chart_annotations` | Chart annotations and saved charts | `select * from public.sqlth_annotations;` and the same for the other two | `delete from public.sqlth_annotations;` and the same for the other two |

Notes:

- If the delete is for a clean start, follow it with the history provider steps again. Ignition may create `sqlth_2_data` rather than reuse `sqlth_1_data`, as [described earlier](ignition-setup.md#5-check-the-tables-in-pgadmin).
- The `sqlth_1_data` rows live in many chunks, so `delete` on a large table is slow. `TRUNCATE sqlth_1_data;` is the faster way to empty a hypertable. This guide's PDF does not use it, so check Timescale's documentation first.

### If the annotation tables were not created

The PDF reports that `chart_annotations` and `saved_graphs` sometimes did not get created. Create them by hand, as the `ignition` user's tables:

```sql title="chart_annotations"
CREATE SEQUENCE IF NOT EXISTS public.chart_annotations_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;
ALTER SEQUENCE public.chart_annotations_seq
    OWNER TO ignition;

CREATE TABLE IF NOT EXISTS public.chart_annotations
(
    id integer NOT NULL DEFAULT nextval('chart_annotations_seq'::regclass),
    penname character varying(45) COLLATE pg_catalog."default" NOT NULL,
    xvalue timestamp(0) without time zone NOT NULL,
    yvalue double precision NOT NULL,
    note text COLLATE pg_catalog."default" NOT NULL,
    enteredby character varying(45) COLLATE pg_catalog."default" NOT NULL,
    lastupdated timestamp(0) without time zone NOT NULL,
    CONSTRAINT chart_annotations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;
ALTER TABLE IF EXISTS public.chart_annotations
    OWNER to ignition;

CREATE INDEX IF NOT EXISTS idx_tstamp
    ON public.chart_annotations USING btree
    (xvalue ASC NULLS LAST) TABLESPACE pg_default;
```

```sql title="saved_graphs"
CREATE SEQUENCE IF NOT EXISTS public.saved_graphs_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;
ALTER SEQUENCE public.saved_graphs_seq
    OWNER TO ignition;

CREATE TABLE IF NOT EXISTS public.saved_graphs
(
    id integer NOT NULL DEFAULT nextval('saved_graphs_seq'::regclass),
    title character varying(45) COLLATE pg_catalog."default" NOT NULL,
    tagpens text COLLATE pg_catalog."default" NOT NULL,
    axes text COLLATE pg_catalog."default" NOT NULL,
    chartmode integer,
    startdate timestamp(0) without time zone,
    enddate timestamp(0) without time zone,
    rangestartdate timestamp(0) without time zone,
    rangeenddate timestamp(0) without time zone,
    unit integer,
    unitcount integer,
    username character varying(45) COLLATE pg_catalog."default",
    lastmodified timestamp(0) without time zone NOT NULL,
    CONSTRAINT saved_graphs_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;
ALTER TABLE IF EXISTS public.saved_graphs
    OWNER to ignition;
```

If you use a different database user than `ignition`, change `OWNER TO` to match.
