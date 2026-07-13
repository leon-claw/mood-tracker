import assert from 'node:assert/strict';
import { INITIAL_DEMO_ENTRIES } from '../data/mockData';
import {
  buildMoodFlowOption,
  buildSleepMoodOption,
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

console.log('chart option tests passed');
