import ts from 'typescript';

// Documentation-only analysis. No application/runtime imports or environment reads.
export const normalizeCopy = text => text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
export const isDemoPath = file => /(^|\/)[^/]*demo[^/]*(\/|$)/i.test(file);
export const isTestSurface = file => /^app\/(?:debug|tools|recovery|settings\/data|mobile-runtime-smoke)(?:\/|$)|^app\/api\/dev\/|^components\/(?:dev|examples)\/|(?:^|\/)(?:theme-lab|[^/]*smoke)[^/]*\.[jt]sx?$/i.test(file);
const han = /\p{Script=Han}/u;
const englishProse = /^[A-Z][A-Za-z0-9 ,.!?()'’:;+\-…/]* [A-Za-z][A-Za-z0-9 ,.!?()'’:;+\-…/]*$/u;
const attrs = /^(?:aria-label|aria-description|aria-valuetext|alt|title|placeholder|label|description|message|text|children|heading|subtitle|caption|body|emptyMessage|emptyText|loadingText|errorMessage|successMessage|confirmText|cancelText|buttonText|actionLabel|effectiveDate)$/i;
const displayKey = /(?:label|title|description|message|text|heading|subtitle|caption|body|placeholder|tooltip|reason|hint|notice|summary|disclosure|features|benefits)$/i;
const technicalKey = /^(?:className|class|style|key|id|href|src|type|variant|size|role|data-.*|htmlFor|name|value|action|method|format|locale|timeZone|code|status|state|mode|event|table|column|field|path|url|icon|currency|unit|dateStyle|timeStyle)$/;
const messageCall = /^(?:(?:.*\.)?toast(?:\.(?:success|error|info|warning|loading|message|promise|custom))?|(?:window\.)?(?:alert|confirm|prompt)|(?:.*\.)?showNotification|set(?:Error|ErrorMessage|Message|Status|CloudError|SaveStatus|Feedback|Notice|Warning|Success|ProgressMessage)|.*(?:ErrorMessage|ErrorText|Toast|Notification))$/;
const ancestors = node => { const out = []; for (let p = node.parent; p; p = p.parent) out.push(p); return out; };
const nameOf = node => node?.name?.getText?.() ?? '';
function enclosing(node) {
  for (const p of ancestors(node)) {
    if (ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p) || ts.isClassDeclaration(p)) return nameOf(p) || 'default';
    if (ts.isVariableDeclaration(p)) return nameOf(p);
    if (ts.isPropertyAssignment(p) && (ts.isArrowFunction(p.initializer) || ts.isFunctionExpression(p.initializer))) return nameOf(p);
  }
  return 'module';
}
function nearestProperty(node) {
  return ancestors(node).find(p => ts.isPropertyAssignment(p) || ts.isJsxAttribute(p));
}
function tagOf(node) {
  const p = [node, ...ancestors(node)].find(p => ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p));
  return p ? (ts.isJsxElement(p) ? p.openingElement.tagName : p.tagName).getText() : '';
}
function textExpression(node) {
  let structured = false;
  function visit(child) {
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child) || ts.isArrowFunction(child) || ts.isObjectLiteralExpression(child)) structured = true;
    if (!structured) ts.forEachChild(child, visit);
  }
  visit(node);
  return !structured;
}
function isRenderedValue(node, boundary) {
  let child = node;
  for (const p of ancestors(node)) {
    if (p === boundary) return true;
    if (ts.isConditionalExpression(p) && child === p.condition) return false;
    if (ts.isBinaryExpression(p) && ![
      ts.SyntaxKind.PlusToken, ts.SyntaxKind.QuestionQuestionToken,
      ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken,
    ].includes(p.operatorToken.kind)) return false;
    if (ts.isBinaryExpression(p) && child === p.left && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return false;
    if (ts.isElementAccessExpression(p) && child === p.argumentExpression) return false;
    if (ts.isCallExpression(p) && /(?:^cn$|classNames|clsx|\.includes$|\.indexOf$|\.match$|\.test$|\.get$|\.set$|set[A-Z])/.test(p.expression.getText())) return false;
    // Arguments to a formatter, selector, etc. are not themselves the returned display value.
    if (ts.isCallExpression(p) && p.arguments.some(arg => arg === child)) return false;
    child = p;
  }
  return false;
}
function invocation(node) {
  for (const p of ancestors(node)) {
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      const callee = p.expression.getText();
      if (messageCall.test(callee) || (ts.isNewExpression(p) && /Error$/.test(callee))) return { node: p, callee };
    }
    if (ts.isJsxElement(p) || ts.isFunctionDeclaration(p) || ts.isArrowFunction(p)) break;
  }
  return null;
}
function domAssignment(node) {
  return [node, ...ancestors(node)].find(p => ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    /\.(?:textContent|innerText|innerHTML)$/.test(p.left.getText()));
}
function ignored(node) {
  return ancestors(node).some(p =>
    ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) ||
    ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p) ||
    ((ts.isCallExpression(p) || ts.isNewExpression(p)) && /^(?:(?:console|logger)\.|(?:.*\.)?(?:captureException|captureMessage)$)/.test(p.expression.getText())));
}
function guard(node) {
  const parts = [];
  let child = node;
  for (const p of ancestors(node)) {
    if (ts.isConditionalExpression(p)) parts.push(`${child === p.whenFalse ? '否則 ' : ''}${normalizeCopy(p.condition.getText())}`);
    if (ts.isIfStatement(p) && child !== p.expression) parts.push(`${child === p.elseStatement ? '否則 ' : ''}${normalizeCopy(p.expression.getText())}`);
    if (ts.isBinaryExpression(p) && p.right === child && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) parts.push(normalizeCopy(p.left.getText()));
    if (ts.isCatchClause(p)) parts.push('catch：操作拋出例外');
    child = p;
    if (ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isMethodDeclaration(p)) break;
  }
  return parts.reverse().join(' → ') || '隨所屬畫面／函式狀態呈現；呼叫端條件另查來源';
}
function purpose(kind, node, callee, prop, tag) {
  const control = tag || prop || enclosing(node);
  if (kind === '輸入提示') return `在 ${control} 提供輸入格式、範例或選擇提示`;
  if (kind === '輔助辨識') return `提供 ${control} 的讀屏名稱、圖片替代文字或滑入說明`;
  if (kind === '確認／通知') return `${callee}：提示操作結果、進度或要求使用者確認`;
  if (kind === '狀態設定') return `${callee}：更新畫面訊息；仍須依呼叫端確認是否被渲染`;
  if (kind === '錯誤來源') return `${callee}：提供驗證／失敗原因；可能經呼叫端轉譯、攔截或直接顯示`;
  if (kind === '內部狀態／錯誤碼') return `${callee || prop || enclosing(node)}：機器可讀的狀態或錯誤識別碼；供追查轉譯來源，不當成使用者提示`;
  if (kind === 'DOM 訊息文字') return `${callee}：寫入頁面文字或 HTML 訊息區`;
  if (kind === '共用文案值') return `${prop || enclosing(node)}：供畫面或訊息組裝使用的標籤／說明值`;
  if (kind === '動態文字入口') return `${control} 接收執行時文字；內容需追查所列綁定與生產端`;
  if (kind === '來源候選') return `${enclosing(node)} 中的人類可讀文字；可能為內部比對／預設資料，不能直接視為畫面提示`;
  if (/button|Button|a$|Link|Tab.*Trigger|summary/i.test(tag)) return `${control}：辨識可點擊操作、導覽或展開入口`;
  if (/option|SelectItem|Radio|Toggle/i.test(tag)) return `${control}：說明可選值或狀態`;
  if (/Label|^label$|legend/i.test(tag)) return `${control}：說明欄位或欄位群組`;
  if (/Title|^h[1-6]$/i.test(tag)) return `${control}：辨識畫面、區塊或對話框主題`;
  return `${control || enclosing(node)}：呈現操作說明、資料標籤、狀態或注意事項`;
}
export function extractSource(file, source) {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
    /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : /\.js$/.test(file) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  const records = [];
  const consumed = new Set();
  const add = (node, text, kind, details = {}) => {
    const rawText = text;
    text = normalizeCopy(text);
    if (!text) return;
    const start = node.getStart(sf), end = node.getEnd();
    const pos = sf.getLineAndCharacterOfPosition(start);
    const prop = nameOf(nearestProperty(node));
    const tag = tagOf(node);
    records.push({ file, line: pos.line + 1, column: pos.character + 1, start, end,
      text, rawText, sourceText: source.slice(start, end), kind, symbol: enclosing(node), element: tag, property: prop,
      condition: guard(node), purpose: purpose(kind, node, details.callee || '', prop, tag),
      ...details });
  };
  function visit(node) {
    if (ignored(node)) return;
    // Combine adjacent JSX text and interpolations into one readable display template.
    if (ts.isJsxElement(node) && node.children.length && node.children.every(c => ts.isJsxText(c) || (ts.isJsxExpression(c) && (!c.expression || textExpression(c.expression))))) {
      const textChildren = node.children.filter(ts.isJsxText);
      const hasText = textChildren.some(c => normalizeCopy(c.text));
      if (hasText) {
        const template = node.children.map(c => ts.isJsxText(c)
          ? c.text : c.expression ? '${' + normalizeCopy(c.expression.getText(sf)) + '}' : '').join('');
        const anchor = textChildren.find(c => normalizeCopy(c.text));
        add(anchor, template, '畫面文字', { assembled: true, element: node.openingElement.tagName.getText(sf) });
        node.children.forEach(c => consumed.add(c));
      }
    }
    if (ts.isJsxText(node) && !consumed.has(node)) add(node, node.text, '畫面文字');
    if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent) && !consumed.has(node)) {
      const expr = node.expression;
      if (textExpression(expr) && (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr) || ts.isCallExpression(expr) || ts.isElementAccessExpression(expr)) &&
          /(?:label|title|description|message|error|status|hint|notice|warning|children|summary|disclosure|caption|text|(?:^|\.)name$)/i.test(expr.getText(sf))) {
        add(expr, '${' + normalizeCopy(expr.getText(sf)) + '}', '動態文字入口', { binding: expr.getText(sf) });
      }
    }
    if (ts.isJsxAttribute(node) && (attrs.test(nameOf(node)) || displayKey.test(nameOf(node))) &&
        node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const expr = node.initializer.expression;
      if (textExpression(expr) && (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr) || ts.isCallExpression(expr)))
        add(expr, '${' + normalizeCopy(expr.getText(sf)) + '}', '動態文字入口', { binding: expr.getText(sf) });
    }
    if (ts.isCallExpression(node) && messageCall.test(node.expression.getText(sf))) {
      const arg = node.arguments[0];
      if (arg && !ts.isStringLiteralLike(arg) && !ts.isTemplateExpression(arg) &&
          !ts.isConditionalExpression(arg) && !ts.isObjectLiteralExpression(arg) && !ts.isBinaryExpression(arg)) {
        add(arg, '${' + normalizeCopy(arg.getText(sf)) + '}', '動態文字入口', { binding: arg.getText(sf), callee: node.expression.getText(sf) });
      }
    }
    if (ts.isBinaryExpression(node) && domAssignment(node) === node) {
      const expr = node.right;
      if (ts.isIdentifier(expr) || ts.isCallExpression(expr) || ts.isPropertyAccessExpression(expr))
        add(expr, '${' + normalizeCopy(expr.getText(sf)) + '}', '動態文字入口', { binding: expr.getText(sf), callee: node.left.getText(sf), element: node.left.getText(sf) });
    }
    if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
      // Template spans are already represented by the enclosing template, not separate fragments.
      if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) return;
      const text = ts.isTemplateExpression(node) ? node.getText(sf).slice(1, -1) : node.text;
      if (!normalizeCopy(text)) return;
      if (ts.isPropertyAssignment(node.parent) && node.parent.name === node) {
        if (han.test(text)) add(node, text, '來源候選', { purpose: '人類可讀的物件鍵；可能供顯示或僅供資料比對，需追查取值端' });
      } else {
        const propNode = nearestProperty(node), prop = nameOf(propNode);
        const call = invocation(node);
        const dom = domAssignment(node);
        const jsxExpr = ancestors(node).find(ts.isJsxExpression);
        const inDisplay = jsxExpr && !ts.isJsxAttribute(jsxExpr.parent) && isRenderedValue(node, jsxExpr) &&
          !(propNode && ts.isJsxAttribute(propNode)) && !ancestors(node).slice(0, ancestors(node).indexOf(jsxExpr)).some(p => ts.isArrowFunction(p));
        let kind;
        const displayAttribute = propNode && ts.isJsxAttribute(propNode) && (attrs.test(prop) || displayKey.test(prop)) &&
          (!jsxExpr || isRenderedValue(node, jsxExpr));
        if (displayAttribute) {
          kind = prop === 'placeholder' ? '輸入提示' : (/^(aria-|alt$)/.test(prop) || (prop === 'title' && /^[a-z]/.test(tagOf(node)))) ? '輔助辨識' : '畫面文字';
        } else if (call && (!/^set/.test(call.callee) || han.test(text) || /\s/.test(text))) kind = ts.isNewExpression(call.node) ? '錯誤來源' : /^set/.test(call.callee) ? '狀態設定' : '確認／通知';
        else if (dom && isRenderedValue(node, dom)) kind = 'DOM 訊息文字';
        else if (inDisplay && (!prop || !technicalKey.test(prop))) kind = '畫面文字';
        else if ((displayKey.test(prop) || prop === 'name') && !(propNode && ts.isJsxAttribute(propNode)) && (han.test(text) || /[A-Za-z]/.test(text))) kind = '共用文案值';
        else if (han.test(text) || englishProse.test(text)) kind = '來源候選';
        if ((kind === '錯誤來源' || (kind === '共用文案值' && /reason|message|error|code/i.test(prop))) && !han.test(text) && /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+$|^[A-Z][A-Z0-9_:-]+$/.test(text)) kind = '內部狀態／錯誤碼';
        if (kind) add(node, text, kind, call ? { callee: call.callee } : dom ? { callee: dom.left.getText(sf) } : {});
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  const imports = [];
  function importsVisit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) imports.push(node.arguments[0].text);
    ts.forEachChild(node, importsVisit);
  }
  importsVisit(sf);
  // Legacy date picker and standalone tools build visible DOM from HTML string templates.
  for (const row of [...records]) {
    if (row.kind !== '動態文字入口' && /<[A-Za-z][^>]*>/.test(row.text)) {
      const fragment = source.slice(row.start + 1, row.end - 1);
      const html = extractHtml(file, fragment, { containerSource: source, offset: row.start + 1, scripts: false });
      records.push(...html.records.map(part => ({ ...part, kind: 'HTML 範本文字', symbol: row.symbol,
        purpose: `HTML 字串範本中的 ${part.element || part.property} 文字；須由 ${row.symbol} 的呼叫端確認渲染時機` })));
    }
  }
  return { records, imports, parseErrors: sf.parseDiagnostics.length };
}

const decodeHtml = text => text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi, entity => {
  const key = entity.slice(1, -1).toLowerCase();
  if (key.startsWith('#')) { const n = key[1] === 'x' ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10); return n <= 0x10ffff ? String.fromCodePoint(n) : entity; }
  return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[key];
});
export function extractHtml(file, source, { containerSource = source, offset = 0, scripts = true } = {}) {
  const records = [], imports = [];
  const position = index => {
    const prefix = containerSource.slice(0, index);
    return { line: prefix.split('\n').length, column: index - prefix.lastIndexOf('\n') };
  };
  const add = (index, raw, kind, element = '', property = '') => {
    const text = normalizeCopy(decodeHtml(raw));
    if (!text || /^\\[nr]$/.test(text)) return;
    const start = offset + index;
    records.push({ file, ...position(start), start, end: start + raw.length,
      text, rawText: raw, sourceText: raw, kind, symbol: 'HTML document', element, property,
      condition: '載入此靜態 HTML；含字串範本者需追查產生端',
      purpose: property ? `${element} 的 ${property}：提供欄位提示或輔助辨識` : `${element || 'HTML'}：提供靜態頁面標題、說明或操作標籤` });
  };
  const masked = source.replace(/<!--[^]*?-->|<(script|style)\b[^>]*>([^]*?)<\/\1\s*>/gi, (match, tag, body, index) => {
    if (scripts && tag?.toLowerCase() === 'script' && body?.trim()) {
      const bodyStart = index + match.indexOf('>') + 1;
      const js = extractSource(file + '.js', body);
      for (const row of js.records) {
        const start = offset + bodyStart + row.start;
        records.push({ ...row, file, start, end: offset + bodyStart + row.end, ...position(start), symbol: `inline script / ${row.symbol}` });
      }
      imports.push(...js.imports);
    }
    return match.replace(/[^\r\n]/g, ' ');
  });
  const stack = [];
  const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  for (const match of masked.matchAll(/<(?:(?:[^<>"']|"[^"]*"|'[^']*')*)>|[^<]+/g)) {
    const token = match[0], index = match.index;
    if (token.startsWith('<')) {
      const closing = /^<\//.test(token), tag = /^<\/?\s*([\w-]+)/.exec(token)?.[1]?.toLowerCase();
      if (!tag) continue;
      if (closing) { const at = stack.lastIndexOf(tag); if (at >= 0) stack.length = at; continue; }
      for (const attr of token.matchAll(/\b(placeholder|title|alt|aria-label|aria-description|content)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
        if (attr[1] === 'content' && !(tag === 'meta' && /name\s*=\s*["']description["']/i.test(token))) continue;
        const raw = attr[2] ?? attr[3], valueAt = attr.index + attr[0].indexOf('=') + attr[0].slice(attr[0].indexOf('=')).search(/["']/) + 1;
        add(index + valueAt, raw, attr[1] === 'placeholder' ? '輸入提示' : '輔助辨識', tag, attr[1]);
      }
      if (!voidTags.has(tag) && !/\/\s*>$/.test(token)) stack.push(tag);
    } else if (normalizeCopy(token)) add(index, token, '畫面文字', stack.at(-1) || 'HTML');
  }
  return { records, imports, parseErrors: 0 };
}

export function featureArea(file) {
  if (/^public\/(?:clear-sw|db-fix|fix|sw-test)\.html$/.test(file)) return ['13-test-tools', '測試、救援與開發工具'];
  if (isTestSurface(file)) return ['13-test-tools', '測試、救援與開發工具'];
  if (/subscription|entitlement|capabilit|purchase|billing|pricing/i.test(file)) return ['10-subscription', '訂閱、方案與資格'];
  if (/auth|login|join|role|permission|staff|team|account/i.test(file)) return ['09-account-team', '登入、帳號、團隊與權限'];
  if (/journal|checklist|preparation|template|followup/i.test(file)) return ['04-journals-prep', '出攤心得與出攤準備'];
  if (/cash/i.test(file)) return ['05-cash', '開收攤現金與差額比較'];
  if (/recurring|schedule|region/i.test(file)) return ['06-schedules-region', '固定安排與縣市整理'];
  if (/analytics|report|export/i.test(file)) return ['08-analytics-report', '分析、報表與匯出'];
  if (/sales|revenue|deal|transaction|customer|cost|expense|photo/i.test(file)) return ['07-sales', '收款、成交、成本與照片'];
  if (/product|stock|inventory/i.test(file)) return ['03-products', '商品與庫存'];
  if (/markets|market/i.test(file)) return ['02-markets', '市集清單、場次與繳費'];
  if (/sync|recovery|cache|migration|db\//i.test(file)) return ['11-sync', '同步、離線與資料狀態'];
  if (/privacy|terms|support|legal|public\/|manifest|sw\.js/i.test(file)) return ['12-public-platform', '公開政策、支援與平台文字'];
  if (/settings|theme/i.test(file)) return ['14-settings', '設定與外觀'];
  return ['01-home-common', '首頁、導覽與共用介面'];
}
