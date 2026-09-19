import type {
  CandidateOption,
  DraftReadiness,
  EvidenceSpan,
  FieldCandidate,
  MarketFormField,
  ParseMarketTextRequest,
  ParseMarketTextResponse,
  ParsedDateValue,
  ParsedMarketDraft,
  ParsedMarketEvent,
  ParsedMoneyValue,
  ParsedEquipmentValue,
  ParsedTimeValue,
} from './types';

const MAX_INPUT_CODE_POINTS = 20_000;
const DAY_MS = 86_400_000;

interface SourceLine {
  index: number;
  text: string;
  start: number;
  end: number;
}

interface ParserContext {
  inputText: string;
  referenceDate: string;
  lines: SourceLine[];
  evidence: EvidenceSpan[];
  evidenceKeys: Map<string, string>;
  warnings: ParsedMarketDraft['warnings'];
  ignoreSpans: ParsedMarketDraft['ignoreSpans'];
  sensitiveSpans: ParsedMarketDraft['sensitiveSpans'];
}

interface DateAtom {
  year: number | null;
  month: number;
  day: number;
  start: number;
  end: number;
}

interface EventDraft {
  event: ParsedMarketEvent;
  name: string | null;
  location: string | null;
}

const normalizeForMatch = (value: string): string => value
  .normalize('NFKC')
  .replace(/[：︰]/g, ':')
  .replace(/[–—－]/g, '-')
  .replace(/[〜～]/g, '~')
  .replace(/[ 	]+/g, ' ')
  .trim();

const isValidDateKey = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const dateKey = (year: number, month: number, day: number): string | null => {
  const value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isValidDateKey(value) ? value : null;
};

const enumerateDates = (start: string, end: string): string[] => {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return [];
  const output: string[] = [];
  for (let time = startTime; time <= endTime; time += DAY_MS) {
    output.push(new Date(time).toISOString().slice(0, 10));
  }
  return output;
};

const splitSourceLines = (inputText: string): SourceLine[] => {
  const codePoints = Array.from(inputText);
  const lines: SourceLine[] = [];
  let start = 0;
  let index = 0;
  for (let cursor = 0; cursor <= codePoints.length; cursor += 1) {
    if (cursor !== codePoints.length && codePoints[cursor] !== '\n') continue;
    let end = cursor;
    if (end > start && codePoints[end - 1] === '\r') end -= 1;
    lines.push({ index, text: codePoints.slice(start, end).join(''), start, end });
    start = cursor + 1;
    index += 1;
  }
  return lines;
};

const addEvidence = (
  context: ParserContext,
  line: SourceLine,
  text = line.text,
): string => {
  const linePoints = Array.from(line.text);
  const textPoints = Array.from(text);
  let offset = -1;
  outer: for (let index = 0; index <= linePoints.length - textPoints.length; index += 1) {
    for (let inner = 0; inner < textPoints.length; inner += 1) {
      if (linePoints[index + inner] !== textPoints[inner]) continue outer;
    }
    offset = index;
    break;
  }
  if (offset < 0) throw new Error(`evidence text is not present on source line: ${text}`);
  const start = line.start + offset;
  const end = start + textPoints.length;
  const key = `input:${start}:${end}`;
  const existing = context.evidenceKeys.get(key);
  if (existing) return existing;
  const id = `evidence-${context.evidence.length + 1}`;
  context.evidence.push({ id, source: 'input_text', start, end, text });
  context.evidenceKeys.set(key, id);
  return id;
};

const addReferenceEvidence = (context: ParserContext): string => {
  const key = `reference:${context.referenceDate}`;
  const existing = context.evidenceKeys.get(key);
  if (existing) return existing;
  const id = `evidence-${context.evidence.length + 1}`;
  context.evidence.push({
    id,
    source: 'reference_date',
    start: null,
    end: null,
    text: context.referenceDate,
  });
  context.evidenceKeys.set(key, id);
  return id;
};

const addWarning = (
  context: ParserContext,
  code: ParsedMarketDraft['warnings'][number]['code'],
  severity: ParsedMarketDraft['warnings'][number]['severity'],
  evidenceIds: string[],
  field?: MarketFormField,
): void => {
  context.warnings.push({
    id: `warning-${context.warnings.length + 1}`,
    code,
    severity,
    field,
    evidenceIds,
  });
};

const addCandidate = <T>(
  event: ParsedMarketEvent,
  field: MarketFormField,
  status: FieldCandidate<T>['status'],
  value: T | null,
  evidenceIds: string[],
  reasonCode: string,
  options?: CandidateOption<T>[],
): FieldCandidate<T> => {
  const id = `${event.id}-${field}-${event.candidates.filter((candidate) => candidate.field === field).length + 1}`;
  const applyPolicy = status === 'choice_required'
    ? 'requires_option'
    : status === 'exact' || status === 'inferable'
      ? 'eligible'
      : 'never';
  const candidate: FieldCandidate<T> = {
    id,
    field,
    status,
    value,
    evidenceIds,
    reasonCode,
    applyPolicy,
    ...(options && options.length > 0 ? { options } : {}),
  };
  event.candidates.push(candidate as FieldCandidate<unknown>);
  event.candidateIds.push(id);
  return candidate;
};

const isAdministrativeDateLine = (line: string): boolean => (
  /(招募|徵選|報名截止|報名時間|繳費|匯款|付款|公告|公佈|對帳|審稿|公開|確認.{0,4}截止|回覆.{0,4}前|優惠時間)/.test(line)
  && !/(錄取日期|入選日期|錄取參加日|報名日期[:：].*(?:\d{1,2}[/.月]\d{1,2}))/i.test(line)
);

const isRejectInput = (text: string): boolean => {
  const normalized = normalizeForMatch(text);
  if (/(撤回報名|無法前往.{0,20}(?:取消|放棄)|需向您取消|取消參加)/.test(normalized)) return true;
  if (/(?:行李)?包車意願登記/.test(normalized) && !/(?:活動|市集)(?:日期|時間|地點)\s*[：:｜|]/.test(normalized)) return true;
  if (/(IG|限時動態).{0,30}(合作|報價)|單篇圖文合作/.test(normalized)) return true;
  if (/快閃櫃/.test(normalized) && /[2二]\s*[~～至-]\s*[3三]\s*個月/.test(normalized)) return true;
  if (/品牌徵選/.test(normalized) && /有機會參與/.test(normalized)) return true;
  if (/(月結\s*50\s*天|品牌需排班|百貨抽成)/.test(normalized) && /(?:28天|進駐|檔期)/.test(normalized)) return true;
  return false;
};

const looksLikeLabel = (line: string): boolean => /^(?:[▪▩★✓>\\\s]*|\d+[.、]\s*)?(?:活動|市集|本次|原錄取|錄取|入選|報名|招募|徵選|繳費|匯款|付款|公告|地點|日期|時間|費用|設備|攤位|保證金|品牌|聯絡|電子|E-?MAIL|Email|姓名|地址|商品|回答|是否|進場|撤場|報到|檔期|租金)[^｜|]{0,14}[：:｜|]/i.test(line);

const cleanHeading = (line: string): string => line
  .replace(/^[>\s\\]+/, '')
  .replace(/^[◤◢▚▩▪★✓]+\s*/, '')
  .replace(/[◤◢]$/g, '')
  .replace(/\s*(?:攤商與合作夥伴)?報名表(?:回函)?$/i, '')
  .trim();

const isEventHeading = (lines: SourceLine[], index: number): boolean => {
  const raw = lines[index]?.text.trim() ?? '';
  const line = cleanHeading(raw);
  if (!line || line.length > 80) return false;
  if (/^活動[一二三四五六七八九十\d]+[｜|]/.test(line)) return true;
  if (/^[^：:]{1,10}場[：:].*\d{1,2}[/.]\d{1,2}/.test(line)) return true;
  if (looksLikeLabel(line)) return false;
  if (/[。！!?]$/.test(line)) return false;
  if (/(同步招募中|活動資訊|市集資訊|報名資訊|費用說明|注意事項|確認金額|引用錄取資訊|兩場場次時間與地點|活動邀請|最新場次|回函|報名表|已選場次|公開場次|請見.*表單|合作店品牌進駐)/.test(raw)) return false;
  if (/生活節/.test(line) && lines.slice(index + 1, index + 5).some((item) => /^[^：:]{1,10}場[：:]/.test(item.text.trim()))) return false;
  if (/(廣場|倉庫|會展中心|公園)/.test(line) && !/(活動|場次|嘉年華|生活節|設計節)/.test(line)) return false;
  if (!/(市集|嘉年華|生活節|設計節|餐酒節|派對|Party|活動|場次|小市|開嘉|法國生活節)/i.test(line)) {
    const nextTwo = lines.slice(index + 1, index + 3).map((item) => item.text).join('\n');
    if (/日期\s*[：:]|\d{1,2}[/.]\d{1,2}/.test(nextTwo) && /地點\s*[：:]/.test(nextTwo)) return true;
    if (!/^(?:台北|新北|桃園|台中|台南|高雄|嘉義|宜蘭)[｜|].+/.test(line)) return false;
  }
  const previous = [...lines.slice(0, index)].reverse().find((item) => item.text.trim());
  if (previous && /^\d{1,2}[/.]\d{1,2}/.test(previous.text.trim()) && /市集/.test(line)) return true;
  const following = lines.slice(index + 1, index + 5).map((item) => normalizeForMatch(item.text)).join('\n');
  return /(日期|場次|\d{1,4}[/.月]\d{1,2})/.test(following);
};

const findEventSegments = (lines: SourceLine[]): SourceLine[][] => {
  const headingIndexes = lines
    .map((_, index) => index)
    .filter((index) => isEventHeading(lines, index));
  if (headingIndexes.length < 2) return [lines];

  const commonPrefix = lines.slice(0, headingIndexes[0]);
  const useCommonPrefix = headingIndexes.some((index) => /^(?:台北|新北|桃園|台中|台南|高雄|嘉義|宜蘭)[｜|]/.test(lines[index].text.trim()));
  const segments = headingIndexes.map((start, headingOffset) => {
    const nextHeading = headingIndexes[headingOffset + 1];
    const nextHasDatePrelude = nextHeading !== undefined && /^\d{1,2}[/.]\d{1,2}/.test(lines[nextHeading - 1]?.text.trim() ?? '');
    const normalEnd = nextHeading === undefined ? lines.length : nextHasDatePrelude ? nextHeading - 1 : nextHeading;
    const trailingNonEvent = lines.findIndex((line, index) => (
      index > start && index < normalEnd && /^(?:合作店品牌進駐|進駐全臺遊牧商店|中山店寄售)/.test(line.text.trim())
    ));
    const end = trailingNonEvent >= 0 ? trailingNonEvent : normalEnd;
    const previousNonBlank = [...lines.slice(0, start)].reverse().find((line) => line.text.trim());
    const datePrelude = previousNonBlank && /^\d{1,2}[/.]\d{1,2}\s*(?:[-~～至]\s*\d{1,2}(?:[/.]\d{1,2})?)?$/.test(previousNonBlank.text.trim())
      ? [previousNonBlank]
      : [];
    const cityDateHeading = /^[^：:]{1,10}場[：:].*\d{1,2}[/.]\d{1,2}/.test(lines[start].text.trim());
    const parentHeading = cityDateHeading
      ? [...lines.slice(0, start)].reverse().find((line) => /生活節/.test(line.text) && !looksLikeLabel(line.text))
      : undefined;
    const prefix = useCommonPrefix ? commonPrefix : parentHeading ? [parentHeading] : datePrelude;
    return [...prefix, ...lines.slice(start, end)];
  });
  return segments.length >= 2 ? segments : [lines];
};

const extractName = (lines: SourceLine[]): { value: string; evidence: SourceLine[] } | null => {
  for (const line of lines) {
    const quoted = line.text.match(/[「《]([^」》]{2,80})[」》]/);
    if (quoted && /(錄取|報名|企劃|參與|籌備)/.test(line.text) && !/過去/.test(line.text)) {
      return { value: quoted[1].trim(), evidence: [line] };
    }
    if (quoted && line.text.trim().startsWith(quoted[0]) && (/(?:市集|活動|派對)/.test(quoted[1]) || /》是一場/.test(line.text))) {
      return { value: quoted[1].trim(), evidence: [line] };
    }
  }

  const cityDate = lines.find((line) => /^([^：:]{1,10}場)[：:].*\d{1,2}[/.]\d{1,2}/.test(line.text.trim()));
  const parent = lines.find((line) => /生活節/.test(line.text) && !looksLikeLabel(line.text));
  if (cityDate && parent) {
    const city = cityDate.text.trim().match(/^([^：:]{1,10}場)[：:]/)?.[1];
    if (city) return { value: `${cleanHeading(parent.text)}｜${city}`, evidence: [parent, cityDate] };
  }

  for (const line of lines) {
    const raw = cleanHeading(line.text);
    const notified = raw.match(/通知您錄取\s+(.+)$/);
    if (notified) {
      const parts = notified[1].split(/[｜|]/).map((part) => part.trim());
      const value = parts.length >= 3 && /\d{1,2}[/.]\d{1,2}/.test(parts[1])
        ? `${parts[0]}｜${parts.slice(2).join('｜')}`
        : notified[1].trim();
      return { value, evidence: [line] };
    }
    const registered = raw.match(/感謝您報名\s+(.+?)(?:，|,).*?(?:已錄取|錄取)/);
    if (registered) return { value: registered[1].trim(), evidence: [line] };
    const inline = raw.match(/(?:錄取|參與)(?!日期)(?:此次活動|本次活動)?\s*([^，。\n]{3,80}?(?:市集|嘉年華|生活節|活動|派對))(?:，|。|！|$)/);
    if (inline) return { value: inline[1].trim(), evidence: [line] };
  }

  const headingLine = lines.find((line, index) => isEventHeading(lines, index))
    ?? lines.find((line) => {
      const value = line.text.trim();
      return value.length >= 3
        && value.length <= 70
        && !looksLikeLabel(value)
        && !/[。]$/.test(value)
        && /(市集|嘉年華|生活節|設計節|餐酒節|派對|小市)/i.test(value)
        && !/(資訊|招募期間|同步招募|主辦您好|者請留意)/.test(value);
    })
    ?? lines.find((line, index) => {
      const value = line.text.trim();
      const following = lines.slice(index + 1, index + 4).map((item) => item.text).join('\n');
      return value.length >= 3
        && value.length <= 70
        && !looksLikeLabel(value)
        && !/[。]$/.test(value)
        && !/活動資訊|市集資訊/.test(value)
        && /(?:日期|場次|活動時間|市集時間).{0,8}\d{1,4}[/.月]\d{1,2}/.test(following);
    });
  if (!headingLine) return null;
  let value = cleanHeading(headingLine.text);
  const dateBetween = value.match(/^([^｜|]+)[｜|]\s*\d{1,2}[/.]\d{1,2}[^｜|]*[｜|](.+)$/);
  if (dateBetween) value = `${dateBetween[1].trim()}｜${dateBetween[2].trim()}`;
  if (/^活動[一二三四五六七八九十\d]+[｜|]/.test(value)) return { value, evidence: [headingLine] };
  if (/^(?:邊緣人市集)[｜|]/.test(value)) value = value.split(/[｜|]/)[0].trim();
  if (/^(?:台北|新北|桃園|台中|台南|高雄|嘉義|宜蘭)[｜|].*(?:市集|嘉年華)/.test(value)) {
    value = value.split(/[｜|]/).slice(1).join('｜').trim();
  }
  value = value
    .replace(/活動報名費用開立發票$/, '')
    .replace(/候補錄取通知$/, '')
    .replace(/\s*攤商招募$/, '')
    .replace(/[｜|]錄取日期與費用$/, '')
    .replace(/[｜|]活動場次為.+$/, '')
    .replace(/[｜|]\d{1,2}[/.]\d{1,2}.+場次錄取通知$/, '')
    .replace(/[｜|](?:入選攤友資訊|回報表單)$/, '')
    .replace(/，活動日期.+$/, '')
    .replace(/\s*[\\/]\s*$/, '')
    .trim();
  return value ? { value, evidence: [headingLine] } : null;
};

const extractLocation = (
  lines: SourceLine[],
  name: string | null,
): { value: string | null; status: 'exact' | 'choice_required'; evidence: SourceLine[]; options: string[] } | null => {
  for (const line of lines) {
    const match = line.text.trim().match(/^(?:(?:\d+[.、]\s*)|[▪▩★]\s*)?(?:(?:活動|市集|舉辦)?地點|場地)\s*[：:｜|]\s*(.+)$/);
    if (!match) continue;
    let value = match[1].replace(/[。；;]$/, '').trim();
    if (/^(?:台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|嘉義市).+（室內舉辦）$/.test(value)) {
      value = value.replace(/（室內舉辦）$/, '');
    }
    if (/^錄取日期與費用$/.test(value)) return null;
    if (/駁二藝術特區.*大勇.*大義/.test(value)) return null;
    const matchingValue = normalizeForMatch(value);
    const isChoice = /(依品牌|依攤型|文創.*(?:美食|餐車)|四輪以上餐車.*使用|(?:北|南|大勇|大義).*(?:廣場|廊道).*(?:北|南|大勇|大義))/.test(matchingValue);
    const options = isChoice
      ? value.split(/[；;、]|(?:及)/).map((item) => item.replace(/^(?:文創攤位|美食攤位|四輪以上餐車)(?:使用|在)?/, '').trim()).filter((item) => item.length >= 2)
      : [];
    return { value: isChoice ? null : value, status: isChoice ? 'choice_required' : 'exact', evidence: [line], options };
  }

  const heading = lines.find((line) => {
    const cleaned = cleanHeading(line.text);
    return Boolean(name && cleaned.startsWith(`${name}｜`) && cleaned.length > name.length + 1);
  });
  if (heading && name) {
    const suffix = cleanHeading(heading.text).slice(name.length + 1).trim();
    if (/^(?:錄取日期與費用|活動場次為|\d{1,2}[/.]\d{1,2}.+場次錄取通知)/.test(suffix)) return null;
    return {
      value: suffix,
      status: 'exact',
      evidence: [heading],
      options: [],
    };
  }
  const activityHeading = lines.find((line) => /^活動[一二三四五六七八九十\d]+[｜|]/.test(line.text.trim()));
  if (activityHeading) {
    const value = activityHeading.text.trim().split(/[｜|]/).slice(1).join('｜').trim();
    return { value, status: 'exact', evidence: [activityHeading], options: [] };
  }
  const cityDate = lines.find((line) => /^([^：:]{1,10})場[：:].*\d{1,2}[/.]\d{1,2}/.test(line.text.trim()));
  if (cityDate) {
    const city = cityDate.text.trim().match(/^([^：:]{1,10})場[：:]/)?.[1];
    if (city) return { value: city, status: 'exact', evidence: [cityDate], options: [] };
  }
  const cityVenue = lines.find((line) => /^(?:台北|新北|桃園|台中|台南|高雄|嘉義|宜蘭)[｜|].+/.test(line.text.trim()));
  if (cityVenue) {
    return { value: cityVenue.text.trim(), status: 'exact', evidence: [cityVenue], options: [] };
  }
  const bareVenue = lines.find((line) => {
    const value = line.text.trim();
    return value.length >= 3
      && value.length <= 80
      && !looksLikeLabel(value)
      && !/\d{1,2}:\d{2}|元|\[REGISTRATION_URL\]/.test(value)
      && !/(入選攤友資訊|錄取通知)/.test(value)
      && /(廣場|公園|倉庫|會展中心|文創園區|火車站|咖啡|衛武營|MAJI|K-ARENA|新光三越)/i.test(value);
  });
  if (bareVenue) return { value: bareVenue.text.trim(), status: 'exact', evidence: [bareVenue], options: [] };
  const proseVenue = lines.find((line) => /此次市集起始點由(.+?)起始/.test(line.text));
  if (proseVenue) {
    const venue = proseVenue.text.match(/此次市集起始點由(.+?)起始/)?.[1];
    if (venue) return { value: `${venue}（市集起始點）`, status: 'exact', evidence: [proseVenue], options: [] };
  }
  return null;
};

const extractDateAtoms = (text: string): DateAtom[] => {
  const normalized = normalizeForMatch(text);
  const atoms: DateAtom[] = [];
  const expression = /(?:(民國)?(\d{2,4})(?:年|[/.]))?(\d{1,2})(?:月|[/.])(\d{1,2})(?:日)?/g;
  for (const match of normalized.matchAll(expression)) {
    const rawYear = match[2] ? Number(match[2]) : null;
    const year = rawYear === null ? null : match[1] ? rawYear + 1911 : rawYear;
    atoms.push({
      year,
      month: Number(match[3]),
      day: Number(match[4]),
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    });
  }
  return atoms.filter((atom) => atom.month >= 1 && atom.month <= 12 && atom.day >= 1 && atom.day <= 31);
};

const inferYear = (context: ParserContext, lines: SourceLine[], atoms: DateAtom[]): number => {
  const explicit = atoms.find((atom) => atom.year !== null)?.year;
  if (explicit) return explicit;
  const nearbyYear = lines.filter((line) => !isAdministrativeDateLine(normalizeForMatch(line.text))).map((line) => {
    const normalized = normalizeForMatch(line.text);
    return normalized.match(/(?:^|\D)(20\d{2})(?=年|[/.])/)?.[1]
      ?? normalized.match(/^(20\d{2})(?=\D)/)?.[1];
  }).find(Boolean);
  return nearbyYear ? Number(nearbyYear) : Number(context.referenceDate.slice(0, 4));
};

const dateValueFromLine = (
  context: ParserContext,
  allLines: SourceLine[],
  line: SourceLine,
): { value: ParsedDateValue; normalized: unknown; status: 'exact' | 'inferable' | 'unsupported'; evidenceIds: string[] } | null => {
  const fullNormalizedLine = normalizeForMatch(line.text);
  const normalizedLine = /(?:保留|更正為)/.test(fullNormalizedLine) && /(?:請假|取消)/.test(fullNormalizedLine)
    ? fullNormalizedLine.split(/[；;]/)[0]
    : fullNormalizedLine;
  const explicitYearMultipleRange = normalizedLine.match(/(20\d{2})[/.](\d{1,2})[/.](\d{1,2})\s*(?:-|~|至)\s*(\d{1,2})[/.](\d{1,2})\s*[、,，]\s*(\d{1,2})[/.](\d{1,2})\s*(?:-|~|至)\s*(\d{1,2})[/.](\d{1,2})/);
  if (explicitYearMultipleRange) {
    const year = Number(explicitYearMultipleRange[1]);
    const ranges = [
      [Number(explicitYearMultipleRange[2]), Number(explicitYearMultipleRange[3]), Number(explicitYearMultipleRange[4]), Number(explicitYearMultipleRange[5])],
      [Number(explicitYearMultipleRange[6]), Number(explicitYearMultipleRange[7]), Number(explicitYearMultipleRange[8]), Number(explicitYearMultipleRange[9])],
    ];
    const dates = ranges.flatMap(([startMonth, startDay, endMonth, endDay]) => {
      const start = dateKey(year, startMonth, startDay);
      const end = dateKey(year, endMonth, endDay);
      return start && end ? enumerateDates(start, end) : [];
    });
    if (dates.length > 0) {
      const evidenceIds = [addEvidence(context, line)];
      return {
        value: { kind: 'selected_dates', dates },
        normalized: dates,
        status: 'exact',
        evidenceIds,
      };
    }
  }
  const atoms = extractDateAtoms(normalizedLine);
  if (atoms.length === 0) return null;
  const year = inferYear(context, allLines, atoms);
  const partialSelectedDate = /(錄取日期|入選日期|報名日期)/.test(normalizedLine)
    && atoms.some((atom) => atom.year !== null)
    && atoms.some((atom) => atom.year === null);
  const selectedWithinExplicitOverview = /實際已選場次/.test(normalizedLine)
    && allLines.some((sourceLine) => /活動日期概覽.*20\d{2}[/.]/.test(normalizeForMatch(sourceLine.text)));
  const usesInference = (!atoms.some((atom) => atom.year !== null) && !selectedWithinExplicitOverview) || partialSelectedDate;
  const evidenceIds = [addEvidence(context, line)];
  if (usesInference) evidenceIds.unshift(addReferenceEvidence(context));

  if (/每週|每周|平日|假日/.test(normalizedLine)) {
    return {
      value: { kind: 'recurrence', rawRule: line.text.trim() },
      normalized: null,
      status: 'unsupported',
      evidenceIds,
    };
  }

  const dottedRange = normalizedLine.match(/(\d{4})[/.](\d{1,2})[/.](\d{1,2}).*?(?:-|~|至)\s*(?:(\d{4})[/.])?(\d{1,2})[/.](\d{1,2})/);
  if (dottedRange) {
    const start = dateKey(Number(dottedRange[1]), Number(dottedRange[2]), Number(dottedRange[3]));
    const end = dateKey(Number(dottedRange[4] ?? dottedRange[1]), Number(dottedRange[5]), Number(dottedRange[6]));
    if (start && end) {
      const dates = enumerateDates(start, end);
      const excludedDates = [...normalizedLine.matchAll(/(?:除夕\s*)?(\d{1,2})[/.](\d{1,2})(?=.{0,5}(?:休停|不舉行|除外))/g)]
        .map((match) => dateKey(Number(dottedRange[1]), Number(match[1]), Number(match[2])))
        .filter((date): date is string => Boolean(date));
      const keptDates = dates.filter((date) => !excludedDates.includes(date));
      if (dates.length > 14 && excludedDates.length === 0) {
        return {
          value: { kind: 'continuous_range', start, end, dayCount: dates.length },
          normalized: { start, end },
          status: 'exact',
          evidenceIds,
        };
      }
      if (/市集日期/.test(normalizedLine) && start.slice(0, 7) !== end.slice(0, 7) && excludedDates.length === 0) {
        return {
          value: { kind: 'continuous_range', start, end, dayCount: dates.length },
          normalized: { start, end },
          status: 'exact',
          evidenceIds,
        };
      }
      return {
        value: { kind: 'selected_dates', dates: keptDates },
        normalized: keptDates,
        status: 'exact',
        evidenceIds,
      };
    }
  }

  const resolved = atoms.map((atom, index) => {
    const previousYear = atoms.slice(0, index).reverse().find((item) => item.year !== null)?.year;
    return { ...atom, year: atom.year ?? previousYear ?? year };
  });
  const ranges: Array<{ start: string; end: string }> = [];
  const selected = new Set<string>();
  for (let index = 0; index < resolved.length; index += 1) {
    const atom = resolved[index];
    const start = dateKey(atom.year, atom.month, atom.day);
    if (!start) continue;
    const next = resolved[index + 1];
    const between = next ? normalizedLine.slice(atom.end, next.start) : '';
    const isRangeToNext = Boolean(next && /^[^\d]{0,6}(?:-|~|至)[^\d]{0,6}$/.test(between));
    if (isRangeToNext && next) {
      const end = dateKey(next.year, next.month, next.day);
      if (end) ranges.push({ start, end });
      index += 1;
      continue;
    }
    const tail = normalizedLine.slice(atom.end);
    const dayOnlyEnd = tail.match(/^\s*(?:-|~|至)\s*(\d{1,2})(?![:/.\d])/);
    if (dayOnlyEnd) {
      const end = dateKey(atom.year, atom.month, Number(dayOnlyEnd[1]));
      if (end) ranges.push({ start, end });
    } else {
      selected.add(start);
    }
  }

  if (ranges.length > 0 && selected.size === 0) {
    if (ranges.length === 1) {
      const dates = enumerateDates(ranges[0].start, ranges[0].end);
      if (dates.length > 14) {
        return {
          value: { kind: 'continuous_range', ...ranges[0], dayCount: dates.length },
          normalized: ranges[0],
          status: usesInference ? 'inferable' : 'exact',
          evidenceIds,
        };
      }
      dates.forEach((date) => selected.add(date));
    } else if (ranges.some((range) => enumerateDates(range.start, range.end).length > 14)) {
      return {
        value: { kind: 'multiple_ranges', ranges },
        normalized: ranges,
        status: usesInference ? 'inferable' : 'exact',
        evidenceIds,
      };
    } else {
      ranges.flatMap((range) => enumerateDates(range.start, range.end)).forEach((date) => selected.add(date));
    }
  } else {
    ranges.flatMap((range) => enumerateDates(range.start, range.end)).forEach((date) => selected.add(date));
  }

  const excluded = [...normalizedLine.matchAll(/(\d{1,2})[/.](\d{1,2}).{0,8}(?:休停|不舉行|除外)/g)]
    .map((match) => dateKey(year, Number(match[1]), Number(match[2])))
    .filter((date): date is string => Boolean(date));
  excluded.forEach((date) => selected.delete(date));
  const dates = [...selected].sort();
  if (dates.length === 0) return null;
  return {
    value: { kind: 'selected_dates', dates },
    normalized: dates,
    status: usesInference ? 'inferable' : 'exact',
    evidenceIds,
  };
};

const findDateCandidate = (
  context: ParserContext,
  lines: SourceLine[],
): {
  value: ParsedDateValue;
  normalized: unknown;
  status: 'exact' | 'inferable' | 'choice_required' | 'unsupported' | 'conflict';
  evidenceIds: string[];
  optionDates?: string[];
} | null => {
  const normalizedLines = lines.map((line) => ({ line, normalized: normalizeForMatch(line.text) }));
  const externalSelection = normalizedLines.find(({ normalized }) => /(實際入選|實際入圍).*(?:請見|查詢|表單|公告)/.test(normalized));
  if (externalSelection) {
    const evidenceIds = [addEvidence(context, externalSelection.line)];
    addWarning(context, 'external_value_unavailable', 'blocking', evidenceIds, 'dates');
    return {
      value: { kind: 'recurrence', rawRule: externalSelection.line.text.trim() },
      normalized: null,
      status: 'unsupported',
      evidenceIds,
    };
  }
  const corrected = normalizedLines.find(({ normalized }) => /(?:保留|更正為|調整成).{0,12}\d{1,4}[/.月]\d{1,2}/.test(normalized));
  const regularExplicitEvent = normalizedLines.filter(({ normalized }) => (
    !isAdministrativeDateLine(normalized)
    && /(?:活動日期|市集日期|擺攤日期|已選參加日期|錄取場次|日期區間|檔期|^(?:[▪▩★]\s*|\d+[.、]\s*)?日期\s*[:｜|]|^(?:活動|市集)時間\s*[:｜|]\s*\d{2,4}[/.]|^[^：:]{1,10}場[：:].*\d{1,2}[/.]\d{1,2})/.test(normalized)
  ));
  const explicitEvent = regularExplicitEvent.length > 0
    ? regularExplicitEvent
    : normalizedLines.filter(({ normalized }) => (
      !isAdministrativeDateLine(normalized)
      && /^(?:活動|市集)時間\s*[:｜|]/.test(normalized)
      && extractDateAtoms(normalized).length >= 2
    ));
  const choice = normalizedLines.find(({ normalized }) => (
    /(?:可參加場次|都還有位子)/.test(normalized) && extractDateAtoms(normalized).length > 0
  ));
  const selected = normalizedLines.filter(({ normalized }) => (
    !isAdministrativeDateLine(normalized)
    && /(?:錄取日期|入選日期|入選場次|本次錄取參加日|參與日期|欲報名日期|(?:實際)?已選場次|保留|通知您錄取).*(?:\d{1,4}[/.月]\d{1,2})/.test(normalized)
  ));
  const preferred = normalizedLines.filter(({ normalized }) => (
    !isAdministrativeDateLine(normalized)
    && /(?:^[✓]\s*\d{1,4}[/.月]\d{1,2}|^\d{1,4}[/.月]\d{1,2})/.test(normalized)
  ));
  const registrationDate = normalizedLines.filter(({ normalized }) => (
    /報名日期.*\d{1,2}[/.月]\d{1,2}/.test(normalized)
    && /(感謝|錄取|入選)/.test(lines.map((line) => line.text).join('\n'))
  ));
  const sources = corrected
    ? [corrected]
    : selected.length > 0
      ? selected
      : explicitEvent.length > 0
        ? explicitEvent
        : registrationDate.length > 0
          ? registrationDate
          : preferred;
  if (choice) {
    const parsedChoice = dateValueFromLine(context, lines, choice.line);
    if (parsedChoice?.value.kind === 'selected_dates') {
      const dates = /可參加場次/.test(choice.normalized) ? [] : parsedChoice.value.dates;
      return {
        value: { kind: 'selected_dates', dates },
        normalized: dates,
        status: 'choice_required',
        evidenceIds: parsedChoice.evidenceIds,
        optionDates: parsedChoice.value.dates,
      };
    }
  }
  if (sources.length === 0) return null;

  if (corrected && /(?:調整成|更正為)/.test(corrected.normalized)) {
    const conflicting = normalizedLines.find(({ line, normalized }) => (
      line.index !== corrected.line.index
      && /^(?:時間|日期)\s*[：:｜|]/.test(normalized)
      && extractDateAtoms(normalized).some((atom) => atom.year !== null)
    ));
    if (conflicting) {
      const left = dateValueFromLine(context, lines, corrected.line);
      const right = dateValueFromLine(context, lines, conflicting.line);
      if (left?.value.kind === 'selected_dates' && right?.value.kind === 'selected_dates') {
        const dates = [...new Set([...left.value.dates, ...right.value.dates])];
        return {
          value: { kind: 'selected_dates', dates },
          normalized: dates,
          status: 'conflict',
          evidenceIds: [...new Set([...left.evidenceIds, ...right.evidenceIds])],
        };
      }
    }
  }

  const parsed = sources
    .map(({ line }) => dateValueFromLine(context, lines, line))
    .filter((value): value is NonNullable<ReturnType<typeof dateValueFromLine>> => value !== null);
  if (parsed.length === 0) return null;
  if (parsed.length === 1 || parsed.some((value) => value.value.kind !== 'selected_dates')) return parsed[0];
  const dates = [...new Set(parsed.flatMap((value) => (
    value.value.kind === 'selected_dates' ? value.value.dates : []
  )))].sort();
  return {
    value: { kind: 'selected_dates', dates },
    normalized: dates,
    status: parsed.every((value) => value.status === 'exact') ? 'exact' : 'inferable',
    evidenceIds: [...new Set(parsed.flatMap((value) => value.evidenceIds))],
  };
};

const parseTimes = (context: ParserContext, lines: SourceLine[], event: ParsedMarketEvent): void => {
  const entries = lines.map((line) => ({ line, normalized: normalizeForMatch(line.text) }));
  const timeExpression = /(\d{1,2}):(\d{2})\s*(?:-|~|至)\s*(\d{1,2}):(\d{2})/;
  const normalizeTime = (hour: string, minute: string): string => `${hour.padStart(2, '0')}:${minute}`;

  const labeledOperatingLines = entries.filter(({ normalized }) => /^(?:[▪▩★]\s*)?(?:活動|市集)?時間\s*[:｜|]/.test(normalized));
  const inlineOperatingLines = entries.filter(({ normalized }) => (
    labeledOperatingLines.length === 0
    && /\d{1,4}[/.月]\d{1,2}/.test(normalized)
    && timeExpression.test(normalized)
    && !/(報到|進場|撤場|截止|匯款|付款)/.test(normalized)
  ));
  const operatingLines = labeledOperatingLines.length > 0 ? labeledOperatingLines : inlineOperatingLines;
  if (operatingLines.length === 1) {
    const { line, normalized } = operatingLines[0];
    const match = normalized.match(timeExpression);
    const timeRanges = [...normalized.matchAll(new RegExp(timeExpression.source, 'g'))];
    const conditional = /平日|假日|最後一日/.test(normalized) || timeRanges.length > 1;
    if (match && !conditional) {
      const evidenceIds = [addEvidence(context, line)];
      addCandidate<ParsedTimeValue>(event, 'operatingStartTime', 'exact', {
        kind: 'single', start: normalizeTime(match[1], match[2]),
      }, evidenceIds, 'explicit_operating_start');
      addCandidate<ParsedTimeValue>(event, 'operatingEndTime', 'exact', {
        kind: 'single', end: normalizeTime(match[3], match[4]),
      }, evidenceIds, 'explicit_operating_end');
    } else if (match) {
      const evidenceIds = [addEvidence(context, line)];
      addWarning(context, 'conditional_schedule_unsupported', 'warning', evidenceIds, 'operatingStartTime');
    }
  }

  for (const { line, normalized } of entries) {
    const match = normalized.match(timeExpression);
    const single = normalized.match(/(?:報到時間|進場時間|提前進場)\s*[:｜|]\s*(\d{1,2}):(\d{2})(?!\s*(?:-|~|至))/);
    if (!match && !single) continue;
    const evidenceIds = [addEvidence(context, line)];
    if (/報到時間/.test(normalized) && match) {
      addCandidate<ParsedTimeValue>(event, 'checkInTime', 'unsupported', {
        kind: 'window',
        start: normalizeTime(match[1], match[2]),
        end: normalizeTime(match[3], match[4]),
      }, evidenceIds, 'check_in_window_unsupported');
      addWarning(context, 'conditional_schedule_unsupported', 'warning', evidenceIds, 'checkInTime');
    } else if (/(?:進場時間|提前進場)/.test(normalized) && match) {
      addCandidate<ParsedTimeValue>(event, 'earlyEntryTime', 'unsupported', {
        kind: 'window',
        start: normalizeTime(match[1], match[2]),
        end: normalizeTime(match[3], match[4]),
      }, evidenceIds, 'entry_window_unsupported');
      addWarning(context, 'conditional_schedule_unsupported', 'warning', evidenceIds, 'earlyEntryTime');
    } else if (/報到時間/.test(normalized) && single) {
      addCandidate<ParsedTimeValue>(event, 'checkInTime', 'exact', {
        kind: 'single', start: normalizeTime(single[1], single[2]),
      }, evidenceIds, 'explicit_check_in_time');
    } else if (/(?:進場時間|提前進場)/.test(normalized) && single) {
      addCandidate<ParsedTimeValue>(event, 'earlyEntryTime', 'exact', {
        kind: 'single', start: normalizeTime(single[1], single[2]),
      }, evidenceIds, 'explicit_entry_time');
    }
  }
};

const parseAmount = (value: string): number | null => {
  const match = value.match(/([\d,]+)\s*元/);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : null;
};

const splitClauses = (value: string): string[] => value
  .replace(/(\d),(?=\d{3}\b)/g, '$1__THOUSANDS__')
  .split(/[；;,、。+]/)
  .map((part) => part.replace(/__THOUSANDS__/g, ',').trim())
  .filter(Boolean);

const moneyUnit = (value: string): ParsedMoneyValue['unit'] => (
  /[／/]\s*(?:日|天)|每天|每日/.test(value)
    ? 'per_day'
    : /[／/]\s*(?:張|支|座|組|個|台)|每\s*(?:張|支|座|組|個|台)/.test(value)
      ? 'per_item'
      : /(?:整場|本次|本場|活動\s*\d*\s*天|\d+\s*日.*(?:攤位費|攤位租金))/.test(value)
        ? 'per_event'
        : 'unknown'
);

const selectedDates = (event: ParsedMarketEvent): string[] | undefined => {
  const candidate = event.candidates.find((item) => item.field === 'dates');
  if (!candidate?.value || typeof candidate.value !== 'object' || !('kind' in candidate.value)) return undefined;
  if (candidate.value.kind !== 'selected_dates' || !('dates' in candidate.value) || !Array.isArray(candidate.value.dates)) return undefined;
  return candidate.value.dates.filter((value): value is string => typeof value === 'string');
};

const equipmentType = (value: string): ParsedEquipmentValue['type'] | null => {
  if (/(?:桌|table)/i.test(value)) return 'table';
  if (/(?:椅|chair)/i.test(value)) return 'chair';
  if (/(?:傘|陽傘|遮陽傘|umbrella|parasol)/i.test(value)) return 'umbrella';
  if (/(?:帳篷|歐帳|棚|tent)/i.test(value)) return 'tent';
  if (/(?:電力|供電|用電|插座|發電機|power)/i.test(value)) return 'power';
  return null;
};

const equipmentQuantity = (value: string, type: ParsedEquipmentValue['type']): number | undefined => {
  const noun = type === 'table'
    ? '(?:長桌|桌子|桌)'
    : type === 'chair'
      ? '(?:折疊椅|塑膠椅|PE ?椅|椅子|椅)'
      : type === 'umbrella'
        ? '(?:遮陽傘|陽傘|傘)'
        : type === 'tent'
          ? '(?:帳篷|歐帳|棚)'
          : '(?:電力|供電|用電)';
  const match = value.match(new RegExp(`${noun}\\s*([0-9]+|一|兩|二|三|四)\\s*(?:張|支|座|頂|組|台)`, 'i'))
    ?? value.match(new RegExp(`(一|兩|二|三|四)\\s*${noun}`, 'i'));
  if (!match) return undefined;
  const chinese: Record<string, number> = { 一: 1, 兩: 2, 二: 2, 三: 3, 四: 4 };
  return chinese[match[1]] ?? Number(match[1]);
};

const currencyFor = (context: ParserContext, value: string): Pick<ParsedMoneyValue, 'currency' | 'currencyStatus'> => {
  const allText = context.inputText;
  if (/(?:新台幣|NTD|TWD)/i.test(value)) return { currency: 'TWD', currencyStatus: 'exact' };
  if (/(?:台北|新北|桃園|新竹|台中|彰化|嘉義|台南|高雄|屏東|宜蘭|花蓮|台東|澎湖|金門|連江|大港開唱|駁二|松山文創|衛武營|南紡|愛河|新光三越)/.test(allText)) {
    return { currency: 'TWD', currencyStatus: 'inferable' };
  }
  return { currency: null, currencyStatus: 'unknown' };
};

const parseMoneyAndEquipment = (
  context: ParserContext,
  lines: SourceLine[],
  event: ParsedMarketEvent,
): void => {
  const entries = lines.map((line) => ({ line, normalized: normalizeForMatch(line.text) }));
  const selectedBoothKind = normalizeForMatch(context.inputText).match(/(?:錄取日期|入選日期).{0,40}(大攤|小攤)/)?.[1] ?? null;
  const priceParts: Array<{ line: SourceLine; text: string; label: string; amount: number }> = [];
  for (const { line, normalized } of entries) {
    if (/(?:應繳|應付|已收|收到|匯款|租物費|器材|設備|桌子|椅子|陽傘|遮陽傘|電力|用電|便當|費用總額)/.test(normalized)) continue;
    const before = priceParts.length;
    for (const rawPart of splitClauses(normalized)) {
      const amount = parseAmount(rawPart);
      if (amount === null || !/(?:攤|格|餐車|三輪車|文創|全棚|半棚|棚位)/.test(rawPart)) continue;
      const label = rawPart.replace(/[：:]?\s*[\d,]+\s*元.*$/, '').replace(/^(?:攤位費|市集費用|費用)\s*[:：]?/, '').trim();
      if (label) priceParts.push({ line, text: rawPart.trim(), label, amount });
    }
    if (priceParts.length === before) {
      const amounts = [...normalized.matchAll(/([\d,]+)\s*元/g)];
      if (amounts.length === 1 && /(?:攤|格|餐車|三輪車|文創|全棚|半棚|棚位)/.test(normalized)) {
        const amount = Number(amounts[0][1].replace(/,/g, ''));
        const label = normalized.slice(0, amounts[0].index).replace(/^(?:攤位費|市集費用|費用)\s*[:：]?/, '').trim();
        if (label) priceParts.push({ line, text: normalized, label, amount });
      }
    }
  }

  if (priceParts.length >= 2) {
    const evidenceIds = [...new Set(priceParts.map((part) => addEvidence(context, part.line)))];
    const dateDependent = new Set(priceParts.map((part) => part.line.index)).size >= 2
      && priceParts.every((part) => /\d{1,4}[/.]\d{1,2}/.test(normalizeForMatch(part.line.text)));
    if (dateDependent) {
      const candidate = addCandidate(event, 'boothCost', 'unsupported', null, evidenceIds, 'date_dependent_fee_unsupported');
      candidate.applyPolicy = 'never';
      addWarning(context, 'fee_date_mapping_unknown', 'warning', evidenceIds, 'boothCost');
    } else {
    const options: CandidateOption<ParsedMoneyValue>[] = priceParts.map((part, index) => {
      const currency = currencyFor(context, part.text);
      return {
        id: `${event.id}-boothCost-option-${index + 1}`,
        value: {
          amount: part.amount,
          ...currency,
          role: 'published_booth_price',
          unit: moneyUnit(part.text),
        },
        evidenceIds: [addEvidence(context, part.line)],
        linkedCandidateIds: [],
      };
    });
    const candidate = addCandidate<ParsedMoneyValue>(
      event, 'boothCost', 'choice_required', null, evidenceIds, 'published_booth_options', options,
    );
    options.forEach((option) => option.linkedCandidateIds.push(candidate.id));

    let locationCandidate = event.candidates.find((item) => item.field === 'location' && item.status === 'choice_required');
    if (!locationCandidate) {
      const locationLine = entries.find(({ normalized }) => /^(?:[▪▩★]\s*)?地點\s*[:｜|]/.test(normalized));
      const areaKeys = priceParts.map((part) => part.label.match(/^(.{2,4}區)/)?.[1] ?? null);
      if (locationLine && areaKeys.every((key): key is string => Boolean(key))) {
        const locationText = locationLine.normalized.replace(/^(?:[▪▩★]\s*)?地點\s*[:｜|]\s*/, '');
        const locationValues = areaKeys.map((key) => locationText.split(/[／/]/).find((part) => part.includes(key))?.trim() ?? null);
        if (locationValues.every((value): value is string => Boolean(value))) {
          const locationEvidenceIds = [addEvidence(context, locationLine.line)];
          const locationOptions: CandidateOption<string>[] = locationValues.map((value, index) => ({
            id: `${event.id}-location-option-${index + 1}`,
            value,
            evidenceIds: locationEvidenceIds,
            linkedCandidateIds: [],
          }));
          locationCandidate = addCandidate(event, 'location', 'choice_required', null, locationEvidenceIds,
            'location_depends_on_stall_type', locationOptions);
          locationOptions.forEach((option) => option.linkedCandidateIds.push(locationCandidate!.id));
          addWarning(context, 'choice_required', 'blocking', locationEvidenceIds, 'location');
        }
      }
    }
    if (locationCandidate?.options?.length === options.length) {
      locationCandidate.options.forEach((locationOption, index) => {
        locationOption.linkedCandidateIds.push(candidate.id);
        options[index].linkedCandidateIds.push(locationCandidate.id);
      });
    }
    addWarning(context, 'choice_required', 'blocking', evidenceIds, 'boothCost');
    }
  }

  const selectedLine = entries.find(({ normalized }) => (
    /(?:本次活動\d*天的?攤位租金|活動\d*天攤位租金|(?:[一二兩三四五六七八九十\d]+日|\d+天)(?:大攤|小攤|攤位費)|攤位費(?:用)?(?:總額)?\s*[｜|:：]|攤位租金\s*[｜|:：]|共計\d+日[:：].*器材.*保證金|(?:錄取|入選)(?:的)?攤位(?:為|是)[^\d]{0,30}[\d,]+\s*元)/.test(normalized)
    && /[\d,]+\s*元/.test(normalized)
    && !/(?:一般攤|行動餐車|普通攤).*[\d,]+\s*元.*(?:一般攤|行動餐車|三輪車)/.test(normalized)
    && (
      [...normalized.matchAll(/[\d,]+\s*元/g)].length === 1
      || /共計\d+日[:：].*器材.*保證金/.test(normalized)
      || /[一二兩三四五六七八九十\d]+日(?:大攤|小攤|攤位費)[\d,]+\s*元.*[+]/.test(normalized)
    )
  ));
  if (selectedLine) {
    const normalized = selectedLine.normalized;
    const boothComponent = normalized.match(/(?:本次活動\d*天的?攤位租金|活動\d*天攤位租金|[一二兩三四五六七八九十\d]+日(?:大攤|小攤|攤位費)|\d+天(?:大攤|小攤|攤位費)|攤位費(?:用)?(?:總額)?|攤位租金|共計\d+日[:：])\D{0,12}([\d,]+)\s*元/)
      ?? normalized.match(/(?:錄取|入選)(?:的)?攤位(?:為|是)[^\d]{0,30}([\d,]+)\s*元/);
    const amount = boothComponent ? Number(boothComponent[1].replace(/,/g, '')) : parseAmount(normalized);
    if (amount !== null) {
      const evidenceIds = [addEvidence(context, selectedLine.line)];
      const currency = currencyFor(context, normalized);
      const ambiguousDateMapping = /錄取(?:[（(]?租借[）)]?)?天數/.test(context.inputText) && priceParts.length > 0;
      const status = currency.currency === 'TWD' && !ambiguousDateMapping ? 'exact' : 'unsupported';
      const candidate = addCandidate<ParsedMoneyValue>(event, 'boothCost', status, {
        amount,
        ...currency,
        role: 'selected_booth_total',
        unit: moneyUnit(normalized) === 'unknown' ? 'per_event' : moneyUnit(normalized),
        ...(selectedDates(event)?.length ? { coversDates: selectedDates(event) } : {}),
      }, evidenceIds, status === 'exact' ? 'explicit_selected_booth_total' : 'selected_booth_total_not_safe_to_apply');
      if (status === 'unsupported') {
        candidate.applyPolicy = 'never';
        addWarning(context, currency.currency === null ? 'currency_unknown' : 'fee_date_mapping_unknown', 'warning', evidenceIds, 'boothCost');
      }
    }
  }

  const externalCost = entries.find(({ normalized }) => /攤位費(?:用)?.*(?:請見|表單|連結|公告|另行通知)/.test(normalized));
  if (externalCost && !event.candidates.some((candidate) => candidate.field === 'boothCost')) {
    const evidenceIds = [addEvidence(context, externalCost.line)];
    const candidate = addCandidate(event, 'boothCost', 'unsupported', null, evidenceIds, 'external_booth_cost_unavailable');
    candidate.applyPolicy = 'never';
    addWarning(context, 'external_value_unavailable', 'warning', evidenceIds, 'boothCost');
  }
  if (priceParts.length === 1 && !event.candidates.some((candidate) => candidate.field === 'boothCost')) {
    const price = priceParts[0];
    const evidenceIds = [addEvidence(context, price.line)];
    const candidate = addCandidate<ParsedMoneyValue>(event, 'boothCost', 'unsupported', {
      amount: price.amount,
      ...currencyFor(context, price.text),
      role: 'published_booth_price',
      unit: moneyUnit(price.text),
    }, evidenceIds, 'published_booth_price_not_selected');
    candidate.applyPolicy = 'never';
  }

  const depositLines = entries.filter(({ normalized }) => /(?:保證金|押金)\s*[：:｜|]?\s*[\d,]+\s*元/.test(normalized));
  const seenDeposits = new Set<number>();
  for (const entry of depositLines) {
    const match = entry.normalized.match(/(?:保證金|押金)\s*[：:｜|]?\s*([\d,]+)\s*元/);
    if (!match) continue;
    const amount = Number(match[1].replace(/,/g, ''));
    if (seenDeposits.has(amount)) continue;
    seenDeposits.add(amount);
    const evidenceIds = [addEvidence(context, entry.line)];
    const currency = currencyFor(context, match[0]);
    const candidate = addCandidate<ParsedMoneyValue>(event, 'deposit', currency.currency ? 'exact' : 'unsupported', {
      amount, ...currency, role: 'deposit', unit: 'per_event',
    }, evidenceIds, currency.currency ? 'explicit_deposit' : 'deposit_currency_unknown');
    if (!currency.currency) {
      candidate.applyPolicy = 'never';
      addWarning(context, 'currency_unknown', 'warning', evidenceIds, 'deposit');
    }
  }

  const paymentPatterns: Array<[RegExp, ParsedMoneyValue['role']]> = [
    [/(?:應繳金額|應付總額|本次應付)\D{0,8}([\d,]+)\s*元/, 'payment_due'],
    [/(?:已收到|匯款金額)\D{0,8}([\d,]+)\s*元/, 'payment_received'],
  ];
  for (const { line, normalized } of entries) {
    for (const [pattern, role] of paymentPatterns) {
      const match = normalized.match(pattern);
      if (!match) continue;
      const evidenceIds = [addEvidence(context, line)];
      const candidate = addCandidate<ParsedMoneyValue>(event, 'notes', 'ignore', {
        amount: Number(match[1].replace(/,/g, '')),
        ...currencyFor(context, match[0]),
        role,
        unit: 'unknown',
      }, evidenceIds, 'payment_amount_not_booth_cost');
      candidate.applyPolicy = 'never';
    }
  }

  for (const { line, normalized } of entries) {
    const component = normalized.match(/(?:[\d,]+\s*元\s*器材|桌椅(?:租借)?[^+；;，,。]{0,16}[\d,]+\s*元|加租[^+；;，,。]{0,16}[\d,]+\s*元)/);
    if (!component) continue;
    const amount = parseAmount(component[0]);
    if (amount === null) continue;
    const evidenceIds = [addEvidence(context, line)];
    const candidate = addCandidate<ParsedMoneyValue>(event, 'notes', 'unsupported', {
      amount,
      ...currencyFor(context, component[0]),
      role: 'equipment_total',
      unit: /四日|兩日|\d+日/.test(component[0]) ? 'per_event' : moneyUnit(component[0]),
      ...(selectedDates(event)?.length ? { coversDates: selectedDates(event) } : {}),
    }, evidenceIds, 'selected_equipment_total_preserved');
    candidate.applyPolicy = 'never';
  }

  const includedTypes = new Set<ParsedEquipmentValue['type']>();
  for (const { line, normalized } of entries) {
    const lineBoothKind = normalized.match(/^(?:♡)?(大攤|小攤)/)?.[1] ?? null;
    if (selectedBoothKind && lineBoothKind && selectedBoothKind !== lineBoothKind) continue;
    const isIncluded = /(?:主辦)?(?:免費)?提供|包含|附設|攤位供/.test(normalized)
      && !/(?:不提供|不供|自備|可租|租借|加訂|代租)/.test(normalized);
    if (!isIncluded) continue;
    const provisionStart = normalized.search(/(?:免費)?提供|包含|附設|攤位供/);
    const clauses = splitClauses(provisionStart >= 0 ? normalized.slice(provisionStart) : normalized);
    for (const clause of clauses) {
      const explicitTail = clause.split(/(?:免費)?提供|包含|附設|攤位供/).at(-1) ?? clause;
      if (/(?:可租|租借|加訂|加租|代租|[\d,]+\s*元)/.test(explicitTail)) continue;
      const types: ParsedEquipmentValue['type'][] = [
        ...(/(?:長桌|桌子|桌)/i.test(explicitTail) ? ['table' as const] : []),
        ...(/(?:折疊椅|塑膠椅|PE ?椅|椅子|椅)/i.test(explicitTail) ? ['chair' as const] : []),
        ...(/(?:遮陽傘|陽傘|傘|umbrella|parasol)/i.test(explicitTail) ? ['umbrella' as const] : []),
        ...(/(?:帳篷|歐帳|棚|tent)/i.test(explicitTail) ? ['tent' as const] : []),
        ...(/(?:電力|供電|用電|插座|發電機|power)/i.test(explicitTail) ? ['power' as const] : []),
      ];
      for (const type of types) {
        if (includedTypes.has(type)) continue;
        includedTypes.add(type);
        const evidenceIds = [addEvidence(context, line, line.text.includes(clause) ? clause : line.text)];
        const value: ParsedEquipmentValue = {
          type,
          provision: 'included_free',
          ...(equipmentQuantity(explicitTail, type) ? { quantity: equipmentQuantity(explicitTail, type) } : {}),
          detail: explicitTail,
        };
        const field = type === 'table' ? 'tableFree' : type === 'chair' ? 'chairFree' : type === 'umbrella' ? 'umbrellaFree' : 'notes';
        const candidate = addCandidate(event, field, type === 'tent' || type === 'power' ? 'unsupported' : 'exact', value, evidenceIds, 'included_equipment');
        if (field === 'notes') candidate.applyPolicy = 'never';
      }
    }
  }

  const rentalParts: Array<{ line: SourceLine; text: string; value: ParsedEquipmentValue }> = [];
  for (const { line, normalized } of entries) {
    if (!/(?:租借|加訂|代租|桌|椅|傘).*[\d,]+\s*元/.test(normalized)) continue;
    for (const rawPart of splitClauses(normalized)) {
      const type = equipmentType(rawPart);
      const amount = parseAmount(rawPart);
      if (!type || amount === null || /(?:攤位費|保證金|應繳|應付)/.test(rawPart)) continue;
      rentalParts.push({
        line,
        text: rawPart.trim(),
        value: {
          type,
          provision: 'rentable',
          ...(equipmentQuantity(rawPart, type) ? { quantity: equipmentQuantity(rawPart, type) } : {}),
          money: {
            amount,
            ...currencyFor(context, rawPart),
            role: type === 'power' ? 'power_fee' : 'equipment_unit_price',
            unit: moneyUnit(rawPart),
          },
          detail: rawPart.trim(),
        },
      });
    }
  }
  if (rentalParts.length > 0) {
    const evidenceIds = [...new Set(rentalParts.map((part) => addEvidence(context, part.line)))];
    if (rentalParts.length >= 2) {
      const options: CandidateOption<ParsedEquipmentValue>[] = rentalParts.map((part, index) => ({
        id: `${event.id}-notes-equipment-option-${index + 1}`,
        value: part.value,
        evidenceIds: [addEvidence(context, part.line)],
        linkedCandidateIds: [],
      }));
      const candidate = addCandidate<ParsedEquipmentValue>(event, 'notes', 'choice_required', null, evidenceIds, 'rentable_equipment_options', options);
      options.forEach((option) => option.linkedCandidateIds.push(candidate.id));
    } else {
      const candidate = addCandidate(event, 'notes', 'unsupported', rentalParts[0].value, evidenceIds, 'rentable_equipment_not_selected');
      candidate.applyPolicy = 'never';
    }
    addWarning(context, 'choice_required', 'warning', evidenceIds, 'notes');
  }

  for (const { line, normalized } of entries) {
    const provision = /(?:不提供|不供)/.test(normalized)
      ? 'not_provided'
      : /(?:請自備|需自備|自備)/.test(normalized)
        ? 'self_provided'
        : /(?:禁用|禁止使用|不得使用)/.test(normalized)
          ? 'forbidden'
          : null;
    if (!provision) continue;
    const type = equipmentType(normalized) ?? 'other';
    const evidenceIds = [addEvidence(context, line)];
    const candidate = addCandidate<ParsedEquipmentValue>(event, 'notes', 'unsupported', {
      type, provision, detail: line.text.trim(),
    }, evidenceIds, `equipment_${provision}`);
    candidate.applyPolicy = 'never';
    addWarning(context, 'unsupported_field', provision === 'forbidden' ? 'warning' : 'info', evidenceIds, 'notes');
  }
};

const parseEvent = (context: ParserContext, lines: SourceLine[], eventIndex: number): EventDraft => {
  const event: ParsedMarketEvent = {
    id: `event-${eventIndex + 1}`,
    label: `活動 ${eventIndex + 1}`,
    candidateIds: [],
    candidates: [],
  };
  const name = extractName(lines);
  if (name) {
    const evidenceIds = name.evidence.map((line) => addEvidence(context, line, line.text.includes(name.value) ? name.value : line.text.trim()));
    addCandidate(event, 'name', 'exact', name.value, evidenceIds, 'explicit_market_name');
    event.label = name.value;
  }

  const date = findDateCandidate(context, lines);
  if (date) {
    const dateOptions = date.status === 'choice_required' && date.value.kind === 'selected_dates'
      ? (date.optionDates ?? date.value.dates).map((value, optionIndex) => ({
        id: `${event.id}-dates-option-${optionIndex + 1}`,
        value: { kind: 'selected_dates' as const, dates: [value] },
        evidenceIds: date.evidenceIds,
        linkedCandidateIds: [] as string[],
      }))
      : undefined;
    const candidate = addCandidate<ParsedDateValue>(
      event,
      'dates',
      date.status,
      date.value,
      date.evidenceIds,
      date.status === 'unsupported' ? 'unsupported_date_pattern' : date.status === 'inferable' ? 'year_inferred' : 'explicit_event_dates',
      dateOptions,
    );
    dateOptions?.forEach((option) => option.linkedCandidateIds.push(candidate.id));
    if (date.value.kind === 'continuous_range' && date.value.dayCount > 14) {
      candidate.applyPolicy = 'requires_extra_confirmation';
      addWarning(context, 'date_range_confirmation_required', 'warning', date.evidenceIds, 'dates');
    }
    if (date.status === 'unsupported') addWarning(context, 'conditional_schedule_unsupported', 'warning', date.evidenceIds, 'dates');
    if (date.status === 'choice_required') addWarning(context, 'choice_required', 'blocking', date.evidenceIds, 'dates');
    if (date.status === 'conflict') addWarning(context, 'core_conflict', 'blocking', date.evidenceIds, 'dates');
  }

  const location = extractLocation(lines, name?.value ?? null);
  if (location) {
    const evidenceIds = location.evidence.map((line) => addEvidence(context, line));
    const options = location.options.map((value, optionIndex) => ({
      id: `${event.id}-location-option-${optionIndex + 1}`,
      value,
      evidenceIds,
      linkedCandidateIds: [] as string[],
    }));
    const candidate = addCandidate(event, 'location', location.status, location.value, evidenceIds,
      location.status === 'choice_required' ? 'location_depends_on_stall_type' : 'explicit_event_location', options);
    options.forEach((option) => option.linkedCandidateIds.push(candidate.id));
    if (location.status === 'choice_required') addWarning(context, 'choice_required', 'blocking', evidenceIds, 'location');
  }

  parseTimes(context, lines, event);
  parseMoneyAndEquipment(context, lines, event);
  return { event, name: name?.value ?? null, location: location?.value ?? null };
};

const mergeRepeatedEvents = (events: EventDraft[]): EventDraft[] => {
  const output: EventDraft[] = [];
  for (const current of events) {
    const existing = output.find((item) => (
      item.name && current.name && item.name === current.name
      && item.location && current.location && item.location === current.location
    ));
    if (!existing) {
      output.push(current);
      continue;
    }
    const existingDates = existing.event.candidates.find((candidate) => candidate.field === 'dates');
    const currentDates = current.event.candidates.find((candidate) => candidate.field === 'dates');
    if (
      existingDates?.value && currentDates?.value
      && typeof existingDates.value === 'object' && typeof currentDates.value === 'object'
      && 'kind' in existingDates.value && 'kind' in currentDates.value
      && existingDates.value.kind === 'selected_dates' && currentDates.value.kind === 'selected_dates'
      && 'dates' in existingDates.value && Array.isArray(existingDates.value.dates)
      && 'dates' in currentDates.value && Array.isArray(currentDates.value.dates)
    ) {
      existingDates.value.dates = [...new Set<string>([
        ...existingDates.value.dates.filter((date): date is string => typeof date === 'string'),
        ...currentDates.value.dates.filter((date): date is string => typeof date === 'string'),
      ])].sort();
      existingDates.evidenceIds = [...new Set([...existingDates.evidenceIds, ...currentDates.evidenceIds])];
    }
  }
  return output.map((draft, index) => {
    draft.event.id = `event-${index + 1}`;
    return draft;
  });
};

const recordAdministrativeAndSensitiveSpans = (context: ParserContext): void => {
  for (const line of context.lines) {
    const normalized = normalizeForMatch(line.text);
    if (isAdministrativeDateLine(normalized) && extractDateAtoms(normalized).length > 0) {
      context.ignoreSpans.push({ evidenceId: addEvidence(context, line), reasonCode: 'administrative_date' });
    }
    const categories: Array<[RegExp, ParsedMarketDraft['sensitiveSpans'][number]['category']]> = [
      [/\[(?:EMAIL)\]/i, 'email'],
      [/\[(?:PHONE_OR_CONTACT|PERSON_NAME)\]/i, 'phone_or_contact'],
      [/\[(?:IDENTIFIER|PRIVATE_VEHICLE)\]/i, 'identifier'],
      [/\[(?:PRIVATE_FORM_URL|REGISTRATION_URL|PROGRAM_URL)\]/i, 'private_url'],
      [/\[(?:PRIVATE_FORM_ANSWER|PRIVATE_ANSWER|PRIVATE_ADDRESS|PRIVATE_BRAND|BRAND_NAME)\]/i, 'private_answer'],
    ];
    for (const [pattern, category] of categories) {
      if (!pattern.test(line.text)) continue;
      const evidenceId = addEvidence(context, line);
      context.sensitiveSpans.push({ evidenceId, category });
    }
  }
  if (context.sensitiveSpans.length > 0) {
    addWarning(
      context,
      'private_content_detected',
      'info',
      [...new Set(context.sensitiveSpans.map((span) => span.evidenceId))],
    );
  }
};

const determineReadiness = (disposition: ParsedMarketDraft['disposition'], events: ParsedMarketEvent[]): DraftReadiness => {
  if (disposition !== 'single_candidate') return 'blocked';
  const candidates = events[0]?.candidates ?? [];
  if (candidates.some((candidate) => candidate.status === 'conflict')) return 'blocked';
  const eligibleCore = new Set(candidates
    .filter((candidate) => ['name', 'dates', 'location'].includes(candidate.field) && candidate.applyPolicy === 'eligible')
    .map((candidate) => candidate.field));
  return eligibleCore.size === 3 ? 'reviewable_core' : 'partial';
};

const parseValidated = (request: ParseMarketTextRequest): ParsedMarketDraft => {
  const context: ParserContext = {
    inputText: request.inputText,
    referenceDate: request.referenceDate,
    lines: splitSourceLines(request.inputText),
    evidence: [],
    evidenceKeys: new Map(),
    warnings: [],
    ignoreSpans: [],
    sensitiveSpans: [],
  };
  recordAdministrativeAndSensitiveSpans(context);

  if (isRejectInput(request.inputText)) {
    return {
      schemaVersion: 1,
      disposition: 'reject',
      readiness: 'blocked',
      events: [],
      evidence: context.evidence,
      warnings: context.warnings,
      ignoreSpans: context.ignoreSpans,
      sensitiveSpans: context.sensitiveSpans,
    };
  }

  const segments = findEventSegments(context.lines);
  const parsedEvents = mergeRepeatedEvents(segments.map((segment, index) => parseEvent(context, segment, index)));
  const hasCoreCandidate = parsedEvents.some(({ event }) => event.candidates.some((candidate) => (
    candidate.field === 'name' || candidate.field === 'dates' || candidate.field === 'location'
  )));
  const correctionWithoutIdentity = /(?:更正為|保留).{0,20}\d{1,2}[/.月]\d{1,2}/.test(request.inputText)
    && !parsedEvents.some((event) => event.name);
  const equipmentOnly = /(租借設備|租借器材|申請用電)/.test(request.inputText) && !hasCoreCandidate;
  const onlyName = parsedEvents.length === 1
    && parsedEvents[0].event.candidates.filter((candidate) => ['name', 'dates', 'location'].includes(candidate.field)).every((candidate) => candidate.field === 'name');
  const administrativeOnly = onlyName && /(再次提醒|發票|繳費截止|匯款截止)/.test(request.inputText);
  const insufficient = correctionWithoutIdentity || !hasCoreCandidate || administrativeOnly;
  const events = correctionWithoutIdentity && !equipmentOnly
    ? []
    : parsedEvents.map(({ event }) => event);
  const disposition = insufficient
    ? 'insufficient'
    : events.length > 1
      ? 'event_selection_required'
      : 'single_candidate';
  if (disposition === 'event_selection_required') {
    const firstEvidenceId = events
      .flatMap((event) => event.candidates)
      .flatMap((candidate) => candidate.evidenceIds)[0];
    addWarning(context, 'event_selection_required', 'blocking', firstEvidenceId ? [firstEvidenceId] : []);
  }

  return {
    schemaVersion: 1,
    disposition,
    readiness: determineReadiness(disposition, events),
    events,
    evidence: context.evidence,
    warnings: context.warnings,
    ignoreSpans: context.ignoreSpans,
    sensitiveSpans: context.sensitiveSpans,
  };
};

export const parseMarketText = (request: ParseMarketTextRequest): ParseMarketTextResponse => {
  if (Array.from(request.inputText.trim()).length === 0) return { ok: false, error: { code: 'empty_input' } };
  if (Array.from(request.inputText).length > MAX_INPUT_CODE_POINTS) return { ok: false, error: { code: 'input_too_long' } };
  if (!isValidDateKey(request.referenceDate)) return { ok: false, error: { code: 'invalid_reference_date' } };
  try {
    return { ok: true, draft: parseValidated(request) };
  } catch {
    return { ok: false, error: { code: 'internal_error' } };
  }
};
