import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateMenuIngredientDto } from './create-menu-ingredient.dto';

export class UpdateMenuIngredientDto extends PartialType(CreateMenuIngredientDto) {
  @ApiProperty({ example: 0.5, minimum: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
