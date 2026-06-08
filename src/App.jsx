import { useState, useRef, useEffect, useCallback, useReducer, createContext, useContext, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Voice } from "./voice.js";
import { TG } from "./tg.js";
import { recognizeReceipt } from "./ocr.js";
import { DB } from "./storage.js";

/* ═══════════════════════════════════════════════════════════
   ТЕМЫ
═══════════════════════════════════════════════════════════ */
const DARK = {
  bg:"#080C14", surf:"#0E1320", card:"#111C2E", card2:"#172038", input:"#1A2435",
  border:"#1C2C45", borderHi:"#2A3C5A",
  gold:"#F5A623", goldBg:"#1E1505", goldGlow:"rgba(245,166,35,.2)",
  green:"#22C55E", greenBg:"#0A1F0D", red:"#EF4444", redBg:"#1F0A0A",
  cyan:"#38BDE8", cyanBg:"#081A25", violet:"#A78BFA", violetBg:"#120D1F",
  orange:"#FB923C",
  text:"#EEF2FF", sub:"#7B8FA8", muted:"#3A4A60",
};
const LIGHT = {
  bg:"#F2F4F9", surf:"#FFFFFF", card:"#FFFFFF", card2:"#F0F3F9", input:"#EEF1F7",
  border:"#E2E7F0", borderHi:"#CBD4E3",
  gold:"#D98612", goldBg:"#FDF3E3", goldGlow:"rgba(217,134,18,.15)",
  green:"#16A34A", greenBg:"#E7F7EC", red:"#DC2626", redBg:"#FCEBEB",
  cyan:"#0891B2", cyanBg:"#E5F4FA", violet:"#7C3AED", violetBg:"#F1ECFB",
  orange:"#EA7317",
  text:"#0F1A2E", sub:"#5A6B85", muted:"#9AA8BE",
};
const ThemeCtx = createContext(DARK);
const useC = () => useContext(ThemeCtx);

/* ═══════════════════════════════════════════════════════════
   ХЕЛПЕРЫ
═══════════════════════════════════════════════════════════ */
const fmt = n => "€ " + new Intl.NumberFormat("de-DE").format(Math.round(n));
const fmt2 = n => "€ " + new Intl.NumberFormat("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const today = () => new Date().toISOString().slice(0,10);
const monthKey = d => (d||today()).slice(0,7);
const dayName = ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
const monthName = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];

/* ═══════════════════════════════════════════════════════════
   КАТЕГОРИИ
═══════════════════════════════════════════════════════════ */
const CATS = [
  { k:"еда|продукт|магазин|кафе|ресторан|обед|пицца|доставк|суши|кофе|завтрак|ужин|lebensmittel|supermarkt|edeka|lidl|aldi|rewe|netto|kaufland|penny|bäcker|metzger|essen|trinken|restaurant|café|kantine|brot|milch",
    n:"Еда", e:"🛒", c:"#22C55E" },
  { k:"такси|транспорт|автобус|метро|бензин|парковк|маршрутк|uber|bolt|taxi|bus|bahn|s-bahn|u-bahn|db|tankstelle|benzin|parkhaus|parken|fahrschein|ticket|mvv|hvv|rnv",
    n:"Транспорт", e:"🚕", c:"#38BDE8" },
  { k:"кино|развлечен|игр|концерт|театр|стриминг|подписк|клуб|netflix|spotify|kino|theater|konzert|museum|freizeitpark|spielhalle|abonnement|abo",
    n:"Развлечения", e:"🎬", c:"#A78BFA" },
  { k:"квартир|аренда|жкх|коммунал|свет|газ|интернет|связь|miete|nebenkosten|strom|wasser|heizung|internet|telefon|handyvertrag|wohnung",
    n:"ЖКХ", e:"🏠", c:"#FB923C" },
  { k:"аптек|лекарств|врач|здоровь|фитнес|спортзал|стоматолог|apotheke|arzt|krankenhaus|zahnarzt|medikament|fitnessstudio|sport|gym|krankenkasse",
    n:"Здоровье", e:"💊", c:"#EF4444" },
  { k:"одежда|обувь|рубашк|брюки|куртк|kleidung|schuhe|jacke|hose|hemd|zara|h&m|primark|c&a|mode",
    n:"Одежда", e:"👗", c:"#EC4899" },
  { k:"телефон|ноутбук|техника|гаджет|электроник|handy|laptop|computer|tablet|elektronik|saturn|mediamarkt|technik",
    n:"Техника", e:"📱", c:"#06B6D4" },
  { k:"зарплата|аванс|оклад|gehalt|lohn|salary|monatslohn|überweisung gehalt",
    n:"Зарплата", e:"💼", c:"#10B981" },
  { k:"фриланс|проект|заказ|клиент|подработк|freelance|honorar|rechnung|auftrag|nebenjob",
    n:"Фриланс", e:"💻", c:"#8B5CF6" },
];
const ALL_CATS = ["Еда","Транспорт","Развлечения","ЖКХ","Здоровье","Одежда","Техника","Зарплата","Фриланс","Другое"];
const CAT_ICON = {"Еда":"🛒","Транспорт":"🚕","Развлечения":"🎬","ЖКХ":"🏠","Здоровье":"💊","Одежда":"👗","Техника":"📱","Зарплата":"💼","Фриланс":"💻","Другое":"📦"};
const CAT_COLOR = {"Еда":"#22C55E","Транспорт":"#38BDE8","Развлечения":"#A78BFA","ЖКХ":"#FB923C","Здоровье":"#EF4444","Одежда":"#EC4899","Техника":"#06B6D4","Зарплата":"#10B981","Фриланс":"#8B5CF6","Другое":"#94A3B8"};
function getCat(t){ const s=t.toLowerCase(); for(const c of CATS) if(new RegExp(c.k).test(s)) return c; return {n:"Другое",e:"📦",c:"#94A3B8"}; }
function getAmt(raw){
  if(!raw) return null;
  const t = raw.toLowerCase()
    .replace(/евро|euros?|eur|€/gi," ")
    .replace(/рублей|руб|₽/gi," ")
    .trim();

  /* ── 1. Явное указание центов: «153 евро 20 центов» ──────── */
  const mCents = t.match(/(\d[\d\s.,]*)\s*(?:целых|запятая|komma|und)?\s*(\d{1,2})\s*(?:цент|коп|cent|pf)/i);
  if(mCents){
    const main=parseFloat(mCents[1].replace(/\s/g,"").replace(",","."));
    const cents=parseInt(mCents[2]);
    if(!isNaN(main)&&!isNaN(cents)) return Math.round((main+cents/100)*100)/100;
  }

  /* ── 2. Словесные числа RU + DE ─────────────────────────── */
  const W={
    "ноль":0,"нуль":0,"один":1,"одна":1,"два":2,"две":2,"три":3,"четыре":4,"пять":5,
    "шесть":6,"семь":7,"восемь":8,"девять":9,"десять":10,"одиннадцать":11,
    "двенадцать":12,"тринадцать":13,"четырнадцать":14,"пятнадцать":15,
    "шестнадцать":16,"семнадцать":17,"восемнадцать":18,"девятнадцать":19,
    "двадцать":20,"тридцать":30,"сорок":40,"пятьдесят":50,
    "шестьдесят":60,"семьдесят":70,"восемьдесят":80,"девяносто":90,
    "сто":100,"двести":200,"триста":300,"четыреста":400,
    "пятьсот":500,"шестьсот":600,"семьсот":700,"восемьсот":800,"девятьсот":900,
    "тысяча":1000,"тысячи":1000,"тысяч":1000,
    "null":0,"ein":1,"eine":1,"zwei":2,"drei":3,"vier":4,"fünf":5,
    "sechs":6,"sieben":7,"acht":8,"neun":9,"zehn":10,"elf":11,"zwölf":12,
    "dreizehn":13,"vierzehn":14,"fünfzehn":15,"sechzehn":16,"siebzehn":17,
    "achtzehn":18,"neunzehn":19,"zwanzig":20,"dreißig":30,"vierzig":40,
    "fünfzig":50,"sechzig":60,"siebzig":70,"achtzig":80,"neunzig":90,
    "hundert":100,"zweihundert":200,"dreihundert":300,"vierhundert":400,
    "fünfhundert":500,"sechshundert":600,"siebenhundert":700,
    "neunhundert":900,"tausend":1000,"zweitausend":2000,"dreitausend":3000,
  };
  let wT=0,wC=0,wF=false;
  for(const p of t.split(/[\s,]+/)){
    if(W[p]!==undefined){
      wF=true; const v=W[p];
      if(v===1000){wT+=(wC||1)*1000;wC=0;}
      else if(v>=100){wC+=v;} else{wC+=v;}
    }
  }
  if(wF&&(wT+wC)>0) return wT+wC;

  /* ── 3. Цифры — правильный порядок важен ────────────────── */
  const cl = t.replace(/[^\d.,\s]/g," ").replace(/\s+/g," ").trim();

  // A. Евро формат с центами: 1.234,56 или 1.700,50
  let m = cl.match(/(\d{1,3}(?:\.\d{3})+),(\d{2})/);
  if(m) return parseFloat(m[1].replace(/\./g,"")+"."+m[2]);

  // B. Запятая = десятичный: 153,20 ← ГЛАВНЫЙ СЛУЧАЙ
  m = cl.match(/\b(\d+),(\d{1,2})\b/);
  if(m){ const n=parseFloat(m[1]+"."+m[2]); if(n>0) return n; }

  // C. Точка = десятичный (1-2 знака): 153.20 но НЕ 1.700
  m = cl.match(/\b(\d+)\.(\d{1,2})\b/);
  if(m&&m[2].length<=2&&!/^\d{3}$/.test(m[2])){
    const n=parseFloat(m[1]+"."+m[2]); if(n>0) return n;
  }

  // D. Точка = тысячи: 1.700 → 1700
  m = cl.match(/\b(\d{1,3})\.(\d{3})\b/);
  if(m) return parseFloat(m[1]+m[2]);

  // E. Два числа: «153 20» → 153.20 (второе ≤ 99)
  m = cl.match(/\b(\d{2,}) +(\d{1,2})\b/);
  if(m){ const a=parseInt(m[1]),b=parseInt(m[2]); if(b<=99&&a>b) return parseFloat(a+"."+String(b).padStart(2,"0")); }

  // F. Просто число
  m = cl.match(/\b(\d+)\b/);
  if(m){ let n=parseFloat(m[1]); if(/тысяч|тыс\b/i.test(raw)&&n<1000)n*=1000; if(n>0)return n; }

  return null;
}

/* ─── Вычищаем число и ключевые слова из описания ─────────── */
function cleanDesc(raw, extraWords = []){
  return raw
    .replace(/\d{1,3}(?:[.\s]\d{3})*(?:[,.]\d{1,2})?|\d+(?:[,.]\d{1,2})?/g, "")
    .replace(/евро|euros?|eur|€|рублей|руб|₽/gi, "")
    .replace(/тысяч\w*|тысяч|тыс\b/gi, "")
    .replace(new RegExp(extraWords.join("|"), "gi"), "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* ═══════════════════════════════════════════════════════════
   NLP ДВИЖОК
═══════════════════════════════════════════════════════════ */
function nlp(raw){
  const t=raw.toLowerCase();
  const EXP=/потратил[а]?|купил[а]?|заплатил[а]?|оплатил[а]?|списал[и]?|расход\b|трата\b|снял[а]?\b|израсход|ausgegeben|gekauft|bezahlt|ausgabe|kosten\b|ich habe.*gekauft|ich habe.*bezahlt/;
  const INC=/получил[а]?|заработал[а]?|зарплата\b|пришло\b|поступил|перевод\b|фриланс\b|доход\b|начислил|выплатил|erhalten|bekommen|verdient|einnahme|gehalt\b|lohn\b/;

  // ── СНАЧАЛА проверяем транзакции с суммой ──────────────────
  // Если есть глагол И число — это точно транзакция, не запрос
  if(EXP.test(t)){
    const amt=getAmt(raw); const cat=getCat(t);
    const EXP_WORDS=["потратил[а]?","купил[а]?","заплатил[а]?","оплатил[а]?","расход","трата","снял[а]?","на\\b","за\\b","в\\b","из\\b"];
    const desc=cleanDesc(raw,EXP_WORDS)||cat.n;
    // Если нет суммы — возможно это запрос («сколько потратил»)
    if(amt) return {i:"EXP",amt,cat,desc:desc.slice(0,35)};
  }
  if(INC.test(t)){
    const amt=getAmt(raw); const cat=getCat(t);
    const INC_WORDS=["получил[а]?","заработал[а]?","зарплата","пришло","поступил","перевод","фриланс","начислил","от\\b","за\\b"];
    const desc=cleanDesc(raw,INC_WORDS)||cat.n;
    // Если нет суммы — возможно это запрос («сколько получил»)
    if(amt) return {i:"INC",amt,cat,desc:desc.slice(0,35)};
  }

  // Без глагола: «зарплата 1800», «Gehalt 2500», «аванс 500»
  const incCatRe=/зарплата|аванс|оклад|gehalt|lohn|salary|фриланс|freelance|honorar/i;
  if(incCatRe.test(t)){
    const amt=getAmt(raw); const cat=getCat(t);
    if(amt) return {i:"INC",amt,cat,desc:cat.n};
  }

  // Без глагола: «такси 18», «Lidl 45,20», «кафе 12,50»
  const expCatRe=getCat(t);
  if(expCatRe.n!=="Другое"){
    const amt=getAmt(raw);
    if(amt) return {i:"EXP",amt,cat:expCatRe,desc:cleanDesc(raw)||expCatRe.n};
  }

  // ── ПОТОМ проверяем информационные запросы ─────────────────
  if(/удали.*(последн|запис)|отмени.*(последн|запис)|убери последн/.test(t)) return {i:"DEL_LAST"};
  if(/(исправь|перепиши|измени|поправь).*(последн|запис)/.test(t)) return {i:"FIX_LAST",raw};
  if(/баланс|остаток|сколько.*(у меня|денег|осталось)|итого/.test(t)) return {i:"BAL"};
  if(/(потратил|расход).*(всего|сегодня|неделю|месяц)|сколько.*(потратил|трат)/.test(t)) return {i:"EXP_TOTAL"};
  if(/(доход|заработал|получил).*(итого|всего)|сколько.*(заработ|получил)/.test(t)) return {i:"INC_TOTAL"};
  const cq=/(сколько).*(потратил)?\s*на\s+(\w+)/.exec(t); if(cq) return {i:"BY_CAT",cat:getCat(cq[3])};
  if(/бюджет|лимит/.test(t)) return {i:"BUDGET"};
  if(/цел|копил|накоп/.test(t)) return {i:"GOALS"};
  if(/истори|список|транзакц|операц/.test(t)) return {i:"HIST"};
  if(/совет|экономи|сократи|как.*сэконом/.test(t)) return {i:"ADV"};
  if(/прогноз|хватит|до конца месяца/.test(t)) return {i:"FORECAST"};
  if(/привет|здравств|помог|умеешь|команды/.test(t)) return {i:"HELP"};

  // Ответ на переспрос
  if(/^(получил[а]?|доход|income|einnahme)[\s!.]*$/i.test(t.trim())) return {i:"CONFIRM_INC"};
  if(/^(потратил[а]?|расход|ausgabe|expense)[\s!.]*$/i.test(t.trim()))  return {i:"CONFIRM_EXP"};

  // Глагол без суммы — спрашиваем
  if(EXP.test(t)) return {i:"?",hint:"EXP"};
  if(INC.test(t)) return {i:"?",hint:"INC"};

  // Есть число но нет контекста
  const amt=getAmt(raw);
  if(amt) return {i:"CLARIFY",amt,raw};

  return {i:"?",raw};
}
function run(intent,txs,budgets,goals){
  const inc=txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amt,0);
  const exp=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amt,0);
  const mExp=txs.filter(t=>t.type==="expense"&&monthKey(t.date)===monthKey()).reduce((s,t)=>s+t.amt,0);
  switch(intent.i){
    case"CONFIRM_INC":
      if(!intent.pendingAmt) return {text:"Укажите сумму. Например: «Получил зарплату 1800»"};
      return {text:`✅ Доход: **+${fmt2(intent.pendingAmt)}** ${intent.pendingCat?.e||"💼"} ${intent.pendingDesc||"Доход"}`,
        addTx:{type:"income",amt:intent.pendingAmt,cat:intent.pendingCat?.n||"Другое",icon:intent.pendingCat?.e||"💼",desc:intent.pendingDesc||"Доход",src:"text"}};
    case"CONFIRM_EXP":
      if(!intent.pendingAmt) return {text:"Укажите сумму. Например: «Потратил 45 на еду»"};
      return {text:`✅ Записал: **−${fmt2(intent.pendingAmt)}** ${intent.pendingCat?.e||"📦"} ${intent.pendingDesc||"Расход"}`,
        addTx:{type:"expense",amt:intent.pendingAmt,cat:intent.pendingCat?.n||"Другое",icon:intent.pendingCat?.e||"📦",desc:intent.pendingDesc||"Расход",src:"text"}};
    case"EXP": return intent.amt
      ?{text:`✅ Записал: **−${fmt2(intent.amt)}** ${intent.cat.e} ${intent.desc}`,addTx:{type:"expense",amt:intent.amt,cat:intent.cat.n,icon:intent.cat.e,desc:intent.desc,src:"text"}}
      :{text:"Не расслышал сумму 🤔\nПример: «Потратил 45,50 на еду»"};
    case"INC": return intent.amt
      ?{text:`✅ Доход: **+${fmt2(intent.amt)}** ${intent.cat.e} ${intent.desc}`,addTx:{type:"income",amt:intent.amt,cat:intent.cat.n,icon:intent.cat.e,desc:intent.desc,src:"text"}}
      :{text:"Не расслышал сумму 🤔\nПример: «Получил зарплату 1750»"};
    case"?":
      if(intent.hint==="INC") return {text:"Не расслышал сумму 🤔\nСкажите: «Получил зарплату 1750»"};
      if(intent.hint==="EXP") return {text:"Не расслышал сумму 🤔\nСкажите: «Потратил 45 на еду»"};
      return {text:`Не понял 🤔 Попробуйте:\n«Получил зарплату 1750»\n«Потратил 20 на кофе»\n«Какой баланс?»`};
    case"DEL_LAST":{
      if(!txs.length) return {text:"Записей пока нет."};
      const last=txs[0];
      return {text:`🗑 Удалил последнюю запись: ${last.icon} ${last.desc} — ${last.type==="income"?"+":"−"}${fmt2(last.amt)}`,delLast:last.id};
    }
    case"FIX_LAST":{
      if(!txs.length) return {text:"Записей пока нет."};
      // парсим новую версию из фразы (убираем слова команды)
      const cleaned=intent.raw.replace(/(исправь|перепиши|измени|поправь).*(последн\w*|запис\w*)/i,"").trim();
      const sub=nlp(cleaned.startsWith("я ")||/потрат|получ|купил|заплат/i.test(cleaned)?cleaned:"потратил "+cleaned);
      if((sub.i==="EXP"||sub.i==="INC")&&sub.amt){
        return {text:`✏️ Исправил последнюю запись на: ${sub.cat.e} ${sub.desc} — ${sub.i==="INC"?"+":"−"}${fmt2(sub.amt)}`,
          fixLast:{id:txs[0].id,patch:{type:sub.i==="INC"?"income":"expense",amt:sub.amt,cat:sub.cat.n,icon:sub.cat.e,desc:sub.desc}}};
      }
      return {text:"Не понял новую версию 🤔\nСкажите целиком, например:\n«Исправь последнюю: потратил 25 в магазине Пени»\n\nИли откройте Историю и нажмите «изменить» на записи."};
    }
    case"BAL": return {text:`💰 Баланс: **${fmt(inc-exp)}**\n↑ Доходы: ${fmt(inc)}\n↓ Расходы: ${fmt(exp)}`};
    case"EXP_TOTAL":{
      const top=Object.entries(txs.filter(t=>t.type==="expense").reduce((a,t)=>({...a,[t.cat]:(a[t.cat]||0)+t.amt}),{})).sort((a,b)=>b[1]-a[1])[0];
      return{text:`📉 Расходы: **${fmt(exp)}**${top?`\nТоп: ${top[0]} — ${fmt(top[1])}`:""}`};
    }
    case"INC_TOTAL": return{text:`📈 Доходы: **${fmt(inc)}**`};
    case"BY_CAT":{
      const s=txs.filter(t=>t.type==="expense"&&t.cat===intent.cat.n).reduce((a,t)=>a+t.amt,0);
      const b=budgets[intent.cat.n];
      return{text:s?`${intent.cat.e} «${intent.cat.n}»: **${fmt(s)}**${b?`\nЛимит: ${fmt(b)} (${Math.round(s/b*100)}%)`:""}`:`По «${intent.cat.n}» записей нет.`};
    }
    case"BUDGET":{
      const lines=Object.entries(budgets).map(([c,lim])=>{
        const sp=txs.filter(t=>t.type==="expense"&&t.cat===c&&monthKey(t.date)===monthKey()).reduce((a,t)=>a+t.amt,0);
        return `${CAT_ICON[c]} ${c}: ${fmt(sp)} / ${fmt(lim)}`;
      });
      return{text:lines.length?`💰 Бюджеты (этот месяц):\n${lines.join("\n")}`:`Бюджеты не настроены. Откройте вкладку «Бюджет».`};
    }
    case"GOALS":{
      const lines=goals.map(g=>`${g.icon} ${g.name}: ${fmt(g.current)} / ${fmt(g.target)} (${Math.round(g.current/g.target*100)}%)`);
      return{text:lines.length?`🎯 Копилки:\n${lines.join("\n")}`:`Целей нет. Создайте на вкладке «Цели».`};
    }
    case"FORECAST":{
      const day=new Date().getDate(), daysInMonth=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
      const avg=mExp/day, forecast=avg*daysInMonth;
      return{text:`🔮 Прогноз на месяц\nУже потрачено: ${fmt(mExp)}\nСредний день: ${fmt(avg)}\nПрогноз итога: **${fmt(forecast)}**`};
    }
    case"HIST": return{text:"📋 Последние:\n"+txs.slice(0,5).map(t=>`${t.icon} ${t.desc} — ${t.type==="income"?"+":"−"}${fmt(t.amt)}`).join("\n")};
    case"ADV":{
      const top=Object.entries(txs.filter(t=>t.type==="expense").reduce((a,t)=>({...a,[t.cat]:(a[t.cat]||0)+t.amt}),{})).sort((a,b)=>b[1]-a[1])[0];
      return{text:`💡 **Совет**\nГлавная статья: ${top?top[0]:"нет данных"}\n\nПравило 50/30/20:\n• 50% — нужды\n• 30% — желания\n• 20% — накопления\n\nСоздайте лимит на эту категорию во вкладке «Бюджет».`};
    }
    case"HELP": return{text:`👋 Что я умею:\n\n🎤 Голос: «Потратил 45 на еду»\n⌨️ Текст любой командой\n📷 Фото чека — распознаю сумму\n📊 CSV выписка — импортирую\n\n✏️ Исправить ошибку:\n«Удали последнюю»\n«Исправь последнюю: потратил 25 в Пени»\nили в Истории кнопка «изменить»\n\n❓ Спросите:\n«Какой баланс?»\n«Прогноз на месяц»\n«Совет по экономии»`};
    case"CLARIFY": return {text:`Вижу сумму **${fmt2(intent.amt)}** 🤔\n\nЭто расход или доход?\nНапишите одно слово:\n• «получил» → запишу как доход\n• «потратил» → запишу как расход`};
    default: return{text:`Не понял 🤔 Попробуйте:\n«Получил зарплату 1750»\n«Потратил 45,50 на еду»\n«Какой баланс?»`};
  }
}

/* ═══════════════════════════════════════════════════════════
   OCR (мок) + CSV + изображения
═══════════════════════════════════════════════════════════ */
function mockOCR(name){
  const p=[
    {desc:"Supermarkt",cat:"Еда",icon:"🛒",amt:47.30},{desc:"Lidl",cat:"Еда",icon:"🛒",amt:23.85},
    {desc:"Apotheke",cat:"Здоровье",icon:"💊",amt:14.20},{desc:"Café",cat:"Еда",icon:"☕",amt:8.50},
    {desc:"Taxi",cat:"Транспорт",icon:"🚕",amt:18.00},{desc:"Tankstelle",cat:"Транспорт",icon:"🚕",amt:62.40},
  ];
  const n=name.toLowerCase();
  if(/lidl|aldi|rewe|edeka/.test(n)) return p[1];
  if(/apo|pharm/.test(n)) return p[2];
  return p[Math.floor(Math.random()*p.length)];
}
function resizeImage(file,max=360){
  return new Promise(res=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{const r=Math.min(max/img.width,max/img.height,1);const c=document.createElement("canvas");
      c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL("image/jpeg",.75));};
    img.onerror=()=>res(null); img.src=url;
  });
}
function parseCSV(text){
  const rows=text.split(/\r?\n/).filter(Boolean), res=[];
  for(const row of rows.slice(1)){
    const cols=row.split(/[;,\t]/).map(s=>s.replace(/"/g,"").trim());
    const raw=cols.find(c=>/^-?\d[\d\s.,]*$/.test(c)&&c.length>0);
    if(!raw) continue;
    const n=parseFloat(raw.replace(/\s/g,"").replace(",","."));
    if(!isFinite(n)||n===0) continue;
    const desc=(cols.find(c=>c.length>2&&!/^[-\d.,\s]+$/.test(c))||"Операция").slice(0,40);
    const cat=getCat(desc);
    res.push({type:n>0?"income":"expense",amt:Math.abs(n),cat:cat.n,icon:cat.e,desc,src:"csv"});
  }
  return res;
}

/* ═══════════════════════════════════════════════════════════
   ХРАНИЛИЩЕ (window.storage + localStorage fallback)
═══════════════════════════════════════════════════════════ */
const SEED_TX=[];  // новые пользователи начинают с пустой базы
const SEED_BUDGETS={"Еда":400,"Транспорт":150,"Развлечения":120,"ЖКХ":900,"Здоровье":80};
const SEED_GOALS=[];
const SEED_SETTINGS={name:"",currency:"EUR",theme:"dark",pin:"",onboarded:false,notify:true};

/* Синхронное сохранение через DB (async в фоне) */
function reducer(state,a){
  let s={...state};
  switch(a.type){
    case"ADD_TX":    s.txs=[{...a.tx,id:Date.now(),date:a.tx.date||today()},...state.txs]; DB.saveTxs(s.txs); break;
    case"ADD_MANY":  s.txs=[...a.txs.map((t,i)=>({...t,id:Date.now()+i,date:t.date||today()})),...state.txs]; DB.saveTxs(s.txs); break;
    case"DEL_TX":    s.txs=state.txs.filter(t=>t.id!==a.id); DB.saveTxs(s.txs); break;
    case"EDIT_TX":   s.txs=state.txs.map(t=>t.id===a.id?{...t,...a.patch}:t); DB.saveTxs(s.txs); break;
    case"SET_BUDGET":s.budgets={...state.budgets,[a.cat]:a.limit}; if(!a.limit)delete s.budgets[a.cat]; DB.saveBudgets(s.budgets); break;
    case"ADD_GOAL":  s.goals=[...state.goals,{...a.goal,id:Date.now(),current:0}]; DB.saveGoals(s.goals); break;
    case"FUND_GOAL": s.goals=state.goals.map(g=>g.id===a.id?{...g,current:Math.min(g.target,g.current+a.amt)}:g); DB.saveGoals(s.goals); break;
    case"DEL_GOAL":  s.goals=state.goals.filter(g=>g.id!==a.id); DB.saveGoals(s.goals); break;
    case"SET_SETTINGS": s.settings={...state.settings,...a.patch}; DB.saveSettings(s.settings); break;
    case"LOAD_ALL":  return {...state,...a.data}; // загрузка из облака
    default: return state;
  }
  return s;
}

/* Начальное состояние — синхронно из localStorage (быстро),
   потом асинхронно обновляется из Telegram Cloud             */
function initState(){
  try{
    const ls=k=>{ try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;} };
    return {
      txs:      ls("fin_v2_tx")       || SEED_TX,
      budgets:  ls("fin_v2_budgets")  || SEED_BUDGETS,
      goals:    ls("fin_v2_goals")    || SEED_GOALS,
      settings: ls("fin_v2_settings") || SEED_SETTINGS,
    };
  }catch{ return {txs:SEED_TX,budgets:SEED_BUDGETS,goals:SEED_GOALS,settings:SEED_SETTINGS}; }
}

/* ═══════════════════════════════════════════════════════════
   ГОЛОС
═══════════════════════════════════════════════════════════ */
function useVoice(onDone){
  const [on,setOn]=useState(false);
  const [live,setLive]=useState("");
  const [err,setErr]=useState("");
  const [supported,setSupported]=useState(true);

  useEffect(()=>{ Voice.available().then(setSupported); },[]);

  const toggle=useCallback(async()=>{
    // СТОП — кнопка нажата повторно
    if(on){
      setOn(false);
      setLive("");
      await Voice.stop((text)=>{ if(text) onDone(text); });
      return;
    }
    // СТАРТ
    setErr("");
    setLive("");
    setOn(true); // сразу показываем что слушаем

    const started = await Voice.start(
      (partial) => setLive(partial),
      (final)   => { setOn(false); setLive(""); if(final) onDone(final); },
      (errMsg)  => { setOn(false); setLive(""); setErr(errMsg); }
    );

    // если старт не удался — сбрасываем кнопку
    if(!started) setOn(false);

  },[on,onDone]);

  return{on,live,err,setErr,toggle,supported};
}

/* ═══════════════════════════════════════════════════════════
   UI-АТОМЫ
═══════════════════════════════════════════════════════════ */
function Card({children,style,onClick}){
  const C=useC();
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,...style}}>{children}</div>;
}
function SectionTitle({children}){
  const C=useC();
  return <div style={{color:C.sub,fontSize:11,letterSpacing:2,textTransform:"uppercase",fontWeight:600,marginBottom:10}}>{children}</div>;
}
const SRC={voice:"🎤",image:"📷",csv:"📊",text:"⌨️",manual:"✏️"};
function TxRow({tx,onDel,onEdit}){
  const C=useC(); const isInc=tx.type==="income";
  const [edit,setEdit]=useState(false);
  const [amt,setAmt]=useState(tx.amt);
  const [desc,setDesc]=useState(tx.desc);
  const [cat,setCat]=useState(tx.cat);
  const [type,setType]=useState(tx.type);
  const save=()=>{
    const n=parseFloat(amt);
    if(!n||!desc.trim()) return;
    onEdit(tx.id,{amt:n,desc:desc.trim(),cat,type,icon:CAT_ICON[cat]||tx.icon});
    setEdit(false);
  };
  if(edit){
    return(
      <div style={{background:C.card,border:`1px solid ${C.gold}55`,borderRadius:13,marginBottom:7,padding:13}}>
        <div style={{color:C.gold,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:10}}>✏️ РЕДАКТИРОВАНИЕ</div>
        <div style={{display:"flex",background:C.card2,borderRadius:9,padding:3,marginBottom:10}}>
          {[["expense","Расход",C.red],["income","Доход",C.green]].map(([v,l,col])=>(
            <button key={v} onClick={()=>setType(v)} style={{flex:1,padding:"7px",borderRadius:7,border:"none",background:type===v?col+"22":"transparent",color:type===v?col:C.muted,fontWeight:700,fontSize:12,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Описание" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
        <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="Сумма" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:9,padding:"9px 12px",color:C.text,fontSize:13,outline:"none",marginBottom:8,boxSizing:"border-box"}}/>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
          {ALL_CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:"6px 11px",borderRadius:16,border:`1px solid ${cat===c?C.gold:C.border}`,background:cat===c?C.goldBg:C.card2,color:cat===c?C.gold:C.sub,fontSize:11,cursor:"pointer"}}>{CAT_ICON[c]} {c}</button>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={save} style={{flex:1,padding:"10px",borderRadius:10,background:C.green,border:"none",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>✓ Сохранить</button>
          <button onClick={()=>setEdit(false)} style={{padding:"10px 16px",borderRadius:10,background:C.card2,border:`1px solid ${C.border}`,color:C.sub,fontSize:13,cursor:"pointer"}}>Отмена</button>
        </div>
      </div>
    );
  }
  return(
    <div style={{display:"flex",alignItems:"center",gap:11,padding:"11px 13px",background:C.card,border:`1px solid ${C.border}`,borderRadius:13,marginBottom:7}}>
      <div style={{width:40,height:40,borderRadius:11,background:(CAT_COLOR[tx.cat]||"#888")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>{tx.icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{color:C.text,fontSize:14,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.desc}</div>
        <div style={{color:C.sub,fontSize:11,marginTop:2}}>{SRC[tx.src]||"✏️"} {tx.cat} · {tx.date?.slice(5)}</div>
      </div>
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{color:isInc?C.green:C.red,fontWeight:700,fontSize:14}}>{isInc?"+":"−"}{fmt2(tx.amt)}</div>
        {(onEdit||onDel)&&(
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:2}}>
            {onEdit&&<button onClick={()=>setEdit(true)} style={{background:"none",border:"none",color:C.cyan,fontSize:11,cursor:"pointer",padding:0}}>изменить</button>}
            {onDel&&<button onClick={()=>onDel(tx.id)} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",padding:0}}>удалить</button>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ОНБОРДИНГ
═══════════════════════════════════════════════════════════ */
function Onboarding({onDone}){
  const C=useC();
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [budget,setBudget]=useState("1500");
  const steps=[
    {icon:"👋",title:"Добро пожаловать",text:"FinanceAI — ваш личный финансовый помощник. Голос, фото чеков, аналитика — всё офлайн на вашем устройстве."},
    {icon:"✏️",title:"Как вас зовут?",input:true},
    {icon:"🎯",title:"Месячный бюджет",text:"Сколько вы планируете тратить в месяц? Это можно изменить позже.",budget:true},
    {icon:"🎤",title:"Голосовой ввод",text:"Просто скажите «Потратил 20 на кофе» — бот запишет автоматически. Поддерживаются фото чеков и импорт выписок."},
  ];
  const s=steps[step];
  const next=()=>{ if(step<steps.length-1) setStep(step+1); else onDone({name:name||"Друг",monthBudget:parseFloat(budget)||1500}); };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",padding:"40px 24px",maxWidth:480,margin:"0 auto"}}>
      {/* прогресс */}
      <div style={{display:"flex",gap:6,marginBottom:50}}>
        {steps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=step?C.gold:C.card2,transition:".3s"}}/>)}
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",textAlign:"center"}}>
        <div style={{fontSize:64,marginBottom:24}}>{s.icon}</div>
        <div style={{color:C.text,fontSize:26,fontWeight:800,marginBottom:14}}>{s.title}</div>
        {s.text&&<div style={{color:C.sub,fontSize:15,lineHeight:1.6,marginBottom:24}}>{s.text}</div>}
        {s.input&&(
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ваше имя" autoFocus
            style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:14,padding:"15px 18px",color:C.text,fontSize:17,outline:"none",textAlign:"center",marginTop:10}}/>
        )}
        {s.budget&&(
          <div style={{position:"relative",marginTop:10}}>
            <input value={budget} onChange={e=>setBudget(e.target.value)} type="number" placeholder="1500"
              style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:14,padding:"15px 18px",color:C.text,fontSize:22,fontWeight:700,outline:"none",textAlign:"center",boxSizing:"border-box"}}/>
            <span style={{position:"absolute",right:20,top:"50%",transform:"translateY(-50%)",color:C.sub,fontSize:18}}>€/мес</span>
          </div>
        )}
      </div>
      <button onClick={next} style={{padding:"16px",borderRadius:16,background:`linear-gradient(135deg,${C.gold},${C.cyan})`,border:"none",color:"#0A0D14",fontWeight:800,fontSize:16,cursor:"pointer",marginTop:30}}>
        {step<steps.length-1?"Далее →":"Начать пользоваться"}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PIN / БЛОКИРОВКА
═══════════════════════════════════════════════════════════ */
function LockScreen({pin,onUnlock,onBiometric}){
  const C=useC();
  const [entered,setEntered]=useState("");
  const [shake,setShake]=useState(false);
  const press=d=>{
    if(entered.length>=pin.length) return;
    const ne=entered+d; setEntered(ne);
    if(ne.length===pin.length){
      if(ne===pin) setTimeout(onUnlock,150);
      else { setShake(true); setTimeout(()=>{setShake(false);setEntered("");},500); }
    }
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,maxWidth:480,margin:"0 auto"}}>
      <div style={{fontSize:48,marginBottom:16}}>🔒</div>
      <div style={{color:C.text,fontSize:20,fontWeight:700,marginBottom:6}}>Введите PIN-код</div>
      <div style={{color:C.sub,fontSize:13,marginBottom:30}}>Для доступа к финансам</div>
      {/* точки */}
      <div style={{display:"flex",gap:14,marginBottom:36,animation:shake?"shake .4s":"none"}}>
        {Array.from({length:pin.length}).map((_,i)=>(
          <div key={i} style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${C.gold}`,background:i<entered.length?C.gold:"transparent",transition:".15s"}}/>
        ))}
      </div>
      {/* клавиатура */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,maxWidth:260,width:"100%"}}>
        {[1,2,3,4,5,6,7,8,9].map(n=>(
          <button key={n} onClick={()=>press(""+n)} style={{aspectRatio:"1",borderRadius:"50%",border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:24,fontWeight:600,cursor:"pointer"}}>{n}</button>
        ))}
        <button onClick={onBiometric} style={{aspectRatio:"1",borderRadius:"50%",border:"none",background:"transparent",color:C.cyan,fontSize:26,cursor:"pointer"}}>☺</button>
        <button onClick={()=>press("0")} style={{aspectRatio:"1",borderRadius:"50%",border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:24,fontWeight:600,cursor:"pointer"}}>0</button>
        <button onClick={()=>setEntered(entered.slice(0,-1))} style={{aspectRatio:"1",borderRadius:"50%",border:"none",background:"transparent",color:C.sub,fontSize:22,cursor:"pointer"}}>⌫</button>
      </div>
      <button onClick={onBiometric} style={{marginTop:30,background:"none",border:"none",color:C.cyan,fontSize:14,cursor:"pointer"}}>☺ Войти по биометрии</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ДАШБОРД
═══════════════════════════════════════════════════════════ */
function Dashboard({state,goto}){
  const C=useC(); const {txs,budgets,settings}=state;
  const inc=txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amt,0);
  const exp=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amt,0);
  const mExp=txs.filter(t=>t.type==="expense"&&monthKey(t.date)===monthKey()).reduce((s,t)=>s+t.amt,0);
  // график 7 дней
  const week=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i); const ds=d.toISOString().slice(0,10);
    week.push({d:dayName[d.getDay()],
      e:txs.filter(t=>t.type==="expense"&&t.date===ds).reduce((s,t)=>s+t.amt,0),
      i:txs.filter(t=>t.type==="income"&&t.date===ds).reduce((s,t)=>s+t.amt,0)});
  }
  const budgetTop=Object.entries(budgets).map(([cat,lim])=>{
    const sp=txs.filter(t=>t.type==="expense"&&t.cat===cat&&monthKey(t.date)===monthKey()).reduce((s,t)=>s+t.amt,0);
    return {cat,lim,sp,pct:Math.min(100,sp/lim*100)};
  }).sort((a,b)=>b.pct-a.pct).slice(0,3);

  return(
    <div style={{padding:"0 16px 90px"}}>
      <div style={{padding:"14px 0 12px"}}>
        <div style={{color:C.sub,fontSize:13}}>Привет, {settings.name||"Друг"} 👋</div>
        <div style={{color:C.text,fontSize:22,fontWeight:800,marginTop:2}}>{monthName[new Date().getMonth()]} {new Date().getFullYear()}</div>
      </div>
      {/* Баланс */}
      <div style={{background:`linear-gradient(135deg,${C.gold}22,${C.cyan}15)`,border:`1px solid ${C.gold}33`,borderRadius:20,padding:"20px 22px",marginBottom:14,position:"relative",overflow:"hidden"}}>
        <div style={{color:C.sub,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Общий баланс</div>
        <div style={{color:C.text,fontSize:34,fontWeight:800,letterSpacing:-1,marginTop:4}}>{fmt(inc-exp)}</div>
        <div style={{display:"flex",gap:20,marginTop:14}}>
          <div><div style={{color:C.sub,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Доходы</div><div style={{color:C.green,fontSize:16,fontWeight:700,marginTop:2}}>↑ {fmt(inc)}</div></div>
          <div style={{width:1,background:C.border}}/>
          <div><div style={{color:C.sub,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Расходы</div><div style={{color:C.red,fontSize:16,fontWeight:700,marginTop:2}}>↓ {fmt(exp)}</div></div>
        </div>
      </div>
      {/* График недели */}
      <Card style={{marginBottom:14,padding:"14px 6px 8px"}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"0 10px",marginBottom:8}}>
          <SectionTitle>Последние 7 дней</SectionTitle>
          <span onClick={()=>goto("analytics")} style={{color:C.gold,fontSize:11,cursor:"pointer"}}>Подробнее →</span>
        </div>
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={week} margin={{top:0,right:8,bottom:0,left:-22}}>
            <defs>
              <linearGradient id="di" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={.4}/><stop offset="100%" stopColor={C.green} stopOpacity={0}/></linearGradient>
              <linearGradient id="de" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.red} stopOpacity={.35}/><stop offset="100%" stopColor={C.red} stopOpacity={0}/></linearGradient>
            </defs>
            <XAxis dataKey="d" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11,color:C.text}} formatter={v=>fmt(v)}/>
            <Area type="monotone" dataKey="i" stroke={C.green} strokeWidth={2} fill="url(#di)"/>
            <Area type="monotone" dataKey="e" stroke={C.red} strokeWidth={2} fill="url(#de)"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      {/* Бюджеты топ-3 */}
      {budgetTop.length>0&&(
        <Card style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <SectionTitle>Бюджет месяца</SectionTitle>
            <span onClick={()=>goto("budget")} style={{color:C.gold,fontSize:11,cursor:"pointer"}}>Все →</span>
          </div>
          {budgetTop.map(b=>(
            <div key={b.cat} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{color:C.text,fontSize:13}}>{CAT_ICON[b.cat]} {b.cat}</span>
                <span style={{color:b.pct>=100?C.red:b.pct>=80?C.orange:C.sub,fontSize:12,fontWeight:600}}>{fmt(b.sp)} / {fmt(b.lim)}</span>
              </div>
              <div style={{background:C.card2,borderRadius:4,height:6,overflow:"hidden"}}>
                <div style={{width:`${b.pct}%`,height:"100%",background:b.pct>=100?C.red:b.pct>=80?C.orange:C.green,borderRadius:4,transition:"width .3s"}}/>
              </div>
            </div>
          ))}
        </Card>
      )}
      {/* Быстрые действия */}
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <button onClick={()=>goto("chat")} style={{flex:1,padding:"14px",borderRadius:14,background:C.card,border:`1px solid ${C.border}`,color:C.text,fontSize:13,fontWeight:600,cursor:"pointer"}}>🎤 Сказать</button>
        <button onClick={()=>goto("add")} style={{flex:1,padding:"14px",borderRadius:14,background:C.card,border:`1px solid ${C.border}`,color:C.text,fontSize:13,fontWeight:600,cursor:"pointer"}}>✏️ Добавить</button>
        <button onClick={()=>goto("analytics")} style={{flex:1,padding:"14px",borderRadius:14,background:C.card,border:`1px solid ${C.border}`,color:C.text,fontSize:13,fontWeight:600,cursor:"pointer"}}>📊 Анализ</button>
      </div>
      {/* Последние */}
      <SectionTitle>Последние операции</SectionTitle>
      {txs.slice(0,5).map(t=><TxRow key={t.id} tx={t}/>)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   АНАЛИТИКА
═══════════════════════════════════════════════════════════ */
function Analytics({state}){
  const C=useC(); const {txs}=state;
  const [period,setPeriod]=useState("month");
  const [offset,setOffset]=useState(0); // 0=текущий, -1=предыдущий и т.д.
  const now=new Date();

  /* ── Вычисляем границы выбранного периода ─────────────────── */
  const {pStart,pEnd,pLabel}=useMemo(()=>{
    const d=new Date();
    let ps,pe,label;

    if(period==="week"){
      // Неделя пн-вс + offset
      const day=d.getDay()||7;
      d.setDate(d.getDate()-day+1+offset*7);
      d.setHours(0,0,0,0);
      ps=new Date(d);
      pe=new Date(d); pe.setDate(pe.getDate()+7);
      const endD=new Date(pe); endD.setDate(endD.getDate()-1);
      label=`${ps.getDate()} ${monthName[ps.getMonth()]} — ${endD.getDate()} ${monthName[endD.getMonth()]}`;
    } else if(period==="month"){
      // Полный месяц с 1-го по последнее число
      const base=new Date(now.getFullYear(),now.getMonth()+offset,1);
      ps=base;
      pe=new Date(base.getFullYear(),base.getMonth()+1,1);
      label=`${monthName[base.getMonth()]} ${base.getFullYear()}`;
    } else {
      // Полный год
      const y=now.getFullYear()+offset;
      ps=new Date(y,0,1);
      pe=new Date(y+1,0,1);
      label=`${y} год`;
    }
    return {pStart:ps,pEnd:pe,pLabel:label};
  },[period,offset,now.getTime()]);

  const isCurrentPeriod=offset===0;

  /* ── Фильтрация транзакций ──────────────────────────────────── */
  const inRange=(t,s,e)=>{const d=new Date(t.date);return d>=s&&d<e;};
  const cur=txs.filter(t=>inRange(t,pStart,pEnd));
  const curExp=cur.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amt,0);
  const curInc=cur.filter(t=>t.type==="income").reduce((s,t)=>s+t.amt,0);
  const days=Math.max(1,Math.ceil((Math.min(now,pEnd)-pStart)/864e5));
  const avgDay=curExp/days;

  /* ── Данные для графиков ────────────────────────────────────── */
  const lineData=useMemo(()=>{
    if(period==="week"){
      const out=[];
      for(let i=0;i<7;i++){
        const d=new Date(pStart); d.setDate(d.getDate()+i);
        if(d>now)break;
        const ds=d.toISOString().slice(0,10);
        out.push({x:dayName[d.getDay()||6],
          e:txs.filter(t=>t.type==="expense"&&t.date===ds).reduce((s,t)=>s+t.amt,0),
          i:txs.filter(t=>t.type==="income" &&t.date===ds).reduce((s,t)=>s+t.amt,0)});
      }
      return out;
    } else if(period==="month"){
      const out=[]; const daysInMonth=new Date(pStart.getFullYear(),pStart.getMonth()+1,0).getDate();
      for(let d=1;d<=daysInMonth;d++){
        const date=new Date(pStart.getFullYear(),pStart.getMonth(),d);
        if(date>now)break;
        const ds=date.toISOString().slice(0,10);
        out.push({x:""+d,
          e:txs.filter(t=>t.type==="expense"&&t.date===ds).reduce((s,t)=>s+t.amt,0),
          i:txs.filter(t=>t.type==="income" &&t.date===ds).reduce((s,t)=>s+t.amt,0)});
      }
      return out;
    } else {
      // Год — по месяцам
      const out=[];
      for(let m=0;m<12;m++){
        const mDate=new Date(pStart.getFullYear(),m,1);
        if(mDate>now)break;
        const mk=mDate.toISOString().slice(0,7);
        const e=txs.filter(t=>t.type==="expense"&&monthKey(t.date)===mk).reduce((s,t)=>s+t.amt,0);
        const i=txs.filter(t=>t.type==="income" &&monthKey(t.date)===mk).reduce((s,t)=>s+t.amt,0);
        out.push({x:monthName[m],e,i});
      }
      return out;
    }
  },[period,pStart.getTime(),txs.length]);

  /* ── По категориям ──────────────────────────────────────────── */
  const byCat=cur.filter(t=>t.type==="expense").reduce((a,t)=>({...a,[t.cat]:(a[t.cat]||0)+t.amt}),{});
  const pie=Object.entries(byCat).map(([n,v])=>({n,v,color:CAT_COLOR[n]||"#888"})).sort((a,b)=>b.v-a.v);

  /* ── Помесячная таблица (только для года) ───────────────────── */
  const monthRows=period==="year"?lineData.map((m,i)=>({
    label:m.x, exp:m.e, inc:m.i, bal:m.i-m.e
  })):[];
  const maxMonthExp=Math.max(1,...monthRows.map(r=>r.exp));



  const PERIODS=[["week","Неделя"],["month","Месяц"],["year","Год"]];

  return(
    <div style={{padding:"0 16px 90px"}}>
      {/* Заголовок */}
      <div style={{padding:"14px 0 12px"}}>
        <div style={{color:C.sub,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Статистика</div>
        <div style={{color:C.text,fontSize:22,fontWeight:800,marginTop:2}}>Аналитика</div>
      </div>

      {/* Тип периода */}
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {PERIODS.map(([v,l])=>(
          <button key={v} onClick={()=>{setPeriod(v);setOffset(0);}}
            style={{flex:1,padding:"10px",borderRadius:10,border:"none",
              background:period===v?C.gold:C.card,
              color:period===v?"#0A0D14":C.sub,
              fontSize:13,fontWeight:700,cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>

      {/* Навигация по периодам */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        background:C.card,borderRadius:14,padding:"10px 14px",marginBottom:14,
        border:`1px solid ${C.border}`}}>
        <button onClick={()=>setOffset(o=>o-1)}
          style={{background:"none",border:"none",color:C.gold,fontSize:22,cursor:"pointer",padding:"0 8px"}}>‹</button>
        <div style={{textAlign:"center"}}>
          <div style={{color:C.text,fontSize:15,fontWeight:700}}>{pLabel}</div>
          {isCurrentPeriod&&<div style={{color:C.green,fontSize:10,marginTop:2}}>● текущий период</div>}
        </div>
        <button onClick={()=>setOffset(o=>Math.min(0,o+1))}
          style={{background:"none",border:"none",
            color:offset<0?C.gold:C.muted,
            fontSize:22,cursor:offset<0?"pointer":"default",padding:"0 8px"}}>›</button>
      </div>

      {/* Сводка */}
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <Card style={{flex:1,padding:14}}>
          <div style={{color:C.sub,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Расходы</div>
          <div style={{color:C.red,fontSize:20,fontWeight:800,marginTop:3}}>{fmt(curExp)}</div>

        </Card>
        <Card style={{flex:1,padding:14}}>
          <div style={{color:C.sub,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Доходы</div>
          <div style={{color:C.green,fontSize:20,fontWeight:800,marginTop:3}}>{fmt(curInc)}</div>

        </Card>
      </div>

      {/* Баланс + среднее */}
      <Card style={{marginBottom:14,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{color:C.sub,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Баланс периода</div>
          <div style={{color:curInc-curExp>=0?C.green:C.red,fontSize:18,fontWeight:800,marginTop:2}}>
            {curInc-curExp>=0?"+":""}{fmt(curInc-curExp)}
          </div>
        </div>
        {period!=="year"&&<div style={{textAlign:"right"}}>
          <div style={{color:C.sub,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>В среднем</div>
          <div style={{color:C.text,fontSize:15,fontWeight:700,marginTop:2}}>{fmt(avgDay)}/день</div>
        </div>}
      </Card>

      {/* ГОДОВОЙ ВИД — таблица по месяцам */}
      {period==="year"&&monthRows.length>0&&(
        <Card style={{marginBottom:14}}>
          <SectionTitle>По месяцам — {pStart.getFullYear()}</SectionTitle>
          {monthRows.map((r,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{color:C.text,fontSize:13,fontWeight:600,width:36}}>{r.label}</span>
                <span style={{color:C.red,fontSize:12,width:80,textAlign:"right"}}>{r.exp>0?`−${fmt(r.exp)}`:"—"}</span>
                <span style={{color:r.bal>=0?C.green:C.red,fontSize:12,fontWeight:700,width:80,textAlign:"right"}}>
                  {r.exp>0|r.inc>0?(r.bal>=0?"+":"")+fmt(r.bal):"—"}
                </span>
              </div>
              {r.exp>0&&<div style={{background:C.card2,borderRadius:3,height:5,overflow:"hidden"}}>
                <div style={{width:`${r.exp/maxMonthExp*100}%`,height:"100%",background:C.red,borderRadius:3}}/>
              </div>}
            </div>
          ))}
          {/* Итого год */}
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10,marginTop:4,display:"flex",justifyContent:"space-between"}}>
            <span style={{color:C.sub,fontSize:12,fontWeight:700}}>Итого {pStart.getFullYear()}</span>
            <span style={{color:C.red,fontSize:12}}>−{fmt(monthRows.reduce((s,r)=>s+r.exp,0))}</span>
            <span style={{color:C.gold,fontSize:12,fontWeight:700}}>
              {fmt(monthRows.reduce((s,r)=>s+r.bal,0))}
            </span>
          </div>
        </Card>
      )}

      {/* График динамики */}
      {lineData.length>0&&(
        <Card style={{marginBottom:14,padding:"14px 6px 8px"}}>
          <div style={{paddingLeft:10}}>
            <SectionTitle>
              {period==="week"?"По дням":period==="month"?"Дни месяца":"Расходы по месяцам"}
            </SectionTitle>
          </div>
          <ResponsiveContainer width="100%" height={period==="year"?130:140}>
            {period==="year"?(
              <BarChart data={lineData} margin={{top:0,right:8,bottom:0,left:-22}}>
                <XAxis dataKey="x" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11,color:C.text}} formatter={v=>fmt(v)}/>
                <Bar dataKey="e" fill={C.red} radius={[3,3,0,0]}/>
                <Bar dataKey="i" fill={C.green} radius={[3,3,0,0]}/>
              </BarChart>
            ):(
              <AreaChart data={lineData} margin={{top:5,right:8,bottom:0,left:-22}}>
                <defs>
                  <linearGradient id="ae" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.red} stopOpacity={.4}/>
                    <stop offset="100%" stopColor={C.red} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.green} stopOpacity={.35}/>
                    <stop offset="100%" stopColor={C.green} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="x" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}
                  interval={period==="month"?4:0}/>
                <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11,color:C.text}} formatter={v=>fmt(v)}/>
                <Area type="monotone" dataKey="e" stroke={C.red}   strokeWidth={2} fill="url(#ae)"/>
                <Area type="monotone" dataKey="i" stroke={C.green} strokeWidth={2} fill="url(#ai)"/>
              </AreaChart>
            )}
          </ResponsiveContainer>
          <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:6}}>
            <span style={{color:C.red,fontSize:11}}>━ Расходы</span>
            <span style={{color:C.green,fontSize:11}}>━ Доходы</span>
          </div>
        </Card>
      )}

      {/* Категории */}
      {pie.length>0&&(
        <Card style={{marginBottom:14}}>
          <SectionTitle>По категориям</SectionTitle>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <ResponsiveContainer width={110} height={110}>
              <PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="v" strokeWidth={0}>
                {pie.map((_,i)=><Cell key={i} fill={_.color}/>)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div style={{flex:1}}>
              {pie.slice(0,6).map((e,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:8,height:8,borderRadius:2,background:e.color}}/>
                    <span style={{color:C.sub,fontSize:11}}>{e.n}</span>
                  </div>
                  <span style={{color:C.text,fontSize:11,fontWeight:600}}>{curExp>0?Math.round(e.v/curExp*100):0}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {cur.length===0&&(
        <Card style={{textAlign:"center",color:C.muted,padding:30}}>
          Нет данных за этот период
        </Card>
      )}
    </div>
  );
}

function Budgets({state,dispatch}){
  const C=useC(); const {txs,budgets}=state;
  const [editing,setEditing]=useState(null);
  const [val,setVal]=useState("");
  const spent=cat=>txs.filter(t=>t.type==="expense"&&t.cat===cat&&monthKey(t.date)===monthKey()).reduce((s,t)=>s+t.amt,0);
  const totalBudget=Object.values(budgets).reduce((s,v)=>s+v,0);
  const totalSpent=Object.keys(budgets).reduce((s,c)=>s+spent(c),0);
  const save=cat=>{ dispatch({type:"SET_BUDGET",cat,limit:parseFloat(val)||0}); setEditing(null); setVal(""); };
  const unused=ALL_CATS.filter(c=>!budgets[c]&&c!=="Зарплата"&&c!=="Фриланс");
  return(
    <div style={{padding:"0 16px 90px"}}>
      <div style={{padding:"14px 0 12px"}}>
        <div style={{color:C.sub,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Планирование</div>
        <div style={{color:C.text,fontSize:22,fontWeight:800,marginTop:2}}>Бюджеты</div>
      </div>
      {/* общий */}
      <div style={{background:`linear-gradient(135deg,${C.gold}22,${C.orange}15)`,border:`1px solid ${C.gold}33`,borderRadius:18,padding:18,marginBottom:16}}>
        <div style={{color:C.sub,fontSize:11,textTransform:"uppercase",letterSpacing:1}}>Всего за {monthName[new Date().getMonth()]}</div>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:4}}>
          <span style={{color:C.text,fontSize:26,fontWeight:800}}>{fmt(totalSpent)}</span>
          <span style={{color:C.sub,fontSize:15}}>из {fmt(totalBudget)}</span>
        </div>
        <div style={{background:C.card2,borderRadius:5,height:8,overflow:"hidden",marginTop:10}}>
          <div style={{width:`${totalBudget?Math.min(100,totalSpent/totalBudget*100):0}%`,height:"100%",background:totalSpent>totalBudget?C.red:C.green,borderRadius:5}}/>
        </div>
      </div>
      <SectionTitle>Лимиты по категориям</SectionTitle>
      {Object.entries(budgets).map(([cat,lim])=>{
        const sp=spent(cat), pct=Math.min(100,sp/lim*100), over=sp>lim;
        return(
          <Card key={cat} style={{marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:(CAT_COLOR[cat]||"#888")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{CAT_ICON[cat]}</div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontSize:14,fontWeight:600}}>{cat}</div>
                <div style={{color:over?C.red:pct>=80?C.orange:C.sub,fontSize:12}}>{fmt(sp)} / {fmt(lim)} {over&&"· превышен!"}</div>
              </div>
              {editing===cat?(
                <div style={{display:"flex",gap:6}}>
                  <input value={val} onChange={e=>setVal(e.target.value)} type="number" autoFocus placeholder={""+lim}
                    style={{width:70,background:C.input,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 8px",color:C.text,fontSize:13,outline:"none"}}/>
                  <button onClick={()=>save(cat)} style={{background:C.green,border:"none",borderRadius:8,padding:"0 10px",color:"#fff",cursor:"pointer"}}>✓</button>
                </div>
              ):(
                <button onClick={()=>{setEditing(cat);setVal(""+lim);}} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 10px",color:C.sub,fontSize:12,cursor:"pointer"}}>✏️</button>
              )}
            </div>
            <div style={{background:C.card2,borderRadius:4,height:6,overflow:"hidden"}}>
              <div style={{width:`${pct}%`,height:"100%",background:over?C.red:pct>=80?C.orange:C.green,borderRadius:4,transition:"width .3s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
              <span style={{color:C.muted,fontSize:11}}>Осталось: {fmt(Math.max(0,lim-sp))}</span>
              <button onClick={()=>dispatch({type:"SET_BUDGET",cat,limit:0})} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer"}}>удалить</button>
            </div>
          </Card>
        );
      })}
      {/* добавить */}
      {unused.length>0&&(
        <Card style={{marginTop:6}}>
          <SectionTitle>Добавить лимит</SectionTitle>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {unused.map(c=>(
              <button key={c} onClick={()=>{dispatch({type:"SET_BUDGET",cat:c,limit:200});}} style={{padding:"8px 14px",borderRadius:20,border:`1px solid ${C.border}`,background:C.card2,color:C.sub,fontSize:12,cursor:"pointer"}}>{CAT_ICON[c]} {c} +</button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ЦЕЛИ / КОПИЛКИ
═══════════════════════════════════════════════════════════ */
function Goals({state,dispatch}){
  const C=useC(); const {goals}=state;
  const [adding,setAdding]=useState(false);
  const [name,setName]=useState(""),[target,setTarget]=useState(""),[icon,setIcon]=useState("🎯");
  const [funding,setFunding]=useState(null),[fundAmt,setFundAmt]=useState("");
  const ICONS=["🎯","🏖️","💻","🚗","🏠","📱","💍","🎓","✈️","🎁"];
  const addGoal=()=>{ if(!name||!target)return; dispatch({type:"ADD_GOAL",goal:{name,target:parseFloat(target),icon,deadline:"",color:C.cyan}}); setAdding(false);setName("");setTarget("");setIcon("🎯"); };
  const fund=id=>{ if(!fundAmt)return; dispatch({type:"FUND_GOAL",id,amt:parseFloat(fundAmt)}); setFunding(null);setFundAmt(""); };
  return(
    <div style={{padding:"0 16px 90px"}}>
      <div style={{padding:"14px 0 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{color:C.sub,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Накопления</div>
          <div style={{color:C.text,fontSize:22,fontWeight:800,marginTop:2}}>Цели</div>
        </div>
        <button onClick={()=>setAdding(!adding)} style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.cyan})`,border:"none",color:"#0A0D14",fontSize:22,cursor:"pointer"}}>{adding?"×":"+"}</button>
      </div>
      {adding&&(
        <Card style={{marginBottom:14}}>
          <SectionTitle>Новая цель</SectionTitle>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
            {ICONS.map(ic=><button key={ic} onClick={()=>setIcon(ic)} style={{width:38,height:38,borderRadius:10,border:`1px solid ${icon===ic?C.gold:C.border}`,background:icon===ic?C.goldBg:C.card2,fontSize:18,cursor:"pointer"}}>{ic}</button>)}
          </div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Название (Отпуск, Машина...)" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
          <input value={target} onChange={e=>setTarget(e.target.value)} type="number" placeholder="Сумма цели (€)" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:14,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
          <button onClick={addGoal} style={{width:"100%",padding:"12px",borderRadius:12,background:`linear-gradient(135deg,${C.gold},${C.cyan})`,border:"none",color:"#0A0D14",fontWeight:700,fontSize:14,cursor:"pointer"}}>Создать цель</button>
        </Card>
      )}
      {goals.map(g=>{
        const pct=Math.min(100,g.current/g.target*100), done=g.current>=g.target;
        return(
          <Card key={g.id} style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
              <div style={{width:48,height:48,borderRadius:14,background:(g.color||C.cyan)+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{g.icon}</div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontSize:16,fontWeight:700}}>{g.name} {done&&"✅"}</div>
                <div style={{color:C.sub,fontSize:13,marginTop:2}}>{fmt(g.current)} из {fmt(g.target)}</div>
              </div>
              <div style={{color:done?C.green:C.gold,fontSize:18,fontWeight:800}}>{Math.round(pct)}%</div>
            </div>
            <div style={{background:C.card2,borderRadius:5,height:8,overflow:"hidden",marginBottom:12}}>
              <div style={{width:`${pct}%`,height:"100%",background:done?C.green:`linear-gradient(90deg,${g.color||C.cyan},${C.gold})`,borderRadius:5,transition:"width .4s"}}/>
            </div>
            {funding===g.id?(
              <div style={{display:"flex",gap:8}}>
                <input value={fundAmt} onChange={e=>setFundAmt(e.target.value)} type="number" autoFocus placeholder="Сумма пополнения" style={{flex:1,background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",color:C.text,fontSize:13,outline:"none"}}/>
                <button onClick={()=>fund(g.id)} style={{background:C.green,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",fontWeight:700,cursor:"pointer"}}>✓</button>
              </div>
            ):(
              <div style={{display:"flex",gap:8}}>
                {!done&&<button onClick={()=>setFunding(g.id)} style={{flex:1,padding:"10px",borderRadius:10,background:C.card2,border:`1px solid ${C.border}`,color:C.text,fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Пополнить</button>}
                <button onClick={()=>dispatch({type:"DEL_GOAL",id:g.id})} style={{padding:"10px 14px",borderRadius:10,background:"none",border:`1px solid ${C.border}`,color:C.muted,fontSize:13,cursor:"pointer"}}>🗑</button>
              </div>
            )}
          </Card>
        );
      })}
      {goals.length===0&&!adding&&<Card style={{textAlign:"center",color:C.muted,padding:30}}>Целей пока нет.<br/>Нажмите + чтобы создать копилку.</Card>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ЧАТ-АССИСТЕНТ
═══════════════════════════════════════════════════════════ */
function Chat({state,dispatch}){
  const C=useC(); const {txs,budgets,goals}=state;
  const [msgs,setMsgs]=useState([{id:0,kind:"bot",text:"Привет! 👋 Я ваш офлайн финансовый ассистент.\n\nПринимаю **голос**, **текст**, **фото чеков** и **CSV выписки**. Всё сохраняется локально.\n\nСкажите «помоги» чтобы увидеть команды."}]);
  const [input,setInput]=useState(""),[busy,setBusy]=useState(false);
  const lastClarify=useRef(null); // запоминаем последний переспрос {amt, cat, desc}
  const listRef=useRef(null);
  const down=()=>setTimeout(()=>listRef.current?.scrollTo({top:99999,behavior:"smooth"}),80);

  const send=useCallback((text,isVoice=false)=>{
    if(!text.trim()||busy)return; setInput("");
    setMsgs(p=>[...p,{id:Date.now(),kind:"user",text:text.trim(),voice:isVoice}]); setBusy(true); down();
    setTimeout(()=>{
      let intent=nlp(text);

      // Если пользователь подтверждает тип после переспроса —
      // добавляем сумму и категорию из контекста
      if((intent.i==="CONFIRM_INC"||intent.i==="CONFIRM_EXP")&&lastClarify.current){
        intent={...intent,
          pendingAmt: lastClarify.current.amt,
          pendingCat: lastClarify.current.cat,
          pendingDesc:lastClarify.current.desc,
        };
        lastClarify.current=null; // сбрасываем контекст
      }

      // Если бот переспрашивает — запоминаем сумму
      if(intent.i==="CLARIFY"){
        lastClarify.current={
          amt:  intent.amt,
          cat:  getCat(text),
          desc: cleanDesc(text)||"",
        };
      } else if(intent.i!=="CONFIRM_INC"&&intent.i!=="CONFIRM_EXP"){
        lastClarify.current=null; // любой другой ответ — сбрасываем
      }

      const res=run(intent,txs,budgets,goals);
      if(res.addTx) dispatch({type:"ADD_TX",tx:res.addTx});
      if(res.delLast) dispatch({type:"DEL_TX",id:res.delLast});
      if(res.fixLast) dispatch({type:"EDIT_TX",id:res.fixLast.id,patch:res.fixLast.patch});
      setMsgs(p=>[...p,{id:Date.now()+1,kind:"bot",text:res.text}]); setBusy(false); down();
    },350);
  },[txs,budgets,goals,dispatch,busy]);

  const handleFile=useCallback(async(file)=>{
    const ext=(file.name.split(".").pop()||"").toLowerCase();
    const size=file.size<1024?file.size+"B":(file.size/1024).toFixed(0)+"KB"; down();

    if(["jpg","jpeg","png","webp","heic"].includes(ext)){
      const thumb=await resizeImage(file);
      const msgId=Date.now();
      // Сразу показываем фото с состоянием "загрузка"
      setMsgs(p=>[...p,{id:msgId,kind:"img",src:thumb,filename:file.name,ocr:null,ocrProgress:0,done:false}]);
      down();

      // Запускаем настоящий OCR
      try {
        const result = await recognizeReceipt(thumb, (pct)=>{
          setMsgs(p=>p.map(m=>m.id===msgId?{...m,ocrProgress:pct}:m));
        });

        // Определяем категорию по названию магазина
        const cat = getCat(result.store);

        setMsgs(p=>p.map(m=>m.id===msgId?{
          ...m,
          ocrProgress:100,
          ocr:{
            amt:  result.amount,
            desc: result.store,
            cat:  cat.n,
            icon: cat.e,
            date: result.date,
            raw:  result.rawText?.slice(0,200),
          }
        }:m));
      } catch(err) {
        setMsgs(p=>p.map(m=>m.id===msgId?{...m,ocrError:"Не удалось распознать чек. Попробуйте более чёткое фото."}:m));
      }
      down();

    } else if(ext==="csv"){
      const text=await file.text(); const rows=parseCSV(text);
      setMsgs(p=>[...p,{id:Date.now(),kind:"csv",filename:file.name,size,rows,imported:false}]);
      if(!rows.length) setMsgs(p=>[...p,{id:Date.now()+1,kind:"bot",text:"CSV открыт, но операции не найдены. Формат: дата;описание;сумма"}]);
      down();
    } else {
      setMsgs(p=>[...p,{id:Date.now(),kind:"bot",text:`Файл «${file.name}» получен.\nПоддерживаю: JPG/PNG (чеки), CSV (выписки).`}]);
    }
  },[]);

  const confirmImg=useCallback((id,type,{amt,desc})=>{
    setMsgs(p=>p.map(m=>{ if(m.id!==id)return m;
      dispatch({type:"ADD_TX",tx:{type,amt,cat:m.ocr.cat,icon:m.ocr.icon,desc,src:"image"}}); return{...m,done:true}; }));
  },[dispatch]);
  const importCsv=useCallback(id=>{
    setMsgs(p=>p.map(m=>{ if(m.id!==id)return m; if(m.rows?.length)dispatch({type:"ADD_MANY",txs:m.rows}); return{...m,imported:true}; }));
  },[dispatch]);

  const voice=useVoice(t=>send(t,true));
  const HINTS=["Какой баланс?","Потратил 45 на еду","Удали последнюю","Исправь последнюю","Прогноз на месяц","Совет по экономии"];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"14px 18px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>◈</div>
        <div style={{flex:1}}>
          <div style={{color:C.text,fontWeight:700,fontSize:16}}>AI Ассистент</div>
          <div style={{fontSize:11,color:voice.on?C.gold:C.green,marginTop:2}}>{voice.on?"● СЛУШАЮ...":"● OFFLINE · без интернета"}</div>
        </div>
        <span style={{fontSize:11,color:C.muted}}>{txs.length} записей</span>
      </div>
      {voice.err&&<div style={{margin:"8px 14px 0",padding:"10px 14px",background:C.redBg,border:`1px solid ${C.red}44`,borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{color:C.red,fontSize:12}}>{voice.err}</span>
        <button onClick={()=>voice.setErr("")} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>✕</button>
      </div>}
      <div style={{display:"flex",gap:6,overflowX:"auto",padding:"10px 14px 4px",flexShrink:0}}>
        {HINTS.map((h,i)=><button key={i} onClick={()=>send(h)} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 12px",color:C.sub,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{h}</button>)}
      </div>
      <div ref={listRef} style={{flex:1,overflowY:"auto",padding:"14px 16px 8px"}}>
        {msgs.map(m=>{
          if(m.kind==="bot") return(
            <div key={m.id} style={{display:"flex",gap:10,marginBottom:14}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,alignSelf:"flex-end"}}>◈</div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"18px 18px 18px 4px",padding:"11px 15px",maxWidth:"82%"}}>
                {(m.text||"").split("\n").map((l,i)=><p key={i} style={{margin:"2px 0",color:C.text,fontSize:13,lineHeight:1.55}} dangerouslySetInnerHTML={{__html:l.replace(/\*\*(.+?)\*\*/g,`<b style="color:${C.gold}">$1</b>`)||"&nbsp;"}}/>)}
              </div>
            </div>
          );
          if(m.kind==="user") return(
            <div key={m.id} style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
              <div style={{maxWidth:"82%"}}>
                {m.voice&&<div style={{textAlign:"right",color:C.gold,fontSize:10,marginBottom:3}}>🎤 голос</div>}
                <div style={{background:`linear-gradient(135deg,${C.gold}22,${C.cyan}15)`,border:`1px solid ${C.gold}33`,borderRadius:"18px 18px 4px 18px",padding:"11px 15px",color:C.text,fontSize:13,lineHeight:1.5}}>{m.text}</div>
              </div>
            </div>
          );
          if(m.kind==="img") return <ImgCard key={m.id} m={m} onConfirm={confirmImg}/>;
          if(m.kind==="csv") return <CsvCard key={m.id} m={m} onImport={importCsv}/>;
          return null;
        })}
        {busy&&<div style={{display:"flex",gap:10,marginBottom:14}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>◈</div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"18px 18px 18px 4px",padding:"12px 16px",display:"flex",gap:5}}>
            {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:C.gold,animation:`dot 1s ${i*.2}s ease-in-out infinite`}}/>)}
          </div>
        </div>}
        {voice.on&&voice.live&&<div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
          <div style={{padding:"9px 14px",background:C.goldBg,border:`1px solid ${C.gold}44`,borderRadius:"14px 14px 4px 14px",color:C.gold,fontSize:13,fontStyle:"italic",maxWidth:"82%"}}>{voice.live}...</div>
        </div>}
      </div>
      {/* ввод */}
      <div style={{padding:"10px 14px 16px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
          <label htmlFor="fin-file" style={{width:48,height:48,borderRadius:"50%",background:C.card2,border:`1px solid ${C.border}`,fontSize:22,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,userSelect:"none"}}>📎</label>
          <input id="fin-file" type="file" accept="image/*,.csv" style={{position:"absolute",width:1,height:1,opacity:0,pointerEvents:"none"}} onChange={e=>{if(e.target.files[0]){handleFile(e.target.files[0]);e.target.value="";}}}/>
          <textarea value={voice.on?voice.live:input} onChange={e=>{if(!voice.on)setInput(e.target.value);}} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}}} placeholder={voice.on?"🎤 Слушаю...":"Напишите или нажмите 🎤"} readOnly={voice.on} rows={1}
            style={{flex:1,background:C.input,border:`1.5px solid ${voice.on?C.gold:C.border}`,borderRadius:20,padding:"12px 16px",color:voice.on?C.gold:C.text,fontSize:13,outline:"none",resize:"none",fontFamily:"inherit",lineHeight:1.4,maxHeight:90,fontStyle:voice.on?"italic":"normal"}}/>
          {voice.supported&&<button onClick={voice.toggle} style={{width:52,height:52,borderRadius:"50%",border:`2px solid ${voice.on?C.gold:C.border}`,cursor:"pointer",flexShrink:0,background:voice.on?C.gold:C.card,boxShadow:voice.on?`0 0 0 6px ${C.goldGlow}`:undefined,fontSize:22,transition:"all .25s",transform:voice.on?"scale(1.1)":"scale(1)",animation:voice.on?"micPulse 1.5s ease-in-out infinite":undefined}}>{voice.on?"⏹":"🎤"}</button>}
          <button onClick={()=>send(input)} disabled={!input.trim()||voice.on} style={{width:48,height:48,borderRadius:"50%",background:input.trim()&&!voice.on?`linear-gradient(135deg,${C.gold},${C.cyan})`:C.card2,border:"none",cursor:"pointer",fontSize:20,color:"#0A0D14",flexShrink:0}}>↑</button>
        </div>
      </div>
    </div>
  );
}
function ImgCard({m,onConfirm}){
  const C=useC();
  const [ed,setEd]=useState(false);
  const [amt,setAmt]=useState("");
  const [desc,setDesc]=useState("");
  useEffect(()=>{ if(m.ocr){setAmt(String(m.ocr.amt||""));setDesc(m.ocr.desc||"");} },[m.ocr]);
  const isLoading=!m.ocr&&!m.ocrError;
  const getAmt2=()=>parseFloat(amt)||m.ocr?.amt||0;
  const getDesc2=()=>desc||m.ocr?.desc||"Чек";
  return(
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
        <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${C.border}`,maxWidth:"72%"}}>
          {m.src&&<img src={m.src} alt="" style={{width:"100%",display:"block",maxHeight:200,objectFit:"cover"}}/>}
          <div style={{padding:"6px 12px",background:C.card,color:C.sub,fontSize:11}}>📎 {m.filename}</div>
        </div>
      </div>
      {!m.done&&(
        <div style={{display:"flex",gap:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>◈</div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"18px 18px 18px 4px",padding:14,flex:1}}>
            {isLoading&&(<>
              <div style={{color:C.cyan,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:8}}>🔍 РАСПОЗНАЮ ЧЕК...</div>
              <div style={{color:C.sub,fontSize:12,marginBottom:10}}>
                {(m.ocrProgress||0)<10?"Загружаю OCR движок...":(m.ocrProgress||0)<90?`Читаю текст... ${m.ocrProgress}%`:"Анализирую..."}
              </div>
              <div style={{background:C.card2,borderRadius:4,height:6,overflow:"hidden"}}>
                <div style={{width:`${m.ocrProgress||5}%`,height:"100%",background:`linear-gradient(90deg,${C.gold},${C.cyan})`,borderRadius:4,transition:"width .3s"}}/>
              </div>
            </>)}
            {m.ocrError&&(<>
              <div style={{color:C.red,fontSize:12,marginBottom:10}}>⚠️ {m.ocrError}</div>
              <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Описание" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13,marginBottom:8,outline:"none",boxSizing:"border-box"}}/>
              <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="Сумма (€)" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13,marginBottom:10,outline:"none",boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{if(amt&&desc)onConfirm(m.id,"expense",{amt:getAmt2(),desc:getDesc2()});}} style={{flex:1,padding:"10px",borderRadius:10,background:C.redBg,border:`1px solid ${C.red}44`,color:C.red,fontWeight:700,fontSize:12,cursor:"pointer"}}>↓ Расход</button>
                <button onClick={()=>{if(amt&&desc)onConfirm(m.id,"income",{amt:getAmt2(),desc:getDesc2()});}} style={{flex:1,padding:"10px",borderRadius:10,background:C.greenBg,border:`1px solid ${C.green}44`,color:C.green,fontWeight:700,fontSize:12,cursor:"pointer"}}>↑ Доход</button>
              </div>
            </>)}
            {m.ocr&&!m.ocrError&&(<>
              <div style={{color:C.cyan,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:10}}>✓ ЧЕК РАСПОЗНАН</div>
              {ed?(<>
                <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Описание" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13,marginBottom:8,outline:"none",boxSizing:"border-box"}}/>
                <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="Сумма" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13,marginBottom:10,outline:"none",boxSizing:"border-box"}}/>
              </>):(
                <div style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{color:C.text,fontSize:14,fontWeight:600}}>{m.ocr.icon} {m.ocr.desc}</span>
                    {m.ocr.amt?<span style={{color:C.gold,fontWeight:700,fontSize:16}}>{fmt2(m.ocr.amt)}</span>:<span style={{color:C.red,fontSize:12}}>нет суммы ✏️</span>}
                  </div>
                  <div style={{color:C.muted,fontSize:11}}>{m.ocr.cat}{m.ocr.date?" · "+m.ocr.date:""}</div>
                </div>
              )}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>onConfirm(m.id,"expense",{amt:getAmt2(),desc:getDesc2(),date:m.ocr.date})} disabled={!getAmt2()} style={{flex:1,padding:"10px",borderRadius:10,background:C.redBg,border:`1px solid ${C.red}44`,color:C.red,fontWeight:700,fontSize:12,cursor:"pointer",opacity:getAmt2()?1:.5}}>↓ Расход</button>
                <button onClick={()=>onConfirm(m.id,"income",{amt:getAmt2(),desc:getDesc2(),date:m.ocr.date})} disabled={!getAmt2()} style={{flex:1,padding:"10px",borderRadius:10,background:C.greenBg,border:`1px solid ${C.green}44`,color:C.green,fontWeight:700,fontSize:12,cursor:"pointer",opacity:getAmt2()?1:.5}}>↑ Доход</button>
                <button onClick={()=>setEd(!ed)} style={{padding:"10px 12px",borderRadius:10,background:C.card2,border:`1px solid ${C.border}`,color:C.sub,cursor:"pointer"}}>✏️</button>
              </div>
            </>)}
          </div>
        </div>
      )}
      {m.done&&(
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>◈</div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px 14px 14px 4px",padding:"9px 14px",color:C.green,fontSize:13}}>✅ Записано в базу</div>
        </div>
      )}
    </div>
  );
}
function CsvCard({m,onImport}){
  const C=useC();
  return(
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
        <div style={{padding:"12px 16px",background:`linear-gradient(135deg,${C.gold}22,${C.cyan}15)`,border:`1px solid ${C.gold}44`,borderRadius:"18px 18px 4px 18px"}}>
          <div style={{fontSize:28,marginBottom:4}}>📊</div>
          <div style={{color:C.text,fontSize:13,fontWeight:600}}>{m.filename}</div>
          <div style={{color:C.muted,fontSize:11}}>CSV · {m.size}</div>
        </div>
      </div>
      {!m.imported&&m.rows?.length>0?(
        <div style={{display:"flex",gap:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>◈</div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"18px 18px 18px 4px",padding:14,flex:1}}>
            <div style={{color:C.violet,fontSize:11,fontWeight:700,letterSpacing:1,marginBottom:10}}>📊 ВЫПИСКА РАСПОЗНАНА</div>
            <div style={{color:C.text,fontSize:14,marginBottom:8}}>Найдено: <b style={{color:C.gold}}>{m.rows.length}</b> операций</div>
            {m.rows.slice(0,3).map((r,i)=><div key={i} style={{color:C.sub,fontSize:12,marginBottom:4}}>{r.icon} {r.desc} — {r.type==="income"?"+":"−"}{fmt2(r.amt)}</div>)}
            {m.rows.length>3&&<div style={{color:C.muted,fontSize:11,marginBottom:10}}>...ещё {m.rows.length-3}</div>}
            <button onClick={()=>onImport(m.id)} style={{width:"100%",padding:"11px",borderRadius:10,background:`linear-gradient(135deg,${C.gold}22,${C.cyan}15)`,border:`1px solid ${C.gold}44`,color:C.gold,fontWeight:700,fontSize:13,cursor:"pointer"}}>✦ Импортировать всё</button>
          </div>
        </div>
      ):m.imported?(
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>◈</div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:"14px 14px 14px 4px",padding:"9px 14px",color:C.green,fontSize:13}}>✅ {m.rows?.length} операций импортировано</div>
        </div>
      ):null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ИСТОРИЯ
═══════════════════════════════════════════════════════════ */
function History({state,dispatch}){
  const C=useC(); const {txs}=state;
  const [q,setQ]=useState(""),[f,setF]=useState("all");
  const list=txs.filter(t=>(!q||(t.desc+t.cat).toLowerCase().includes(q.toLowerCase()))&&(f==="all"||t.type===f));
  // группировка по дням
  const groups={};
  list.forEach(t=>{ (groups[t.date]=groups[t.date]||[]).push(t); });
  const inc=txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amt,0);
  const exp=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amt,0);
  const exportCSV=()=>{
    const csv="Дата;Тип;Категория;Описание;Сумма\n"+txs.map(t=>`${t.date};${t.type==="income"?"Доход":"Расход"};${t.cat};${t.desc};${t.amt}`).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="finance_export.csv"; a.click();
  };
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"14px 16px 10px",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{color:C.sub,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Все записи</div>
            <div style={{color:C.text,fontSize:22,fontWeight:800,marginTop:2}}>История</div>
          </div>
          <button onClick={exportCSV} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.cyan,fontSize:12,cursor:"pointer"}}>⬇ CSV</button>
        </div>
        <div style={{display:"flex",gap:12,marginTop:12}}>
          <div style={{flex:1,background:C.greenBg,border:`1px solid ${C.green}33`,borderRadius:12,padding:"9px 12px"}}>
            <div style={{color:C.sub,fontSize:10,textTransform:"uppercase"}}>Доходы</div>
            <div style={{color:C.green,fontWeight:700,fontSize:15,marginTop:2}}>+{fmt(inc)}</div>
          </div>
          <div style={{flex:1,background:C.redBg,border:`1px solid ${C.red}33`,borderRadius:12,padding:"9px 12px"}}>
            <div style={{color:C.sub,fontSize:10,textTransform:"uppercase"}}>Расходы</div>
            <div style={{color:C.red,fontWeight:700,fontSize:15,marginTop:2}}>−{fmt(exp)}</div>
          </div>
        </div>
      </div>
      <div style={{padding:"0 16px 10px",flexShrink:0}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="🔍 Поиск..." style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:8}}/>
        <div style={{display:"flex",gap:6}}>
          {[["all","Все"],["income","Доходы"],["expense","Расходы"]].map(([v,l])=><button key={v} onClick={()=>setF(v)} style={{flex:1,padding:"8px",borderRadius:10,border:"none",background:f===v?C.gold:C.card,color:f===v?"#0A0D14":C.sub,fontSize:12,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"4px 16px 90px"}}>
        {Object.keys(groups).length===0&&<div style={{color:C.muted,textAlign:"center",marginTop:40}}>Нет записей</div>}
        {Object.entries(groups).map(([date,items])=>(
          <div key={date}>
            <div style={{color:C.muted,fontSize:11,fontWeight:600,margin:"12px 4px 8px"}}>{date===today()?"Сегодня":date}</div>
            {items.map(t=><TxRow key={t.id} tx={t} onDel={id=>dispatch({type:"DEL_TX",id})} onEdit={(id,patch)=>dispatch({type:"EDIT_TX",id,patch})}/>)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ДОБАВИТЬ ВРУЧНУЮ
═══════════════════════════════════════════════════════════ */
function AddManual({dispatch,goBack}){
  const C=useC();
  const [type,setType]=useState("expense"),[amt,setAmt]=useState(""),[desc,setDesc]=useState(""),[cat,setCat]=useState("Еда");
  const save=()=>{ const n=parseFloat(amt); if(!n||!desc.trim())return; dispatch({type:"ADD_TX",tx:{type,amt:n,cat,icon:CAT_ICON[cat]||"📦",desc:desc.trim(),src:"manual"}}); goBack(); };
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <button onClick={goBack} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",color:C.sub,fontSize:13,cursor:"pointer"}}>← Назад</button>
        <div style={{color:C.text,fontWeight:700,fontSize:16}}>Добавить вручную</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"20px 18px 90px"}}>
        <div style={{display:"flex",background:C.card2,borderRadius:12,padding:4,marginBottom:16}}>
          {[["expense","↓ Расход",C.red,C.redBg],["income","↑ Доход",C.green,C.greenBg]].map(([v,l,col,bg])=><button key={v} onClick={()=>setType(v)} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:type===v?bg:"transparent",color:type===v?col:C.muted,fontWeight:700,fontSize:13,cursor:"pointer"}}>{l}</button>)}
        </div>
        <div style={{marginBottom:12}}><div style={{color:C.sub,fontSize:12,marginBottom:5}}>Сумма (€)</div>
          <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="0.00" style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:18,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:12}}><div style={{color:C.sub,fontSize:12,marginBottom:5}}>Описание</div>
          <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Магазин, кафе..." style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:24}}><div style={{color:C.sub,fontSize:12,marginBottom:8}}>Категория</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ALL_CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:"8px 14px",borderRadius:20,border:`1px solid ${cat===c?C.gold:C.border}`,background:cat===c?C.goldBg:C.card2,color:cat===c?C.gold:C.sub,fontSize:12,cursor:"pointer"}}>{CAT_ICON[c]} {c}</button>)}
          </div>
        </div>
        <button onClick={save} style={{width:"100%",padding:"15px",borderRadius:14,background:`linear-gradient(135deg,${C.gold},${C.cyan})`,border:"none",color:"#0A0D14",fontWeight:800,fontSize:15,cursor:"pointer"}}>Сохранить</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   НАСТРОЙКИ
═══════════════════════════════════════════════════════════ */
function Settings({state,dispatch,onDailySummary}){
  const C=useC(); const {settings,txs}=state;
  const [pinMode,setPinMode]=useState(false),[newPin,setNewPin]=useState("");
  const setS=patch=>dispatch({type:"SET_SETTINGS",patch});
  const toggle=(k)=>setS({[k]:!settings[k]});
  const savePin=()=>{ if(newPin.length>=4){setS({pin:newPin});setPinMode(false);setNewPin("");} };
  const clearAll=()=>{ if(confirm("Удалить все данные? Это нельзя отменить.")){ DB.clearAll().finally(()=>location.reload()); } };
  const backup=()=>{
    const data=JSON.stringify({txs:state.txs,budgets:state.budgets,goals:state.goals,settings:state.settings});
    const blob=new Blob([data],{type:"application/json"}); const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download="finance_backup.json"; a.click();
  };
  const Row=({icon,label,sub,right,onClick})=>(
    <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 0",borderBottom:`1px solid ${C.border}`,cursor:onClick?"pointer":"default"}}>
      <span style={{fontSize:20}}>{icon}</span>
      <div style={{flex:1}}><div style={{color:C.text,fontSize:14,fontWeight:500}}>{label}</div>{sub&&<div style={{color:C.muted,fontSize:12,marginTop:1}}>{sub}</div>}</div>
      {right}
    </div>
  );
  const Switch=({on,onClick})=>(
    <div onClick={onClick} style={{width:44,height:26,borderRadius:13,background:on?C.green:C.card2,position:"relative",cursor:"pointer",transition:".2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:on?21:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:".2s"}}/>
    </div>
  );
  return(
    <div style={{padding:"0 18px 90px"}}>
      <div style={{padding:"14px 0 12px"}}>
        <div style={{color:C.sub,fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Конфигурация</div>
        <div style={{color:C.text,fontSize:22,fontWeight:800,marginTop:2}}>Настройки</div>
      </div>
      <Card style={{marginBottom:14,padding:"0 16px"}}>
        <Row icon="👤" label="Имя" sub={settings.name||"Не указано"} />
        <Row icon="🌍" label="Валюта" right={<span style={{color:C.gold,fontWeight:700}}>EUR €</span>} />
        <Row icon="🎨" label="Тёмная тема" right={<Switch on={settings.theme==="dark"} onClick={()=>setS({theme:settings.theme==="dark"?"light":"dark"})}/>} />
        <div style={{borderBottom:"none"}}><Row icon="🔔" label="Уведомления" sub="Ежедневные итоги, алерты бюджета" right={<Switch on={settings.notify} onClick={()=>toggle("notify")}/>} /></div>
      </Card>
      <SectionTitle>Уведомления</SectionTitle>
      <Card style={{marginBottom:14,padding:"0 16px"}}>
        <Row icon="🔔" label="Алерты бюджета" sub="Приходят в Telegram при превышении лимита" right={<Switch on={settings.notify} onClick={()=>toggle("notify")}/>}/>
        <div style={{borderBottom:"none"}}>
          <Row icon="📊" label="Отправить итог дня" sub="Сводка за сегодня придёт в Telegram" onClick={onDailySummary} right={<span style={{color:C.cyan}}>›</span>}/>
        </div>
      </Card>
      <SectionTitle>Безопасность</SectionTitle>
      <Card style={{marginBottom:14,padding:"0 16px"}}>
        {pinMode?(
          <div style={{padding:"14px 0"}}>
            <div style={{color:C.text,fontSize:14,marginBottom:10}}>Новый PIN (4–6 цифр)</div>
            <div style={{display:"flex",gap:8}}>
              <input value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,"").slice(0,6))} type="tel" placeholder="••••" autoFocus style={{flex:1,background:C.input,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 14px",color:C.text,fontSize:18,letterSpacing:8,textAlign:"center",outline:"none"}}/>
              <button onClick={savePin} style={{background:C.green,border:"none",borderRadius:10,padding:"0 18px",color:"#fff",fontWeight:700,cursor:"pointer"}}>✓</button>
            </div>
          </div>
        ):(
          <Row icon="🔒" label="PIN-код" sub={settings.pin?"Включён":"Выключен"} right={settings.pin?<button onClick={()=>setS({pin:""})} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",color:C.red,fontSize:12,cursor:"pointer"}}>Убрать</button>:<button onClick={()=>setPinMode(true)} style={{background:C.gold,border:"none",borderRadius:8,padding:"6px 12px",color:"#0A0D14",fontSize:12,fontWeight:700,cursor:"pointer"}}>Задать</button>} />
        )}
        <div style={{borderBottom:"none"}}><Row icon="☺" label="Face ID / Touch ID" sub="Доступно в нативной версии" right={<span style={{color:C.muted,fontSize:12}}>скоро</span>} /></div>
      </Card>
      <SectionTitle>Данные</SectionTitle>
      <Card style={{marginBottom:14,padding:"0 16px"}}>
        <Row icon="💾" label="Резервная копия" sub="Экспорт всех данных в JSON" onClick={backup} right={<span style={{color:C.cyan}}>⬇</span>} />
        <Row icon="📊" label="Записей в базе" right={<span style={{color:C.sub,fontWeight:600}}>{txs.length}</span>} />
        <div style={{borderBottom:"none"}}><Row icon="🗑" label="Очистить всё" sub="Удалить все данные навсегда" onClick={clearAll} right={<span style={{color:C.red}}>›</span>} /></div>
      </Card>
      <div style={{textAlign:"center",color:C.muted,fontSize:12,marginTop:20}}>
        {DB.mode==="telegram"
          ? "☁️ Данные синхронизируются через Telegram"
          : "📱 Данные хранятся локально"}
        <br/>FinanceAI · v3.0
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════ */
const NAV=[
  {id:"dashboard",icon:"⬡",label:"Обзор"},
  {id:"analytics",icon:"📊",label:"Анализ"},
  {id:"chat",icon:"◈",label:"AI"},
  {id:"budget",icon:"💰",label:"Бюджет"},
  {id:"more",icon:"⋯",label:"Ещё"},
];

export default function App(){
  const [state,dispatch]=useReducer(reducer,null,initState);
  const [tab,setTab]=useState("dashboard");
  const [moreOpen,setMoreOpen]=useState(false);
  const [locked,setLocked]=useState(!!state.settings.pin);
  const [notif,setNotif]=useState(null);
  const C = state.settings.theme==="light"?LIGHT:DARK;

  // Инициализация Telegram Mini App
  useEffect(()=>{
    TG.init();
    if(!state.settings.name && TG.firstName){
      dispatch({type:"SET_SETTINGS",patch:{name:TG.firstName}});
    }
    if(TG.isInsideTelegram && !state.settings.onboarded && TG.firstName){
      dispatch({type:"SET_SETTINGS",patch:{name:TG.firstName,onboarded:true}});
    }
    // Загружаем данные из Telegram Cloud (асинхронно, после быстрого старта)
    if(DB.mode==="telegram"){
      Promise.all([
        DB.loadTxs(state.txs),
        DB.loadBudgets(state.budgets),
        DB.loadGoals(state.goals),
        DB.loadSettings(state.settings),
      ]).then(([txs,budgets,goals,settings])=>{
        dispatch({type:"LOAD_ALL",data:{
          txs:    txs    || state.txs,
          budgets:budgets|| state.budgets,
          goals:  goals  || state.goals,
          settings:{...state.settings,...settings},
        }});
      }).catch(()=>{});
    }
  },[]);

  // онбординг
  if(!state.settings.onboarded){
    return <ThemeCtx.Provider value={C}><GlobalStyle/><Onboarding onDone={({name,monthBudget})=>{dispatch({type:"SET_SETTINGS",patch:{name,onboarded:true}});}}/></ThemeCtx.Provider>;
  }
  // блокировка
  if(locked&&state.settings.pin){
    return <ThemeCtx.Provider value={C}><GlobalStyle/><LockScreen pin={state.settings.pin} onUnlock={()=>setLocked(false)} onBiometric={()=>setLocked(false)}/></ThemeCtx.Provider>;
  }

  // ── Отправить уведомление через бота ──────────────────────
  const sendNotify = async (type, data) => {
    const chatId = TG.userId;
    if (!chatId) return; // не в Telegram
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, type, data }),
      });
    } catch {}
  };

  // алерт бюджета при добавлении
  const checkBudget=(tx)=>{
    if(tx.type!=="expense"||!state.settings.notify) return;
    const lim=state.budgets[tx.cat]; if(!lim) return;
    const sp=state.txs.filter(t=>t.type==="expense"&&t.cat===tx.cat&&monthKey(t.date)===monthKey()).reduce((s,t)=>s+t.amt,0)+tx.amt;
    if(sp>=lim){
      setNotif({type:"red",text:`⚠️ Бюджет «${tx.cat}» превышен!`});
      // Уведомление в Telegram
      sendNotify("budget_alert",{cat:tx.cat,spent:sp.toFixed(2),limit:lim.toFixed(2)});
    } else if(sp>=lim*0.8){
      setNotif({type:"orange",text:`🟡 ${tx.cat}: осталось ${fmt(lim-sp)}`});
      sendNotify("budget_warning",{cat:tx.cat,spent:sp.toFixed(2),limit:lim.toFixed(2)});
    }
    setTimeout(()=>setNotif(null),4000);
  };

  // ── Дневной итог по кнопке ─────────────────────────────────
  const sendDailySummary = () => {
    const todayStr = today();
    const todayTxs = state.txs.filter(t=>t.date===todayStr);
    const exp = todayTxs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amt,0);
    const inc = todayTxs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amt,0);
    const catMap = todayTxs.filter(t=>t.type==="expense").reduce((a,t)=>({...a,[t.cat]:(a[t.cat]||0)+t.amt}),{});
    const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
    sendNotify("daily_summary",{
      expense: exp.toFixed(2),
      income:  inc.toFixed(2),
      balance: (inc-exp).toFixed(2),
      topCat:  topCat?`${topCat[0]} (${topCat[1].toFixed(2)} €)`:null,
    });
    setNotif({type:"green",text:"📊 Итог дня отправлен в Telegram"});
    setTimeout(()=>setNotif(null),3000);
  };

  const wrappedDispatch=(a)=>{
    if(a.type==="ADD_TX"){
      checkBudget(a.tx);
      TG.hapticSuccess();
    }
    if(a.type==="ADD_TX"&&a.tx.type==="income"){
      // Проверяем достижение целей
      state.goals.forEach(g=>{
        if(g.current>=g.target){
          sendNotify("goal_reached",{icon:g.icon,name:g.name,target:g.target.toFixed(2)});
        }
      });
    }
    if(a.type==="DEL_TX") TG.haptic("medium");
    dispatch(a);
  };

  const goto=(t)=>{ setMoreOpen(false); if(["history","add","settings","goals"].includes(t)) setTab(t); else setTab(t); };

  const showTab = tab;
  const navActive = ["history","add","settings","goals"].includes(tab)?"more":tab;

  return(
    <ThemeCtx.Provider value={C}>
      <GlobalStyle/>
      <div style={{background:C.bg,minHeight:"100vh",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI',system-ui,sans-serif",maxWidth:520,margin:"0 auto",position:"relative",overflow:"hidden"}}>
        {/* уведомление */}
        {notif&&(
          <div onClick={()=>setNotif(null)} style={{position:"absolute",top:12,left:16,right:16,zIndex:50,padding:"12px 16px",borderRadius:12,
            background:notif.type==="red"?C.red:notif.type==="green"?C.green:C.orange,
            color:"#fff",fontSize:13,fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,.3)",animation:"slideDown .3s"}}>
            {notif.text}
          </div>
        )}

        <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
          {showTab==="dashboard"&&<div style={{overflow:"auto"}}><Dashboard state={state} goto={goto}/></div>}
          {showTab==="analytics"&&<div style={{overflow:"auto"}}><Analytics state={state}/></div>}
          {showTab==="chat"&&<Chat state={state} dispatch={wrappedDispatch}/>}
          {showTab==="budget"&&<div style={{overflow:"auto"}}><Budgets state={state} dispatch={dispatch}/></div>}
          {showTab==="goals"&&<div style={{overflow:"auto"}}><Goals state={state} dispatch={dispatch}/></div>}
          {showTab==="history"&&<History state={state} dispatch={dispatch}/>}
          {showTab==="add"&&<AddManual dispatch={wrappedDispatch} goBack={()=>setTab("dashboard")}/>}
          {showTab==="settings"&&<div style={{overflow:"auto"}}><Settings state={state} dispatch={dispatch} onDailySummary={sendDailySummary}/></div>}
        </div>

        {/* меню "Ещё" */}
        {moreOpen&&(
          <div onClick={()=>setMoreOpen(false)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",zIndex:40,display:"flex",alignItems:"flex-end"}}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",background:C.surf,borderRadius:"20px 20px 0 0",padding:"20px 18px 30px",borderTop:`1px solid ${C.border}`}}>
              <div style={{color:C.text,fontSize:16,fontWeight:700,marginBottom:16}}>Меню</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["history","📋","История"],["goals","🎯","Цели"],["add","✏️","Добавить"],["settings","⚙️","Настройки"]].map(([id,ic,l])=>(
                  <button key={id} onClick={()=>{setTab(id);setMoreOpen(false);}} style={{padding:"18px",borderRadius:14,background:C.card,border:`1px solid ${C.border}`,color:C.text,fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                    <span style={{fontSize:26}}>{ic}</span>{l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* навигация */}
        <div style={{display:"flex",background:C.surf,borderTop:`1px solid ${C.border}`,flexShrink:0,paddingBottom:"env(safe-area-inset-bottom)"}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{ if(n.id==="more")setMoreOpen(true); else {setTab(n.id);setMoreOpen(false);} }} style={{flex:1,background:"none",border:"none",padding:"11px 0 9px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:n.id==="chat"?22:19,filter:navActive===n.id?"none":"grayscale(1) opacity(.35)"}}>{n.icon}</span>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:.5,color:navActive===n.id?C.gold:C.muted,textTransform:"uppercase"}}>{n.label}</span>
              {navActive===n.id&&<div style={{width:16,height:2,borderRadius:1,background:C.gold}}/>}
            </button>
          ))}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}

function GlobalStyle(){
  return <style>{`
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    ::-webkit-scrollbar{width:0;height:0}
    input::placeholder,textarea::placeholder{color:#6B7FA8;opacity:.6}
    textarea{scrollbar-width:none}
    @keyframes dot{0%,100%{transform:scale(.55);opacity:.35}50%{transform:scale(1);opacity:1}}
    @keyframes micPulse{0%,100%{box-shadow:0 0 0 6px rgba(245,166,35,.22)}50%{box-shadow:0 0 0 12px rgba(245,166,35,.08)}}
    @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
    @keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
  `}</style>;
}
