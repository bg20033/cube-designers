// Service landing pages (/sherbime/:slug). Each page targets one cluster of
// real searches with its own copy, FAQ and schema. Keep it dependency-free so
// prerendering and structured data can import it.

export type ServiceCategory = "print" | "branding" | "digital" | "social"

export type ServiceFaq = { q: string; a: string }

export type ServicePageData = {
  slug: string
  category: ServiceCategory
  name: string
  title: string
  seoTitle: string
  description: string
  lead: string
  includes: Array<{ title: string; text: string }>
  forWho: string[]
  alsoKnownAs: string[]
  faqs: ServiceFaq[]
  related: string[]
}

export const serviceCategories: Record<
  ServiceCategory,
  { label: string; eyebrow: string; intro: string; tone: "orange" | "violet" | "acid" | "paper" }
> = {
  print: {
    label: "Print",
    eyebrow: "Printim & prodhim",
    intro:
      "Nga kartvizita te tabela e dyqanit: dizajn, përgatitje për shtyp dhe prodhim i koordinuar nga një ekip.",
    tone: "orange",
  },
  branding: {
    label: "Branding",
    eyebrow: "Brand & dizajn",
    intro:
      "Logo, identitet vizual dhe dizajn grafik që e bëjnë biznesin të njohshëm dhe konsistent kudo.",
    tone: "violet",
  },
  digital: {
    label: "Digital",
    eyebrow: "Web & e-commerce",
    intro:
      "Faqe interneti të shpejta, dyqane online dhe SEO që sjellin klientë, jo vetëm vizita.",
    tone: "acid",
  },
  social: {
    label: "Social media",
    eyebrow: "Social media & reklama",
    intro:
      "Menaxhim i rrjeteve sociale, content dhe reklama në Facebook, Instagram e TikTok me strategji dhe raportim.",
    tone: "paper",
  },
}

export const serviceAreas = ["Suharekë", "Prishtinë", "gjithë Kosovën"]

export const services: ServicePageData[] = [
  // ——— Print ———
  {
    slug: "printim-kartvizita",
    category: "print",
    name: "Kartvizita",
    title: "Printim kartvizitash që lënë përshtypje.",
    seoTitle: "Printim Kartvizitash në Suharekë & Kosovë | CUBE DESIGNERS",
    description:
      "Dizajn dhe printim kartvizitash premium në Suharekë, Prishtinë dhe gjithë Kosovën. Letër 350gsm, finish mat ose shkëlqyes, print dy-anësh.",
    lead:
      "Kartvizita është shpesh kontakti i parë fizik me brandin tuaj. Ne e dizajnojmë, e përgatisim për shtyp dhe e printojmë në letër cilësore, që të duket ashtu siç duhet të duket biznesi juaj.",
    includes: [
      { title: "Dizajn i kartvizitës", text: "Dizajn i ri ose përshtatje sipas logos dhe identitetit ekzistues, me provë digjitale para printimit." },
      { title: "Letër & finish", text: "Letër 350gsm e më e trashë, laminim mat ose shkëlqyes, soft-touch dhe opsione premium sipas kërkesës." },
      { title: "Print dy-anësh", text: "Print me ngjyra të plota në të dy anët, me kontroll të ngjyrave dhe kufijve të prerjes." },
      { title: "Sasi fleksibile", text: "Nga porosi të vogla për një person deri te seri për gjithë ekipin, me të njëjtin standard." },
    ],
    forWho: ["Biznese të reja dhe startup-e", "Ekipe shitjesh dhe menaxherë", "Profesionistë të pavarur", "Restorante, klinika dhe dyqane"],
    alsoKnownAs: ["vizit karta", "business cards", "karta biznesi", "kartvizita me logo"],
    faqs: [
      { q: "A mund ta dizajnoni kartvizitën nga fillimi?", a: "Po. Nëse keni logo, e ndërtojmë kartvizitën mbi identitetin tuaj; nëse jo, mund ta nisim edhe me dizajnin e logos." },
      { q: "Çfarë letre përdorni për kartvizita?", a: "Standardi ynë është letër 350gsm me finish mat. Për një ndjesi më premium ofrojmë letra më të trasha, soft-touch dhe finish të veçantë." },
      { q: "A dërgoni kartvizita jashtë Suharekës?", a: "Po, punojmë me klientë në Prishtinë dhe në gjithë Kosovën dhe koordinojmë dërgesën." },
    ],
    related: ["printim-fletushka-broshura", "dizajn-logo", "identitet-vizual-branding"],
  },
  {
    slug: "printim-fletushka-broshura",
    category: "print",
    name: "Fletushka & broshura",
    title: "Fletushka, broshura dhe katalogë që shiten vetë.",
    seoTitle: "Printim Fletushkash, Broshurash & Katalogësh | CUBE DESIGNERS",
    description:
      "Dizajn dhe printim fletushkash (flyer), broshurash, katalogësh dhe menush në Kosovë. Nga ideja te materiali i gatshëm për shpërndarje.",
    lead:
      "Një fletushkë e mirë e thotë ofertën në tre sekonda. Ne kujdesemi për mesazhin, dizajnin dhe printimin, që materiali të lexohet, të kuptohet dhe të mbahet mend.",
    includes: [
      { title: "Fletushka (flyer)", text: "Formate A6, A5 dhe A4, një ose dy anë, për promocione, evente dhe hapje biznesi." },
      { title: "Broshura & katalogë", text: "Broshura të palosura dhe katalogë me shumë faqe për produkte, shërbime dhe prezantime." },
      { title: "Menu për restorante", text: "Menu tavoline, menu me palosje dhe menu të laminuara që i rezistojnë përdorimit të përditshëm." },
      { title: "Tekst & strukturë", text: "Ndihmë me titujt, hierarkinë dhe tekstin që oferta të kuptohet menjëherë." },
    ],
    forWho: ["Restorante dhe kafene", "Dyqane me oferta sezonale", "Organizatorë eventesh", "Biznese që prezantojnë produkte të reja"],
    alsoKnownAs: ["flyer", "letërpalosje", "katalog produktesh", "menu restoranti", "leaflet"],
    faqs: [
      { q: "Cilat formate ofroni për fletushka?", a: "Më të zakonshmet janë A6, A5 dhe A4, por përgatisim edhe formate të personalizuara sipas qëllimit dhe mënyrës së shpërndarjes." },
      { q: "A mund të ndihmoni edhe me tekstin?", a: "Po. Mund ta strukturojmë ofertën, titujt dhe thirrjen për veprim që materiali të jetë i qartë." },
      { q: "A bëni edhe menu për restorante?", a: "Po, dizajnojmë dhe printojmë menu tavoline, menu me palosje dhe menu të laminuara." },
    ],
    related: ["printim-kartvizita", "roll-up-banera", "dizajn-grafik"],
  },
  {
    slug: "roll-up-banera",
    category: "print",
    name: "Roll-up & banera",
    title: "Roll-up, banera dhe print i formatit të madh.",
    seoTitle: "Roll-up & Banera në Kosovë | Print Formati i Madh | CUBE",
    description:
      "Roll-up banner, banera vinili, pëlhura dhe print i formatit të madh për evente, panaire dhe fasada në Suharekë, Prishtinë dhe gjithë Kosovën.",
    lead:
      "Në panair, në hyrje të dyqanit apo në skenë, materiali i madh duhet të lexohet nga larg. Ne e dizajnojmë për distancë dhe e printojmë në materiale që mbajnë ngjyrën.",
    includes: [
      { title: "Roll-up banner", text: "Konstruksion alumini, print cilësor dhe çantë transporti, gati për evente dhe prezantime." },
      { title: "Banera vinili", text: "Banera për fasada, gardhe dhe ambiente të jashtme, me ojëza dhe përforcime sipas nevojës." },
      { title: "Pëlhura & backdrop", text: "Mure për foto, backdrop për skenë dhe pëlhura për stenda në panaire." },
      { title: "Dizajn për distancë", text: "Tipografi, kontrast dhe hierarki që mesazhi të kuptohet nga disa metra larg." },
    ],
    forWho: ["Kompani që marrin pjesë në panaire", "Organizatorë eventesh dhe konferencash", "Dyqane dhe hapje biznesesh", "Institucione dhe OJQ"],
    alsoKnownAs: ["rollup", "roll up banner", "baner", "banner vinili", "print format i madh", "backdrop"],
    faqs: [
      { q: "Sa është madhësia standarde e roll-up?", a: "Më i zakonshmi është 85 × 200 cm, por ofrojmë edhe 100 × 200 cm dhe 120 × 200 cm." },
      { q: "A janë banerat për ambient të jashtëm?", a: "Po, përdorim vinil dhe materiale që i rezistojnë diellit dhe shiut, me ojëza për montim." },
      { q: "A mund ta dizajnoni edhe materialin?", a: "Po, e dizajnojmë posaçërisht për distancën nga do të lexohet dhe për vendin ku do të vendoset." },
    ],
    related: ["sinjalistike-tabela", "printim-fletushka-broshura", "tekstil-me-logo"],
  },
  {
    slug: "stickers-etiketa",
    category: "print",
    name: "Stickers & etiketa",
    title: "Stickers dhe etiketa produktesh me prerje sipas formës.",
    seoTitle: "Stickers & Etiketa me Logo në Kosovë | CUBE DESIGNERS",
    description:
      "Printim stickers me prerje sipas formës (die-cut), etiketa produktesh, etiketa për shishe dhe paketim në Kosovë. Dizajn dhe prodhim.",
    lead:
      "Një etiketë e mirë e bën produktin të dallohet në raft dhe e mban brandin në duart e klientit. Ne dizajnojmë dhe printojmë stickers dhe etiketa në forma dhe materiale të ndryshme.",
    includes: [
      { title: "Die-cut stickers", text: "Stickers me prerje sipas formës së logos ose ilustrimit, për promovim dhe paketim." },
      { title: "Etiketa produktesh", text: "Etiketa për shishe, kavanoza, kozmetikë dhe ushqim, me informacionin e nevojshëm të renditur qartë." },
      { title: "Materiale të ndryshme", text: "Letër, vinil, transparent dhe materiale rezistente ndaj ujit sipas përdorimit." },
      { title: "Etiketa në rrotull", text: "Etiketa të përgatitura për aplikim më të shpejtë në sasi më të mëdha." },
    ],
    forWho: ["Prodhues ushqimi dhe pijesh", "Brende kozmetike", "Dyqane online", "Kafene dhe pastiçeri"],
    alsoKnownAs: ["ngjitëse", "sticker me logo", "etiketa për shishe", "labels", "die cut stickers"],
    faqs: [
      { q: "A mund të bëni stickers në formë të logos?", a: "Po, me prerje die-cut sticker-i pritet sipas konturës së logos ose ilustrimit." },
      { q: "A ka etiketa rezistente ndaj ujit?", a: "Po, për produkte që ruhen në frigorifer ose ekspozohen ndaj lagështisë përdorim vinil dhe materiale rezistente." },
      { q: "A ndihmoni me informacionin në etiketë?", a: "E strukturojmë dizajnin që përbërësit, sasia dhe informacioni tjetër të jenë të lexueshëm; përmbajtjen ligjore e jep prodhuesi." },
    ],
    related: ["paketim-me-logo", "dizajn-grafik", "printim-kartvizita"],
  },
  {
    slug: "tekstil-me-logo",
    category: "print",
    name: "Tekstil me logo",
    title: "Maica, duks dhe kapela me logon tuaj.",
    seoTitle: "Maica me Logo, Duks & Uniforma në Kosovë | CUBE DESIGNERS",
    description:
      "Printim dhe qëndisje në maica, duks (hoodie), kapela dhe uniforma pune me logo për ekipe, evente dhe merchandise në Kosovë.",
    lead:
      "Ekipi që vesh brandin e bën atë të dukshëm çdo ditë. Ne përgatisim dizajnin, zgjedhim tekstilin dhe teknikën e duhur të printimit ose qëndisjes.",
    includes: [
      { title: "Maica & polo", text: "Maica pambuku dhe polo për ekipe, evente dhe promovime, me print para, prapa ose në mëngë." },
      { title: "Duks & jakna", text: "Hoodie dhe duks për ekipe dhe merchandise, me print ose qëndisje." },
      { title: "Kapela & aksesorë", text: "Kapela, çanta pëlhure dhe aksesorë të tjerë me logo." },
      { title: "Uniforma pune", text: "Veshje pune për restorante, dyqane dhe servise, që duken profesionale dhe zgjasin." },
    ],
    forWho: ["Ekipe dhe kompani", "Restorante dhe kafene", "Evente, gara dhe organizata", "Brende që shesin merchandise"],
    alsoKnownAs: ["maica të printuara", "hoodie me logo", "uniforma pune", "merchandise", "qëndisje logo"],
    faqs: [
      { q: "Print apo qëndisje, cila është më e mirë?", a: "Qëndisja duket më premium dhe zgjat më shumë në polo e kapela; printimi është më i përshtatshëm për dizajne me shumë ngjyra dhe sasi më të mëdha." },
      { q: "A mund të porosis madhësi të ndryshme?", a: "Po, në një porosi mund të kombinohen madhësitë sipas ekipit." },
      { q: "A bëni edhe dizajnin për merchandise?", a: "Po, krijojmë dizajne që duken mirë si veshje, jo vetëm logo të vendosur në gjoks." },
    ],
    related: ["roll-up-banera", "identitet-vizual-branding", "paketim-me-logo"],
  },
  {
    slug: "sinjalistike-tabela",
    category: "print",
    name: "Sinjalistikë & tabela",
    title: "Tabela, sinjalistikë dhe grafikë për vitrina.",
    seoTitle: "Tabela Reklamuese & Sinjalistikë në Kosovë | CUBE DESIGNERS",
    description:
      "Dizajn dhe prodhim tabelash reklamuese, sinjalistikë për zyra, grafikë për vitrina dhe mbishkrime me vinil në Suharekë, Prishtinë dhe Kosovë.",
    lead:
      "Tabela e dyqanit punon 24 orë në ditë. Ne dizajnojmë sinjalistikën që e udhëzon klientin dhe e forcon brandin, nga fasada deri te dera e zyrës.",
    includes: [
      { title: "Tabela për fasadë", text: "Tabela reklamuese për dyqane, zyra dhe lokale, të dizajnuara për dukshmëri ditë e natë." },
      { title: "Grafikë për vitrina", text: "Vinil, folie mat dhe grafikë për xhama që tërheqin vëmendjen pa e errësuar ambientin." },
      { title: "Sinjalistikë e brendshme", text: "Orientim, emra zyrash, mure me logo dhe grafikë për ambiente pune." },
      { title: "Montim i koordinuar", text: "Matje, prodhim dhe montim të koordinuara që projekti të përfundojë pa vonesa." },
    ],
    forWho: ["Dyqane dhe lokale të reja", "Zyra dhe kompani", "Klinika dhe qendra shërbimi", "Hotele dhe restorante"],
    alsoKnownAs: ["tabela reklamuese", "mbishkrime", "folie për xhama", "wayfinding", "logo në mur"],
    faqs: [
      { q: "A bëni matjet në vend?", a: "Po, për tabela dhe grafikë vitrinash koordinojmë matjet që prodhimi të jetë i saktë." },
      { q: "A mund ta përdorim identitetin ekzistues?", a: "Po, sinjalistika ndërtohet mbi logon dhe ngjyrat tuaja; nëse duhet, e përshtatim për lexim nga larg." },
      { q: "A punoni edhe në Prishtinë?", a: "Po, punojmë në Suharekë, Prishtinë dhe në qytete të tjera të Kosovës." },
    ],
    related: ["roll-up-banera", "identitet-vizual-branding", "tekstil-me-logo"],
  },
  {
    slug: "paketim-me-logo",
    category: "print",
    name: "Paketim me logo",
    title: "Paketim që e shet produktin para se të hapet.",
    seoTitle: "Dizajn Paketimi, Kuti & Qese me Logo në Kosovë | CUBE",
    description:
      "Dizajn paketimi, kuti me logo, qese letre dhe kuti transporti për produkte, dyqane online dhe brende në Kosovë. Nga ideja te prodhimi.",
    lead:
      "Paketimi është raft, reklamë dhe eksperiencë në të njëjtën kohë. Ne e dizajnojmë që produkti të dallohet, të mbrohet dhe të hapet me kënaqësi.",
    includes: [
      { title: "Dizajn paketimi", text: "Koncept, grafikë dhe përgatitje teknike për kuti, etiketa dhe paketim produkti." },
      { title: "Kuti me logo", text: "Kuti produkti dhe kuti dhuratash me print të personalizuar." },
      { title: "Qese letre", text: "Qese për dyqane dhe butikë që e çojnë brandin jashtë dyqanit." },
      { title: "Kuti transporti", text: "Kuti për dyqane online me print që e kthen dërgesën në eksperiencë." },
    ],
    forWho: ["Prodhues vendorë", "Dyqane online", "Butikë dhe pastiçeri", "Brende që lansojnë produkte të reja"],
    alsoKnownAs: ["packaging", "packaging design", "kuti të printuara", "qese me logo", "shipping box"],
    faqs: [
      { q: "A bëni vetëm dizajnin apo edhe prodhimin?", a: "Të dyja. Mund të marrim vetëm dizajnin ose ta koordinojmë projektin deri te paketimi i gatshëm." },
      { q: "A mund të shoh mostër para porosisë së madhe?", a: "Po, për projekte paketimi rekomandojmë provë ose mostër para prodhimit në sasi." },
      { q: "A punoni me produkte ushqimore?", a: "Po, dizajnojmë paketim dhe etiketa për ushqim dhe pije, me informacionin e siguruar nga prodhuesi." },
    ],
    related: ["stickers-etiketa", "identitet-vizual-branding", "dyqan-online-e-commerce"],
  },

  // ——— Branding ———
  {
    slug: "dizajn-logo",
    category: "branding",
    name: "Dizajn logo",
    title: "Dizajn logo që mbahet mend.",
    seoTitle: "Dizajn Logo Profesional në Kosovë | CUBE DESIGNERS",
    description:
      "Dizajn logo profesional në Suharekë, Prishtinë dhe gjithë Kosovën. Logo origjinale, variante për çdo përdorim dhe skedarë gati për print e digital.",
    lead:
      "Logo nuk është vetëm një vizatim i bukur, është shenja që klientët e lidhin me përvojën tuaj. Ne e ndërtojmë nga strategjia, jo nga trendi i javës.",
    includes: [
      { title: "Kërkim & koncept", text: "Njohje me biznesin, konkurrencën dhe publikun para se të nisë vizatimi." },
      { title: "Propozime logo", text: "Drejtime të ndryshme koncepti, të zhvilluara deri te zgjidhja finale." },
      { title: "Variante", text: "Versione horizontale, vertikale, ikonë dhe njëngjyrëshe për çdo përdorim." },
      { title: "Skedarët finalë", text: "SVG, PDF, PNG dhe formate për print, web dhe rrjete sociale." },
    ],
    forWho: ["Biznese të reja", "Biznese që duan rebranding", "Restorante, dyqane dhe klinika", "Startup-e dhe projekte personale"],
    alsoKnownAs: ["logo design", "krijim logo", "logotip", "rebranding logo"],
    faqs: [
      { q: "Sa propozime merr për logon?", a: "Nisim me disa drejtime koncepti dhe pastaj e zhvillojmë atë që përshtatet më mirë me biznesin tuaj deri te versioni final." },
      { q: "Në cilat formate e merr logon?", a: "Në formate vektoriale (SVG, PDF, AI) për print dhe në PNG për web dhe rrjete sociale." },
      { q: "A mund ta rifreskoni logon ekzistuese?", a: "Po, shpesh logo ekzistuese ka vlerë. Mund ta modernizojmë pa humbur njohjen që keni ndërtuar." },
    ],
    related: ["identitet-vizual-branding", "printim-kartvizita", "dizajn-grafik"],
  },
  {
    slug: "identitet-vizual-branding",
    category: "branding",
    name: "Identitet vizual & branding",
    title: "Branding dhe identitet vizual si sistem.",
    seoTitle: "Branding & Identitet Vizual në Kosovë | CUBE DESIGNERS",
    description:
      "Agjenci brandingu në Kosovë: strategji brendi, logo, ngjyra, tipografi dhe brand guidelines që e mbajnë biznesin konsistent në print, web dhe social media.",
    lead:
      "Një brand i fortë duket i njëjtë në tabelë, në Instagram dhe në faturë. Ne ndërtojmë sistemin vizual dhe rregullat që e mbajnë konsistent kudo.",
    includes: [
      { title: "Strategji brendi", text: "Pozicionimi, publiku dhe mesazhi kryesor që e dallon biznesin." },
      { title: "Sistemi vizual", text: "Logo, ngjyra, tipografi, ikona dhe stil fotografie që punojnë bashkë." },
      { title: "Brand guidelines", text: "Manual i qartë që ekipi dhe partnerët ta përdorin brandin saktë." },
      { title: "Aplikime", text: "Kartvizita, dokumente, social media templates dhe materiale të para." },
    ],
    forWho: ["Kompani në rritje", "Biznese që hapin pika të reja", "Brende që lansojnë produkte", "Organizata që duan imazh më profesional"],
    alsoKnownAs: ["brand identity", "rebranding", "brand guidelines", "agjenci brandingu", "imazh korporativ"],
    faqs: [
      { q: "Cili është dallimi mes logos dhe brandingut?", a: "Logo është një element. Brandingu është sistemi i plotë: logo, ngjyra, tipografi, ton komunikimi dhe rregullat se si përdoren." },
      { q: "Sa zgjat një projekt brandingu?", a: "Varet nga shtrirja. Një identitet i plotë zakonisht kërkon disa javë, me faza të qarta aprovimi." },
      { q: "A merrni edhe aplikimet në print dhe web?", a: "Po, meqë punojmë print, web dhe social media, identiteti aplikohet menjëherë në të gjitha kanalet." },
    ],
    related: ["dizajn-logo", "paketim-me-logo", "menaxhim-rrjete-sociale"],
  },
  {
    slug: "dizajn-grafik",
    category: "branding",
    name: "Dizajn grafik",
    title: "Dizajn grafik për çdo material që publikoni.",
    seoTitle: "Dizajn Grafik në Kosovë | Print, Social Media & Prezantime",
    description:
      "Shërbime dizajni grafik në Kosovë: materiale printi, postime për rrjete sociale, prezantime, infografika dhe grafikë për kampanja.",
    lead:
      "Kur çdo material duket sikur vjen nga i njëjti brand, klientët ju besojnë më shumë. Ne dizajnojmë materialet e përditshme dhe ato të kampanjave me të njëjtin standard.",
    includes: [
      { title: "Materiale printi", text: "Fletushka, postera, broshura, ftesa dhe materiale për evente." },
      { title: "Grafikë për social media", text: "Postime, stories dhe template që ekipi mund t'i përdorë vetë." },
      { title: "Prezantime", text: "Prezantime për klientë, investitorë dhe tendera që duken profesionale." },
      { title: "Kampanja", text: "Koncept vizual dhe adaptime për online, print dhe outdoor." },
    ],
    forWho: ["Biznese pa dizajner në ekip", "Ekipe marketingu që kanë nevojë për ndihmë", "Organizata dhe institucione", "Evente dhe konferenca"],
    alsoKnownAs: ["graphic design", "dizajner grafik", "dizajn postimesh", "dizajn posteri", "prezantime"],
    faqs: [
      { q: "A punoni me projekte të vogla?", a: "Po, marrim edhe projekte të veçanta si postera ose prezantime, jo vetëm projekte të mëdha brandingu." },
      { q: "A mund të punoni me brandin tonë ekzistues?", a: "Po, dizajnojmë sipas guidelines që keni; nëse nuk ekzistojnë, i vendosim bazat gjatë punës." },
      { q: "A ofroni bashkëpunim mujor?", a: "Po, për biznese me nevoja të rregullta mund të bashkëpunojmë në bazë mujore." },
    ],
    related: ["identitet-vizual-branding", "printim-fletushka-broshura", "content-foto-video"],
  },

  // ——— Digital ———
  {
    slug: "web-design",
    category: "digital",
    name: "Web design",
    title: "Faqe interneti që sjellin klientë.",
    seoTitle: "Web Design & Faqe Interneti në Kosovë | CUBE DESIGNERS",
    description:
      "Dizajn dhe zhvillim faqesh interneti në Suharekë, Prishtinë dhe gjithë Kosovën. Web të shpejta, responsive, të optimizuara për Google dhe të lehta për t'u menaxhuar.",
    lead:
      "Faqja juaj e internetit është zyra që nuk mbyllet kurrë. Ne e dizajnojmë që të ngarkohet shpejt, të duket mirë në telefon dhe ta çojë vizitorin te kontakti.",
    includes: [
      { title: "Strukturë & UX", text: "Arkitekturë e faqeve dhe rrugë e qartë nga vizita te kërkesa për ofertë." },
      { title: "Dizajn i personalizuar", text: "Dizajn i ndërtuar për brandin tuaj, jo template i përgjithshëm." },
      { title: "Responsive & shpejtësi", text: "Optimizim për telefon dhe ngarkim të shpejtë, që ndikon edhe në Google." },
      { title: "SEO bazë & formularë", text: "Tituj, meta, schema dhe formularë kontakti që ruajnë kërkesat." },
    ],
    forWho: ["Biznese pa faqe interneti", "Biznese me web të vjetër", "Profesionistë dhe klinika", "Kompani që duan më shumë kërkesa online"],
    alsoKnownAs: ["faqe interneti", "website", "ueb faqe", "krijim web faqe", "web development"],
    faqs: [
      { q: "A do të jetë faqja e përshtatshme për telefon?", a: "Po, çdo faqe dizajnohet dhe testohet për telefon, tablet dhe desktop." },
      { q: "A mund ta ndryshoj vetë përmbajtjen?", a: "Po, sipas nevojës ndërtojmë faqe që mund t'i menaxhoni vetë ose me panel administrimi." },
      { q: "A përfshihet SEO?", a: "Po, çdo faqe merr bazat e SEO-s: strukturë, tituj, përshkrime, shpejtësi dhe të dhëna të strukturuara." },
    ],
    related: ["dyqan-online-e-commerce", "seo-optimizim", "identitet-vizual-branding"],
  },
  {
    slug: "dyqan-online-e-commerce",
    category: "digital",
    name: "Dyqan online",
    title: "Dyqan online që shet edhe kur ju flini.",
    seoTitle: "Dyqan Online & E-commerce në Kosovë | CUBE DESIGNERS",
    description:
      "Krijim dyqanesh online (e-commerce) në Kosovë: katalog produktesh, porosi, pagesa dhe menaxhim i thjeshtë, të dizajnuara për shitje.",
    lead:
      "Një dyqan online duhet të jetë i lehtë për klientin dhe për ju. Ne e ndërtojmë rrugën nga produkti te porosia, dhe panelin që ju lejon t'i menaxhoni porositë pa stres.",
    includes: [
      { title: "Katalog produktesh", text: "Kategori, filtra, foto dhe faqe produkti që e bëjnë zgjedhjen të lehtë." },
      { title: "Porosi & checkout", text: "Proces porosie i shkurtër dhe i qartë, i optimizuar për telefon." },
      { title: "Panel menaxhimi", text: "Menaxhim produktesh, çmimesh dhe porosish nga një vend." },
      { title: "Integrime", text: "Pagesa, dërgesa dhe njoftime sipas mënyrës si punon biznesi juaj." },
    ],
    forWho: ["Dyqane fizike që duan shitje online", "Prodhues vendorë", "Brende mode dhe kozmetike", "Biznese që shesin në Instagram"],
    alsoKnownAs: ["e-commerce", "online shop", "webshop", "shitje online", "dyqan në internet"],
    faqs: [
      { q: "A mund të shtoj produkte vetë?", a: "Po, dyqani vjen me panel ku shtoni, ndryshoni dhe fshini produkte, çmime dhe foto." },
      { q: "A pranohen pagesa online?", a: "Po, sipas nevojës integrojmë pagesa me kartelë ose pagesë në dorëzim." },
      { q: "A bëni edhe fotot dhe paketimin e produkteve?", a: "Po, meqë punojmë edhe content dhe print, mund ta përgatisim gjithë eksperiencën e dyqanit." },
    ],
    related: ["web-design", "paketim-me-logo", "reklama-facebook-instagram"],
  },
  {
    slug: "seo-optimizim",
    category: "digital",
    name: "SEO",
    title: "SEO që ju nxjerr para konkurrencës në Google.",
    seoTitle: "SEO në Kosovë | Optimizim për Google | CUBE DESIGNERS",
    description:
      "Shërbime SEO në Kosovë: optimizim teknik, përmbajtje, SEO lokale dhe Google Business Profile, që biznesi juaj të gjendet kur klientët kërkojnë.",
    lead:
      "Klientët tuaj po kërkojnë në Google çdo ditë. SEO i mirë nuk është truk, është faqe e shpejtë, përmbajtje e vlefshme dhe prani e saktë në kërkimet lokale.",
    includes: [
      { title: "Auditim SEO", text: "Analizë teknike e faqes, shpejtësisë, indeksimit dhe konkurrencës." },
      { title: "SEO teknik", text: "Strukturë, meta, schema, sitemap dhe performancë që Google i kupton." },
      { title: "SEO lokale", text: "Google Business Profile, harta dhe kërkime si \"afër meje\" në qytetin tuaj." },
      { title: "Përmbajtje", text: "Faqe shërbimesh dhe tekste që u përgjigjen pyetjeve reale të klientëve." },
    ],
    forWho: ["Biznese lokale që duan më shumë thirrje", "Dyqane online", "Kompani me faqe që nuk shfaqet në Google", "Profesionistë dhe klinika"],
    alsoKnownAs: ["search engine optimization", "optimizim për Google", "SEO lokale", "Google Business Profile", "renditje në Google"],
    faqs: [
      { q: "Sa shpejt duken rezultatet e SEO-s?", a: "Ndryshimet teknike mund të ndikojnë brenda disa javësh; rezultatet e qëndrueshme zakonisht ndërtohen gjatë disa muajve." },
      { q: "A garantoni vendin e parë në Google?", a: "Askush nuk mund ta garantojë ndershmërisht vendin e parë. Ne punojmë mbi faktorët që Google i vlerëson dhe i raportojmë rezultatet." },
      { q: "Çfarë është SEO lokale?", a: "Është optimizimi që ju shfaq në hartë dhe në kërkime si \"agjenci në Suharekë\" ose \"printim afër meje\"." },
    ],
    related: ["web-design", "menaxhim-rrjete-sociale", "reklama-facebook-instagram"],
  },

  // ——— Social media ———
  {
    slug: "menaxhim-rrjete-sociale",
    category: "social",
    name: "Menaxhim rrjete sociale",
    title: "Menaxhim i rrjeteve sociale me strategji.",
    seoTitle: "Menaxhim Rrjete Sociale në Kosovë | Social Media | CUBE",
    description:
      "Social media menaxhim në Suharekë, Prishtinë dhe gjithë Kosovën: strategji, plan postimesh, dizajn, publikim dhe raportim për Instagram, Facebook dhe TikTok.",
    lead:
      "Të postosh çdo ditë nuk mjafton. Ne ndërtojmë plan, stil dhe ritëm që profili juaj të duket profesional dhe të sjellë mesazhe, jo vetëm pëlqime.",
    includes: [
      { title: "Strategji & plan", text: "Qëllime, publik, tema dhe kalendar mujor postimesh." },
      { title: "Dizajn & content", text: "Postime, carousel, stories dhe reels në stilin e brandit tuaj." },
      { title: "Publikim & komunitet", text: "Publikim sipas planit dhe menaxhim i komenteve e mesazheve sipas marrëveshjes." },
      { title: "Raportim mujor", text: "Çka funksionoi, çka jo dhe çka ndryshojmë muajin e ardhshëm." },
    ],
    forWho: ["Biznese pa kohë për rrjete sociale", "Restorante, kafene dhe dyqane", "Klinika dhe qendra estetike", "Brende që duan imazh më profesional online"],
    alsoKnownAs: ["social media management", "social media menaxher", "menaxhim Instagram", "menaxhim Facebook", "marketing digjital"],
    faqs: [
      { q: "Cilat rrjete sociale menaxhoni?", a: "Kryesisht Instagram, Facebook dhe TikTok; LinkedIn për biznese B2B." },
      { q: "Sa postime në muaj përfshihen?", a: "Varet nga paketa dhe qëllimet. E përcaktojmë bashkë pas analizës së profilit dhe konkurrencës." },
      { q: "A përfshihen reklamat me pagesë?", a: "Menaxhimi i reklamave është shërbim më vete, por mund të kombinohet me menaxhimin e profilit." },
    ],
    related: ["reklama-facebook-instagram", "content-foto-video", "dizajn-grafik"],
  },
  {
    slug: "reklama-facebook-instagram",
    category: "social",
    name: "Reklama Facebook & Instagram",
    title: "Reklama në Facebook, Instagram dhe TikTok që kthejnë investimin.",
    seoTitle: "Reklama në Facebook & Instagram (Meta Ads) në Kosovë | CUBE",
    description:
      "Menaxhim reklamash në Facebook, Instagram dhe TikTok në Kosovë: targetim, kreativë, testim dhe raportim që buxheti të kthehet në klientë.",
    lead:
      "Butoni \"Boost\" rrallë mjafton. Ne ndërtojmë kampanja me qëllim të qartë, target të saktë dhe kreativë që testohen, që çdo euro të matet.",
    includes: [
      { title: "Strategji kampanje", text: "Qëllimi, publiku, buxheti dhe oferta para se të nisë reklama." },
      { title: "Kreativë reklamash", text: "Foto, video dhe tekste të dizajnuara për të ndaluar scroll-in." },
      { title: "Targetim & testim", text: "Publiqe sipas lokacionit, interesave dhe klientëve ekzistues, me teste A/B." },
      { title: "Raportim", text: "Raporte të kuptueshme: kosto për klient, mesazhe, blerje dhe rekomandime." },
    ],
    forWho: ["Biznese lokale që duan klientë nga qyteti", "Dyqane online", "Evente dhe hapje biznesesh", "Kompani që punësojnë"],
    alsoKnownAs: ["Meta Ads", "Facebook Ads", "Instagram Ads", "TikTok Ads", "reklamim online", "sponsorizim postimesh"],
    faqs: [
      { q: "Sa buxhet duhet për reklama?", a: "Mund të niset me buxhet modest. E përcaktojmë sipas qëllimit, qytetit dhe konkurrencës, dhe e rrisim kur rezultatet janë të mira." },
      { q: "A mund të targetoni vetëm një qytet?", a: "Po, mund të targetojmë Suharekën, Prishtinën ose rrezen rreth biznesit tuaj." },
      { q: "Si e dimë nëse reklama po funksionon?", a: "Vendosim matje (Pixel, konvertime, mesazhe) dhe raportojmë rezultatet, jo vetëm shikimet." },
    ],
    related: ["menaxhim-rrjete-sociale", "content-foto-video", "dyqan-online-e-commerce"],
  },
  {
    slug: "content-foto-video",
    category: "social",
    name: "Content, foto & video",
    title: "Content, foto dhe video për rrjete sociale.",
    seoTitle: "Content Creation, Foto & Video për Biznese në Kosovë | CUBE",
    description:
      "Prodhim content-i për rrjete sociale në Kosovë: foto produktesh, reels, video të shkurtra dhe copywriting në stilin e brandit tuaj.",
    lead:
      "Algoritmi e shpërblen content-in që njerëzit e shikojnë deri në fund. Ne planifikojmë, xhirojmë dhe editojmë foto dhe video që tregojnë biznesin tuaj në mënyrën më të mirë.",
    includes: [
      { title: "Foto produktesh", text: "Foto të pastra për dyqan online dhe foto lifestyle për rrjete sociale." },
      { title: "Reels & video të shkurtra", text: "Ide, skenar, xhirim dhe editim për Instagram dhe TikTok." },
      { title: "Copywriting", text: "Tekste, caption dhe tituj në tonin e brandit tuaj." },
      { title: "Plan content-i", text: "Seanca të planifikuara që sjellin material për disa javë." },
    ],
    forWho: ["Restorante dhe kafene", "Dyqane online dhe butikë", "Klinika dhe salone", "Brende që lansojnë produkte"],
    alsoKnownAs: ["content creation", "fotografi produktesh", "reels", "video marketing", "copywriting"],
    faqs: [
      { q: "A xhironi në lokalin tonë?", a: "Po, seancat zakonisht bëhen në ambientin tuaj që content-i të jetë autentik." },
      { q: "Sa content merr nga një seancë?", a: "Varet nga plani; zakonisht një seancë e mirë-planifikuar sjell material për disa javë postimesh." },
      { q: "A mund ta përdorim content-in edhe për reklama?", a: "Po, content-i përgatitet edhe në formate për reklama në Facebook, Instagram dhe TikTok." },
    ],
    related: ["menaxhim-rrjete-sociale", "reklama-facebook-instagram", "dizajn-grafik"],
  },
]

export function getServiceBySlug(slug: string) {
  return services.find((service) => service.slug === slug)
}

export function getServicesByCategory(category: ServiceCategory) {
  return services.filter((service) => service.category === category)
}
