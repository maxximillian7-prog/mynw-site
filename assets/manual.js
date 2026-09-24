(() => {
  const M = {
    en: {
      title: "NowWhat Manual",
      intro: "A practical guide to the main NowWhat features. Choose a section on the left or scroll through the guide.",
      sections: [
        ["Getting started", ["Choose the interface language in Settings.", "Use guest mode or sign in with email/Google for account recovery and supported cloud sync.", "Home gives quick access to document recognition, Daily Briefing, calendar and your main actions."]],
        ["Documents & AI", ["Add a photo, screenshot, PDF, QR or a file shared from another app.", "NowWhat extracts the important information and suggests actions such as calendar, reminder, reply, call, map or payment details.", "Use Ask about document for follow-up questions. Always verify important dates, amounts and payment details against the source."]],
        ["Saved, notes & voice", ["Create notes manually or record voice and transcribe it.", "Turn text into tasks, shopping lists, reminders and calendar events.", "Organise items into folders with custom colours, icons and styles."]],
        ["Important Documents", ["Store sensitive local files in the protected area with PIN or biometrics.", "Analysis starts only after your confirmation.", "Rename, share, organise and delete documents from the document details screen."]],
        ["Calendar & reminders", ["Tap a date to see that day's schedule.", "Use Today to return to the current day.", "Detected dates can be added to the calendar or turned into reminders. The Today & upcoming Home block can be enabled in Settings."]],
        ["Finance", ["Record expenses and income, scan receipts, track budgets, bills and subscriptions.", "Ask about finances by text or voice and review monthly archives.", "If receipt data is unclear, NowWhat should leave it for manual review instead of inventing a merchant or total."]],
        ["Family Space", ["Share notes, documents, tasks, shopping lists, events, receipts and finance entries with family members.", "Invite people with a one-time code or QR. New shared items appear in Inbox.", "Long-press a member for member actions. Family access can be controlled per item."]],
        ["Daily Briefing & Auto Rules", ["Daily Briefing collects the most relevant tasks and events for the day.", "Auto Rules can sort content, suggest actions and create useful reminders.", "Review automation suggestions before relying on them for important information."]],
        ["Appearance & languages", ["Choose light/dark mode, accent colour and the global visual style.", "NowWhat supports English, Portuguese, Russian, French, Spanish, Ukrainian, German and Italian.", "System folder names follow the selected language; your own folder names stay unchanged."]],
        ["Account, privacy & safety", ["Account settings include synchronisation, data cleanup and account deletion.", "Protected local documents stay behind device security.", "AI can be incomplete or wrong. NowWhat does not execute bank payments and does not replace professional medical, legal, tax or financial advice."]]
      ]
    },
    ru: {
      title: "Руководство NowWhat",
      intro: "Краткое практическое руководство по основным функциям NowWhat. Выберите раздел слева или просто листайте страницу.",
      sections: [
        ["Начало работы", ["Выберите язык интерфейса в Настройках.", "Можно использовать гостевой режим или войти через e-mail/Google для восстановления аккаунта и поддерживаемой облачной синхронизации.", "На главном экране находятся распознавание документов, Daily Briefing, календарь и основные действия."]],
        ["Документы и AI", ["Добавьте фото, скриншот, PDF, QR или файл, отправленный из другого приложения.", "NowWhat выделит главное и предложит действия: календарь, напоминание, ответ, звонок, карта или работа с платёжными реквизитами.", "Используйте «Спросить об этом документе» для дополнительных вопросов. Важные даты, суммы и реквизиты всегда сверяйте с оригиналом."]],
        ["Сохранённое, заметки и голос", ["Создавайте заметки вручную или записывайте голос с последующей расшифровкой.", "Из обычного текста можно сделать задачи, список покупок, напоминания и события календаря.", "Раскладывайте информацию по папкам, меняйте цвет, значок и стиль папок."]],
        ["Важные документы", ["Храните чувствительные локальные файлы в защищённом разделе с PIN или биометрией.", "Анализ документа запускается только после вашего подтверждения.", "Документы можно переименовывать, открывать, делиться ими, сортировать и удалять."]],
        ["Календарь и напоминания", ["Нажмите на дату, чтобы увидеть расписание выбранного дня.", "Кнопка «Сегодня» возвращает к текущему дню.", "Распознанные даты можно добавить в календарь или превратить в напоминание. Блок «Сегодня и ближайшее» на главной при необходимости включается в Настройках."]],
        ["Финансы", ["Добавляйте расходы и доходы, сканируйте чеки, ведите бюджеты, счета и подписки.", "Задавайте вопросы о финансах текстом или голосом и открывайте архив по месяцам.", "Если чек читается неуверенно, NowWhat должен предложить ручную проверку, а не придумывать магазин или итоговую сумму."]],
        ["Family Space", ["Делитесь с семьёй заметками, документами, задачами, покупками, событиями, чеками и финансовыми записями.", "Приглашайте участников одноразовым кодом или QR; новые общие объекты появляются во Inbox.", "Долгое нажатие на участника открывает действия с ним. Доступ к отдельным объектам можно настраивать."]],
        ["Daily Briefing и Автоправила", ["Daily Briefing собирает важные задачи и события дня.", "Автоправила помогают сортировать материалы, предлагать действия и создавать полезные напоминания.", "Для важных данных проверяйте автоматические предложения перед выполнением."]],
        ["Внешний вид и языки", ["Выберите светлую или тёмную тему, основной цвет и общий стиль приложения.", "Поддерживаются русский, английский, португальский, французский, испанский, украинский, немецкий и итальянский.", "Системные папки следуют языку приложения, а ваши собственные названия не меняются."]],
        ["Аккаунт, приватность и безопасность", ["В настройках аккаунта доступны синхронизация, очистка данных и удаление аккаунта.", "Защищённые локальные документы остаются под защитой устройства.", "AI может ошибаться. NowWhat не выполняет банковские платежи и не заменяет врача, юриста, налогового или финансового специалиста."]]
      ]
    },
    pt: {
      title: "Guia NowWhat",
      intro: "Guia prático das principais funções do NowWhat. Escolha uma secção ou percorra a página.",
      sections: [
        ["Primeiros passos", ["Escolha o idioma nas Definições.", "Use o modo convidado ou inicie sessão com e-mail/Google para recuperação da conta e sincronização suportada.", "O ecrã principal dá acesso rápido ao reconhecimento de documentos, Daily Briefing, calendário e ações principais."]],
        ["Documentos e IA", ["Adicione fotografia, captura de ecrã, PDF, QR ou ficheiro partilhado de outra aplicação.", "O NowWhat extrai a informação importante e sugere ações úteis.", "Use Perguntar sobre o documento para questões adicionais e confirme sempre datas, valores e dados de pagamento."]],
        ["Guardado, notas e voz", ["Crie notas manualmente ou grave voz e transcreva-a.", "Transforme texto em tarefas, listas de compras, lembretes e eventos.", "Organize tudo em pastas com cores, ícones e estilos."]],
        ["Documentos importantes", ["Guarde ficheiros locais sensíveis numa área protegida por PIN ou biometria.", "A análise só começa após confirmação.", "Pode renomear, partilhar, organizar e eliminar documentos."]],
        ["Calendário e lembretes", ["Toque numa data para ver o plano desse dia.", "Hoje regressa ao dia atual.", "Datas reconhecidas podem criar eventos ou lembretes; Hoje e próximos pode ser ativado nas Definições."]],
        ["Finanças", ["Registe despesas e receitas, digitalize recibos e acompanhe orçamentos, contas e subscrições.", "Pergunte sobre finanças por texto ou voz e consulte o arquivo mensal.", "Dados pouco claros do recibo devem ficar para revisão manual."]],
        ["Espaço familiar", ["Partilhe notas, documentos, tarefas, compras, eventos, recibos e finanças.", "Convide por código único ou QR e veja novos itens na Caixa de entrada.", "Pressione um membro durante alguns instantes para abrir ações; o acesso pode ser definido por item."]],
        ["Daily Briefing e Regras automáticas", ["O Daily Briefing reúne tarefas e eventos relevantes do dia.", "As Regras automáticas ajudam a organizar conteúdo e a sugerir ações.", "Confirme sugestões automáticas quando a informação for importante."]],
        ["Aspeto e idiomas", ["Escolha tema claro/escuro, cor principal e estilo visual.", "São suportados EN, PT, RU, FR, ES, UK, DE e IT.", "Pastas do sistema seguem o idioma; nomes criados por si não mudam."]],
        ["Conta, privacidade e segurança", ["A conta inclui sincronização, limpeza de dados e eliminação da conta.", "Documentos locais protegidos usam a segurança do dispositivo.", "A IA pode errar; o NowWhat não executa pagamentos nem substitui aconselhamento profissional."]]
      ]
    },
    de: {
      title: "NowWhat Handbuch",
      intro: "Praktischer Leitfaden zu den wichtigsten NowWhat-Funktionen.",
      sections: [
        ["Erste Schritte", ["Wähle die Sprache in den Einstellungen.", "Nutze den Gastmodus oder melde dich mit E-Mail/Google an.", "Auf Home findest du Dokumenterkennung, Daily Briefing, Kalender und wichtige Aktionen."]],
        ["Dokumente & KI", ["Füge Foto, Screenshot, PDF, QR oder geteilte Dateien hinzu.", "NowWhat erkennt wichtige Informationen und schlägt passende Aktionen vor.", "Frage zum Dokument nach und prüfe wichtige Daten, Beträge und Zahlungsinformationen am Original."]],
        ["Gespeichert, Notizen & Sprache", ["Erstelle Notizen oder transkribiere Sprachaufnahmen.", "Wandle Text in Aufgaben, Einkaufslisten, Erinnerungen und Termine um.", "Organisiere Inhalte in Ordnern mit Farben, Symbolen und Stilen."]],
        ["Wichtige Dokumente", ["Schütze lokale sensible Dateien mit PIN oder Biometrie.", "Die Analyse beginnt erst nach deiner Bestätigung.", "Dokumente lassen sich umbenennen, teilen, organisieren und löschen."]],
        ["Kalender & Erinnerungen", ["Tippe auf ein Datum für den Tagesplan.", "Heute bringt dich zum aktuellen Tag zurück.", "Erkannte Daten können Termine oder Erinnerungen werden; Heute & demnächst lässt sich in Einstellungen aktivieren."]],
        ["Finanzen", ["Erfasse Ausgaben und Einnahmen, scanne Belege und verwalte Budgets, Rechnungen und Abos.", "Stelle Finanzfragen per Text oder Sprache und nutze das Monatsarchiv.", "Unklare Belegdaten sollen manuell geprüft und nicht erfunden werden."]],
        ["Familienbereich", ["Teile Notizen, Dokumente, Aufgaben, Einkäufe, Termine, Belege und Finanzen.", "Einladung per Einmalcode oder QR; neue Inhalte erscheinen im Posteingang.", "Langes Drücken auf ein Mitglied öffnet Aktionen; Zugriff kann pro Element festgelegt werden."]],
        ["Daily Briefing & Auto-Regeln", ["Daily Briefing bündelt wichtige Aufgaben und Termine.", "Auto-Regeln sortieren Inhalte und schlagen Aktionen vor.", "Prüfe automatische Vorschläge bei wichtigen Informationen."]],
        ["Aussehen & Sprachen", ["Wähle Hell/Dunkel, Akzentfarbe und globalen Stil.", "Unterstützt werden EN, PT, RU, FR, ES, UK, DE und IT.", "Systemordner folgen der App-Sprache; eigene Namen bleiben unverändert."]],
        ["Konto, Datenschutz & Sicherheit", ["Synchronisierung, Datenbereinigung und Kontolöschung findest du in den Kontoeinstellungen.", "Geschützte lokale Dokumente bleiben hinter der Gerätesicherheit.", "KI kann Fehler machen; NowWhat führt keine Bankzahlungen aus und ersetzt keine professionelle Beratung."]]
      ]
    },
    it: {
      title: "Manuale NowWhat",
      intro: "Guida pratica alle principali funzioni di NowWhat.",
      sections: [
        ["Primi passi", ["Scegli la lingua nelle Impostazioni.", "Usa la modalità ospite oppure accedi con e-mail/Google.", "Home offre accesso rapido a riconoscimento documenti, Daily Briefing, calendario e azioni principali."]],
        ["Documenti & IA", ["Aggiungi foto, screenshot, PDF, QR o file condivisi.", "NowWhat estrae le informazioni importanti e suggerisce azioni utili.", "Usa Chiedi sul documento e verifica sempre date, importi e dati di pagamento con l'originale."]],
        ["Salvati, note & voce", ["Crea note o trascrivi registrazioni vocali.", "Trasforma il testo in attività, liste della spesa, promemoria ed eventi.", "Organizza i contenuti in cartelle con colori, icone e stili."]],
        ["Documenti importanti", ["Proteggi i file locali sensibili con PIN o biometria.", "L'analisi parte solo dopo la conferma.", "Puoi rinominare, condividere, organizzare ed eliminare i documenti."]],
        ["Calendario & promemoria", ["Tocca una data per vedere il programma del giorno.", "Oggi torna alla data corrente.", "Le date riconosciute possono diventare eventi o promemoria; Oggi e prossimi può essere attivato nelle Impostazioni."]],
        ["Finanze", ["Registra spese e entrate, scansiona scontrini e gestisci budget, bollette e abbonamenti.", "Fai domande sulle finanze via testo o voce e consulta l'archivio mensile.", "I dati poco chiari degli scontrini devono essere controllati manualmente, non inventati."]],
        ["Spazio famiglia", ["Condividi note, documenti, attività, acquisti, eventi, scontrini e finanze.", "Invita con codice monouso o QR e controlla i nuovi elementi in Inbox.", "Tieni premuto un membro per le azioni; l'accesso può essere configurato per singolo elemento."]],
        ["Daily Briefing & regole automatiche", ["Daily Briefing raccoglie attività ed eventi importanti del giorno.", "Le regole automatiche organizzano contenuti e propongono azioni.", "Controlla i suggerimenti automatici per le informazioni importanti."]],
        ["Aspetto & lingue", ["Scegli chiaro/scuro, colore principale e stile globale.", "Sono supportati EN, PT, RU, FR, ES, UK, DE e IT.", "Le cartelle di sistema seguono la lingua; i nomi creati dall'utente restano invariati."]],
        ["Account, privacy & sicurezza", ["Le impostazioni account includono sincronizzazione, pulizia dati ed eliminazione account.", "I documenti locali protetti restano dietro la sicurezza del dispositivo.", "L'IA può sbagliare; NowWhat non esegue pagamenti bancari e non sostituisce consulenza professionale."]]
      ]
    }
  };

  const aliases = {
    fr: "en",
    es: "en",
    uk: "ru"
  };

  function currentLang() {
    const saved = (localStorage.getItem("nw_lang") || "").toLowerCase();
    if (M[saved]) return saved;
    if (aliases[saved]) return aliases[saved];
    const raw = (navigator.language || "en").toLowerCase().slice(0,2);
    if (M[raw]) return raw;
    if (aliases[raw]) return aliases[raw];
    return "en";
  }

  function esc(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function render() {
    const data = M[currentLang()] || M.en;
    const title = document.getElementById("manualTitle");
    const titleMobile = document.getElementById("manualTitleMobile");
    const intro = document.getElementById("manualIntro");
    const toc = document.getElementById("manualToc");
    const body = document.getElementById("manualSections");
    if (title) title.textContent = data.title;
    if (titleMobile) titleMobile.textContent = data.title;
    if (intro) intro.textContent = data.intro;
    document.title = data.title + " — NowWhat";
    if (toc) {
      toc.innerHTML = data.sections.map((section, i) =>
        '<a href="#manual-' + i + '">' + esc(section[0]) + '</a>'
      ).join("");
    }
    if (body) {
      body.innerHTML = data.sections.map((section, i) =>
        '<section class="manual-section" id="manual-' + i + '">' +
        '<h2>' + esc(section[0]) + '</h2><ul>' +
        section[1].map(item => '<li>' + esc(item) + '</li>').join("") +
        '</ul></section>'
      ).join("");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
  window.addEventListener("nw:language", render);
})();