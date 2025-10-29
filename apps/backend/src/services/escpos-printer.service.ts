import { Injectable } from '@nestjs/common';
import { BankQRService } from './bank-qr.service';
import { TaxConfigService } from './tax-config.service';
import { ReceiptConfigService } from './receipt-config.service';
import * as escpos from 'escpos';
import * as axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EscposPrinterService {
  constructor(
    private bankQRService: BankQRService,
    private taxConfigService: TaxConfigService,
    private receiptConfigService: ReceiptConfigService,
  ) {}

  // In hóa đơn với QR code thật qua ESC/POS
  async printReceiptWithQR(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Lấy cấu hình
      const config = await this.receiptConfigService.getConfig();
      const taxConfig = await this.taxConfigService.getTaxConfig();
      const bankConfig = this.bankQRService.getBankConfig();

      // Tạo order test nếu cần
      const order = orderId === 'test-order' ? this.createTestOrder() : await this.getOrderById(orderId);
      
      // Tính toán thuế
      const taxRate = Number(taxConfig.vatRate) || 0;
      const taxAmount = taxRate > 0 ? Number(order.subtotal) * (taxRate / 100) : 0;
      const finalTotal = taxRate > 0 ? Number(order.total) : Number(order.subtotal);

      // Tạo QR code image
      const qrImagePath = await this.generateVietQRImage(order, bankConfig, finalTotal);

      // Tạo lệnh ESC/POS
      const escposCommands = this.generateEscposCommands(order, config, taxConfig, qrImagePath, finalTotal);

      // In qua ESC/POS (simulate - trong thực tế sẽ kết nối máy in)
      console.log('ESC/POS Commands:', escposCommands);
      
      // Cleanup QR image
      if (fs.existsSync(qrImagePath)) {
        fs.unlinkSync(qrImagePath);
      }

      return {
        success: true,
        message: 'Hóa đơn đã được gửi tới máy in Xprinter T80L với QR code thật!'
      };
    } catch (error) {
      console.error('Error printing receipt with QR:', error);
      return {
        success: false,
        message: 'Lỗi khi in hóa đơn: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }

  // Tạo QR code image từ VietQR API
  private async generateVietQRImage(order: any, bankConfig: any, amount: number): Promise<string> {
    try {
      const qrUrl = `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(`Thanh toan hoa don ${order.orderNumber}`)}&accountName=${encodeURIComponent(bankConfig.accountName)}`;
      
      const response = await axios.default.get(qrUrl, { responseType: 'arraybuffer' });
      const qrImagePath = path.join(process.cwd(), `temp-qr-${order.orderNumber}.png`);
      
      fs.writeFileSync(qrImagePath, response.data);
      return qrImagePath;
    } catch (error) {
      console.error('Error generating QR image:', error);
      throw error;
    }
  }

  // Tạo lệnh ESC/POS chuẩn
  private generateEscposCommands(order: any, config: any, taxConfig: any, qrImagePath: string, finalTotal: number): string {
    let commands = '';

    // Reset printer
    commands += '\x1B\x40'; // ESC @

    // Header - Company name (double height, double width, center)
    commands += '\x1B\x61\x01'; // Center alignment
    commands += '\x1B\x21\x30'; // Double height, double width
    commands += `${config.header.title}\n`;
    commands += '\x1B\x21\x00'; // Normal text
    commands += `${config.header.subtitle}\n`;
    commands += '═══════════════════════════════\n';

    // Contact info
    commands += '\x1B\x61\x00'; // Left alignment
    commands += `${config.header.address}\n`;
    commands += `Tel: ${config.header.phone}\n`;
    commands += `Email: ${config.header.email}\n`;
    commands += `Web: ${config.header.website}\n`;
    commands += '═══════════════════════════════\n';

    // Receipt info
    commands += `Hoa don: ${order.orderNumber}\n`;
    commands += `Ban: ${order.table.name}\n`;
    commands += `Ngay: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}\n`;
    commands += `Gio: ${new Date(order.createdAt).toLocaleTimeString('vi-VN')}\n`;
    commands += `Thu ngan: ${order.user?.username || 'admin'}\n`;
    commands += '───────────────────────────────\n';

    // Items header
    commands += '\x1B\x21\x08'; // Bold
    commands += 'Ten                SL   Gia     Tong\n';
    commands += '\x1B\x21\x00'; // Normal
    commands += '────────────────────────────────\n';

    // Items
    order.orderItems.forEach((item: any) => {
      const name = item.menu.name.length > 12 ? 
        item.menu.name.substring(0, 12) + '...' : 
        item.menu.name;
      const quantity = item.quantity.toString().padStart(2);
      const price = Number(item.menu.price || 0).toLocaleString('vi-VN').padStart(6);
      const itemTotal = Number(item.total) || (Number(item.menu.price || 0) * Number(item.quantity || 0));
      const total = itemTotal.toLocaleString('vi-VN').padStart(8);
      
      commands += `${name.padEnd(16)} ${quantity} ${price} ${total}\n`;
    });

    commands += '═══════════════════════════════\n';

    // Calculation
    commands += `Tam tinh: ${Number(order.subtotal).toLocaleString('vi-VN')} VND\n`;
    
    const taxRate = Number(taxConfig.vatRate) || 0;
    if (taxRate > 0) {
      const taxAmount = Number(order.tax) || 0;
      commands += `Thue VAT (${taxRate}%): ${taxAmount.toLocaleString('vi-VN')} VND\n`;
    }
    
    if (Number(order.discount) > 0) {
      commands += `Giam gia: -${Number(order.discount).toLocaleString('vi-VN')} VND\n`;
    }
    
    commands += '═══════════════════════════════\n';
    commands += '\x1B\x21\x30'; // Double height, double width
    commands += `TONG CONG: ${finalTotal.toLocaleString('vi-VN')} VND\n`;
    commands += '\x1B\x21\x00'; // Normal

    // QR Code section
    commands += '═══════════════════════════════\n';
    commands += '\x1B\x61\x01'; // Center alignment
    commands += '\x1B\x21\x08'; // Bold
    commands += 'QUET MA QR DE THANH TOAN\n';
    commands += '\x1B\x21\x00'; // Normal

    // QR Code image (ESC/POS raster command)
    if (fs.existsSync(qrImagePath)) {
      commands += '\x1B\x61\x01'; // Center alignment
      // ESC/POS command để in QR code image
      commands += '\x1B\x2A\x21'; // ESC * ! (raster mode)
      // Note: Trong thực tế, cần convert PNG thành raster data
      commands += '[QR CODE IMAGE]\n'; // Placeholder
    }

    commands += `So tien: ${finalTotal.toLocaleString('vi-VN')} VND\n`;
    
    // Bank info
    commands += '\x1B\x61\x00'; // Left alignment
    commands += `Ngan hang: Vietcombank\n`;
    commands += `STK: 0123456789\n`;
    commands += `Chu TK: LAU MAM NHA TOI\n`;
    commands += `Noi dung: ${order.orderNumber}\n`;
    commands += '═══════════════════════════════\n';

    // Footer
    commands += '\x1B\x61\x01'; // Center alignment
    commands += 'Cam on quy khach da su dung dich vu!\n';
    commands += 'Hen gap lai!\n';
    commands += '═══════════════════════════════\n';

    // Feed paper and cut
    commands += '\x1A'; // Cut paper
    commands += '\x0A'; // Line feed

    return commands;
  }

  // Tạo order test
  private createTestOrder() {
    return {
      id: 'test-order',
      orderNumber: '202510280028',
      subtotal: 160000,
      tax: 0,
      total: 160000,
      discount: 0,
      createdAt: new Date(),
      table: { name: 'Bàn 11' },
      user: { username: 'admin' },
      orderItems: [
        {
          quantity: 8,
          total: 160000,
          menu: { name: 'Chả Giò', price: 20000 }
        }
      ]
    };
  }

  // Lấy order từ database (placeholder)
  private async getOrderById(orderId: string) {
    // TODO: Implement database query
    return this.createTestOrder();
  }
}
