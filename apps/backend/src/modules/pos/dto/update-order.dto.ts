import { IsString, IsArray, IsOptional, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderItemDto {
  @ApiProperty({ example: 'menu-id-123', required: false })
  @IsString()
  @IsOptional()
  menuId?: string;

  @ApiProperty({ example: 2, minimum: 1, required: false })
  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @ApiProperty({ example: 'Không cay', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateOrderDto {
  @ApiProperty({ example: 'table-id-123', required: false })
  @IsString()
  @IsOptional()
  tableId?: string;

  @ApiProperty({ type: [UpdateOrderItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  @IsOptional()
  orderItems?: UpdateOrderItemDto[];

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty({ example: 'Ghi chú đặc biệt', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
