import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRecordPayload, getInitialValues, RecordForm } from './RecordForm';
import { RECORD_FIELD_IDS } from '../../shared/appPreferences';

const markup = renderToStaticMarkup(
  <RecordForm
    date="2026-07-07"
    onChange={() => undefined}
    showDateInput
    surface="drawer"
    enabledFieldIds={[...RECORD_FIELD_IDS]}
  />
);

for (const label of [
  '睡眠质量',
  '心情',
  '精力',
  '饮食健康',
  '工作效率',
  '今日日常活动',
  '天气',
  '社交',
  '随笔日志',
  '达成成就',
  '成就',
]) {
  assert.ok(markup.includes(label), `expected form to include ${label}`);
}

assert.ok(markup.includes('未选择'), 'expected scale fields to start without a selected value');
assert.equal(markup.includes('7/10'), false, 'expected scale fields not to default to 7/10');
assert.equal(markup.includes('保存今日记录'), false, 'expected the auto-save form to have no confirmation button');
assert.equal(markup.includes('保存修改'), false, 'expected the auto-save form to have no confirmation button');

for (const option of [
  '跑步',
  '徒步',
  '游泳',
  '健身',
  '其他',
  '晴朗',
  '多云',
  '下雨',
  '下雪',
  '高温',
  '风暴',
  '刮风',
  '家庭',
  '见朋友',
  '派对',
  '参加活动',
  '历史成就',
  '达到新阶段',
]) {
  assert.ok(markup.includes(option), `expected form to include ${option}`);
}

for (const removedOption of ['阅读', '工作', '休息', '咖啡', '美食', '排队']) {
  assert.equal(markup.includes(`>${removedOption}</span>`), false, `expected form to remove ${removedOption}`);
}

const journalOnlyMarkup = renderToStaticMarkup(
  <RecordForm
    date="2026-07-07"
    onChange={() => undefined}
    enabledFieldIds={['journal']}
  />
);
assert.ok(journalOnlyMarkup.includes('随笔日志'));
assert.equal(journalOnlyMarkup.includes('睡眠质量'), false);
assert.equal(journalOnlyMarkup.includes('心情'), false);

const automaticMarkup = renderToStaticMarkup(
  <RecordForm
    date="2026-07-07"
    entry={{
      id: 'automatic-entry',
      date: '2026-07-07',
      values: {},
      autoData: {
        steps: {
          count: 6432,
          source: 'health-connect',
          collectedAt: '2026-07-07T10:00:00Z',
          isFinal: false,
        },
        weather: {
          weatherCode: 0,
          temperatureC: 28,
          provider: 'open-meteo',
          collectedAt: '2026-07-07T10:00:00Z',
        },
      },
    }}
    onChange={() => undefined}
    enabledFieldIds={['autoSteps', 'autoWeather', 'autoScreenTime']}
  />
);
assert.ok(automaticMarkup.includes('6,432 步'));
assert.ok(automaticMarkup.includes('晴 · 28°C'));
assert.ok(automaticMarkup.includes('尚未采集'));
assert.equal(automaticMarkup.includes('textarea'), false);
assert.ok(automaticMarkup.includes('自动采集 · 只读'));

const historicalValues = getInitialValues({
  id: 'historical-entry',
  date: '2026-07-06',
  values: { moodLevel: 8, journal: '保留隐藏前的心情' },
});
assert.deepEqual(createRecordPayload('2026-07-06', historicalValues).values, {
  moodLevel: 8,
  activities: [],
  weather: [],
  social: [],
  achievementMilestones: [],
  journal: '保留隐藏前的心情',
  achievement: '',
});

console.log('record form template tests passed');
