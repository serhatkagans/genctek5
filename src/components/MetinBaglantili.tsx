import { metniParcala } from "@/lib/metin/baglanti";

/**
 * Kullanıcının yazdığı düz metni, içindeki adresler tıklanabilir olacak
 * biçimde basar.
 *
 * `dangerouslySetInnerHTML` KULLANILMAZ: metin kullanıcıdan geliyor, HTML'e
 * çevrilseydi içine yazılan etiketler çalışırdı. Parçalar ayrı ayrı basıldığı
 * için React her metin parçasını kendi kaçışıyla yazar.
 */
export function MetinBaglantili({
  metin,
  className,
}: {
  metin: string;
  className?: string;
}) {
  return (
    <p className={className}>
      {metniParcala(metin).map((parca, sira) =>
        parca.tip === "baglanti" ? (
          <a
            // Parçaların kendi kimliği yok; sıra kararlıdır çünkü liste
            // yeniden sıralanmıyor, metinden birebir üretiliyor.
            key={sira}
            href={parca.adres}
            target="_blank"
            /*
             * noopener: yeni sekme `window.opener` üzerinden bu sayfayı
             * yönlendirebilirdi (tabnabbing). noreferrer: dış siteye panel
             * adresini sızdırmayalım — adres öğrenci kimliği içerebiliyor.
             */
            rel="noopener noreferrer nofollow"
            className="text-vurgu underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            {parca.deger}
          </a>
        ) : (
          <span key={sira}>{parca.deger}</span>
        ),
      )}
    </p>
  );
}
