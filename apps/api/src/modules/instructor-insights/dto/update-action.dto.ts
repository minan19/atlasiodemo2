import { IsIn, IsObject, IsOptional } from 'class-validator';

export class UpdateInstructorActionDto {
  @IsOptional()
  @IsIn(['active', 'cancelled', 'completed'])
  status?: 'active' | 'cancelled' | 'completed';

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
