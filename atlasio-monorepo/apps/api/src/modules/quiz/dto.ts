import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StartAdaptiveDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topicIds?: string[];
}

export class LastAnswerDto {
  @IsString()
  questionId!: string;

  @IsBoolean()
  correct!: boolean;

  @IsOptional()
  @IsNumber()
  durationMs?: number;
}

export class NextAdaptiveDto extends StartAdaptiveDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LastAnswerDto)
  last?: LastAnswerDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeIds?: string[];
}
