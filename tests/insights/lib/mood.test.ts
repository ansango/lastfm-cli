/**
 * mood.test.ts — unit tests for `lib/mood.ts` classifier.
 *
 * The classifier is pure: takes a list of tag strings, returns a MoodProfile.
 * Taxonomy lives in lib/mood.ts and can be edited by the user without
 * touching tests — these tests assert *behavior* (axes move toward known
 * quadrants, categories fire), not exact mappings.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyMood, axesFromTags, categoriesFromTags, type MoodAxes } from '../../../src/insights/lib/mood.js';

test('axesFromTags returns neutral axes for empty input', () => {
  const a = axesFromTags([]);
  assert.equal(a.energy, 0);
  assert.equal(a.valence, 0);
});

test('axesFromTags pushes energy up for high-energy tags', () => {
  const a = axesFromTags(['hardcore', 'punk', 'thrash metal']);
  assert.ok(a.energy > 0, `expected energy > 0, got ${a.energy}`);
});

test('axesFromTags pushes energy down for ambient/downtempo tags', () => {
  const a = axesFromTags(['ambient', 'drone', 'sleep']);
  assert.ok(a.energy < 0, `expected energy < 0, got ${a.energy}`);
});

test('axesFromTags pushes valence up for euphoric tags', () => {
  const a = axesFromTags(['euphoric', 'summer', 'happy']);
  assert.ok(a.valence > 0);
});

test('axesFromTags pushes valence down for sad tags', () => {
  const a = axesFromTags(['sad', 'melancholic', 'doom']);
  assert.ok(a.valence < 0);
});

test('axesFromTags averages contributions when tags disagree', () => {
  // one up, one down → near zero
  const a = axesFromTags(['hardcore', 'ambient']);
  assert.ok(Math.abs(a.energy) < 0.3, `expected near zero, got ${a.energy}`);
});

test('axesFromTags keeps axes in [-1, 1]', () => {
  const a = axesFromTags([
    'hardcore', 'punk', 'thrash metal', 'speed metal', 'grindcore',
    'happy', 'euphoric', 'summer', 'uplifting',
  ]);
  assert.ok(a.energy >= -1 && a.energy <= 1);
  assert.ok(a.valence >= -1 && a.valence <= 1);
});

test('axesFromTags ignores unknown tags without throwing', () => {
  // Should not throw on garbage; energy/valence stay in range.
  const a = axesFromTags(['asdfqwer', 'zzz123', 'punk']);
  assert.ok(a.energy >= -1 && a.energy <= 1);
});

test('categoriesFromTags returns the categories with the most tag matches', () => {
  const cats = categoriesFromTags(['punk', 'post-punk', 'post-rock', 'electronic']);
  assert.ok(cats.includes('rock'));
  assert.ok(cats.includes('electronic'));
});

test('categoriesFromTags returns an empty list when no categories match', () => {
  const cats = categoriesFromTags(['unknown-thing', 'asdfqwer']);
  assert.deepEqual(cats, []);
});

test('classifyMood combines axes + categories + a label', () => {
  const m = classifyMood(['punk', 'doom', 'gothic']);
  assert.ok(typeof m.label === 'string' && m.label.length > 0);
  // doom pulls valence down; punk energy up; gothic low energy + low valence.
  assert.ok(m.axes.valence < 0, `expected valence < 0, got ${m.axes.valence}`);
  assert.ok(Array.isArray(m.categories));
  assert.ok(m.confidence >= 0 && m.confidence <= 1);
});

test('classifyMood: empty input → unknown / neutral', () => {
  const m = classifyMood([]);
  assert.ok(m.axes.energy === 0 && m.axes.valence === 0);
  assert.equal(m.confidence, 0);
});

test('classifyMood axes match axesFromTags for the same input', () => {
  const tags = ['hardcore', 'euphoric', 'punk'];
  const m = classifyMood(tags);
  const a: MoodAxes = axesFromTags(tags);
  assert.equal(m.axes.energy, a.energy);
  assert.equal(m.axes.valence, a.valence);
});
