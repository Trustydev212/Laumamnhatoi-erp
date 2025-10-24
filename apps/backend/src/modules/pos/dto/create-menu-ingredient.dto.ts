import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuIngredientDto {
  @ApiProperty({ example: 'menu-id-123' })
  @IsString()
  menuId: string;

  @ApiProperty({ example: 'ingredient-id-123' })
  @IsString()
  ingredientId: string;

  @ApiProperty({ example: 0.5, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;
}
