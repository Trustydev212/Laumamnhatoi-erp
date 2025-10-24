import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateTableDto } from '../dto/create-table.dto';
import { UpdateTableDto } from '../dto/update-table.dto';
// TableStatus is now a string type

@Injectable()
export class TableService {
  constructor(private prisma: PrismaService) {}

  async create(createTableDto: CreateTableDto) {
    // Auto-generate table name if not provided
    let tableName = createTableDto.name;
    if (!tableName || tableName.trim() === '') {
      const nextTableNumber = await this.getNextTableNumber();
      tableName = `Bàn ${nextTableNumber}`;
    }
    
    // Create data object with required name
    const tableData = {
      name: tableName,
      capacity: createTableDto.capacity,
      status: createTableDto.status || 'AVAILABLE',
      location: createTableDto.location,
      description: createTableDto.description,
    };
    
    return this.prisma.table.create({
      data: tableData,
    });
  }

  private async getNextTableNumber(): Promise<number> {
    // Get all existing tables and find the highest number
    const tables = await this.prisma.table.findMany({
      select: { name: true },
      orderBy: { name: 'asc' }
    });

    let maxNumber = 0;
    
    for (const table of tables) {
      // Extract number from table name (e.g., "Bàn 1", "Bàn 2", etc.)
      const match = table.name.match(/Bàn\s*(\d+)/i);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    }
    
    return maxNumber + 1;
  }

  async findAll() {
    const tables = await this.prisma.table.findMany();
    
    // Sort tables by number in name (e.g., "Bàn 1", "Bàn 2", etc.)
    return tables.sort((a, b) => {
      const getTableNumber = (name: string) => {
        const match = name.match(/Bàn\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : 999999; // Put non-numbered tables at the end
      };
      
      const numA = getTableNumber(a.name);
      const numB = getTableNumber(b.name);
      
      return numA - numB;
    });
  }

  async findOne(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
            },
          },
          include: {
            orderItems: {
              include: {
                menu: true,
              },
            },
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  async update(id: string, updateTableDto: UpdateTableDto) {
    const table = await this.findOne(id);
    
    return this.prisma.table.update({
      where: { id },
      data: updateTableDto,
    });
  }

  async remove(id: string) {
    const table = await this.findOne(id);
    
    // Check if table has any orders
    const ordersCount = await this.prisma.order.count({
      where: { tableId: id }
    });
    
    if (ordersCount > 0) {
      throw new BadRequestException('Cannot delete table with existing orders. Please delete all orders first.');
    }
    
    return this.prisma.table.delete({
      where: { id },
    });
  }

  async removeWithOrders(id: string) {
    const table = await this.findOne(id);
    
    // Delete all orders for this table first
    await this.prisma.order.deleteMany({
      where: { tableId: id }
    });
    
    // Then delete the table
    return this.prisma.table.delete({
      where: { id },
    });
  }

  async renumberTables() {
    try {
      const tables = await this.prisma.table.findMany({
        orderBy: { createdAt: 'asc' } // Order by creation time to maintain original order
      });
      
      if (tables.length === 0) {
        return { message: 'No tables found to renumber' };
      }
      
      const updates = tables.map((table, index) => 
        this.prisma.table.update({
          where: { id: table.id },
          data: { name: `Bàn ${index + 1}` }
        })
      );
      
      const results = await Promise.all(updates);
      return { 
        message: `Successfully renumbered ${results.length} tables`,
        tables: results 
      };
    } catch (error) {
      throw new Error(`Failed to renumber tables: ${error.message}`);
    }
  }

  async updateStatus(id: string, status: string) {
    const table = await this.findOne(id);
    
    return this.prisma.table.update({
      where: { id },
      data: { status },
    });
  }

  async getAvailableTables() {
    return this.prisma.table.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: { name: 'asc' },
    });
  }

  async getOccupiedTables() {
    return this.prisma.table.findMany({
      where: { status: 'OCCUPIED' },
      include: {
        orders: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'],
            },
          },
          include: {
            orderItems: {
              include: {
                menu: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
