#!/usr/bin/env bash
#
# GençTek yedekleme — veritabanı + yüklenen dosyalar.
#
#   sudo /usr/local/bin/genctek-yedek
#
# ROOT ile çalışır. "postgres" kullanıcısıyla çalıştırmayın: veritabanını
# dökebilir ama /opt/genctek/depolama dizinini (700 genctek:genctek) okuyamaz
# ve yüklenen dosyalar sessizce yedeklenmeden kalır.
#
# Sistemde 18 yaş altı öğrenci verisi var. Yedek dosyaları da kişisel veridir:
# 600 izinle, sunucu dışında ve şifreli bir yerde saklayın; saklama süresi
# politikanız neyse ona uyun (KVKK — domain-rules.md Bölüm 10).

set -euo pipefail

YEDEK_DIZINI="${YEDEK_DIZINI:-/var/backups/genctek}"
VERITABANI="${VERITABANI:-genctek}"
DEPOLAMA_DIZINI="${DEPOLAMA_DIZINI:-/opt/genctek/depolama}"
SAKLAMA_GUN="${SAKLAMA_GUN:-30}"

DAMGA="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$YEDEK_DIZINI"
chmod 700 "$YEDEK_DIZINI"

echo "==> Veritabanı: $VERITABANI"
# custom format (-Fc): pg_restore ile seçmeli geri yükleme yapılabilir ve
# düz SQL'e göre çok daha küçüktür.
#
# Dökümü postgres kullanıcısı alır (peer kimlik doğrulaması, şifre gerekmez);
# dosyayı root'un dizinine yazdığımız için çıktı borudan geçirilir.
sudo -u postgres pg_dump -Fc "$VERITABANI" > "$YEDEK_DIZINI/veritabani-$DAMGA.dump"

# pg_dump boru içinde başarısız olursa dosya boş kalır ama betik devam ederdi.
if [ ! -s "$YEDEK_DIZINI/veritabani-$DAMGA.dump" ]; then
  echo "HATA: veritabanı dökümü boş, yedek geçersiz." >&2
  exit 1
fi
chmod 600 "$YEDEK_DIZINI/veritabani-$DAMGA.dump"

if [ -d "$DEPOLAMA_DIZINI" ]; then
  echo "==> Yüklenen dosyalar: $DEPOLAMA_DIZINI"
  tar -czf "$YEDEK_DIZINI/depolama-$DAMGA.tar.gz" -C "$(dirname "$DEPOLAMA_DIZINI")" "$(basename "$DEPOLAMA_DIZINI")"
  chmod 600 "$YEDEK_DIZINI/depolama-$DAMGA.tar.gz"
fi

echo "==> $SAKLAMA_GUN günden eski yedekler siliniyor"
find "$YEDEK_DIZINI" -type f -name '*-*.dump'    -mtime "+$SAKLAMA_GUN" -delete
find "$YEDEK_DIZINI" -type f -name '*-*.tar.gz'  -mtime "+$SAKLAMA_GUN" -delete

echo "==> Tamamlandı:"
ls -lh "$YEDEK_DIZINI" | tail -5

# DİKKAT — pg_restore'a dosya YOLU VERİLMEZ, içerik BORUYLA geçirilir.
#
# Yedekler 600 root:root, dizin 700 root. `sudo -u postgres pg_restore <dosya>`
# yazıldığında dosyayı postgres kullanıcısı açmaya çalışır ve "Permission
# denied" alır. Bu hata 31 Temmuz 2026 geri yükleme provasında yakalandı;
# rehberde o güne kadar çalışmayan komut yazılıydı. Dosyayı root okur, postgres
# yalnızca standart girdiden veri alır.
#
# GERİ YÜKLEME (aciliyet anında aramamak için burada dursun):
#   sudo systemctl stop genctek
#   sudo -u postgres dropdb genctek && sudo -u postgres createdb genctek --owner=genctek
#   sudo cat /var/backups/genctek/veritabani-DAMGA.dump | sudo -u postgres pg_restore -d genctek
#   sudo tar -xzf /var/backups/genctek/depolama-DAMGA.tar.gz -C /opt/genctek/
#   sudo systemctl start genctek
#
# PROVA (canlı veriye dokunmadan, yılda bir yapılmalı):
#   sudo -u postgres createdb genctek_prova
#   sudo cat /var/backups/genctek/veritabani-DAMGA.dump | sudo -u postgres pg_restore -d genctek_prova
#   sudo -u postgres psql -d genctek_prova -c "select count(*) from kullanici"
#   sudo -u postgres dropdb genctek_prova
