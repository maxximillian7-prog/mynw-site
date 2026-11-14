import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:video_player/video_player.dart';

import '../data/qwin_store.dart';
import 'experience.dart';

/// Intro video on every cold launch; the two feature cards and the required
/// Terms/Privacy acknowledgement are only shown until explicitly completed.
/// A privacy-policy acknowledgement is not consent to optional marketing.
class QwinFirstRunGate extends StatefulWidget {
  final QwinStore store;
  final bool showVideo;
  const QwinFirstRunGate({super.key, required this.store, this.showVideo = true});

  @override State<QwinFirstRunGate> createState() => _QwinFirstRunGateState();
}

class _QwinFirstRunGateState extends State<QwinFirstRunGate> {
  static const String legalVersion = '2026-11-14';
  static const String acceptanceKey = 'qwin_legal_ack_20261114_v1';
  VideoPlayerController? _video;
  int _stage = -1; // -1 video, 0/1 feature cards, 2 agreements, 3 application
  bool _terms = false;
  bool _privacy = false;
  bool _saving = false;
  String? _error;
  String _locale = 'pt';

  @override
  void initState() {
    super.initState();
    _start();
  }

  Future<void> _start() async {
    bool previouslyAccepted = false;
    try {
      final prefs = await SharedPreferences.getInstance();
      previouslyAccepted = prefs.getBool(acceptanceKey) == true;
      final fromSettings = prefs.getString('qwin_locale_v1') ?? '';
      final fromPhone = WidgetsBinding.instance.platformDispatcher.locale.languageCode;
      _locale = _safeLang(fromSettings.isNotEmpty ? fromSettings : fromPhone);
      widget.store.appLocale.value = _locale;
    } catch (_) {
      _locale = _safeLang(WidgetsBinding.instance.platformDispatcher.locale.languageCode);
    }
    if (widget.showVideo) {
      final controller = VideoPlayerController.asset('assets/intro/qwin_intro_3s.mp4');
      _video = controller;
      try {
        await controller.initialize().timeout(const Duration(seconds: 2));
        await controller.setVolume(0);
        await controller.setLooping(false);
        if (mounted) setState(() {});
        await controller.play();
      } catch (_) {
        // Never block sign-in or legal access because a video codec failed.
      }
      await Future<void>.delayed(const Duration(seconds: 3));
    }
    if (!mounted) return;
    setState(() => _stage = previouslyAccepted ? 3 : 0);
    // Do not repeatedly play or hold the device's display awake.
    try { await _video?.pause(); } catch (_) {}
  }

  static String _safeLang(String s) => {'ru', 'pt', 'en'}.contains(s) ? s : 'en';

  String tr(String ru, String pt, String en) =>
      _locale == 'ru' ? ru : _locale == 'pt' ? pt : en;

  Future<void> _openDocument(String section) async {
    final url = Uri.parse('https://mynw.app/qwin/docs/?lang=' +
        _locale + '#' + section);
    final opened = await launchUrl(url, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      setState(() => _error = tr('Не удалось открыть документ',
          'Não foi possível abrir o documento', 'Could not open document'));
    }
  }

  Future<void> _accept() async {
    if (!_terms || !_privacy || _saving) return;
    setState(() { _saving = true; _error = null; });
    try {
      final prefs = await SharedPreferences.getInstance();
      // Store an explicit, versioned acknowledgement. Never pre-check boxes.
      await prefs.setString('qwin_terms_version', legalVersion);
      await prefs.setString('qwin_privacy_version', legalVersion);
      await prefs.setString('qwin_legal_accepted_utc',
          DateTime.now().toUtc().toIso8601String());
      final persisted = await prefs.setBool(acceptanceKey, true);
      if (!persisted) throw StateError('Could not save agreement');
      if (mounted) setState(() => _stage = 3);
    } catch (_) {
      if (mounted) setState(() => _error = tr(
          'Не удалось сохранить подтверждение. Попробуйте ещё раз.',
          'Não foi possível guardar a confirmação. Tente novamente.',
          'Could not save your acknowledgement. Please retry.'));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _video?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_stage == 3) return QwinExperience(store: widget.store);
    if (_stage == -1) {
      return Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: _video?.value.isInitialized == true
            ? AspectRatio(
                aspectRatio: _video!.value.aspectRatio,
                child: VideoPlayer(_video!))
            : const Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.waves_rounded, size: 76, color: Color(0xFF0D9488)),
                SizedBox(height: 12),
                Text('Qwin', style: TextStyle(
                  fontSize: 36, fontWeight: FontWeight.w900,
                  color: Color(0xFF092E45))),
              ]),
        ),
      );
    }

    final heading = _stage == 0
      ? tr('Находите нужное рядом',
           'Encontre o que precisa perto de si',
           'Find what you need nearby')
      : _stage == 1
        ? tr('Продавайте проще, начиная с фото',
             'Venda com facilidade, a partir de uma foto',
             'Sell easily, starting with a photo')
        : tr('Безопасное начало',
             'Um começo seguro', 'Start with confidence');
    final description = _stage == 0
      ? tr('Ищите по категориям и городу. Сохраняйте интересные товары, задавайте вопросы и общайтесь в приложении.',
           'Pesquise por categoria e cidade. Guarde artigos, faça perguntas e converse dentro da aplicação.',
           'Browse by category and city. Save interesting items, ask questions and chat in the app.')
      : _stage == 1
        ? tr('Добавьте реальные фотографии. ИИ по желанию поможет с текстом и категорией, а вы утвердите объявление для Qwin или подключённого OLX.',
             'Adicione fotos reais. A IA opcional ajuda com o texto e categoria; confirme o anúncio no Qwin ou OLX ligado.',
             'Add genuine photos. Optional AI helps with text and category; you approve publishing to Qwin or connected OLX.')
        : tr('Прочитайте условия и информацию о данных. Обязательные подтверждения не включают согласие на рекламу.',
             'Leia os termos e a informação sobre dados. Estas confirmações não autorizam marketing.',
             'Read the terms and data notice. These acknowledgements do not opt you into marketing.');

    return Scaffold(
      backgroundColor: const Color(0xFFF5FBFA),
      body: SafeArea(child: Center(
        child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 510),
          child: SingleChildScrollView(child: Padding(padding: const EdgeInsets.all(23),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const SizedBox(height: 24),
              Row(children: [
                const Icon(Icons.waves_rounded, size: 38, color: Color(0xFF0D9488)),
                const SizedBox(width: 11),
                const Text('Qwin', style: TextStyle(
                    fontSize: 28, fontWeight: FontWeight.w900,
                    color: Color(0xFF092E45))),
                const Spacer(),
                Text((_stage + 1).toString() + ' / 3',
                    style: const TextStyle(color: Colors.blueGrey)),
              ]),
              const SizedBox(height: 30),
              Icon(_stage == 0
                     ? Icons.travel_explore_rounded
                     : _stage == 1
                       ? Icons.add_a_photo_outlined
                       : Icons.verified_user_outlined,
                   size: 78, color: const Color(0xFF0D9488)),
              const SizedBox(height: 26),
              Text(heading, textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 27, fontWeight: FontWeight.w900,
                  color: Color(0xFF092E45))),
              const SizedBox(height: 13),
              Text(description, textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, height: 1.48,
                  color: Color(0xFF4A5D63))),
              const SizedBox(height: 26),
              if (_stage == 2) ...[
                CheckboxListTile(
                  value: _terms,
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                  title: Text(tr('Я принимаю условия использования',
                      'Aceito os termos de utilização',
                      'I accept the Terms of Use')),
                  onChanged: (v) => setState(() => _terms = v == true)),
                Align(alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: () => _openDocument('terms'),
                    icon: const Icon(Icons.open_in_new, size: 17),
                    label: Text(tr('Прочитать условия',
                        'Ler os termos', 'Read terms')))),
                CheckboxListTile(
                  value: _privacy,
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                  title: Text(tr('Я ознакомился с политикой конфиденциальности',
                      'Tomei conhecimento da política de privacidade',
                      'I have read the Privacy Policy')),
                  onChanged: (v) => setState(() => _privacy = v == true)),
                Align(alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: () => _openDocument('privacy'),
                    icon: const Icon(Icons.open_in_new, size: 17),
                    label: Text(tr('Прочитать политику',
                        'Ler a política', 'Read privacy policy')))),
              ],
              if (_error != null) Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Text(_error!, textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.red))),
              const SizedBox(height: 30),
              FilledButton(
                onPressed: _stage == 2
                  ? (!_terms || !_privacy || _saving ? null : _accept)
                  : () => setState(() => _stage++),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF0D9488),
                  minimumSize: const Size.fromHeight(54)),
                child: _saving
                  ? const SizedBox(height: 20, width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_stage == 2
                      ? tr('Принять и продолжить', 'Aceitar e continuar', 'Accept and continue')
                      : tr('Далее', 'Seguinte', 'Next')),
              ),
              if (_stage < 2)
                TextButton(
                  onPressed: () => setState(() => _stage = 2),
                  child: Text(tr('Пропустить знакомство',
                      'Saltar introdução', 'Skip introduction'))),
              const SizedBox(height: 12),
            ]),
          )),
        ),
      )),
    );
  }
}
