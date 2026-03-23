import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number; // bank installment preference

  @IsOptional()
  @IsString()
  provider?: string; // stripe | iyzico | demo
}
