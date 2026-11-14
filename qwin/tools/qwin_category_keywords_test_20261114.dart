import 'package:flutter_test/flutter_test.dart';
import '../lib/services/olx_catalog.dart';
import '../lib/ui/qwin_category_keywords.dart';

void main() {
  late OlxCatalog catalog;
  setUp(() {
    catalog=OlxCatalog(null);
    catalog.categories=[
      const OlxCategory(id:1,namePt:'Casa e Jardim',isLeaf:false),
      const OlxCategory(id:11,parentId:1,namePt:'Aquecedores',isLeaf:true),
      const OlxCategory(id:12,parentId:1,namePt:'Aspiradores',isLeaf:true),
      const OlxCategory(id:2,namePt:'Tecnologia',isLeaf:false),
      const OlxCategory(id:21,parentId:2,namePt:'Telemóveis',isLeaf:true),
      const OlxCategory(id:22,parentId:2,namePt:'Computadores Portáteis',isLeaf:true),
      const OlxCategory(id:3,namePt:'Bebé e Criança',isLeaf:false),
      const OlxCategory(id:31,parentId:3,namePt:'Carrinhos de bebé',isLeaf:true),
      const OlxCategory(id:4,namePt:'Desporto',isLeaf:false),
      const OlxCategory(id:41,parentId:4,namePt:'Bicicletas',isLeaf:true),
    ];
  });

  test('Russian electric heater with Mi logo is not a phone', () {
    final matched=QwinCategoryKeywords.find(catalog,'Mi обогреватель',
      description:'Электрический конвектор',prioritizeDescription:true);
    expect(matched.first.id,11);
    expect(matched.take(3).map((x)=>x.id),isNot(contains(21)));
  });

  test('seller typed category overrides a mistaken product description',(){
    final matched=QwinCategoryKeywords.find(catalog,'телефон',
      description:'старый обогреватель');
    expect(matched.first.id,21);
  });

  test('Ukrainian, Portuguese, English, German and Spanish match real IDs',(){
    for(final q in ['дитячий візочок','carrinho de bebe','stroller',
      'kinderwagen','cochecito']){
      expect(QwinCategoryKeywords.find(catalog,q).first.id,31,
        reason:'Wrong category for '+q);
    }
  });

  test('different languages and accents normalize to OLX categories',(){
    expect(QwinCategoryKeywords.find(catalog,'bicicleta').first.id,41);
    expect(QwinCategoryKeywords.find(catalog,'bike').first.id,41);
    expect(QwinCategoryKeywords.find(catalog,'пылесос').first.id,12);
    expect(QwinCategoryKeywords.find(catalog,'smartphone').first.id,21);
  });

  test('never invent an ID for unknown product words',(){
    expect(QwinCategoryKeywords.find(catalog,'xyz-quasar-thing'),isEmpty);
  });
}
