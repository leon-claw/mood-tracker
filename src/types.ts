export type FieldType = 'scale' | 'string' | 'enum';

export type LogValue = number | string | string[];
export type LogValues = Record<string, LogValue>;

export interface LogEntry {
  id: string;
  date: string;
  values: LogValues;
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

export type FieldDefinition =
  | ScaleFieldDefinition
  | StringFieldDefinition
  | EnumFieldDefinition;
