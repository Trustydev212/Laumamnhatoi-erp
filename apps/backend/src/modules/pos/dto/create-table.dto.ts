import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// TableStatus is now a string type

export class CreateTableDto {
  @ApiProperty({ example: 'Bàn 1', required: false })
  @IsOptional()
  @ValidateIf((o) => o.name !== undefined && o.name !== null)
  @IsString()
  name?: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 20 })
  @IsNumber()
  @Min(1)
  @Max(20)
  capacity: number;

  @ApiProperty({ example: 'AVAILABLE', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 'Tầng 1', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'Bàn gần cửa sổ', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
