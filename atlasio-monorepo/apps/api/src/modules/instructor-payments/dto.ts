import { IsOptional, IsDateString, IsInt, Min, IsString } from 'class-validator';

export class InstructorPayoutRangeDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}

export class ListInstructorPaymentsDto {
  @IsOptional()
  @Min(1)
  @IsInt()
  limit?: number;
}

export class MarkPayoutPaidDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
