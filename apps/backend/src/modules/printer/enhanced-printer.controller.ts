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
      receipt += '========================\n';
      receipt += '123 Đường ABC, Quận 1, TP.HCM\n';
      receipt += 'ĐT: 0123 456 789\n';
      receipt += 'Email: info@nhatoi.com\n';
      receipt += 'Web: www.nhatoi.com\n';
      receipt += 'MST: 0123456789\n';
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
      receipt += `Thanh toán: ${testData.paymentMethod}\n`;
      receipt += `Khách hàng: ${testData.customerName}\n\n`;
      receipt += 'Cảm ơn quý khách!\n';
      receipt += 'Cảm ơn quý khách đã sử dụng dịch vụ!\n';
      receipt += '------------------------\n';
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
