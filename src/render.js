// Pure formatters: data in, string out. No network, no globals besides colour.
import { box, c, hex, table, width, termWidth } from './ui.js';
import { strings } from './i18n.js';
import { links } from './config.js';
import { englishOf } from './quote.js';

const pick = (o, key, lang) => (lang === 'en' && o?.[`${key}_en`]) || o?.[key];

export function quoteLines(q, lang) {
  if (!q) return [];
  const en = lang === 'en' ? englishOf(q.id) : null;
  const text = en?.text || q.quote || '';
  const author = (en ? en.author : q.author) || '';
  return [c.bold(`“${text}”`), author ? c.grey(`— ${author}`) : '', c.dim(links.quote(q.id))].filter(
    (l) => l !== '',
  );
}

export function renderToday({ quote, phenomenon, article, date = new Date() }, lang, w = termWidth()) {
  const t = strings(lang);
  const day = date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const parts = [];
  parts.push(c.gold('  ☀  ') + c.bold(t.tagline) + c.grey('  ·  ' + day));
  parts.push('');
  parts.push(box(quote ? quoteLines(quote, lang) : [c.grey('…')], { title: c.gold(t.quoteTitle), width: w }));
  if (phenomenon) {
    const col = hex(phenomenon.color);
    parts.push(
      box([c.bold(`${phenomenon.emoji || '✨'} ${pick(phenomenon, 'title', lang)}`), pick(phenomenon, 'hook', lang), c.dim('ishraqa phenomenon')], {
        title: col(t.phenomenonTitle),
        width: w,
        color: col,
      }),
    );
  } else {
    parts.push(box([c.grey(t.noPhenomenon)], { title: t.phenomenonTitle, width: w, color: c.plum }));
  }
  if (article) {
    const meta = [article.author_name, article.reading_minutes ? t.minRead(article.reading_minutes) : null]
      .filter(Boolean)
      .join('  ·  ');
    parts.push(
      box([c.bold(article.title), article.excerpt || '', c.grey(meta), c.dim(links.article(article.slug))].filter(Boolean), {
        title: c.sky(t.articleTitle),
        width: w,
        color: c.sky,
      }),
    );
  } else {
    parts.push(box([c.grey(t.noArticle)], { title: t.articleTitle, width: w, color: c.sky }));
  }
  return parts.join('\n');
}

function bar(n, total, w = 20) {
  const filled = total ? Math.round((n / total) * w) : 0;
  return '█'.repeat(filled) + c.grey('░'.repeat(w - filled));
}

export function renderPhenomenon(p, lang, w = termWidth()) {
  const t = strings(lang);
  if (!p) return box([c.grey(t.noPhenomenon)], { title: t.phenomenonTitle, width: w, color: c.plum });
  const col = hex(p.color);
  const lines = [c.bold(`${p.emoji || '✨'} ${pick(p, 'title', lang)}`), '', c.italic(pick(p, 'hook', lang) || '')];
  const body = pick(p, 'body', lang);
  if (body) lines.push(null, body);
  const facts = (lang === 'en' && p.facts_en?.length ? p.facts_en : p.facts) || [];
  if (facts.length) {
    lines.push(null, col(c.bold(t.facts)));
    for (const f of facts) lines.push(`${col('◆')} ${f}`);
  }
  const why = pick(p, 'why', lang);
  if (why) lines.push(null, col(c.bold(t.why)), why);
  const pq = pick(p, 'poll_question', lang);
  const opts = (lang === 'en' && p.poll_options_en?.length ? p.poll_options_en : p.poll_options) || [];
  if (pq && opts.length === 2) {
    const a = Number(p.poll?.a) || 0;
    const b = Number(p.poll?.b) || 0;
    const ow = Math.max(width(opts[0]), width(opts[1]));
    lines.push(null, col(c.bold(t.poll)) + '  ' + pq);
    const row = (label, n) => `${label}${' '.repeat(ow - width(label))}  ${bar(n, a + b, 16)}  ${c.grey(t.votes(n))}`;
    lines.push(row(opts[0], a), row(opts[1], b));
  }
  const qs = (lang === 'en' && p.questions_en?.length ? p.questions_en : p.questions) || [];
  if (qs.length) {
    lines.push(null, col(c.bold(t.talk)));
    for (const q of qs) lines.push(`${col('?')} ${q}`);
  }
  lines.push(null, c.dim(`${t.readMore}: ${links.site}`));
  return box(lines, { title: col(`${t.phenomenonTitle} · ${p.release_on || ''}`.trim()), width: w, color: col });
}

export function renderTeaser(x, lang, w = termWidth()) {
  const t = strings(lang);
  if (!x) return box([c.grey(t.noTeaser)], { title: t.tomorrowTitle, width: w, color: c.plum });
  const col = hex(x.color);
  return box([c.bold(`${x.emoji || '✨'}  ${pick(x, 'teaser', lang)}`), c.grey(t.tomorrowHint)], {
    title: col(`${t.tomorrowTitle} · ${x.release_on || ''}`.trim()),
    width: w,
    color: col,
  });
}

export function renderGate(lang, w = termWidth()) {
  const t = strings(lang);
  return box([t.gateBody, '', `${t.gateLink}: ${c.underline(links.site)}`], { title: c.sun(t.gateTitle), width: w, color: c.sun });
}

export function renderWhoami({ profile, email, access }, lang) {
  const t = strings(lang);
  const rows = [
    [t.name, c.bold(profile?.display_name || '—')],
    [t.username, profile?.username ? '@' + profile.username : '—'],
    [t.email, email || '—'],
    [t.access, access.allowed ? c.green('✔ ' + t.granted) : c.sun('✖ ' + t.denied)],
    [t.clubsLabel, access.clubs.length ? access.clubs.map((x) => x.name).join(', ') : '—'],
    [t.hub, access.hub.length ? access.hub.map((s) => t.hubSignals[s] || s).join(', ') : '—'],
  ];
  return table(rows);
}

export function renderClubs(clubs, pulses, lang, w = termWidth()) {
  const t = strings(lang);
  if (!clubs.length) return box([t.noClubs, c.dim(links.site)], { title: t.clubsTitle, width: w, color: c.green });
  const lines = [];
  clubs.forEach((cl, i) => {
    if (i) lines.push(null);
    const p = pulses?.[cl.id];
    lines.push(`${c.green(c.bold(String(i + 1) + '.'))} ${c.bold(cl.name)}${cl.official ? c.gold(' ★') : ''}`);
    const meta = [t.role[cl.role] || cl.role, t.members(cl.members)];
    if (p) meta.push(t.pulse(p.open_total ?? 0, p.done_week ?? 0));
    lines.push(c.grey(meta.join('  ·  ')));
  });
  return box(lines, { title: c.green('⌨ ' + t.clubsTitle), width: w, color: c.green });
}

const STATUS = ['todo', 'doing', 'review', 'done'];
const statusColour = { todo: c.grey, doing: c.sky, review: c.plum, done: c.green };
const statusIcon = { todo: '○', doing: '◐', review: '◑', done: '●' };

/** Groups tasks by column, sorted by position; `done` capped at `doneLimit`. */
export function groupTasks(tasks, { mineId = null, doneLimit = 5 } = {}) {
  const g = { todo: [], doing: [], review: [], done: [] };
  for (const x of tasks || []) {
    if (mineId && x.assignee_id !== mineId && x.reviewer_id !== mineId) continue;
    (g[x.status] || g.todo).push(x);
  }
  for (const k of STATUS) g[k].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  g.done.sort((a, b) => String(b.done_at || '').localeCompare(String(a.done_at || '')));
  const hiddenDone = Math.max(0, g.done.length - doneLimit);
  g.done = g.done.slice(0, doneLimit);
  return { groups: g, hiddenDone };
}

export function renderBoard({ club, project, tasks, mineId }, lang, w = termWidth()) {
  const t = strings(lang);
  const { groups, hiddenDone } = groupTasks(tasks, { mineId });
  const lines = [];
  if (project.repo_url) lines.push(c.dim(project.repo_url));
  for (const s of STATUS) {
    const col = statusColour[s];
    if (lines.length) lines.push(null);
    lines.push(col(c.bold(`${statusIcon[s]} ${t.cols[s]}`)) + c.grey(`  ${groups[s].length + (s === 'done' ? hiddenDone : 0)}`));
    if (!groups[s].length) lines.push(c.grey('  ' + t.noTasks));
    for (const x of groups[s]) {
      const meta = [];
      if (x.assignee_name) meta.push('@' + x.assignee_name);
      if (x.labels?.length) meta.push(x.labels.map((l) => '#' + l).join(' '));
      if (x.due_on && s !== 'done') meta.push(`${t.due} ${x.due_on}`);
      if (x.pr_url) meta.push(x.pr_url);
      lines.push(`  ${col('•')} ${x.title}`);
      if (meta.length) lines.push(c.grey('    ' + meta.join('  ·  ')));
    }
    if (s === 'done' && hiddenDone) lines.push(c.grey('  ' + t.moreDone(hiddenDone)));
  }
  return box(lines, { title: c.green(t.tasksTitle(club.name, project.title)), width: w, color: c.green });
}

export function renderChoices(clubs, lang) {
  const t = strings(lang);
  return [t.pickClub, ...clubs.map((cl, i) => `  ${c.green(String(i + 1) + '.')} ${cl.name}`)].join('\n');
}
