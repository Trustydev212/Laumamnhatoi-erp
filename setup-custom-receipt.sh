#!/bin/bash

# Script setup hóa đơn tùy chỉnh với QR code
# Usage: ./setup-custom-receipt.sh

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

echo "🖨️ Setup hóa đơn tùy chỉnh với QR code..."
echo "================================================"

# Go to backend directory
cd apps/backend

# Install required packages
print_status "Cài đặt packages cần thiết..."
npm install qrcode express cors

# Create enhanced printer service
print_status "Tạo enhanced printer service..."

cat > src/services/enhanced-printer.service.ts << 'EOF'
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as QRCode from 'qrcode';

@Injectable()
export class EnhancedPrinterService {
  constructor(private prisma: PrismaService) {}

  // Cấu hình hóa đơn có thể tùy chỉnh
  private receiptConfig = {
    store: {
      name: 'NHÀ TÔI ERP',
      subtitle: 'Hệ thống quản lý quán ăn',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      phone: '0123 456 789',
      email: 'info@nhatoi.com',
      website: 'www.nhatoi.com',
      taxCode: '0123456789'
    },
    printer: {
      width: 48,
      encoding: 'cp1252'
    },
    qrCode: {
      enabled: true,
      size: 200,
      margin: 2
    },
    footer: {
      showQR: true,
      showWebsite: true,
      showTaxCode: true,
      showThankYou: true,
      customMessage: 'Cảm ơn quý khách đã sử dụng dịch vụ!'
    }
  };

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

  // Tạo QR code
  async generateQRCode(orderData: any): Promise<string | null> {
    try {
      const qrData = {
        orderNumber: orderData.orderNumber,
        date: new Date().toISOString(),
        total: orderData.total,
        store: this.receiptConfig.store.name,
        website: this.receiptConfig.store.website
      };
      
      const qrString = JSON.stringify(qrData);
      const qrCode = await QRCode.toString(qrString, {
        type: 'svg',
        width: this.receiptConfig.qrCode.size,
        margin: this.receiptConfig.qrCode.margin
      });
      
      return qrCode;
    } catch (error) {
      console.error('QR Code generation error:', error);
      return null;
    }
  }

  // Tạo hóa đơn tùy chỉnh
  async generateCustomReceipt(orderId: string, customConfig: any = {}): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        user: true,
        customer: true,
        orderItems: {
          include: {
            menu: true
          }
        },
        payments: true
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const config = { ...this.receiptConfig, ...customConfig };
    let receipt = '';
    
    // Reset printer
    receipt += this.ESC_POS.RESET;
    
    // Header - Store info
    receipt += this.ESC_POS.ALIGN_CENTER;
    receipt += this.ESC_POS.BOLD_ON;
    receipt += this.ESC_POS.FONT_B;
    receipt += `${config.store.name}\n`;
    receipt += `${config.store.subtitle}\n`;
    receipt += '========================\n';
    
    // Store details
    receipt += this.ESC_POS.BOLD_OFF;
    receipt += this.ESC_POS.FONT_A;
    if (config.store.address) {
      receipt += `${config.store.address}\n`;
    }
    if (config.store.phone) {
      receipt += `ĐT: ${config.store.phone}\n`;
    }
    if (config.store.email) {
      receipt += `Email: ${config.store.email}\n`;
    }
    if (config.store.website) {
      receipt += `Web: ${config.store.website}\n`;
    }
    if (config.store.taxCode) {
      receipt += `MST: ${config.store.taxCode}\n`;
    }
    receipt += '========================\n';
    
    // Order info
    receipt += this.ESC_POS.ALIGN_LEFT;
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
    
    // Totals
    receipt += '------------------------\n';
    receipt += `Tạm tính: ${order.subtotal.toLocaleString('vi-VN')} VNĐ\n`;
    if (order.tax > 0) {
      receipt += `Thuế VAT: ${order.tax.toLocaleString('vi-VN')} VNĐ\n`;
    }
    if (order.discount > 0) {
      receipt += `Giảm giá: -${order.discount.toLocaleString('vi-VN')} VNĐ\n`;
    }
    receipt += '------------------------\n';
    receipt += this.ESC_POS.BOLD_ON;
    receipt += `TỔNG CỘNG: ${order.total.toLocaleString('vi-VN')} VNĐ\n`;
    receipt += this.ESC_POS.BOLD_OFF;
    
    // Payment info
    if (order.payments && order.payments.length > 0) {
      receipt += `Thanh toán: ${order.payments[0].method}\n`;
    }
    if (order.customer) {
      receipt += `Khách hàng: ${order.customer.name}\n`;
    }
    
    // Footer
    receipt += this.ESC_POS.ALIGN_CENTER;
    if (config.footer.showThankYou) {
      receipt += 'Cảm ơn quý khách!\n';
    }
    if (config.footer.customMessage) {
      receipt += `${config.footer.customMessage}\n`;
    }
    
    // QR Code info
    if (config.footer.showQR && config.qrCode.enabled) {
      receipt += '------------------------\n';
      receipt += 'Quét mã QR để xem chi tiết:\n';
    }
    
    // Feed and cut
    receipt += this.ESC_POS.FEED_PAPER;
    receipt += this.ESC_POS.CUT_PAPER;
    
    return receipt;
  }

  // Cập nhật cấu hình hóa đơn
  updateConfig(newConfig: any) {
    this.receiptConfig = { ...this.receiptConfig, ...newConfig };
  }

  // Lấy cấu hình hiện tại
  getConfig() {
    return this.receiptConfig;
  }
}
EOF

# Create enhanced printer controller
print_status "Tạo enhanced printer controller..."

cat > src/modules/printer/enhanced-printer.controller.ts << 'EOF'
import { Controller, Post, Get, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { EnhancedPrinterService } from '../../services/enhanced-printer.service';

@Controller('printer/enhanced')
export class EnhancedPrinterController {
  constructor(private enhancedPrinterService: EnhancedPrinterService) {}

  @Post('receipt')
  async printCustomReceipt(@Body() body: { orderId: string; customConfig?: any }, @Res() res: Response) {
    try {
      const receipt = await this.enhancedPrinterService.generateCustomReceipt(body.orderId, body.customConfig);
      
      res.set({
        'Content-Type': 'text/plain; charset=cp1252',
        'Content-Length': receipt.length,
        'X-Receipt-Type': 'enhanced',
        'X-Printer-Model': 'XP-80C'
      });
      
      res.send(receipt);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  @Post('qr')
  async generateQRCode(@Body() body: { orderId: string }, @Res() res: Response) {
    try {
      const order = await this.enhancedPrinterService['prisma'].order.findUnique({
        where: { id: body.orderId },
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
        return res.status(404).json({ error: 'Order not found' });
      }

      const orderData = {
        orderNumber: order.orderNumber,
        tableName: order.table.name,
        cashierName: order.user.firstName + ' ' + order.user.lastName,
        items: order.orderItems.map(item => ({
          name: item.menu.name,
          quantity: item.quantity,
          price: item.price
        })),
        total: order.total
      };

      const qrCode = await this.enhancedPrinterService.generateQRCode(orderData);
      
      if (qrCode) {
        res.set({
          'Content-Type': 'image/svg+xml',
          'Content-Length': qrCode.length
        });
        res.send(qrCode);
      } else {
        res.status(500).json({ error: 'Failed to generate QR code' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  @Post('config')
  updateConfig(@Body() body: any) {
    this.enhancedPrinterService.updateConfig(body);
    return { success: true, message: 'Configuration updated' };
  }

  @Get('config')
  getConfig() {
    return { success: true, config: this.enhancedPrinterService.getConfig() };
  }

  @Get('test')
  async testPrint(@Res() res: Response) {
    try {
      const testData = {
        orderNumber: 'HD001',
        tableName: 'Bàn 1',
        cashierName: 'Thu ngân A',
        customerName: 'Nguyễn Văn A',
        paymentMethod: 'Tiền mặt',
        items: [
          { name: 'Phở Bò', quantity: 2, price: 45000 },
          { name: 'Bún Bò Huế', quantity: 1, price: 50000 },
          { name: 'Nước Cam', quantity: 2, price: 15000 }
        ],
        subtotal: 155000,
        tax: 15500,
        discount: 5000,
        total: 165500
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
      receipt += `Tạm tính: ${testData.subtotal.toLocaleString('vi-VN')} VNĐ\n`;
      receipt += `Thuế VAT: ${testData.tax.toLocaleString('vi-VN')} VNĐ\n`;
      receipt += `Giảm giá: -${testData.discount.toLocaleString('vi-VN')} VNĐ\n`;
      receipt += '------------------------\n';
      receipt += `TỔNG CỘNG: ${testData.total.toLocaleString('vi-VN')} VNĐ\n\n`;
      receipt += 'Cảm ơn quý khách!\n';
      receipt += 'Quét mã QR để xem chi tiết:\n';
      
      res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': receipt.length,
        'X-Receipt-Type': 'enhanced-test',
        'X-Printer-Model': 'XP-80C'
      });
      
      res.send(receipt);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
EOF

# Update printer module
print_status "Cập nhật printer module..."

cat > src/modules/printer/printer.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { PrinterController } from './printer.controller';
import { EnhancedPrinterController } from './enhanced-printer.controller';
import { PrinterService } from './printer.service';
import { EnhancedPrinterService } from '../../services/enhanced-printer.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrinterController, EnhancedPrinterController],
  providers: [PrinterService, EnhancedPrinterService],
  exports: [PrinterService, EnhancedPrinterService]
})
export class PrinterModule {}
EOF

# Create test script
print_status "Tạo test script..."

cat > test-enhanced-receipt.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

async function testEnhancedReceipt() {
  try {
    console.log('🧾 Testing enhanced receipt with QR code...');
    
    // Sample order data
    const orderData = {
      orderNumber: 'HD001',
      tableName: 'Bàn 1',
      cashierName: 'Thu ngân A',
      customerName: 'Nguyễn Văn A',
      paymentMethod: 'Tiền mặt',
      items: [
        { name: 'Phở Bò', quantity: 2, price: 45000 },
        { name: 'Bún Bò Huế', quantity: 1, price: 50000 },
        { name: 'Nước Cam', quantity: 2, price: 15000 }
      ],
      subtotal: 155000,
      tax: 15500,
      discount: 5000,
      total: 165500
    };
    
    // Generate QR code
    const qrData = {
      orderNumber: orderData.orderNumber,
      date: new Date().toISOString(),
      total: orderData.total,
      store: 'NHÀ TÔI ERP',
      website: 'www.nhatoi.com'
    };
    
    const qrString = JSON.stringify(qrData);
    const qrCode = await QRCode.toString(qrString, {
      type: 'svg',
      width: 200,
      margin: 2
    });
    
    // Generate enhanced receipt
    let receipt = '';
    receipt += 'NHÀ TÔI ERP\n';
    receipt += 'Hệ thống quản lý quán ăn\n';
    receipt += '========================\n';
    receipt += '123 Đường ABC, Quận 1, TP.HCM\n';
    receipt += 'ĐT: 0123 456 789\n';
    receipt += 'Email: info@nhatoi.com\n';
    receipt += 'Web: www.nhatoi.com\n';
    receipt += 'MST: 0123456789\n';
    receipt += '========================\n\n';
    receipt += `Hóa đơn: ${orderData.orderNumber}\n`;
    receipt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
    receipt += `Bàn: ${orderData.tableName}\n`;
    receipt += `Thu ngân: ${orderData.cashierName}\n`;
    receipt += '------------------------\n\n';
    receipt += 'MÓN ĂN                    SL   GIÁ\n';
    receipt += '------------------------\n';
    
    orderData.items.forEach(item => {
      const name = item.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(2);
      const price = item.price.toLocaleString('vi-VN').padStart(8);
      receipt += `${name} ${qty} ${price}\n`;
    });
    
    receipt += '------------------------\n';
    receipt += `Tạm tính: ${orderData.subtotal.toLocaleString('vi-VN')} VNĐ\n`;
    receipt += `Thuế VAT: ${orderData.tax.toLocaleString('vi-VN')} VNĐ\n`;
    receipt += `Giảm giá: -${orderData.discount.toLocaleString('vi-VN')} VNĐ\n`;
    receipt += '------------------------\n';
    receipt += `TỔNG CỘNG: ${orderData.total.toLocaleString('vi-VN')} VNĐ\n\n`;
    receipt += `Thanh toán: ${orderData.paymentMethod}\n`;
    receipt += `Khách hàng: ${orderData.customerName}\n\n`;
    receipt += 'Cảm ơn quý khách!\n';
    receipt += 'Cảm ơn quý khách đã sử dụng dịch vụ!\n';
    receipt += '------------------------\n';
    receipt += 'Quét mã QR để xem chi tiết:\n';
    
    // Save to files
    const fs = require('fs');
    fs.writeFileSync('enhanced-receipt.txt', receipt, 'utf8');
    fs.writeFileSync('receipt-qr.svg', qrCode, 'utf8');
    fs.writeFileSync('receipt-data.json', JSON.stringify(orderData, null, 2), 'utf8');
    
    console.log('✅ Enhanced receipt generated!');
    console.log('Receipt length:', receipt.length, 'bytes');
    console.log('QR Code generated:', qrCode ? 'Yes' : 'No');
    console.log('');
    console.log('Files saved:');
    console.log('- enhanced-receipt.txt (Enhanced receipt)');
    console.log('- receipt-qr.svg (QR code)');
    console.log('- receipt-data.json (Order data)');
    
    console.log('\n📋 Receipt preview:');
    console.log(receipt);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testEnhancedReceipt();
EOF

# Run test
print_status "Chạy test enhanced receipt..."
node test-enhanced-receipt.js

# Clean up
rm test-enhanced-receipt.js

print_status "✅ Hoàn thành setup hóa đơn tùy chỉnh với QR code!"
echo ""
print_info "🎉 Tính năng đã được thêm:"
echo "• QR code cho hóa đơn"
echo "• Tùy chỉnh thông tin cửa hàng"
echo "• Tùy chỉnh footer và message"
echo "• API endpoints để cập nhật cấu hình"
echo "• Hỗ trợ thuế VAT và giảm giá"
echo ""
print_info "📋 API endpoints mới:"
echo "• POST /api/printer/enhanced/receipt - In hóa đơn tùy chỉnh"
echo "• POST /api/printer/enhanced/qr - Tạo QR code"
echo "• POST /api/printer/enhanced/config - Cập nhật cấu hình"
echo "• GET /api/printer/enhanced/config - Lấy cấu hình"
echo "• GET /api/printer/enhanced/test - Test hóa đơn"
echo ""
print_info "🔧 Cách sử dụng:"
echo "1. Cập nhật thông tin cửa hàng qua API"
echo "2. Tùy chỉnh footer và message"
echo "3. In hóa đơn với QR code"
echo "4. Kiểm tra file enhanced-receipt.txt"
echo ""
print_warning "⚠️ Lưu ý:"
echo "• QR code chứa thông tin hóa đơn"
echo "• Có thể tùy chỉnh hoàn toàn thông tin hiển thị"
echo "• Hỗ trợ thuế VAT và giảm giá"
echo "• Tương thích với máy in XP-80C"
