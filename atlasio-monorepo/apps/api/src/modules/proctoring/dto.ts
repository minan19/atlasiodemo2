import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class StartProctorSessionDto {
  @IsString()
  courseId!: string;
}

export enum ProctorEventType {
  EYE = 'EYE',
  HEAD = 'HEAD',
  AUDIO = 'AUDIO',
  TAB = 'TAB',
  OBJECT = 'OBJECT',
  HEARTBEAT = 'HEARTBEAT',
}

export class ProctorEventDto {
  @IsString()
  sessionId!: string;

  @IsEnum(ProctorEventType)
  type!: ProctorEventType;

  @IsOptional()
  @IsNumber()
  score?: number; // 0-1 arası sinyal

  @IsOptional()
  @IsNumber()
  value?: number; // tab switch sayısı vb.

  @IsOptional()
  @IsArray()
  flags?: string[]; // object names, anomalies
}
