import 'dart:async';
import 'package:flutter/material.dart';
import '../services/olx_catalog.dart';
import '../services/local_translation.dart';

/// Offline aliases only. The catalogue itself and every selectable ID remain
/// the official OLX taxonomy; Qwin never invents its own publishable category.
class QwinCategoryKeywords {
  QwinCategoryKeywords._();

  static String fold(String input) {
    var value=input.toLowerCase().trim().replaceAll('ё','е');
    const from='áàâãäåéèêëíìîïóòôõöúùûüçñýÿ';
    const to  ='aaaaaaeeeeiiiiooooouuuucnyy';
    for(var i=0;i<from.length;i++){
      value=value.replaceAll(from[i],to[i]);
    }
    return value.replaceAll(RegExp(r'[^a-z0-9а-яіїєґ]+',unicode:true),' ')
      .replaceAll(RegExp(r'\s+'),' ').trim();
  }

  static const Map<String,List<String>> _concepts={
    'aquecedor':[
      'обогревател','электрообогревател','обігрівач','нагрівач',
      'калорифер','конвектор','тепловентилятор','радиатор отопления',
      'heater','space heater','electric heater','convector',
      'radiateur','chauffage','heizlufter','heizung',
      'calefactor','calefaccion','aquecedor','termoventilador',
      'radiador eletrico','stufa elettrica','riscaldamento'
    ],
    'telemove':[
      'телефон','смартфон','мобильный телефон','мобільний телефон',
      'айфон','iphone','smartphone','mobile phone','cell phone',
      'telemovel','movil','telefono movil','telefono','telephone portable',
      'handy','mobiltelefon','cellulare'
    ],
    'computador':[
      'ноутбук','компьютер','комп ютер','ноут','laptop','notebook',
      'computer','pc','ordinateur','ordinateur portable','ordenador',
      'computador','rechner','portatile'
    ],
    'tablet':[
      'планшет','планшетный','планшетний','ipad','tablet',
      'tablette','tableta'
    ],
    'monitor':[
      'монитор','монітор','display','monitor','ecran','bildschirm',
      'pantalla','schermo'
    ],
    'televis':[
      'телевизор','телевізор','телек','television','tv','televisor',
      'fernseher','televisao','televisore'
    ],
    'frigorif':[
      'холодильник','холодильник','морозильник','freezer','fridge',
      'refrigerator','frigorifico','geladeira','nevera','refrigerateur',
      'kuhlschrank','frigorifero'
    ],
    'lavar':[
      'стиральная машина','пральна машина','стиралка','washing machine',
      'maquina de lavar','lavadora','lave linge','waschmaschine',
      'lavatrice'
    ],
    'aspirador':[
      'пылесос','пилосос','vacuum cleaner','vacuum','aspirador',
      'aspirateur','staubsauger','aspirapolvere'
    ],
    'microondas':[
      'микроволновка','микрохвильовка','микроволновая печь',
      'microwave','microondas','micro ondes','mikrowelle'
    ],
    'fogao':[
      'плита','духовка','варочная панель','форno','cooker','oven',
      'fogao','forno','cocina','horno','four','herd','backofen'
    ],
    'sofa':[
      'диван','софа','канапа','sofa','couch','canape','sofa cama'
    ],
    'cadeir':[
      'стул','кресло','стільця','крісло','chair','armchair',
      'cadeira','poltrona','silla','fauteuil','stuhl','sedia'
    ],
    'mesa':[
      'стол','столик','стіл','table','mesa','tisch','tavolo'
    ],
    'cama':[
      'кровать','ліжко','bed','cama','lit','bett','letto'
    ],
    'roupe':[
      'одежда','куртка','платье','пальто','кофта','одяг','сукня',
      'clothing','clothes','jacket','dress','roupa','vestuario',
      'ropa','chaqueta','vetement','kleidung','jacke','abbigliamento'
    ],
    'sapato':[
      'обувь','ботинки','кроссовки','взуття','черевики','shoe',
      'shoes','sneaker','boots','sapatos','calcado','zapatillas',
      'chaussures','schuhe','scarpe'
    ],
    'biciclet':[
      'велосипед','велосипед','велік','байк','bicycle','bike',
      'bicicleta','velo','fahrrad','bici'
    ],
    'trotinete':[
      'самокат','самокат','електросамокат','scooter','kick scooter',
      'trotinete','patinete','trottinette','roller'
    ],
    'carrinho':[
      'детская коляска','коляска','дитячий візочок','pushchair',
      'stroller','pram','carrinho de bebe','cochecito','poussette',
      'kinderwagen','passeggino'
    ],
    'brinquedo':[
      'игрушка','игрушки','іграшка','toy','toys','brinquedo',
      'juguete','jouet','spielzeug','giocattolo'
    ],
    'camera':[
      'фотоаппарат','фотокамера','камера для фото','фотоапарат',
      'camera','camera fotografica','appareil photo','fotokamera'
    ],
    'instrument':[
      'гитара','пианино','музыкальный инструмент','гітара',
      'guitar','piano','musical instrument','guitarra','instrumento musical',
      'instrument de musique','musikinstrument','chitarra'
    ],
    'livro':[
      'книга','книги','книжка','book','books','livro','libro',
      'livre','buch'
    ],
    'carro':[
      'автомобиль','машина автомобиль','легковой автомобиль',
      'автомобіль','авто','car','automobile','coche','voiture',
      'auto','carro','pkw','macchina'
    ],
    'moto':[
      'мотоцикл','мотоцикл','мото','motorcycle','motorbike',
      'motociclo','motocicleta','motorrad'
    ],
    'pneu':[
      'шина','покрышка','шины','гума автомобільна','tyre','tire',
      'pneu','neumatico','reifen','pneumatico'
    ],
    'ferrament':[
      'инструменты','дрель','шуруповерт','электроинструмент',
      'інструмент','дриль','tools','drill','tool','ferramenta',
      'taladro','outil','werkzeug','attrezzo'
    ],
    'jardim':[
      'садовый','газонокосилка','растения','цветы','рослини',
      'garden','gardening','lawn mower','plant','plants',
      'jardim','jardin','garten','giardino'
    ],
    'animal':[
      'животные','собака','кошка','тварини','кішка','pets','animals',
      'dog','cat','animais','perro','gato','chien','katze'
    ]
  };

  static bool _hasTerm(String value,String term){
    final q=fold(value), t=fold(term);
    if(q.isEmpty||t.length<2)return false;
    if((' '+q+' ').contains(' '+t+' '))return true;
    if(!t.contains(' ')&&t.length>=5){
      final words=q.split(' ');
      return words.any((w)=>w.length>=t.length && w.startsWith(t));
    }
    return false;
  }

  static List<String> portugueseTerms(String input,{int max=8}){
    if(input.trim().length<2)return const [];
    final keys=<String>[];
    for(final e in _concepts.entries){
      if(e.value.any((a)=>_hasTerm(input,a)))keys.add(e.key);
      if(keys.length>=max)break;
    }
    return keys;
  }

  static int _score(String search,String itemName,String path,
    List<String> topics,String localeLabel) {
    final target=fold(search), name=fold(itemName), full=fold(path);
    final translated=fold(localeLabel);
    var score=0;
    if(target.isNotEmpty){
      if(target==name||target==translated)score+=150;
      else if(name.contains(target)||translated.contains(target))score+=80;
      if(full.contains(target))score+=45;
      for(final token in target.split(' ').where((t)=>t.length>=3)){
        if((' '+name+' ').contains(' '+token+' ')||
          (' '+translated+' ').contains(' '+token+' '))score+=18;
      }
    }
    for(final topic in topics){
      if(name.contains(topic))score+=180;
      else if(full.contains(topic))score+=95;
    }
    return score;
  }

  static List<OlxCategory> find(OlxCatalog catalog,String query,{
      String description='',String locale='pt',bool sellerOnly=true,int limit=10,
      bool prioritizeDescription=false}){
    if(query.trim().length<2&&description.trim().length<3)return const [];
    final fromDescription=portugueseTerms(description);
    final fromTitle=portugueseTerms(query);
    final topics=prioritizeDescription&&fromDescription.isNotEmpty
      ?fromDescription:fromTitle.isNotEmpty?fromTitle:fromDescription;
    final found=<({OlxCategory category,int score})>[];
    // Build one index instead of scanning the complete taxonomy at every
    // parent lookup; keeps typing responsive on large official OLX trees.
    final indexed={for(final c in catalog.categories)c.id:c};
    String pathOf(OlxCategory item){
      final names=<String>[];
      OlxCategory? cursor=item;
      for(var depth=0;cursor!=null&&depth<8;depth++){
        names.insert(0,cursor.namePt);
        cursor=cursor.parentId==null?null:indexed[cursor.parentId];
      }
      return names.join(' ');
    }
    for(final c in catalog.categories){
      if(sellerOnly&&!c.isLeaf)continue;
      final path=pathOf(c);
      final translated=catalog.label(c,locale);
      var score=_score(query,c.namePt,path,topics,translated);
      if(score<=0)continue;
      // If the description clearly says heater, do not recommend phones
      // merely because a logo such as Mi/Xiaomi was recognized on the photo.
      if(topics.contains('aquecedor')&&RegExp(
        r'telem[oó]ve|smartphone|telefone',caseSensitive:false).hasMatch(path))continue;
      if(topics.contains('telemove')&&RegExp(
        r'aqueced|climatiz|radiador',caseSensitive:false).hasMatch(path))continue;
      found.add((category:c,score:score));
    }
    found.sort((a,b){
      final byScore=b.score.compareTo(a.score);
      return byScore!=0?byScore:a.category.id.compareTo(b.category.id);
    });
    return found.take(limit).map((x)=>x.category).toList(growable:false);
  }
}

/// Manual multilingual search in the *real* OLX catalogue. No network
/// translation is required before a Russian, Ukrainian or English search works.
class QwinCategoryKeywordSearch extends StatefulWidget {
  final OlxCatalog catalog;
  final String locale;
  final String productTitle,productDescription;
  final List<String> visualEvidence;
  final bool sellerOnly;
  final ValueChanged<OlxCategory> onSelected;
  const QwinCategoryKeywordSearch({super.key,required this.catalog,
    required this.locale,required this.onSelected,
    this.productTitle='',this.productDescription='',
    this.visualEvidence=const [],this.sellerOnly=true});
  @override State<QwinCategoryKeywordSearch> createState()=>
    _QwinCategoryKeywordSearchState();
}
class _QwinCategoryKeywordSearchState
    extends State<QwinCategoryKeywordSearch>{
  final _controller=TextEditingController();
  Timer? _debounce;
  String _query='';
  List<String> _translated=const [];
  int _translationEpoch=0;
  Future<void> _lookupTranslation(String q,int epoch)async{
    if(q.length<2)return;
    try{
      final translations=await QwinLocalTranslation.searchVariants(q)
        .timeout(const Duration(seconds:4));
      if(!mounted||epoch!=_translationEpoch||_query!=q)return;
      setState(()=>_translated=translations);
    }catch(_){/* Local aliases and official taxonomy still work. */}
  }
  @override void dispose(){
    _debounce?.cancel();
    _translationEpoch++;
    _controller.dispose();
    super.dispose();
  }
  @override Widget build(BuildContext context){
    final ru=widget.locale=='ru',pt=widget.locale=='pt';
    final all=<OlxCategory>[];
    final seen=<int>{};
    if(_query.length>=2){
      final candidates=[_query,..._translated.take(4)];
      for(final q in candidates){
        for(final item in QwinCategoryKeywords.find(widget.catalog,q,
          description:widget.sellerOnly
            ?widget.productDescription+' '+widget.visualEvidence.join(' ')
            :'',locale:widget.locale,
          sellerOnly:widget.sellerOnly,limit:12)){
          if(seen.add(item.id))all.add(item);
        }
      }
    }
    final rows=all.take(8).toList(growable:false);
    return Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      TextField(controller:_controller,
        textInputAction:TextInputAction.search,
        onChanged:(v){
          _debounce?.cancel();
          final epoch=++_translationEpoch;
          _translated=const [];
          _debounce=Timer(const Duration(milliseconds:220),(){
            if(!mounted)return;
            final text=v.trim();
            setState(()=>_query=text);
            if(text.length>=2)unawaited(_lookupTranslation(text,epoch));
          });
        },
        decoration:InputDecoration(
          labelText:ru?'Поиск категории по названию товара':
            pt?'Procurar categoria pelo artigo':
            'Find category by product name',
          hintText:ru?'Например: обогреватель, коляска, велосипед':
            pt?'Ex.: aquecedor, carrinho, bicicleta':
            'E.g. heater, stroller, bicycle',
          prefixIcon:const Icon(Icons.manage_search_rounded),
          suffixIcon:_controller.text.isEmpty?null:IconButton(
            icon:const Icon(Icons.close_rounded),
            onPressed:(){
              _controller.clear();
              _debounce?.cancel();
              _translationEpoch++;
              setState((){_query='';_translated=const [];});
            }),
        )),
      if(_query.length>=2&&rows.isEmpty)
        Padding(padding:const EdgeInsets.all(9),child:Text(
          widget.catalog.ready
          ?(ru?'Совпадений нет. Откройте каталог ниже.':
             pt?'Sem resultados. Abra o catálogo abaixo.':
                'No matches. Browse the catalogue below.')
          :(ru?'Загрузка категорий OLX':
             pt?'A carregar categorias OLX':'Loading OLX categories'),
          style:const TextStyle(fontSize:12))),
      for(final c in rows)
        ListTile(
          dense:true,
          title:Text(widget.catalog.label(c,widget.locale),
            maxLines:1,overflow:TextOverflow.ellipsis),
          subtitle:Text(widget.catalog.pathLabel(c.id,widget.locale),
            maxLines:2,overflow:TextOverflow.ellipsis),
          trailing:const Icon(Icons.chevron_right_rounded),
          onTap:(){
            widget.onSelected(c);
            _controller.clear();
            _translationEpoch++;
            setState((){_query='';_translated=const [];});
          }),
    ]);
  }
}
