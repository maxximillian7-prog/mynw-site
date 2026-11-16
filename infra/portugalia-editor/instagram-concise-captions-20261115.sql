-- Instagram concise editorial captions: retain substantive key facts and keep Buffer posts immutable.
-- Apply DDL + function + curated briefs to Neon production.


CREATE TABLE IF NOT EXISTS public.pr_instagram_briefs (
  item_id uuid PRIMARY KEY REFERENCES public.pr_items(id) ON DELETE CASCADE,
  brief_ru text NOT NULL CHECK (char_length(brief_ru) BETWEEN 80 AND 680),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.pr_prepare_instagram_caption(p_item_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE
AS $function$
DECLARE
 a record;
 headline text;
 summary_text text;
 paragraphs text[];
 p1 text;
 p2 text;
 p3 text;
 footer text;
 tags text;
 date_line text;
 place_line text;
 event_link text;
 room integer;
BEGIN
 SELECT i.id,i.primary_category,i.starts_at,i.location_city,i.canonical_url,
        d.headline_ru,d.lead_ru,d.story_ru,
        b.brief_ru,
        ev.event_id,ev.city,ev.venue,ev.starts_on,ev.ends_on
 INTO a
 FROM public.pr_items i
 JOIN public.pr_story_drafts d ON d.item_id=i.id
 LEFT JOIN public.pr_instagram_briefs b ON b.item_id=i.id
 LEFT JOIN public.pr_trailyo_event_details ev ON ev.item_id=i.id
 WHERE i.id=p_item_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 headline:=nullif(trim(coalesce(a.headline_ru,'')),'');
 tags:=nullif(trim(concat_ws(' ','#ПортугалияРядом',public.pr_topic_hashtags(p_item_id))),'');
 IF a.primary_category='events' THEN
   IF a.starts_on IS NOT NULL THEN
      date_line:='📅 '||to_char(a.starts_on,'DD.MM.YYYY');
      IF a.ends_on IS NOT NULL AND a.ends_on>a.starts_on THEN
        date_line:=date_line||' — '||to_char(a.ends_on,'DD.MM.YYYY');
      END IF;
   ELSIF a.starts_at IS NOT NULL THEN
      date_line:='📅 '||to_char(a.starts_at AT TIME ZONE 'Europe/Lisbon','DD.MM.YYYY');
   END IF;
   place_line:=nullif(trim(concat_ws(', ',nullif(trim(a.venue),''),nullif(trim(coalesce(a.city,a.location_city,'')),''))),'');
   IF place_line IS NOT NULL THEN place_line:='📍 '||place_line; END IF;
   IF a.event_id IS NOT NULL THEN
     event_link:='🔗 Событие в Trailyo: https://mynw.app/trailyo/event/?id='||a.event_id::text;
   ELSIF a.canonical_url LIKE 'https://mynw.app/trailyo/event/?id=%' THEN
     event_link:='🔗 Событие в Trailyo: '||a.canonical_url;
   END IF;
 END IF;
 footer:=concat_ws(E'\n\n',date_line,place_line,event_link,
   'Больше подробностей и источники — в Telegram: https://t.me/pt_ryadom',tags);
 summary_text:=nullif(trim(coalesce(a.brief_ru,'')),'');
 IF summary_text IS NULL THEN
   -- Use factual parts of the article, rather than promotional "why it matters".
   paragraphs:=string_to_array(coalesce(a.story_ru,''),E'\n\n');
   p1:=trim(regexp_replace(coalesce(paragraphs[1],''),E'\s+',' ','g'));
   p2:=trim(regexp_replace(coalesce(paragraphs[2],''),E'\s+',' ','g'));
   p3:=trim(regexp_replace(coalesce(paragraphs[3],''),E'\s+',' ','g'));
   summary_text:=nullif(trim(concat_ws(' ',
     nullif(left(p1,190),''),
     nullif(left(p2,235),''),
     nullif(left(p3,210),''))), '');
   IF summary_text IS NULL THEN summary_text:=nullif(trim(coalesce(a.lead_ru,'')),''); END IF;
 END IF;
 room:=greatest(0,980-char_length(coalesce(headline,''))-char_length(coalesce(footer,''))-6);
 IF char_length(coalesce(summary_text,''))>least(room,650) THEN
    summary_text:=left(summary_text,least(room,650));
    summary_text:=rtrim(regexp_replace(summary_text,'[[:space:]]+[^[:space:]]*$','','g'),E' ,;:');
    IF summary_text<>'' THEN summary_text:=summary_text||'…'; END IF;
 END IF;
 RETURN nullif(trim(concat_ws(E'\n\n',headline,nullif(summary_text,''),footer)),'');
END
$function$;

INSERT INTO public.pr_instagram_briefs(item_id,brief_ru) VALUES
('8565ee3b-0df6-4f85-82a8-8f09f2b750d7'::uuid,'16 ноября скидка 50% действует на Aquário Vasco da Gama и исторический фрегат D. Fernando II e Glória в Касильяше. А вот Museu de Marinha и Planetário de Marinha в этот день закрыты на обслуживание. Перед выездом проверьте часы работы выбранного объекта.'),
('2f9db40c-fd09-457f-aa28-e9568c62c489'::uuid,'В Португалии действует система VOLTA: за подходящие бутылки и банки при покупке берут депозит 10 центов, который можно вернуть. Ищите знак VOLTA, сдавайте пустую несмятую упаковку с читаемым штрихкодом. Не вся тара подходит — проверяйте маркировку.'),
('269bd0e5-758c-4dba-9453-47a051e4c257'::uuid,'Резиденты Португалии могут бесплатно посещать 37 государственных музеев и памятников 52 выбранных дня в году. Несколько посещений в один день считаются одним днём. Иностранным резидентам стоит взять документ личности, NIF и подтверждение проживания. Перед поездкой проверьте доступность конкретного музея.'),
('3f4bddfd-555d-4359-b81b-779f11f7b053'::uuid,'Курсы Português Língua de Acolhimento (PLA) доступны с 16 лет и в большинстве случаев бесплатны. Сертификат A2 помогает подтвердить знание языка для ряда миграционных процедур. Ищите набор через IEFP, государственные школы или Centros Qualifica: заявители с временной защитой тоже могут соответствовать условиям.'),
('594003b0-813f-47f8-a01a-2ad91a15e863'::uuid,'IEFP помогает искать вакансии, стажировки и профессиональное обучение. В iefponline недостаточно просто создать аккаунт: заполните профиль, резюме и отдельно отправьте Inscrição para emprego. Для иностранных граждан важно подтверждение права работать. Регистрация не означает автоматического назначения пособия.'),
('af4d3b38-ac2e-4286-afd0-5cb2056d165c'::uuid,'Гигантские волны у Praia do Norte возникают благодаря подводному каньону Назаре — около 200 км длиной и до 5000 м глубиной. Но они появляются не каждый день: нужна подходящая океанская зыбь. Смотреть лучше из открытых смотровых точек у Sítio и форта São Miguel Arcanjo; купание на Praia do Norte опасно.'),
('7f61ce71-9c14-43ca-909d-8e3c7d212341'::uuid,'В сезоне 2026–2027 бесплатную прививку от гриппа в Португалии распространили на здоровых детей 2–4 лет. Среди других групп — люди от 60 лет, беременные и отдельные группы риска по правилам DGS. Право и место вакцинации уточняйте в centro de saúde или участвующей аптеке по действующей Norma 006/2026.'),
('1087164e-d1b6-4881-a00b-fb8d07c4f2f8'::uuid,'Если магазин или сервис игнорирует претензию, подайте официальную жалобу на www.livroreclamacoes.pt. Электронная Livro de Reclamações имеет ту же юридическую силу, что бумажная. Приложите чек и описание проблемы: компания обязана ответить в течение 15 рабочих дней. Сохраните номер обращения.')
ON CONFLICT(item_id) DO UPDATE SET brief_ru=EXCLUDED.brief_ru,updated_at=now();
-- Refresh ONLY unsent Instagram rows after approval (no Buffer ID, no active queue).
UPDATE public.pr_instagram_publications p SET caption=public.pr_prepare_instagram_caption(p.item_id),updated_at=now()
WHERE p.buffer_post_id IS NULL AND p.status IN ('draft','awaiting_approval','awaiting_media','failed');
