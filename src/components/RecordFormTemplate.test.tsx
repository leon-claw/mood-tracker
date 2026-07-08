import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecordForm } from './RecordForm';

const markup = renderToStaticMarkup(
  <RecordForm
    date="2026-07-07"
    onSave={() => undefined}
    submitLabel="保存今日记录"
    mode="create"
    showDateInput
    surface="drawer"
  />
);

for (const label of [
  '睡眠质量',
  '心情等级',
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

console.log('record form template tests passed');
