# KİBELE — Visual Studio Code düzenleme rehberi

Bu paket, yönetim panelini de içeren güncel kaynak kodudur. Önceki yalnızca HTML demosundan farklı olarak sunucu, veritabanı ve dosya deposu kullanır.

## Önce hangi dosyayı açmalıyım?

| Yapmak istediğiniz değişiklik                                         | Dosya veya bölüm            |
| --------------------------------------------------------------------- | --------------------------- |
| Ana sayfa başlıkları, menü, metinler, bölüm sırası                    | `templates/storefront.html` |
| Vitrin renkleri, yazı boyutları, boşluklar, telefon görünümü          | `public/style.css`          |
| Ürün kartları, ürün detay penceresi, sepet, arama, filtre, dil geçişi | `public/app.js`             |
| Yönetim panelinin alanları ve metinleri                               | `templates/admin.html`      |
| Yönetim panelinin renkleri ve yerleşimi                               | `public/admin.css`          |
| Panelde ürün kaydetme, silme, fotoğraf yükleme işlemleri              | `public/admin.js`           |
| Örnek başlangıç ürünleri                                              | `lib/seed.js`               |
| Ürünlerin sunucuya kaydı ve yönetici yetkisi                          | `lib/catalog-service.js`    |
| Veritabanındaki ürün alanları                                         | `db/schema.ts`              |
| Statik örnek fotoğraflar                                              | `public/assets/`            |

Günlük ürün, fiyat, açıklama, stok ve fotoğraf işlemlerini `/admin` panelinden yapın. Bunlar için kaynak kodunu değiştirmeniz gerekmez. `lib/seed.js` yalnızca başlangıç örnekleridir; mevcut veritabanı kayıtlarını değiştirmez.

## Dosyaları açma

1. ZIP'i bir klasöre çıkarın.
2. Visual Studio Code → File → Open Folder ile `Kibele-Site` klasörünü açın.
3. VS Code'un önerdiği **Prettier** eklentisini kurun. `.vscode` ayarları, dosyayı kaydederken biçimlendirmeyi etkinleştirir.
4. Önce bu rehberi, ardından `templates/storefront.html` dosyasını açın.

HTML, CSS ve JavaScript normal girintilerle yazılmıştır. Uzun, tek satırlık HTML dizeleri ayrı HTML kaynaklarına taşınmıştır. Kod bloklarının başlarında Türkçe açıklamalar bulunur. `.prettierrc.json` ve `.editorconfig` ortak yazım düzenini korur.

## Örnek: Ana sayfa başlığını değiştirme

`templates/storefront.html` içinde `Some things` ifadesini arayın. Aynı başlığın üç kısmını düzenleyin:

```html
<h1 data-en="Jewelry with<br>a story." data-tr="Hikâyesi olan<br>takılar.">
  Jewelry with
  <br />
  a story.
</h1>
```

`data-en` İngilizceyi, `data-tr` Türkçeyi belirler. Etiketin içindeki metin ilk açılışta gösterilir. Üçünü birlikte güncellediğinizde dil geçişinde eski metin geri gelmez.

## Örnek: Renkleri değiştirme

`public/style.css` dosyasının başındaki `:root` bölümünü düzenleyin:

```css
:root {
  --paper: #ffffff; /* Ana arka plan */
  --cream: #f0ebe3; /* Bölüm arka planı */
  --ink: #302b26; /* Ana yazı rengi */
  --muted: #736d63; /* İkincil metin */
  --line: #ded8ce; /* İnce çizgiler */
  --accent: #786346; /* Vurgu rengi */
}
```

Tam ekran açılış ve küçülen üst menü için aynı dosyada `Immersive campaign opening` açıklamasını arayın. Kaydırma hesabı `public/app.js` içindeki `updateCampaignHeader` fonksiyonundadır. `@media` blokları tablet ve telefon kurallarını içerir. CSS'te aynı seçici tekrar ediyorsa sonraki kural öncekini değiştirebilir; ilgili ekran genişliğine ait son kuralı da kontrol edin.

## Örnek: Yeni ana sayfa fotoğrafı

Yayınlanan sitede `/admin` → **Vitrin görseli** → **Yeni fotoğraf seç** → **Değişikliği kaydet**.

`public/assets/hero.jpg` başlangıç fotoğrafıdır. Panelde başka fotoğraf seçilmişse sunucudaki ayar önceliklidir. Panelde **Örnek görsele dön** düğmesiyle başlangıç fotoğrafını tekrar seçebilirsiniz.

## Bilgisayarınızda çalıştırma

Node.js **22.13 veya üstü** gerekir. VS Code'da Terminal → New Terminal açın. Terminalin `package.json` bulunan klasörde olduğundan emin olun.

İlk kurulum:

```bash
npx --yes pnpm@11.25.0 install --frozen-lockfile
npm run build
```

Yerel veritabanı tablolarını ilk kez oluşturun:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_square_lockjaw.sql
```

Ardından geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Terminalin gösterdiği yerel adresi açın; standart adres `http://localhost:5173` olur. HTML, CSS ve JavaScript dosyalarını kaydettiğinizde geliştirme sunucusu değişiklikleri işler. Sunucuyu durdurmak için terminalde **Ctrl+C** kullanın.

Yerel veritabanı ve fotoğraf deposu canlı siteden ayrıdır. Canlı ürünler otomatik indirilmez ve yerel dosya değişiklikleri canlı siteye otomatik yayınlanmaz. Yereldeki örnek giriş hesabı canlı yönetici yetkisini otomatik almaz; canlı ürün yönetimini yayınlanan `/admin` adresinde kendi hesabınızla kullanın. Yerel yönetici akışını çalıştırmak için geliştirme ortamının hesap/yetki ayarlarını ayrıca yapılandırmak gerekir.

Bu sürümü `index.html` dosyasına çift tıklayarak veya Live Server ile tam olarak çalıştıramazsınız; veritabanı işlemleri için uygulama sunucusu gerekir.

## Testler

```bash
node tests/catalog.test.mjs
npm run build
```

İlk komut API yetkilerini, ürün işlemlerini, fotoğraf yükleme/doğrulamasını ve kalıcı katalog davranışını test eder. İkinci komut uygulamanın yayın paketini üretir. Tarayıcıda mobil görünüm ve etkileşim kontrolü ayrıca yapılmalıdır.

## Altyapı dosyaları

`app/` URL rotalarını tanımlar. `lib/storefront.ts` ve `lib/admin-html.ts`, HTML kaynaklarını sunucuya bağlayan küçük köprülerdir; görünen metinleri bunların içinde düzenlemeyin. `build/`, `scripts/`, `vendor/` ve `.openai/` çalışma ve yayın altyapısını içerir. Görsel düzenleme için bu dosyalara müdahale etmeniz gerekmez.

Veritabanını değiştirirken uygulanmış SQL geçişlerini düzenlemeyin. `db/schema.ts` değişikliğinden sonra `npm run db:generate` ile yeni geçiş üretin. Başka bir hosting ortamına taşırken veritabanı, dosya deposu ve güvenli giriş entegrasyonu ayrıca kurulmalıdır. İstemciden gelen kimlik başlıklarına doğrudan güvenmeyin.

Fiyat para birimi bu sürümde EUR'dur. Gerçek ödeme ve sipariş işleme henüz bağlanmamıştır. Bu düzenleme çalışması arayüzü React bileşenlerine dönüştürmez: vitrin ve panel okunabilir HTML/CSS/JavaScript, sunucu rotaları ise Vinext tabanlıdır.

## Ayrı kategori ve bilgi sayfaları

Menü bağlantıları artık ana sayfada aşağı kaydırmak yerine ayrı URL'lere gider. Üst menü, logo, sepet, alt bölüm ve CSS ortak kalır.

| Adres                    | İçerik              |
| ------------------------ | ------------------- |
| `/collections/all`       | Tüm takılar         |
| `/collections/rings`     | Yüzükler            |
| `/collections/necklaces` | Kolyeler            |
| `/collections/earrings`  | Küpeler             |
| `/collections/bracelets` | Bileklikler         |
| `/collections/charms`    | Charm               |
| `/collections/gold`      | Altın takılar       |
| `/collections/silver`    | Gümüş takılar       |
| `/collections/gemstones` | Doğal taşlı takılar |
| `/materials`             | Materyaller         |
| `/our-world`             | KİBELE dünyası      |

- `templates/storefront.html`: Ortak üst menü, ana sayfa ve alt bölüm.
- `templates/product-list.html`: Ana sayfa ile kategori sayfalarının paylaştığı ürün listesi.
- `templates/collection.html`: Ayrı sayfalardaki başlık, açıklama, fotoğraf ve yol gösterici bağlantılar.
- `templates/materials.html`: Materyaller sayfasının içeriği.
- `templates/our-world.html`: Marka dünyası sayfasının içeriği.
- `lib/page-config.js`: Kategori başlıkları, İngilizce/Türkçe açıklamalar ve başlık görselleri.
- `lib/page-renderer.js`: Bu parçaları ortak site tasarımıyla birleştirir.
- `app/collections/[slug]/route.ts`: Kategori adreslerini sunar.

Ürünlerin hangi sayfada göründüğü yönetim panelindeki kategori ve materyal alanlarından belirlenir. Ayrı sayfalar için ikinci kez ürün eklemeniz gerekmez. Kategori değiştirirken sepet ve favoriler aynı tarayıcıda korunur. Arama, materyal ve sıralama seçimleri URL parametrelerine yazılır; sayfa yenilendiğinde geri yüklenir. Dil tercihi sayfalar arasında korunur. Tarayıcının geri/ileri tuşları normal sayfa geçmişini kullanır.

Kategori sayfalarında kategoriye özel başlık ve görsel gösterilir. Ana sayfa tam ekran açılışla devam eder. Üst menü bütün sayfalarda büyük başlar, ilk 180 piksel kaydırmada küçülür ve en üste dönünce yeniden büyür. Üst menünün zemini en üstte şeffaftır; aşağı kaydırıldıkça beyaz katmanın opaklığı 0’dan 1’e yükselir. Aynı anda logo ve üst alan küçülür. Açılan menü, kategori başlık bandı ve alt bölüm beyaz kalır. Ana sayfadaki üst yazılar fotoğraf üzerinde beyazdır, zemin doldukça koyu renge geçer. Bu görünüm public/style.css, hareket ise public/app.js içindeki updateCampaignHeader fonksiyonuyla yönetilir.

Sayfa davranışını doğrulamak için `node tests/pages.test.mjs` komutunu çalıştırabilirsiniz.

## Ülke / bölge, diller ve hesap bölümü

- `templates/region-panel.html`: Sağdan açılan panelin başlık ve açıklama yapısı.
- `public/region-panel.js`: Altı bölge grubu, ülkeler ve bu ülkelerde seçilebilen arayüz dilleri.
- `public/localization.js`: Dil kayıtları, temel arayüz çevirileri ve çeviri yardımcıları.
- `public/localization-copy.js`: Vitrin başlıkları ve tanıtım metinlerinin çevirileri.
- `app/account/route.ts` ve `templates/account.html`: Gerçek hesap girişinin sunulduğu sayfa.

Desteklenen 20 arayüz dili: İngilizce, Türkçe, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce, Felemenkçe, Lehçe, Çekçe, Yunanca, Macarca, Romence, Slovence, İsveççe, Japonca, Korece, Tayca, basitleştirilmiş Çince ve geleneksel Çince. Ürün isimleri ve yönetici tarafından girilen açıklamalar otomatik çevrilmez; girildiği dilde gösterilir. Yönetim paneli Türkçedir.

Footer'daki dünya simgesi ülke/bölge panelini açar. İngilizce ve Türkçe gibi dil adları doğrudan dil seçer. Ülke ve dil tercihi aynı tarayıcıda saklanır. Ülke seçimi, gezinme tercihini değiştirir; fiyatı dönüştürmez ve kargo/ödeme kapsamı taahhüt etmez. Fiyat para birimi bu sürümde EUR'dur.

Üst alandaki Oturum Açma bağlantısı `/account` sayfasına gider. Bu sürümde gerçek giriş, Sites'ın ChatGPT hesabı doğrulamasını kullanır. Şifre isteyen sahte bir form yoktur. Ürün yöneticisi yetkisi girişten ayrı kontrol edilir. Site farklı bir altyapıya taşınırsa bu giriş sağlayıcısının yerine kullanılacak kimlik doğrulama sistemi ayrıca bağlanmalıdır.

Kapadokya Serisi `/collections/cappadocia` adresindedir. Panelde ürün düzenlerken **Koleksiyon** alanından Kapadokya, Balon veya Nazar seçin. Bu üç seçim Kapadokya sayfasında listelenir. Ürün atanmamışsa boş koleksiyon gösterilir.

Yeni `series` alanı `drizzle/0001_polite_lionheart.sql` geçişiyle eklenir. Daha önce yerel veritabanını oluşturduysanız, son build sonrasında bu geçişi de uygulayın:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_polite_lionheart.sql
```

Kontrol: `node tests/localization.test.mjs`. Uygulanmış geçişleri tekrar çalıştırmayın; başlangıçta iki geçişi de sırayla uygulayın.

### Tüm sayfalarda banner geçişi

Koleksiyon, materyaller, marka dünyası ve hesap sayfaları `templates/collection.html` içindeki ortak `.hero` bannerını kullanır. Fotoğraf ve başlıklar `lib/page-config.js` dosyasındadır. Sayfanın en üstünde üst menü şeffaftır; ilk 180 piksel kaydırmada beyazlaşır ve küçülür. Bu hareket `public/app.js` içindeki `updateCampaignHeader`, görünüm `public/style.css` içindeki `.campaign-header` ve `.hero` kurallarıyla yönetilir. Ana sayfanın yönetim panelindeki görseli iç sayfaların fotoğraflarını değiştirmez.
