import { IsString, IsArray, IsOptional, IsNumber, IsDecimal, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'menu-id-123' })
  @IsString()
  menuId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'Không cay', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'table-id-123' })
  @IsString()
  tableId: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiProperty({ example: 'Ghi chú đặc biệt', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'customer-id-123', required: false })
  @IsString()
  @IsOptional()
  customerId?: string;
}
