import { IsString, IsOptional, IsEmail, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Customer email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Customer address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Customer birthday', required: false })
  @IsOptional()
  @IsDateString()
  birthday?: string;
}
