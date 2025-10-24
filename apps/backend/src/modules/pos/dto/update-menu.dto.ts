import { IsString, IsNumber, IsOptional, IsBoolean, Min, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMenuDto {
  @ApiProperty({ example: 'Phở Bò', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Phở bò truyền thống', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 50000, minimum: 0, required: false })
  @IsOptional()
  @ValidateIf((o) => o.price !== undefined && o.price !== null)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 'category-id-123', required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
