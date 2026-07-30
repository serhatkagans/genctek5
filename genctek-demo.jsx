import React, { useState, useMemo } from "react";
import {
  GraduationCap, Users, CalendarDays, ShieldCheck, LogIn, ChevronRight,
  MapPin, School, Layers, CheckCircle2, XCircle, Clock, Undo2, Send,
  UserCog, Building2, Sparkles, ChevronDown, Info
} from "lucide-react";

/* ---------------------------------------------------------------
   Tasarım tokenleri
   Kimlik: kurumsal / güven veren lacivert zemin, gençlik-teknoloji
   enerjisi taşıyan amber vurgu. Roller kendi renk koduyla tanınır
   (öğrenci=amber, danışman=teal, il koordinatörü=lacivert, YEĞİTEK=mor)
   böylece kim olarak bakıldığı her ekranda anında okunur.
------------------------------------------------------------------*/
const C = {
  navy900: "#10192E",
  navy800: "#182543",
  navy700: "#233258",
  navy600: "#2F4468",
  paper: "#F6F5F1",
  card: "#FFFFFF",
  line: "#E4E1D8",
  ink: "#171A21",
  inkSoft: "#5B6272",
  amber: "#E8A33D",
  amberDeep: "#8A5A16",
  amberBg: "#FBEDD4",
  teal: "#1E7F6B",
  tealBg: "#DCEFEA",
  tealDeep: "#0F4A3C",
  plum: "#5B3A8E",
  plumBg: "#EBE3F5",
  plumDeep: "#3A2560",
  navyBg: "#E7EAF2",
  red: "#B8433C",
  redBg: "#F7E4E2",
};

const ROLES = {
  OGRENCI: { key: "OGRENCI", label: "Öğrenci", color: C.amberDeep, bg: C.amberBg, ring: C.amber },
  DANISMAN: { key: "DANISMAN", label: "Danışman öğretmen", color: C.tealDeep, bg: C.tealBg, ring: C.teal },
  IL_KOORDINATOR: { key: "IL_KOORDINATOR", label: "İl koordinatörü", color: "#132038", bg: C.navyBg, ring: C.navy600 },
  PROJE_YONETICISI: { key: "PROJE_YONETICISI", label: "Proje yöneticisi (YEĞİTEK)", color: C.plumDeep, bg: C.plumBg, ring: C.plum },
};

const CALISMA_GRUPLARI = [
  "Oyun Tasarımı", "Siber Güvenlik", "Bilgisayar Olimpiyatları", "Mobil Programlama",
  "Web Programlama", "Havacılık Sistemleri", "Robotik", "Yapay Zekâ",
  "E-Ticaret ve E-İhracat", "Dijital Sanatlar ve İçerik Geliştirme", "Açık Kaynak", "Espor",
];

const OGRENCI = {
  ad: "Elif", soyad: "Aydın", cinsiyet: "Kadın", okul: "Ankara Fen Lisesi",
  kurumKodu: 106482, il: "Ankara", ilce: "Çankaya", sinif: "11/A",
  egitimYili: "2025-2026", eposta: "", telefon: "",
  calismaGruplari: ["Yapay Zekâ", "Robotik"],
};

const DANISMANLAR = [
  { id: 1, ad: "Serkan Kılıç", brans: "Bilişim Teknolojileri" },
  { id: 2, ad: "Aylin Demir", brans: "Fizik" },
];

const OGRENCI_LISTESI_DANISMAN = [
  { id: 1, ad: "Elif Aydın", sinif: "11/A", gruplar: ["Yapay Zekâ", "Robotik"] },
  { id: 2, ad: "Kerem Şahin", sinif: "10/B", gruplar: ["Siber Güvenlik"] },
  { id: 3, ad: "Zeynep Kaya", sinif: "11/A", gruplar: ["Web Programlama", "Açık Kaynak"] },
  { id: 4, ad: "Berk Yıldız", sinif: "9/C", gruplar: ["Espor"] },
];

const FAALIYETLER_BASLANGIC = [
  { id: 1, ad: "Okul İçi Yapay Zekâ Atölyesi", kapsam: "OKUL", il: "Ankara", kurum: "Ankara Fen Lisesi",
    tarih: "12 Eylül 2026", kontenjan: 30, basvuru: 18, grup: "Yapay Zekâ", onay: "ONAY_GEREKMEZ",
    duzenleyen: "Danışman öğretmen", durum: null },
  { id: 2, ad: "Ankara İli Robotik Buluşması", kapsam: "IL", il: "Ankara", kurum: null,
    tarih: "3 Ekim 2026", kontenjan: 80, basvuru: 61, grup: "Robotik", onay: "ONAY_GEREKMEZ",
    duzenleyen: "İl koordinatörü", durum: "SECILDI" },
  { id: 3, ad: "Ulusal Siber Güvenlik Kampı", kapsam: "ULUSAL", il: null, kurum: null,
    tarih: "20 Kasım 2026", kontenjan: 120, basvuru: 97, grup: "Siber Güvenlik", onay: "ONAYLANDI",
    duzenleyen: "İl koordinatörü (İstanbul)", durum: null },
  { id: 4, ad: "GençTek Ulusal Oyun Geliştirme Yarışması", kapsam: "ULUSAL", il: null, kurum: null,
    tarih: "14 Aralık 2026", kontenjan: 200, basvuru: 143, grup: "Oyun Tasarımı", onay: "BEKLIYOR",
    duzenleyen: "İl koordinatörü (İzmir)", durum: null },
];

const IL_KOORDINATORLERI = [
  { il: "Ankara", ad: "Murat Öz" }, { il: "İstanbul", ad: "Sevil Arslan" },
  { il: "İzmir", ad: "Tolga Ergin" }, { il: "Bursa", ad: "—", bos: true },
];

function Pill({ children, color, bg }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {children}
    </span>
  );
}

function KapsamPill({ kapsam }) {
  const map = {
    OKUL: { t: "Okul içi", color: C.tealDeep, bg: C.tealBg },
    IL: { t: "İl içi", color: "#132038", bg: C.navyBg },
    ULUSAL: { t: "Ulusal", color: C.plumDeep, bg: C.plumBg },
  };
  const m = map[kapsam];
  return <Pill color={m.color} bg={m.bg}>{m.t}</Pill>;
}

function Card({ children, style, className = "" }) {
  return (
    <div
      className={"rounded-xl p-5 " + className}
      style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, ...style }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="h-3 w-1 rounded-full" style={{ backgroundColor: C.amber }} />
      <h3 className="text-sm font-semibold tracking-wide" style={{ color: C.ink }}>{children}</h3>
    </div>
  );
}

function FieldReadOnly({ label, value }) {
  return (
    <div>
      <div className="text-xs mb-1" style={{ color: C.inkSoft }}>{label}</div>
      <div
        className="rounded-lg px-3 py-2 text-sm flex items-center justify-between"
        style={{ backgroundColor: C.paper, color: C.ink, border: `1px solid ${C.line}` }}
      >
        {value}
        <ShieldCheck size={14} style={{ color: C.inkSoft }} />
      </div>
    </div>
  );
}

/* ---------------- Ekranlar ---------------- */

function GirisEkrani({ onGiris }) {
  return (
    <div className="min-h-full flex items-center justify-center px-6" style={{ backgroundColor: C.navy900 }}>
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: C.amber }}>
          <Sparkles size={26} color={C.navy900} />
        </div>
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>GençTek</h1>
        <p className="text-sm mb-8" style={{ color: "#AEB6C9" }}>Ekosistem Kurumsal Bilgi Sistemi</p>
        <button
          onClick={onGiris}
          className="w-full rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
          style={{ backgroundColor: C.amber, color: C.navy900 }}
        >
          <LogIn size={16} /> EBA ile Giriş Yap
        </button>
        <p className="text-xs mt-4" style={{ color: "#7C86A0" }}>
          Dış kayıt yoktur. Kimlik bilgileri EBA üzerinden alınır.
        </p>
        <div className="mt-10 text-left rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-xs" style={{ color: "#AEB6C9" }}>
            <Info size={12} className="inline mr-1 mb-0.5" />
            Bu ekran paydaş sunumu için hazırlanmış tıklanabilir bir mockup'tır. Gerçek EBA bağlantısı ve veritabanı içermez.
          </p>
        </div>
      </div>
    </div>
  );
}

function RolSwitcher({ rol, setRol }) {
  const [open, setOpen] = useState(false);
  const r = ROLES[rol];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
        style={{ backgroundColor: r.bg, color: r.color }}
      >
        {r.label}
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-lg overflow-hidden z-20" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, boxShadow: "0 8px 24px rgba(16,25,46,0.12)" }}>
          <div className="px-3 py-2 text-[11px]" style={{ color: C.inkSoft, backgroundColor: C.paper }}>
            Demo amaçlı rol değiştirici
          </div>
          {Object.values(ROLES).map((opt) => (
            <button
              key={opt.key}
              onClick={() => { setRol(opt.key); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:opacity-80"
              style={{ color: opt.key === rol ? opt.color : C.ink, backgroundColor: opt.key === rol ? opt.bg : "transparent" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OgrenciProfil({ ogrenci, setOgrenci, danisman, setDanisman }) {
  const [seciliDanisman, setSeciliDanisman] = useState(danisman);
  return (
    <div className="space-y-5">
      <Card>
        <SectionLabel>EBA'dan gelen bilgiler (salt okunur)</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <FieldReadOnly label="Ad Soyad" value={`${ogrenci.ad} ${ogrenci.soyad}`} />
          <FieldReadOnly label="Cinsiyet" value={ogrenci.cinsiyet} />
          <FieldReadOnly label="Okul" value={ogrenci.okul} />
          <FieldReadOnly label="Kurum kodu" value={ogrenci.kurumKodu} />
          <FieldReadOnly label="İl / İlçe" value={`${ogrenci.il} / ${ogrenci.ilce}`} />
          <FieldReadOnly label="Sınıf" value={ogrenci.sinif} />
          <FieldReadOnly label="Eğitim-öğretim yılı" value={ogrenci.egitimYili} />
        </div>
        <p className="text-xs mt-3" style={{ color: C.inkSoft }}>
          Bu bilgiler e-Okul kayıtlarından gelmektedir; hatalıysa okul idaresine başvurunuz.
        </p>
      </Card>

      <Card>
        <SectionLabel>Danışman öğretmen</SectionLabel>
        {seciliDanisman ? (
          <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ backgroundColor: C.tealBg }}>
            <div>
              <div className="text-sm font-medium" style={{ color: C.tealDeep }}>{seciliDanisman.ad}</div>
              <div className="text-xs" style={{ color: C.tealDeep, opacity: 0.8 }}>{seciliDanisman.brans}</div>
            </div>
            <Pill color={C.tealDeep} bg="#fff">Aktif danışman</Pill>
          </div>
        ) : (
          <div>
            <p className="text-sm mb-3" style={{ color: C.inkSoft }}>
              Okulunuzda birden fazla danışman öğretmen bulunuyor. Kendi danışmanınızı seçin.
            </p>
            <div className="space-y-2">
              {DANISMANLAR.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { setSeciliDanisman(d); setDanisman(d); }}
                  className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left hover:opacity-90"
                  style={{ border: `1px solid ${C.line}` }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: C.ink }}>{d.ad}</div>
                    <div className="text-xs" style={{ color: C.inkSoft }}>{d.brans}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: C.inkSoft }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel>Çalışma grupları</SectionLabel>
        <p className="text-xs mb-3" style={{ color: C.inkSoft }}>İlgilendiğiniz alanları seçin (sayı sınırı yok).</p>
        <div className="flex flex-wrap gap-2">
          {CALISMA_GRUPLARI.map((g) => {
            const secili = ogrenci.calismaGruplari.includes(g);
            return (
              <button
                key={g}
                onClick={() => {
                  const has = ogrenci.calismaGruplari.includes(g);
                  if (!has && ogrenci.calismaGruplari.length >= 3) return;
                  const next = has
                    ? ogrenci.calismaGruplari.filter((x) => x !== g)
                    : [...ogrenci.calismaGruplari, g];
                  setOgrenci({ ...ogrenci, calismaGruplari: next });
                }}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={secili
                  ? { backgroundColor: C.amber, color: C.navy900 }
                  : { backgroundColor: C.paper, color: C.inkSoft, border: `1px solid ${C.line}` }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionLabel>Profilinizde tamamlanacak alanlar</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: C.inkSoft }}>E-posta</label>
            <input
              value={ogrenci.eposta}
              onChange={(e) => setOgrenci({ ...ogrenci, eposta: e.target.value })}
              placeholder="ornek@eposta.com"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: `1px solid ${C.line}` }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: C.inkSoft }}>Telefon</label>
            <input
              value={ogrenci.telefon}
              onChange={(e) => setOgrenci({ ...ogrenci, telefon: e.target.value })}
              placeholder="05xx xxx xx xx"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ border: `1px solid ${C.line}` }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function BasvuruModal({ faaliyet, onClose, onGonder }) {
  const [gerekce, setGerekce] = useState("");
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(16,25,46,0.45)" }}>
      <div className="w-full max-w-md rounded-xl p-5" style={{ backgroundColor: C.card }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold" style={{ color: C.ink }}>Faaliyete başvur</h3>
          <button onClick={onClose}><XCircle size={18} style={{ color: C.inkSoft }} /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: C.inkSoft }}>{faaliyet.ad}</p>
        <label className="text-xs mb-1 block" style={{ color: C.inkSoft }}>
          Bu faaliyete neden başvuruyorsunuz? İlginiz nedir? <span style={{ color: C.red }}>*</span>
        </label>
        <textarea
          value={gerekce}
          onChange={(e) => setGerekce(e.target.value)}
          rows={4}
          placeholder="Kısaca açıklayın..."
          className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-4"
          style={{ border: `1px solid ${C.line}` }}
        />
        <button
          disabled={!gerekce.trim()}
          onClick={() => onGonder(gerekce)}
          className="w-full rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ backgroundColor: C.amber, color: C.navy900 }}
        >
          <Send size={14} /> Başvuruyu gönder
        </button>
      </div>
    </div>
  );
}

function FaaliyetKarti({ f, onBasvur, onGeriCek }) {
  const durumMap = {
    SECILDI: { t: "Seçildi", Icon: CheckCircle2, color: C.tealDeep, bg: C.tealBg },
    REDDEDILDI: { t: "Reddedildi", Icon: XCircle, color: C.red, bg: C.redBg },
    YEDEK: { t: "Yedek", Icon: Clock, color: C.amberDeep, bg: C.amberBg },
  };
  const d = f.durum ? durumMap[f.durum] : null;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <KapsamPill kapsam={f.kapsam} />
            <Pill color={C.inkSoft} bg={C.paper}>{f.grup}</Pill>
            {f.onay === "BEKLIYOR" && <Pill color={C.amberDeep} bg={C.amberBg}><Clock size={11} /> Onay bekliyor</Pill>}
          </div>
          <h4 className="text-sm font-semibold" style={{ color: C.ink }}>{f.ad}</h4>
          <p className="text-xs mt-1" style={{ color: C.inkSoft }}>{f.duzenleyen} · {f.tarih}</p>
        </div>
        {d && (
          <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shrink-0" style={{ color: d.color, backgroundColor: d.bg }}>
            <d.Icon size={12} /> {d.t}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs" style={{ color: C.inkSoft }}>
          Kontenjan: {f.basvuru}/{f.kontenjan}
        </div>
        {!f.durum && f.onay !== "BEKLIYOR" && (
          <button
            onClick={() => onBasvur(f)}
            className="text-xs font-medium rounded-lg px-3 py-1.5"
            style={{ backgroundColor: C.navy900, color: "#fff" }}
          >
            Başvur
          </button>
        )}
        {f.durum && (
          <button
            onClick={() => onGeriCek(f)}
            className="text-xs font-medium rounded-lg px-3 py-1.5 flex items-center gap-1"
            style={{ border: `1px solid ${C.line}`, color: C.inkSoft }}
          >
            <Undo2 size={12} /> Geri çek
          </button>
        )}
      </div>
    </Card>
  );
}

function FaaliyetlerEkrani({ faaliyetler, setFaaliyetler }) {
  const [aktifFaaliyet, setAktifFaaliyet] = useState(null);
  const gorunurler = faaliyetler.filter((f) => f.onay !== "BEKLIYOR" || f.durum);

  function basvur(f) { setAktifFaaliyet(f); }
  function gonder(gerekce) {
    setFaaliyetler(faaliyetler.map((f) => f.id === aktifFaaliyet.id ? { ...f, durum: "BEKLIYOR", basvuru: f.basvuru + 1 } : f));
    setAktifFaaliyet(null);
  }
  function geriCek(f) {
    setFaaliyetler(faaliyetler.map((x) => x.id === f.id ? { ...x, durum: null, basvuru: Math.max(0, x.basvuru - 1) } : x));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: C.inkSoft }}>Başvurabileceğiniz okul içi, il içi ve ulusal faaliyetler.</p>
      </div>
      <div className="grid gap-3">
        {faaliyetler.filter((f) => f.onay !== "BEKLIYOR" || f.durum === "BEKLIYOR").map((f) => (
          <FaaliyetKarti key={f.id} f={f} onBasvur={basvur} onGeriCek={geriCek} />
        ))}
      </div>
      {aktifFaaliyet && (
        <BasvuruModal faaliyet={aktifFaaliyet} onClose={() => setAktifFaaliyet(null)} onGonder={gonder} />
      )}
    </div>
  );
}

function DanismanPaneli({ faaliyetler, setFaaliyetler }) {
  const [basvuranlar] = useState([
    { id: 1, ad: "Elif Aydın", gerekce: "Yapay zekâ modelleri ile önceden proje geliştirdim, atölyede derinleşmek istiyorum." },
    { id: 2, ad: "Kerem Şahin", gerekce: "Siber güvenlik alanında CTF yarışmalarına katılıyorum." },
  ]);
  return (
    <div className="space-y-5">
      <Card>
        <SectionLabel>Danışmanlığını yaptığınız öğrenciler — Ankara Fen Lisesi</SectionLabel>
        <div className="space-y-2">
          {OGRENCI_LISTESI_DANISMAN.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ border: `1px solid ${C.line}` }}>
              <div>
                <div className="text-sm font-medium" style={{ color: C.ink }}>{o.ad}</div>
                <div className="text-xs" style={{ color: C.inkSoft }}>{o.sinif}</div>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {o.gruplar.map((g) => <Pill key={g} color={C.tealDeep} bg={C.tealBg}>{g}</Pill>)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>Okul içi faaliyet — başvurular</SectionLabel>
        <p className="text-xs mb-3" style={{ color: C.inkSoft }}>"Okul İçi Yapay Zekâ Atölyesi" faaliyetinize gelen başvurular.</p>
        <div className="space-y-2">
          {basvuranlar.map((b) => (
            <div key={b.id} className="rounded-lg px-3 py-3" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: C.ink }}>{b.ad}</span>
                <div className="flex gap-2">
                  <button className="text-xs rounded-md px-2.5 py-1 font-medium" style={{ backgroundColor: C.tealBg, color: C.tealDeep }}>Seç</button>
                  <button className="text-xs rounded-md px-2.5 py-1 font-medium" style={{ backgroundColor: C.redBg, color: C.red }}>Reddet</button>
                </div>
              </div>
              <p className="text-xs" style={{ color: C.inkSoft }}>{b.gerekce}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>Yeni okul içi faaliyet aç</SectionLabel>
        <p className="text-xs" style={{ color: C.inkSoft }}>
          Danışman öğretmen olarak yalnızca okul içi kapsamda faaliyet açabilirsiniz. İl içi ve ulusal faaliyetler
          il koordinatörü tarafından açılır.
        </p>
        <button className="mt-3 text-xs font-medium rounded-lg px-3 py-2" style={{ backgroundColor: C.navy900, color: "#fff" }}>
          + Okul içi faaliyet oluştur
        </button>
      </Card>
    </div>
  );
}

function KoordinatorPaneli({ faaliyetler, setFaaliyetler }) {
  return (
    <div className="space-y-5">
      <Card>
        <SectionLabel>Ankara ili — danışmansız okullar</SectionLabel>
        <p className="text-xs mb-3" style={{ color: C.inkSoft }}>
          Bu okullarda kayıtlı danışman öğretmen bulunmadığından öğrenciler size bağlıdır.
        </p>
        <div className="space-y-2">
          {["Polatlı Anadolu Lisesi (4 öğrenci)", "Kalecik Mesleki ve Teknik Anadolu Lisesi (2 öğrenci)"].map((s) => (
            <div key={s} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ backgroundColor: C.paper }}>
              <span className="text-sm" style={{ color: C.ink }}>{s}</span>
              <Building2 size={14} style={{ color: C.inkSoft }} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>İl içi / ulusal faaliyetleriniz</SectionLabel>
        <div className="grid gap-3">
          {faaliyetler.filter((f) => f.kapsam !== "OKUL" && f.duzenleyen.includes("İl koordinatörü") && !f.duzenleyen.includes("İstanbul") && !f.duzenleyen.includes("İzmir")).map((f) => (
            <div key={f.id} className="rounded-lg px-3 py-3 flex items-center justify-between" style={{ border: `1px solid ${C.line}` }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <KapsamPill kapsam={f.kapsam} />
                  {f.onay === "BEKLIYOR" && <Pill color={C.amberDeep} bg={C.amberBg}><Clock size={11} /> Onay bekliyor</Pill>}
                </div>
                <div className="text-sm font-medium" style={{ color: C.ink }}>{f.ad}</div>
              </div>
              <div className="text-xs text-right" style={{ color: C.inkSoft }}>
                {f.basvuru}/{f.kontenjan}<br />başvuru
              </div>
            </div>
          ))}
        </div>
        <button className="mt-3 text-xs font-medium rounded-lg px-3 py-2" style={{ backgroundColor: C.navy900, color: "#fff" }}>
          + İl içi veya ulusal faaliyet oluştur
        </button>
      </Card>
    </div>
  );
}

function YoneticiPaneli({ faaliyetler, setFaaliyetler }) {
  const onayBekleyen = faaliyetler.filter((f) => f.onay === "BEKLIYOR");
  function onayla(id) {
    setFaaliyetler(faaliyetler.map((f) => f.id === id ? { ...f, onay: "ONAYLANDI" } : f));
  }
  function reddet(id) {
    setFaaliyetler(faaliyetler.map((f) => f.id === id ? { ...f, onay: "REDDEDILDI" } : f));
  }
  return (
    <div className="space-y-5">
      <Card>
        <SectionLabel>Onay bekleyen ulusal faaliyetler</SectionLabel>
        {onayBekleyen.length === 0 ? (
          <p className="text-sm" style={{ color: C.inkSoft }}>Onay bekleyen faaliyet yok.</p>
        ) : (
          <div className="space-y-2">
            {onayBekleyen.map((f) => (
              <div key={f.id} className="rounded-lg px-3 py-3 flex items-center justify-between" style={{ border: `1px solid ${C.line}` }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: C.ink }}>{f.ad}</div>
                  <div className="text-xs" style={{ color: C.inkSoft }}>{f.duzenleyen} · {f.tarih}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onayla(f.id)} className="text-xs rounded-md px-2.5 py-1.5 font-medium" style={{ backgroundColor: C.tealBg, color: C.tealDeep }}>Onayla</button>
                  <button onClick={() => reddet(f.id)} className="text-xs rounded-md px-2.5 py-1.5 font-medium" style={{ backgroundColor: C.redBg, color: C.red }}>Reddet</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel>İl koordinatörü ataması</SectionLabel>
        <div className="space-y-2">
          {IL_KOORDINATORLERI.map((k) => (
            <div key={k.il} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ border: `1px solid ${C.line}` }}>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: C.inkSoft }} />
                <span className="text-sm" style={{ color: C.ink }}>{k.il}</span>
              </div>
              {k.bos ? (
                <button className="text-xs font-medium rounded-md px-2.5 py-1.5" style={{ backgroundColor: C.amberBg, color: C.amberDeep }}>Ata</button>
              ) : (
                <span className="text-xs" style={{ color: C.inkSoft }}>{k.ad}</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>Çalışma grupları yönetimi</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {CALISMA_GRUPLARI.map((g) => (
            <Pill key={g} color={C.plumDeep} bg={C.plumBg}>{g}</Pill>
          ))}
        </div>
      </Card>
    </div>
  );
}

const NAV = {
  OGRENCI: [{ key: "profil", label: "Profilim", Icon: GraduationCap }, { key: "faaliyetler", label: "Faaliyetler", Icon: CalendarDays }],
  DANISMAN: [{ key: "danisman", label: "Öğrencilerim ve faaliyetler", Icon: Users }],
  IL_KOORDINATOR: [{ key: "koordinator", label: "İl paneli", Icon: MapPin }],
  PROJE_YONETICISI: [{ key: "yonetici", label: "Yönetim paneli", Icon: UserCog }],
};

export default function GencTekDemo() {
  const [girisYapildi, setGirisYapildi] = useState(false);
  const [rol, setRol] = useState("OGRENCI");
  const [view, setView] = useState("profil");
  const [ogrenci, setOgrenci] = useState(OGRENCI);
  const [danisman, setDanisman] = useState(null);
  const [faaliyetler, setFaaliyetler] = useState(FAALIYETLER_BASLANGIC);

  const activeNav = NAV[rol];
  const currentView = activeNav.find((n) => n.key === view) ? view : activeNav[0].key;

  function handleRolChange(r) {
    setRol(r);
    setView(NAV[r][0].key);
  }

  if (!girisYapildi) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet" />
        <div style={{ height: 600 }}>
          <GirisEkrani onGiris={() => setGirisYapildi(true)} />
        </div>
      </div>
    );
  }

  const r = ROLES[rol];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: C.paper, minHeight: 640 }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet" />

      <div className="flex items-center justify-between px-5 py-3.5" style={{ backgroundColor: C.navy900 }}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: C.amber }}>
            <Sparkles size={14} color={C.navy900} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "#fff", fontFamily: "'Space Grotesk', sans-serif" }}>GençTek</span>
        </div>
        <RolSwitcher rol={rol} setRol={handleRolChange} />
      </div>

      <div className="flex" style={{ minHeight: 590 }}>
        <div className="w-56 shrink-0 px-3 py-4" style={{ backgroundColor: C.navy800 }}>
          <div className="mb-4 px-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: r.ring }} />
              <span className="text-xs font-medium" style={{ color: "#AEB6C9" }}>Görünen rol</span>
            </div>
            <div className="text-sm font-medium" style={{ color: "#fff" }}>{r.label}</div>
          </div>
          <nav className="space-y-1">
            {activeNav.map((n) => (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left"
                style={{
                  backgroundColor: currentView === n.key ? "rgba(232,163,61,0.15)" : "transparent",
                  color: currentView === n.key ? C.amber : "#C6CCDB",
                }}
              >
                <n.Icon size={15} /> {n.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-5">
            <h2 className="text-lg font-semibold" style={{ color: C.ink, fontFamily: "'Space Grotesk', sans-serif" }}>
              {activeNav.find((n) => n.key === currentView)?.label}
            </h2>
          </div>

          {rol === "OGRENCI" && currentView === "profil" && (
            <OgrenciProfil ogrenci={ogrenci} setOgrenci={setOgrenci} danisman={danisman} setDanisman={setDanisman} />
          )}
          {rol === "OGRENCI" && currentView === "faaliyetler" && (
            <FaaliyetlerEkrani faaliyetler={faaliyetler} setFaaliyetler={setFaaliyetler} />
          )}
          {rol === "DANISMAN" && <DanismanPaneli faaliyetler={faaliyetler} setFaaliyetler={setFaaliyetler} />}
          {rol === "IL_KOORDINATOR" && <KoordinatorPaneli faaliyetler={faaliyetler} setFaaliyetler={setFaaliyetler} />}
          {rol === "PROJE_YONETICISI" && <YoneticiPaneli faaliyetler={faaliyetler} setFaaliyetler={setFaaliyetler} />}
        </div>
      </div>
    </div>
  );
}
