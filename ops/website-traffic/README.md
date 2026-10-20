# mynw.app — website analytics (server-side aggregates)

Deployed 2026-10-20. All 38 site HTML pages, including error, family-invite,
product, documentation, policy and NowKids OCR-test pages, reference
`/assets/traffic.js?v=1`. No mobile app binaries or sources are changed.

## Pipeline

Browser page load -> `https://utauewtqtmqgmguxtmvn.supabase.co/functions/v1/website-traffic`
(Supabase Edge, public POST only, allowed `Origin: https://mynw.app`) ->
restricted `mynw_record_pageview` RPC -> `public.mynw_pageviews_daily`.

- One aggregate row per UTC day, canonical **page path**, language and coarse
  source category, with count and first/last timestamps.
- No cookies, analytics identity in sessionStorage/localStorage, user IDs,
  persistent browser fingerprints, user-agent, IP, URL query string, invitation
  tokens or referrer URLs are written to the analytics database.
- Source can be direct/internal/external or a manually tagged app value from
  `?src=nowwhat`, `?src=nowcook`, `?src=nowkids`, `?src=nowgreen`.
  Tagged app sources are **not independently verifiable**.
- Visitors with Global Privacy Control or Do Not Track enabled are excluded.
- Public users cannot read the report and cannot call the SQL increment RPC.
  Service-role credentials remain server-side.
- Data starts collecting **after site deployment**; history cannot be reconstructed.
- Counts are pageviews, **not unique human visitors**. Server/hosting access
  logs are governed separately by their infrastructure; pageview table does not
  include request-level identifiers.
- Browser JS required. Blocking/extensions/network failures and bots make
  totals estimates, not authoritative invoices.
- Do not expose service_role key in website JavaScript.
- To add new HTML routes: instrument with traffic.js and update the deployed
  Edge function's `allowedPaths` so they are accepted.
- The NowKids OCR-test page required a narrow `connect-src` CSP addition for
  the analytics endpoint; its original OCR provider is unchanged.

## Read statistics in the Supabase SQL editor (not the app)

Last 30 days by day:
```sql
select day, sum(views) as pageviews
from public.mynw_pageviews_daily
group by day
order by day desc limit 30;
```

Most visited pages:
```sql
select page_path, sum(views) as pageviews
from public.mynw_pageviews_daily
group by page_path order by pageviews desc;
```

Per-language and entry source for welcome:
```sql
select day, page_lang, source_kind, sum(views) as pageviews
from public.mynw_pageviews_daily
where page_path='/welcome/'
group by day,page_lang,source_kind
order by day desc, pageviews desc;
```

## Privacy/scope

Strictly page-level counts; does not claim unique people or campaign conversions.
The web counter is independent from promotional opt-in in NowWhat and Firebase
push: it does not send push, alter consent, or read app accounts.

See `ops/website-traffic/schema.sql` (DB) and `index.ts` (Edge source).
