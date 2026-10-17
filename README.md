# KİBELE — Mağaza ve ürün yönetimi

**Düzenlemeye başlamak için [DUZENLEME-REHBERI.md](DUZENLEME-REHBERI.md) dosyasını açın.**

Bu sürümde vitrin `/`, yönetim paneli `/admin` adresindedir. Ürünler D1 veritabanında, yüklenen fotoğraflar R2 dosya deposunda saklanır. Yönetim paneli fiyat, açıklama, taş, materyal, stok, yayın durumu, fotoğraf galerisi ve ana sayfa fotoğrafını düzenler. Gerçek ödeme entegrasyonu henüz yoktur.

## Proje yapısı

- `templates/storefront.html`: vitrinin okunabilir HTML kaynağı.
- `public/app.js`, `public/style.css`: vitrin davranışları ve görünümü.
- `templates/admin.html`: yönetim panelinin okunabilir HTML kaynağı.
- `public/admin.js`, `public/admin.css`: panel davranışları ve görünümü.
- `lib/catalog-service.js`: yetkilendirme, ürün ve görsel API işlemleri.
- `db/schema.ts`, `drizzle/`: veritabanı şeması ve sürümlü SQL geçişleri.
- `app/`: sunucu rotaları.

## Yönetim erişimi

ChatGPT girişinin doğrulanmış Site kimliği kullanılır. İlk yönetici, Site sahibinin doğrulanmış e-posta hesabından kaydedilir; devam eden yetkilendirme kalıcı Site kullanıcı kimliğini kullanır. Kimlik başlıkları yalnızca Sites platformunun güvenilir giriş katmanından alınmalıdır. Başka bir sunucuya taşırken bu başlıklara istemcilerden doğrudan güvenmeyin; eşdeğer güvenli kimlik entegrasyonu kurun.

## Yerel geliştirme

Node.js 22.13+ gerektirir. Paketleri kurup proje betiklerini kullanın. Sites ortamında kurulum/build yönergelerini izleyin. Yerel D1 ve R2 kaynakları barındırılan kaynaklardan ayrıdır; yerel SQL geçişleri ayrıca uygulanmalıdır. `tests/catalog.test.mjs` temel yetki, kalıcı kayıt, ürün CRUD, yayın durumu, yükleme ve ayar kontrollerini SQLite/R2 adaptörleriyle çalıştırır: `node tests/catalog.test.mjs`.

İlk katalog örnek ürünlerden oluşur. İlk ürün düzenlemesinde örnek kayıtlar veritabanına aktarılır. Gerçek ürünlerinizi ekleyip örnekleri silebilirsiniz. Tüm ürünler silindiğinde örnekler yeniden oluşturulmaz.

Fiyatlar EUR cinsindendir. Stok, ürün düzeyinde tutulur; ölçüye göre varyant stoğu bu sürümde yoktur. Fotoğraflar yüklenirken tarayıcıda 2000 piksele kadar küçültülür; JPG, PNG ve WebP kaynak dosyaları desteklenir (dosya başına 5 MB, ürün başına 8 fotoğraf). Panel, kayıttan sonra aynı tarayıcıdaki vitrin sekmelerine yenileme sinyali gönderir. Diğer açık vitrinler yeniden odaklanınca veya en geç 60 saniyelik kontrolle güncellenir.

## Sayfa gezinmesi

Kategori adresleri `/collections/rings` gibi ayrı sayfalardır. Ortak görünüm `templates/storefront.html`, ürün listesi `templates/product-list.html`, başlıklar ve adres eşlemesi `lib/page-config.js` içindedir. Ayrıntılar için düzenleme rehberinin son bölümüne bakın.
