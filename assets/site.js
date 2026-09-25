(() => {
  const SUPPORTED = ['en','pt','ru','fr','es','uk','de','it'];
  const LANGUAGE_LABELS = {en:'English',pt:'Português',ru:'Русский',fr:'Français',es:'Español',uk:'Українська',de:'Deutsch',it:'Italiano'};
  const FEEDBACK_ENDPOINT = 'https://utauewtqtmqgmguxtmvn.supabase.co/functions/v1/website-feedback';
  const PUBLIC_KEY = 'sb_publishable_8_Cy9BSMphZDoRYe3ejifQ_iYqmF2Fy';

  const S = {
    en: {
      nav_features:'Features', nav_manual:'Manual', nav_legal:'Legal', nav_docs:'Documents & AI', nav_vault:'Important Documents', nav_saved:'Saved & voice', nav_finance:'Finance', nav_calendar:'Calendar & reminders', nav_briefing:'Daily Briefing & Auto Rules', nav_privacy:'Privacy', nav_terms:'Terms', nav_support:'Support', nav_delete:'Delete account', nav_get:'Get NowWhat',
      home_title:'NowWhat — AI assistant for documents, tasks and finances',
      eyebrow:'Your everyday AI assistant', hero_h1:'Everything important — under control.',
      hero_lead:'NowWhat understands documents and everyday information, helps you act on it, and keeps the result organised in one place.',
      cta_features:'Explore features', cta_support:'Contact support', proof_android:'Android first', proof_adult:'18+', proof_lang:'8 languages', proof_privacy:'Privacy controls',
      preview_doc:'Document understood', preview_summary:'School meeting Thursday at 18:30. Bring the signed form.', preview_calendar:'Calendar', preview_reminder:'Reminder', preview_ask:'Ask AI',
      preview_finance:'Finance', preview_spent:'Spent', preview_income:'Income', preview_balance:'Balance',
      section_features_kicker:'Core features', section_features_title:'From information to action — without the routine.', section_features_lead:'Documents, notes, money, dates and tasks work together instead of living in separate apps.', advantages_kicker:'Why NowWhat', advantages_title:'Less routine. More clarity.', adv1_t:'From document to action', adv1_b:'Recognise the content, understand what matters and immediately create the next useful action.', adv2_t:'Your data becomes searchable', adv2_b:'Ask AI about a document, a month of spending or saved information instead of searching manually.', adv3_t:'Important things stay organised', adv3_b:'Folders, protected documents, reminders and Daily Briefing keep deadlines and tasks visible.', adv4_t:'Control stays with you', adv4_b:'Protected local document storage, explicit AI actions, clear data controls and account deletion.', manual_cta_t:'Need the details?', manual_cta_b:'Open the full NowWhat guide with step-by-step instructions for every major feature.', manual_cta_btn:'Open manual', screens_kicker:'App preview', screens_title:'See NowWhat in action.', screens_lead:'Real interface examples from the app.',
      f1_title:'Document AI', f1_body:'Recognise photos, screenshots, PDFs, text and shared files. Get a summary, key facts and suggested actions.',
      f2_title:'Ask about a document', f2_body:'Ask follow-up questions about the current document instead of searching through pages manually.',
      f3_title:'Important Documents', f3_body:'Keep sensitive documents in a protected local vault with PIN/biometrics, expiry dates, reminders and secure sharing.',
      f4_title:'Finance Hub', f4_body:'Track expenses and income, scan mixed receipts, categorise individual items, monitor budgets, bills and subscriptions.',
      f5_title:'Voice notes', f5_body:'Record a voice note, transcribe it and continue the same note without losing previous content.',
      f6_title:'Saved & folders', f6_body:'Organise notes and recognised documents with folders, styles, colours, icons, search, favourites and Trash.',
      f7_title:'Calendar & reminders', f7_body:'Create calendar events and reminders directly from recognised dates, deadlines and tasks.',
      f8_title:'Daily Briefing & Auto Rules', f8_body:'See today’s tasks and events, and let configurable rules suggest filing, reminders, calendar actions and reply drafts.',
      finance_kicker:'Finance Hub', finance_title:'Ask your own financial data questions.', finance_lead:'Finance is built around real receipts and everyday transactions, not just a manual expense list.',
      finance_p1_t:'Mixed receipts', finance_p1_b:'Each receipt line can have its own category, so groceries, pharmacy and household items do not collapse into one bucket.',
      finance_p2_t:'Income + expenses', finance_p2_b:'Track both sides of cash flow and see spending, income and balance for the month.',
      finance_p3_t:'Bills, subscriptions & budgets', finance_p3_b:'Keep recurring charges, due dates and monthly budget progress together.',
      finance_p4_t:'AI questions by text or voice', finance_p4_b:'Ask “How much did I spend on medicines?” or “What was my biggest category?” and get answers from your saved finance data.',
      finance_p5_t:'Monthly archive', finance_p5_b:'Open a month, review all entries and categories, then ask AI questions scoped only to that month.',
      vault_kicker:'Important Documents', vault_title:'A protected place for the documents you cannot afford to lose track of.', vault_b1:'Local encrypted vault', vault_b2:'PIN / biometrics', vault_b3:'AI recognition and saved analysis', vault_b4:'Expiry dates and reminders', vault_b5:'Share the actual protected file when you choose',
      flow_kicker:'How information gets in', flow_title:'Use whatever is fastest at the moment.', flow1:'Camera', flow2:'Gallery', flow3:'PDF / files', flow4:'Android Share', flow5:'Voice',
      privacy_kicker:'Privacy by design', privacy_title:'You decide what gets processed.', privacy_body:'NowWhat processes only the content needed for the feature you choose. Important AI output should always be checked against the original source.',
      privacy_badge1:'No ad trackers on mynw.app', privacy_badge2:'HTTPS', privacy_badge3:'Clear account deletion path', privacy_badge4:'Optional account',
      faq_kicker:'FAQ', faq_title:'Quick answers',
      faq1_q:'Do I need an account?', faq1_a:'No. Guest mode works without a linked identity. Email or Google can be linked later for account recovery and cloud synchronisation of supported saved data.',
      faq2_q:'Does NowWhat replace professional advice?', faq2_a:'No. AI can be incomplete or wrong. Verify consequential details and use qualified professional advice where appropriate.',
      faq3_q:'Can I delete my account?', faq3_a:'Yes. You can delete it inside the app or start an external deletion request from this website.',
      faq4_q:'Which languages are supported?', faq4_a:'The current interface supports English, Portuguese, Russian, French, Spanish, Ukrainian, German and Italian.',
      launch_kicker:'Android · Version 1.0', launch_title:'Preparing for Google Play.', launch_body:'The production Play Store link will appear here when the listing is live.', launch_store:'Google Play · Coming soon',
      footer_text:'© 2026 NowWhat App.',
      support_title:'Support — NowWhat', support_h1:'How can we help?', support_intro:'Send a message directly from this page. It is stored in the private NowWhat support inbox and forwarded to support@mynw.app.',
      support_form_title:'Send a message', support_name:'Name', support_email:'Email for reply', support_topic:'Topic', support_message:'Message', support_send:'Send message',
      support_topic_support:'General support', support_topic_bug:'Report a problem', support_topic_feature:'Feature request', support_topic_privacy:'Privacy / data', support_topic_other:'Other',
      support_privacy_note:'Do not send passwords, API keys or banking credentials. By sending this form you allow us to process the message and reply email for support purposes.',
      support_direct:'Prefer email?', support_direct_b:'You can also write to support@mynw.app.', support_ai_t:'AI result looks wrong', support_ai_b:'Compare the result with the original. Important dates, amounts, payment details and consequential information should always be verified.',
      support_reminder_t:'A reminder did not appear', support_reminder_b:'Check Android notification permission and battery/background restrictions for NowWhat.',
      support_signin_t:'Cannot sign in', support_signin_b:'Use the same sign-in method and account you originally used. If the issue continues, send us a message.',
      support_delete_t:'Delete your account', support_delete_b:'Use the in-app Privacy & account section or the external account deletion page.',
      form_sending:'Sending…', form_success:'Message sent. Thank you — we received it.', form_queued:'Message received and stored. Email delivery is being retried.', form_error:'Could not send the message. Please try again.', form_rate:'Too many messages were sent from this device. Please try again later.',
      delete_title:'Delete your NowWhat account', delete_h1:'Delete your account and associated data', delete_intro:'You can delete your account inside the app. If you no longer have access to the app, use the external process below.',
      delete_how:'How to request deletion', delete_s1:'Email support@mynw.app from the email associated with your account.', delete_s2:'Use the subject “Delete my NowWhat account”.', delete_s3:'Include the email address used for your NowWhat account.', delete_s4:'We may ask you to verify ownership before deletion.',
      delete_button:'Request account deletion', delete_what:'What is deleted', delete_what_b:'After a valid request is completed, the NowWhat account and associated server-side user data are deleted, except information that must be retained for legitimate legal, security, fraud-prevention or dispute-resolution reasons.',
      delete_local:'Data stored on your device', delete_local_b:'Some notes, protected files or settings may exist locally on the device. Uninstalling the app or clearing its storage may be necessary to remove device-local copies.',
      delete_sub:'Subscriptions', delete_sub_b:'If NowWhat offers a paid Google Play subscription, deleting the NowWhat account may not automatically cancel that Play subscription. Cancel it in Google Play as well.',
      legal_updated:'Last updated: September 25, 2026', notfound_title:'Page not found — NowWhat', notfound_h1:'Page not found', notfound_body:'The page you requested does not exist.', notfound_button:'Go to homepage'
    },
    pt: {
      nav_features:'Funcionalidades', nav_manual:'Guia', nav_legal:'Informação legal', nav_docs:'Documentos e IA', nav_vault:'Documentos importantes', nav_saved:'Guardado e voz', nav_finance:'Finanças', nav_calendar:'Calendário e lembretes', nav_briefing:'Daily Briefing e Regras automáticas', nav_privacy:'Privacidade', nav_terms:'Termos', nav_support:'Suporte', nav_delete:'Eliminar conta', nav_get:'Obter NowWhat',
      home_title:'NowWhat — assistente de IA para documentos, tarefas e finanças',
      eyebrow:'O seu assistente de IA do dia a dia', hero_h1:'Tudo o que importa — sob controlo.',
      hero_lead:'O NowWhat compreende documentos e informação do dia a dia, ajuda a agir e mantém o resultado organizado num só lugar.',
      cta_features:'Ver funcionalidades', cta_support:'Contactar suporte', proof_android:'Android primeiro', proof_adult:'18+', proof_lang:'8 idiomas', proof_privacy:'Controlos de privacidade',
      preview_doc:'Documento compreendido', preview_summary:'Reunião da escola quinta-feira às 18:30. Levar o formulário assinado.', preview_calendar:'Calendário', preview_reminder:'Lembrete', preview_ask:'Perguntar à IA',
      preview_finance:'Finanças', preview_spent:'Despesas', preview_income:'Rendimento', preview_balance:'Saldo',
      section_features_kicker:'Funcionalidades principais', section_features_title:'Da informação à ação — sem rotina desnecessária.', section_features_lead:'Documentos, notas, dinheiro, datas e tarefas funcionam em conjunto em vez de ficarem espalhados por várias aplicações.', advantages_kicker:'Porquê NowWhat', advantages_title:'Menos rotina. Mais clareza.', adv1_t:'Do documento à ação', adv1_b:'Reconheça o conteúdo, perceba o essencial e crie imediatamente a próxima ação útil.', adv2_t:'Os seus dados tornam-se pesquisáveis', adv2_b:'Pergunte à IA sobre um documento, um mês de despesas ou informação guardada em vez de procurar manualmente.', adv3_t:'O importante fica organizado', adv3_b:'Pastas, documentos protegidos, lembretes e Daily Briefing mantêm prazos e tarefas visíveis.', adv4_t:'O controlo continua consigo', adv4_b:'Armazenamento local protegido, ações de IA explícitas, controlos claros de dados e eliminação da conta.', manual_cta_t:'Quer todos os detalhes?', manual_cta_b:'Abra o guia completo do NowWhat com instruções passo a passo para as principais funções.', manual_cta_btn:'Abrir guia', screens_kicker:'Pré-visualização da app', screens_title:'Veja o NowWhat em ação.', screens_lead:'Exemplos reais da interface da aplicação.',
      f1_title:'IA para documentos', f1_body:'Reconhece fotografias, capturas, PDF, texto e ficheiros partilhados. Mostra resumo, dados-chave e ações sugeridas.',
      f2_title:'Perguntar sobre o documento', f2_body:'Faça perguntas sobre o documento atual em vez de procurar manualmente por várias páginas.',
      f3_title:'Documentos importantes', f3_body:'Guarde documentos sensíveis num arquivo local protegido com PIN/biometria, validades, lembretes e partilha segura.',
      f4_title:'Finanças', f4_body:'Registe despesas e rendimentos, leia talões mistos, classifique cada item e acompanhe orçamentos, faturas e subscrições.',
      f5_title:'Notas de voz', f5_body:'Grave uma nota de voz, transcreva-a e continue a mesma nota sem perder o conteúdo anterior.',
      f6_title:'Guardado e pastas', f6_body:'Organize notas e documentos reconhecidos com pastas, estilos, cores, ícones, pesquisa, favoritos e lixo.',
      f7_title:'Calendário e lembretes', f7_body:'Crie eventos e lembretes diretamente a partir de datas, prazos e tarefas reconhecidas.',
      f8_title:'Daily Briefing e Regras automáticas', f8_body:'Veja as tarefas e eventos de hoje e deixe regras configuráveis sugerirem organização, lembretes, calendário e rascunhos de resposta.',
      finance_kicker:'Finanças', finance_title:'Faça perguntas aos seus próprios dados financeiros.', finance_lead:'As Finanças foram pensadas para talões e movimentos reais do dia a dia, não apenas para uma lista manual de despesas.',
      finance_p1_t:'Talões mistos', finance_p1_b:'Cada linha do talão pode ter uma categoria própria, para separar supermercado, farmácia e casa.',
      finance_p2_t:'Rendimentos + despesas', finance_p2_b:'Registe os dois lados do fluxo de caixa e veja despesas, rendimento e saldo do mês.',
      finance_p3_t:'Faturas, subscrições e orçamento', finance_p3_b:'Mantenha cobranças recorrentes, prazos e progresso do orçamento mensal no mesmo lugar.',
      finance_p4_t:'Perguntas à IA por texto ou voz', finance_p4_b:'Pergunte “Quanto gastei em medicamentos?” ou “Qual foi a maior categoria?” e receba respostas com base nos seus dados guardados.',
      finance_p5_t:'Arquivo mensal', finance_p5_b:'Abra um mês, reveja todos os movimentos e categorias e faça perguntas à IA limitadas apenas a esse mês.',
      vault_kicker:'Documentos importantes', vault_title:'Um local protegido para documentos que não pode perder de vista.', vault_b1:'Arquivo local encriptado', vault_b2:'PIN / biometria', vault_b3:'Reconhecimento por IA e análise guardada', vault_b4:'Validades e lembretes', vault_b5:'Partilha do ficheiro protegido quando decidir',
      flow_kicker:'Como entra a informação', flow_title:'Use o método mais rápido no momento.', flow1:'Câmara', flow2:'Galeria', flow3:'PDF / ficheiros', flow4:'Partilhar no Android', flow5:'Voz',
      privacy_kicker:'Privacidade desde o início', privacy_title:'O utilizador decide o que é processado.', privacy_body:'O NowWhat processa apenas o conteúdo necessário para a funcionalidade escolhida. Resultados importantes de IA devem ser sempre confirmados no original.',
      privacy_badge1:'Sem trackers publicitários em mynw.app', privacy_badge2:'HTTPS', privacy_badge3:'Eliminação de conta clara', privacy_badge4:'Conta opcional',
      faq_kicker:'FAQ', faq_title:'Respostas rápidas',
      faq1_q:'Preciso de uma conta?', faq1_a:'Não. O modo convidado funciona sem identidade associada. Pode ligar e-mail ou Google mais tarde para recuperação da conta e sincronização cloud dos dados compatíveis.',
      faq2_q:'O NowWhat substitui aconselhamento profissional?', faq2_a:'Não. A IA pode estar incompleta ou errada. Confirme informação importante e procure um profissional qualificado quando necessário.',
      faq3_q:'Posso eliminar a conta?', faq3_a:'Sim. Pode eliminá-la na aplicação ou iniciar um pedido externo neste site.',
      faq4_q:'Que idiomas são suportados?', faq4_a:'A interface atual suporta inglês, português, russo, francês, espanhol, ucraniano, alemão e italiano.',
      launch_kicker:'Android · Versão 1.0', launch_title:'A preparar o Google Play.', launch_body:'O link oficial da Play Store aparecerá aqui quando a publicação estiver ativa.', launch_store:'Google Play · Em breve',
      footer_text:'© 2026 NowWhat App.',
      support_title:'Suporte — NowWhat', support_h1:'Como podemos ajudar?', support_intro:'Envie uma mensagem diretamente nesta página. Fica guardada na caixa privada do NowWhat e é encaminhada para support@mynw.app.',
      support_form_title:'Enviar mensagem', support_name:'Nome', support_email:'E-mail para resposta', support_topic:'Assunto', support_message:'Mensagem', support_send:'Enviar mensagem',
      support_topic_support:'Suporte geral', support_topic_bug:'Reportar problema', support_topic_feature:'Sugestão de funcionalidade', support_topic_privacy:'Privacidade / dados', support_topic_other:'Outro',
      support_privacy_note:'Não envie palavras-passe, chaves API ou credenciais bancárias. Ao enviar o formulário autoriza o tratamento da mensagem e do e-mail para fins de suporte.',
      support_direct:'Prefere e-mail?', support_direct_b:'Também pode escrever para support@mynw.app.', support_ai_t:'O resultado da IA parece errado', support_ai_b:'Compare o resultado com o original. Datas, valores, dados de pagamento e informação relevante devem ser sempre confirmados.',
      support_reminder_t:'Um lembrete não apareceu', support_reminder_b:'Verifique a permissão de notificações Android e restrições de bateria/segundo plano para o NowWhat.',
      support_signin_t:'Não consigo iniciar sessão', support_signin_b:'Use o mesmo método e conta utilizados originalmente. Se continuar, envie-nos uma mensagem.',
      support_delete_t:'Eliminar a conta', support_delete_b:'Use Privacidade e conta na aplicação ou a página externa de eliminação.',
      form_sending:'A enviar…', form_success:'Mensagem enviada. Obrigado — recebemo-la.', form_queued:'Mensagem recebida e guardada. A entrega por e-mail será repetida.', form_error:'Não foi possível enviar. Tente novamente.', form_rate:'Foram enviadas demasiadas mensagens deste dispositivo. Tente mais tarde.',
      delete_title:'Eliminar a conta NowWhat', delete_h1:'Eliminar a conta e os dados associados', delete_intro:'Pode eliminar a conta dentro da aplicação. Se já não tiver acesso, utilize o processo externo abaixo.',
      delete_how:'Como pedir a eliminação', delete_s1:'Envie e-mail para support@mynw.app a partir do endereço associado à conta.', delete_s2:'Use o assunto “Delete my NowWhat account”.', delete_s3:'Inclua o e-mail utilizado na conta NowWhat.', delete_s4:'Podemos pedir verificação de titularidade antes da eliminação.',
      delete_button:'Pedir eliminação da conta', delete_what:'O que é eliminado', delete_what_b:'Após validação, a conta NowWhat e os dados de servidor associados são eliminados, exceto informação que tenha de ser conservada por motivos legais, de segurança, prevenção de fraude ou litígio.',
      delete_local:'Dados guardados no dispositivo', delete_local_b:'Algumas notas, ficheiros protegidos ou definições podem existir localmente. Pode ser necessário desinstalar a aplicação ou limpar o armazenamento para remover cópias locais.',
      delete_sub:'Subscrições', delete_sub_b:'Se existir uma subscrição Google Play paga, eliminar a conta NowWhat pode não cancelar automaticamente essa subscrição. Cancele-a também no Google Play.',
      legal_updated:'Última atualização: 25 de setembro de 2026', notfound_title:'Página não encontrada — NowWhat', notfound_h1:'Página não encontrada', notfound_body:'A página pedida não existe.', notfound_button:'Ir para a página inicial'
    },
    ru: {
      nav_features:'Возможности', nav_manual:'Руководство', nav_legal:'Правовая информация', nav_docs:'Документы и AI', nav_vault:'Важные документы', nav_saved:'Сохранённое и голос', nav_finance:'Финансы', nav_calendar:'Календарь и напоминания', nav_briefing:'Daily Briefing и Автоправила', nav_privacy:'Конфиденциальность', nav_terms:'Условия', nav_support:'Поддержка', nav_delete:'Удалить аккаунт', nav_get:'Получить NowWhat',
      home_title:'NowWhat — AI-помощник для документов, дел и финансов',
      eyebrow:'Ваш повседневный AI-помощник', hero_h1:'Всё важное — под контролем.',
      hero_lead:'NowWhat понимает документы и повседневную информацию, помогает сразу действовать и сохраняет результат в понятном порядке.',
      cta_features:'Посмотреть возможности', cta_support:'Связаться с поддержкой', proof_android:'Сначала Android', proof_adult:'18+', proof_lang:'8 языков', proof_privacy:'Контроль конфиденциальности',
      preview_doc:'Документ понят', preview_summary:'Родительское собрание в четверг в 18:30. Принести подписанную форму.', preview_calendar:'Календарь', preview_reminder:'Напоминание', preview_ask:'Спросить AI',
      preview_finance:'Финансы', preview_spent:'Расходы', preview_income:'Доход', preview_balance:'Баланс',
      section_features_kicker:'Основные возможности', section_features_title:'От информации к действию — без лишней рутины.', section_features_lead:'Документы, заметки, деньги, даты и задачи работают вместе, а не разбросаны по разным приложениям.', advantages_kicker:'Почему NowWhat', advantages_title:'Меньше рутины. Больше ясности.', adv1_t:'От документа к действию', adv1_b:'Распознайте содержимое, поймите главное и сразу создайте нужное действие.', adv2_t:'Ваши данные становятся доступными для вопросов', adv2_b:'Спросите AI о документе, расходах за месяц или сохранённой информации вместо ручного поиска.', adv3_t:'Важное остаётся организованным', adv3_b:'Папки, защищённые документы, напоминания и Daily Briefing помогают не упускать сроки и задачи.', adv4_t:'Контроль остаётся у вас', adv4_b:'Защищённое локальное хранение документов, явные AI-действия, очистка данных и удаление аккаунта.', manual_cta_t:'Нужны подробности?', manual_cta_b:'Откройте полное руководство NowWhat с пошаговым описанием основных функций.', manual_cta_btn:'Открыть руководство', screens_kicker:'Интерфейс приложения', screens_title:'Посмотрите NowWhat в работе.', screens_lead:'Реальные примеры экранов приложения.',
      f1_title:'AI для документов', f1_body:'Распознаёт фото, скриншоты, PDF, текст и файлы из меню «Поделиться». Показывает краткое содержание, ключевые данные и действия.',
      f2_title:'Вопросы по документу', f2_body:'Задавайте уточняющие вопросы по текущему документу вместо ручного поиска по страницам.',
      f3_title:'Важные документы', f3_body:'Храните чувствительные документы в защищённом локальном архиве с PIN/биометрией, сроками, напоминаниями и безопасной отправкой.',
      f4_title:'Финансы', f4_body:'Учитывайте расходы и доходы, разбирайте смешанные чеки по позициям, следите за бюджетом, счетами и подписками.',
      f5_title:'Голосовые заметки', f5_body:'Записывайте голос, получайте расшифровку и дополняйте ту же заметку без потери предыдущего текста.',
      f6_title:'Сохранённое и папки', f6_body:'Организуйте заметки и распознанные документы: папки, стили, цвета, иконки, поиск, избранное и корзина.',
      f7_title:'Календарь и напоминания', f7_body:'Создавайте события и напоминания прямо из найденных дат, сроков и задач.',
      f8_title:'Daily Briefing и Автоправила', f8_body:'Смотрите задачи и события на сегодня, а правила могут предлагать сортировку, напоминания, календарь и черновики ответов.',
      finance_kicker:'Финансы', finance_title:'Задавайте вопросы своим финансовым данным.', finance_lead:'Раздел Финансы построен вокруг реальных чеков и повседневных операций, а не только ручного списка расходов.',
      finance_p1_t:'Смешанные чеки', finance_p1_b:'Каждая позиция чека получает свою категорию — продукты, аптека и товары для дома не смешиваются.',
      finance_p2_t:'Доходы + расходы', finance_p2_b:'Учитывайте обе стороны денежного потока и смотрите расходы, доход и баланс за месяц.',
      finance_p3_t:'Счета, подписки и бюджет', finance_p3_b:'Регулярные списания, сроки оплаты и прогресс месячного бюджета находятся вместе.',
      finance_p4_t:'AI-вопросы текстом или голосом', finance_p4_b:'Спросите «Сколько я потратил на лекарства?» или «Какая категория была самой большой?» — ответ строится по сохранённым данным.',
      finance_p5_t:'Архив по месяцам', finance_p5_b:'Откройте конкретный месяц, просмотрите операции и категории и задайте AI вопрос только по данным этого месяца.',
      vault_kicker:'Важные документы', vault_title:'Защищённое место для документов, которые нельзя упустить.', vault_b1:'Локальный зашифрованный архив', vault_b2:'PIN / биометрия', vault_b3:'AI-распознавание и сохранённый анализ', vault_b4:'Сроки действия и напоминания', vault_b5:'Отправка реального защищённого файла по вашему выбору',
      flow_kicker:'Как добавить информацию', flow_title:'Используйте то, что быстрее прямо сейчас.', flow1:'Камера', flow2:'Галерея', flow3:'PDF / файлы', flow4:'Android «Поделиться»', flow5:'Голос',
      privacy_kicker:'Конфиденциальность по умолчанию', privacy_title:'Вы сами решаете, что отправлять на обработку.', privacy_body:'NowWhat обрабатывает только контент, необходимый для выбранной функции. Важные результаты AI всегда нужно сверять с оригиналом.',
      privacy_badge1:'Без рекламных трекеров на mynw.app', privacy_badge2:'HTTPS', privacy_badge3:'Понятное удаление аккаунта', privacy_badge4:'Аккаунт необязателен',
      faq_kicker:'FAQ', faq_title:'Коротко о главном',
      faq1_q:'Нужен ли аккаунт?', faq1_a:'Нет. Можно пользоваться гостевым режимом. E-mail или Google можно привязать позже для восстановления аккаунта и облачной синхронизации поддерживаемых данных.',
      faq2_q:'NowWhat заменяет специалиста?', faq2_a:'Нет. AI может ошибаться или давать неполный ответ. Проверяйте значимые данные и при необходимости обращайтесь к профильному специалисту.',
      faq3_q:'Можно удалить аккаунт?', faq3_a:'Да. Аккаунт удаляется в приложении либо через внешний запрос на этом сайте.',
      faq4_q:'Какие языки поддерживаются?', faq4_a:'Сейчас интерфейс поддерживает английский, португальский, русский, французский, испанский, украинский, немецкий и итальянский.',
      launch_kicker:'Android · Версия 1.0', launch_title:'Готовимся к Google Play.', launch_body:'Официальная ссылка на Play Store появится здесь после публикации.', launch_store:'Google Play · Скоро',
      footer_text:'© 2026 NowWhat App.',
      support_title:'Поддержка — NowWhat', support_h1:'Чем можем помочь?', support_intro:'Отправьте сообщение прямо с этой страницы. Оно сохраняется в приватном ящике NowWhat и автоматически пересылается на support@mynw.app.',
      support_form_title:'Отправить сообщение', support_name:'Имя', support_email:'E-mail для ответа', support_topic:'Тема', support_message:'Сообщение', support_send:'Отправить',
      support_topic_support:'Общий вопрос', support_topic_bug:'Сообщить о проблеме', support_topic_feature:'Предложить функцию', support_topic_privacy:'Конфиденциальность / данные', support_topic_other:'Другое',
      support_privacy_note:'Не отправляйте пароли, API-ключи или банковские данные. Отправляя форму, вы разрешаете обработать сообщение и e-mail для ответа службы поддержки.',
      support_direct:'Предпочитаете e-mail?', support_direct_b:'Можно также написать на support@mynw.app.', support_ai_t:'AI разобрал документ неправильно', support_ai_b:'Сверьте результат с оригиналом. Важные даты, суммы, реквизиты и другие значимые данные всегда проверяйте.',
      support_reminder_t:'Не появилось напоминание', support_reminder_b:'Проверьте разрешение Android на уведомления и ограничения батареи/фоновой работы для NowWhat.',
      support_signin_t:'Не получается войти', support_signin_b:'Используйте тот же способ входа и аккаунт, что и раньше. Если проблема остаётся — отправьте сообщение.',
      support_delete_t:'Удаление аккаунта', support_delete_b:'Используйте раздел «Конфиденциальность и аккаунт» в приложении или внешнюю страницу удаления.',
      form_sending:'Отправляем…', form_success:'Сообщение отправлено. Спасибо — мы его получили.', form_queued:'Сообщение получено и сохранено. Доставка по e-mail будет повторена.', form_error:'Не удалось отправить сообщение. Попробуйте ещё раз.', form_rate:'С этого устройства отправлено слишком много сообщений. Попробуйте позже.',
      delete_title:'Удаление аккаунта NowWhat', delete_h1:'Удалить аккаунт и связанные данные', delete_intro:'Аккаунт можно удалить прямо в приложении. Если доступа к приложению уже нет, используйте внешний процесс ниже.',
      delete_how:'Как запросить удаление', delete_s1:'Напишите на support@mynw.app с e-mail, который привязан к аккаунту.', delete_s2:'Укажите тему “Delete my NowWhat account”.', delete_s3:'Укажите e-mail вашего аккаунта NowWhat.', delete_s4:'Перед удалением мы можем попросить подтвердить владение аккаунтом.',
      delete_button:'Запросить удаление аккаунта', delete_what:'Что будет удалено', delete_what_b:'После подтверждённого запроса аккаунт NowWhat и связанные серверные данные удаляются, кроме информации, которую необходимо хранить по законным причинам безопасности, предотвращения мошенничества или разрешения споров.',
      delete_local:'Данные на устройстве', delete_local_b:'Некоторые заметки, защищённые файлы или настройки могут храниться локально. Для удаления локальных копий может понадобиться очистить данные приложения или удалить его.',
      delete_sub:'Подписки', delete_sub_b:'Если появится платная подписка Google Play, удаление аккаунта NowWhat может не отменить её автоматически. Подписку нужно будет отменить и в Google Play.',
      legal_updated:'Последнее обновление: 25 сентября 2026 г.', notfound_title:'Страница не найдена — NowWhat', notfound_h1:'Страница не найдена', notfound_body:'Запрошенной страницы не существует.', notfound_button:'На главную'
    },
    fr: {
      nav_features:'Fonctionnalités', nav_manual:'Guide', nav_legal:'Informations légales', nav_docs:'Documents et IA', nav_vault:'Documents importants', nav_saved:'Enregistré et voix', nav_finance:'Finances', nav_calendar:'Calendrier et rappels', nav_briefing:'Daily Briefing et règles automatiques', nav_privacy:'Confidentialité', nav_terms:'Conditions', nav_support:'Assistance', nav_delete:'Supprimer le compte', nav_get:'Obtenir NowWhat',
      home_title:'NowWhat — assistant IA pour documents, tâches et finances',
      eyebrow:'Votre assistant IA du quotidien', hero_h1:'Tout ce qui compte — sous contrôle.',
      hero_lead:'NowWhat comprend vos documents et informations du quotidien, vous aide à agir et garde le résultat organisé au même endroit.',
      cta_features:'Voir les fonctionnalités', cta_support:'Contacter l’assistance', proof_android:'Android d’abord', proof_adult:'18+', proof_lang:'8 langues', proof_privacy:'Contrôles de confidentialité',
      preview_doc:'Document compris', preview_summary:'Réunion scolaire jeudi à 18 h 30. Apporter le formulaire signé.', preview_calendar:'Calendrier', preview_reminder:'Rappel', preview_ask:'Demander à l’IA',
      preview_finance:'Finances', preview_spent:'Dépenses', preview_income:'Revenus', preview_balance:'Solde',
      section_features_kicker:'Fonctions principales', section_features_title:'De l’information à l’action — sans routine inutile.', section_features_lead:'Documents, notes, argent, dates et tâches fonctionnent ensemble au lieu d’être dispersés entre plusieurs apps.', advantages_kicker:'Pourquoi NowWhat', advantages_title:'Moins de routine. Plus de clarté.', adv1_t:'Du document à l’action', adv1_b:'Reconnaissez le contenu, comprenez l’essentiel et créez immédiatement l’action utile.', adv2_t:'Vos données deviennent interrogeables', adv2_b:'Interrogez l’IA sur un document, un mois de dépenses ou des informations enregistrées au lieu de chercher manuellement.', adv3_t:'L’essentiel reste organisé', adv3_b:'Dossiers, documents protégés, rappels et Daily Briefing gardent tâches et échéances visibles.', adv4_t:'Vous gardez le contrôle', adv4_b:'Stockage local protégé, actions IA explicites, contrôle des données et suppression du compte.', manual_cta_t:'Besoin de détails ?', manual_cta_b:'Ouvrez le guide complet NowWhat avec des instructions étape par étape pour les principales fonctions.', manual_cta_btn:'Ouvrir le guide', screens_kicker:'Aperçu de l’application', screens_title:'Découvrez NowWhat en action.', screens_lead:'Exemples réels de l’interface de l’application.',
      f1_title:'IA documentaire', f1_body:'Reconnaît photos, captures, PDF, texte et fichiers partagés. Résumé, données clés et actions suggérées.',
      f2_title:'Questions sur un document', f2_body:'Posez des questions ciblées sur le document au lieu de parcourir les pages manuellement.',
      f3_title:'Documents importants', f3_body:'Conservez les documents sensibles dans un coffre local protégé par PIN/biométrie, avec échéances, rappels et partage sécurisé.',
      f4_title:'Finances', f4_body:'Suivez dépenses et revenus, analysez les tickets mixtes par article et gérez budgets, factures et abonnements.',
      f5_title:'Notes vocales', f5_body:'Enregistrez, transcrivez puis complétez la même note sans perdre le contenu précédent.',
      f6_title:'Enregistré et dossiers', f6_body:'Classez notes et documents avec dossiers, styles, couleurs, icônes, recherche, favoris et corbeille.',
      f7_title:'Calendrier et rappels', f7_body:'Créez événements et rappels directement à partir des dates, échéances et tâches détectées.',
      f8_title:'Daily Briefing et règles automatiques', f8_body:'Voyez les tâches du jour et laissez des règles configurables suggérer classement, rappels, calendrier et brouillons de réponse.',
      finance_kicker:'Finances', finance_title:'Interrogez vos propres données financières.', finance_lead:'Les Finances sont conçues autour de vrais tickets et mouvements quotidiens.',
      finance_p1_t:'Tickets mixtes', finance_p1_b:'Chaque ligne peut avoir sa propre catégorie pour séparer courses, pharmacie et maison.',
      finance_p2_t:'Revenus + dépenses', finance_p2_b:'Suivez les deux côtés du flux de trésorerie et voyez dépenses, revenus et solde mensuel.',
      finance_p3_t:'Factures, abonnements et budget', finance_p3_b:'Regroupez charges récurrentes, échéances et progression du budget mensuel.',
      finance_p4_t:'Questions IA texte ou voix', finance_p4_b:'Demandez « Combien ai-je dépensé en médicaments ? » et recevez une réponse basée sur vos données enregistrées.',
      finance_p5_t:'Archives mensuelles', finance_p5_b:'Ouvrez un mois, consultez opérations et catégories, puis interrogez l’IA uniquement sur ce mois.',
      vault_kicker:'Documents importants', vault_title:'Un espace protégé pour les documents à ne pas perdre de vue.', vault_b1:'Coffre local chiffré', vault_b2:'PIN / biométrie', vault_b3:'Reconnaissance IA et analyse enregistrée', vault_b4:'Dates d’expiration et rappels', vault_b5:'Partage du fichier protégé lorsque vous le décidez',
      flow_kicker:'Entrée des informations', flow_title:'Utilisez ce qui est le plus rapide sur le moment.', flow1:'Caméra', flow2:'Galerie', flow3:'PDF / fichiers', flow4:'Partage Android', flow5:'Voix',
      privacy_kicker:'Confidentialité intégrée', privacy_title:'Vous choisissez ce qui est traité.', privacy_body:'NowWhat ne traite que le contenu nécessaire à la fonction choisie. Les résultats IA importants doivent toujours être vérifiés avec la source.',
      privacy_badge1:'Pas de trackers publicitaires sur mynw.app', privacy_badge2:'HTTPS', privacy_badge3:'Suppression de compte claire', privacy_badge4:'Compte facultatif',
      faq_kicker:'FAQ', faq_title:'Réponses rapides',
      faq1_q:'Un compte est-il obligatoire ?', faq1_a:'Non. Le mode invité fonctionne sans identité liée. Vous pouvez associer e-mail ou Google plus tard pour récupérer le compte et synchroniser les données compatibles.',
      faq2_q:'NowWhat remplace-t-il un professionnel ?', faq2_a:'Non. L’IA peut être incomplète ou erronée. Vérifiez les informations importantes et consultez un professionnel qualifié si nécessaire.',
      faq3_q:'Puis-je supprimer mon compte ?', faq3_a:'Oui. Vous pouvez le supprimer dans l’app ou commencer une demande externe depuis ce site.',
      faq4_q:'Quelles langues sont disponibles ?', faq4_a:'L’interface prend en charge l’anglais, le portugais, le russe, le français, l’espagnol, l’ukrainien, l’allemand et l’italien.',
      launch_kicker:'Android · Version 1.0', launch_title:'Préparation pour Google Play.', launch_body:'Le lien officiel Play Store apparaîtra ici dès la mise en ligne.', launch_store:'Google Play · Bientôt',
      footer_text:'© 2026 NowWhat App.',
      support_title:'Assistance — NowWhat', support_h1:'Comment pouvons-nous aider ?', support_intro:'Envoyez un message directement depuis cette page. Il est stocké dans la boîte privée NowWhat et transmis à support@mynw.app.',
      support_form_title:'Envoyer un message', support_name:'Nom', support_email:'E-mail pour la réponse', support_topic:'Sujet', support_message:'Message', support_send:'Envoyer',
      support_topic_support:'Assistance générale', support_topic_bug:'Signaler un problème', support_topic_feature:'Proposer une fonction', support_topic_privacy:'Confidentialité / données', support_topic_other:'Autre',
      support_privacy_note:'N’envoyez pas de mots de passe, clés API ou identifiants bancaires. L’envoi du formulaire autorise le traitement du message et de l’e-mail pour l’assistance.',
      support_direct:'Vous préférez l’e-mail ?', support_direct_b:'Vous pouvez aussi écrire à support@mynw.app.', support_ai_t:'Le résultat IA semble incorrect', support_ai_b:'Comparez le résultat avec l’original. Dates, montants et informations importantes doivent toujours être vérifiés.',
      support_reminder_t:'Un rappel n’est pas apparu', support_reminder_b:'Vérifiez l’autorisation de notifications Android et les restrictions batterie/arrière-plan.',
      support_signin_t:'Impossible de se connecter', support_signin_b:'Utilisez la même méthode de connexion et le même compte qu’à l’origine. Si le problème continue, envoyez-nous un message.',
      support_delete_t:'Supprimer le compte', support_delete_b:'Utilisez Confidentialité et compte dans l’app ou la page externe de suppression.',
      form_sending:'Envoi…', form_success:'Message envoyé. Merci — nous l’avons reçu.', form_queued:'Message reçu et enregistré. L’envoi par e-mail sera réessayé.', form_error:'Impossible d’envoyer le message. Réessayez.', form_rate:'Trop de messages ont été envoyés depuis cet appareil. Réessayez plus tard.',
      delete_title:'Supprimer votre compte NowWhat', delete_h1:'Supprimer le compte et les données associées', delete_intro:'Vous pouvez supprimer le compte dans l’app. Si vous n’y avez plus accès, utilisez la procédure externe ci-dessous.',
      delete_how:'Comment demander la suppression', delete_s1:'Écrivez à support@mynw.app depuis l’adresse liée au compte.', delete_s2:'Utilisez l’objet « Delete my NowWhat account ».', delete_s3:'Indiquez l’adresse e-mail utilisée pour votre compte NowWhat.', delete_s4:'Nous pouvons demander une vérification de propriété avant suppression.',
      delete_button:'Demander la suppression', delete_what:'Ce qui est supprimé', delete_what_b:'Après validation, le compte NowWhat et les données serveur associées sont supprimés, sauf conservation nécessaire pour des raisons légales, de sécurité, de prévention de fraude ou de litige.',
      delete_local:'Données sur l’appareil', delete_local_b:'Certaines notes, fichiers protégés ou réglages peuvent rester localement. Il peut être nécessaire de désinstaller l’app ou d’effacer son stockage.',
      delete_sub:'Abonnements', delete_sub_b:'Si NowWhat propose un abonnement Google Play payant, supprimer le compte peut ne pas annuler automatiquement cet abonnement. Annulez-le aussi dans Google Play.',
      legal_updated:'Dernière mise à jour : 25 septembre 2026', notfound_title:'Page introuvable — NowWhat', notfound_h1:'Page introuvable', notfound_body:'La page demandée n’existe pas.', notfound_button:'Retour à l’accueil'
    },
    es: {
      nav_features:'Funciones', nav_manual:'Guía', nav_legal:'Información legal', nav_docs:'Documentos e IA', nav_vault:'Documentos importantes', nav_saved:'Guardado y voz', nav_finance:'Finanzas', nav_calendar:'Calendario y recordatorios', nav_briefing:'Daily Briefing y reglas automáticas', nav_privacy:'Privacidad', nav_terms:'Términos', nav_support:'Soporte', nav_delete:'Eliminar cuenta', nav_get:'Obtener NowWhat',
      home_title:'NowWhat — asistente de IA para documentos, tareas y finanzas',
      eyebrow:'Tu asistente de IA diario', hero_h1:'Todo lo importante — bajo control.',
      hero_lead:'NowWhat entiende documentos e información cotidiana, te ayuda a actuar y mantiene el resultado organizado en un solo lugar.',
      cta_features:'Ver funciones', cta_support:'Contactar soporte', proof_android:'Android primero', proof_adult:'18+', proof_lang:'8 idiomas', proof_privacy:'Controles de privacidad',
      preview_doc:'Documento entendido', preview_summary:'Reunión escolar el jueves a las 18:30. Llevar el formulario firmado.', preview_calendar:'Calendario', preview_reminder:'Recordatorio', preview_ask:'Preguntar a la IA',
      preview_finance:'Finanzas', preview_spent:'Gastos', preview_income:'Ingresos', preview_balance:'Balance',
      section_features_kicker:'Funciones principales', section_features_title:'De la información a la acción — sin rutina innecesaria.', section_features_lead:'Documentos, notas, dinero, fechas y tareas funcionan juntos en vez de quedar dispersos en varias apps.', advantages_kicker:'Por qué NowWhat', advantages_title:'Menos rutina. Más claridad.', adv1_t:'Del documento a la acción', adv1_b:'Reconoce el contenido, entiende lo esencial y crea enseguida la siguiente acción útil.', adv2_t:'Tus datos se pueden consultar', adv2_b:'Pregunta a la IA por un documento, un mes de gastos o información guardada en lugar de buscar manualmente.', adv3_t:'Lo importante queda organizado', adv3_b:'Carpetas, documentos protegidos, recordatorios y Daily Briefing mantienen visibles tareas y plazos.', adv4_t:'Tú mantienes el control', adv4_b:'Almacenamiento local protegido, acciones de IA explícitas, controles de datos y eliminación de cuenta.', manual_cta_t:'¿Necesitas más detalles?', manual_cta_b:'Abre la guía completa de NowWhat con instrucciones paso a paso para las funciones principales.', manual_cta_btn:'Abrir guía', screens_kicker:'Vista previa de la app', screens_title:'Mira NowWhat en acción.', screens_lead:'Ejemplos reales de la interfaz de la aplicación.',
      f1_title:'IA para documentos', f1_body:'Reconoce fotos, capturas, PDF, texto y archivos compartidos. Muestra resumen, datos clave y acciones sugeridas.',
      f2_title:'Preguntar por un documento', f2_body:'Haz preguntas concretas sobre el documento actual en vez de buscar manualmente por páginas.',
      f3_title:'Documentos importantes', f3_body:'Guarda documentos sensibles en un archivo local protegido con PIN/biometría, vencimientos, recordatorios y uso compartido seguro.',
      f4_title:'Finanzas', f4_body:'Registra gastos e ingresos, analiza recibos mixtos por artículo y controla presupuestos, facturas y suscripciones.',
      f5_title:'Notas de voz', f5_body:'Graba, transcribe y continúa la misma nota sin perder el contenido anterior.',
      f6_title:'Guardado y carpetas', f6_body:'Organiza notas y documentos con carpetas, estilos, colores, iconos, búsqueda, favoritos y papelera.',
      f7_title:'Calendario y recordatorios', f7_body:'Crea eventos y recordatorios directamente desde fechas, plazos y tareas detectadas.',
      f8_title:'Daily Briefing y reglas automáticas', f8_body:'Consulta las tareas de hoy y deja que reglas configurables sugieran archivo, recordatorios, calendario y borradores de respuesta.',
      finance_kicker:'Finanzas', finance_title:'Pregunta a tus propios datos financieros.', finance_lead:'Finanzas está pensado para recibos reales y movimientos cotidianos.',
      finance_p1_t:'Recibos mixtos', finance_p1_b:'Cada línea puede tener su propia categoría para separar supermercado, farmacia y hogar.',
      finance_p2_t:'Ingresos + gastos', finance_p2_b:'Registra ambos lados del flujo y consulta gastos, ingresos y balance mensual.',
      finance_p3_t:'Facturas, suscripciones y presupuesto', finance_p3_b:'Agrupa cargos recurrentes, vencimientos y progreso del presupuesto mensual.',
      finance_p4_t:'Preguntas IA por texto o voz', finance_p4_b:'Pregunta “¿Cuánto gasté en medicamentos?” y recibe respuestas basadas en tus datos guardados.',
      finance_p5_t:'Archivo mensual', finance_p5_b:'Abre un mes, revisa operaciones y categorías y pregunta a la IA solo sobre ese mes.',
      vault_kicker:'Documentos importantes', vault_title:'Un lugar protegido para documentos que no puedes perder de vista.', vault_b1:'Archivo local cifrado', vault_b2:'PIN / biometría', vault_b3:'Reconocimiento IA y análisis guardado', vault_b4:'Vencimientos y recordatorios', vault_b5:'Comparte el archivo protegido cuando tú decidas',
      flow_kicker:'Cómo entra la información', flow_title:'Usa lo que sea más rápido en ese momento.', flow1:'Cámara', flow2:'Galería', flow3:'PDF / archivos', flow4:'Compartir en Android', flow5:'Voz',
      privacy_kicker:'Privacidad desde el diseño', privacy_title:'Tú decides qué se procesa.', privacy_body:'NowWhat solo procesa el contenido necesario para la función elegida. Los resultados importantes de IA siempre deben verificarse con la fuente original.',
      privacy_badge1:'Sin trackers publicitarios en mynw.app', privacy_badge2:'HTTPS', privacy_badge3:'Eliminación de cuenta clara', privacy_badge4:'Cuenta opcional',
      faq_kicker:'FAQ', faq_title:'Respuestas rápidas',
      faq1_q:'¿Necesito una cuenta?', faq1_a:'No. El modo invitado funciona sin identidad vinculada. Puedes asociar e-mail o Google más tarde para recuperar la cuenta y sincronizar datos compatibles.',
      faq2_q:'¿NowWhat sustituye a un profesional?', faq2_a:'No. La IA puede ser incompleta o incorrecta. Verifica la información importante y consulta a un profesional cuando corresponda.',
      faq3_q:'¿Puedo eliminar mi cuenta?', faq3_a:'Sí. Puedes eliminarla dentro de la app o iniciar una solicitud externa desde este sitio.',
      faq4_q:'¿Qué idiomas están disponibles?', faq4_a:'La interfaz admite inglés, portugués, ruso, francés, español, ucraniano, alemán e italiano.',
      launch_kicker:'Android · Versión 1.0', launch_title:'Preparando Google Play.', launch_body:'El enlace oficial de Play Store aparecerá aquí cuando la publicación esté activa.', launch_store:'Google Play · Próximamente',
      footer_text:'© 2026 NowWhat App.',
      support_title:'Soporte — NowWhat', support_h1:'¿Cómo podemos ayudarte?', support_intro:'Envía un mensaje directamente desde esta página. Se guarda en el buzón privado de NowWhat y se reenvía a support@mynw.app.',
      support_form_title:'Enviar mensaje', support_name:'Nombre', support_email:'E-mail para respuesta', support_topic:'Tema', support_message:'Mensaje', support_send:'Enviar mensaje',
      support_topic_support:'Soporte general', support_topic_bug:'Informar de un problema', support_topic_feature:'Proponer una función', support_topic_privacy:'Privacidad / datos', support_topic_other:'Otro',
      support_privacy_note:'No envíes contraseñas, claves API ni credenciales bancarias. Al enviar el formulario autorizas el tratamiento del mensaje y el e-mail para soporte.',
      support_direct:'¿Prefieres e-mail?', support_direct_b:'También puedes escribir a support@mynw.app.', support_ai_t:'El resultado de IA parece incorrecto', support_ai_b:'Compáralo con el original. Fechas, importes y datos importantes deben verificarse siempre.',
      support_reminder_t:'No apareció un recordatorio', support_reminder_b:'Comprueba el permiso de notificaciones Android y las restricciones de batería/segundo plano.',
      support_signin_t:'No puedo iniciar sesión', support_signin_b:'Usa el mismo método y la misma cuenta que utilizaste originalmente. Si continúa, envíanos un mensaje.',
      support_delete_t:'Eliminar la cuenta', support_delete_b:'Usa Privacidad y cuenta en la app o la página externa de eliminación.',
      form_sending:'Enviando…', form_success:'Mensaje enviado. Gracias — lo hemos recibido.', form_queued:'Mensaje recibido y guardado. Se reintentará la entrega por e-mail.', form_error:'No se pudo enviar. Inténtalo de nuevo.', form_rate:'Se enviaron demasiados mensajes desde este dispositivo. Inténtalo más tarde.',
      delete_title:'Eliminar tu cuenta NowWhat', delete_h1:'Eliminar la cuenta y los datos asociados', delete_intro:'Puedes eliminar la cuenta dentro de la app. Si ya no tienes acceso, usa el proceso externo.',
      delete_how:'Cómo solicitar la eliminación', delete_s1:'Escribe a support@mynw.app desde el correo asociado a la cuenta.', delete_s2:'Usa el asunto “Delete my NowWhat account”.', delete_s3:'Incluye el e-mail utilizado en tu cuenta NowWhat.', delete_s4:'Podemos pedirte que verifiques la propiedad antes de eliminar.',
      delete_button:'Solicitar eliminación', delete_what:'Qué se elimina', delete_what_b:'Tras una solicitud válida, se eliminan la cuenta NowWhat y los datos de servidor asociados, salvo información que deba conservarse por razones legales, de seguridad, prevención de fraude o resolución de disputas.',
      delete_local:'Datos del dispositivo', delete_local_b:'Algunas notas, archivos protegidos o ajustes pueden quedar localmente. Puede ser necesario desinstalar la app o borrar su almacenamiento.',
      delete_sub:'Suscripciones', delete_sub_b:'Si NowWhat ofrece una suscripción de pago en Google Play, eliminar la cuenta puede no cancelarla automáticamente. Cancélala también en Google Play.',
      legal_updated:'Última actualización: 25 de septiembre de 2026', notfound_title:'Página no encontrada — NowWhat', notfound_h1:'Página no encontrada', notfound_body:'La página solicitada no existe.', notfound_button:'Ir al inicio'
    },
    uk: {
      nav_features:'Можливості', nav_manual:'Посібник', nav_legal:'Правова інформація', nav_docs:'Документи та AI', nav_vault:'Важливі документи', nav_saved:'Збережене та голос', nav_finance:'Фінанси', nav_calendar:'Календар і нагадування', nav_briefing:'Daily Briefing та Автоправила', nav_privacy:'Конфіденційність', nav_terms:'Умови', nav_support:'Підтримка', nav_delete:'Видалити акаунт', nav_get:'Отримати NowWhat',
      home_title:'NowWhat — AI-помічник для документів, справ і фінансів',
      eyebrow:'Ваш щоденний AI-помічник', hero_h1:'Усе важливе — під контролем.',
      hero_lead:'NowWhat розуміє документи й щоденну інформацію, допомагає одразу діяти та зберігає результат у зрозумілому порядку.',
      cta_features:'Переглянути можливості', cta_support:'Зв’язатися з підтримкою', proof_android:'Спочатку Android', proof_adult:'18+', proof_lang:'8 мов', proof_privacy:'Контроль конфіденційності',
      preview_doc:'Документ зрозумілий', preview_summary:'Батьківські збори у четвер о 18:30. Принести підписану форму.', preview_calendar:'Календар', preview_reminder:'Нагадування', preview_ask:'Запитати AI',
      preview_finance:'Фінанси', preview_spent:'Витрати', preview_income:'Дохід', preview_balance:'Баланс',
      section_features_kicker:'Основні можливості', section_features_title:'Від інформації до дії — без зайвої рутини.', section_features_lead:'Документи, нотатки, гроші, дати й завдання працюють разом, а не розкидані між різними застосунками.', advantages_kicker:'Чому NowWhat', advantages_title:'Менше рутини. Більше ясності.', adv1_t:'Від документа до дії', adv1_b:'Розпізнайте вміст, зрозумійте головне й одразу створіть потрібну дію.', adv2_t:'Ваші дані стають доступними для запитань', adv2_b:'Запитайте AI про документ, витрати за місяць або збережену інформацію замість ручного пошуку.', adv3_t:'Важливе залишається організованим', adv3_b:'Папки, захищені документи, нагадування та Daily Briefing допомагають не пропускати строки й завдання.', adv4_t:'Контроль залишається у вас', adv4_b:'Захищене локальне зберігання, явні AI-дії, очищення даних і видалення акаунта.', manual_cta_t:'Потрібні подробиці?', manual_cta_b:'Відкрийте повний посібник NowWhat із покроковим описом основних функцій.', manual_cta_btn:'Відкрити посібник', screens_kicker:'Інтерфейс застосунку', screens_title:'Подивіться NowWhat у роботі.', screens_lead:'Реальні приклади екранів застосунку.',
      f1_title:'AI для документів', f1_body:'Розпізнає фото, скриншоти, PDF, текст і файли з меню «Поділитися». Показує підсумок, ключові дані та дії.',
      f2_title:'Питання про документ', f2_body:'Ставте уточнювальні питання про поточний документ замість ручного пошуку сторінками.',
      f3_title:'Важливі документи', f3_body:'Зберігайте чутливі документи в захищеному локальному архіві з PIN/біометрією, строками, нагадуваннями та безпечним поширенням.',
      f4_title:'Фінанси', f4_body:'Враховуйте витрати й доходи, розбирайте змішані чеки по позиціях, контролюйте бюджет, рахунки та підписки.',
      f5_title:'Голосові нотатки', f5_body:'Записуйте голос, отримуйте розшифровку та доповнюйте ту саму нотатку без втрати попереднього тексту.',
      f6_title:'Збережене та папки', f6_body:'Організовуйте нотатки й документи: папки, стилі, кольори, іконки, пошук, обране та кошик.',
      f7_title:'Календар і нагадування', f7_body:'Створюйте події та нагадування з розпізнаних дат, строків і завдань.',
      f8_title:'Daily Briefing та Автоправила', f8_body:'Переглядайте завдання на сьогодні, а правила можуть пропонувати сортування, нагадування, календар і чернетки відповідей.',
      finance_kicker:'Фінанси', finance_title:'Ставте питання власним фінансовим даним.', finance_lead:'Фінанси побудовані навколо реальних чеків і щоденних операцій.',
      finance_p1_t:'Змішані чеки', finance_p1_b:'Кожна позиція може мати власну категорію — продукти, аптека й дім не змішуються.',
      finance_p2_t:'Доходи + витрати', finance_p2_b:'Враховуйте обидві сторони грошового потоку та дивіться витрати, дохід і баланс за місяць.',
      finance_p3_t:'Рахунки, підписки та бюджет', finance_p3_b:'Регулярні списання, строки оплати й прогрес місячного бюджету зібрані разом.',
      finance_p4_t:'AI-питання текстом або голосом', finance_p4_b:'Запитайте «Скільки я витратив на ліки?» й отримайте відповідь на основі збережених даних.',
      finance_p5_t:'Архів за місяцями', finance_p5_b:'Відкрийте місяць, перегляньте операції та категорії й запитайте AI лише про цей місяць.',
      vault_kicker:'Важливі документи', vault_title:'Захищене місце для документів, які не можна втрачати з поля зору.', vault_b1:'Локальний зашифрований архів', vault_b2:'PIN / біометрія', vault_b3:'AI-розпізнавання та збережений аналіз', vault_b4:'Строки дії та нагадування', vault_b5:'Поширення захищеного файлу за вашим вибором',
      flow_kicker:'Як додати інформацію', flow_title:'Використовуйте те, що найшвидше зараз.', flow1:'Камера', flow2:'Галерея', flow3:'PDF / файли', flow4:'Android «Поділитися»', flow5:'Голос',
      privacy_kicker:'Конфіденційність за замовчуванням', privacy_title:'Ви самі вирішуєте, що обробляти.', privacy_body:'NowWhat обробляє лише контент, потрібний для вибраної функції. Важливі результати AI завжди слід звіряти з оригіналом.',
      privacy_badge1:'Без рекламних трекерів на mynw.app', privacy_badge2:'HTTPS', privacy_badge3:'Зрозуміле видалення акаунта', privacy_badge4:'Акаунт необов’язковий',
      faq_kicker:'FAQ', faq_title:'Коротко про головне',
      faq1_q:'Чи потрібен акаунт?', faq1_a:'Ні. Гостьовий режим працює без прив’язаної особи. E-mail або Google можна додати пізніше для відновлення акаунта та хмарної синхронізації підтримуваних даних.',
      faq2_q:'NowWhat замінює фахівця?', faq2_a:'Ні. AI може помилятися або бути неповним. Перевіряйте важливі дані та за потреби звертайтеся до фахівця.',
      faq3_q:'Чи можна видалити акаунт?', faq3_a:'Так. Це можна зробити в застосунку або через зовнішній запит на сайті.',
      faq4_q:'Які мови підтримуються?', faq4_a:'Інтерфейс підтримує англійську, португальську, російську, французьку, іспанську, українську, німецьку та італійську.',
      launch_kicker:'Android · Версія 1.0', launch_title:'Готуємося до Google Play.', launch_body:'Офіційне посилання Play Store з’явиться тут після публікації.', launch_store:'Google Play · Незабаром',
      footer_text:'© 2026 NowWhat App.',
      support_title:'Підтримка — NowWhat', support_h1:'Чим можемо допомогти?', support_intro:'Надішліть повідомлення прямо з цієї сторінки. Воно зберігається у приватній скриньці NowWhat і пересилається на support@mynw.app.',
      support_form_title:'Надіслати повідомлення', support_name:'Ім’я', support_email:'E-mail для відповіді', support_topic:'Тема', support_message:'Повідомлення', support_send:'Надіслати',
      support_topic_support:'Загальна підтримка', support_topic_bug:'Повідомити про проблему', support_topic_feature:'Запропонувати функцію', support_topic_privacy:'Конфіденційність / дані', support_topic_other:'Інше',
      support_privacy_note:'Не надсилайте паролі, API-ключі або банківські дані. Надсилаючи форму, ви дозволяєте обробити повідомлення й e-mail для підтримки.',
      support_direct:'Зручніше e-mail?', support_direct_b:'Також можна написати на support@mynw.app.', support_ai_t:'AI розібрав документ неправильно', support_ai_b:'Звірте результат з оригіналом. Важливі дати, суми та реквізити завжди перевіряйте.',
      support_reminder_t:'Не з’явилося нагадування', support_reminder_b:'Перевірте дозвіл Android на сповіщення та обмеження батареї/фонової роботи.',
      support_signin_t:'Не вдається увійти', support_signin_b:'Використовуйте той самий спосіб входу й акаунт, що раніше. Якщо проблема лишається — напишіть нам.',
      support_delete_t:'Видалення акаунта', support_delete_b:'Скористайтеся розділом «Конфіденційність і акаунт» або зовнішньою сторінкою видалення.',
      form_sending:'Надсилаємо…', form_success:'Повідомлення надіслано. Дякуємо — ми його отримали.', form_queued:'Повідомлення отримано й збережено. Доставка e-mail буде повторена.', form_error:'Не вдалося надіслати. Спробуйте ще раз.', form_rate:'З цього пристрою надіслано забагато повідомлень. Спробуйте пізніше.',
      delete_title:'Видалення акаунта NowWhat', delete_h1:'Видалити акаунт і пов’язані дані', delete_intro:'Акаунт можна видалити в застосунку. Якщо доступу вже немає, використовуйте зовнішній процес нижче.',
      delete_how:'Як запросити видалення', delete_s1:'Напишіть на support@mynw.app з e-mail, пов’язаного з акаунтом.', delete_s2:'Вкажіть тему “Delete my NowWhat account”.', delete_s3:'Вкажіть e-mail вашого акаунта NowWhat.', delete_s4:'Перед видаленням ми можемо попросити підтвердити володіння акаунтом.',
      delete_button:'Запросити видалення акаунта', delete_what:'Що буде видалено', delete_what_b:'Після підтвердженого запиту акаунт NowWhat і пов’язані серверні дані видаляються, крім інформації, яку потрібно зберігати з юридичних причин, безпеки, протидії шахрайству або спорів.',
      delete_local:'Дані на пристрої', delete_local_b:'Деякі нотатки, захищені файли або налаштування можуть залишатися локально. Для видалення локальних копій може знадобитися очистити дані застосунку або видалити його.',
      delete_sub:'Підписки', delete_sub_b:'Якщо з’явиться платна підписка Google Play, видалення акаунта NowWhat може не скасувати її автоматично. Скасуйте її також у Google Play.',
      legal_updated:'Останнє оновлення: 25 вересня 2026 р.', notfound_title:'Сторінку не знайдено — NowWhat', notfound_h1:'Сторінку не знайдено', notfound_body:'Запитаної сторінки не існує.', notfound_button:'На головну'
    }
  };


  S.de = {
    nav_features:"Funktionen", nav_manual:"Handbuch", nav_legal:"Rechtliches", nav_docs:"Dokumente & AI", nav_vault:"Wichtige Dokumente", nav_saved:"Gespeichert & Sprache", nav_finance:"Finanzen", nav_calendar:"Kalender & Erinnerungen", nav_briefing:"Daily Briefing & Auto-Regeln", nav_privacy:"Datenschutz", nav_terms:"Bedingungen", nav_support:"Support", nav_delete:"Konto löschen", nav_get:"NowWhat holen",
    home_title:"NowWhat — AI-Assistent für Dokumente, Aufgaben und Finanzen",
    eyebrow:"Dein persönlicher AI-Assistent", hero_h1:"Alles Wichtige — unter Kontrolle.",
    hero_lead:"NowWhat versteht Dokumente und Alltagsinformationen, hilft beim nächsten Schritt und hält Ergebnisse an einem Ort organisiert.",
    cta_features:"Funktionen entdecken", cta_support:"Support kontaktieren", proof_android:"Android zuerst", proof_adult:"18+", proof_lang:"8 Sprachen", proof_privacy:"Datenschutzkontrollen",
    preview_doc:"Dokument verstanden", preview_summary:"Schultreffen am Donnerstag um 18:30. Unterschriebenes Formular mitbringen.", preview_calendar:"Kalender", preview_reminder:"Erinnerung", preview_ask:"AI fragen",
    preview_finance:"Finanzen", preview_spent:"Ausgaben", preview_income:"Einnahmen", preview_balance:"Saldo",
    section_features_kicker:"Kernfunktionen", section_features_title:"Von Information zur Aktion — ohne Routine.", section_features_lead:"Dokumente, Notizen, Geld, Termine und Aufgaben arbeiten zusammen statt in getrennten Apps.", advantages_kicker:"Warum NowWhat", advantages_title:"Weniger Routine. Mehr Klarheit.",
    adv1_t:"Vom Dokument zur Aktion", adv1_b:"Inhalt erkennen, das Wichtige verstehen und sofort den nächsten sinnvollen Schritt vorbereiten.",
    adv2_t:"Deine Daten werden durchsuchbar", adv2_b:"Frage AI nach einem Dokument, einem Ausgabenmonat oder gespeicherten Informationen statt manuell zu suchen.",
    adv3_t:"Wichtiges bleibt organisiert", adv3_b:"Ordner, geschützte Dokumente, Erinnerungen und Daily Briefing halten Fristen und Aufgaben sichtbar.",
    adv4_t:"Du behältst die Kontrolle", adv4_b:"Geschützter lokaler Dokumentenspeicher, bewusste AI-Aktionen, klare Datenkontrollen und Kontolöschung.",
    manual_cta_t:"Mehr Details?", manual_cta_b:"Öffne den vollständigen NowWhat-Leitfaden mit einfachen Schritten für jedes wichtige Modul.", manual_cta_btn:"Handbuch öffnen", screens_kicker:"App-Vorschau", screens_title:"NowWhat in Aktion.", screens_lead:"Echte Beispiele aus der App-Oberfläche.",
    f1_title:"Dokument-AI", f1_body:"Fotos, Screenshots, PDFs, Text und geteilte Dateien erkennen. Zusammenfassung, wichtige Daten und passende Aktionen erhalten.",
    f2_title:"Dokument fragen", f2_body:"Stelle Folgefragen zum aktuellen Dokument, ohne Seiten manuell durchsuchen zu müssen.",
    f3_title:"Wichtige Dokumente", f3_body:"Sensible Dokumente in einem geschützten lokalen Tresor mit PIN/Biometrie, Ablaufdaten, Erinnerungen und sicherer Freigabe aufbewahren.",
    f4_title:"Finance Hub", f4_body:"Ausgaben und Einnahmen verfolgen, gemischte Belege scannen, einzelne Positionen kategorisieren sowie Budgets, Rechnungen und Abos überwachen.",
    f5_title:"Sprachnotizen", f5_body:"Sprachnotiz aufnehmen, transkribieren und dieselbe Notiz fortsetzen, ohne bisherigen Inhalt zu verlieren.",
    f6_title:"Gespeichert & Ordner", f6_body:"Notizen und erkannte Dokumente mit Ordnern, Stilen, Farben, Symbolen, Suche, Favoriten und Papierkorb organisieren.",
    f7_title:"Kalender & Erinnerungen", f7_body:"Ereignisse und Erinnerungen erstellen, Tagesplan für jedes Datum öffnen und erkannte Termine direkt übernehmen.",
    f8_title:"Daily Briefing & Auto-Regeln", f8_body:"Heutige Aufgaben und Ereignisse sehen; semantische Regeln können Ablage, Erinnerungen, Kalenderaktionen und Antwortentwürfe vorbereiten.",
    f9_title:"Family Space", f9_body:"Notizen, Dokumente, Aufgaben, Einkäufe, Kalender und Finanzen teilen. Einladung per Code/QR, Spracheingabe und Hinweise auf neue Inhalte.",
    finance_kicker:"Finance Hub", finance_title:"Frage deine eigenen Finanzdaten.", finance_lead:"Finanzen basiert auf echten Belegen und Alltagsbuchungen, nicht nur auf einer manuellen Ausgabenliste.",
    finance_p1_t:"Gemischte Belege", finance_p1_b:"Jede Belegposition kann eine eigene Kategorie haben, damit Lebensmittel, Apotheke und Haushalt nicht in einem Topf landen.",
    finance_p2_t:"Einnahmen + Ausgaben", finance_p2_b:"Beide Seiten des Geldflusses verfolgen und Ausgaben, Einnahmen und Monatssaldo sehen.",
    finance_p3_t:"Rechnungen, Abos & Budgets", finance_p3_b:"Wiederkehrende Belastungen, Fälligkeiten und monatlichen Budgetfortschritt zusammenhalten.",
    finance_p4_t:"AI-Fragen per Text oder Sprache", finance_p4_b:"Frage z. B. „Wie viel habe ich für Medikamente ausgegeben?“ und erhalte Antworten aus deinen gespeicherten Finanzdaten.",
    finance_p5_t:"Monatsarchiv", finance_p5_b:"Monat öffnen, alle Buchungen und Kategorien prüfen und AI-Fragen nur zu diesem Monat stellen.",
    vault_kicker:"Wichtige Dokumente", vault_title:"Ein geschützter Ort für Dokumente, die du nicht aus den Augen verlieren darfst.",
    vault_b1:"Lokaler verschlüsselter Tresor", vault_b2:"PIN / Biometrie", vault_b3:"AI-Erkennung und gespeicherte Analyse", vault_b4:"Ablaufdaten und Erinnerungen", vault_b5:"Geschützte Datei nur dann teilen, wenn du es möchtest",
    flow_kicker:"So kommen Informationen hinein", flow_title:"Nutze im Moment den schnellsten Weg.", flow1:"Kamera", flow2:"Galerie", flow3:"PDF / Dateien", flow4:"Android Teilen", flow5:"Sprache",
    privacy_kicker:"Datenschutz by Design", privacy_title:"Du entscheidest, was verarbeitet wird.", privacy_body:"NowWhat verarbeitet nur Inhalte, die für die gewählte Funktion nötig sind. Wichtige AI-Ergebnisse sollten immer mit dem Original geprüft werden.",
    privacy_badge1:"Keine Werbetracker auf mynw.app", privacy_badge2:"HTTPS", privacy_badge3:"Klarer Weg zur Kontolöschung", privacy_badge4:"Konto optional",
    faq_kicker:"FAQ", faq_title:"Kurze Antworten",
    faq1_q:"Brauche ich ein Konto?", faq1_a:"Nein. Der Gastmodus funktioniert ohne verknüpfte Identität. E-Mail oder Google können später für Wiederherstellung und Cloud-Synchronisierung unterstützter Daten verbunden werden.",
    faq2_q:"Ersetzt NowWhat professionelle Beratung?", faq2_a:"Nein. AI kann unvollständig oder falsch sein. Prüfe wichtige Angaben und nutze bei Bedarf qualifizierte Fachberatung.",
    faq3_q:"Kann ich mein Konto löschen?", faq3_a:"Ja. Du kannst es in der App löschen oder über diese Website eine externe Löschanfrage starten.",
    faq4_q:"Welche Sprachen werden unterstützt?", faq4_a:"Die aktuelle Oberfläche unterstützt Englisch, Portugiesisch, Russisch, Französisch, Spanisch, Ukrainisch, Deutsch und Italienisch.",
    launch_kicker:"Android · Version 1.0", launch_title:"Vorbereitung für Google Play.", launch_body:"Der Produktionslink im Play Store erscheint hier, sobald der Eintrag live ist.", launch_store:"Google Play · Demnächst",
    footer_text:"© 2026 NowWhat App.",
    support_title:"Support — NowWhat", support_h1:"Wie können wir helfen?", support_intro:"Sende eine Nachricht direkt von dieser Seite. Sie wird im privaten NowWhat-Supportpostfach gespeichert und an support@mynw.app weitergeleitet.",
    support_form_title:"Nachricht senden", support_name:"Name", support_email:"E-Mail für Antwort", support_topic:"Thema", support_message:"Nachricht", support_send:"Nachricht senden",
    support_topic_support:"Allgemeiner Support", support_topic_bug:"Problem melden", support_topic_feature:"Funktionswunsch", support_topic_privacy:"Datenschutz / Daten", support_topic_other:"Sonstiges",
    support_privacy_note:"Sende keine Passwörter, API-Schlüssel oder Bankzugangsdaten. Mit dem Absenden erlaubst du uns, Nachricht und Antwort-E-Mail für Supportzwecke zu verarbeiten.",
    support_direct:"Lieber E-Mail?", support_direct_b:"Du kannst auch an support@mynw.app schreiben.",
    support_ai_t:"AI-Ergebnis wirkt falsch", support_ai_b:"Vergleiche das Ergebnis mit dem Original. Wichtige Termine, Beträge, Zahlungsdaten und folgenreiche Informationen sollten immer geprüft werden.",
    support_reminder_t:"Eine Erinnerung erschien nicht", support_reminder_b:"Prüfe Android-Benachrichtigungsrechte und Akku-/Hintergrundbeschränkungen für NowWhat.",
    support_signin_t:"Anmeldung nicht möglich", support_signin_b:"Nutze dieselbe Anmeldemethode und dasselbe Konto wie ursprünglich. Wenn das Problem bleibt, sende uns eine Nachricht.",
    support_delete_t:"Konto löschen", support_delete_b:"Nutze in der App „Datenschutz & Konto“ oder die externe Seite zur Kontolöschung.",
    form_sending:"Wird gesendet…", form_success:"Nachricht gesendet. Danke — wir haben sie erhalten.", form_queued:"Nachricht empfangen und gespeichert. E-Mail-Zustellung wird erneut versucht.", form_error:"Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.", form_rate:"Von diesem Gerät wurden zu viele Nachrichten gesendet. Bitte später erneut versuchen.",
    delete_title:"NowWhat-Konto löschen", delete_h1:"Konto und zugehörige Daten löschen", delete_intro:"Du kannst dein Konto in der App löschen. Wenn du keinen Zugriff mehr hast, nutze den externen Prozess unten.",
    delete_how:"So beantragst du die Löschung", delete_s1:"Sende eine E-Mail von der mit deinem Konto verknüpften Adresse an support@mynw.app.", delete_s2:"Nutze den Betreff „Delete my NowWhat account“.", delete_s3:"Gib die E-Mail-Adresse deines NowWhat-Kontos an.", delete_s4:"Vor der Löschung können wir einen Eigentumsnachweis verlangen.",
    delete_button:"Kontolöschung anfragen", delete_what:"Was gelöscht wird", delete_what_b:"Nach Abschluss einer gültigen Anfrage werden das NowWhat-Konto und zugehörige Serverdaten gelöscht, außer Daten, die aus legitimen rechtlichen, Sicherheits-, Betrugspräventions- oder Streitbeilegungsgründen aufbewahrt werden müssen.",
    delete_local:"Daten auf deinem Gerät", delete_local_b:"Einige Notizen, geschützte Dateien oder Einstellungen können lokal auf dem Gerät liegen. Zur Entfernung lokaler Kopien kann Deinstallation oder Löschen des App-Speichers nötig sein.",
    delete_sub:"Abonnements", delete_sub_b:"Falls NowWhat ein kostenpflichtiges Google-Play-Abo anbietet, beendet die Kontolöschung dieses möglicherweise nicht automatisch. Kündige es zusätzlich in Google Play.",
    legal_updated:"Zuletzt aktualisiert: 25. September 2026", notfound_title:"Seite nicht gefunden — NowWhat", notfound_h1:"Seite nicht gefunden", notfound_body:"Die angeforderte Seite existiert nicht.", notfound_button:"Zur Startseite"
  };


  S.it = {
    nav_features:"Funzioni", nav_manual:"Manuale", nav_legal:"Note legali", nav_docs:"Documenti & AI", nav_vault:"Documenti importanti", nav_saved:"Salvati & voce", nav_finance:"Finanze", nav_calendar:"Calendario & promemoria", nav_briefing:"Daily Briefing & regole automatiche", nav_privacy:"Privacy", nav_terms:"Termini", nav_support:"Supporto", nav_delete:"Elimina account", nav_get:"Scarica NowWhat",
    home_title:"NowWhat — assistente AI per documenti, attività e finanze",
    eyebrow:"Il tuo assistente AI personale", hero_h1:"Tutto ciò che conta — sotto controllo.",
    hero_lead:"NowWhat comprende documenti e informazioni quotidiane, ti aiuta a passare all'azione e mantiene tutto organizzato in un unico posto.",
    cta_features:"Scopri le funzioni", cta_support:"Contatta il supporto", proof_android:"Prima Android", proof_adult:"18+", proof_lang:"8 lingue", proof_privacy:"Controlli privacy",
    preview_doc:"Documento compreso", preview_summary:"Riunione scolastica giovedì alle 18:30. Porta il modulo firmato.", preview_calendar:"Calendario", preview_reminder:"Promemoria", preview_ask:"Chiedi all'AI",
    preview_finance:"Finanze", preview_spent:"Spese", preview_income:"Entrate", preview_balance:"Saldo",
    section_features_kicker:"Funzioni principali", section_features_title:"Dall'informazione all'azione — senza routine.", section_features_lead:"Documenti, note, denaro, date e attività lavorano insieme invece di vivere in app separate.", advantages_kicker:"Perché NowWhat", advantages_title:"Meno routine. Più chiarezza.",
    adv1_t:"Dal documento all'azione", adv1_b:"Riconosci il contenuto, capisci cosa conta e prepara subito il passo successivo più utile.",
    adv2_t:"I tuoi dati diventano consultabili", adv2_b:"Chiedi all'AI di un documento, di un mese di spese o delle informazioni salvate invece di cercare manualmente.",
    adv3_t:"Le cose importanti restano ordinate", adv3_b:"Cartelle, documenti protetti, promemoria e Daily Briefing mantengono visibili scadenze e attività.",
    adv4_t:"Il controllo resta a te", adv4_b:"Archivio locale protetto, azioni AI esplicite, controlli chiari sui dati ed eliminazione dell'account.",
    manual_cta_t:"Vuoi più dettagli?", manual_cta_b:"Apri la guida completa di NowWhat con istruzioni semplici per ogni modulo principale.", manual_cta_btn:"Apri manuale", screens_kicker:"Anteprima app", screens_title:"Guarda NowWhat in azione.", screens_lead:"Esempi reali dell’interfaccia dell’app.",
    f1_title:"AI per documenti", f1_body:"Riconosci foto, screenshot, PDF, testo e file condivisi. Ottieni riepilogo, dati importanti e azioni suggerite.",
    f2_title:"Chiedi al documento", f2_body:"Fai domande di approfondimento sul documento corrente senza cercare manualmente tra le pagine.",
    f3_title:"Documenti importanti", f3_body:"Conserva documenti sensibili in un archivio locale protetto con PIN/biometria, scadenze, promemoria e condivisione sicura.",
    f4_title:"Finance Hub", f4_body:"Tieni traccia di spese ed entrate, scansiona scontrini misti, categorizza singole voci e controlla budget, fatture e abbonamenti.",
    f5_title:"Note vocali", f5_body:"Registra una nota vocale, trascrivila e continua la stessa nota senza perdere il contenuto precedente.",
    f6_title:"Salvati & cartelle", f6_body:"Organizza note e documenti riconosciuti con cartelle, stili, colori, icone, ricerca, preferiti e cestino.",
    f7_title:"Calendario & promemoria", f7_body:"Crea eventi e promemoria, apri l'agenda di qualsiasi giorno e usa direttamente date e scadenze riconosciute.",
    f8_title:"Daily Briefing & regole automatiche", f8_body:"Vedi attività ed eventi di oggi; regole semantiche possono preparare organizzazione, promemoria, azioni calendario e bozze di risposta.",
    f9_title:"Family Space", f9_body:"Condividi note, documenti, attività, acquisti, calendario e finanze. Inviti con codice/QR, input vocale e indicatori di nuovi contenuti.",
    finance_kicker:"Finance Hub", finance_title:"Fai domande ai tuoi dati finanziari.", finance_lead:"Finanze nasce da scontrini e movimenti reali della vita quotidiana, non da una semplice lista manuale di spese.",
    finance_p1_t:"Scontrini misti", finance_p1_b:"Ogni riga può avere una categoria propria, così alimentari, farmacia e casa non finiscono nello stesso gruppo.",
    finance_p2_t:"Entrate + spese", finance_p2_b:"Segui entrambi i lati del flusso di denaro e guarda spese, entrate e saldo del mese.",
    finance_p3_t:"Fatture, abbonamenti & budget", finance_p3_b:"Tieni insieme addebiti ricorrenti, scadenze e avanzamento del budget mensile.",
    finance_p4_t:"Domande AI con testo o voce", finance_p4_b:"Chiedi «Quanto ho speso in farmaci?» o «Qual è stata la categoria più grande?» e ottieni risposte dai dati salvati.",
    finance_p5_t:"Archivio mensile", finance_p5_b:"Apri un mese, rivedi tutti i movimenti e le categorie, poi fai domande AI limitate a quel mese.",
    vault_kicker:"Documenti importanti", vault_title:"Un luogo protetto per i documenti che non puoi permetterti di perdere di vista.",
    vault_b1:"Archivio locale cifrato", vault_b2:"PIN / biometria", vault_b3:"Riconoscimento AI e analisi salvata", vault_b4:"Scadenze e promemoria", vault_b5:"Condividi il file protetto solo quando lo scegli",
    flow_kicker:"Come entrano le informazioni", flow_title:"Usa il modo più veloce in quel momento.", flow1:"Fotocamera", flow2:"Galleria", flow3:"PDF / file", flow4:"Condividi Android", flow5:"Voce",
    privacy_kicker:"Privacy by design", privacy_title:"Decidi tu cosa viene elaborato.", privacy_body:"NowWhat elabora solo il contenuto necessario alla funzione scelta. I risultati AI importanti devono sempre essere verificati con la fonte originale.",
    privacy_badge1:"Nessun tracker pubblicitario su mynw.app", privacy_badge2:"HTTPS", privacy_badge3:"Percorso chiaro per eliminare l'account", privacy_badge4:"Account facoltativo",
    faq_kicker:"FAQ", faq_title:"Risposte rapide",
    faq1_q:"Serve un account?", faq1_a:"No. La modalità ospite funziona senza identità collegata. E-mail o Google possono essere collegati in seguito per recupero account e sincronizzazione cloud dei dati supportati.",
    faq2_q:"NowWhat sostituisce una consulenza professionale?", faq2_a:"No. L'AI può essere incompleta o sbagliata. Verifica i dettagli importanti e usa consulenza qualificata quando opportuno.",
    faq3_q:"Posso eliminare il mio account?", faq3_a:"Sì. Puoi eliminarlo nell'app oppure avviare una richiesta esterna da questo sito.",
    faq4_q:"Quali lingue sono supportate?", faq4_a:"L'interfaccia attuale supporta inglese, portoghese, russo, francese, spagnolo, ucraino, tedesco e italiano.",
    launch_kicker:"Android · Versione 1.0", launch_title:"Preparazione per Google Play.", launch_body:"Il link di produzione sul Play Store apparirà qui quando la scheda sarà pubblica.", launch_store:"Google Play · Prossimamente",
    footer_text:"© 2026 NowWhat App.",
    support_title:"Supporto — NowWhat", support_h1:"Come possiamo aiutarti?", support_intro:"Invia un messaggio direttamente da questa pagina. Viene salvato nella casella privata del supporto NowWhat e inoltrato a support@mynw.app.",
    support_form_title:"Invia un messaggio", support_name:"Nome", support_email:"E-mail per la risposta", support_topic:"Argomento", support_message:"Messaggio", support_send:"Invia messaggio",
    support_topic_support:"Supporto generale", support_topic_bug:"Segnala un problema", support_topic_feature:"Richiesta funzione", support_topic_privacy:"Privacy / dati", support_topic_other:"Altro",
    support_privacy_note:"Non inviare password, chiavi API o credenziali bancarie. Inviando il modulo ci autorizzi a trattare messaggio ed e-mail di risposta per finalità di supporto.",
    support_direct:"Preferisci l'e-mail?", support_direct_b:"Puoi anche scrivere a support@mynw.app.",
    support_ai_t:"Il risultato AI sembra sbagliato", support_ai_b:"Confronta il risultato con l'originale. Date, importi, dati di pagamento e informazioni importanti devono sempre essere verificati.",
    support_reminder_t:"Un promemoria non è apparso", support_reminder_b:"Controlla l'autorizzazione alle notifiche Android e le restrizioni batteria/background per NowWhat.",
    support_signin_t:"Non riesco ad accedere", support_signin_b:"Usa lo stesso metodo di accesso e lo stesso account usati in origine. Se il problema continua, inviaci un messaggio.",
    support_delete_t:"Elimina il tuo account", support_delete_b:"Usa la sezione Privacy e account nell'app oppure la pagina esterna di eliminazione.",
    form_sending:"Invio…", form_success:"Messaggio inviato. Grazie — lo abbiamo ricevuto.", form_queued:"Messaggio ricevuto e salvato. La consegna e-mail verrà ritentata.", form_error:"Impossibile inviare il messaggio. Riprova.", form_rate:"Sono stati inviati troppi messaggi da questo dispositivo. Riprova più tardi.",
    delete_title:"Elimina il tuo account NowWhat", delete_h1:"Elimina account e dati associati", delete_intro:"Puoi eliminare l'account nell'app. Se non hai più accesso, usa il processo esterno qui sotto.",
    delete_how:"Come richiedere l'eliminazione", delete_s1:"Invia un'e-mail a support@mynw.app dall'indirizzo associato al tuo account.", delete_s2:"Usa l'oggetto «Delete my NowWhat account».", delete_s3:"Indica l'indirizzo e-mail usato per l'account NowWhat.", delete_s4:"Potremmo chiederti di verificare la titolarità prima dell'eliminazione.",
    delete_button:"Richiedi eliminazione account", delete_what:"Cosa viene eliminato", delete_what_b:"Dopo il completamento di una richiesta valida, l'account NowWhat e i dati utente lato server associati vengono eliminati, salvo informazioni da conservare per motivi legali, di sicurezza, prevenzione frodi o controversie.",
    delete_local:"Dati salvati sul dispositivo", delete_local_b:"Alcune note, file protetti o impostazioni possono esistere localmente. Per rimuovere copie locali potrebbe essere necessario disinstallare l'app o cancellarne i dati.",
    delete_sub:"Abbonamenti", delete_sub_b:"Se NowWhat offrirà un abbonamento Google Play a pagamento, eliminare l'account potrebbe non annullarlo automaticamente. Annullalo anche in Google Play.",
    legal_updated:"Ultimo aggiornamento: 25 settembre 2026", notfound_title:"Pagina non trovata — NowWhat", notfound_h1:"Pagina non trovata", notfound_body:"La pagina richiesta non esiste.", notfound_button:"Vai alla home"
  };

  const LEGAL = {
    privacy: {
      en: {
        title:'Privacy Policy', intro:'This policy explains how NowWhat handles information when you use the Android app, this website, account features, AI document analysis, voice transcription, Finance, reminders, calendar actions and support.',
        sections:[
          ['1. Who is responsible','NowWhat App is developed by Maksym Smyrnov in Portugal. Website: https://mynw.app/. Support and privacy contact: support@mynw.app.'],
          ['2. Information you provide','Depending on the feature, you may provide account identifiers and email, documents, photos, screenshots, PDFs, text, links, voice recordings, notes, finance entries, receipt items, questions, feedback and account-deletion requests.'],
          ['3. Information processed for features','NowWhat may process extracted text, dates, amounts, contacts, addresses, payment references, document summaries, reminder details, calendar information, receipt items and categories, budgets, bills and subscriptions when needed for the feature you request.'],
          ['4. AI processing','Content selected for AI features is sent over an encrypted connection to the NowWhat backend and to AI service providers for the requested analysis or transcription. AI results can be incomplete or incorrect and should be checked against the original source.'],
          ['5. Local storage and protected documents','Some information stays on your device. Important Documents are designed as a protected local vault. Device-local notification identifiers and local audio paths are device-specific.'],
          ['6. Cloud synchronisation','For linked non-anonymous accounts, supported saved-library state such as notes, folders, tasks and selected settings may synchronise through Supabase so it can be restored on another device. Guest-mode data may remain mainly local until an account is linked.'],
          ['7. Finance data','Finance entries, receipt items, categories, monthly summaries and AI questions are processed only to provide the Finance features you use. NowWhat is not a bank or payment service and does not execute payments.'],
          ['8. Service providers','Main providers may include Supabase for authentication, database and backend infrastructure; OpenAI API for requested AI analysis and transcription; Google for optional sign-in and Android services; and Resend for service/support email delivery.'],
          ['9. Purposes and legal bases','We process information to provide requested functionality, manage accounts, synchronise supported data, respond to support, protect the service and meet legal obligations. Where special-category data is involved, explicit consent may be requested where required.'],
          ['10. Retention and deletion','Data is retained only as reasonably necessary for the service, security, support, legal obligations or disputes. You can delete history or your account in the app. External deletion: https://mynw.app/delete-account/.'],
          ['11. Your rights','Depending on applicable law, you may have rights of access, correction, deletion, restriction, portability, objection and withdrawal of consent. In Portugal, complaints may be made to the CNPD. Contact support@mynw.app.'],
          ['12. Website and support form','mynw.app does not use advertising trackers. Messages submitted through the support form are stored in the private NowWhat support inbox and may be forwarded by email so we can respond. Basic anti-abuse rate limiting is used for the public form.'],
          ['13. Children','The current version of NowWhat is intended for users aged 18 or older.'],
          ['14. Changes','We may update this policy as NowWhat changes. The current version is always published at https://mynw.app/privacy/.']
        ]
      },
      pt: {
        title:'Política de Privacidade', intro:'Esta política explica como o NowWhat trata informação quando utiliza a aplicação Android, este site, contas, análise de documentos por IA, transcrição de voz, Finanças, lembretes, calendário e suporte.',
        sections:[
          ['1. Responsável','O NowWhat App é desenvolvido por Maksym Smyrnov em Portugal. Site: https://mynw.app/. Suporte e contacto de privacidade: support@mynw.app.'],
          ['2. Informação fornecida','Consoante a funcionalidade, pode fornecer identificadores da conta e e-mail, documentos, fotografias, capturas, PDF, texto, links, gravações de voz, notas, movimentos financeiros, itens de talão, perguntas, feedback e pedidos de eliminação.'],
          ['3. Informação tratada para prestar funções','O NowWhat pode tratar texto extraído, datas, valores, contactos, moradas, referências de pagamento, resumos, lembretes, dados de calendário, itens/categorias de talão, orçamentos, faturas e subscrições quando necessário para a funcionalidade solicitada.'],
          ['4. Tratamento por IA','O conteúdo escolhido para funções de IA é enviado por ligação cifrada para o backend NowWhat e para prestadores de IA para a análise ou transcrição pedida. Os resultados podem estar incompletos ou errados e devem ser confirmados no original.'],
          ['5. Armazenamento local e documentos protegidos','Alguma informação permanece no dispositivo. Documentos importantes foram concebidos como arquivo local protegido. Identificadores de notificações e caminhos locais de áudio são específicos do dispositivo.'],
          ['6. Sincronização cloud','Em contas associadas e não anónimas, dados compatíveis da biblioteca, como notas, pastas, tarefas e definições, podem sincronizar via Supabase para restauro noutro dispositivo. No modo convidado, os dados podem permanecer sobretudo locais.'],
          ['7. Dados financeiros','Movimentos, itens de talão, categorias, resumos mensais e perguntas à IA são tratados apenas para fornecer as funções de Finanças utilizadas. O NowWhat não é banco nem serviço de pagamentos e não executa pagamentos.'],
          ['8. Prestadores','Os principais prestadores podem incluir Supabase, OpenAI API para processamento de IA; Google para login opcional/serviços Android e Resend para entrega de e-mails de serviço e suporte.'],
          ['9. Finalidades e bases legais','Tratamos dados para prestar funcionalidades, gerir contas, sincronizar dados compatíveis, responder ao suporte, proteger o serviço e cumprir obrigações legais. Para categorias especiais pode ser solicitado consentimento explícito quando exigido.'],
          ['10. Conservação e eliminação','Os dados são conservados apenas pelo tempo razoavelmente necessário. Pode eliminar histórico ou conta na aplicação. Eliminação externa: https://mynw.app/delete-account/.'],
          ['11. Direitos','Pode ter direitos de acesso, correção, apagamento, limitação, portabilidade, oposição e retirada do consentimento. Em Portugal pode reclamar junto da CNPD. Contacto: support@mynw.app.'],
          ['12. Site e formulário de suporte','mynw.app não usa trackers publicitários. As mensagens do formulário são guardadas na caixa privada NowWhat e podem ser encaminhadas por e-mail para permitir resposta. Existe limitação básica antiabuso.'],
          ['13. Menores','A versão atual do NowWhat destina-se a utilizadores com 18 ou mais anos.'],
          ['14. Alterações','Podemos atualizar esta política quando o produto mudar. A versão atual está sempre em https://mynw.app/privacy/.']
        ]
      },
      ru: {
        title:'Политика конфиденциальности', intro:'Эта политика объясняет, как NowWhat обрабатывает информацию при использовании Android-приложения, сайта, аккаунта, AI-анализа документов, расшифровки голоса, Финансов, напоминаний, календаря и поддержки.',
        sections:[
          ['1. Кто отвечает за данные','NowWhat App разрабатывает Maksym Smyrnov в Португалии. Сайт: https://mynw.app/. Поддержка и вопросы конфиденциальности: support@mynw.app.'],
          ['2. Какие данные вы предоставляете','В зависимости от функции это могут быть e-mail и идентификаторы аккаунта, документы, фото, скриншоты, PDF, текст, ссылки, голосовые записи, заметки, финансовые записи, позиции чеков, вопросы, обратная связь и запросы на удаление.'],
          ['3. Что обрабатывается для работы функций','NowWhat может обрабатывать извлечённый текст, даты, суммы, контакты, адреса, платёжные реквизиты, краткие выводы, напоминания, календарные данные, позиции и категории чеков, бюджеты, счета и подписки — когда это нужно для выбранной функции.'],
          ['4. AI-обработка','Контент, выбранный для AI-функций, передаётся по защищённому соединению в backend NowWhat и поставщикам AI для запрошенного анализа или расшифровки. AI может ошибаться, поэтому важные результаты нужно сверять с оригиналом.'],
          ['5. Локальное хранение и защищённые документы','Часть данных остаётся на устройстве. Важные документы предназначены для защищённого локального архива. Локальные идентификаторы уведомлений и пути к аудиофайлам зависят от конкретного устройства.'],
          ['6. Облачная синхронизация','Для привязанных неанонимных аккаунтов поддерживаемые данные библиотеки — заметки, папки, задачи и некоторые настройки — могут синхронизироваться через Supabase. В гостевом режиме данные могут оставаться преимущественно локальными.'],
          ['7. Финансовые данные','Операции, позиции чеков, категории, месячные сводки и AI-вопросы обрабатываются только для предоставления функций раздела Финансы. NowWhat не является банком или платёжным сервисом и не выполняет платежи.'],
          ['8. Поставщики','Основные поставщики могут включать Supabase, OpenAI API для AI-обработки; Google для опционального входа и Android-сервисов, а также Resend для служебной и поддерживающей электронной почты.'],
          ['9. Цели и правовые основания','Данные обрабатываются для работы функций, управления аккаунтом, синхронизации поддерживаемых данных, поддержки, безопасности и выполнения юридических обязанностей. Для специальных категорий данных при необходимости запрашивается явное согласие.'],
          ['10. Хранение и удаление','Данные хранятся только разумно необходимое время. Историю и аккаунт можно удалить в приложении. Внешнее удаление: https://mynw.app/delete-account/.'],
          ['11. Ваши права','В зависимости от закона вы можете иметь права на доступ, исправление, удаление, ограничение, переносимость, возражение и отзыв согласия. В Португалии надзорный орган — CNPD. Контакт: support@mynw.app.'],
          ['12. Сайт и форма поддержки','mynw.app не использует рекламные трекеры. Сообщения из формы сохраняются в приватном ящике NowWhat и могут автоматически пересылаться по e-mail для ответа. Для публичной формы действует базовое ограничение частоты отправок.'],
          ['13. Возраст','Текущая версия NowWhat предназначена для пользователей 18 лет и старше.'],
          ['14. Изменения','Политика может обновляться вместе с продуктом. Актуальная версия всегда опубликована на https://mynw.app/privacy/.']
        ]
      },
      fr: {
        title:'Politique de confidentialité', intro:'Cette politique explique comment NowWhat traite les informations lors de l’utilisation de l’app Android, du site, des comptes, de l’analyse IA, de la transcription vocale, des Finances, rappels, calendrier et assistance.',
        sections:[
          ['1. Responsable','NowWhat App est développé par Maksym Smyrnov au Portugal. Site : https://mynw.app/. Assistance et confidentialité : support@mynw.app.'],
          ['2. Informations fournies','Selon la fonction, vous pouvez fournir identifiants de compte et e-mail, documents, photos, captures, PDF, texte, liens, enregistrements vocaux, notes, données financières, articles de ticket, questions, feedback et demandes de suppression.'],
          ['3. Traitement pour les fonctions','NowWhat peut traiter texte extrait, dates, montants, contacts, adresses, références de paiement, résumés, rappels, calendrier, articles/catégories de ticket, budgets, factures et abonnements lorsque cela est nécessaire.'],
          ['4. Traitement IA','Le contenu choisi pour l’IA est transmis via une connexion chiffrée au backend NowWhat et aux prestataires IA pour l’analyse ou la transcription demandée. Les résultats peuvent être incomplets ou erronés et doivent être vérifiés.'],
          ['5. Stockage local et documents protégés','Certaines informations restent sur l’appareil. Les Documents importants sont conçus comme un coffre local protégé. Les identifiants de notifications et chemins audio locaux dépendent de l’appareil.'],
          ['6. Synchronisation cloud','Pour les comptes liés non anonymes, certaines données enregistrées — notes, dossiers, tâches et réglages — peuvent être synchronisées via Supabase. En mode invité, elles peuvent rester principalement locales.'],
          ['7. Données financières','Opérations, articles de ticket, catégories, résumés mensuels et questions IA sont traités uniquement pour les fonctions Finances. NowWhat n’est ni une banque ni un service de paiement et n’exécute aucun paiement.'],
          ['8. Prestataires','Les principaux prestataires peuvent inclure Supabase, OpenAI API pour le traitement IA ; Google pour la connexion facultative/services Android et Resend pour les e-mails de service et d’assistance.'],
          ['9. Finalités et bases légales','Les données servent à fournir les fonctions, gérer les comptes, synchroniser les données compatibles, répondre à l’assistance, protéger le service et respecter les obligations légales. Un consentement explicite peut être demandé pour certaines catégories.'],
          ['10. Conservation et suppression','Les données ne sont conservées que le temps raisonnablement nécessaire. L’historique et le compte peuvent être supprimés dans l’app. Suppression externe : https://mynw.app/delete-account/.'],
          ['11. Vos droits','Selon la loi, vous pouvez disposer de droits d’accès, rectification, effacement, limitation, portabilité, opposition et retrait du consentement. Au Portugal, l’autorité est la CNPD. Contact : support@mynw.app.'],
          ['12. Site et formulaire d’assistance','mynw.app n’utilise pas de trackers publicitaires. Les messages du formulaire sont stockés dans la boîte privée NowWhat et peuvent être transférés par e-mail afin de permettre une réponse. Une limitation anti-abus est appliquée.'],
          ['13. Âge','La version actuelle de NowWhat est destinée aux utilisateurs de 18 ans ou plus.'],
          ['14. Modifications','Cette politique peut évoluer avec le produit. La version actuelle reste disponible sur https://mynw.app/privacy/.']
        ]
      },
      es: {
        title:'Política de privacidad', intro:'Esta política explica cómo NowWhat trata la información al usar la app Android, este sitio, cuentas, análisis de documentos con IA, transcripción de voz, Finanzas, recordatorios, calendario y soporte.',
        sections:[
          ['1. Responsable','NowWhat App está desarrollado por Maksym Smyrnov en Portugal. Sitio: https://mynw.app/. Soporte y privacidad: support@mynw.app.'],
          ['2. Información que proporcionas','Según la función, puedes aportar identificadores de cuenta y e-mail, documentos, fotos, capturas, PDF, texto, enlaces, grabaciones de voz, notas, datos financieros, artículos de recibos, preguntas, feedback y solicitudes de eliminación.'],
          ['3. Información tratada para las funciones','NowWhat puede tratar texto extraído, fechas, importes, contactos, direcciones, referencias de pago, resúmenes, recordatorios, calendario, artículos/categorías de recibos, presupuestos, facturas y suscripciones cuando sea necesario.'],
          ['4. Tratamiento con IA','El contenido elegido para funciones de IA se envía mediante conexión cifrada al backend NowWhat y a proveedores de IA para el análisis o transcripción solicitados. Los resultados pueden ser incompletos o erróneos y deben verificarse.'],
          ['5. Almacenamiento local y documentos protegidos','Parte de la información permanece en el dispositivo. Documentos importantes está diseñado como un archivo local protegido. Los identificadores de notificaciones y rutas de audio son específicos del dispositivo.'],
          ['6. Sincronización cloud','En cuentas vinculadas no anónimas, datos compatibles como notas, carpetas, tareas y ajustes pueden sincronizarse mediante Supabase. En modo invitado, los datos pueden permanecer principalmente locales.'],
          ['7. Datos financieros','Operaciones, artículos de recibos, categorías, resúmenes mensuales y preguntas IA se tratan solo para ofrecer las funciones de Finanzas. NowWhat no es un banco ni un servicio de pagos y no ejecuta pagos.'],
          ['8. Proveedores','Los proveedores principales pueden incluir Supabase, OpenAI API para el procesamiento de IA; Google para inicio de sesión opcional/servicios Android y Resend para correo de servicio y soporte.'],
          ['9. Finalidades y bases legales','Tratamos datos para ofrecer funciones, gestionar cuentas, sincronizar datos compatibles, atender soporte, proteger el servicio y cumplir obligaciones legales. Puede solicitarse consentimiento explícito para categorías especiales.'],
          ['10. Conservación y eliminación','Los datos se conservan solo durante el tiempo razonablemente necesario. Puedes eliminar historial o cuenta en la app. Eliminación externa: https://mynw.app/delete-account/.'],
          ['11. Tus derechos','Según la ley aplicable, puedes tener derechos de acceso, rectificación, supresión, limitación, portabilidad, oposición y retirada del consentimiento. En Portugal la autoridad es la CNPD. Contacto: support@mynw.app.'],
          ['12. Sitio y formulario de soporte','mynw.app no usa trackers publicitarios. Los mensajes del formulario se guardan en el buzón privado de NowWhat y pueden reenviarse por e-mail para poder responder. Se aplica una limitación básica antiabuso.'],
          ['13. Edad','La versión actual de NowWhat está destinada a usuarios de 18 años o más.'],
          ['14. Cambios','Podemos actualizar esta política cuando cambie el producto. La versión actual siempre está en https://mynw.app/privacy/.']
        ]
      },
      uk: {
        title:'Політика конфіденційності', intro:'Ця політика пояснює, як NowWhat обробляє інформацію під час використання Android-застосунку, сайту, акаунта, AI-аналізу документів, транскрипції голосу, Фінансів, нагадувань, календаря та підтримки.',
        sections:[
          ['1. Хто відповідає за дані','NowWhat App розробляє Maksym Smyrnov у Португалії. Сайт: https://mynw.app/. Підтримка та конфіденційність: support@mynw.app.'],
          ['2. Які дані ви надаєте','Залежно від функції це можуть бути e-mail та ідентифікатори акаунта, документи, фото, скриншоти, PDF, текст, посилання, голосові записи, нотатки, фінансові записи, позиції чеків, запитання, відгуки та запити на видалення.'],
          ['3. Дані для роботи функцій','NowWhat може обробляти витягнутий текст, дати, суми, контакти, адреси, платіжні реквізити, підсумки, нагадування, календарні дані, позиції/категорії чеків, бюджети, рахунки та підписки, коли це потрібно.'],
          ['4. AI-обробка','Контент, вибраний для AI-функцій, передається захищеним з’єднанням у backend NowWhat і постачальникам AI для запитаного аналізу або транскрипції. AI може помилятися, тому важливі результати слід звіряти з оригіналом.'],
          ['5. Локальне зберігання та захищені документи','Частина даних залишається на пристрої. Важливі документи створені як захищений локальний архів. Локальні ідентифікатори сповіщень і шляхи до аудіофайлів залежать від пристрою.'],
          ['6. Хмарна синхронізація','Для прив’язаних неанонімних акаунтів підтримувані дані бібліотеки — нотатки, папки, завдання й налаштування — можуть синхронізуватися через Supabase. У гостьовому режимі дані можуть залишатися переважно локальними.'],
          ['7. Фінансові дані','Операції, позиції чеків, категорії, місячні підсумки й AI-запитання обробляються лише для функцій Фінансів. NowWhat не є банком або платіжним сервісом і не виконує платежі.'],
          ['8. Постачальники','Основні постачальники можуть включати Supabase, OpenAI API для AI-обробки; Google для опційного входу/Android-сервісів і Resend для службової та підтримуючої пошти.'],
          ['9. Цілі та правові підстави','Дані обробляються для роботи функцій, керування акаунтом, синхронізації, підтримки, безпеки та виконання юридичних обов’язків. Для спеціальних категорій за потреби запитується явна згода.'],
          ['10. Зберігання та видалення','Дані зберігаються лише розумно необхідний час. Історію та акаунт можна видалити в застосунку. Зовнішнє видалення: https://mynw.app/delete-account/.'],
          ['11. Ваші права','Залежно від закону ви можете мати права на доступ, виправлення, видалення, обмеження, переносимість, заперечення та відкликання згоди. У Португалії наглядовий орган — CNPD. Контакт: support@mynw.app.'],
          ['12. Сайт і форма підтримки','mynw.app не використовує рекламні трекери. Повідомлення з форми зберігаються у приватній скриньці NowWhat і можуть автоматично пересилатися e-mail для відповіді. Діє базове обмеження частоти.'],
          ['13. Вік','Поточна версія NowWhat призначена для користувачів від 18 років.'],
          ['14. Зміни','Політика може оновлюватися разом із продуктом. Актуальна версія завжди доступна на https://mynw.app/privacy/.']
        ]
      }
    },
    terms: {
      en:{title:'Terms of Use',intro:'These Terms govern use of NowWhat and its optional AI, account, Finance, reminders, calendar and document-management features.',sections:[
        ['1. Eligibility','You must be at least 18 years old to use the current version of NowWhat.'],
        ['2. Your content','You are responsible for the content you submit and for having the right to process it. Do not submit another person’s confidential data without a lawful basis.'],
        ['3. AI limitations','Recognition, transcription, summaries and answers are automatically generated and may be inaccurate, incomplete or misinterpret the source. Always verify consequential details against the original.'],
        ['4. Medical, legal and financial material','NowWhat is an assistive productivity tool and does not replace professional medical, legal, tax or financial advice.'],
        ['5. Payments','NowWhat is not a bank or payment provider. Payment details, QR codes, IBAN, Entity, Reference, amounts and recipients must be checked before you confirm anything in an external banking app.'],
        ['6. Finance features','Finance calculations and AI answers are based on the data stored in the app and may depend on how receipts and transactions were categorised. Review the underlying entries before relying on them.'],
        ['7. Accounts and synchronisation','An account is optional. If you link email or Google, supported saved data may synchronise through cloud services. You are responsible for maintaining access to your sign-in method and device.'],
        ['8. Third-party services','Some features depend on third-party services and APIs and may be subject to their terms, policies, availability and technical limits.'],
        ['9. Availability and changes','Features may be changed, added or removed. The service may be temporarily unavailable for maintenance, security or technical reasons.'],
        ['10. Future paid features','NowWhat may offer optional paid features or subscriptions. Price, billing period, renewal and cancellation terms will be shown before purchase and handled through the applicable store where required.'],
        ['11. Termination and deletion','You may stop using NowWhat at any time and can request account deletion in the app or at https://mynw.app/delete-account/.'],
        ['12. Contact','Questions about these Terms: support@mynw.app.']
      ]},
      pt:{title:'Termos de Utilização',intro:'Estes Termos regulam a utilização do NowWhat e das funcionalidades opcionais de IA, conta, Finanças, lembretes, calendário e gestão de documentos.',sections:[
        ['1. Elegibilidade','É necessário ter pelo menos 18 anos para utilizar a versão atual do NowWhat.'],
        ['2. O seu conteúdo','É responsável pelo conteúdo enviado e por ter o direito de o tratar. Não envie dados confidenciais de terceiros sem base legítima.'],
        ['3. Limitações da IA','Reconhecimento, transcrição, resumos e respostas são gerados automaticamente e podem estar errados ou incompletos. Confirme sempre informação importante no original.'],
        ['4. Conteúdo médico, jurídico e financeiro','O NowWhat é uma ferramenta auxiliar de produtividade e não substitui aconselhamento médico, jurídico, fiscal ou financeiro profissional.'],
        ['5. Pagamentos','O NowWhat não é banco nem prestador de pagamentos. Dados de pagamento, QR, IBAN, Entidade, Referência, valores e destinatários devem ser confirmados antes de qualquer operação externa.'],
        ['6. Funções de Finanças','Cálculos e respostas de IA dependem dos dados guardados e da categorização dos talões/movimentos. Reveja os registos antes de confiar neles.'],
        ['7. Contas e sincronização','A conta é opcional. Ao associar e-mail ou Google, dados compatíveis podem sincronizar pela cloud. É responsável por manter acesso ao método de login e ao dispositivo.'],
        ['8. Serviços de terceiros','Algumas funções dependem de serviços e APIs de terceiros e estão sujeitas aos respetivos termos, políticas, disponibilidade e limites técnicos.'],
        ['9. Disponibilidade e alterações','As funções podem mudar, ser adicionadas ou removidas. O serviço pode ficar temporariamente indisponível por manutenção, segurança ou motivos técnicos.'],
        ['10. Futuras funções pagas','O NowWhat poderá oferecer funções pagas ou subscrições. Preço, período, renovação e cancelamento serão mostrados antes da compra.'],
        ['11. Cessação e eliminação','Pode deixar de usar o NowWhat a qualquer momento e pedir eliminação na aplicação ou em https://mynw.app/delete-account/.'],
        ['12. Contacto','Questões sobre estes Termos: support@mynw.app.']
      ]},
      ru:{title:'Условия использования',intro:'Эти Условия регулируют использование NowWhat и его опциональных AI-функций, аккаунта, Финансов, напоминаний, календаря и работы с документами.',sections:[
        ['1. Возраст','Для текущей версии NowWhat пользователю должно быть не менее 18 лет.'],
        ['2. Ваш контент','Вы отвечаете за отправляемый контент и наличие права его обрабатывать. Не загружайте чужие конфиденциальные данные без законного основания.'],
        ['3. Ограничения AI','Распознавание, расшифровка, краткие выводы и ответы генерируются автоматически и могут быть неточными или неполными. Важные сведения всегда сверяйте с оригиналом.'],
        ['4. Медицинские, юридические и финансовые материалы','NowWhat — вспомогательный инструмент продуктивности и не заменяет профессиональную медицинскую, юридическую, налоговую или финансовую консультацию.'],
        ['5. Платежи','NowWhat не является банком или платёжным сервисом. QR, IBAN, Entidade, Referência, суммы, получателя и другие реквизиты нужно проверять до подтверждения во внешнем банковском приложении.'],
        ['6. Финансовые функции','Расчёты и AI-ответы зависят от сохранённых данных и категоризации чеков/операций. Перед важным решением проверяйте исходные записи.'],
        ['7. Аккаунт и синхронизация','Аккаунт необязателен. После привязки e-mail или Google поддерживаемые данные могут синхронизироваться через облако. Вы отвечаете за доступ к способу входа и устройству.'],
        ['8. Сторонние сервисы','Некоторые функции зависят от сторонних сервисов и API и подчиняются их условиям, политикам, доступности и техническим ограничениям.'],
        ['9. Доступность и изменения','Функции могут изменяться, добавляться или удаляться. Сервис может временно быть недоступен из-за обслуживания, безопасности или технических причин.'],
        ['10. Будущие платные функции','NowWhat может предложить платные функции или подписки. Цена, период, продление и отмена будут показаны до покупки.'],
        ['11. Прекращение использования и удаление','Вы можете перестать пользоваться NowWhat в любое время и удалить аккаунт в приложении или через https://mynw.app/delete-account/.'],
        ['12. Контакт','Вопросы по Условиям: support@mynw.app.']
      ]},
      fr:{title:'Conditions d’utilisation',intro:'Ces Conditions régissent l’utilisation de NowWhat et de ses fonctions facultatives d’IA, compte, Finances, rappels, calendrier et gestion de documents.',sections:[
        ['1. Éligibilité','Vous devez avoir au moins 18 ans pour utiliser la version actuelle de NowWhat.'],
        ['2. Votre contenu','Vous êtes responsable du contenu soumis et du droit de le traiter. Ne soumettez pas les données confidentielles d’autrui sans base légale.'],
        ['3. Limites de l’IA','Reconnaissance, transcription, résumés et réponses sont générés automatiquement et peuvent être inexacts ou incomplets. Vérifiez toujours les informations importantes.'],
        ['4. Contenu médical, juridique et financier','NowWhat est un outil de productivité et ne remplace pas un conseil professionnel médical, juridique, fiscal ou financier.'],
        ['5. Paiements','NowWhat n’est ni une banque ni un prestataire de paiement. Vérifiez QR, IBAN, Entidade, Referência, montants et bénéficiaires avant toute confirmation externe.'],
        ['6. Fonctions Finances','Les calculs et réponses IA dépendent des données enregistrées et de leur catégorisation. Vérifiez les opérations sources avant de vous y fier.'],
        ['7. Comptes et synchronisation','Le compte est facultatif. Après association d’un e-mail ou de Google, certaines données peuvent être synchronisées dans le cloud. Vous restez responsable de l’accès à votre méthode de connexion et appareil.'],
        ['8. Services tiers','Certaines fonctions dépendent de services/API tiers et de leurs conditions, politiques, disponibilité et limites techniques.'],
        ['9. Disponibilité et modifications','Les fonctions peuvent évoluer, être ajoutées ou supprimées. Le service peut être temporairement indisponible pour maintenance, sécurité ou raisons techniques.'],
        ['10. Fonctions payantes futures','NowWhat pourra proposer des fonctions payantes ou abonnements. Prix, période, renouvellement et annulation seront affichés avant achat.'],
        ['11. Arrêt et suppression','Vous pouvez arrêter d’utiliser NowWhat à tout moment et supprimer votre compte dans l’app ou via https://mynw.app/delete-account/.'],
        ['12. Contact','Questions sur ces Conditions : support@mynw.app.']
      ]},
      es:{title:'Términos de uso',intro:'Estos Términos regulan el uso de NowWhat y sus funciones opcionales de IA, cuenta, Finanzas, recordatorios, calendario y gestión de documentos.',sections:[
        ['1. Elegibilidad','Debes tener al menos 18 años para usar la versión actual de NowWhat.'],
        ['2. Tu contenido','Eres responsable del contenido que envías y de tener derecho a tratarlo. No envíes datos confidenciales de terceros sin base legal.'],
        ['3. Limitaciones de la IA','Reconocimiento, transcripción, resúmenes y respuestas se generan automáticamente y pueden ser inexactos o incompletos. Verifica siempre la información importante.'],
        ['4. Material médico, legal y financiero','NowWhat es una herramienta auxiliar de productividad y no sustituye asesoramiento médico, legal, fiscal o financiero profesional.'],
        ['5. Pagos','NowWhat no es un banco ni proveedor de pagos. Verifica QR, IBAN, Entidade, Referência, importes y destinatarios antes de confirmar nada en una app bancaria externa.'],
        ['6. Funciones de Finanzas','Los cálculos y respuestas IA dependen de los datos guardados y de cómo se categorizaron recibos y operaciones. Revisa los registros antes de depender de ellos.'],
        ['7. Cuentas y sincronización','La cuenta es opcional. Al vincular e-mail o Google, determinados datos pueden sincronizarse en la nube. Eres responsable de conservar acceso al método de inicio de sesión y dispositivo.'],
        ['8. Servicios de terceros','Algunas funciones dependen de servicios/API de terceros y de sus términos, políticas, disponibilidad y límites técnicos.'],
        ['9. Disponibilidad y cambios','Las funciones pueden cambiar, añadirse o eliminarse. El servicio puede estar temporalmente no disponible por mantenimiento, seguridad o razones técnicas.'],
        ['10. Funciones de pago futuras','NowWhat puede ofrecer funciones de pago o suscripciones. Precio, periodo, renovación y cancelación se mostrarán antes de la compra.'],
        ['11. Finalización y eliminación','Puedes dejar de usar NowWhat en cualquier momento y eliminar tu cuenta en la app o en https://mynw.app/delete-account/.'],
        ['12. Contacto','Preguntas sobre estos Términos: support@mynw.app.']
      ]},
      uk:{title:'Умови використання',intro:'Ці Умови регулюють використання NowWhat та його опційних AI-функцій, акаунта, Фінансів, нагадувань, календаря й роботи з документами.',sections:[
        ['1. Вік','Для поточної версії NowWhat користувачу має бути щонайменше 18 років.'],
        ['2. Ваш контент','Ви відповідаєте за наданий контент і право його обробляти. Не надсилайте чужі конфіденційні дані без законної підстави.'],
        ['3. Обмеження AI','Розпізнавання, транскрипція, підсумки та відповіді створюються автоматично й можуть бути неточними або неповними. Важливі дані завжди звіряйте з оригіналом.'],
        ['4. Медичні, юридичні та фінансові матеріали','NowWhat — допоміжний інструмент продуктивності й не замінює професійну медичну, юридичну, податкову чи фінансову консультацію.'],
        ['5. Платежі','NowWhat не є банком або платіжним сервісом. QR, IBAN, Entidade, Referência, суми та отримувачів треба перевіряти перед підтвердженням у зовнішньому банківському застосунку.'],
        ['6. Фінансові функції','Розрахунки та AI-відповіді залежать від збережених даних і категоризації чеків/операцій. Перевіряйте вихідні записи перед важливими рішеннями.'],
        ['7. Акаунти та синхронізація','Акаунт необов’язковий. Після прив’язки e-mail або Google підтримувані дані можуть синхронізуватися через хмару. Ви відповідаєте за доступ до способу входу й пристрою.'],
        ['8. Сторонні сервіси','Деякі функції залежать від сторонніх сервісів/API та їхніх умов, політик, доступності й технічних обмежень.'],
        ['9. Доступність і зміни','Функції можуть змінюватися, додаватися або видалятися. Сервіс може тимчасово бути недоступним через обслуговування, безпеку або технічні причини.'],
        ['10. Майбутні платні функції','NowWhat може запропонувати платні функції або підписки. Ціна, період, продовження та скасування будуть показані до покупки.'],
        ['11. Припинення використання та видалення','Ви можете припинити користування NowWhat будь-коли й видалити акаунт у застосунку або через https://mynw.app/delete-account/.'],
        ['12. Контакт','Питання щодо Умов: support@mynw.app.']
      ]}
    }
  };


  LEGAL.privacy.de = {
    title:"Datenschutzrichtlinie",
    intro:"Diese Richtlinie erklärt, wie NowWhat Informationen verarbeitet, wenn du die Android-App, diese Website, Kontofunktionen, AI-Dokumentanalyse, Sprachtranskription, Finanzen, Erinnerungen, Kalenderaktionen und Support nutzt.",
    sections:[
      ["1. Verantwortlicher","NowWhat App wird von Maksym Smyrnov in Portugal entwickelt. Website: https://mynw.app/. Support und Datenschutz: support@mynw.app."],
      ["2. Von dir bereitgestellte Informationen","Je nach Funktion kannst du Kontoidentifikatoren und E-Mail, Dokumente, Fotos, Screenshots, PDFs, Text, Links, Sprachaufnahmen, Notizen, Finanzeinträge, Belegpositionen, Fragen, Feedback und Löschanfragen bereitstellen."],
      ["3. Für Funktionen verarbeitete Informationen","NowWhat kann extrahierten Text, Daten, Beträge, Kontakte, Adressen, Zahlungsreferenzen, Zusammenfassungen, Erinnerungsdaten, Kalenderinformationen, Belegpositionen und Kategorien, Budgets, Rechnungen und Abos verarbeiten, wenn dies für die gewählte Funktion nötig ist."],
      ["4. AI-Verarbeitung","Für AI-Funktionen ausgewählte Inhalte werden verschlüsselt an das NowWhat-Backend und an die OpenAI API für die angeforderte Analyse oder Transkription übertragen. AI-Ergebnisse können unvollständig oder falsch sein und sollten mit der Originalquelle geprüft werden."],
      ["5. Lokaler Speicher und geschützte Dokumente","Einige Informationen bleiben auf deinem Gerät. Wichtige Dokumente sind als geschützter lokaler Tresor konzipiert. Lokale Benachrichtigungskennungen und Audiopfade sind gerätespezifisch."],
      ["6. Cloud-Synchronisierung","Bei verknüpften nicht anonymen Konten können unterstützte Bibliotheksdaten wie Notizen, Ordner, Aufgaben und ausgewählte Einstellungen über Supabase synchronisiert werden, damit sie auf einem anderen Gerät wiederhergestellt werden können. Im Gastmodus bleiben Daten möglicherweise überwiegend lokal."],
      ["7. Finanzdaten","Finanzeinträge, Belegpositionen, Kategorien, Monatsübersichten und AI-Fragen werden nur zur Bereitstellung der von dir verwendeten Finanzfunktionen verarbeitet. NowWhat ist keine Bank und kein Zahlungsdienst und führt keine Zahlungen aus."],
      ["8. Dienstanbieter","Zu den wichtigsten Anbietern können Supabase für Authentifizierung, Datenbank und Backend-Infrastruktur; OpenAI API für angeforderte AI-Analyse und Transkription; Google für optionale Anmeldung und Android-Dienste sowie Resend für Service-/Support-E-Mails gehören."],
      ["9. Zwecke und Rechtsgrundlagen","Wir verarbeiten Informationen, um angeforderte Funktionen bereitzustellen, Konten zu verwalten, unterstützte Daten zu synchronisieren, Support zu leisten, den Dienst zu schützen und rechtliche Pflichten zu erfüllen. Für besondere Kategorien kann erforderlichenfalls eine ausdrückliche Einwilligung angefordert werden."],
      ["10. Aufbewahrung und Löschung","Daten werden nur so lange aufbewahrt, wie dies für Dienst, Sicherheit, Support, rechtliche Pflichten oder Streitigkeiten angemessen erforderlich ist. Verlauf oder Konto können in der App gelöscht werden. Externe Löschung: https://mynw.app/delete-account/."],
      ["11. Deine Rechte","Je nach geltendem Recht kannst du Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit, Widerspruch und Widerruf der Einwilligung haben. In Portugal können Beschwerden bei der CNPD eingereicht werden. Kontakt: support@mynw.app."],
      ["12. Website und Supportformular","mynw.app verwendet keine Werbetracker. Nachrichten über das Supportformular werden im privaten NowWhat-Supportpostfach gespeichert und können per E-Mail weitergeleitet werden, damit wir antworten können. Für das öffentliche Formular wird eine grundlegende Missbrauchsbegrenzung eingesetzt."],
      ["13. Kinder","Die aktuelle Version von NowWhat ist für Personen ab 18 Jahren bestimmt."],
      ["14. Änderungen","Wir können diese Richtlinie aktualisieren, wenn sich NowWhat ändert. Die aktuelle Version wird stets unter https://mynw.app/privacy/ veröffentlicht."]
    ]
  };
  LEGAL.privacy.it = {
    title:"Informativa sulla privacy",
    intro:"Questa informativa spiega come NowWhat tratta le informazioni quando usi l'app Android, questo sito, le funzioni account, l'analisi AI dei documenti, la trascrizione vocale, Finanze, promemoria, calendario e supporto.",
    sections:[
      ["1. Titolare","NowWhat App è sviluppata da Maksym Smyrnov in Portogallo. Sito: https://mynw.app/. Supporto e privacy: support@mynw.app."],
      ["2. Informazioni fornite","A seconda della funzione puoi fornire identificativi account ed e-mail, documenti, foto, screenshot, PDF, testo, link, registrazioni vocali, note, movimenti finanziari, voci di scontrino, domande, feedback e richieste di eliminazione."],
      ["3. Informazioni trattate per le funzioni","NowWhat può trattare testo estratto, date, importi, contatti, indirizzi, riferimenti di pagamento, riepiloghi, dati dei promemoria, informazioni del calendario, voci/categorie degli scontrini, budget, fatture e abbonamenti quando necessario per la funzione richiesta."],
      ["4. Trattamento AI","I contenuti selezionati per funzioni AI vengono inviati tramite connessione cifrata al backend NowWhat e all'API OpenAI per l'analisi o la trascrizione richiesta. I risultati AI possono essere incompleti o errati e vanno verificati con la fonte originale."],
      ["5. Archiviazione locale e documenti protetti","Alcune informazioni restano sul dispositivo. Documenti importanti è progettato come archivio locale protetto. Identificativi locali delle notifiche e percorsi audio sono specifici del dispositivo."],
      ["6. Sincronizzazione cloud","Per account collegati non anonimi, dati supportati della libreria come note, cartelle, attività e impostazioni selezionate possono sincronizzarsi tramite Supabase per essere ripristinati su un altro dispositivo. In modalità ospite i dati possono rimanere soprattutto locali."],
      ["7. Dati finanziari","Movimenti finanziari, voci di scontrino, categorie, riepiloghi mensili e domande AI vengono trattati solo per fornire le funzioni Finanze utilizzate. NowWhat non è una banca o un servizio di pagamento e non esegue pagamenti."],
      ["8. Fornitori","I principali fornitori possono includere Supabase per autenticazione, database e backend; API OpenAI per analisi AI e trascrizione richieste; Google per accesso facoltativo e servizi Android; Resend per e-mail di servizio/supporto."],
      ["9. Finalità e basi giuridiche","Trattiamo informazioni per fornire le funzioni richieste, gestire gli account, sincronizzare dati supportati, rispondere al supporto, proteggere il servizio e adempiere agli obblighi di legge. Per categorie particolari può essere richiesto consenso esplicito quando necessario."],
      ["10. Conservazione ed eliminazione","I dati sono conservati solo per il tempo ragionevolmente necessario al servizio, sicurezza, supporto, obblighi legali o controversie. Puoi eliminare cronologia o account nell'app. Eliminazione esterna: https://mynw.app/delete-account/."],
      ["11. I tuoi diritti","A seconda della legge applicabile puoi avere diritti di accesso, rettifica, cancellazione, limitazione, portabilità, opposizione e revoca del consenso. In Portogallo puoi presentare reclamo alla CNPD. Contatto: support@mynw.app."],
      ["12. Sito e modulo di supporto","mynw.app non usa tracker pubblicitari. I messaggi inviati dal modulo sono salvati nella casella privata del supporto NowWhat e possono essere inoltrati via e-mail per consentirci di rispondere. È presente una limitazione di base anti-abuso."],
      ["13. Minori","La versione attuale di NowWhat è destinata a utenti di almeno 18 anni."],
      ["14. Modifiche","Possiamo aggiornare questa informativa quando NowWhat cambia. La versione attuale è sempre pubblicata su https://mynw.app/privacy/."]
    ]
  };
  LEGAL.terms.de = {
    title:"Nutzungsbedingungen",
    intro:"Diese Bedingungen regeln die Nutzung von NowWhat und seinen optionalen AI-, Konto-, Finanz-, Erinnerungs-, Kalender- und Dokumentverwaltungsfunktionen.",
    sections:[
      ["1. Berechtigung","Du musst mindestens 18 Jahre alt sein, um die aktuelle Version von NowWhat zu verwenden."],
      ["2. Deine Inhalte","Du bist für die eingereichten Inhalte und dafür verantwortlich, dass du sie rechtmäßig verarbeiten darfst. Reiche keine vertraulichen Daten anderer Personen ohne Rechtsgrundlage ein."],
      ["3. Grenzen der AI","Erkennung, Transkription, Zusammenfassungen und Antworten werden automatisch erzeugt und können ungenau, unvollständig oder fehlinterpretiert sein. Prüfe folgenreiche Angaben immer mit dem Original."],
      ["4. Medizinische, rechtliche und finanzielle Inhalte","NowWhat ist ein unterstützendes Produktivitätswerkzeug und ersetzt keine professionelle medizinische, rechtliche, steuerliche oder finanzielle Beratung."],
      ["5. Zahlungen","NowWhat ist keine Bank und kein Zahlungsanbieter. Zahlungsdaten, QR-Codes, IBAN, Entity, Reference, Beträge und Empfänger müssen geprüft werden, bevor du etwas in einer externen Banking-App bestätigst."],
      ["6. Finanzfunktionen","Berechnungen und AI-Antworten basieren auf den in der App gespeicherten Daten und können von der Kategorisierung von Belegen und Buchungen abhängen. Prüfe die zugrunde liegenden Einträge."],
      ["7. Konten und Synchronisierung","Ein Konto ist optional. Wenn du E-Mail oder Google verknüpfst, können unterstützte gespeicherte Daten über Cloud-Dienste synchronisiert werden. Du bist dafür verantwortlich, Zugriff auf deine Anmeldemethode und dein Gerät zu behalten."],
      ["8. Dienste Dritter","Einige Funktionen hängen von Diensten und APIs Dritter ab und können deren Bedingungen, Richtlinien, Verfügbarkeit und technischen Grenzen unterliegen."],
      ["9. Verfügbarkeit und Änderungen","Funktionen können geändert, hinzugefügt oder entfernt werden. Der Dienst kann wegen Wartung, Sicherheit oder technischen Gründen vorübergehend nicht verfügbar sein."],
      ["10. Zukünftige kostenpflichtige Funktionen","NowWhat kann optionale kostenpflichtige Funktionen oder Abos anbieten. Preis, Abrechnungszeitraum, Verlängerung und Kündigung werden vor dem Kauf angezeigt."],
      ["11. Beendigung und Löschung","Du kannst NowWhat jederzeit nicht mehr nutzen und die Kontolöschung in der App oder unter https://mynw.app/delete-account/ beantragen."],
      ["12. Kontakt","Fragen zu diesen Bedingungen: support@mynw.app."]
    ]
  };
  LEGAL.terms.it = {
    title:"Termini di utilizzo",
    intro:"Questi Termini regolano l'uso di NowWhat e delle funzioni opzionali AI, account, Finanze, promemoria, calendario e gestione documenti.",
    sections:[
      ["1. Idoneità","Devi avere almeno 18 anni per usare la versione attuale di NowWhat."],
      ["2. I tuoi contenuti","Sei responsabile dei contenuti che invii e del diritto di trattarli. Non inviare dati riservati di altre persone senza una base giuridica."],
      ["3. Limiti dell'AI","Riconoscimento, trascrizione, riepiloghi e risposte sono generati automaticamente e possono essere imprecisi, incompleti o interpretare male la fonte. Verifica sempre i dettagli importanti con l'originale."],
      ["4. Materiale medico, legale e finanziario","NowWhat è uno strumento di produttività di supporto e non sostituisce consulenza professionale medica, legale, fiscale o finanziaria."],
      ["5. Pagamenti","NowWhat non è una banca né un fornitore di pagamenti. Dati di pagamento, QR, IBAN, Entity, Reference, importi e destinatari devono essere controllati prima di confermare qualsiasi cosa in un'app bancaria esterna."],
      ["6. Funzioni Finanze","Calcoli e risposte AI si basano sui dati salvati nell'app e possono dipendere da come scontrini e movimenti sono stati categorizzati. Controlla le voci di origine prima di fare affidamento sui risultati."],
      ["7. Account e sincronizzazione","L'account è facoltativo. Collegando e-mail o Google, i dati supportati possono sincronizzarsi tramite servizi cloud. Sei responsabile di mantenere accesso al metodo di login e al dispositivo."],
      ["8. Servizi di terze parti","Alcune funzioni dipendono da servizi e API di terzi e possono essere soggette ai loro termini, politiche, disponibilità e limiti tecnici."],
      ["9. Disponibilità e modifiche","Le funzioni possono cambiare, essere aggiunte o rimosse. Il servizio può essere temporaneamente non disponibile per manutenzione, sicurezza o motivi tecnici."],
      ["10. Future funzioni a pagamento","NowWhat può offrire funzioni o abbonamenti a pagamento facoltativi. Prezzo, periodo, rinnovo e cancellazione saranno mostrati prima dell'acquisto."],
      ["11. Cessazione ed eliminazione","Puoi smettere di usare NowWhat in qualsiasi momento e richiedere l'eliminazione dell'account nell'app o su https://mynw.app/delete-account/."],
      ["12. Contatti","Domande su questi Termini: support@mynw.app."]
    ]
  };

  // Baseline 3 legal addendum: Family Space, optional push, calendar import
  // and privacy-preserving AI reliability telemetry.
  const BASELINE3_LEGAL = {
    en: {
      privacy: [
        ["15. Family Space and push notifications","Content you place in Family Space is stored in Supabase and is visible to invited members of that Family Space. Member profiles may include a display name and chosen photo/avatar. Reporting and blocking controls are available; reports are stored separately for review and are not shown to other members. Family push notifications are off by default. If you enable them, Firebase Cloud Messaging is initialized and an FCM device token, platform, locale and last-seen time are stored to deliver requested notifications."],
        ["16. Calendar import and technical telemetry","Calendar import runs only when you request it and grant Android permission. Imported events may be stored in the NowWhat library and synchronized for a linked account. AI reliability telemetry stores technical fields such as function, provider/model, success, latency, token counts and a short error code, but not prompts, document text, filenames, email addresses or user IDs."]
      ],
      terms: ["13. Family user-generated content","Family Space is for sharing content between invited adult users. Do not post illegal, threatening, abusive, fraudulent or spam content, material that violates another person's rights or privacy, or content you are not entitled to share. Use the built-in Report and Block controls if another member violates these rules. NowWhat may restrict or remove content or access where reasonably necessary for safety, legal compliance or enforcement of these Terms."]
    },
    pt: {
      privacy: [
        ["15. Espaço familiar e notificações push","O conteúdo colocado no Espaço familiar é guardado no Supabase e fica visível aos membros convidados desse espaço. Os perfis podem incluir nome apresentado e fotografia/avatar escolhido. Existem controlos de denúncia e bloqueio; as denúncias são guardadas separadamente para análise e não são mostradas aos outros membros. As notificações push da Família estão desativadas por defeito. Se as ativar, o Firebase Cloud Messaging é inicializado e são guardados token FCM, plataforma, idioma e hora da última atualização para entregar as notificações pedidas."],
        ["16. Importação de calendário e telemetria técnica","A importação do calendário só é executada quando a solicita e concede permissão Android. Os eventos importados podem ser guardados na biblioteca NowWhat e sincronizados numa conta associada. A telemetria de fiabilidade da IA guarda função, fornecedor/modelo, sucesso, latência, contagens de tokens e código curto de erro, mas não prompts, texto de documentos, nomes de ficheiros, e-mail nem ID de utilizador."]
      ],
      terms: ["13. Conteúdo criado por utilizadores na Família","O Espaço familiar destina-se à partilha de conteúdo entre utilizadores adultos convidados. Não publique conteúdo ilegal, ameaçador, abusivo, fraudulento ou spam, conteúdo que viole direitos ou privacidade de terceiros, nem material que não tenha direito de partilhar. Utilize os controlos Denunciar e Bloquear se outro membro violar estas regras. O NowWhat pode restringir ou remover conteúdo ou acesso quando razoavelmente necessário para segurança, cumprimento legal ou aplicação destes Termos."]
    },
    ru: {
      privacy: [
        ["15. Семейное пространство и push-уведомления","Контент, который вы помещаете в Family Space, хранится в Supabase и виден приглашённым участникам этого пространства. Профиль может содержать отображаемое имя и выбранное фото/аватар. Доступны жалобы и блокировка; жалобы хранятся отдельно для проверки и не показываются другим участникам. Семейные push-уведомления выключены по умолчанию. Если вы их включаете, инициализируется Firebase Cloud Messaging и сохраняются FCM-токен устройства, платформа, язык и время последнего обновления для доставки уведомлений."],
        ["16. Импорт календаря и техническая телеметрия","Импорт календаря запускается только по вашему запросу и после разрешения Android. Импортированные события могут храниться в библиотеке NowWhat и синхронизироваться для привязанного аккаунта. Телеметрия надёжности AI хранит функцию, поставщика/модель, успешность, задержку, количество токенов и краткий код ошибки, но не prompt, текст документа, имя файла, e-mail или user ID."]
      ],
      terms: ["13. Семейный пользовательский контент","Family Space предназначен для обмена контентом между приглашёнными взрослыми пользователями. Нельзя публиковать незаконный, угрожающий, оскорбительный, мошеннический или спам-контент, материалы, нарушающие чужие права или конфиденциальность, либо контент, которым вы не вправе делиться. Используйте встроенные функции «Пожаловаться» и «Заблокировать». NowWhat может ограничить или удалить контент или доступ, когда это разумно необходимо для безопасности, соблюдения закона или этих Условий."]
    },
    fr: {
      privacy: [
        ["15. Espace familial et notifications push","Le contenu placé dans l’Espace familial est stocké dans Supabase et visible par les membres invités. Les profils peuvent inclure un nom affiché et une photo/un avatar choisi. Des contrôles de signalement et de blocage sont disponibles ; les signalements sont conservés séparément pour examen. Les notifications push Famille sont désactivées par défaut. Si vous les activez, Firebase Cloud Messaging est initialisé et un jeton FCM, la plateforme, la langue et l’heure de dernière mise à jour sont stockés pour livrer les notifications demandées."],
        ["16. Importation du calendrier et télémétrie technique","L’importation du calendrier ne s’exécute que sur votre demande et après autorisation Android. Les événements importés peuvent être stockés dans la bibliothèque NowWhat et synchronisés pour un compte lié. La télémétrie de fiabilité IA conserve fonction, fournisseur/modèle, succès, latence, nombre de jetons et code d’erreur court, mais pas les prompts, le texte des documents, noms de fichiers, e-mails ou identifiants utilisateur."]
      ],
      terms: ["13. Contenu familial créé par les utilisateurs","L’Espace familial sert au partage entre utilisateurs adultes invités. Ne publiez pas de contenu illégal, menaçant, abusif, frauduleux ou indésirable, ni de contenu portant atteinte aux droits ou à la vie privée d’autrui ou que vous n’avez pas le droit de partager. Utilisez Signaler et Bloquer en cas de violation. NowWhat peut restreindre ou supprimer du contenu ou l’accès lorsque cela est raisonnablement nécessaire pour la sécurité, la loi ou l’application de ces Conditions."]
    },
    es: {
      privacy: [
        ["15. Espacio familiar y notificaciones push","El contenido que colocas en el Espacio familiar se guarda en Supabase y es visible para los miembros invitados. Los perfiles pueden incluir nombre visible y foto/avatar elegido. Hay controles de denuncia y bloqueo; las denuncias se guardan por separado para revisión. Las notificaciones push de Familia están desactivadas por defecto. Si las activas, se inicializa Firebase Cloud Messaging y se guarda un token FCM, plataforma, idioma y hora de última actualización para entregar las notificaciones solicitadas."],
        ["16. Importación de calendario y telemetría técnica","La importación del calendario solo se ejecuta cuando la solicitas y con permiso Android. Los eventos importados pueden guardarse en la biblioteca NowWhat y sincronizarse para una cuenta vinculada. La telemetría de fiabilidad de IA guarda función, proveedor/modelo, éxito, latencia, recuentos de tokens y un código de error breve, pero no prompts, texto de documentos, nombres de archivo, e-mail ni ID de usuario."]
      ],
      terms: ["13. Contenido familiar generado por usuarios","El Espacio familiar permite compartir contenido entre usuarios adultos invitados. No publiques contenido ilegal, amenazante, abusivo, fraudulento o spam, material que vulnere derechos o privacidad de terceros, ni contenido que no tengas derecho a compartir. Usa Denunciar y Bloquear si otro miembro incumple estas reglas. NowWhat puede restringir o eliminar contenido o acceso cuando sea razonablemente necesario por seguridad, cumplimiento legal o aplicación de estos Términos."]
    },
    uk: {
      privacy: [
        ["15. Сімейний простір і push-сповіщення","Контент, який ви додаєте до Сімейного простору, зберігається в Supabase і видимий запрошеним учасникам. Профіль може містити відображуване ім’я та вибране фото/аватар. Доступні скарги й блокування; скарги зберігаються окремо для перевірки. Сімейні push-сповіщення вимкнені за замовчуванням. Якщо ви їх увімкнете, ініціалізується Firebase Cloud Messaging і зберігаються FCM-токен, платформа, мова та час останнього оновлення для доставки сповіщень."],
        ["16. Імпорт календаря і технічна телеметрія","Імпорт календаря запускається лише на ваш запит і після дозволу Android. Імпортовані події можуть зберігатися в бібліотеці NowWhat і синхронізуватися для прив’язаного акаунта. Телеметрія надійності AI зберігає функцію, постачальника/модель, успішність, затримку, кількість токенів і короткий код помилки, але не prompts, текст документів, назви файлів, e-mail або ID користувача."]
      ],
      terms: ["13. Сімейний користувацький контент","Сімейний простір призначений для обміну контентом між запрошеними повнолітніми користувачами. Заборонено незаконний, погрозливий, образливий, шахрайський або спам-контент, матеріали, що порушують права чи приватність інших, або контент, яким ви не маєте права ділитися. Використовуйте «Поскаржитися» та «Заблокувати». NowWhat може обмежити або видалити контент чи доступ, коли це обґрунтовано потрібно для безпеки, дотримання закону або цих Умов."]
    },
    de: {
      privacy: [
        ["15. Familienbereich und Push-Benachrichtigungen","Inhalte im Familienbereich werden in Supabase gespeichert und sind für eingeladene Mitglieder sichtbar. Profile können Anzeigename und ausgewähltes Foto/Avatar enthalten. Melde- und Blockierfunktionen stehen zur Verfügung; Meldungen werden getrennt zur Prüfung gespeichert. Familien-Push ist standardmäßig deaktiviert. Nach Aktivierung wird Firebase Cloud Messaging initialisiert und FCM-Token, Plattform, Sprache und letzter Aktualisierungszeitpunkt werden zur Zustellung gespeichert."],
        ["16. Kalenderimport und technische Telemetrie","Der Kalenderimport läuft nur auf deine Anfrage und nach Android-Berechtigung. Importierte Termine können in der NowWhat-Bibliothek gespeichert und bei einem verknüpften Konto synchronisiert werden. AI-Zuverlässigkeitstelemetrie speichert Funktion, Anbieter/Modell, Erfolg, Latenz, Tokenzahlen und kurzen Fehlercode, jedoch keine Prompts, Dokumenttexte, Dateinamen, E-Mail-Adressen oder Benutzer-IDs."]
      ],
      terms: ["13. Nutzergenerierte Inhalte im Familienbereich","Der Familienbereich dient dem Austausch zwischen eingeladenen erwachsenen Nutzern. Veröffentliche keine illegalen, bedrohlichen, beleidigenden, betrügerischen oder Spam-Inhalte, keine Inhalte, die Rechte oder Privatsphäre anderer verletzen, und nichts, das du nicht teilen darfst. Nutze Melden und Blockieren bei Verstößen. NowWhat kann Inhalte oder Zugriff einschränken oder entfernen, wenn dies für Sicherheit, Rechtsbefolgung oder Durchsetzung dieser Bedingungen angemessen erforderlich ist."]
    },
    it: {
      privacy: [
        ["15. Spazio famiglia e notifiche push","I contenuti inseriti nello Spazio famiglia sono archiviati in Supabase e visibili ai membri invitati. I profili possono includere nome visualizzato e foto/avatar scelto. Sono disponibili segnalazione e blocco; le segnalazioni sono conservate separatamente per la revisione. Le notifiche push Famiglia sono disattivate per impostazione predefinita. Se le attivi, viene inizializzato Firebase Cloud Messaging e vengono salvati token FCM, piattaforma, lingua e ultimo aggiornamento per consegnare le notifiche richieste."],
        ["16. Importazione calendario e telemetria tecnica","L’importazione del calendario viene eseguita solo su tua richiesta e dopo il permesso Android. Gli eventi importati possono essere salvati nella libreria NowWhat e sincronizzati per un account collegato. La telemetria di affidabilità AI salva funzione, fornitore/modello, successo, latenza, conteggi token e breve codice errore, ma non prompt, testo dei documenti, nomi file, e-mail o ID utente."]
      ],
      terms: ["13. Contenuti familiari generati dagli utenti","Lo Spazio famiglia consente la condivisione tra utenti adulti invitati. Non pubblicare contenuti illegali, minacciosi, offensivi, fraudolenti o spam, materiale che violi diritti o privacy altrui o contenuti che non hai diritto di condividere. Usa Segnala e Blocca in caso di violazione. NowWhat può limitare o rimuovere contenuti o accesso quando ragionevolmente necessario per sicurezza, conformità legale o applicazione dei Termini."]
    }
  };
  Object.entries(BASELINE3_LEGAL).forEach(([code, addendum]) => {
    if (LEGAL.privacy[code]) LEGAL.privacy[code].sections.push(...addendum.privacy);
    if (LEGAL.terms[code]) LEGAL.terms[code].sections.push(addendum.terms);
  });

  function getLang() {
    const saved = localStorage.getItem('nw_lang');
    if (SUPPORTED.includes(saved)) return saved;
    const raw = (navigator.language || 'en').toLowerCase();
    if (raw.startsWith('pt')) return 'pt';
    if (raw.startsWith('ru')) return 'ru';
    if (raw.startsWith('fr')) return 'fr';
    if (raw.startsWith('es')) return 'es';
    if (raw.startsWith('uk')) return 'uk';
    if (raw.startsWith('de')) return 'de';
    if (raw.startsWith('it')) return 'it';
    return 'en';
  }

  let lang = getLang();

  function t(key) {
    return S[lang]?.[key] ?? S.en[key] ?? key;
  }

  function applyText() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = t(key);
      if (value != null) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = t(key);
      if (value != null) el.setAttribute('placeholder', value);
    });
    const titleKey = document.body.dataset.titleKey;
    if (titleKey) document.title = t(titleKey);
    const select = document.getElementById('langSelect');
    if (select) select.value = lang;
  }

  function renderLegal() {
    const host = document.querySelector('[data-legal]');
    if (!host) return;
    const type = host.getAttribute('data-legal');
    const data = LEGAL[type]?.[lang] ?? LEGAL[type]?.en;
    if (!data) return;
    const h1 = document.getElementById('legalTitle');
    const intro = document.getElementById('legalIntro');
    const sections = document.getElementById('legalSections');
    if (h1) h1.textContent = data.title;
    document.title = data.title + ' — NowWhat';
    if (intro) intro.textContent = data.intro;
    if (sections) {
      sections.innerHTML = data.sections.map(([h,b]) => '<section><h2>'+h+'</h2><p>'+linkify(b)+'</p></section>').join('');
    }
  }

  function linkify(text) {
    return text
      .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
      .replace(/(https:\/\/mynw\.app\/[A-Za-z0-9_\-\/]*|support@mynw\.app)/g, (m) => {
        if (m.includes('@')) return '<a href="mailto:'+m+'">'+m+'</a>';
        return '<a href="'+m+'">'+m+'</a>';
      });
  }

  function setLanguage(next) {
    if (!SUPPORTED.includes(next)) return;
    lang = next;
    localStorage.setItem('nw_lang', lang);
    applyText();
    renderLegal();
    window.dispatchEvent(new CustomEvent('nw:language', { detail: { lang } }));
  }

  function setupHeader() {
    const menu = document.querySelector('.menu');
    const nav = document.querySelector('nav');
    menu?.addEventListener('click', () => nav?.classList.toggle('open'));
    document.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', () => nav?.classList.remove('open')));
    const select = document.getElementById('langSelect');
    if (select) {
      select.innerHTML = SUPPORTED.map((code) => '<option value="'+code+'">'+LANGUAGE_LABELS[code]+'</option>').join('');
      select.value = lang;
      select.addEventListener('change', (e) => setLanguage(e.target.value));
    }
  }

  function setupFeedbackForm() {
    const form = document.getElementById('feedbackForm');
    if (!form) return;
    const submit = form.querySelector('button[type="submit"]');
    const status = document.getElementById('formStatus');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const message = String(data.get('message') || '').trim();
      const email = String(data.get('email') || '').trim();
      if (message.length < 3) return;

      submit.disabled = true;
      const original = t('support_send');
      submit.textContent = t('form_sending');
      status.className = 'form-status';
      status.textContent = '';

      try {
        const res = await fetch(FEEDBACK_ENDPOINT, {
          method:'POST',
          headers:{'Content-Type':'application/json','apikey':PUBLIC_KEY},
          body:JSON.stringify({
            name:String(data.get('name') || '').trim(),
            email,
            topic:String(data.get('topic') || 'support'),
            message,
            locale:lang,
            page:location.href,
            company:String(data.get('company') || '')
          })
        });
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) throw new Error('rate');
        if (!res.ok && res.status !== 202) throw new Error('send');
        status.className = 'form-status ok';
        status.textContent = res.status === 202 || body.emailed === false ? t('form_queued') : t('form_success');
        form.reset();
      } catch (error) {
        status.className = 'form-status error';
        status.textContent = error?.message === 'rate' ? t('form_rate') : t('form_error');
      } finally {
        submit.disabled = false;
        submit.textContent = original;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupHeader();
    applyText();
    renderLegal();
    setupFeedbackForm();
  });
})();