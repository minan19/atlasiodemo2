import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  DefenseActionState,
  DefenseActionType,
  SecurityEventSeverity,
  SecurityEventStatus,
} from '@prisma/client';

export class CreateSecurityEventDto {
  @IsString()
  source!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsEnum(SecurityEventSeverity)
  severity: SecurityEventSeverity = SecurityEventSeverity.MEDIUM;

  @IsOptional()
  @IsEnum(SecurityEventStatus)
  status?: SecurityEventStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  actorIp?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  payload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class CreateDefenseActionDto {
  @IsEnum(DefenseActionType)
  actionType!: DefenseActionType;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  params?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(DefenseActionState)
  state?: DefenseActionState;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
