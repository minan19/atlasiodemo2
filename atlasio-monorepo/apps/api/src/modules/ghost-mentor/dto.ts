import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class GhostAskDto {
  @IsString()
  courseId!: string;

  @IsString()
  lessonId!: string;

  @IsNumber()
  timestamp!: number; // saniye

  @IsString()
  query!: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsBoolean()
  examMode?: boolean;
}

export class GhostPreloadFaqDto {
  @IsString()
  lessonId!: string;

  @IsArray()
  faqs!: { q: string; a?: string }[];

  @IsOptional()
  @IsString()
  locale?: string;
}
