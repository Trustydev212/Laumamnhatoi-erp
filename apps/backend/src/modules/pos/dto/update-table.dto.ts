import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTableDto {
  @ApiProperty({ example: 'Bàn 1', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 20, required: false })
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  capacity?: number;

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
