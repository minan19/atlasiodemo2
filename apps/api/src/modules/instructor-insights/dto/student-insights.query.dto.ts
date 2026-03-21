import { IsIn, IsOptional } from 'class-validator';

export class StudentInsightsQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  window?: '7d' | '30d' | '90d';
}
