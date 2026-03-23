import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListActionsQueryDto {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsIn(['active', 'cancelled', 'completed'])
  status?: 'active' | 'cancelled' | 'completed';

  @IsOptional()
  @IsIn(['class', 'student'])
  targetType?: 'class' | 'student';

  @IsOptional()
  @IsString()
  cursor?: string; // base64("createdAtIso|id")

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
