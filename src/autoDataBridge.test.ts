import assert from 'node:assert/strict';
import { getEnabledAutoModules, shouldCollectModule } from './autoDataBridge';

assert.deepEqual(getEnabledAutoModules(['moodLevel', 'autoWeather', 'autoSteps']), ['autoWeather', 'autoSteps']);
assert.equal(shouldCollectModule('autoWeather', ['autoWeather']), true);
assert.equal(shouldCollectModule('autoSteps', ['autoWeather']), false);
console.log('auto data bridge tests passed');
