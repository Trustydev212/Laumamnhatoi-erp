import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions, PERMISSIONS } from '../auth/decorators/permissions.decorator';
import { InventoryService } from './inventory.service';
import { IngredientService } from './services/ingredient.service';
import { SupplierService } from './services/supplier.service';
import { StockMovementService } from './services/stock-movement.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly ingredientService: IngredientService,
    private readonly supplierService: SupplierService,
    private readonly stockMovementService: StockMovementService,
  ) {}

  // Dashboard
  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get inventory dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard() {
    return this.inventoryService.getDashboard();
  }

  @Get('low-stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get low stock items' })
  @ApiResponse({ status: 200, description: 'Low stock items retrieved successfully' })
  async getLowStockItems() {
    return this.inventoryService.getLowStockItems();
  }

  @Get('expiring')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get expiring items' })
  @ApiResponse({ status: 200, description: 'Expiring items retrieved successfully' })
  async getExpiringItems(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days) : 7;
    return this.inventoryService.getExpiringItems(daysNumber);
  }

  // Ingredients
  @Get('ingredients')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get all ingredients' })
  @ApiResponse({ status: 200, description: 'Ingredients retrieved successfully' })
  async getIngredients() {
    return this.ingredientService.findAll();
  }

  @Post('ingredients')
  @RequirePermissions(PERMISSIONS.INVENTORY_CREATE)
  @ApiOperation({ summary: 'Create a new ingredient' })
  @ApiResponse({ status: 201, description: 'Ingredient created successfully' })
  async createIngredient(@Body() createIngredientDto: CreateIngredientDto) {
    return this.ingredientService.create(createIngredientDto);
  }

  @Get('ingredients/:id')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get ingredient by ID' })
  @ApiResponse({ status: 200, description: 'Ingredient retrieved successfully' })
  async getIngredient(@Param('id') id: string) {
    return this.ingredientService.findOne(id);
  }

  @Patch('ingredients/:id')
  @RequirePermissions(PERMISSIONS.INVENTORY_UPDATE)
  @ApiOperation({ summary: 'Update ingredient' })
  @ApiResponse({ status: 200, description: 'Ingredient updated successfully' })
  async updateIngredient(@Param('id') id: string, @Body() updateIngredientDto: UpdateIngredientDto) {
    return this.ingredientService.update(id, updateIngredientDto);
  }

  @Delete('ingredients/:id')
  @RequirePermissions(PERMISSIONS.INVENTORY_DELETE)
  @ApiOperation({ summary: 'Delete ingredient' })
  @ApiResponse({ status: 200, description: 'Ingredient deleted successfully' })
  async deleteIngredient(@Param('id') id: string) {
    return this.ingredientService.remove(id);
  }

  @Post('ingredients/:id/adjust-stock')
  @RequirePermissions(PERMISSIONS.INVENTORY_UPDATE)
  @ApiOperation({ summary: 'Adjust ingredient stock' })
  @ApiResponse({ status: 200, description: 'Stock adjusted successfully' })
  async adjustStock(@Param('id') id: string, @Body() adjustStockDto: AdjustStockDto) {
    return this.ingredientService.adjustStock(id, adjustStockDto);
  }

  // Suppliers
  @Get('suppliers')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  async getSuppliers() {
    return this.supplierService.findAll();
  }

  @Post('suppliers')
  @RequirePermissions(PERMISSIONS.INVENTORY_CREATE)
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  async createSupplier(@Body() createSupplierDto: CreateSupplierDto) {
    return this.supplierService.create(createSupplierDto);
  }

  @Get('suppliers/:id')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get supplier by ID' })
  @ApiResponse({ status: 200, description: 'Supplier retrieved successfully' })
  async getSupplier(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }

  @Patch('suppliers/:id')
  @RequirePermissions(PERMISSIONS.INVENTORY_UPDATE)
  @ApiOperation({ summary: 'Update supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  async updateSupplier(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.supplierService.update(id, updateSupplierDto);
  }

  @Delete('suppliers/:id')
  @RequirePermissions(PERMISSIONS.INVENTORY_DELETE)
  @ApiOperation({ summary: 'Delete supplier' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  async deleteSupplier(@Param('id') id: string) {
    return this.supplierService.remove(id);
  }

  // Stock Movements
  @Get('stock-movements')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get stock movements' })
  @ApiResponse({ status: 200, description: 'Stock movements retrieved successfully' })
  async getStockMovements(
    @Query('ingredientId') ingredientId?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string
  ) {
    const limitNumber = limit ? parseInt(limit) : 50;
    return this.stockMovementService.findAll(ingredientId, type, limitNumber);
  }

  @Get('stock-movements/summary/:ingredientId')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get stock movement summary for ingredient' })
  @ApiResponse({ status: 200, description: 'Stock movement summary retrieved successfully' })
  async getStockMovementSummary(
    @Param('ingredientId') ingredientId: string,
    @Query('days') days?: string
  ) {
    const daysNumber = days ? parseInt(days) : 30;
    return this.stockMovementService.getMovementSummary(ingredientId, daysNumber);
  }
}