import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RealtimeModule } from '../../common/realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { AuditLoggerService } from '../../common/audit/audit-logger.service';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { TableService } from './services/table.service';
import { OrderService } from './services/order.service';
import { MenuService } from './services/menu.service';
import { MenuIngredientService } from './services/menu-ingredient.service';
import { CategoryService } from './services/category.service';

@Module({
  imports: [PrismaModule, RealtimeModule, AuthModule],
  controllers: [PosController],
  providers: [PosService, TableService, OrderService, MenuService, MenuIngredientService, CategoryService, AuditLoggerService],
  exports: [PosService, TableService, OrderService, MenuService, MenuIngredientService, CategoryService],
})
export class PosModule {}
