// Standalone report illustration. No application imports, accounts, or network access.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Home, CalendarDays, Package, BarChart3, MoreHorizontal, Search, ArrowLeft,
  ChevronRight, ChevronDown, Wallet, Clock3, Check, Lock, SlidersHorizontal } = require('lucide-react');
const out = path.dirname(fileURLToPath(import.meta.url));
const C = { bg:'#FAFAF8', paper:'#FFFFFF', ink:'#3A3A3A', muted:'#6B6B6B', line:'#E5E4DC', control:'#8A918F',
  primary:'#607B82', primaryText:'#506970', sage:'#E6EFE9', blue:'#E7EFF1', warm:'#FFF8E6', warn:'#7A5A12',
  good:'#2F6B46', goodBg:'#F1F8F3' };
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const rect = (x,y,w,h,fill,r=16,stroke='none') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
const text = (x,y,s,size=16,fill=C.ink,weight=400,anchor='start') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill===C.primary?C.primaryText:fill}" font-weight="${weight}" text-anchor="${anchor}">${esc(s)}</text>`;
const line = (x1,y1,x2,y2) => `<path d="M${x1},${y1}H${x2}" stroke="${C.line}"/>`;
const icon = (Icon,x,y,size=20,color=C.muted) => renderToStaticMarkup(createElement(Icon,{x,y,width:size,height:size,color,strokeWidth:1.8}));
const pill = (x,y,w,label,fill=C.blue,fg=C.primary) => rect(x,y,w,26,fill,13)+text(x+w/2,y+18,label,13,fg,500,'middle');
const button = (x,y,w,label,primary=false) => rect(x,y,w,48,primary?C.primary:C.paper,14,primary?'none':C.control)+text(x+w/2,y+30,label,16,primary?C.paper:C.ink,600,'middle');
const card = (x,y,w,h,fill=C.paper) => rect(x,y,w,h,fill,20,C.line);
function nav(active){
  let s=rect(0,770,390,74,C.paper,0)+line(0,770,390,770);
  const items=[[Home,'今日'],[CalendarDays,'市集'],[Package,'商品'],[BarChart3,'分析'],[MoreHorizontal,'更多']];
  items.forEach(([Icon,label],i)=>{
    const cx=39+78*i, selected=i===active;
    if(selected)s+=rect(cx-27,777,54,31,C.blue,14);
    s+=icon(Icon,cx-10,783,20,selected?C.primary:C.muted);
    s+=text(cx,824,label,12,selected?C.primary:C.muted,selected?600:400,'middle');
  });
  return s;
}
function today(){return [
  text(20,34,'Féria',18,C.primary,600),text(370,34,'2026/10/25（日）',13,C.muted,400,'end'),
  text(20,78,'午安，照自己的步調來',22,C.ink,600),text(20,105,'先顧好眼前這一場。',14,C.muted),
  card(16,128,358,207,C.sage),pill(32,145,74,'營業中',C.paper,C.good),
  text(32,201,'文創散步市集',22,C.ink,600),text(32,231,'臺南文創園區',15),
  icon(Clock3,32,245,17),text(57,259,'13:00–19:00',14,C.muted),button(32,276,326,'進入現場  →',true),
  text(20,365,'今日 5 場',17,C.ink,600),text(20,390,'營業中 1・未開始 2・已收攤 2',14,C.muted),
  card(16,409,171,94,C.warm),icon(Wallet,30,423,18,C.warn),text(55,438,'待繳費',14,C.warn,500),
  text(32,481,'1',28,C.warn,600),text(57,480,'場',14,C.warn),icon(ChevronRight,157,460,18,C.warn),
  card(203,409,171,94),icon(Clock3,218,423,18,C.primary),text(244,438,'待錄取',14,C.ink,500),
  text(219,481,'6',28,C.ink,600),text(244,480,'場',14,C.muted),icon(ChevronRight,343,460,18),
  card(16,519,358,56),text(32,553,'待補照片 2 筆',15),text(350,553,'處理 →',14,C.primary,500,'end'),
  text(20,613,'今日其他場次',17,C.ink,600),
  text(20,653,'河岸手作市集',16,C.ink,500),text(370,653,'未開始',13,C.muted,400,'end'),line(20,670,370,670),
  text(20,697,'南紡固定營業',16,C.ink,500),text(370,697,'未開始',13,C.muted,400,'end'),line(20,714,370,714),
  text(20,750,'已收攤 2 場',15,C.muted),icon(ChevronDown,347,733),nav(0)
].join('');}
function manage(){return [
  icon(ArrowLeft,20,18),text(49,34,'市集',14,C.primary,500),
  text(20,77,'月光夜市集',24,C.ink,600),text(20,105,'2026/10/31・臺南市',14,C.muted),
  rect(16,125,358,46,C.paper,16,C.line),rect(256,129,114,38,C.primary,12),
  text(75,154,'現場',15,C.muted,500,'middle'),text(195,154,'回顧',15,C.muted,500,'middle'),text(313,154,'管理',15,C.paper,600,'middle'),
  card(16,190,358,278),text(32,221,'報名與繳費',17,C.ink,600),
  text(32,258,'報名進度',14,C.muted),pill(282,239,76,'已錄取',C.blue,C.primary),
  text(32,298,'繳費紀錄',14,C.muted),text(358,298,'尚未標記已繳費',15,C.ink,500,'end'),
  text(32,333,'繳費期限',14,C.muted),text(358,333,'10/28 23:59',15,C.warn,500,'end'),
  button(32,351,326,'標記已繳費',true),text(195,437,'更正／其他狀態',15,C.primary,500,'middle'),
  card(16,488,358,114),text(32,518,'營業安排',17,C.ink,600),text(32,550,'10/31 13:00–19:00',16),text(32,578,'尚未到營業日期',14,C.muted),
  card(16,622,358,58),text(32,657,'主辦／場地備註',15,C.ink,500),icon(ChevronRight,338,641),
  text(20,718,'此操作只更新繳費紀錄。',14,C.muted),text(20,741,'請先完成實際繳費，再更新狀態。',14,C.muted),nav(1)
].join('');}
function journals(){return [
  text(20,48,'出攤心得',24,C.ink,600),icon(Lock,313,29,16,C.muted),text(368,43,'私人',13,C.muted,400,'end'),
  text(20,77,'留給下一次出攤的自己。',14,C.muted),
  rect(16,99,275,48,C.paper,14,C.control),icon(Search,30,113,20),text(60,130,'搜尋市集、地點或心得',15,C.muted),
  rect(303,99,71,48,C.paper,14,C.control),text(338,130,'篩選',15,C.ink,500,'middle'),
  text(20,178,'臺南市・10/01～10/31',14,C.primary,500),text(368,178,'清除',14,C.primary,500,'end'),text(20,207,'共 8 篇心得',13,C.muted),
  card(16,224,358,210),text(32,254,'10/25・整場總結',13,C.muted),
  text(32,285,'文創散步市集',18,C.ink,600),
  text(32,317,'上午人潮集中，停車要提早到。',16),text(32,343,'下次從側門卸貨會比較方便。',16),
  line(32,363,358,363),text(73,406,'編輯心得',15,C.primary,600,'middle'),text(332,406,'更多',14,C.muted,400,'middle'),
  card(16,453,358,275),text(32,483,'10/18・整場總結',13,C.muted),text(32,514,'河岸週末市集',18,C.ink,600),
  text(32,547,'下午四點後人潮變多，附近的',16),text(32,573,'停車場較早客滿，建議下次提早',16),text(32,599,'抵達。遮雨設備也要再準備…',16),
  text(78,638,'展開全文',15,C.primary,500,'middle'),line(32,658,358,658),
  text(73,700,'編輯心得',15,C.primary,600,'middle'),text(332,700,'更多',14,C.muted,400,'middle'),nav(1)
].join('');}
const panels=[['01  今日：一眼找到現在的工作',today()],['02  管理：現況與下一步清楚',manage()],['03  心得：先閱讀，再依需要篩選',journals()]];
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1070" viewBox="0 0 1280 1070">
  <title>Féria 手機 UI／UX 設計方向稿，非實作畫面</title>
  <desc>三個390寬的靜態示意：今日、場次管理、私人心得。全部為示意資料，沒有功能或營運資料修改。</desc>
  <style>text{font-family:'Microsoft JhengHei','Noto Sans TC','PingFang TC',sans-serif}svg{overflow:visible}</style>
  <defs>${panels.map((_,i)=>`<clipPath id="phone${i}"><rect width="390" height="844" rx="24"/></clipPath>`).join('')}</defs>
  ${rect(0,0,1280,1070,'#F0F0EC',0)}
  ${text(25,43,'Féria  ·  手機介面設計方向',27,C.ink,600)}
  ${text(25,73,'規劃示意／非實作畫面。使用既有預設霧藍色，正式設計保留使用者主題與原有功能。',15,C.muted)}
  ${panels.map(([label,content],i)=>{const x=25+i*420;return text(x,113,label,16,C.ink,600)+`<g transform="translate(${x},132)">${rect(0,0,390,844,C.bg,24,'#D7D8D0')}<g clip-path="url(#phone${i})">${content}</g></g>`;}).join('')}
  ${text(25,1014,'視覺原則：清楚的層級  ·  單一主要動作  ·  柔色背景搭配深色文字  ·  保留 44–48px 觸控空間',16,C.ink,500)}
  ${text(25,1044,'此圖只表達一般狀態；草稿、衝突、離線、錯誤、長字與無障礙仍需互動與實機驗證。',14,C.muted)}
</svg>`;
await fs.writeFile(path.join(out,'uiux-design-direction.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(out,'uiux-design-direction.png'));
const lum = hex => {
  const a=hex.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return a[0]*0.2126+a[1]*0.7152+a[2]*0.0722;
};
const pairs = [
  ['正文',C.ink,C.bg,4.5], ['次要文字',C.muted,C.paper,4.5],
  ['主按鈕白字',C.paper,C.primary,4.5], ['主色系文字',C.primaryText,C.bg,4.5],
  ['標記文字',C.primaryText,C.blue,4.5], ['提醒',C.warn,C.warm,4.5],
  ['重要控制邊界',C.control,C.bg,3], ['營業狀態文字',C.good,C.paper,4.5],
];
const checks=pairs.map(([label,foreground,background,minimum])=>{
  const a=lum(foreground),b=lum(background),ratio=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  return {label,foreground,background,minimum,ratio,passes:ratio>=minimum};
});
await fs.writeFile(path.join(out,'uiux-design-contrast-check.json'),JSON.stringify({scope:'Selected solid color pairs in static report illustration only; not full app accessibility compliance.',checks},null,2)+'\n');
if(checks.some(check=>!check.passes))throw new Error('Illustration color-pair contrast failed.');
console.log('Created SVG and PNG report illustrations (1280 x 1070).');
