import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReminderSettingsPage } from './ReminderSettingsPage';

const markup = renderToStaticMarkup(
  <ReminderSettingsPage
    reminders={{ enabled: true, times: ['08:30', '21:00'] }}
    permissionState="granted"
    exactAlarmState="denied"
    isPermissionBusy={false}
    isExactAlarmBusy={false}
    isSyncing={false}
    onBack={() => undefined}
    onToggle={() => undefined}
    onRequestExactAlarmPermission={() => undefined}
    onAddTime={() => undefined}
    onRemoveTime={() => undefined}
  />
);

assert.ok(markup.includes('打卡提醒'));
assert.ok(markup.includes('08:30'));
assert.ok(markup.includes('21:00'));
assert.ok(markup.includes('每天提醒 2 次'));
assert.ok(markup.includes('精确提醒权限未开启'));
assert.ok(markup.includes('去开启'));
assert.ok(markup.includes('建议将应用保留在后台运行'));
assert.ok(markup.includes('aria-pressed="true"'));
assert.ok(markup.includes('aria-label="提醒小时（24小时制）"'));
assert.ok(markup.includes('aria-label="提醒分钟"'));
assert.ok(markup.includes('<option value="00">00</option>'));
assert.ok(markup.includes('<option value="23">23</option>'));
assert.ok(markup.includes('<option value="59">59</option>'));
assert.ok(!markup.includes('type="time"'));

console.log('reminder settings page tests passed');
