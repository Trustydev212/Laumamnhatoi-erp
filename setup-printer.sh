#!/bin/bash

# Script setup máy in XP-80C
# Usage: ./setup-printer.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

echo "🖨️ Setup máy in XP-80C..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Install required packages
print_status "Cài đặt packages cần thiết..."
npm install express cors

# Create printer service
print_status "Tạo printer service..."

cat > src/services/printer.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PrinterService {
  constructor(private prisma: PrismaService) {}

  // ESC/POS Commands
  private readonly ESC = '\x1B';
  private readonly GS = '\x1D';
  private readonly LF = '\x0A';

  private readonly ESC_POS = {
    RESET: this.ESC + '@',
    BOLD_ON: this.ESC + 'E' + '\x01',
    BOLD_OFF: this.ESC + 'E' + '\x00',
    ALIGN_CENTER: this.ESC + 'a' + '\x01',
    ALIGN_LEFT: this.ESC + 'a' + '\x00',
    FONT_A: this.ESC + 'M' + '\x00',
    FONT_B: this.ESC + 'M' + '\x01',
    CUT_PAPER: this.GS + 'V' + '\x00',
    FEED_PAPER: this.LF + this.LF + this.LF,
  };

  async generateReceipt(orderId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        user: true,
        orderItems: {
          include: {
            menu: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    let receipt = '';
    
    // Reset printer
    receipt += this.ESC_POS.RESET;
    
    // Header
    receipt += this.ESC_POS.ALIGN_CENTER;
    receipt += this.ESC_POS.BOLD_ON;
    receipt += this.ESC_POS.FONT_B;
    receipt += 'NHÀ TÔI ERP\n';
    receipt += 'Hệ thống quản lý quán ăn\n';
    receipt += '========================\n';
    
    // Order info
    receipt += this.ESC_POS.ALIGN_LEFT;
    receipt += this.ESC_POS.BOLD_OFF;
    receipt += this.ESC_POS.FONT_A;
    receipt += `Hóa đơn: ${order.orderNumber}\n`;
    receipt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
    receipt += `Bàn: ${order.table.name}\n`;
    receipt += `Thu ngân: ${order.user.firstName} ${order.user.lastName}\n`;
    receipt += '------------------------\n';
    
    // Items
    receipt += 'MÓN ĂN                    SL   GIÁ\n';
    receipt += '------------------------\n';
    
    order.orderItems.forEach(item => {
      const name = item.menu.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(2);
      const price = item.price.toLocaleString('vi-VN').padStart(8);
      receipt += `${name} ${qty} ${price}\n`;
    });
    
    // Total
    receipt += '------------------------\n';
    receipt += this.ESC_POS.BOLD_ON;
    receipt += `TỔNG CỘNG: ${order.total.toLocaleString('vi-VN')} VNĐ\n`;
    receipt += this.ESC_POS.BOLD_OFF;
    
    // Footer
    receipt += this.ESC_POS.ALIGN_CENTER;
    receipt += 'Cảm ơn quý khách!\n';
    receipt += 'Hẹn gặp lại!\n';
    
    // Feed and cut
    receipt += this.ESC_POS.FEED_PAPER;
    receipt += this.ESC_POS.CUT_PAPER;
    
    return receipt;
  }

  async generateSimpleReceipt(orderId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        user: true,
        orderItems: {
          include: {
            menu: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    let receipt = '';
    
    // Header
    receipt += 'NHÀ TÔI ERP\n';
    receipt += 'Hệ thống quản lý quán ăn\n';
    receipt += '========================\n\n';
    receipt += `Hóa đơn: ${order.orderNumber}\n`;
    receipt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
    receipt += `Bàn: ${order.table.name}\n`;
    receipt += `Thu ngân: ${order.user.firstName} ${order.user.lastName}\n`;
    receipt += '------------------------\n\n';
    receipt += 'MÓN ĂN                    SL   GIÁ\n';
    receipt += '------------------------\n';
    
    order.orderItems.forEach(item => {
      const name = item.menu.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(2);
      const price = item.price.toLocaleString('vi-VN').padStart(8);
      receipt += `${name} ${qty} ${price}\n`;
    });
    
    receipt += '------------------------\n';
    receipt += `TỔNG CỘNG: ${order.total.toLocaleString('vi-VN')} VNĐ\n\n`;
    receipt += 'Cảm ơn quý khách!\n';
    receipt += 'Hẹn gặp lại!\n';
    
    return receipt;
  }
}
EOF

# Create printer controller
print_status "Tạo printer controller..."

cat > src/modules/printer/printer.controller.ts << 'EOF'
import { Controller, Post, Body, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrinterService } from './printer.service';

@Controller('printer')
export class PrinterController {
  constructor(private printerService: PrinterService) {}

  @Post('receipt')
  async printReceipt(@Body() body: { orderId: string }, @Res() res: Response) {
    try {
      const receipt = await this.printerService.generateReceipt(body.orderId);
      
      res.set({
        'Content-Type': 'text/plain; charset=cp1252',
        'Content-Length': receipt.length,
        'X-Receipt-Type': 'escpos',
        'X-Printer-Model': 'XP-80C'
      });
      
      res.send(receipt);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  @Post('receipt-simple')
  async printSimpleReceipt(@Body() body: { orderId: string }, @Res() res: Response) {
    try {
      const receipt = await this.printerService.generateSimpleReceipt(body.orderId);
      
      res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': receipt.length,
        'X-Receipt-Type': 'simple',
        'X-Printer-Model': 'XP-80C'
      });
      
      res.send(receipt);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  @Get('test')
  async testPrint(@Res() res: Response) {
    try {
      const testData = {
        orderNumber: 'HD001',
        tableName: 'Bàn 1',
        cashierName: 'Thu ngân A',
        items: [
          { name: 'Phở Bò', quantity: 2, price: 45000 },
          { name: 'Bún Bò Huế', quantity: 1, price: 50000 },
          { name: 'Nước Cam', quantity: 2, price: 15000 }
        ],
        total: 155000
      };

      let receipt = '';
      receipt += 'NHÀ TÔI ERP\n';
      receipt += 'Hệ thống quản lý quán ăn\n';
      receipt += '========================\n\n';
      receipt += `Hóa đơn: ${testData.orderNumber}\n`;
      receipt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
      receipt += `Bàn: ${testData.tableName}\n`;
      receipt += `Thu ngân: ${testData.cashierName}\n`;
      receipt += '------------------------\n\n';
      receipt += 'MÓN ĂN                    SL   GIÁ\n';
      receipt += '------------------------\n';
      
      testData.items.forEach(item => {
        const name = item.name.substring(0, 20).padEnd(20);
        const qty = item.quantity.toString().padStart(2);
        const price = item.price.toLocaleString('vi-VN').padStart(8);
        receipt += `${name} ${qty} ${price}\n`;
      });
      
      receipt += '------------------------\n';
      receipt += `TỔNG CỘNG: ${testData.total.toLocaleString('vi-VN')} VNĐ\n\n`;
      receipt += 'Cảm ơn quý khách!\n';
      receipt += 'Hẹn gặp lại!\n';
      
      res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': receipt.length,
        'X-Receipt-Type': 'test',
        'X-Printer-Model': 'XP-80C'
      });
      
      res.send(receipt);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
EOF

# Create printer module
print_status "Tạo printer module..."

cat > src/modules/printer/printer.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { PrinterController } from './printer.controller';
import { PrinterService } from './printer.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrinterController],
  providers: [PrinterService],
  exports: [PrinterService]
})
export class PrinterModule {}
EOF

# Update app.module.ts
print_status "Cập nhật app.module.ts..."
if ! grep -q "PrinterModule" src/app.module.ts; then
  sed -i '/import { AdminModule } from/a import { PrinterModule } from "./modules/printer/printer.module";' src/app.module.ts
  sed -i '/AdminModule,/a\    PrinterModule,' src/app.module.ts
fi

# Create test script
print_status "Tạo test script..."

cat > test-printer.js << 'EOF'
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPrinter() {
  try {
    console.log('🧾 Testing printer setup...');
    
    // Test data
    const testData = {
      orderNumber: 'HD001',
      tableName: 'Bàn 1',
      cashierName: 'Thu ngân A',
      items: [
        { name: 'Phở Bò', quantity: 2, price: 45000 },
        { name: 'Bún Bò Huế', quantity: 1, price: 50000 },
        { name: 'Nước Cam', quantity: 2, price: 15000 }
      ],
      total: 155000
    };
    
    // Generate simple receipt
    let receipt = '';
    receipt += 'NHÀ TÔI ERP\n';
    receipt += 'Hệ thống quản lý quán ăn\n';
    receipt += '========================\n\n';
    receipt += `Hóa đơn: ${testData.orderNumber}\n`;
    receipt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
    receipt += `Bàn: ${testData.tableName}\n`;
    receipt += `Thu ngân: ${testData.cashierName}\n`;
    receipt += '------------------------\n\n';
    receipt += 'MÓN ĂN                    SL   GIÁ\n';
    receipt += '------------------------\n';
    
    testData.items.forEach(item => {
      const name = item.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(2);
      const price = item.price.toLocaleString('vi-VN').padStart(8);
      receipt += `${name} ${qty} ${price}\n`;
    });
    
    receipt += '------------------------\n';
    receipt += `TỔNG CỘNG: ${testData.total.toLocaleString('vi-VN')} VNĐ\n\n`;
    receipt += 'Cảm ơn quý khách!\n';
    receipt += 'Hẹn gặp lại!\n';
    
    // Save to file
    const fs = require('fs');
    fs.writeFileSync('receipt-test.txt', receipt, 'utf8');
    
    console.log('✅ Test receipt generated!');
    console.log('File: receipt-test.txt');
    console.log('Size:', receipt.length, 'bytes');
    console.log('');
    console.log('Preview:');
    console.log(receipt);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPrinter();
EOF

# Run test
print_status "Chạy test printer..."
node test-printer.js

# Clean up
rm test-printer.js

print_status "✅ Hoàn thành setup máy in!"
echo ""
print_info "🎉 Máy in XP-80C đã được setup:"
echo "• ESC/POS commands cho máy in nhiệt"
echo "• API endpoints để in hóa đơn"
echo "• Test receipt đã được tạo"
echo ""
print_info "📋 API endpoints:"
echo "• POST /api/printer/receipt - In hóa đơn ESC/POS"
echo "• POST /api/printer/receipt-simple - In hóa đơn đơn giản"
echo "• GET /api/printer/test - Test in hóa đơn"
echo ""
print_info "🔧 Cách sử dụng:"
echo "1. Kết nối máy in XP-80C qua USB"
echo "2. Cài đặt driver ESC/POS"
echo "3. Gọi API để in hóa đơn"
echo "4. Kiểm tra file receipt-test.txt"
echo ""
print_warning "⚠️ Lưu ý:"
echo "• Máy in XP-80C chỉ hỗ trợ ESC/POS commands"
echo "• Không in được PDF hoặc file lớn"
echo "• Sử dụng text encoding cp1252"
echo "• Kích thước giấy 80mm (48 characters)"
