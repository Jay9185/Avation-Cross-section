const DEFAULT_CONFIG = {
  LAT: 33.4343,
  LON: -112.0116,
  RADIUS_NM: 30,
  AIRPORT_LABEL: "KPHX",
  KV_KEY: "flight_cache_v3",     
  ENABLE_KV: true,

  LOW_SLOTS: 5,      
  LOW_FT: 12000,
  ALT_SLOTS: 7,      
  NEAR_SLOTS: 3,     

  OWNSHIP_ALT_FT: 1135,   
  PROXIMATE_NM: 6,
  PROXIMATE_FT: 1200,

  SCOPE_PX: 440,     

  XS_W: 700,         
  XS_H: 330,
  XS_MODE: "ew"      
};

const RADAR_LABEL_SCALE = 0.6;

// V7 Browser Spoofing Headers - critical for bypassing the API firewalls
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://airplanes.live/',
  'Origin': 'https://airplanes.live'
};

const SOURCES = [
  (la, lo, r) => `https://api.airplanes.live/v2/point/${la}/${lo}/${r}`,
  (la, lo, r) => `https://api.adsb.lol/v2/point/${la}/${lo}/${r}`,
  (la, lo, r) => `https://opendata.adsb.fi/api/v3/lat/${la}/lon/${lo}/dist/${r}`
];

// ---- ICONS ---------------------------------------------------------------------------------------
const SHAPES = {"a319":[23,32,380,373],"a320":[23,32,380,415],"a321":[23,32,380,485],"b737":[23.5,32,74.5,74.7],"b738":[23.5,32,74.5,87.3],"b739":[23.5,32,74.5,92.7],"airliner":[32,32,34,34],"a332":[31,31,1370,1353],"a359":[31.5,31.5,562,578],"a380":[42,42,40,40],"heavy_2e":[34,34,64.2,64.2],"heavy_4e":[34,34,64,64],"md11":[38,32,72,72],"b707":[32,32,36,36],"jet_swept":[19,25,20,26],"jet_nonswept":[22,22,22,22],"twin_large":[25,25,25,25],"twin_small":[25,22,25,22],"single_turbo":[24,22,23,23],"cessna":[26,26,32,31],"cirrus_sr22":[23,25,64,64],"pa24":[30,30,30,30],"helicopter":[29,29,90,90],"s61":[28,28,32,32],"blackhawk":[28,28,32,32],"hi_perf":[32,32,80,80],"f18":[25,25,32,32],"f35":[32,32,40,40],"c130":[33,35,64,64],"c17":[32,32,32,32],"glider":[22,33,76,76],"balloon":[13,17,13,17],"uav":[28,28,32,32],"unknown":[22,22,22,22],"ground_tower":[22,18,730,587]};

const TYPE_ICONS = {"SHIP":["balloon",0.94],"BALL":"balloon","A318":["a319",0.95],"A319":"a319","A19N":"a319","A320":"a320","A20N":"a320","A321":"a321","A21N":"a321","A306":["heavy_2e",0.93],"A330":["a332",0.98],"A332":["a332",0.99],"A333":"a332","A338":"a332","A339":["a332",1.01],"DC10":["md11",0.92],"MD11":["md11",0.96],"A359":"a359","A35K":["a359",1.02],"A388":"a380","B731":["b737",0.9],"B732":["b737",0.92],"B735":["b737",0.96],"B733":["b737",0.98],"B734":["b737",0.98],"B736":["b737",0.96],"B737":"b737","B738":"b738","B739":"b739","B37M":["b737",1.02],"B38M":"b738","B39M":"b739","B3XM":["b739",1.01],"P8":"c130","P8 ?":"c130","E737":"c130","J328":["airliner",0.78],"E170":["airliner",0.82],"E75L":["airliner",0.82],"E75S":["airliner",0.82],"A148":["airliner",0.83],"RJ70":["b707",0.68],"RJ85":["b707",0.68],"RJ1H":["b707",0.68],"B461":["b707",0.68],"B462":["b707",0.68],"B463":["b707",0.68],"E190":["airliner",0.81],"E195":["airliner",0.81],"E290":["airliner",0.82],"E295":["airliner",0.83],"BCS1":["airliner",0.835],"BCS3":["airliner",0.85],"B741":["heavy_4e",0.96],"B742":["heavy_4e",0.96],"B743":["heavy_4e",0.96],"B744":["heavy_4e",0.96],"B74D":["heavy_4e",0.96],"B74S":["heavy_4e",0.96],"B74R":["heavy_4e",0.96],"BLCF":["heavy_4e",0.96],"BSCA":["heavy_4e",0.96],"B748":["heavy_4e",0.98],"B752":["heavy_2e",0.9],"B753":["heavy_2e",0.9],"B772":"heavy_2e","B773":["heavy_2e",1.02],"B77L":["heavy_2e",1.02],"B77W":["heavy_2e",1.04],"B701":"b707","B703":"b707","K35R":"b707","K35E":"b707","FA20":["jet_swept",0.92],"C680":["jet_swept",0.92],"C68A":["jet_swept",0.92],"YK40":["jet_swept",0.94],"C750":["jet_swept",0.94],"F2TH":["jet_swept",0.94],"FA50":["jet_swept",0.94],"CL30":["jet_swept",0.92],"CL35":["jet_swept",0.92],"F900":["jet_swept",0.96],"CL60":["jet_swept",0.96],"G200":["jet_swept",0.92],"G280":["jet_swept",0.92],"HA4T":["jet_swept",0.92],"FA7X":["jet_swept",0.96],"FA8X":["jet_swept",0.96],"FA6X":["jet_swept",0.96],"GLF2":["jet_swept",0.96],"GLF3":["jet_swept",0.96],"GLF4":["jet_swept",0.96],"GA5C":["jet_swept",0.96],"GL5T":["jet_swept",0.98],"GLF5":["jet_swept",0.98],"GA6C":["jet_swept",0.98],"GLEX":"jet_swept","GL6T":"jet_swept","GLF6":"jet_swept","GA7C":"jet_swept","GA8C":"jet_swept","GL7T":"jet_swept","E135":["jet_swept",0.92],"E35L":["jet_swept",0.92],"E145":["jet_swept",0.92],"E45X":["jet_swept",0.92],"E390":"c130","CRJ1":["jet_swept",0.92],"CRJ2":["jet_swept",0.92],"F28":["jet_swept",0.93],"CRJ7":["jet_swept",0.94],"CRJ9":["jet_swept",0.96],"F70":["jet_swept",0.97],"CRJX":["jet_swept",0.98],"F100":"jet_swept","DC91":"jet_swept","DC92":"jet_swept","DC93":"jet_swept","DC94":"jet_swept","DC95":"jet_swept","MD80":["jet_swept",1.06],"MD81":["jet_swept",1.06],"MD82":["jet_swept",1.06],"MD83":["jet_swept",1.06],"MD87":["jet_swept",1.06],"MD88":["jet_swept",1.06],"MD90":["jet_swept",1.06],"B712":["jet_swept",1.06],"B721":["jet_swept",1.1],"B722":["jet_swept",1.1],"T154":["jet_swept",1.12],"BE40":"jet_nonswept","FA10":"jet_nonswept","C501":"jet_nonswept","C510":"jet_nonswept","C25A":"jet_nonswept","C25B":"jet_nonswept","C25C":"jet_nonswept","C525":"jet_nonswept","C550":"jet_nonswept","C560":"jet_nonswept","C56X":"jet_nonswept","LJ23":"jet_nonswept","LJ24":"jet_nonswept","LJ25":"jet_nonswept","LJ28":"jet_nonswept","LJ31":"jet_nonswept","LJ35":"jet_nonswept","LR35":"jet_nonswept","LJ40":"jet_nonswept","LJ45":"jet_nonswept","LR45":"jet_nonswept","LJ55":"jet_nonswept","LJ60":"jet_nonswept","LJ70":"jet_nonswept","LJ75":"jet_nonswept","LJ85":"jet_nonswept","C650":["jet_nonswept",1.03],"ASTR":["jet_nonswept",1.03],"G150":["jet_nonswept",1.03],"H25A":["jet_nonswept",1.03],"H25B":["jet_nonswept",1.03],"H25C":["jet_nonswept",1.03],"PRM1":["jet_nonswept",0.96],"E55P":["jet_nonswept",0.96],"E50P":["jet_nonswept",0.96],"EA50":["jet_nonswept",0.96],"HDJT":["jet_nonswept",0.96],"SF50":["jet_nonswept",0.94],"C97":"c17","SGUP":"c17","A3ST":"c17","A337":["c17",1.06],"WB57":"c130","A37":"hi_perf","A700":"hi_perf","LEOP":"hi_perf","ME62":"hi_perf","T2":"hi_perf","T37":"hi_perf","T38":"hi_perf","F104":"hi_perf","A10":"hi_perf","A3":"hi_perf","A6":"hi_perf","AJET":"hi_perf","AT3":"hi_perf","CKUO":"hi_perf","EUFI":"hi_perf","SB39":"hi_perf","MIR2":"hi_perf","KFIR":"hi_perf","F1":"hi_perf","F111":"hi_perf","F117":"hi_perf","F14":"hi_perf","F15":"hi_perf","F16":"hi_perf","F18":"f18","F18H":"f18","F18S":"f18","F22":"f35","F22A":"f35","F35":"f35","VF35":"f35","L159":"hi_perf","L39":"hi_perf","F4":"hi_perf","F5":"hi_perf","HUNT":"hi_perf","LANC":"heavy_4e","B17":"heavy_4e","B29":"heavy_4e","J8A":"hi_perf","J8B":"hi_perf","JH7":"hi_perf","LTNG":"hi_perf","M346":"hi_perf","METR":"hi_perf","MG19":"hi_perf","MG25":"hi_perf","MG29":"hi_perf","MG31":"hi_perf","MG44":"hi_perf","MIR4":"hi_perf","MT2":"hi_perf","Q5":"hi_perf","RFAL":"hi_perf","S3":"hi_perf","S37":"hi_perf","SR71":"hi_perf","SU15":"hi_perf","SU24":"hi_perf","SU25":"hi_perf","SU27":"hi_perf","T22M":"hi_perf","T4":"hi_perf","TOR":"hi_perf","A4":"hi_perf","TU22":"hi_perf","VAUT":"hi_perf","Y130":"hi_perf","YK28":"hi_perf","BE20":["twin_large",0.92],"IL62":"heavy_4e","MRF1":["hi_perf",0.75],"M326":"hi_perf","M339":"hi_perf","FOUG":"hi_perf","T33":"hi_perf","A225":"c17","A124":["b707",1.18],"SLCH":"glider","WHK2":["glider",0.9],"C130":["c130",1.07],"C30J":["c130",1.07],"P3":"c130","PARA":"glider","DRON":"uav","Q1":"uav","Q4":"uav","Q9":"uav","Q25":"uav","HRON":"uav","A400":"c17","V22F":"c130","V22":"c130","B609F":["c130",0.86],"B609":["c130",0.86],"H64":"helicopter","H60":"blackhawk","S92":"blackhawk","NH90":"blackhawk","AS32":["helicopter",1.03],"AS3B":["helicopter",1.03],"PUMA":["helicopter",1.03],"TIGR":"helicopter","MI24":"helicopter","AS65":["helicopter",0.85],"S76":["helicopter",0.86],"GAZL":"helicopter","AS50":"helicopter","AS55":"helicopter","ALO2":"helicopter","ALO3":"helicopter","R22":["helicopter",0.92],"R44":["helicopter",0.94],"R66":["helicopter",0.98],"EC55":["s61",0.94],"A169":["s61",0.94],"H160":["s61",0.95],"A139":["s61",0.96],"EC75":["s61",0.97],"A189":["s61",0.98],"A149":["s61",0.98],"S61":["s61",0.98],"S61R":"s61","EC25":["s61",1.01],"EH10":["s61",1.04],"H53":["s61",1.1],"H53S":["s61",1.1],"U2":"c130","C2":"c130","E2":"c130","H47":"helicopter","H46":"helicopter","HAWK":"hi_perf","GYRO":"glider","DLTA":"glider","B1":"heavy_4e","B52":"heavy_4e","C17":["c17",1.25],"C5M":["c17",1.18],"E3TF":["c130",0.88],"E3CF":["c130",0.88],"GLID":"glider","GLIM":"glider","S6":"glider","S10S":"glider","S12":"glider","S12S":"glider","ARCE":"glider","ARCP":"glider","DISC":"glider","DUOD":"glider","JANU":"glider","NIMB":"glider","QINT":"glider","VENT":"glider","VNTE":"glider","A20J":"glider","A32E":"glider","A32P":"glider","A33E":"glider","A33P":"glider","A34E":"glider","AS14":"glider","AS16":"glider","AS20":"glider","AS21":"glider","AS22":"glider","AS24":"glider","AS25":"glider","AS26":"glider","AS28":"glider","AS29":"glider","AS30":"glider","AS31":"glider","DG80":"glider","DG1T":"glider","LS10":"glider","LS9":"glider","LS8":"glider","TS1J":"glider","PK20":"glider","LK17":"glider","LK19":"glider","LK20":"glider","ULAC":["cessna",0.92],"EV97":["cessna",0.92],"FDCT":["cessna",0.92],"WT9":["cessna",0.92],"PIVI":["cessna",0.92],"FK9":["cessna",0.92],"AVID":["cessna",0.92],"NG5":["cessna",0.92],"PNR3":["cessna",0.92],"TL20":["cessna",0.92],"SR20":"cirrus_sr22","SR22":"cirrus_sr22","S22T":"cirrus_sr22","VEZE":"glider","VELO":["glider",1.04],"PRTS":["glider",1.3],"PA24":"pa24","GND":"unknown","GRND":"unknown","SERV":"unknown","EMER":"unknown"};

const EXTRA_ICONS = (() => {
  const m = {};
  const put = (codes, v) => codes.split(" ").forEach(c => { m[c] = v; });
  put("B762 B763 B764 B788 B789 B78X", ["heavy_2e", 1.0]);
  put("B703 B720", "b707");
  put("DH8A DH8B DH8C DH8D AT43 AT44 AT45 AT46 AT72 AT73 AT75 AT76 SF34 JS31 JS32 JS41 B190 BE9L BE99 BE10 E120 D328 SW4 SW3 AC90 AC95 C441 C425 PAY2 PAY3 PAY4 MU2", ["twin_large", 1.0]);
  put("C208 C206T PC12 PC24 TBM7 TBM8 TBM9 TBM6 P46T M600 SF50 EVOT C210 T206 P180", "single_turbo");
  put("C172 C175 C177 C182 C150 C152 C170 C140 C120 C185 PA28 PA32 PA38 PA18 PA22 DA20 DA40 DV20 RV6 RV7 RV8 RV9 RV10 RV12 BE23 BE24 BE33 BE35 BE36 M20P M20T AA5 SR20 GLAS", "cessna");
  put("PA34 PA44 PA30 PA31 BE55 BE58 BE60 BE76 DA42 DA62 C310 C320 C340 C402 C414 C421 AEST", "twin_small");
  put("EC35 EC30 EC45 EC20 A109 A119 B06 B407 B412 B427 B429 B505 S76 AS50 AS55 AS65 EC55 H500 MD52 MD60 R22 R44 R66 H269 H25 EN28 EN48 B47G", "helicopter");
  put("CRJ1 CRJ2 CRJ7 CRJ9 CRJX", ["airliner", 0.82]);
  put("E135 E145 E45X E35L ER4 E50P E55P", ["jet_swept", 0.94]);
  put("MD81 MD82 MD83 MD87 MD88 MD90 DC93 DC95 B712 BCS1 BCS3 A220", ["airliner", 0.95]);
  return m;
})();

const CATEGORY_ICONS = { A1: "cessna", A2: "jet_swept", A3: "airliner", A4: "airliner", A5: "heavy_2e",
  A6: "hi_perf", A7: "helicopter", B1: "glider", B2: "balloon", B4: "cessna", B6: "uav" };

function resolveIcon(ac, airline) {
  const t = String(ac.t || "").toUpperCase();
  let e = EXTRA_ICONS[t] || TYPE_ICONS[t];
  if (!e && ac.category && CATEGORY_ICONS[ac.category]) e = CATEGORY_ICONS[ac.category];
  if (!e) e = airline !== "Other" ? "airliner" : "unknown";
  const shape = Array.isArray(e) ? e[0] : e;
  const scale = Array.isArray(e) ? e[1] : 1;
  return { shape: SHAPES[shape] ? shape : "unknown", scale };
}

const CARGO = new Set(["FDX", "UPS", "GTI", "CLX", "BCS", "DHK", "BDG", "ABX", "ATN", "KFS", "PAC", "SQC"]);

const AIRLINE_MAP = {
  AAL: "American Airlines", UAL: "United Airlines", DAL: "Delta Air Lines",
  ACA: "Air Canada", SWA: "Southwest", JBU: "JetBlue", ASA: "Alaska Airlines",
  NKS: "Spirit", FFT: "Frontier", WJA: "WestJet", TSC: "Air Transat",
  AMX: "Aeromexico", VOI: "Volaris", HAL: "Hawaiian", ALO: "Allegiant",
  SKW: "SkyWest", RPA: "Republic Airways", JIA: "PSA Airlines", ENY: "Envoy Air",
  BAW: "British Airways", DLH: "Lufthansa", AFR: "Air France", KLM: "KLM",
  IBE: "Iberia", AZA: "ITA Airways", SWR: "Swiss", AUA: "Austrian",
  SAS: "SAS", FIN: "Finnair", EIN: "Aer Lingus", TAP: "TAP Portugal",
  LOT: "LOT Polish", THY: "Turkish Airlines", AFL: "Aeroflot",
  RYR: "Ryanair", EZY: "easyJet", EJU: "easyJet Europe", WZZ: "Wizz Air",
  VIR: "Virgin Atlantic", BEL: "Brussels Airlines",
  UAE: "Emirates", QTR: "Qatar Airways", ETD: "Etihad",
  SVA: "Saudia", GFA: "Gulf Air", KAC: "Kuwait Airways",
  OMA: "Oman Air", RJA: "Royal Jordanian", MEA: "Middle East Airlines",
  FDB: "flydubai", ABY: "Air Arabia", JZR: "Jazeera",
  CCA: "Air China", CSN: "China Southern", CES: "China Eastern",
  CPA: "Cathay Pacific", JAL: "Japan Airlines", ANA: "All Nippon",
  SIA: "Singapore Airlines", MAS: "Malaysia Airlines", GIA: "Garuda Indonesia",
  THA: "Thai Airways", HVN: "Vietnam Airlines", VJC: "VietJet",
  AIC: "Air India", IGO: "IndiGo", VTI: "Vistara", SEJ: "SpiceJet",
  AXB: "Air India Express", AKY: "Akasa Air", IAD: "AIX Connect",
  ALL: "Alliance Air",
  QFA: "Qantas", ANZ: "Air New Zealand", VOZ: "Virgin Australia",
  ETH: "Ethiopian Airlines", SAA: "South African", KQA: "Kenya Airways",
  FDX: "FedEx", UPS: "UPS Airlines", GTI: "Atlas Air", CLX: "Cargolux",
  BCS: "DHL", DHK: "DHL Air", BDG: "Blue Dart",
  UNKNOWN: "Unknown Airline"
};

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*'
};

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(updateFlightCache(env));
  },

  async fetch(request, env, ctx) {
    if (isKvEnabled(env) && env.FLIGHT_KV) {
      const cached = await env.FLIGHT_KV.get(DEFAULT_CONFIG.KV_KEY);
      if (cached) return new Response(cached, { headers: JSON_HEADERS });
    }
    const freshData = await updateFlightCache(env);
    return new Response(JSON.stringify(freshData, null, 2), { headers: JSON_HEADERS });
  }
};

function isKvEnabled(env) {
  return env.ENABLE_KV !== undefined ? (String(env.ENABLE_KV) === "true") : DEFAULT_CONFIG.ENABLE_KV;
}

async function fetchAircraft(lat, lon, radius) {
  let lastErr = "no sources";
  for (const build of SOURCES) {
    const url = build(lat, lon, radius);
    const host = new URL(url).hostname;
    try {
      // Reverted to V7 Browser spoofing headers so Airplanes.live doesn't block the request
      const resp = await fetch(url, { headers: BROWSER_HEADERS, cf: { cacheTtl: 20, cacheEverything: true } });
      if (resp.ok) {
        const d = await resp.json();
        return d.ac || d.aircraft || [];
      }
      lastErr = `${host} ${resp.status}`;
    } catch (e) {
      lastErr = `${host} ${e.message}`;
    }
  }
  throw new Error(`All ADS-B sources failed (last: ${lastErr})`);
}

async function updateFlightCache(env) {
  const lat = num(env.LATITUDE, DEFAULT_CONFIG.LAT);
  const lon = num(env.LONGITUDE, DEFAULT_CONFIG.LON);
  const radius = num(env.RADIUS_NM, DEFAULT_CONFIG.RADIUS_NM);
  const airportLabel = String(env.AIRPORT_LABEL || DEFAULT_CONFIG.AIRPORT_LABEL);

  const lowSlots = Math.max(0, Math.round(num(env.LOW_SLOTS, DEFAULT_CONFIG.LOW_SLOTS)));
  const lowFt = num(env.LOW_FT, DEFAULT_CONFIG.LOW_FT);
  const altSlots = Math.max(0, Math.round(num(env.ALT_SLOTS, DEFAULT_CONFIG.ALT_SLOTS)));
  const nearSlots = Math.max(0, Math.round(num(env.NEAR_SLOTS, DEFAULT_CONFIG.NEAR_SLOTS)));
  const fieldAlt = num(env.OWNSHIP_ALT_FT, DEFAULT_CONFIG.OWNSHIP_ALT_FT);
  const proxNm = num(env.PROXIMATE_NM, DEFAULT_CONFIG.PROXIMATE_NM);
  const proxFt = num(env.PROXIMATE_FT, DEFAULT_CONFIG.PROXIMATE_FT);
  const scopePx = num(env.SCOPE_PX, DEFAULT_CONFIG.SCOPE_PX);
  const xsW = num(env.XS_W, DEFAULT_CONFIG.XS_W);
  const xsH = num(env.XS_H, DEFAULT_CONFIG.XS_H);
  const xsMode = String(env.XS_MODE || DEFAULT_CONFIG.XS_MODE) === "radial" ? "radial" : "ew";
  const kvOn = isKvEnabled(env);

  try {
    const acList = await fetchAircraft(lat, lon, radius);
    if (!Array.isArray(acList) || acList.length === 0) return { status: "No aircraft in range; cache preserved" };

    const eligible = acList
      .filter(ac => typeof ac.lat === 'number' && typeof ac.lon === 'number' && typeof ac.alt_baro === 'number')
      .map(ac => {
        const callsign = (ac.flight || ac.r || ac.hex || "").trim();
        const airline = getAirlineFromCallsign(ac.flight);
        const distanceNm = calculateDistance(lat, lon, ac.lat, ac.lon);

        const alt_ft = ac.alt_baro || 0;
        const gs_knots = ac.gs || 0;
        const track = ac.track || 0;
        const v_rate_fpm = ac.baro_rate || 0;

        const slice_x = 5 + (distanceNm / radius) * 90;
        const slice_y = 10 + ((1 - (Math.min(Math.max(alt_ft, 0), 40000) / 40000)) * 80);
        const bearing = calculateBearing(lat, lon, ac.lat, ac.lon);
        const relBearing = (track - bearing + 360) % 360;
        const is_outbound = (relBearing < 90 || relBearing > 270);
        let pitch = 0;
        if (v_rate_fpm > 500) pitch = 20; else if (v_rate_fpm < -500) pitch = -20;
        const icon_rotation = is_outbound ? (90 - pitch) : (270 + pitch);

        const dxNm = (ac.lon - lon) * Math.cos(lat * Math.PI / 180) * 60;
        const dyNm = (ac.lat - lat) * 60;
        const tcas_x = clamp(50 + (dxNm / radius) * 50, 0, 100);
        const tcas_y = clamp(50 - (dyNm / radius) * 50, 0, 100);
        const vector_length = clamp(Math.round(gs_knots / 12), 6, 36);
        const is_proximate = distanceNm <= proxNm && Math.abs(alt_ft - fieldAlt) <= proxFt;

        const prefix = (ac.flight || "").trim().slice(0, 3).toUpperCase();
        const ico = resolveIcon(ac, airline);
        const military = (Number(ac.dbFlags) & 1) === 1;

        return {
          callsign,
          airline,
          aircraftType: String(ac.t || "").toUpperCase(),
          distance: Math.round(distanceNm * 10) / 10,
          altitude: Math.round(alt_ft),
          speed: Math.round(gs_knots),
          heading: Math.round(track),
          is_climbing: v_rate_fpm > 500,
          is_descending: v_rate_fpm < -500,

          slice_x: parseFloat(slice_x.toFixed(1)),
          slice_y: parseFloat(slice_y.toFixed(1)),
          icon_rotation,

          tcas_x: parseFloat(tcas_x.toFixed(1)),
          tcas_y: parseFloat(tcas_y.toFixed(1)),
          vector_length,
          is_proximate,
          label_dx: 14,
          label_dy: -20,

          icon: ico.shape,
          icon_scale: ico.scale,
          is_airline: airline !== "Other",
          is_cargo: CARGO.has(prefix),
          is_military: military,
          xs: false,

          lat: ac.lat,
          lon: ac.lon,
          dx_nm: dxNm,
          origin_full: "---",
          destination_full: "---",
          origin_code: "",
          dest_code: ""
        };
      })
      .filter(f => !(f.airline === "IndiGo" || f.callsign.includes("INDIGO") || f.callsign.startsWith("IGO")));

    const byAlt = (a, b) => b.altitude - a.altitude;
    const byDist = (a, b) => a.distance - b.distance;
    const xsLow = eligible.filter(f => f.altitude < lowFt).sort(byDist).slice(0, lowSlots);
    const taken = new Set(xsLow);
    const xsHigh = eligible.filter(f => !taken.has(f)).sort(byAlt).slice(0, altSlots);
    xsHigh.forEach(f => taken.add(f));
    const near = eligible.filter(f => !taken.has(f)).sort(byDist).slice(0, nearSlots);
    const xsSet = [...xsLow, ...xsHigh];
    xsSet.forEach(f => { f.xs = true; });
    const processed = [...xsSet, ...near].sort(byAlt);

    await Promise.allSettled(processed.filter(f => f.xs).map(async (flight, i) => {
      if (!flight.is_airline || flight.callsign.length < 3) return;
      await new Promise(r => setTimeout(r, i * 250));
      try {
        const routeResp = await fetch("https://api.adsb.lol/api/0/routeset", {
          method: "POST",
          // Reverted to V7 Browser headers here as well
          headers: Object.assign({}, BROWSER_HEADERS, { "Content-Type": "application/json" }),
          body: JSON.stringify({ planes: [{ callsign: flight.callsign, lat: flight.lat, lng: flight.lon }] })
        });
        if (routeResp.ok) {
          const routeData = await routeResp.json();
          if (Array.isArray(routeData) && routeData[0]) {
            const r = getAirportNamesFromAPI(routeData[0]);
            flight.origin_full = r.origin; flight.destination_full = r.dest;
            flight.origin_code = r.originCode; flight.dest_code = r.destCode;
          }
        }
      } catch (err) { console.warn(`Route failed for ${flight.callsign}`); }
    }));

    placeRadarLabels(processed, scopePx);
    const xs = layoutCrossSection(xsSet, {
      W: xsW, H: xsH, mode: xsMode, radius, fieldAlt, airportLabel
    });
    xs.counts = countFlows(eligible);

    for (const f of processed) { delete f.dx_nm; delete f.icon_scale; }

    const payload = {
      merge_variables: {
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Phoenix" }),
        aircraft_count: processed.length,
        total_in_range: eligible.length,
        airport_label: airportLabel,
        location: { lat, lon, radius_nm: radius },
        xs,
        flights: processed
      }
    };

    if (kvOn && env.FLIGHT_KV) await env.FLIGHT_KV.put(DEFAULT_CONFIG.KV_KEY, JSON.stringify(payload));
    return payload;

  } catch (e) {
    if (kvOn && env.FLIGHT_KV) {
      try {
        const stale = await env.FLIGHT_KV.get(DEFAULT_CONFIG.KV_KEY);
        if (stale) return JSON.parse(stale);
      } catch (_) { /* fall through */ }
    }
    return { 
      merge_variables: { 
        error_message: e.message, 
        aircraft_count: 0, 
        total_in_range: 0, 
        flights: [],
        xs: {} 
      }
    };
  }
}

function countFlows(list) {
  let arr = 0, dep = 0, ovr = 0;
  for (const f of list) {
    if (f.altitude < 12000 && f.is_descending) arr++;
    else if (f.altitude < 12000 && f.is_climbing) dep++;
    else ovr++;
  }
  return { arr, dep, ovr };
}

const CS = {
  PAD_TOP: 26,
  ICON_K: 0.95,
  BIG:   { fs1: 12, cw1: 7.2, fs1b: 9, cw1b: 5.4, fs2: 10.5, cw2: 6.3, fs3: 8.5, cw3: 5.1, padX: 6, b1: 13, b2: 25, b3: 35, h2: 29, h3: 39 },
  SMALL: { fs1: 10, cw1: 6.0, fs1b: 9,  cw1b: 5.4, fs2: 10, cw2: 6.0, fs3: 9, cw3: 5.4, padX: 5, b1: 11, b2: 22, b3: 22, h2: 26, h3: 26 }
};

function altText(alt) {
  if (alt >= 18000) return "FL" + String(Math.round(alt / 100)).padStart(3, "0");
  return (Math.round(alt / 100) / 10).toFixed(1) + "k";
}

function layoutCrossSection(flights, o) {
  const { W, H, mode, radius, fieldAlt, airportLabel } = o;
  const padTop = CS.PAD_TOP;
  const maxAlt = flights.reduce((m, f) => Math.max(m, f.altitude), 0);

  let ceiling, lowShare;
  if (maxAlt > 40000) { ceiling = 50000; lowShare = 45; }
  else if (maxAlt > 30000) { ceiling = 40000; lowShare = 45; }
  else if (maxAlt > 20000) { ceiling = 30000; lowShare = 45; }
  else if (maxAlt > 10000) { ceiling = 20000; lowShare = 45; }
  else { ceiling = 10000; lowShare = 100; }
  const highShare = 100 - lowShare, span = ceiling - 10000;
  const yOf = (alt) => {
    const a = clamp(alt, 0, ceiling);
    const fb = a <= 10000 ? a * lowShare / 10000 : lowShare + (a - 10000) * highShare / span;
    return padTop + (1 - fb / 100) * (H - padTop);
  };
  const groundY = yOf(fieldAlt);

  const half = W / 2, padX = 24;
  const innerNm = Math.min(10, radius / 3);
  const frac = (d) => {
    d = Math.min(Math.abs(d), radius);
    return d <= innerNm ? (d / innerNm) * 0.5 : 0.5 + ((d - innerNm) / (radius - innerNm)) * 0.5;
  };
  const xOf = (f) => mode === "ew"
    ? clamp(half + Math.sign(f.dx_nm || 1) * frac(f.dx_nm) * (half - padX), 12, W - 12)
    : clamp(36 + frac(f.distance) * (W - 56), 12, W - 12);
  const airportX = mode === "ew" ? half : 36;

  const ticks = [];
  const tickAlts = ceiling === 10000 ? [2000, 4000, 6000, 8000, 10000] : [5000, 10000, 20000, 30000, 40000, 50000].filter(a => a <= ceiling);
  for (const a of tickAlts) ticks.push({ y: round1(yOf(a)), label: (a / 1000) + "k", major: a === 10000 });
  const step = radius >= 20 ? 10 : 5;
  const xticks = [];
  if (mode === "ew") {
    for (let d = -Math.floor(radius / step) * step; d <= radius; d += step) {
      const x = half + Math.sign(d) * frac(d) * (half - padX);
      xticks.push({ x: round1(x), label: d === 0 ? airportLabel : (d < 0 ? "W" : "E") + Math.abs(d) });
    }
  } else {
    xticks.push({ x: 36, label: airportLabel });
    for (let d = step; d <= radius; d += step) xticks.push({ x: round1(36 + frac(d) * (W - 56)), label: String(d) + (d + step > radius ? " NM" : "") });
  }

  const items = flights.map(f => {
    const ico = SHAPES[f.icon];
    const iw = ico[0] * f.icon_scale * CS.ICON_K, ih = ico[1] * f.icon_scale * CS.ICON_K;
    const scaleVb = Math.min(iw / ico[2], ih / ico[3]);
    const x = xOf(f);
    const y = Math.min(yOf(f.altitude), groundY - 8);
    const r = Math.max(iw, ih) / 2;
    const pitch = f.is_climbing ? 20 : f.is_descending ? -20 : 0;
    const east = mode === "ew" ? Math.sin(f.heading * Math.PI / 180) >= 0 : null;
    const rot = mode === "ew" ? (east ? 90 - pitch : 270 + pitch) : f.icon_rotation;
    const swPx = f.is_airline ? 0.5 : 1.4;
    f.xs_x = round1(x); f.xs_y = round1(y); f.xs_rot = Math.round(rot);
    f.icon_w = round1(iw); f.icon_h = round1(ih); f.icon_r = round1(r + 2);
    f.xs_ix = round1(x - iw / 2); f.xs_iy = round1(y - ih / 2);
    f.icon_sw = round2(swPx / scaleVb);
    return { f, x, y, r };
  });

  const obstacles = [];
  obstacles.push(rc(-5, groundY - 1, W + 5, H + 5));                      
  items.forEach(it => obstacles.push(rc(it.x - it.r - 2, it.y - it.r - 2, it.x + it.r + 2, it.y + it.r + 2)));

  for (const it of items) {
    const f = it.f;
    const big = f.is_airline;
    const m = big ? CS.BIG : CS.SMALL;
    const l1a = f.callsign.slice(0, 8), l1b = f.aircraftType;
    const alt = altText(f.altitude);
    const trend = f.is_climbing ? "up" : f.is_descending ? "down" : "";
    const spd = f.speed + "kt";
    const route = big && f.origin_code && f.dest_code ? `${f.origin_code}-${f.dest_code}` : "";

    const w1 = l1a.length * m.cw1 + (l1b ? 5 + l1b.length * m.cw1b : 0);
    let cur = alt.length * m.cw2;
    let trendDx = null;
    if (trend) { trendDx = cur + 3; cur += 3 + 7; }
    cur += 6;
    const spdDx = cur;
    const w2 = cur + spd.length * m.cw2;
    const w3 = route ? route.length * m.cw3 : 0;
    const w = Math.ceil(Math.max(w1, w2, w3) + m.padX * 2);
    const h = route ? m.h3 : m.h2;

    const cands = [];
    const dists = [it.r + 4, it.r + 14, it.r + 28, it.r + 46, it.r + 70, it.r + 100];
    dists.forEach((d, di) => {
      const spots = [
        [it.x - w / 2, it.y + d], [it.x - w / 2, it.y - d - h],
        [it.x + d, it.y - h / 2], [it.x - d - w, it.y - h / 2],
        [it.x + d * 0.5, it.y + d], [it.x - d * 0.5 - w, it.y + d],
        [it.x + d * 0.5, it.y - d - h], [it.x - d * 0.5 - w, it.y - d - h]
      ];
      spots.forEach(([l, t], si) => cands.push({ l, t, cost: di * 10 + si * 1.5 }));
    });

    let best = null;
    for (const c of cands) {
      const l = clamp(c.l, 2, W - w - 2);
      const t = c.t;
      if (t < 0 || t + h > groundY - 1) continue;
      const box = rc(l, t, l + w, t + h);
      let area = 0;
      for (const ob of obstacles) area += overlap(box, ob);
      const cost = c.cost + Math.abs(l - c.l) * 0.3;
      if (area === 0) { if (!best || best.area > 0 || cost < best.cost) best = { box, area, cost }; }
      else if (!best || (best.area > 0 && area < best.area)) best = { box, area, cost: 1e6 + area };
      if (best && best.area === 0 && cost > best.cost + 40) break;
    }
    if (!best) {
      const l = clamp(it.x - w / 2, 2, W - w - 2), t = clamp(it.y + it.r + 4, 0, groundY - h - 1);
      best = { box: rc(l, t, l + w, t + h) };
    }
    const b = best.box;
    obstacles.push(b);

    f.xs_tag_l = round1(b.l); f.xs_tag_t = round1(b.t); f.xs_tag_w = w; f.xs_tag_h = h;
    f.xs_tag_big = big; f.xs_tag_dash = f.is_military;
    f.xs_l1a = l1a; f.xs_l1b = l1b; f.xs_l2a = alt; f.xs_l2b = spd; f.xs_l3 = route;
    f.xs_trend = trend;
    f.xs_fs1 = m.fs1; f.xs_fs1b = m.fs1b; f.xs_fs2 = m.fs2; f.xs_fs3 = m.fs3;
    f.xs_x1 = round1(b.l + m.padX);
    f.xs_y1 = round1(b.t + m.b1);
    f.xs_x1b = round1(b.l + m.padX + l1a.length * m.cw1 + 5);
    f.xs_y2 = round1(b.t + m.b2);
    f.xs_x2b = round1(b.l + m.padX + spdDx);
    f.xs_y3 = round1(b.t + m.b3);
    if (trend) {
      const tx = b.l + m.padX + trendDx, ty = b.t + m.b2 - 8;
      f.xs_trend_pts = trend === "up"
        ? `${round1(tx)},${round1(ty + 8)} ${round1(tx + 3.5)},${round1(ty)} ${round1(tx + 7)},${round1(ty + 8)}`
        : `${round1(tx)},${round1(ty)} ${round1(tx + 3.5)},${round1(ty + 8)} ${round1(tx + 7)},${round1(ty)}`;
    } else f.xs_trend_pts = "";

    const nx = clamp(it.x, b.l, b.r), ny = clamp(it.y, b.t, b.b);
    const gap = Math.hypot(nx - it.x, ny - it.y) - it.r;
    f.xs_lead = gap > 7;
    f.xs_lx = round1(nx); f.xs_ly = round1(ny);
  }

  return {
    mode, w: W, h: H, pad_top: padTop,
    ground_y: round1(groundY), airport_x: round1(airportX),
    ceiling, low_share: lowShare, ticks, xticks,
    class_a_y: ceiling >= 20000 ? round1(yOf(18000)) : null
  };
}

function rc(l, t, r, b) { return { l, t, r, b }; }
function overlap(a, b) {
  const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
  const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
  return (w > 1 && h > 1) ? w * h : 0;
}
function round1(v) { return Math.round(v * 10) / 10; }
function round2(v) { return Math.round(v * 100) / 100; }

function placeRadarLabels(flights, scopePx) {
  const S = scopePx;
  const MARGIN = 2;
  const TAG_H = 40;

  const rect = (l, t, r, b) => ({ l, t, r, b });
  const obstacles = [];

  obstacles.push(rect(S / 2 - 14, S / 2 - 14, S / 2 + 14, S / 2 + 14));
  obstacles.push(rect(S / 2 - 12, 0, S / 2 + 12, 18));
  obstacles.push(rect(S - 34, S / 2 - 9, S + 8, S / 2 + 9));
  obstacles.push(rect(S * 0.78 - 36, S / 2 - 9, S * 0.78, S / 2 + 9));

  const ox = (800 - S) / 2, oy = 20;
  [[15, 15, 115, 41], [677, 15, 785, 41], [15, 439, 115, 465], [727, 439, 785, 465]]
    .forEach(([l, t, r, b]) => obstacles.push(rect(l - ox, t - oy, r - ox, b - oy)));

  const bounds = rect(8 - ox, 6 - oy, 800 - 8 - ox, 480 - 6 - oy);

  const pos = flights.map(f => {
    const x = (f.tcas_x / 100) * S;
    const y = (f.tcas_y / 100) * S;
    const h = f.heading * Math.PI / 180;
    const ex = x + f.vector_length * Math.sin(h);
    const ey = y - f.vector_length * Math.cos(h);
    obstacles.push(rect(x - 7, y - 7, x + 7, y + 7));
    obstacles.push(rect(Math.min(x, ex) - 2, Math.min(y, ey) - 2, Math.max(x, ex) + 2, Math.max(y, ey) + 2));
    return { x, y };
  });

  const DXS = [10, 22, 38, 58, 84, 114, 150, 190];
  const CYS = [0, -14, 14, -28, 28, -42, 42, -58, 58, -76, 76, -96, 96, -118, 118, -142, 142];
  const BELOW = [8, 22, 36, 52, 70, 90, 112];
  const candsFor = (w) => {
    const cands = [];
    for (const dx of DXS) for (const cy of CYS) cands.push({ dx, top: cy - TAG_H / 2, cost: dx + Math.abs(cy) * 0.8 });
    for (const tb of BELOW) for (const dx of [-w / 2, -w - 4, 6]) cands.push({ dx, top: tb, cost: tb + 14 + Math.abs(dx) * 0.15 });
    return cands.sort((a, b) => a.cost - b.cost);
  };

  const overlapArea = (a, b) => {
    const w = Math.min(a.r + MARGIN, b.r) - Math.max(a.l - MARGIN, b.l);
    const h = Math.min(a.b + MARGIN, b.b) - Math.max(a.t - MARGIN, b.t);
    return (w > 0 && h > 0) ? w * h : 0;
  };

  const order = flights.map((f, i) => i).sort((i, j) => {
    const a = flights[i], b = flights[j];
    if (a.is_proximate !== b.is_proximate) return a.is_proximate ? -1 : 1;
    return a.distance - b.distance;
  });

  for (const i of order) {
    const f = flights[i];
    const { x, y } = pos[i];
    const w = tagWidth(f);

    let best = null;
    for (const c of candsFor(w)) {
      const box = rect(x + c.dx, y + c.top, x + c.dx + w, y + c.top + TAG_H);
      if (box.l < bounds.l || box.r > bounds.r || box.t < bounds.t || box.b > bounds.b) continue;
      let area = 0;
      for (const o of obstacles) area += overlapArea(box, o);
      if (area === 0) { best = { c, box, area }; break; }
      if (!best || area < best.area) best = { c, box, area };
    }
    if (!best) {
      const c = { dx: 10, top: -TAG_H / 2 };
      best = { c, box: rect(x + c.dx, y + c.top, x + c.dx + w, y + c.top + TAG_H), area: 0 };
    }

    obstacles.push(best.box);
    f.label_dx = Math.round((best.c.dx / RADAR_LABEL_SCALE) * 10) / 10;
    f.label_dy = Math.round((best.c.top / RADAR_LABEL_SCALE) * 10) / 10;
  }
}

function tagWidth(f) {
  const head = f.callsign.length * 7.2 + (f.aircraftType ? 4 + f.aircraftType.length * 6 : 0);
  const stats = String(f.altitude).length * 6 + 3 + 8 + 3 + (`/${f.speed}kt`).length * 6;
  return Math.ceil(Math.max(head, stats) + 16);
}

function num(v, fallback) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

function getAirportNamesFromAPI(routeData) {
  const fallback = { origin: "---", dest: "---", originCode: "", destCode: "" };
  const routeCodes = routeData._airport_codes_iata || routeData.route;
  if (!routeCodes || typeof routeCodes !== 'string') return fallback;
  const codes = routeCodes.split('-');
  if (codes.length < 2) return fallback;
  const originCode = codes[0], destCode = codes[codes.length - 1];
  const airports = Array.isArray(routeData._airports) ? routeData._airports : [];
  const getName = (code) => {
    const match = airports.find(a => a.iata === code || a.icao === code);
    return match ? match.name : code;
  };
  return { origin: getName(originCode), dest: getName(destCode), originCode: originCode.slice(0, 4), destCode: destCode.slice(0, 4) };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; const dLat = (lat2-lat1)*Math.PI/180; const dLon = (lon2-lon1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))) * 0.539957;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function getAirlineFromCallsign(call) {
  if (!call) return "Other";
  const clean = call.trim().toUpperCase();
  const match = clean.match(/^([A-Z]{3})/);
  if (match && AIRLINE_MAP[match[1]]) return AIRLINE_MAP[match[1]];
  const iataMatch = clean.match(/^([A-Z]{2})/);
  if (iataMatch && AIRLINE_MAP[iataMatch[1]]) return AIRLINE_MAP[iataMatch[1]];
  return "Other";
}
