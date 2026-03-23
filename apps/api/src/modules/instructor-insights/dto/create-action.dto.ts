import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateInstructorActionDto {
  @IsString()
  @IsNotEmpty()
  classId!: string;

  @IsIn(['class', 'student'])
  targetType!: 'class' | 'student';

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsIn(['assignPractice', 'assignQuiz', 'shareMaterial', 'message'])
  actionType!: 'assignPractice' | 'assignQuiz' | 'shareMaterial' | 'message';

  @IsObject()
  payload!: Record<string, any>;

  @IsOptional()
  @IsString()
  dueAt?: string;
}
