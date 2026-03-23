import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, Min, Max, IsInt } from 'class-validator';
import { VolunteerContentStatus } from '@prisma/client';

export class CreateVolunteerContentDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  @IsString()
  resourceUrl?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateVolunteerContentStatusDto {
  @IsEnum(VolunteerContentStatus)
  status!: VolunteerContentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateVolunteerFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ListVolunteerContentQuery {
  @IsOptional()
  @IsEnum(VolunteerContentStatus)
  status?: VolunteerContentStatus;
}
