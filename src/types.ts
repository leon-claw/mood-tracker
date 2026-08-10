export type FieldType = 'scale' | 'string' | 'enum' | 'automatic';

export type LogValue = number | string | string[];
export type LogValues = Record<string, LogValue>;

export type AutoModuleId = 'steps' | 'weather' | 'screenTime';
export type ScreenTimeMetric = 'screen-interactive' | 'foreground-apps';

export interface AutoStepsData {
  count: number;
  source: 'health-connect' | 'step-sensor';
  collectedAt: string;
  isFinal: boolean;
}

export interface AutoWeatherData {
  weatherCode: number;
  temperatureC?: number;
  temperatureMaxC?: number;
  temperatureMinC?: number;
  humidityPercent?: number;
  precipitationMm?: number;
  provider: 'open-meteo';
  collectedAt: string;
}

export interface AutoScreenTimeData {
  minutes: number;
  metric: ScreenTimeMetric;
  collectedAt: string;
  isFinal: boolean;
}

export interface AutoData {
  steps?: AutoStepsData;
  weather?: AutoWeatherData;
  screenTime?: AutoScreenTimeData;
}

export interface LogEntry {
  id: string;
  date: string;
  values: LogValues;
  autoData?: AutoData;
}

export interface EnumOption {
  id: string;
  label: string;
  emoji: string;
  colorClass: string;
}

export interface BaseFieldDefinition {
  id: string;
  label: string;
  required: boolean;
}

export interface ScaleFieldDefinition extends BaseFieldDefinition {
  type: 'scale';
  min: 1;
  max: 10;
}

export interface StringFieldDefinition extends BaseFieldDefinition {
  type: 'string';
  maxLength?: number;
}

export interface EnumFieldDefinition extends BaseFieldDefinition {
  type: 'enum';
  multiple: boolean;
  options: EnumOption[];
}

export interface AutomaticFieldDefinition extends BaseFieldDefinition {
  type: 'automatic';
  module: 'steps' | 'weather' | 'screenTime';
  valueType: 'number' | 'weather' | 'duration';
  readOnly: true;
}

export type FieldDefinition =
  | ScaleFieldDefinition
  | StringFieldDefinition
  | EnumFieldDefinition
  | AutomaticFieldDefinition;
