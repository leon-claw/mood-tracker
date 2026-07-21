import assert from 'node:assert/strict';
import { INITIAL_DEMO_ENTRIES } from '../data/mockData';
import {
  buildMoodFlowOption,
  buildSleepMoodOption,
  buildYearlyOverviewOption,
} from './chartOptions';

const moodFlow = buildMoodFlowOption(INITIAL_DEMO_ENTRIES, 2026, 6) as any;
assert.equal(moodFlow.series[0].type, 'line');
assert.equal(moodFlow.series[0].data.length, INITIAL_DEMO_ENTRIES.length);
assert.match(moodFlow.tooltip.formatter([{ data: moodFlow.series[0].data[0] }]), /心情/);
assert.match(moodFlow.tooltip.formatter([{ data: moodFlow.series[0].data[0] }]), /睡眠质量/);

const sleepMood = buildSleepMoodOption(INITIAL_DEMO_ENTRIES, 2026, 6) as any;
assert.equal(sleepMood.series[0].type, 'bar');
assert.deepEqual(sleepMood.xAxis.data, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
assert.ok(sleepMood.series[0].data.some((point: any) => point.value > 0));
assert.match(sleepMood.tooltip.formatter([{ data: sleepMood.series[0].data[6] }]), /睡眠质量/);

const yearly = buildYearlyOverviewOption({
  year: 2026,
  months: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    entryCount: index === 6 ? 4 : 0,
    averageMood: index === 6 ? 7.5 : null,
    averageSleepQuality: index === 6 ? 8 : null,
  })),
}) as any;
assert.deepEqual(yearly.xAxis.data, ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']);
assert.equal(yearly.series[0].type, 'bar');
assert.equal(yearly.series[1].type, 'line');
assert.equal(yearly.series[2].type, 'line');
assert.equal(yearly.series[0].data[6].value, 4);

console.log('chart option tests passed');
