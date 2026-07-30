import "dotenv/config";
import {
  MOCK_KIMLIKLER,
  MOCK_KOORDINATOR_KIMLIKLERI,
  MOCK_PROJE_YONETICISI_KIMLIKLERI,
  mockKimlikBul,
} from "../src/lib/auth/mock-kullanicilar";
import {
  aktifAtamaGetir,
  danismanAdaylariGetir,
  ilkAtamayiYurut,
  ogrenciDanismanSecti,
} from "../src/lib/danisman/atama";
import { prisma } from "../src/lib/db";
import { kullaniciSagla } from "../src/lib/kullanici/sagla";
import { saklamaSuresiTemizligi } from "../src/lib/kvkk/saklama";
import { danismanlikDurumunuDegistir } from "../src/lib/ogretmen/danismanlik";
import { ogrenciKapsamFiltresi } from "../src/lib/yetki/kapsam";
import type { OturumKullanicisi } from "../src/lib/yetki/tipler";

/**
 * Duman testi: mock kimliklerle uçtan uca akışı gerçek veritabanında doğrular.
 *
 * Birim testler kararları (saf fonksiyonları) sınar; bu script kararların
 * veritabanına doğru yazıldığını ve değişmezlerin veritabanı kısıtlarıyla
 * gerçekten korunduğunu sınar.
 *
 * Çalıştırma:  npx tsx scripts/duman-testi.ts
 */

let basarili = 0;
let basarisiz = 0;

function kontrol(aciklama: string, kosul: boolean) {
  if (kosul) {
    basarili += 1;
    console.log(`  ✓ ${aciklama}`);
  } else {
    basarisiz += 1;
    console.error(`  ✗ ${aciklama}`);
  }
}

async function testVerisiniTemizle() {
  /*
   * Yönetim rolleri (seed) korunur; öğrenci/öğretmen kayıtları sıfırlanır.
   *
   * Korunacaklar elle yazılmaz, seed'in kullandığı listelerden türetilir:
   * kimlikler değiştiğinde elle tutulan bir kopya sessizce eskir ve duman testi
   * proje yöneticilerinin rolünü silerek sistemi yönetici olmadan bırakır.
   */
  const korunanlar = [
    ...MOCK_PROJE_YONETICISI_KIMLIKLERI,
    ...MOCK_KOORDINATOR_KIMLIKLERI.map((k) => k.authProviderId),
  ] as string[];
  const silinecekler = MOCK_KIMLIKLER.filter(
    (kimlik) => !korunanlar.includes(kimlik.authProviderId),
  ).map((kimlik) => kimlik.authProviderId);

  const kullanicilar = await prisma.kullanici.findMany({
    where: { authProviderId: { in: silinecekler } },
    select: { id: true },
  });
  const idler = kullanicilar.map((k) => k.id);
  if (idler.length === 0) return;

  /*
   * Silme sırası yabancı anahtarları izler: önce kullanıcıya BAĞLI kayıtlar,
   * sonra kullanıcı. Faaliyet silindiğinde başvuru/ek/yorum/etiket satırları
   * cascade ile gider, ama silinen kullanıcının BAŞKASININ faaliyetindeki
   * başvurusu ve değerlendirici izi cascade kapsamında değildir; onları önce
   * elle temizliyoruz.
   */
  await prisma.basvuru.deleteMany({
    where: {
      OR: [
        { ogrenciId: { in: idler } },
        { degerlendirenKullaniciId: { in: idler } },
      ],
    },
  });
  await prisma.yorum.deleteMany({
    where: {
      OR: [
        { yazanKullaniciId: { in: idler } },
        { silenKullaniciId: { in: idler } },
      ],
    },
  });
  await prisma.faaliyetEk.deleteMany({
    where: {
      OR: [
        { yukleyenKullaniciId: { in: idler } },
        { silenKullaniciId: { in: idler } },
      ],
    },
  });
  await prisma.faaliyet.deleteMany({
    where: {
      OR: [
        { duzenleyenKullaniciId: { in: idler } },
        { onaylayanKullaniciId: { in: idler } },
      ],
    },
  });
  await prisma.ogrenciGorevRolu.deleteMany({
    where: {
      OR: [{ ogrenciId: { in: idler } }, { atayanKullaniciId: { in: idler } }],
    },
  });
  await prisma.ogrenciKazanim.deleteMany({
    where: { ogrenciId: { in: idler } },
  });
  await prisma.danismanAtama.deleteMany({
    where: { OR: [{ ogrenciId: { in: idler } }, { danismanKullaniciId: { in: idler } }] },
  });
  await prisma.bildirim.deleteMany({ where: { kullaniciId: { in: idler } } });
  await prisma.erisimlogu.deleteMany({ where: { kullaniciId: { in: idler } } });
  await prisma.ogrenciCalismaGrubu.deleteMany({ where: { ogrenciId: { in: idler } } });
  await prisma.kullaniciRol.deleteMany({ where: { kullaniciId: { in: idler } } });
  await prisma.ogrenciProfil.deleteMany({ where: { kullaniciId: { in: idler } } });
  await prisma.ogretmenProfil.deleteMany({ where: { kullaniciId: { in: idler } } });
  await prisma.kullanici.deleteMany({ where: { id: { in: idler } } });
}

async function sagla(authProviderId: string) {
  const kimlik = mockKimlikBul(authProviderId);
  if (!kimlik) throw new Error(`Kimlik yok: ${authProviderId}`);
  const sonuc = await kullaniciSagla(kimlik);
  return sonuc.kullaniciId;
}

async function oturumKullanicisiKur(
  kullaniciId: number,
): Promise<OturumKullanicisi> {
  const kayit = await prisma.kullanici.findUniqueOrThrow({
    where: { id: kullaniciId },
    include: {
      roller: {
        where: { bitisTarihi: null },
        select: { rolKodu: true, ilKodu: true, kurumKodu: true },
      },
    },
  });
  return {
    id: kayit.id,
    authProviderId: kayit.authProviderId,
    ad: kayit.ad,
    soyad: kayit.soyad,
    kurumKodu: kayit.kurumKodu,
    ilKodu: kayit.ilKodu,
    ilceKodu: kayit.ilceKodu,
    sinif: kayit.sinif,
    brans: kayit.brans,
    egitimOgretimYili: kayit.egitimOgretimYili,
    roller: kayit.roller,
  };
}

async function main() {
  console.log("Duman testi başlıyor...\n");
  await testVerisiniTemizle();

  console.log("1. İlk giriş ve rol tayini");
  const ogrenci1 = await sagla("ogrenci-001");
  const ogretmen1 = await sagla("ogretmen-001");

  const ogrenciRolleri = await prisma.kullaniciRol.findMany({
    where: { kullaniciId: ogrenci1, bitisTarihi: null },
  });
  kontrol(
    "öğrenci ilk girişte OGRENCI rolü alır",
    ogrenciRolleri.length === 1 && ogrenciRolleri[0].rolKodu === "OGRENCI",
  );

  const ogretmenRolleri = await prisma.kullaniciRol.findMany({
    where: { kullaniciId: ogretmen1, bitisTarihi: null },
  });
  kontrol("öğretmen ilk girişte rolsüz oluşur", ogretmenRolleri.length === 0);

  const ogretmenProfil = await prisma.ogretmenProfil.findUnique({
    where: { kullaniciId: ogretmen1 },
  });
  kontrol(
    "öğretmen danışmanlık işaretlemesi varsayılan olarak kapalıdır",
    ogretmenProfil?.danismanOlmakIstiyor === false,
  );

  kontrol(
    "işaretlemeyen öğretmen danışman adayı listesinde görünmez",
    (await danismanAdaylariGetir(750001)).length === 0,
  );

  console.log("\n2. Danışmansız okulda il koordinatörüne bağlanma");
  const karar1 = await ilkAtamayiYurut(ogrenci1);
  kontrol(
    "okulda danışman yoksa öğrenci il koordinatörüne bağlanır",
    karar1.tur === "IL_KOORDINATORUNE",
  );
  const atama1 = await aktifAtamaGetir(ogrenci1);
  kontrol(
    "atama tipi IL_KOORDINATOR_FALLBACK olarak kaydedilir",
    atama1?.atamaTipi === "IL_KOORDINATOR_FALLBACK",
  );

  console.log("\n3. Öğretmen danışmanlık görevi alıyor");
  await danismanlikDurumunuDegistir(ogretmen1, true);
  const danismanRolu = await prisma.kullaniciRol.findFirst({
    where: { kullaniciId: ogretmen1, rolKodu: "DANISMAN", bitisTarihi: null },
  });
  kontrol(
    "işaretleyen öğretmene kurum kapsamlı DANISMAN rolü verilir",
    danismanRolu?.kurumKodu === 750001,
  );
  kontrol(
    "işaretleyen öğretmen danışman adayı listesine girer",
    (await danismanAdaylariGetir(750001)).length === 1,
  );

  const koordinatorBildirimi = await prisma.bildirim.findFirst({
    where: { tip: "KOORDINATOR_DEVREDILEBILIR_OGRENCI" },
    orderBy: { id: "desc" },
  });
  kontrol(
    "okula danışman gelince koordinatöre devir bildirimi düşer",
    koordinatorBildirimi !== null,
  );
  const atamaHalaKoordinatorde = await aktifAtamaGetir(ogrenci1);
  kontrol(
    "öğrenci otomatik devredilmez, koordinatörde kalır",
    atamaHalaKoordinatorde?.danismanKullaniciId ===
      atama1?.danismanKullaniciId,
  );

  console.log("\n4. Birden fazla aday: öğrenci kendi danışmanını seçer");
  const ogretmen2 = await sagla("ogretmen-002");
  await danismanlikDurumunuDegistir(ogretmen2, true);
  const ogrenci2 = await sagla("ogrenci-002");
  const karar2 = await ilkAtamayiYurut(ogrenci2);
  kontrol("iki aday varsa seçim istenir", karar2.tur === "SECIM_GEREKLI");
  kontrol(
    "seçim yapılmadan atama oluşturulmaz",
    (await aktifAtamaGetir(ogrenci2)) === null,
  );

  await ogrenciDanismanSecti(ogrenci2, ogretmen2);
  const atama2 = await aktifAtamaGetir(ogrenci2);
  kontrol(
    "öğrencinin seçimi OGRENCI_SECTI tipiyle kaydedilir",
    atama2?.danismanKullaniciId === ogretmen2 &&
      atama2?.atamaTipi === "OGRENCI_SECTI",
  );

  let baskaOkulHatasi = false;
  try {
    await ogrenciDanismanSecti(ogrenci2, ogretmen1 + 99999);
  } catch {
    baskaOkulHatasi = true;
  }
  kontrol(
    "okulun adayı olmayan bir öğretmen seçilemez",
    baskaOkulHatasi,
  );

  console.log("\n5. Tek aday: otomatik atama");
  const ogretmen4 = await sagla("ogretmen-004");
  await danismanlikDurumunuDegistir(ogretmen4, true);
  const ogrenci4 = await sagla("ogrenci-004");
  const karar4 = await ilkAtamayiYurut(ogrenci4);
  kontrol("tek aday varsa otomatik atanır", karar4.tur === "OTOMATIK");
  kontrol(
    "otomatik atama doğru öğretmene yapılır",
    (await aktifAtamaGetir(ogrenci4))?.danismanKullaniciId === ogretmen4,
  );

  console.log("\n6. Kenar durum: koordinatörü olmayan ilde danışmansız okul");
  const ogrenci5 = await sagla("ogrenci-005");
  const karar5 = await ilkAtamayiYurut(ogrenci5);
  kontrol("öğrenci atanamaz", karar5.tur === "ATANAMADI");
  const atanamadiBildirimi = await prisma.bildirim.findFirst({
    where: { tip: "OGRENCI_ATANAMADI" },
    orderBy: { id: "desc" },
  });
  kontrol(
    "proje yöneticisine uyarı bildirimi düşer",
    atanamadiBildirimi !== null,
  );

  console.log("\n7. Danışmanlığı bırakma ve devir");
  await danismanlikDurumunuDegistir(ogretmen2, false);
  const atama2Sonrasi = await aktifAtamaGetir(ogrenci2);
  kontrol(
    "okulda tek danışman kaldığında öğrenci otomatik ona devredilir",
    atama2Sonrasi?.danismanKullaniciId === ogretmen1 &&
      atama2Sonrasi?.atamaTipi === "DEVIR",
  );

  const kapatilanAtama = await prisma.danismanAtama.findFirst({
    where: { ogrenciId: ogrenci2, bitisTarihi: { not: null } },
    orderBy: { id: "desc" },
  });
  kontrol(
    "eski atama güncellenmez, bitiş tarihi ve nedeniyle kapatılır",
    kapatilanAtama?.kapanmaNedeni === "DANISMANLIK_BIRAKILDI",
  );

  const atamaGecmisi = await prisma.danismanAtama.count({
    where: { ogrenciId: ogrenci2 },
  });
  kontrol("atama geçmişi korunur (kapat-yeni kayıt aç)", atamaGecmisi >= 2);

  console.log("\n8. Kapsam filtresi");
  const danismanOturumu = await oturumKullanicisiKur(ogretmen1);
  const danismaninGorduğu = await prisma.kullanici.findMany({
    where: ogrenciKapsamFiltresi(danismanOturumu),
    select: { id: true },
  });
  const gorulenIdler = danismaninGorduğu.map((k) => k.id);
  kontrol(
    "danışman kendi danışmanlığındaki öğrenciyi görür",
    gorulenIdler.includes(ogrenci2),
  );
  kontrol(
    "danışman aynı okulda olsa da koordinatöre bağlı öğrenciyi görmez",
    !gorulenIdler.includes(ogrenci1),
  );
  kontrol(
    "danışman başka ildeki öğrenciyi görmez",
    !gorulenIdler.includes(ogrenci4) && !gorulenIdler.includes(ogrenci5),
  );

  const ogrenciOturumu = await oturumKullanicisiKur(ogrenci2);
  const ogrencininGorduğu = await prisma.kullanici.findMany({
    where: ogrenciKapsamFiltresi(ogrenciOturumu),
    select: { id: true },
  });
  kontrol(
    "öğrenci yalnızca kendisini görür",
    ogrencininGorduğu.length === 1 && ogrencininGorduğu[0].id === ogrenci2,
  );

  const koordinator34 = await prisma.kullanici.findUniqueOrThrow({
    where: { authProviderId: "koordinator-34" },
    select: { id: true },
  });
  const koordinatorOturumu = await oturumKullanicisiKur(koordinator34.id);
  const koordinatorunGorduğu = await prisma.kullanici.findMany({
    where: ogrenciKapsamFiltresi(koordinatorOturumu),
    select: { id: true, ilKodu: true },
  });
  kontrol(
    "il koordinatörü yalnızca kendi ilindeki öğrencileri görür",
    koordinatorunGorduğu.length > 0 &&
      koordinatorunGorduğu.every((k) => k.ilKodu === "34"),
  );

  console.log("\n9. Veritabanı değişmezleri");
  let ikinciAtamaReddedildi = false;
  try {
    await prisma.danismanAtama.create({
      data: {
        ogrenciId: ogrenci2,
        danismanKullaniciId: ogretmen4,
        atamaTipi: "OTOMATIK",
      },
    });
  } catch {
    ikinciAtamaReddedildi = true;
  }
  kontrol(
    "bir öğrenciye ikinci aktif danışman ataması veritabanında reddedilir",
    ikinciAtamaReddedildi,
  );

  let cakisanRolReddedildi = false;
  try {
    await prisma.kullaniciRol.create({
      data: {
        kullaniciId: koordinator34.id,
        rolKodu: "DANISMAN",
        kurumKodu: 750001,
      },
    });
  } catch {
    cakisanRolReddedildi = true;
  }
  kontrol(
    "aynı öğretmen hem danışman hem il koordinatörü olamaz (veritabanı kısıtı)",
    cakisanRolReddedildi,
  );

  let kapsamsizRolReddedildi = false;
  try {
    await prisma.kullaniciRol.create({
      data: { kullaniciId: ogretmen4, rolKodu: "IL_KOORDINATOR" },
    });
  } catch {
    kapsamsizRolReddedildi = true;
  }
  /*
   * Bir ilin tek koordinatörü olur. Kural uygulamada da kontrol ediliyor ama
   * o kontrol transaction dışında; eşzamanlı iki atamayı yalnızca veritabanı
   * kısıtı durdurabilir.
   */
  let ikinciKoordinatorReddedildi = false;
  const mevcutKoordinator = await prisma.kullaniciRol.findFirst({
    where: { rolKodu: "IL_KOORDINATOR", bitisTarihi: null },
    select: { ilKodu: true },
  });
  if (mevcutKoordinator?.ilKodu) {
    try {
      await prisma.kullaniciRol.create({
        data: {
          kullaniciId: ogretmen1,
          rolKodu: "IL_KOORDINATOR",
          ilKodu: mevcutKoordinator.ilKodu,
        },
      });
    } catch {
      ikinciKoordinatorReddedildi = true;
    }
  }
  kontrol(
    "bir ile ikinci aktif il koordinatörü atanamaz",
    ikinciKoordinatorReddedildi,
  );

  kontrol(
    "kapsamı (il kodu) olmayan il koordinatörü rolü reddedilir",
    kapsamsizRolReddedildi,
  );

  let bosGerekceReddedildi = false;
  let bosYorumReddedildi = false;
  let yanitZinciriKorundu = false;
  try {
    const faaliyet = await prisma.faaliyet.create({
      data: {
        ad: "Duman testi faaliyeti",
        aciklama: "test",
        tarih: new Date(),
        kapsam: "OKUL",
        etkinlikKategorisi: "IL_ETKINLIGI",
        kurumKodu: 750001,
        kontenjan: 5,
        duzenleyenKullaniciId: ogretmen1,
        duzenleyenBirim: "Test",
        basvuruBaslangic: new Date(),
        basvuruBitis: new Date(Date.now() + 86400000),
      },
    });
    try {
      await prisma.basvuru.create({
        data: { faaliyetId: faaliyet.id, ogrenciId: ogrenci2, gerekce: "   " },
      });
    } catch {
      bosGerekceReddedildi = true;
    }

    try {
      await prisma.yorum.create({
        data: {
          faaliyetId: faaliyet.id,
          yazanKullaniciId: ogrenci2,
          icerik: "  \n ",
        },
      });
    } catch {
      bosYorumReddedildi = true;
    }

    // Silinen üst yoruma verilmiş yanıt zinciri kopmamalı: üst yorum
    // soft-delete edilir, alt yorum yerinde durur.
    const ustYorum = await prisma.yorum.create({
      data: {
        faaliyetId: faaliyet.id,
        yazanKullaniciId: ogrenci2,
        icerik: "Üst yorum",
      },
    });
    const altYorum = await prisma.yorum.create({
      data: {
        faaliyetId: faaliyet.id,
        yazanKullaniciId: ogrenci1,
        ustYorumId: ustYorum.id,
        icerik: "Yanıt",
      },
    });
    await prisma.yorum.update({
      where: { id: ustYorum.id },
      data: {
        silindiMi: true,
        silenKullaniciId: ogrenci2,
        silinmeTarihi: new Date(),
      },
    });
    const kalanAlt = await prisma.yorum.findUnique({
      where: { id: altYorum.id },
      select: { id: true, ustYorumId: true },
    });
    yanitZinciriKorundu = kalanAlt?.ustYorumId === ustYorum.id;

    await prisma.faaliyet.delete({ where: { id: faaliyet.id } });
  } catch (hata) {
    console.error("  ! faaliyet oluşturulamadı:", hata);
  }
  kontrol(
    "boşluktan oluşan başvuru gerekçesi reddedilir",
    bosGerekceReddedildi,
  );
  kontrol("boşluktan oluşan yorum reddedilir", bosYorumReddedildi);
  kontrol(
    "silinen üst yorumun altındaki yanıt korunur (zincir kopmaz)",
    yanitZinciriKorundu,
  );

  let kapsamsizFaaliyetReddedildi = false;
  try {
    await prisma.faaliyet.create({
      data: {
        ad: "Kapsamsız okul faaliyeti",
        aciklama: "test",
        tarih: new Date(),
        kapsam: "OKUL",
        etkinlikKategorisi: "IL_ETKINLIGI",
        kontenjan: 5,
        duzenleyenKullaniciId: ogretmen1,
        duzenleyenBirim: "Test",
        basvuruBaslangic: new Date(),
        basvuruBitis: new Date(Date.now() + 86400000),
      },
    });
  } catch {
    kapsamsizFaaliyetReddedildi = true;
  }
  kontrol(
    "okul kapsamlı faaliyet kurum kodu olmadan oluşturulamaz",
    kapsamsizFaaliyetReddedildi,
  );

  /*
   * Etkinlik kategorisi ile program bağlantısı tutarlı olmak zorunda: adı sabit
   * kategorilerde program ZORUNLU, il etkinliğinde YASAK. Uygulama katmanı bunu
   * zaten kontrol ediyor ama kısıt veritabanında durmalı.
   */
  let programsizTemelEtkinlikReddedildi = false;
  try {
    await prisma.faaliyet.create({
      data: {
        ad: "Programsız temel etkinlik",
        aciklama: "test",
        tarih: new Date(),
        kapsam: "ULUSAL",
        etkinlikKategorisi: "TEMEL_ETKINLIK",
        kontenjan: 5,
        duzenleyenKullaniciId: ogretmen1,
        duzenleyenBirim: "Test",
        basvuruBaslangic: new Date(),
        basvuruBitis: new Date(Date.now() + 86400000),
      },
    });
  } catch {
    programsizTemelEtkinlikReddedildi = true;
  }
  kontrol(
    "Temel Etkinlik programsız oluşturulamaz",
    programsizTemelEtkinlikReddedildi,
  );

  let programliIlEtkinligiReddedildi = false;
  const ornekProgram = await prisma.temelEtkinlikProgrami.findFirst({
    select: { id: true },
  });
  if (ornekProgram) {
    try {
      await prisma.faaliyet.create({
        data: {
          ad: "Programa bağlanmış il etkinliği",
          aciklama: "test",
          tarih: new Date(),
          kapsam: "ULUSAL",
          etkinlikKategorisi: "IL_ETKINLIGI",
          temelEtkinlikProgramiId: ornekProgram.id,
          kontenjan: 5,
          duzenleyenKullaniciId: ogretmen1,
          duzenleyenBirim: "Test",
          basvuruBaslangic: new Date(),
          basvuruBitis: new Date(Date.now() + 86400000),
        },
      });
    } catch {
      programliIlEtkinligiReddedildi = true;
    }
  }
  kontrol(
    "İl Etkinliği sabit programa bağlanamaz",
    programliIlEtkinligiReddedildi,
  );

  // İptal izi: "kim ne zaman iptal etti" bilgisi olmadan durum değiştirilemez.
  let izsizIptalReddedildi = false;
  const iptalDenemesi = await prisma.faaliyet.findFirst({
    where: { durum: "AKTIF" },
    select: { id: true },
  });
  if (iptalDenemesi) {
    try {
      await prisma.faaliyet.update({
        where: { id: iptalDenemesi.id },
        data: { durum: "IPTAL_EDILDI" },
      });
    } catch {
      izsizIptalReddedildi = true;
    }
  }
  kontrol(
    "faaliyet iptali eden/tarih bilgisi olmadan yazılamaz",
    izsizIptalReddedildi,
  );

  /*
   * 10. Saklama süresi temizliği.
   *
   * Kritik nokta silmenin çalışması değil, NEYİ silmediğidir: okunmamış bir
   * bildirim süresi dolsa bile durmalı. Bunu birim test gösteremez; silme
   * koşulu sorgunun kendisinde.
   */
  console.log("\n10. KVKK saklama süresi temizliği");

  const eskiTarih = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 5);
  const eskiLog = await prisma.erisimlogu.create({
    data: {
      kullaniciId: ogrenci1,
      islem: "GORUNTULEME",
      hedefTip: "OGRENCI",
      hedefId: String(ogrenci1),
      detay: "duman testi: süresi dolmuş kayıt",
      tarih: eskiTarih,
    },
  });
  const eskiOkunmus = await prisma.bildirim.create({
    data: {
      kullaniciId: ogrenci1,
      tip: "SISTEM",
      baslik: "duman testi: okunmuş eski bildirim",
      icerik: "silinmeli",
      okunduMu: true,
      olusturmaTarihi: eskiTarih,
    },
  });
  const eskiOkunmamis = await prisma.bildirim.create({
    data: {
      kullaniciId: ogrenci1,
      tip: "SISTEM",
      baslik: "duman testi: okunmamış eski bildirim",
      icerik: "korunmalı",
      okunduMu: false,
      olusturmaTarihi: eskiTarih,
    },
  });

  await saklamaSuresiTemizligi();

  const logKaldiMi = await prisma.erisimlogu.findUnique({
    where: { id: eskiLog.id },
    select: { id: true },
  });
  const okunmusKaldiMi = await prisma.bildirim.findUnique({
    where: { id: eskiOkunmus.id },
    select: { id: true },
  });
  const okunmamisKaldiMi = await prisma.bildirim.findUnique({
    where: { id: eskiOkunmamis.id },
    select: { id: true },
  });

  kontrol("süresi dolan erişim kaydı silinir", logKaldiMi === null);
  kontrol("süresi dolan okunmuş bildirim silinir", okunmusKaldiMi === null);
  kontrol(
    "süresi dolsa bile okunmamış bildirim korunur",
    okunmamisKaldiMi !== null,
  );

  await prisma.bildirim.deleteMany({ where: { id: eskiOkunmamis.id } });

  console.log(
    `\nSonuç: ${basarili} başarılı, ${basarisiz} başarısız (${basarili + basarisiz} kontrol)`,
  );
  if (basarisiz > 0) process.exitCode = 1;
}

main()
  .catch((hata) => {
    console.error("Duman testi hata verdi:", hata);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
