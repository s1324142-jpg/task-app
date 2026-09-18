import { z } from 'zod';
import { ExternalAssignment } from '../providers/AssignmentProvider';

const scrapedRecordSchema = z.object({
  externalId: z.string().min(1).max(500),
  courseName: z.string().min(1).max(300),
  assignmentTitle: z.string().min(1).max(500),
  deadlineText: z.string().min(1).max(2000),
  assignmentUrl: z.string().url().max(2000),
  assignmentType: z.enum(['query', 'survey', 'report', 'project']),
  submissionStatus: z.enum(['submitted', 'not_submitted']).optional(),
});

const syncMessageSchema = z.discriminatedUnion('status', [
  z.object({ kind: z.literal('manaba-sync'), status: z.literal('ok'), records: z.array(scrapedRecordSchema).max(5000), pages: z.number().int().min(1).max(20) }),
  z.object({ kind: z.literal('manaba-sync'), status: z.literal('auth_required') }),
  z.object({ kind: z.literal('manaba-sync'), status: z.literal('error'), message: z.string().max(500) }),
]);

export type ManabaSyncMessage = z.infer<typeof syncMessageSchema>;

export function parseManabaSyncMessage(value: unknown): ManabaSyncMessage | null {
  const parsed = syncMessageSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const pad = (value: number) => String(value).padStart(2, '0');

// 課題URLの直前部分が、その課題を持つ授業トップのパスになる。
// 例: /ct/course_123_report_456 -> /ct/course_123
const MANABA_TASK_PATH_PATTERN = /^(\/ct\/course_.+?)_(query|survey|report|project)_[^/?#]+/i;

export function coursePathFromTaskPath(pathname: string): string | null {
  return pathname.match(MANABA_TASK_PATH_PATTERN)?.[1] ?? null;
}

/** manabaの日本語表記を、端末のタイムゾーンに依存しない日本時間ISOへ変換する。 */
export function parseManabaDeadline(text: string, now = new Date()): string | null {
  const normalized = text.replace(/[\u00a0\u3000]/g, ' ').replace(/\s+/g, ' ');
  // 一覧行には受付開始と受付終了が併記される。終了・締切ラベル以降を
  // 先に解析し、開始日時を締切として取り込まないようにする。
  const deadlineLabel = /受付終了(?:日時)?|終了日時|提出期限|回答期限|締切(?:日時)?/g;
  const labels = Array.from(normalized.matchAll(deadlineLabel));
  const lastLabel = labels[labels.length - 1];
  const deadlineText = lastLabel?.index === undefined
    ? normalized
    : normalized.slice(lastLabel.index + lastLabel[0].length);
  const datePattern = /(?:(20\d{2})\s*(?:年|[\/.\-])\s*)?(\d{1,2})\s*(?:月|[\/.\-])\s*(\d{1,2})\s*日?(?:\s*\([^)]*\))?\s*(\d{1,2})\s*[:：]\s*(\d{2})/g;
  const matches = Array.from(deadlineText.matchAll(datePattern));
  // 「受付期間 9/1 09:00 ～ 9/18 23:59」のように終了ラベルがない
  // 範囲表示では、後ろの日時が受付終了日時になる。
  const isRange = lastLabel?.index === undefined
    && matches.length > 1
    && (/受付(?:期間|開始|日時)/.test(deadlineText) || /[～〜~]/.test(deadlineText));
  const match = isRange ? matches[matches.length - 1] : matches[0];
  if (!match) return null;
  let year: number;
  let month: number;
  let day: number;
  let hour: number;
  let minute: number;
  if (match[1]) {
    year = Number(match[1]); month = Number(match[2]); day = Number(match[3]);
    hour = Number(match[4]); minute = Number(match[5]);
  } else {
    month = Number(match[2]); day = Number(match[3]);
    hour = Number(match[4]); minute = Number(match[5]);
    // 年が省略される表示では、現在から最も近い年度を選ぶ。
    const currentYear = now.getUTCFullYear();
    const candidates = [currentYear - 1, currentYear, currentYear + 1];
    year = candidates.reduce((best, candidate) => {
      const bestDiff = Math.abs(Date.parse(`${best}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:00`) - now.getTime());
      const diff = Math.abs(Date.parse(`${candidate}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:00`) - now.getTime());
      return diff < bestDiff ? candidate : best;
    });
  }
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  // Dateは2月30日などを繰り上げるため、JSTへ戻して構成要素も確認する。
  const jst = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
  if (jst.getUTCFullYear() !== year || jst.getUTCMonth() + 1 !== month || jst.getUTCDate() !== day || jst.getUTCHours() !== hour || jst.getUTCMinutes() !== minute) return null;
  return iso;
}

export function toExternalAssignments(message: ManabaSyncMessage, now = new Date()): { records: ExternalAssignment[]; skipped: number } {
  if (message.status !== 'ok') return { records: [], skipped: 0 };
  const records: ExternalAssignment[] = [];
  let skipped = 0;
  for (const row of message.records) {
    const deadline = parseManabaDeadline(row.deadlineText, now);
    if (!deadline) { skipped++; continue; }
    records.push({
      externalId: row.externalId,
      courseName: row.courseName.trim().slice(0, 120),
      assignmentTitle: row.assignmentTitle.trim().slice(0, 200),
      deadline,
      assignmentUrl: row.assignmentUrl,
      assignmentType: row.assignmentType,
      submissionStatus: row.submissionStatus,
    });
  }
  return { records, skipped };
}

// WebView内の同一オリジンだけを取得する。HTMLやフォーム入力値はReact Native側へ送らない。
export const EXTRACT_MANABA_ASSIGNMENTS = `(() => {
  const post = value => window.ReactNativeWebView.postMessage(JSON.stringify(value));
  const clean = value => String(value || '').replace(/[\\u00a0\\u3000]/g, ' ').replace(/\\s+/g, ' ').trim();
  const types = ['query', 'survey', 'report', 'project'];
  const taskPattern = ${MANABA_TASK_PATH_PATTERN};
  const summaryPattern = /\\/ct\\/home_summary_(query|survey|report|project)/i;
  const requiresAuthentication = (doc, pageUrl) => {
    if (doc.querySelector('input[type="password"]')) return true;
    let path = '';
    try { path = new URL(pageUrl).pathname; } catch (_) { /* invalid URL is handled elsewhere */ }
    return Boolean(doc.querySelector('form')) && /ログイン|sign[ -]?in|login/i.test(clean(doc.title) + ' ' + path);
  };
  const findContainer = anchor => {
    const explicit = anchor.closest('tr, li, article, [class*="list-item"], [class*="list_item"], [class*="content-list"], [class*="content_list"]');
    if (explicit) return explicit;
    let node = anchor.parentElement;
    for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
      const text = clean(node.textContent);
      if (text.length < 5000 && /(?:20\\d{2}\\s*[年\\/.\\-]\\s*)?\\d{1,2}\\s*[月\\/.\\-]\\s*\\d{1,2}\\s*日?(?:\\s*\\([^)]*\\))?\\s*\\d{1,2}\\s*[:：]\\s*\\d{2}/.test(text)) return node;
    }
    return anchor.parentElement;
  };
  const parseDocument = (doc, pageUrl) => {
    const rows = [];
    const seen = new Set();
    for (const anchor of Array.from(doc.querySelectorAll('a[href]'))) {
      const href = new URL(anchor.getAttribute('href'), pageUrl);
      const match = href.pathname.match(taskPattern);
      if (!match || href.origin !== window.location.origin) continue;
      const coursePath = match[1].replace(/\\/+$/, '');
      const externalId = href.pathname.replace(/\\/+$/, '');
      if (seen.has(externalId)) continue;
      const container = findContainer(anchor);
      if (!container) continue;
      const assignmentTitle = clean(anchor.textContent || anchor.getAttribute('title') || anchor.getAttribute('aria-label')).slice(0, 500);
      // 「レポート」「アンケート」などのカテゴリリンクも /ct/course_ で
      // 始まるため、単なる前方一致では授業名として誤取得する。課題URLから
      // 導いた授業トップのパスと完全一致するリンクだけを採用する。
      const isMatchingCourseLink = candidate => {
        try {
          const candidateUrl = new URL(candidate.getAttribute('href'), pageUrl);
          return candidateUrl.origin === window.location.origin && candidateUrl.pathname.replace(/\\/+$/, '') === coursePath;
        } catch { return false; }
      };
      const courseAnchor = Array.from(container.querySelectorAll('a[href]')).find(isMatchingCourseLink)
        || Array.from(doc.querySelectorAll('a[href]')).find(isMatchingCourseLink);
      const courseElement = container.querySelector('[class*="course-name"], [class*="course_name"], [class*="coursename"], [class*="course-title"], [class*="course_title"]');
      const deadlineText = clean(container.textContent).slice(0, 2000);
      const fullStart = deadlineText.lastIndexOf('［');
      const fullEnd = deadlineText.indexOf('］', fullStart + 1);
      const asciiStart = deadlineText.lastIndexOf('[');
      const asciiEnd = deadlineText.indexOf(']', asciiStart + 1);
      const bracketCourse = fullStart >= 0 && fullEnd > fullStart && fullEnd - fullStart <= 301
        ? deadlineText.slice(fullStart + 1, fullEnd)
        : asciiStart >= 0 && asciiEnd > asciiStart && asciiEnd - asciiStart <= 301 ? deadlineText.slice(asciiStart + 1, asciiEnd) : '';
      const categoryLabel = /^(?:小テスト|アンケート|レポート|プロジェクト|query|survey|report|project)$/i;
      const courseName = [courseAnchor && courseAnchor.textContent, courseElement && courseElement.textContent, bracketCourse]
        .map(clean)
        .find(value => value && !categoryLabel.test(value));
      if (!assignmentTitle || !courseName || !deadlineText) continue;
      const submitted = /提出済|回答済|採点済|受付済|提出完了/.test(deadlineText);
      seen.add(externalId);
      rows.push({
        externalId,
        courseName: courseName.slice(0, 300),
        assignmentTitle,
        deadlineText,
        assignmentUrl: href.toString().split('#')[0],
        assignmentType: match[1].toLowerCase(),
        submissionStatus: submitted ? 'submitted' : 'not_submitted'
      });
    }
    return rows;
  };
  (async () => {
    if (requiresAuthentication(document, window.location.href)) { post({ kind: 'manaba-sync', status: 'auth_required' }); return; }
    const discovered = Array.from(document.querySelectorAll('a[href]')).filter(anchor => summaryPattern.test(anchor.getAttribute('href') || '') || /未提出課題|提出物一覧/.test(clean(anchor.textContent))).map(anchor => {
      try { return new URL(anchor.getAttribute('href'), window.location.href); } catch { return null; }
    }).filter(url => url && url.origin === window.location.origin);
    const targets = [...discovered, new URL('/ct/home_summary', window.location.origin), ...types.map(type => new URL('/ct/home_summary_' + type, window.location.origin))];
    const unique = Array.from(new Map(targets.map(url => [url.pathname + url.search, url])).values()).slice(0, 12);
    const records = parseDocument(document, window.location.href);
    let pages = 0;
    let authRequired = false;
    for (const url of unique) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(url.toString(), { credentials: 'include', redirect: 'follow', headers: { Accept: 'text/html' }, signal: controller.signal });
        clearTimeout(timeout);
        const responseUrl = new URL(response.url);
        // 提出物ページがSSOやログイン画面へ転送された場合は、単なる通信失敗ではなく
        // セッション切れとしてネイティブ側へ通知する。
        if (responseUrl.origin !== window.location.origin) { authRequired = true; continue; }
        if (!response.ok) continue;
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (requiresAuthentication(doc, response.url)) { authRequired = true; continue; }
        pages++;
        records.push(...parseDocument(doc, response.url));
      } catch (_) { /* 他の提出物ページは継続する */ }
    }
    if (authRequired && pages === 0) { post({ kind: 'manaba-sync', status: 'auth_required' }); return; }
    if (pages === 0) { post({ kind: 'manaba-sync', status: 'error', message: '提出物ページを読み込めませんでした。' }); return; }
    const deduped = Array.from(new Map(records.map(row => [row.externalId, row])).values()).slice(0, 5000);
    post({ kind: 'manaba-sync', status: 'ok', records: deduped, pages });
  })().catch(() => post({ kind: 'manaba-sync', status: 'error', message: '課題情報の解析に失敗しました。' }));
})(); true;`;
