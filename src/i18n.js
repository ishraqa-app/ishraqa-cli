// Interface language: English or Arabic.
// Order: --en / --ar flag, then ISHRAQA_LANG, then the system locale.

export function detectLang({ flags = {}, env = process.env, intl } = {}) {
  if (flags.en) return 'en';
  if (flags.ar) return 'ar';
  const pick = (v) => (v ? (/^ar\b|^ar[_-]/i.test(v) ? 'ar' : 'en') : null);
  const forced = (env.ISHRAQA_LANG || '').toLowerCase();
  if (forced === 'ar' || forced === 'en') return forced;
  for (const k of ['LC_ALL', 'LC_MESSAGES', 'LANG', 'LANGUAGE']) {
    const v = env[k];
    if (v && v !== 'C' && v !== 'POSIX' && !/^C\./.test(v)) return pick(v);
  }
  let loc = intl;
  if (loc === undefined) {
    try {
      loc = Intl.DateTimeFormat().resolvedOptions().locale;
    } catch {
      loc = '';
    }
  }
  return pick(loc) || 'en';
}

const S = {
  en: {
    tagline: 'Ishraqa Daily',
    today: 'Today',
    quoteTitle: 'Ishraqa of the day',
    phenomenonTitle: 'Phenomenon of the day',
    articleTitle: 'Article of the day',
    tomorrowTitle: 'Tomorrow',
    tomorrowHint: 'Opens tomorrow in Ishraqa Daily.',
    minRead: (n) => `${n} min read`,
    why: 'Why it matters',
    facts: 'Quick facts',
    poll: 'Poll',
    votes: (n) => `${n} vote${n === 1 ? '' : 's'}`,
    talk: 'Talk about it',
    noPhenomenon: 'No phenomenon today. Check back tomorrow.',
    noTeaser: 'Tomorrow is still a surprise.',
    noArticle: 'No article today.',
    readMore: 'Continue in the app',
    // auth
    emailPrompt: 'Email of your Ishraqa account: ',
    codeSent: (e) => `A 6-digit code is on its way to ${e}.`,
    codePrompt: 'Code: ',
    badEmail: 'That does not look like an email address.',
    badCode: 'The code is 6 digits.',
    wrongCode: 'That code is wrong or expired. Run `ishraqa login` to get a new one.',
    noAccount: 'No Ishraqa account uses this email. Create one in the app first.',
    tooMany: 'Too many attempts. Wait a minute and try again.',
    signedIn: (n) => `Signed in as ${n}.`,
    signedOut: 'Signed out. See you tomorrow.',
    notSignedIn: 'You are not signed in. Run `ishraqa login`.',
    alreadyOut: 'You were not signed in.',
    // access
    gateTitle: 'Developers only',
    gateBody:
      'The Ishraqa CLI is for members of the developers’ world. Join a developers club (or take part in the developers hub) in the Ishraqa Daily app, then run `ishraqa login` again.',
    gateLink: 'Get the app',
    accessClub: (n) => `developer clubs: ${n}`,
    accessHub: 'developers hub',
    // whoami
    whoTitle: 'You',
    name: 'Name',
    username: 'Username',
    email: 'Email',
    access: 'Access',
    clubsLabel: 'Clubs',
    hub: 'Hub',
    granted: 'developer',
    denied: 'not yet a developer',
    hubSignals: { github: 'GitHub linked', challenges: 'challenges solved', mentor: 'mentor', projects: 'team projects' },
    // clubs
    clubsTitle: 'My developer clubs',
    noClubs: 'You are not in a developers club yet. Find one in the app.',
    role: { owner: 'lead', moderator: 'moderator', mentor: 'mentor', member: 'member' },
    members: (n) => `${n} member${n === 1 ? '' : 's'}`,
    pulse: (o, w) => `${o} open · ${w} done this week`,
    // tasks
    tasksTitle: (club, project) => `${club} · ${project}`,
    noProject: 'This club has no project yet.',
    pickClub: 'Which club? Pass its number or part of its name:',
    clubNotFound: 'No developer club matches that.',
    cols: { todo: 'To do', doing: 'Doing', review: 'In review', done: 'Done' },
    noTasks: 'Nothing here yet.',
    due: 'due',
    moreDone: (n) => `+${n} more done`,
    projects: 'Projects',
    // standup
    standupTitle: (club) => `Weekly standup · ${club}`,
    standupIntro: 'Three short answers. Leave one empty to skip it.',
    did: 'What did you get done? ',
    next: 'What is next? ',
    blockers: 'Anything blocking you? ',
    standupEmpty: 'Write at least a few words in "done" or "next".',
    tooLong: 'Too long: done/next up to 600 characters, blockers up to 400.',
    confirm: 'Post it? [Y/n] ',
    cancelled: 'Not posted.',
    posted: 'Standup posted. Your team can see it now.',
    notMember: 'You can’t post in this club (not a member, muted, or not a developers club).',
    // errors
    offline: 'Can’t reach Ishraqa. Check your connection and try again.',
    generic: (m) => `Something went wrong: ${m}`,
    unknownCommand: (cmd) => `Unknown command "${cmd}".`,
    needsTty: 'This command is interactive. Pass the answers as flags instead (see --help).',
  },
  ar: {
    tagline: 'إشراقة يومية',
    today: 'اليوم',
    quoteTitle: 'إشراقة اليوم',
    phenomenonTitle: 'ظاهرة اليوم',
    articleTitle: 'مقال اليوم',
    tomorrowTitle: 'غدًا',
    tomorrowHint: 'تُفتح غدًا في إشراقة يومية.',
    minRead: (n) => `قراءة ${n} د`,
    why: 'لماذا تهمّ',
    facts: 'حقائق سريعة',
    poll: 'تصويت',
    votes: (n) => `${n} صوت`,
    talk: 'للنقاش',
    noPhenomenon: 'لا ظاهرة اليوم. عُد غدًا.',
    noTeaser: 'ظاهرة الغد ما زالت مفاجأة.',
    noArticle: 'لا مقال اليوم.',
    readMore: 'أكمل في التطبيق',
    emailPrompt: 'بريد حسابك في إشراقة: ',
    codeSent: (e) => `أرسلنا رمزًا من 6 أرقام إلى ${e}.`,
    codePrompt: 'الرمز: ',
    badEmail: 'هذا لا يبدو بريدًا إلكترونيًّا.',
    badCode: 'الرمز 6 أرقام.',
    wrongCode: 'الرمز غير صحيح أو انتهت صلاحيته. شغّل `ishraqa login` لرمز جديد.',
    noAccount: 'لا حساب في إشراقة بهذا البريد. أنشئ حسابك من التطبيق أولًا.',
    tooMany: 'محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.',
    signedIn: (n) => `دخلتَ باسم ${n}.`,
    signedOut: 'خرجتَ. نلقاك غدًا.',
    notSignedIn: 'لم تسجّل الدخول. شغّل `ishraqa login`.',
    alreadyOut: 'لم تكن مسجّل الدخول.',
    gateTitle: 'للمطوّرين',
    gateBody:
      'أداة إشراقة في الطرفية لأهل عالم المطوّرين. انضم إلى نادي مطوّرين (أو شارك في مركز المطوّرين) في تطبيق إشراقة يومية، ثم شغّل `ishraqa login` من جديد.',
    gateLink: 'حمّل التطبيق',
    accessClub: (n) => `أندية المطوّرين: ${n}`,
    accessHub: 'مركز المطوّرين',
    whoTitle: 'أنت',
    name: 'الاسم',
    username: 'المعرّف',
    email: 'البريد',
    access: 'الصلاحية',
    clubsLabel: 'الأندية',
    hub: 'المركز',
    granted: 'مطوّر',
    denied: 'لست في عالم المطوّرين بعد',
    hubSignals: { github: 'GitHub مربوط', challenges: 'تحديات محلولة', mentor: 'مرشد', projects: 'مشاريع فريق' },
    clubsTitle: 'أنديتي للمطوّرين',
    noClubs: 'لست في نادي مطوّرين بعد. ابحث عن واحد في التطبيق.',
    role: { owner: 'قائد', moderator: 'مشرف', mentor: 'مرشد', member: 'عضو' },
    members: (n) => `${n} عضو`,
    pulse: (o, w) => `${o} مفتوحة · ${w} أُنجزت هذا الأسبوع`,
    tasksTitle: (club, project) => `${club} · ${project}`,
    noProject: 'لا مشروع في هذا النادي بعد.',
    pickClub: 'أي نادٍ؟ اكتب رقمه أو جزءًا من اسمه:',
    clubNotFound: 'لا نادي مطوّرين بهذا الاسم.',
    cols: { todo: 'للعمل', doing: 'قيد العمل', review: 'للمراجعة', done: 'أُنجز' },
    noTasks: 'لا شيء هنا بعد.',
    due: 'موعده',
    moreDone: (n) => `و${n} مهام أخرى أُنجزت`,
    projects: 'المشاريع',
    standupTitle: (club) => `الوقفة الأسبوعية · ${club}`,
    standupIntro: 'ثلاث إجابات قصيرة. اترك أيًّا منها فارغًا لتتخطاه.',
    did: 'ماذا أنجزت؟ ',
    next: 'ما التالي؟ ',
    blockers: 'هل يعيقك شيء؟ ',
    standupEmpty: 'اكتب بضع كلمات على الأقل في «أنجزت» أو «التالي».',
    tooLong: 'النص طويل: أنجزت/التالي حتى 600 حرف، والعوائق حتى 400.',
    confirm: 'أنشرها؟ [Y/n] ',
    cancelled: 'لم تُنشر.',
    posted: 'نُشرت وقفتك. يراها فريقك الآن.',
    notMember: 'لا يمكنك النشر في هذا النادي (لست عضوًا، أو مكتوم، أو ليس نادي مطوّرين).',
    offline: 'تعذّر الوصول إلى إشراقة. تحقّق من اتصالك وأعد المحاولة.',
    generic: (m) => `حدث خطأ: ${m}`,
    unknownCommand: (cmd) => `أمر غير معروف «${cmd}».`,
    needsTty: 'هذا الأمر تفاعلي. مرّر الإجابات خيارات بدلًا من ذلك (انظر --help).',
  },
};

export const strings = (lang) => S[lang] || S.en;
export const LANGS = Object.keys(S);
