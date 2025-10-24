import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequirePermissions, PERMISSIONS } from '../auth/decorators/permissions.decorator';
import { PosService } from './pos.service';
import { TableService } from './services/table.service';
import { OrderService } from './services/order.service';
import { MenuService } from './services/menu.service';
import { MenuIngredientService } from './services/menu-ingredient.service';
import { CategoryService } from './services/category.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { CreateMenuIngredientDto } from './dto/create-menu-ingredient.dto';
import { UpdateMenuIngredientDto } from './dto/update-menu-ingredient.dto';

@ApiTags('POS')
@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly tableService: TableService,
    private readonly orderService: OrderService,
    private readonly menuService: MenuService,
    private readonly menuIngredientService: MenuIngredientService,
    private readonly categoryService: CategoryService,
  ) {}

  // Table endpoints
  @Get('tables')
  @RequirePermissions(PERMISSIONS.TABLE_VIEW)
  @ApiOperation({ summary: 'Get all tables' })
  @ApiResponse({ status: 200, description: 'Tables retrieved successfully' })
  async getTables() {
    return this.tableService.findAll();
  }

  @Post('tables')
  @RequirePermissions(PERMISSIONS.TABLE_CREATE)
  @ApiOperation({ summary: 'Create a new table' })
  @ApiResponse({ status: 201, description: 'Table created successfully' })
  async createTable(@Body() createTableDto: CreateTableDto) {
    return this.tableService.create(createTableDto);
  }

  @Patch('tables/:id')
  @RequirePermissions(PERMISSIONS.TABLE_UPDATE)
  @ApiOperation({ summary: 'Update a table' })
  @ApiResponse({ status: 200, description: 'Table updated successfully' })
  async updateTable(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tableService.update(id, updateTableDto);
  }

  @Delete('tables/:id')
  @RequirePermissions(PERMISSIONS.TABLE_DELETE)
  @ApiOperation({ summary: 'Delete a table' })
  @ApiResponse({ status: 200, description: 'Table deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete table with existing orders' })
  async deleteTable(@Param('id') id: string) {
    return this.tableService.remove(id);
  }

  @Delete('tables/:id/force')
  @RequirePermissions(PERMISSIONS.TABLE_DELETE)
  @ApiOperation({ summary: 'Force delete a table and all its orders' })
  @ApiResponse({ status: 200, description: 'Table and all orders deleted successfully' })
  async forceDeleteTable(@Param('id') id: string) {
    return this.tableService.removeWithOrders(id);
  }

  @Post('tables/renumber')
  @RequirePermissions(PERMISSIONS.TABLE_UPDATE)
  @ApiOperation({ summary: 'Renumber all tables sequentially' })
  @ApiResponse({ status: 200, description: 'All tables renumbered successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async renumberTables() {
    try {
      return await this.tableService.renumberTables();
    } catch (error) {
      throw new Error(`Failed to renumber tables: ${error.message}`);
    }
  }

  // Order endpoints
  @Get('orders')
  @RequirePermissions(PERMISSIONS.ORDER_VIEW)
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrders() {
    return this.orderService.findAll();
  }

  @Post('orders')
  @RequirePermissions(PERMISSIONS.ORDER_CREATE)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    // Get userId from JWT token
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in token');
    }
    return this.orderService.create(createOrderDto, userId);
  }

  @Patch('orders/:id')
  @RequirePermissions(PERMISSIONS.ORDER_UPDATE)
  @ApiOperation({ summary: 'Update an order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  async updateOrder(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto, @Request() req) {
    const userId = req.user?.sub || req.user?.id;
    return this.orderService.update(id, updateOrderDto, userId);
  }

  @Patch('orders/:id/status')
  @RequirePermissions(PERMISSIONS.ORDER_UPDATE)
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req) {
    const userId = req.user?.sub || req.user?.id;
    return this.orderService.updateStatus(id, body.status, userId);
  }

  @Delete('orders/:id')
  @RequirePermissions(PERMISSIONS.ORDER_DELETE)
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  async deleteOrder(@Param('id') id: string) {
    return this.orderService.remove(id);
  }

  // Menu endpoints
  @Get('menu')
  @RequirePermissions(PERMISSIONS.MENU_VIEW)
  @ApiOperation({ summary: 'Get all menu items' })
  @ApiResponse({ status: 200, description: 'Menu items retrieved successfully' })
  async getMenu() {
    return this.menuService.findAll();
  }

  @Post('menu')
  @RequirePermissions(PERMISSIONS.MENU_CREATE)
  @ApiOperation({ summary: 'Create a new menu item' })
  @ApiResponse({ status: 201, description: 'Menu item created successfully' })
  async createMenu(@Body() createMenuDto: CreateMenuDto) {
    return this.menuService.create(createMenuDto);
  }

  @Patch('menu/:id')
  @RequirePermissions(PERMISSIONS.MENU_UPDATE)
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiResponse({ status: 200, description: 'Menu item updated successfully' })
  async updateMenu(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menuService.update(id, updateMenuDto);
  }

  @Delete('menu/:id')
  @RequirePermissions(PERMISSIONS.MENU_DELETE)
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiResponse({ status: 200, description: 'Menu item deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete menu with existing order items' })
  async deleteMenu(@Param('id') id: string) {
    return this.menuService.remove(id);
  }

  @Delete('menu/:id/force')
  @RequirePermissions(PERMISSIONS.MENU_DELETE)
  @ApiOperation({ summary: 'Force delete a menu item and all its order items' })
  @ApiResponse({ status: 200, description: 'Menu item and all order items deleted successfully' })
  async forceDeleteMenu(@Param('id') id: string) {
    return this.menuService.removeWithOrders(id);
  }

  // Category endpoints
  @Get('categories')
  @RequirePermissions(PERMISSIONS.MENU_VIEW)
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    return this.categoryService.findAll();
  }

  // Menu Ingredient endpoints
  @Get('menu/:id/ingredients')
  @RequirePermissions(PERMISSIONS.MENU_VIEW)
  @ApiOperation({ summary: 'Get ingredients for a menu item' })
  @ApiResponse({ status: 200, description: 'Menu ingredients retrieved successfully' })
  async getMenuIngredients(@Param('id') id: string) {
    return this.menuIngredientService.findByMenu(id);
  }

  @Post('menu-ingredients')
  @RequirePermissions(PERMISSIONS.MENU_CREATE)
  @ApiOperation({ summary: 'Add ingredient to menu item' })
  @ApiResponse({ status: 201, description: 'Menu ingredient added successfully' })
  async createMenuIngredient(@Body() createMenuIngredientDto: CreateMenuIngredientDto) {
    return this.menuIngredientService.create(createMenuIngredientDto);
  }

  @Patch('menu-ingredients/:id')
  @RequirePermissions(PERMISSIONS.MENU_UPDATE)
  @ApiOperation({ summary: 'Update menu ingredient' })
  @ApiResponse({ status: 200, description: 'Menu ingredient updated successfully' })
  async updateMenuIngredient(@Param('id') id: string, @Body() updateMenuIngredientDto: UpdateMenuIngredientDto) {
    return this.menuIngredientService.update(id, updateMenuIngredientDto);
  }

  @Delete('menu-ingredients/:id')
  @RequirePermissions(PERMISSIONS.MENU_DELETE)
  @ApiOperation({ summary: 'Remove ingredient from menu item' })
  @ApiResponse({ status: 200, description: 'Menu ingredient removed successfully' })
  async deleteMenuIngredient(@Param('id') id: string) {
    return this.menuIngredientService.remove(id);
  }

  @Get('menu/:id/cost')
  @RequirePermissions(PERMISSIONS.MENU_VIEW)
  @ApiOperation({ summary: 'Calculate menu item cost' })
  @ApiResponse({ status: 200, description: 'Menu cost calculated successfully' })
  async getMenuCost(@Param('id') id: string) {
    return this.menuIngredientService.calculateMenuCost(id);
  }

  // Order Item Management
  @Delete('orders/:orderId/items/:itemId')
  @RequirePermissions(PERMISSIONS.ORDER_UPDATE)
  @ApiOperation({ summary: 'Remove item from order and refund stock' })
  @ApiResponse({ status: 200, description: 'Order item removed and stock refunded successfully' })
  async removeOrderItem(@Param('orderId') orderId: string, @Param('itemId') itemId: string) {
    return this.orderService.removeOrderItem(orderId, itemId);
  }
}
