import test from 'node:test';
import assert from 'node:assert/strict';
import { quotedSpeech } from '../v38/ui/dialogue.js';

test('direct dialogue has one pair of Chinese quotation marks', () => {
  assert.equal(quotedSpeech('想先试一批调光台灯。'), '“想先试一批调光台灯。”');
  assert.equal(quotedSpeech('“下周可以再报一批吗？”'), '“下周可以再报一批吗？”');
  assert.equal(quotedSpeech('「谢谢你。」'), '“谢谢你。”');
  assert.equal(quotedSpeech(' "请尽快回复。" '), '“请尽快回复。”');
  assert.equal(quotedSpeech('我想在这儿住两天。下回也试试喊一声“照旧”。'), '“我想在这儿住两天。下回也试试喊一声‘照旧’。”');
  assert.equal(quotedSpeech(''), '');
  assert.equal(quotedSpeech(undefined), '');
});
