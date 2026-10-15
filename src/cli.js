import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { auth } from './api.js';
import * as data from './data.js';
import { detectLang, strings } from './i18n.js';
import { c, out, err, box, setColorLevel, termWidth } from './ui.js';
import * as R from './render.js';
import { requiresDeveloper, pickClub } from './access.js';
import { clearSession, loadSession, saveSession, toSession, withAuth } from './session.js';
import { isEmail, normalizeCode, validateStandup, errorKey } from './validate.js';
import { VERSION, links } from './config.js';

export const EXIT = { ok: 0, error: 1, usage: 2, notDeveloper: 3, signedOut: 4 };

const OPTIONS = {
  en: { type: 'boolean' },
  ar: { type: 'boolean' },
  json: { type: 'boolean' },
  'no-color': { type: 'boolean' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
  tomorrow: { type: 'boolean' },
  email: { type: 'string' },
  mine: { type: 'boolean' },
  project: { type: 'string' },
  done: { type: 'string' },
  next: { type: 'string' },
  blockers: { type: 'string' },
  yes: { type: 'boolean', short: 'y' },
};

export const COMMANDS = [
  ['today', 'Today’s quote, phenomenon and article'],
  ['phenomenon', 'Today’s phenomenon in full (--tomorrow for the teaser)'],
  ['login', 'Sign in with a 6-digit email code'],
  ['whoami', 'Your account and developer access'],
  ['clubs', 'Your developer clubs'],
  ['tasks [club]', 'The club’s project board (--mine, --project <id>)'],
  ['standup [club]', 'Post your weekly standup (done / next / blockers)'],
  ['logout', 'Sign out on this machine'],
];

export function helpText() {
  const w = Math.max(...COMMANDS.map(([n]) => n.length));
  return [
    `${c.gold('☀')} ${c.bold('ishraqa')} ${c.grey('v' + VERSION)}  ${c.grey('Ishraqa Daily in your terminal')}`,
    '',
    c.bold('Usage'),
    '  ishraqa <command> [options]',
    '',
    c.bold('Commands'),
    ...COMMANDS.map(([n, d]) => `  ${c.gold(n.padEnd(w))}  ${d}`),
    '',
    c.bold('Options'),
    `  ${'--en / --ar'.padEnd(w)}  Interface language (default: your system locale)`,
    `  ${'--json'.padEnd(w)}  Machine-readable output`,
    `  ${'--no-color'.padEnd(w)}  Plain output (NO_COLOR is honoured too)`,
    `  ${'-h, --help'.padEnd(w)}  Show this help`,
    `  ${'-v, --version'.padEnd(w)}  Show the version`,
    '',
    c.grey('Member commands need an Ishraqa developer account: ' + links.site),
  ].join('\n');
}

async function ask(rl, q) {
  return (await rl.question(q)).trim();
}

function fail(t, e) {
  const k = errorKey(e);
  err(c.red('✖ ') + (k ? t[k] : t.generic(e?.message || String(e))));
  return k === 'notSignedIn' ? EXIT.signedOut : EXIT.error;
}

/** Resolves the session + access for member commands, or prints why not. */
async function requireDeveloper(ctx) {
  const { t, lang } = ctx;
  return withAuth(async (token, s) => {
    const access = await data.checkAccess(token, s.user.id);
    if (!access.allowed) {
      out(R.renderGate(lang));
      return { denied: true };
    }
    return { token, session: s, access };
  });
}

async function chooseClub(ctx, clubs, query, rl) {
  const r = pickClub(clubs, query);
  if (r.club) return r.club;
  if (r.error === 'no_clubs') {
    out(ctx.t.noClubs);
    return null;
  }
  if (r.error === 'not_found') err(c.sun(ctx.t.clubNotFound));
  if (!stdin.isTTY || !rl) {
    out(R.renderChoices(r.choices, ctx.lang));
    return null;
  }
  out(R.renderChoices(r.choices, ctx.lang));
  const again = pickClub(r.choices, await ask(rl, '> '));
  return again.club || null;
}

// ── Commands ──
const run = {
  async today(ctx) {
    const date = new Date();
    const s = loadSession();
    const [quote, phenomenon, article] = await Promise.all([
      data.todayQuote(date),
      data.todayPhenomenon(s?.access_token).catch(() => data.todayPhenomenon()),
      data.todayArticle(date),
    ]);
    if (ctx.json) return out(JSON.stringify({ quote, phenomenon, article }, null, 2));
    out(R.renderToday({ quote, phenomenon, article, date }, ctx.lang));
  },

  async phenomenon(ctx) {
    if (ctx.values.tomorrow) {
      const x = await data.tomorrowTeaser();
      return ctx.json ? out(JSON.stringify(x, null, 2)) : out(R.renderTeaser(x, ctx.lang));
    }
    const p = await data.todayPhenomenon();
    if (ctx.json) return out(JSON.stringify(p, null, 2));
    out(R.renderPhenomenon(p, ctx.lang));
  },

  async login(ctx) {
    const { t } = ctx;
    if (!stdin.isTTY && !ctx.values.email) {
      err(t.needsTty);
      return EXIT.usage;
    }
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      const email = (ctx.values.email || (await ask(rl, t.emailPrompt))).toLowerCase();
      if (!isEmail(email)) {
        err(c.red('✖ ') + t.badEmail);
        return EXIT.usage;
      }
      await auth.sendCode(email);
      out(c.green('✉ ') + t.codeSent(email));
      let code = null;
      for (let i = 0; i < 3 && !code; i++) {
        code = normalizeCode(await ask(rl, t.codePrompt));
        if (!code) err(c.sun(t.badCode));
      }
      if (!code) return EXIT.usage;
      const session = toSession(await auth.verifyCode(email, code));
      const access = await data.checkAccess(session.access_token, session.user.id);
      if (!access.allowed) {
        // Not a developer: don't keep tokens around for nothing.
        await auth.logout(session.access_token).catch(() => {});
        out(R.renderGate(ctx.lang));
        return EXIT.notDeveloper;
      }
      saveSession(session);
      const p = await data.profile(session.access_token, session.user.id).catch(() => null);
      out(c.green('✔ ') + t.signedIn(c.bold(p?.display_name || email)));
      out(c.grey(access.reason === 'club' ? t.accessClub(access.clubs.length) : t.accessHub));
    } finally {
      rl.close();
    }
  },

  async logout(ctx) {
    const s = loadSession();
    if (!s) return out(ctx.t.alreadyOut);
    await auth.logout(s.access_token).catch(() => {});
    clearSession();
    out(c.green('✔ ') + ctx.t.signedOut);
  },

  async whoami(ctx) {
    const r = await withAuth(async (token, s) => {
      const [profile, access] = await Promise.all([data.profile(token, s.user.id), data.checkAccess(token, s.user.id)]);
      return { profile, email: s.user.email, access };
    });
    if (ctx.json) return out(JSON.stringify(r, null, 2));
    out(R.renderWhoami(r, ctx.lang));
    if (!r.access.allowed) {
      out('');
      out(R.renderGate(ctx.lang));
    }
  },

  async clubs(ctx) {
    const g = await requireDeveloper(ctx);
    if (g.denied) return EXIT.notDeveloper;
    const pulses = {};
    await Promise.all(
      g.access.clubs.map(async (cl) => {
        pulses[cl.id] = await data.clubPulse(g.token, cl.id).catch(() => null);
      }),
    );
    if (ctx.json) return out(JSON.stringify(g.access.clubs.map((cl) => ({ ...cl, pulse: pulses[cl.id] })), null, 2));
    out(R.renderClubs(g.access.clubs, pulses, ctx.lang));
  },

  async tasks(ctx) {
    const g = await requireDeveloper(ctx);
    if (g.denied) return EXIT.notDeveloper;
    const rl = stdin.isTTY && !ctx.json ? createInterface({ input: stdin, output: stdout }) : null;
    try {
      const club = await chooseClub(ctx, g.access.clubs, ctx.positionals[0], rl);
      if (!club) return EXIT.usage;
      const list = await data.projects(g.token, club.id);
      const project = ctx.values.project ? list.find((p) => p.id === ctx.values.project) : data.currentProject(list);
      if (!project) return out(ctx.t.noProject);
      const b = await data.board(g.token, project.id);
      if (ctx.json) return out(JSON.stringify({ club, project, ...b }, null, 2));
      out(R.renderBoard({ club, project, tasks: b.tasks, mineId: ctx.values.mine ? g.session.user.id : null }, ctx.lang));
      if (list.length > 1) out(c.grey(`${ctx.t.projects}: ` + list.map((p) => `${p.title} (${p.id.slice(0, 8)})`).join(', ')));
    } finally {
      rl?.close();
    }
  },

  async standup(ctx) {
    const { t, values } = ctx;
    const g = await requireDeveloper(ctx);
    if (g.denied) return EXIT.notDeveloper;
    const flagged = values.done != null || values.next != null || values.blockers != null;
    if (!flagged && !stdin.isTTY) {
      err(t.needsTty);
      return EXIT.usage;
    }
    const rl = stdin.isTTY ? createInterface({ input: stdin, output: stdout }) : null;
    try {
      const club = await chooseClub(ctx, g.access.clubs, ctx.positionals[0], rl);
      if (!club) return EXIT.usage;
      let answers = { did: values.done, next: values.next, blockers: values.blockers };
      if (!flagged) {
        out(box([t.standupIntro], { title: c.green(t.standupTitle(club.name)), color: c.green, width: termWidth() }));
        answers = { did: await ask(rl, c.green('✔ ') + t.did), next: await ask(rl, c.sky('→ ') + t.next), blockers: await ask(rl, c.sun('⚠ ') + t.blockers) };
      }
      const v = validateStandup(answers);
      if (!v.ok) {
        err(c.red('✖ ') + t[v.error === 'too_long' ? 'tooLong' : 'standupEmpty']);
        return EXIT.usage;
      }
      if (!values.yes && rl) {
        const yn = (await ask(rl, t.confirm)).toLowerCase();
        if (yn && !['y', 'yes', 'ن', 'نعم'].includes(yn)) return out(t.cancelled);
      }
      await data.postStandup(g.token, club.id, { did: v.value.did, next: v.value.next, blockers: v.value.blockers });
      out(c.green('✔ ') + t.posted);
    } finally {
      rl?.close();
    }
  },
};

export async function main(argv = process.argv.slice(2)) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (e) {
    err(c.red('✖ ') + e.message);
    err(helpText());
    return EXIT.usage;
  }
  const { values, positionals } = parsed;
  if (values['no-color'] || values.json) setColorLevel(0);
  const lang = detectLang({ flags: values });
  const t = strings(lang);
  if (values.version) return out(VERSION), EXIT.ok;
  const [cmd = 'today', ...rest] = positionals;
  if (values.help || cmd === 'help') return out(helpText()), EXIT.ok;
  const fn = run[cmd];
  if (!fn) {
    err(c.red('✖ ') + t.unknownCommand(cmd));
    err(helpText());
    return EXIT.usage;
  }
  const ctx = { lang, t, values, positionals: rest, json: !!values.json, needsDev: requiresDeveloper(cmd) };
  try {
    // المحتوى نفسه (اليوم والظاهرة) للمطوّرين فقط أيضًا؛ أوامر الأندية تتحقق بنفسها
    if (ctx.needsDev && (cmd === 'today' || cmd === 'phenomenon')) {
      const g = await requireDeveloper(ctx);
      if (g.denied) return EXIT.notDeveloper;
    }
    return (await fn(ctx)) ?? EXIT.ok;
  } catch (e) {
    if (process.env.ISHRAQA_DEBUG) err(e?.stack || String(e));
    return fail(t, e);
  }
}

