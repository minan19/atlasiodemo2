import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const REPORT_FORMATS = ['pdf', 'csv', 'xlsx', 'doc', 'docx'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export class UsersReportQueryDto {
  @IsOptional()
  @IsEnum(REPORT_FORMATS)
  format?: ReportFormat;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export const SCHEDULE_FREQUENCIES = ['WEEKLY', 'MONTHLY'] as const;
export type ScheduleFrequency = (typeof SCHEDULE_FREQUENCIES)[number];

export class CreateScheduledReportDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsEnum(REPORT_FORMATS)
  format!: ReportFormat;

  @IsEnum(SCHEDULE_FREQUENCIES)
  frequency!: ScheduleFrequency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  hour!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  minute!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  recipients!: string[];
}

export class UpdateScheduledReportDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsEnum(REPORT_FORMATS)
  format?: ReportFormat;

  @IsOptional()
  @IsEnum(SCHEDULE_FREQUENCIES)
  frequency?: ScheduleFrequency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  hour?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  minute?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  recipients?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
