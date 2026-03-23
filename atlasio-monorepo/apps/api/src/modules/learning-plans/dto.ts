import { IsOptional, IsString } from 'class-validator';

export class CreateLearningPlanDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AddCourseToLearningPlanDto {
  @IsString()
  courseId!: string;
}

export class AssignLearningPlanDto {
  @IsString()
  userId!: string;
}
