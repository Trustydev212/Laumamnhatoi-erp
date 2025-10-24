import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ example: 5.5, description: 'Positive for stock in, negative for stock out' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'Nhập hàng từ nhà cung cấp', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
