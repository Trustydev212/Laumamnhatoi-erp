import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsDateString, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIngredientDto {
  @ApiProperty({ example: 'Thịt bò', required: false })
  @ValidateIf((o) => o.name !== undefined)
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'kg', required: false })
  @ValidateIf((o) => o.unit !== undefined)
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ example: 10.5, minimum: 0, required: false })
  @ValidateIf((o) => o.currentStock !== undefined && o.currentStock !== null)
  @IsNumber()
  @Min(0)
  @IsOptional()
  currentStock?: number;

  @ApiProperty({ example: 5, minimum: 0, required: false })
  @ValidateIf((o) => o.minStock !== undefined && o.minStock !== null)
  @IsNumber()
  @Min(0)
  @IsOptional()
  minStock?: number;

  @ApiProperty({ example: 50, minimum: 0, required: false })
  @ValidateIf((o) => o.maxStock !== undefined && o.maxStock !== null)
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxStock?: number;

  @ApiProperty({ example: 150000, minimum: 0, required: false })
  @ValidateIf((o) => o.costPrice !== undefined && o.costPrice !== null)
  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @ApiProperty({ example: 'supplier-id-123', required: false })
  @ValidateIf((o) => o.supplierId !== undefined && o.supplierId !== null)
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ example: '2024-12-31T00:00:00.000Z', required: false })
  @ValidateIf((o) => o.expiryDate !== undefined && o.expiryDate !== null)
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ example: true, required: false })
  @ValidateIf((o) => o.isActive !== undefined)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
