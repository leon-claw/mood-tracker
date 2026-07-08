import assert from 'node:assert/strict';
import {
  ACTIVITY_OPTIONS,
  FIELD_DEFINITIONS,
  getFieldDefinition,
} from './fieldSchema';

assert.deepEqual(
  FIELD_DEFINITIONS.map((field) => field.id),
  [
    'sleepQuality',
    'moodLevel',
    'energyLevel',
    'dietHealth',
    'workEfficiency',
    'activities',
    'weather',
    'social',
    'achievementMilestones',
    'journal',
    'achievement',
  ]
);

const moodLevel = getFieldDefinition('moodLevel');
assert.equal(moodLevel?.type, 'scale');
assert.equal(moodLevel?.label, '心情等级');
assert.equal(moodLevel?.required, true);
if (moodLevel?.type === 'scale') {
  assert.equal(moodLevel.min, 1);
  assert.equal(moodLevel.max, 10);
}

const sleepQuality = getFieldDefinition('sleepQuality');
assert.equal(sleepQuality?.type, 'scale');
assert.equal(sleepQuality?.label, '睡眠质量');
if (sleepQuality?.type === 'scale') {
  assert.equal(sleepQuality.min, 1);
  assert.equal(sleepQuality.max, 10);
}

const activities = getFieldDefinition('activities');
assert.equal(activities?.type, 'enum');
if (activities?.type === 'enum') {
  assert.equal(activities.multiple, true);
  assert.deepEqual(
    activities.options.map((option) => option.id),
    ['running', 'hiking', 'swimming', 'fitness', 'other']
  );
  assert.ok(activities.options.every((option) => option.label && option.emoji && option.colorClass));
}

const weather = getFieldDefinition('weather');
assert.equal(weather?.type, 'enum');
if (weather?.type === 'enum') {
  assert.equal(weather.multiple, true);
  assert.deepEqual(
    weather.options.map((option) => `${option.id}:${option.emoji}`),
    ['sunny:☀️', 'cloudy:☁️', 'rainy:🌧️', 'snowy:❄️', 'hot:🥵', 'storm:⛈️', 'windy:💨']
  );
}

const social = getFieldDefinition('social');
assert.equal(social?.type, 'enum');
if (social?.type === 'enum') {
  assert.equal(social.multiple, true);
  assert.deepEqual(
    social.options.map((option) => `${option.id}:${option.emoji}`),
    ['family:👨‍👩‍👧', 'friends:👥', 'party:🎉', 'event:🎪']
  );
}

const achievementMilestones = getFieldDefinition('achievementMilestones');
assert.equal(achievementMilestones?.type, 'enum');
assert.equal(achievementMilestones?.label, '达成成就');
if (achievementMilestones?.type === 'enum') {
  assert.equal(achievementMilestones.multiple, true);
  assert.deepEqual(
    achievementMilestones.options.map((option) => `${option.id}:${option.emoji}`),
    ['historicalAchievement:🏛️', 'newStage:🚀']
  );
}

const journal = getFieldDefinition('journal');
assert.equal(journal?.type, 'string');
assert.equal(journal?.label, '随笔日志');

const achievement = getFieldDefinition('achievement');
assert.equal(achievement?.type, 'string');
assert.equal(achievement?.label, '成就');

for (const fieldId of ['energyLevel', 'dietHealth', 'workEfficiency']) {
  const field = getFieldDefinition(fieldId);
  assert.equal(field?.type, 'scale');
  if (field?.type === 'scale') {
    assert.equal(field.min, 1);
    assert.equal(field.max, 10);
  }
}

assert.equal(ACTIVITY_OPTIONS.length, 5);

console.log('field schema tests passed');
