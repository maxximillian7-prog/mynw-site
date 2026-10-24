/* MyNow Apps site-wide accessible feedback dialog. All messages go via server to support@mynw.app. */
(() => {
  'use strict';
  if (window.__mynwContactModal) return;
  window.__mynwContactModal = true;
  const endpoint = 'https://utauewtqtmqgmguxtmvn.supabase.co/functions/v1/website-feedback';
  const publicKey = 'sb_publishable_8_Cy9BSMphZDoRYe3ejifQ_iYqmF2Fy';
  const translations = {
    en:['Contact MyNow Support','Name','Your email','Message','Send message','Sending…','Your message was sent. Thank you!','Message saved. We will reply as soon as possible.','Could not send. Please try again.','Too many messages. Please try later.','Close','We use your email only to reply. Do not send passwords or API keys.','Please fill out all fields correctly.'],
    pt:['Contactar o suporte MyNow','Nome','O seu e-mail','Mensagem','Enviar mensagem','A enviar…','Mensagem enviada. Obrigado!','Mensagem guardada. Responderemos assim que possível.','Não foi possível enviar. Tente novamente.','Demasiadas mensagens. Tente mais tarde.','Fechar','Usamos o seu e-mail apenas para responder. Não envie palavras-passe nem chaves API.','Preencha todos os campos corretamente.'],
    ru:['Связаться с поддержкой MyNow','Ваше имя','Ваш email','Сообщение','Отправить сообщение','Отправка…','Сообщение отправлено. Спасибо!','Сообщение сохранено. Мы ответим при первой возможности.','Не удалось отправить. Повторите попытку.','Слишком много обращений. Попробуйте позже.','Закрыть','Email используется только для ответа. Не отправляйте пароли или API-ключи.','Правильно заполните все поля.'],
    uk:['Зв’язатися з підтримкою MyNow','Ваше ім’я','Ваш email','Повідомлення','Надіслати повідомлення','Надсилання…','Повідомлення надіслано. Дякуємо!','Повідомлення збережено. Ми відповімо якнайшвидше.','Не вдалося надіслати. Спробуйте знову.','Забагато звернень. Спробуйте пізніше.','Закрити','Email використовується лише для відповіді. Не надсилайте паролі чи API-ключі.','Заповніть усі поля правильно.'],
    fr:['Contacter le support MyNow','Votre nom','Votre e-mail','Message','Envoyer le message','Envoi…','Message envoyé. Merci !','Message enregistré. Nous répondrons dès que possible.','Envoi impossible. Réessayez.','Trop de messages. Réessayez plus tard.','Fermer','Votre e-mail sert uniquement à répondre. Ne partagez pas de mots de passe ni de clés API.','Veuillez remplir correctement tous les champs.'],
    es:['Contactar con soporte MyNow','Nombre','Tu correo electrónico','Mensaje','Enviar mensaje','Enviando…','Mensaje enviado. ¡Gracias!','Mensaje guardado. Responderemos lo antes posible.','No se pudo enviar. Inténtalo de nuevo.','Demasiados mensajes. Inténtalo más tarde.','Cerrar','Solo usamos tu correo para responder. No envíes contraseñas ni claves API.','Completa todos los campos correctamente.'],
    de:['MyNow-Support kontaktieren','Name','Ihre E-Mail','Nachricht','Nachricht senden','Wird gesendet…','Nachricht gesendet. Vielen Dank!','Nachricht gespeichert. Wir antworten so bald wie möglich.','Senden fehlgeschlagen. Bitte erneut versuchen.','Zu viele Nachrichten. Bitte später versuchen.','Schließen','Ihre E-Mail wird nur für Antworten verwendet. Keine Passwörter oder API-Schlüssel senden.','Bitte alle Felder korrekt ausfüllen.'],
    it:['Contatta l’assistenza MyNow','Nome','La tua email','Messaggio','Invia messaggio','Invio…','Messaggio inviato. Grazie!','Messaggio salvato. Risponderemo al più presto.','Invio non riuscito. Riprova.','Troppi messaggi. Riprova più tardi.','Chiudi','Usiamo l’email solo per rispondere. Non inviare password o chiavi API.','Compila correttamente tutti i campi.']
  };
  let overlay = null, previousFocus = null, previousOverflow = '', sending = false;
  function lang() {
    const html = (document.documentElement.lang || '').toLowerCase().slice(0,2);
    if (translations[html]) return html;
    const selectors = ['eco-language','langSelect','ncLang','ngLang','nkLang'];
    for (const id of selectors) {
      const el = document.getElementById(id);
      if (el && translations[el.value]) return el.value;
    }
    for (const key of ['mynw_lang','nw_lang','nc_lang','nowgreen-site-lang','nowkids-site-lang']) {
      try { const v = localStorage.getItem(key); if (translations[v]) return v; } catch (_) {}
    }
    return translations[(navigator.language || 'en').slice(0,2)] ? navigator.language.slice(0,2) : 'en';
  }
  function app() {
    const p = location.pathname.toLowerCase();
    if (p.startsWith('/nowcook/')) return 'NowCook';
    if (p.startsWith('/nowgreen/')) return 'NowGreen';
    if (p.startsWith('/nowkids/')) return 'NowKids';
    if (p.startsWith('/nowwhat/') || ['/support/','/manual/','/delete-account/'].includes(p)) return 'NowWhat';
    return 'MyNow Apps';
  }
  function escapeAttr(x) { return String(x).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function ensure() {
    if (overlay) return;
    const style = document.createElement('style');
    style.textContent = '.mynw-contact-backdrop{position:fixed;inset:0;z-index:2147483640;background:rgba(13,30,32,.53);display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(6px)}' +
      '.mynw-contact-dialog{background:#fff;color:#18332c;border-radius:22px;width:min(100%,490px);max-height:calc(100dvh - 32px);overflow-y:auto;box-shadow:0 24px 90px #10282048;padding:28px;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;position:relative;box-sizing:border-box}' +
      '.mynw-contact-dialog *{box-sizing:border-box}.mynw-contact-dialog h2{font-size:25px;line-height:1.23;margin:0 34px 22px 0;color:#153c32;font-weight:750}.mynw-contact-dialog label{display:block;font-size:14px;font-weight:650;margin:13px 0 6px}' +
      '.mynw-contact-dialog input:not([type=hidden]),.mynw-contact-dialog textarea{display:block;width:100%;border:1px solid #cadbd3;border-radius:11px;padding:12px 13px;font:inherit;font-size:16px;color:#18332c;background:#fbfdfc;outline-offset:2px}.mynw-contact-dialog textarea{resize:vertical;min-height:125px;max-height:35vh}' +
      '.mynw-contact-dialog input:focus,.mynw-contact-dialog textarea:focus{border-color:#338669;outline:2px solid #33866933}.mynw-contact-dialog .mynw-contact-close{position:absolute;right:19px;top:15px;border:0;background:#f0f5f2;color:#295744;cursor:pointer;border-radius:50%;font-size:26px;line-height:37px;width:39px;height:39px}' +
      '.mynw-contact-dialog .mynw-contact-submit{margin-top:18px;border:none;display:block;width:100%;border-radius:12px;background:linear-gradient(110deg,#278863,#327e68);color:white;min-height:47px;font:inherit;font-size:16px;font-weight:700;cursor:pointer}' +
      '.mynw-contact-dialog .mynw-contact-submit:disabled{opacity:.6;cursor:wait}.mynw-contact-dialog .mynw-contact-note{font-size:12px;color:#64766d;line-height:1.5;margin:12px 0 0}' +
      '.mynw-contact-dialog .mynw-contact-status{min-height:0;margin-top:12px;line-height:1.45;font-size:14px;font-weight:600}.mynw-contact-dialog .mynw-contact-status.ok{color:#147650}.mynw-contact-dialog .mynw-contact-status.bad{color:#b63636}@media(max-width:480px){.mynw-contact-dialog{padding:21px}.mynw-contact-dialog h2{font-size:22px}}';
    document.head.appendChild(style);
    overlay = document.createElement('div');
    overlay.className = 'mynw-contact-backdrop';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML = '<section class="mynw-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="mynw-contact-heading">' +
      '<button type="button" class="mynw-contact-close" aria-label="Close">×</button>' +
      '<h2 id="mynw-contact-heading"></h2><form id="mynw-contact-form">' +
      '<label for="mynw-contact-name"></label><input name="name" id="mynw-contact-name" type="text" autocomplete="name" maxlength="120" required>' +
      '<label for="mynw-contact-email"></label><input name="email" id="mynw-contact-email" type="email" autocomplete="email" maxlength="254" required>' +
      '<label for="mynw-contact-message"></label><textarea name="message" id="mynw-contact-message" maxlength="5000" minlength="3" required></textarea>' +
      '<input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px" />' +
      '<button class="mynw-contact-submit" type="submit"></button><p class="mynw-contact-note"></p><p class="mynw-contact-status" role="status" aria-live="polite"></p></form></section>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('.mynw-contact-close')) close(); });
    overlay.querySelector('form').addEventListener('submit', send);
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const els = [...overlay.querySelectorAll('button:not(:disabled), input:not([tabindex="-1"]), textarea')];
        const first = els[0], last = els[els.length-1];
        if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();}
        else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
      }
    });
  }
  function localize() {
    const t = translations[lang()];
    const q = sel => overlay.querySelector(sel);
    q('h2').textContent=t[0];
    q('label[for="mynw-contact-name"]').textContent=t[1];
    q('label[for="mynw-contact-email"]').textContent=t[2];
    q('label[for="mynw-contact-message"]').textContent=t[3];
    q('.mynw-contact-submit').textContent=t[4];
    q('.mynw-contact-close').setAttribute('aria-label',t[10]);
    q('.mynw-contact-note').textContent=t[11];
  }
  function open(link) {
    ensure();localize();
    previousFocus=document.activeElement;
    previousOverflow=document.body.style.overflow;
    overlay.hidden=false;overlay.style.display='flex';overlay.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    overlay.querySelector('form').reset();
    const status=overlay.querySelector('.mynw-contact-status');
    status.textContent='';status.className='mynw-contact-status';
    const text=link && link.href && link.href.includes('?') ? link.href.slice(link.href.indexOf('?')+1) : '';
    const params=new URLSearchParams(text);
    const body=params.get('body') || '';
    if(body) overlay.querySelector('#mynw-contact-message').value=body.slice(0,5000);
    overlay.dataset.topic=(params.get('subject') || 'General support').slice(0,65);
    overlay.querySelector('#mynw-contact-name').focus();
  }
  function close() {
    if (!overlay || sending) return;
    overlay.hidden=true;overlay.style.display='none';overlay.setAttribute('aria-hidden','true');
    document.body.style.overflow=previousOverflow;
    if(previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }
  async function send(e) {
    e.preventDefault();
    if(sending) return;
    const form=overlay.querySelector('form');
    const t=translations[lang()];
    const name=form.elements.name.value.trim();
    const email=form.elements.email.value.trim();
    const message=form.elements.message.value.trim();
    const status=overlay.querySelector('.mynw-contact-status');
    if(!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length<3 || message.length>5000) {
      status.textContent=t[12]; status.className='mynw-contact-status bad'; return;
    }
    sending=true;
    const submit=overlay.querySelector('.mynw-contact-submit');
    submit.disabled=true;submit.textContent=t[5];
    status.textContent='';status.className='mynw-contact-status';
    try {
      const response=await fetch(endpoint,{
        method:'POST',mode:'cors',credentials:'omit',
        headers:{'Content-Type':'application/json','apikey':publicKey},
        body:JSON.stringify({name,email,message,topic:(app()+' — '+(overlay.dataset.topic||'Support')).slice(0,80),locale:lang(),page:location.pathname.slice(0,280),company:form.elements.company.value})
      });
      const data=await response.json().catch(()=>({}));
      if(response.status===429)throw new Error('rate_limited');
      if(!response.ok && response.status!==202)throw new Error('failed');
      status.textContent=(response.status===202 || data.emailed===false)?t[7]:t[6];
      status.className='mynw-contact-status ok';
      form.reset();
    } catch(error) {
      status.textContent=error.message==='rate_limited'?t[9]:t[8];
      status.className='mynw-contact-status bad';
    } finally {
      sending=false;submit.disabled=false;submit.textContent=t[4];
    }
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a) return;
    if (!/^mailto:support@mynw\.app(?:\?|$)/i.test(a.getAttribute('href')||'')) return;
    e.preventDefault();open(a);
  }, true);
  window.mynwOpenContactForm = open;
})();