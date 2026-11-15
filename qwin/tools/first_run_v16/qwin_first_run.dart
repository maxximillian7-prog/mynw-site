import 'dart:async';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/qwin_store.dart';
import 'experience.dart';
import 'qwin_brand.dart';
import 'theme.dart';

/// Displays the approved homepage logo for two seconds on every cold launch.
/// Feature cards and the explicit, versioned legal acknowledgement are shown
/// only until the user completes them. The privacy acknowledgement is not
/// consent to optional marketing.
class QwinFirstRunGate extends StatefulWidget {
  final QwinStore store;
  final bool showSplash;
  const QwinFirstRunGate({
    super.key,
    required this.store,
    this.showSplash = true,
  });

  @override
  State<QwinFirstRunGate> createState() => _QwinFirstRunGateState();
}

class _QwinFirstRunGateState extends State<QwinFirstRunGate>
    with SingleTickerProviderStateMixin {
  static const String legalVersion = '2026-11-14';
  static const String acceptanceKey = 'qwin_legal_ack_20261114_v1';
  static const String introSeenKey = 'qwin_intro_seen_v15';

  late final AnimationController _logoFade;
  int _stage = -1; // -1 animation, 0/1 introduction, 2 legal, 3 Qwin
  bool _legalPreviouslyAccepted = false;
  bool _terms = false;
  bool _privacy = false;
  bool _saving = false;
  String? _error;
  String _locale = 'pt';

  String tr(String ru, String pt, String en) =>
      _locale == 'ru' ? ru : _locale == 'pt' ? pt : en;

  @override
  void initState() {
    super.initState();
    _logoFade=AnimationController(
      vsync:this,
      duration:const Duration(milliseconds:750),
    )..forward();
    unawaited(_start());
  }

  Future<void> _start() async {
    // Measure the splash from app startup, not after storage or network calls.
    final splashDuration=Future<void>.delayed(const Duration(seconds:2));
    var previouslyAccepted = false;
    var alreadySawUpdatedIntro = false;
    try {
      final prefs = await SharedPreferences.getInstance();
      previouslyAccepted = prefs.getBool(acceptanceKey) == true;
      alreadySawUpdatedIntro = prefs.getBool(introSeenKey) == true;
      final savedLanguage = prefs.getString('qwin_locale_v1');
      final deviceLanguage =
          WidgetsBinding.instance.platformDispatcher.locale.languageCode;
      final preferred = savedLanguage == null || savedLanguage.isEmpty
          ? deviceLanguage
          : savedLanguage;
      _locale = {'ru', 'pt', 'en'}.contains(preferred) ? preferred : 'en';
      widget.store.appLocale.value = _locale;
    } catch (_) {
      final language =
          WidgetsBinding.instance.platformDispatcher.locale.languageCode;
      _locale = {'ru', 'pt', 'en'}.contains(language) ? language : 'en';
    }

    if(widget.showSplash)await splashDuration;
    if(!mounted)return;
    _legalPreviouslyAccepted=previouslyAccepted;
    setState(()=>_stage=previouslyAccepted&&alreadySawUpdatedIntro?3:0);
  }

  Future<void> _openDocument(String fragment) async {
    final url = Uri.parse(
      'https://mynw.app/qwin/docs/?lang=' + _locale + '#' + fragment,
    );
    try {
      final opened =
          await launchUrl(url, mode: LaunchMode.externalApplication);
      if (!opened && mounted) {
        setState(() => _error = tr(
          'Не удалось открыть документ',
          'Não foi possível abrir o documento',
          'Could not open the document',
        ));
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = tr(
          'Проверьте подключение к интернету',
          'Verifique a ligação à Internet',
          'Check your internet connection',
        ));
      }
    }
  }

  Future<void> _finishAlreadyAcceptedIntro() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(introSeenKey, true);
    } catch (_) {
      // Visual introduction is optional; never lock an already authorized user.
    }
    if (mounted) setState(() => _stage = 3);
  }

  Future<void> _accept() async {
    if (!_terms || !_privacy || _saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('qwin_terms_version', legalVersion);
      await prefs.setString('qwin_privacy_version', legalVersion);
      await prefs.setString(
        'qwin_legal_accepted_utc',
        DateTime.now().toUtc().toIso8601String(),
      );
      final saved = await prefs.setBool(acceptanceKey, true);
      await prefs.setBool(introSeenKey, true);
      if (!saved) throw StateError('Cannot save legal acknowledgement');
      if (mounted) setState(() => _stage = 3);
    } catch (_) {
      if (mounted) {
        setState(() => _error = tr(
          'Не удалось сохранить подтверждение. Повторите попытку.',
          'Não foi possível guardar a confirmação. Tente novamente.',
          'Could not save your acknowledgement. Try again.',
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _logoFade.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_stage == 3) return QwinExperience(store: widget.store);
    if (_stage == -1) return _buildSplash();
    return _buildIntroduction();
  }

  Widget _buildSplash(){
    return Scaffold(
      backgroundColor:Colors.white,
      body:Center(
        child:FadeTransition(
          opacity:CurvedAnimation(parent:_logoFade,curve:Curves.easeOutCubic),
          child:const QwinHeaderLogo(width:280,height:106),
        ),
      ),
    );
  }

  Widget _buildIntroduction() {
    return Scaffold(
      backgroundColor: const Color(0xFFF4FBFA),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 17, 20, 18),
          child: Column(
            children: [
              Row(
                children: [
                  const QwinHeaderLogo(width: 192, height: 58),
                  const Spacer(),
                  Text(
                    (_stage + 1).toString() + ' / 3',
                    style: const TextStyle(
                      color: Color(0xFF667E85),
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 17),
              // The card fills all remaining vertical space. Only its
              // content scrolls on compact screens.
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white,
                        Color(0xFFF1FCFA),
                        Color(0xFFE7F7F4),
                      ],
                    ),
                    border: Border.all(color: const Color(0xFFD3ECE8)),
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x1C0B8075),
                        blurRadius: 24,
                        offset: Offset(0, 12),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(29),
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(22, 25, 22, 25),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _introLabel(),
                          const SizedBox(height: 22),
                          _featureIllustration(),
                          const SizedBox(height: 27),
                          Text(
                            _heading(),
                            style: const TextStyle(
                              fontSize: 26,
                              height: 1.16,
                              color: QwinColors.forest,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _description(),
                            style: const TextStyle(
                              color: Color(0xFF526D75),
                              height: 1.55,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 18),
                          if (_stage == 0) ...[
                            _point(Icons.search_rounded, tr(
                              'Умный поиск, фильтры и категории',
                              'Pesquisa, filtros e categorias',
                              'Search, filters and categories',
                            )),
                            _point(Icons.favorite_outline_rounded, tr(
                              'Избранное и удобное общение',
                              'Favoritos e conversas simples',
                              'Saved items and easy chat',
                            )),
                          ] else if (_stage == 1) ...[
                            _point(Icons.auto_awesome_outlined, tr(
                              'ИИ поможет с описанием и категорией',
                              'IA opcional para texto e categoria',
                              'Optional AI for descriptions and categories',
                            )),
                            _point(Icons.verified_outlined, tr(
                              'Вы проверяете всё перед публикацией',
                              'Confirma tudo antes de publicar',
                              'You approve everything before publishing',
                            )),
                          ] else
                            _legalControls(),
                          if (_error != null) ...[
                            const SizedBox(height: 9),
                            Text(_error!, style: const TextStyle(
                              color: Color(0xFFAB3827),
                              fontSize: 12,
                            )),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 19),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  3,
                  (index) => AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: _stage == index ? 29 : 8,
                    height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    decoration: BoxDecoration(
                      color: _stage == index
                          ? QwinColors.green
                          : const Color(0xFFC7E1DD),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _stage == 2
                      ? (!_terms || !_privacy || _saving ? null : _accept)
                      : _stage == 1 && _legalPreviouslyAccepted
                          ? _finishAlreadyAcceptedIntro
                          : () => setState(() => _stage += 1),
                  style: FilledButton.styleFrom(
                    backgroundColor: QwinColors.green,
                    minimumSize: const Size.fromHeight(54),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(17),
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(_stage == 2
                          ? tr('Принять и продолжить', 'Aceitar e continuar',
                              'Accept and continue')
                          : tr('Продолжить', 'Continuar', 'Continue')),
                ),
              ),
              if (_stage < 2)
                TextButton(
                  onPressed: _legalPreviouslyAccepted
                      ? _finishAlreadyAcceptedIntro
                      : () => setState(() => _stage = 2),
                  child: Text(
                    tr('Пропустить знакомство', 'Saltar introdução',
                        'Skip introduction'),
                    style: const TextStyle(color: Color(0xFF6C8587)),
                  ),
                )
              else
                const SizedBox(height: 46),
            ],
          ),
        ),
      ),
    );
  }

  Widget _introLabel() {
    final label = _stage == 0
        ? tr('ИЩИТЕ И НАХОДИТЕ', 'PESQUISE E DESCUBRA', 'FIND AND DISCOVER')
        : _stage == 1
            ? tr('ПРОДАВАЙТЕ ЛЕГКО', 'VENDA COM FACILIDADE', 'SELL WITH EASE')
            : tr('ВАША БЕЗОПАСНОСТЬ', 'A SUA SEGURANÇA', 'YOUR SAFETY');
    return Row(
      children: [
        const Icon(Icons.waves_rounded,
            color: QwinColors.green, size: 19),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              color: QwinColors.green,
              fontSize: 11,
              letterSpacing: 1.4,
            ),
          ),
        ),
      ],
    );
  }

  String _heading() {
    if (_stage == 0) {
      return tr('Хорошие вещи — ближе, чем кажется',
          'Bons artigos estão mais perto do que pensa',
          'Great finds are closer than you think');
    }
    if (_stage == 1) {
      return tr('От фотографии до объявления',
          'Da fotografia ao anúncio',
          'From photo to listing');
    }
    return tr('Уверенное и безопасное начало',
        'Comece com confiança e segurança',
        'A safer way to start');
  }

  String _description() {
    if (_stage == 0) {
      return tr(
        'Находите интересные товары рядом. Ищите по городу и категориям, сохраняйте понравившееся и общайтесь с продавцами.',
        'Encontre artigos na sua zona. Pesquise por cidade e categoria, guarde favoritos e fale com vendedores.',
        'Discover items nearby. Browse by city and category, save favourites and chat with sellers.',
      );
    }
    if (_stage == 1) {
      return tr(
        'Покажите товар на реальных фото. Qwin предложит описание и категорию, а вы решите, где разместить объявление: Qwin Market или OLX Portugal.',
        'Mostre o artigo com fotos reais. O Qwin sugere texto e categoria; escolha publicar no Qwin Market ou OLX Portugal.',
        'Show your item with genuine photos. Qwin suggests text and category; you choose Qwin Market or OLX Portugal.',
      );
    }
    return tr(
      'Ознакомьтесь с условиями использования и тем, как Qwin обрабатывает данные. Рекламные рассылки не включаются.',
      'Conheça os termos e como o Qwin trata os dados. Não há subscrição automática de marketing.',
      'Review the terms and how Qwin processes data. Marketing is never opted in automatically.',
    );
  }

  static const String _marketingBase='https://mynw.app/qwin/assets/marketing/';
  Widget _featureIllustration() {
    final filename=_stage==0?'qwin_hero_clothing.png':
      _stage==1?'qwin_editorial_secondlife.png':'qwin_hero_chair.png';
    final height=MediaQuery.sizeOf(context).height<720?185.0:238.0;
    return ClipRRect(
      borderRadius:BorderRadius.circular(24),
      child:SizedBox(
        width:double.infinity,height:height,
        child:Stack(fit:StackFit.expand,children:[
          // These are the same editorial photos used on Qwin's own website.
          // Decode at card resolution to avoid inflating multi-megabyte PNGs.
          Image.network(
            _marketingBase+filename,
            fit:BoxFit.cover,
            cacheWidth:880,
            filterQuality:FilterQuality.low,
            gaplessPlayback:false,
            loadingBuilder:(ctx,child,progress)=>progress==null?
              child:const ColoredBox(
                color:Color(0xFFE4F8F4),
                child:Center(child:Icon(Icons.image_outlined,
                  color:QwinColors.green,size:54))),
            errorBuilder:(_,__,___)=>const ColoredBox(
              color:Color(0xFFE4F8F4),
              child:Center(child:Icon(Icons.image_outlined,
                color:QwinColors.green,size:54))),
          ),
          const Align(
            alignment:Alignment.bottomCenter,
            child:SizedBox(
              height:70,
              child:DecoratedBox(decoration:BoxDecoration(
                gradient:LinearGradient(
                  begin:Alignment.topCenter,end:Alignment.bottomCenter,
                  colors:[Color(0x000B2240),Color(0x990B2240)],
                ),
              )),
            ),
          ),
          Positioned(
            left:15,bottom:13,
            child:Row(children:[
              const Icon(Icons.verified_outlined,color:Colors.white,size:18),
              const SizedBox(width:8),
              Text(
                _stage==0?tr('Находки рядом','Perto de si','Finds nearby'):
                  _stage==1?tr('Легко продать','Venda facilmente','Easy selling'):
                  tr('Всё под вашим контролем',
                    'Tudo sob o seu controlo','Stay in control'),
                style:const TextStyle(color:Colors.white,
                  fontWeight:FontWeight.w800,fontSize:13),
              ),
            ]),
          ),
        ]),
      ),
    );
  }

  Widget _point(IconData icon, String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: QwinColors.green, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: QwinColors.forest,
                fontWeight: FontWeight.w600,
                fontSize: 13,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _legalControls() {
    return Column(
      children: [
        CheckboxListTile(
          value: _terms,
          contentPadding: EdgeInsets.zero,
          activeColor: QwinColors.green,
          controlAffinity: ListTileControlAffinity.leading,
          title: Text(tr(
            'Я принимаю условия использования',
            'Aceito os termos de utilização',
            'I accept the Terms of Use',
          ), style: const TextStyle(fontSize: 13.5)),
          onChanged: (value) => setState(() => _terms = value == true),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => _openDocument('terms'),
            icon: const Icon(Icons.open_in_new, size: 16),
            label: Text(tr('Прочитать условия', 'Ler os termos',
                'Read the terms')),
          ),
        ),
        CheckboxListTile(
          value: _privacy,
          contentPadding: EdgeInsets.zero,
          activeColor: QwinColors.green,
          controlAffinity: ListTileControlAffinity.leading,
          title: Text(tr(
            'Я ознакомился с политикой конфиденциальности',
            'Tomei conhecimento da política de privacidade',
            'I have read the Privacy Policy',
          ), style: const TextStyle(fontSize: 13.5)),
          onChanged: (value) => setState(() => _privacy = value == true),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => _openDocument('privacy'),
            icon: const Icon(Icons.open_in_new, size: 16),
            label: Text(tr('Прочитать политику', 'Ler a política',
                'Read privacy policy')),
          ),
        ),
      ],
    );
  }
}

