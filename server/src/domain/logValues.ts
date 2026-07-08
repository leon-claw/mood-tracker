export type ServerLogValue = number | string | string[];
export type ServerLogValues = Record<string, ServerLogValue>;

const ACTIVITY_IDS = ['running', 'hiking', 'swimming', 'fitness', 'other'];
const WEATHER_IDS = ['sunny', 'cloudy', 'rainy', 'snowy', 'hot', 'storm', 'windy'];
const SOCIAL_IDS = ['family', 'friends', 'party', 'event'];
const ACHIEVEMENT_MILESTONE_IDS = ['historicalAchievement', 'newStage'];

const clampScaleValue = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(10, Math.max(1, Math.round(parsed)));
};

const filterEnumValues = (value: unknown, allowedIds: string[]) => {
  const allowed = new Set(allowedIds);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && allowed.has(item))
    : [];
};

export const sanitizeServerLogValues = (values: Partial<Record<string, unknown>>): ServerLogValues => ({
  sleepQuality: clampScaleValue(values.sleepQuality),
  moodLevel: clampScaleValue(values.moodLevel),
  energyLevel: clampScaleValue(values.energyLevel),
  dietHealth: clampScaleValue(values.dietHealth),
  workEfficiency: clampScaleValue(values.workEfficiency),
  activities: filterEnumValues(values.activities, ACTIVITY_IDS),
  weather: filterEnumValues(values.weather, WEATHER_IDS),
  social: filterEnumValues(values.social, SOCIAL_IDS),
  achievementMilestones: filterEnumValues(values.achievementMilestones, ACHIEVEMENT_MILESTONE_IDS),
  journal: typeof values.journal === 'string' ? values.journal.trim().slice(0, 200) : '',
  achievement: typeof values.achievement === 'string' ? values.achievement.trim().slice(0, 120) : '',
});
