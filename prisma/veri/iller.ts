/**
 * İl listesi (plaka kodu = il kodu). Bu liste sabittir.
 *
 * İlçe ve kurum verisi MEB kaynaklarından yüklenir; buradaki ilçe/kurum
 * kayıtları yalnızca mock kimlik doğrulama aşamasında test kullanıcılarının
 * bağlanacağı asgari kümedir. Gerçek veri geldiğinde bu dosya değil,
 * scripts/referans-veri-yukle.ts kullanılır.
 */

export const ILLER: { ilKodu: string; ad: string }[] = [
  { ilKodu: "01", ad: "Adana" },
  { ilKodu: "02", ad: "Adıyaman" },
  { ilKodu: "03", ad: "Afyonkarahisar" },
  { ilKodu: "04", ad: "Ağrı" },
  { ilKodu: "05", ad: "Amasya" },
  { ilKodu: "06", ad: "Ankara" },
  { ilKodu: "07", ad: "Antalya" },
  { ilKodu: "08", ad: "Artvin" },
  { ilKodu: "09", ad: "Aydın" },
  { ilKodu: "10", ad: "Balıkesir" },
  { ilKodu: "11", ad: "Bilecik" },
  { ilKodu: "12", ad: "Bingöl" },
  { ilKodu: "13", ad: "Bitlis" },
  { ilKodu: "14", ad: "Bolu" },
  { ilKodu: "15", ad: "Burdur" },
  { ilKodu: "16", ad: "Bursa" },
  { ilKodu: "17", ad: "Çanakkale" },
  { ilKodu: "18", ad: "Çankırı" },
  { ilKodu: "19", ad: "Çorum" },
  { ilKodu: "20", ad: "Denizli" },
  { ilKodu: "21", ad: "Diyarbakır" },
  { ilKodu: "22", ad: "Edirne" },
  { ilKodu: "23", ad: "Elazığ" },
  { ilKodu: "24", ad: "Erzincan" },
  { ilKodu: "25", ad: "Erzurum" },
  { ilKodu: "26", ad: "Eskişehir" },
  { ilKodu: "27", ad: "Gaziantep" },
  { ilKodu: "28", ad: "Giresun" },
  { ilKodu: "29", ad: "Gümüşhane" },
  { ilKodu: "30", ad: "Hakkâri" },
  { ilKodu: "31", ad: "Hatay" },
  { ilKodu: "32", ad: "Isparta" },
  { ilKodu: "33", ad: "Mersin" },
  { ilKodu: "34", ad: "İstanbul" },
  { ilKodu: "35", ad: "İzmir" },
  { ilKodu: "36", ad: "Kars" },
  { ilKodu: "37", ad: "Kastamonu" },
  { ilKodu: "38", ad: "Kayseri" },
  { ilKodu: "39", ad: "Kırklareli" },
  { ilKodu: "40", ad: "Kırşehir" },
  { ilKodu: "41", ad: "Kocaeli" },
  { ilKodu: "42", ad: "Konya" },
  { ilKodu: "43", ad: "Kütahya" },
  { ilKodu: "44", ad: "Malatya" },
  { ilKodu: "45", ad: "Manisa" },
  { ilKodu: "46", ad: "Kahramanmaraş" },
  { ilKodu: "47", ad: "Mardin" },
  { ilKodu: "48", ad: "Muğla" },
  { ilKodu: "49", ad: "Muş" },
  { ilKodu: "50", ad: "Nevşehir" },
  { ilKodu: "51", ad: "Niğde" },
  { ilKodu: "52", ad: "Ordu" },
  { ilKodu: "53", ad: "Rize" },
  { ilKodu: "54", ad: "Sakarya" },
  { ilKodu: "55", ad: "Samsun" },
  { ilKodu: "56", ad: "Siirt" },
  { ilKodu: "57", ad: "Sinop" },
  { ilKodu: "58", ad: "Sivas" },
  { ilKodu: "59", ad: "Tekirdağ" },
  { ilKodu: "60", ad: "Tokat" },
  { ilKodu: "61", ad: "Trabzon" },
  { ilKodu: "62", ad: "Tunceli" },
  { ilKodu: "63", ad: "Şanlıurfa" },
  { ilKodu: "64", ad: "Uşak" },
  { ilKodu: "65", ad: "Van" },
  { ilKodu: "66", ad: "Yozgat" },
  { ilKodu: "67", ad: "Zonguldak" },
  { ilKodu: "68", ad: "Aksaray" },
  { ilKodu: "69", ad: "Bayburt" },
  { ilKodu: "70", ad: "Karaman" },
  { ilKodu: "71", ad: "Kırıkkale" },
  { ilKodu: "72", ad: "Batman" },
  { ilKodu: "73", ad: "Şırnak" },
  { ilKodu: "74", ad: "Bartın" },
  { ilKodu: "75", ad: "Ardahan" },
  { ilKodu: "76", ad: "Iğdır" },
  { ilKodu: "77", ad: "Yalova" },
  { ilKodu: "78", ad: "Karabük" },
  { ilKodu: "79", ad: "Kilis" },
  { ilKodu: "80", ad: "Osmaniye" },
  { ilKodu: "81", ad: "Düzce" },
];

/** Mock test kullanıcılarının bağlı olduğu ilçeler. */
export const ORNEK_ILCELER: {
  ilceKodu: string;
  ilKodu: string;
  ad: string;
}[] = [
  { ilceKodu: "3401", ilKodu: "34", ad: "Kadıköy" },
  { ilceKodu: "3402", ilKodu: "34", ad: "Üsküdar" },
  { ilceKodu: "0601", ilKodu: "06", ad: "Çankaya" },
  { ilceKodu: "6501", ilKodu: "65", ad: "İpekyolu" },
];

/** Mock test kullanıcılarının bağlı olduğu kurumlar. */
export const ORNEK_KURUMLAR: {
  kurumKodu: number;
  ad: string;
  ilKodu: string;
  ilceKodu: string;
  okulTuru: string;
}[] = [
  {
    kurumKodu: 750001,
    ad: "Kadıköy Anadolu Lisesi",
    ilKodu: "34",
    ilceKodu: "3401",
    okulTuru: "Anadolu Lisesi",
  },
  {
    kurumKodu: 750002,
    ad: "Üsküdar Fen Lisesi",
    ilKodu: "34",
    ilceKodu: "3402",
    okulTuru: "Fen Lisesi",
  },
  {
    kurumKodu: 750003,
    ad: "Çankaya Bilim ve Sanat Merkezi",
    ilKodu: "06",
    ilceKodu: "0601",
    okulTuru: "Bilim ve Sanat Merkezi",
  },
  {
    kurumKodu: 750004,
    ad: "İpekyolu Anadolu Lisesi",
    ilKodu: "65",
    ilceKodu: "6501",
    okulTuru: "Anadolu Lisesi",
  },
];
