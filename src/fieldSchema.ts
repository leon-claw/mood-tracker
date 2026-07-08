import { EnumOption, FieldDefinition } from './types';

export const ACTIVITY_OPTIONS: EnumOption[] = [
  { id: 'running', label: '跑步', emoji: '🏃', colorClass: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' },
  { id: 'hiking', label: '徒步', emoji: '🥾', colorClass: 'bg-lime-50 hover:bg-lime-100 text-lime-700' },
  { id: 'swimming', label: '游泳', emoji: '🏊', colorClass: 'bg-sky-50 hover:bg-sky-100 text-sky-600' },
  { id: 'fitness', label: '健身', emoji: '🏋️', colorClass: 'bg-rose-50 hover:bg-rose-100 text-rose-600' },
  { id: 'other', label: '其他', emoji: '✨', colorClass: 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600' },
];

export const WEATHER_OPTIONS: EnumOption[] = [
  { id: 'sunny', label: '晴朗', emoji: '☀️', colorClass: 'bg-amber-50 hover:bg-amber-100 text-amber-600' },
  { id: 'cloudy', label: '多云', emoji: '☁️', colorClass: 'bg-slate-50 hover:bg-slate-100 text-slate-600' },
  { id: 'rainy', label: '下雨', emoji: '🌧️', colorClass: 'bg-sky-50 hover:bg-sky-100 text-sky-600' },
  { id: 'snowy', label: '下雪', emoji: '❄️', colorClass: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-600' },
  { id: 'hot', label: '高温', emoji: '🥵', colorClass: 'bg-orange-50 hover:bg-orange-100 text-orange-600' },
  { id: 'storm', label: '风暴', emoji: '⛈️', colorClass: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600' },
  { id: 'windy', label: '刮风', emoji: '💨', colorClass: 'bg-teal-50 hover:bg-teal-100 text-teal-600' },
];

export const SOCIAL_OPTIONS: EnumOption[] = [
  { id: 'family', label: '家庭', emoji: '👨‍👩‍👧', colorClass: 'bg-pink-50 hover:bg-pink-100 text-pink-600' },
  { id: 'friends', label: '见朋友', emoji: '👥', colorClass: 'bg-violet-50 hover:bg-violet-100 text-violet-600' },
  { id: 'party', label: '派对', emoji: '🎉', colorClass: 'bg-amber-50 hover:bg-amber-100 text-amber-600' },
  { id: 'event', label: '参加活动', emoji: '🎪', colorClass: 'bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-600' },
];

export const ACHIEVEMENT_MILESTONE_OPTIONS: EnumOption[] = [
  { id: 'historicalAchievement', label: '历史成就', emoji: '🏛️', colorClass: 'bg-stone-50 hover:bg-stone-100 text-stone-600' },
  { id: 'newStage', label: '达到新阶段', emoji: '🚀', colorClass: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600' },
];

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  { id: 'sleepQuality', label: '睡眠质量', type: 'scale', min: 1, max: 10, required: true },
  { id: 'moodLevel', label: '心情等级', type: 'scale', min: 1, max: 10, required: true },
  { id: 'energyLevel', label: '精力', type: 'scale', min: 1, max: 10, required: false },
  { id: 'dietHealth', label: '饮食健康', type: 'scale', min: 1, max: 10, required: false },
  { id: 'workEfficiency', label: '工作效率', type: 'scale', min: 1, max: 10, required: false },
  { id: 'activities', label: '今日日常活动', type: 'enum', required: false, multiple: true, options: ACTIVITY_OPTIONS },
  { id: 'weather', label: '天气', type: 'enum', required: false, multiple: true, options: WEATHER_OPTIONS },
  { id: 'social', label: '社交', type: 'enum', required: false, multiple: true, options: SOCIAL_OPTIONS },
  { id: 'achievementMilestones', label: '达成成就', type: 'enum', required: false, multiple: true, options: ACHIEVEMENT_MILESTONE_OPTIONS },
  { id: 'journal', label: '随笔日志', type: 'string', required: false, maxLength: 200 },
  { id: 'achievement', label: '成就', type: 'string', required: false, maxLength: 120 },
];

export const getFieldDefinition = (id: string) =>
  FIELD_DEFINITIONS.find((field) => field.id === id);

export const getActivityOption = (id: string) =>
  ACTIVITY_OPTIONS.find((option) => option.id === id);
