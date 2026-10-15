import { test } from 'node:test';
import assert from 'node:assert/strict';
import { devClubsFrom, hubSignals, evaluateAccess, pickClub, requiresDeveloper } from '../src/access.js';

const club = (id, name, kind = 'build', extra = {}) => ({
  role: 'member',
  clubs: { id, name, kind, member_count: 3, is_hidden: false, ...extra },
});

test('only visible developer clubs count', () => {
  const m = [
    club('1', 'Flutter Crew'),
    club('2', 'Readers', 'reading'),
    club('3', 'Lang', 'language'),
    club('4', 'Old', 'build', { is_hidden: true }),
    { role: 'x', clubs: null },
  ];
  assert.deepEqual(devClubsFrom(m).map((c) => c.id), ['1']);
});

test('hub signals', () => {
  assert.deepEqual(hubSignals(null), []);
  assert.deepEqual(hubSignals({ github: '  ', solved: 0, mentor: false, projects_shipped: 0, projects_building: 0 }), []);
  assert.deepEqual(
    hubSignals({ github: 'octocat', solved: 2, mentor: true, projects_shipped: 0, projects_building: 1 }),
    ['github', 'challenges', 'mentor', 'projects'],
  );
});

test('access: developer club member is allowed', () => {
  const a = evaluateAccess({ memberships: [club('1', 'Dev')] });
  assert.deepEqual([a.allowed, a.reason], [true, 'club']);
});

test('access: hub-only developer is allowed', () => {
  const a = evaluateAccess({ memberships: [club('2', 'Readers', 'reading')], stats: { github: 'me' } });
  assert.deepEqual([a.allowed, a.reason], [true, 'hub']);
});

test('access: account outside the developers world is denied', () => {
  const a = evaluateAccess({ memberships: [club('2', 'Readers', 'reading')], stats: { github: null, solved: 0 } });
  assert.deepEqual([a.allowed, a.reason, a.clubs.length], [false, 'none', 0]);
  assert.equal(evaluateAccess().allowed, false);
});

test('access: server verdict wins over client signals', () => {
  const denied = evaluateAccess({ memberships: [club('1', 'Dev')], server: { allowed: false, clubs: [], hub: [] } });
  assert.equal(denied.allowed, false);
  const ok = evaluateAccess({ server: { allowed: true, clubs: [{ id: 'a', name: 'A' }], hub: [] } });
  assert.deepEqual([ok.allowed, ok.reason], [true, 'club']);
});

test('member commands are gated, content commands are not', () => {
  for (const c of ['today', 'phenomenon', 'clubs', 'tasks', 'standup']) assert.equal(requiresDeveloper(c), true);
  for (const c of ['login', 'logout', 'whoami']) assert.equal(requiresDeveloper(c), false);
});

test('pickClub by index, id or name fragment', () => {
  const clubs = devClubsFrom([club('a1', 'Flutter Crew'), club('b2', 'Kotlin Academy'), club('c3', 'نادي المطوّرين')]);
  assert.equal(pickClub(clubs, '2').club.id, 'b2');
  assert.equal(pickClub(clubs, 'c3').club.id, 'c3');
  assert.equal(pickClub(clubs, 'flutter').club.id, 'a1');
  assert.equal(pickClub(clubs, 'المطوّرين').club.id, 'c3');
  assert.equal(pickClub(clubs, '').error, 'ambiguous');
  assert.equal(pickClub(clubs, 'zzz').error, 'not_found');
  assert.equal(pickClub([clubs[0]], undefined).club.id, 'a1');
  assert.equal(pickClub([], 'x').error, 'no_clubs');
});
