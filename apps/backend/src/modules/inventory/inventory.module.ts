import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { IngredientService } from './services/ingredient.service';
import { SupplierService } from './services/supplier.service';
import { StockMovementService } from './services/stock-movement.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService, IngredientService, SupplierService, StockMovementService],
  exports: [InventoryService, IngredientService, SupplierService, StockMovementService],
})
export class InventoryModule {}