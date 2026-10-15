import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setColorLevel, width } from '../src/ui.js';
import { renderGate, renderBoard, groupTasks, renderToday, renderTeaser, renderWhoami, renderClubs } from '../src/render.js';

setColorLevel(0);
const W = 60;
const sameWidth = (s) => s.split('\n').every((l) => width(l) === W);

test('gate points to the app and asks to join a developers club', () => {
  for (const lang of ['en', 'ar']) {
    const s = renderGate(lang, W);
    assert.ok(s.includes('https://ishraqa.app'));
    assert.ok(sameWidth(s));
  }
  assert.match(renderGate('en', W), /developers club/);
});

test('board groups by column, filters mine, caps done', () => {
  const tasks = [
    { id: 1, title: 'B', status: 'todo', position: 2 },
    { id: 2, title: 'A', status: 'todo', position: 1, assignee_id: 'me' },
    { id: 3, title: 'R', status: 'review', reviewer_id: 'me' },
    ...Array.from({ length: 7 }, (_, i) => ({ id: 10 + i, title: 'D' + i, status: 'done', done_at: `2026-10-0${i + 1}` })),
  ];
  const { groups, hiddenDone } = groupTasks(tasks);
  assert.deepEqual(groups.todo.map((t) => t.title), ['A', 'B']);
  assert.equal(groups.done.length, 5);
  assert.equal(groups.done[0].title, 'D6');
  assert.equal(hiddenDone, 2);
  const mine = groupTasks(tasks, { mineId: 'me' }).groups;
  assert.deepEqual([mine.todo.length, mine.review.length, mine.done.length], [1, 1, 0]);
  const s = renderBoard({ club: { name: 'Crew' }, project: { title: 'CLI' }, tasks }, 'en', W);
  assert.ok(sameWidth(s));
  assert.match(s, /To do/);
  assert.match(s, /\+2 more done/);
});

test('today renders and survives missing parts', () => {
  const ar = renderToday(
    { quote: { id: 269, quote: 'اعمل في صمت', author: 'حكمة' }, phenomenon: null, article: null, date: new Date(2026, 9, 15) },
    'ar',
    W,
  );
  assert.ok(ar.includes('https://ishraqa.app/q/269/'));
  assert.ok(ar.includes('لا ظاهرة اليوم'));
  const en = renderToday(
    {
      quote: { id: 269, quote: 'x' },
      phenomenon: { title: 'T', title_en: 'Green Sahara', hook: 'h', color: '#00897B' },
      article: { title: 'A', slug: 'a-b', reading_minutes: 3 },
    },
    'en',
    W,
  );
  assert.ok(en.includes('Work in silence'));
  assert.ok(en.includes('Green Sahara'));
  assert.ok(en.includes('https://ishraqa.app/a/a-b'));
});

test('teaser and empty states', () => {
  assert.match(renderTeaser(null, 'en', W), /still a surprise/);
  assert.match(renderTeaser({ teaser: 'x…', teaser_en: 'Scientific…', release_on: '2026-10-16' }, 'en', W), /Scientific…/);
  assert.match(renderClubs([], {}, 'en', W), /not in a developers club/);
});

test('whoami shows access state', () => {
  const s = renderWhoami(
    { profile: { display_name: 'Saif', username: 'saif' }, email: 's@x.io', access: { allowed: true, clubs: [{ name: 'Crew' }], hub: ['github'] } },
    'en',
  );
  assert.match(s, /@saif/);
  assert.match(s, /developer/);
  assert.match(s, /GitHub linked/);
});
