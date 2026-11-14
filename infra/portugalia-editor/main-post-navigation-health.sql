-- Portugal Ryadom: navigation-button delivery audit (production: 2026-11-14)
-- A Rich Message is first sent by prpublish; ptnav attaches the two main-channel
-- inline navigation buttons AFTER Telegram returns telegram_message_id.
-- Do not flag queued/scheduled messages as button failures. The legacy cutoff is
-- the first installation of ptnav; earlier messages are intentionally not audited.
CREATE OR REPLACE VIEW public.pr_main_navigation_health AS
SELECT p.id AS post_id, p.item_id, i.title_ru, p.status AS publication_status,
       p.scheduled_for, p.sent_at, p.telegram_message_id,
       n.status AS navigation_status, n.updated_at AS navigation_updated_at,
       n.attempts AS navigation_attempts, n.last_error AS navigation_error,
       CASE
         WHEN p.status IN ('queued','scheduled') THEN 'awaiting_publication'
         WHEN p.status='sending' THEN 'sending'
         WHEN p.status='sent' AND n.status='done' THEN 'confirmed'
         WHEN p.status='sent' AND p.sent_at<timestamptz '2026-11-14 14:49:13+00' THEN 'legacy_untracked'
         WHEN p.status='sent' AND p.sent_at>now()-interval '4 minutes' THEN 'awaiting_navigation'
         WHEN p.status='sent' AND n.status IS NULL THEN 'missing_navigation'
         WHEN p.status='sent' THEN 'navigation_failed'
         ELSE 'not_sent'
       END AS navigation_health
FROM public.pr_posts p
JOIN public.pr_items i ON i.id=p.item_id
LEFT JOIN public.pr_post_nav_sync n ON n.post_id=p.id
WHERE p.destination_code='main';

-- Regression check: must return zero rows for a healthy main channel.
SELECT post_id, item_id, title_ru, sent_at, navigation_health,
       navigation_status, navigation_attempts, navigation_error
FROM public.pr_main_navigation_health
WHERE navigation_health IN ('missing_navigation','navigation_failed')
ORDER BY sent_at DESC;

-- A pending post without Telegram message_id is NOT a failure:
-- post_id ea8c221d-45e3-4976-b8f7-9489ff26a8ec (100 EUR baby voucher).
-- Never resend messages to repair buttons; use existing ptnav reconciliation.
