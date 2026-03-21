import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class IssueCertificationDto {
  @IsString()
  userId!: string;

  @IsString()
  courseId!: string;

  @IsOptional()
  @Type(() => String)
  @IsDateString()
  expiresAt?: string;
}
