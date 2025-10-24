import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Thịt bò' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 10.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  currentStock: number;

  @ApiProperty({ example: 5, minimum: 0 })
  @IsNumber()
  @Min(0)
  minStock: number;

  @ApiProperty({ example: 50, minimum: 0 })
  @IsNumber()
  @Min(0)
  maxStock: number;

  @ApiProperty({ example: 150000, minimum: 0 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 'supplier-id-123', required: false })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ example: '2024-12-31T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
