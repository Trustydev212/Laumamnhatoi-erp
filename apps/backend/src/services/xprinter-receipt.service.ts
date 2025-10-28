import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BankQRService } from './bank-qr.service';
import { TaxConfigService } from './tax-config.service';
import { ReceiptConfigService, ReceiptConfig } from './receipt-config.service';
import * as QRCode from 'qrcode';

@Injectable()
export class XprinterReceiptService {
  constructor(
    private prisma: PrismaService,
    private bankQRService: BankQRService,
    private taxConfigService: TaxConfigService,
    private receiptConfigService: ReceiptConfigService
  ) {}

  // Tạo hóa đơn ESC/POS cho máy in Xprinter T80L với thiết kế đẹp
  async generateReceipt(orderId: string): Promise<string> {
    try {
      let order;
      
      if (orderId === 'test-order') {
        order = await this.createTestOrder();
      } else {
        // Lấy thông tin order
        order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            table: true,
            orderItems: {
              include: {
                menu: true
              }
            },
            customer: true,
            user: true // Cashier info
          }
        });
      }

      if (!order) {
        throw new Error('Order not found');
      }

      // Lấy cấu hình thuế và hóa đơn
      const taxConfig = await this.taxConfigService.getTaxConfig();
      const receiptConfig = await this.receiptConfigService.getConfig();
      
      // Tạo QR code thanh toán
      const bankQRUrl = this.bankQRService.generateBankQR(Number(order.total), `Thanh toan hoa don ${order.orderNumber}`);
      
      // Tạo hóa đơn ESC/POS với thiết kế đẹp
      let receipt = '';
      
      // ESC/POS Commands cho Xprinter T80L
      receipt += '\x1B\x40'; // Initialize printer
      
      // Header Section
      receipt += this.generateHeader(receiptConfig);
      
      // Receipt Info Section
      receipt += this.generateReceiptInfo(order, receiptConfig);
      
      // Items Section
      receipt += this.generateItemsSection(order, receiptConfig);
      
      // Calculation Section
      receipt += this.generateCalculationSection(order, taxConfig, receiptConfig);
      
      // QR Code Section
      receipt += this.generateQRCodeSection(bankQRUrl, order, receiptConfig);
      
      // Footer Section
      receipt += this.generateFooter(receiptConfig);
      
      // Cắt giấy
      receipt += '\x1D\x56\x00'; // Full cut
      receipt += '\x0A\x0A\x0A'; // Feed paper
      
      return receipt;
      
    } catch (error) {
      console.error('Error generating receipt:', error);
      throw new Error('Failed to generate receipt');
    }
  }

  // Tạo header đẹp cho 80mm
  private generateHeader(config: ReceiptConfig): string {
    let header = '';
    
    // Logo và tiêu đề - canh giữa
    header += '\x1B\x61\x01'; // Center alignment
    header += '\x1B\x21\x30'; // Double height, double width
    header += `${config.header.title}\n`;
    header += '\x1B\x21\x00'; // Normal text
    
    // Subtitle
    header += `${config.header.subtitle}\n`;
    
    // Separator
    header += '═══════════════════════════════\n';
    
    // Thông tin cửa hàng - canh giữa
    header += `${config.header.address}\n`;
    header += `Tel: ${config.header.phone}\n`;
    header += `Email: ${config.header.email}\n`;
    header += `Web: ${config.header.website}\n`;
    
    // Separator
    header += '═══════════════════════════════\n';
    
    return header;
  }

  // Tạo thông tin hóa đơn - tối ưu cho 80mm
  private generateReceiptInfo(order: any, config: ReceiptConfig): string {
    let info = '';
    
    info += '\x1B\x61\x00'; // Left alignment
    
    if (config.receipt.showOrderNumber) {
      info += `Hoa don: ${order.orderNumber}\n`;
    }
    
    if (config.receipt.showTable) {
      info += `Ban: ${order.table.name}\n`;
    }
    
    if (config.receipt.showDate) {
      info += `Ngay: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}\n`;
    }
    
    if (config.receipt.showTime) {
      info += `Gio: ${new Date(order.createdAt).toLocaleTimeString('vi-VN')}\n`;
    }
    
    if (config.receipt.showCashier && order.user) {
      info += `Thu ngan: ${order.user.username}\n`;
    }
    
    if (config.receipt.showCustomer && order.customer) {
      info += `Khach hang: ${order.customer.name}\n`;
    }
    
    // Separator
    info += '───────────────────────────────\n';
    
    return info;
  }

  // Tạo phần danh sách món ăn tối ưu cho 80mm
  private generateItemsSection(order: any, config: ReceiptConfig): string {
    let items = '';
    
    // Header table - tối ưu cho 80mm (32 ký tự)
    items += '\x1B\x21\x08'; // Bold
    items += 'Ten                SL   Gia     Tong\n';
    items += '\x1B\x21\x00'; // Normal
    items += '────────────────────────────────\n';
    
    // Danh sách món ăn - tối ưu cho 80mm
    order.orderItems.forEach((item: any) => {
      const name = item.menu.name.length > 12 ? 
        item.menu.name.substring(0, 12) + '...' : 
        item.menu.name;
      const quantity = item.quantity.toString().padStart(2);
      const price = Number(item.menu.price || 0).toLocaleString('vi-VN').padStart(6);
      const total = Number(item.total || 0).toLocaleString('vi-VN').padStart(8);
      
      items += `${name.padEnd(16)} ${quantity} ${price} ${total}\n`;
    });
    
    items += '═══════════════════════════════\n';
    
    return items;
  }

  // Tạo phần tính toán
  private generateCalculationSection(order: any, taxConfig: any, config: ReceiptConfig): string {
    let calc = '';
    
    // Tạm tính
    calc += `Tam tinh: ${Number(order.subtotal).toLocaleString('vi-VN')} VND\n`;
    
    // Thuế - chỉ hiển thị khi có thuế và thuế > 0
    const taxAmount = Number(order.tax) || 0;
    const taxRate = Number(taxConfig.vatRate) || 0;
    
    // Debug: Log tax values
    console.log('Tax Debug:', { 
      orderTax: order.tax, 
      taxAmount, 
      taxRate, 
      taxConfig: taxConfig.vatRate 
    });
    
    // Chỉ hiển thị thuế khi taxRate > 0 (không phải 0%)
    if (config.footer.showTax && taxRate > 0 && taxAmount > 0) {
      calc += `Thue VAT (${taxRate}%): ${taxAmount.toLocaleString('vi-VN')} VND\n`;
    }
    
    // Giảm giá
    if (config.footer.showDiscount && Number(order.discount) > 0) {
      calc += `Giam gia: -${Number(order.discount).toLocaleString('vi-VN')} VND\n`;
    }
    
    // Separator
    calc += '═══════════════════════════════\n';
    
    // Tổng cộng
    calc += '\x1B\x21\x30'; // Double height, double width
    calc += `TONG CONG: ${Number(order.total).toLocaleString('vi-VN')} VND\n`;
    calc += '\x1B\x21\x00'; // Normal
    
    return calc;
  }

  // Tạo phần QR code thanh toán
  private generateQRCodeSection(bankQRUrl: string, order: any, config: ReceiptConfig): string {
    let qr = '';
    
    if (config.footer.showQRCode) {
      qr += '\x1B\x61\x01'; // Center alignment
      
      if (config.style.showSeparators) {
        qr += '═══════════════════════════════\n';
      }
      
      qr += '\x1B\x21\x08'; // Bold
      qr += 'QUET MA QR DE THANH TOAN\n';
      qr += '\x1B\x21\x00'; // Normal
      
      // QR code image (sử dụng VietQR API)
      const bankConfig = this.bankQRService.getBankConfig();
      const qrImageUrl = `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNumber}-compact2.png?amount=${Number(order.total)}&addInfo=${encodeURIComponent(`Thanh toan hoa don ${order.orderNumber}`)}`;
      
      // QR code image với ESC/POS commands
      qr += '\x1B\x61\x01'; // Center alignment
      qr += '[QR CODE IMAGE]\n';
      qr += `So tien: ${Number(order.total).toLocaleString('vi-VN')} VND\n`;
      
      if (config.footer.showBankInfo) {
        qr += '\x1B\x61\x00'; // Left alignment
        qr += `Ngan hang: ${bankConfig.bankName}\n`;
        qr += `STK: ${bankConfig.accountNumber}\n`;
        qr += `Chu TK: ${bankConfig.accountName}\n`;
        qr += `Noi dung: ${order.orderNumber}\n`;
      }
      
      if (config.style.showSeparators) {
        qr += '═══════════════════════════════\n';
      }
    }
    
    return qr;
  }

  // Tạo footer
  private generateFooter(config: ReceiptConfig): string {
    let footer = '';
    
    footer += '\x1B\x61\x01'; // Center alignment
    
    // Custom message
    if (config.footer.customMessage) {
      footer += `💬 ${config.footer.customMessage}\n`;
    }
    
    // Thank you message
    if (config.footer.thankYouMessage) {
      footer += `🙏 ${config.footer.thankYouMessage}\n`;
    }
    
    // Separator cuối
    if (config.style.showSeparators) {
      footer += '═══════════════════════════════\n';
    }
    
    return footer;
  }

  // Tính toán kích thước hóa đơn (ước tính)
  private calculateReceiptSize(order: any, config: ReceiptConfig): { width: number; estimatedLength: number } {
    const width = config.style.width; // 80mm
    
    // Tính toán chiều dài ước tính
    let estimatedLines = 0;
    
    // Header (logo, tên cửa hàng, địa chỉ)
    estimatedLines += 8; // ~8 dòng cho header
    
    // Thông tin hóa đơn
    if (config.receipt.showOrderNumber) estimatedLines += 1;
    if (config.receipt.showTable) estimatedLines += 1;
    if (config.receipt.showDate) estimatedLines += 1;
    if (config.receipt.showTime) estimatedLines += 1;
    if (config.receipt.showCashier) estimatedLines += 1;
    if (config.receipt.showCustomer) estimatedLines += 1;
    estimatedLines += 1; // Separator
    
    // Danh sách món ăn
    estimatedLines += 2; // Header cho danh sách món
    order.orderItems.forEach((item: any) => {
      if (config.style.compactMode) {
        estimatedLines += 1; // 1 dòng cho mỗi món
      } else {
        estimatedLines += 2; // 2 dòng cho mỗi món
      }
    });
    estimatedLines += 1; // Separator
    
    // Tính toán
    estimatedLines += 1; // Tạm tính
    if (config.footer.showTax && Number(order.tax) > 0) estimatedLines += 1;
    if (config.footer.showDiscount && Number(order.discount) > 0) estimatedLines += 1;
    estimatedLines += 2; // Separator + Tổng cộng
    
    // QR Code
    if (config.footer.showQRCode) {
      estimatedLines += 4; // Header + QR + thông tin ngân hàng
    }
    
    // Footer
    if (config.footer.customMessage) estimatedLines += 1;
    if (config.footer.thankYouMessage) estimatedLines += 1;
    estimatedLines += 1; // Separator cuối
    
    // Ước tính chiều dài (mỗi dòng ~3mm)
    const estimatedLength = estimatedLines * 3;
    
    return { width, estimatedLength };
  }

  // Tạo file hóa đơn để in thủ công
  async generateReceiptFile(orderId: string): Promise<string> {
    try {
      const receipt = await this.generateReceipt(orderId);
      const filename = `receipt-${orderId}-${Date.now()}.txt`;
      
      // Lưu file vào thư mục tmp
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join('/tmp', filename);
      
      fs.writeFileSync(filePath, receipt, 'utf8');
      
      return filePath;
    } catch (error) {
      console.error('Error generating receipt file:', error);
      throw new Error('Failed to generate receipt file');
    }
  }

  // In hóa đơn trực tiếp lên máy in Xprinter T80L
  async printReceipt(orderId: string): Promise<{ success: boolean; message: string; filePath?: string }> {
    try {
      const receipt = await this.generateReceipt(orderId);
      
      // Tạo file tạm để lưu hóa đơn
      const timestamp = Date.now();
      const fileName = `receipt-${orderId}-${timestamp}.txt`;
      const filePath = `/tmp/${fileName}`;
      
      // Ghi file hóa đơn
      const fs = require('fs');
      fs.writeFileSync(filePath, receipt, 'utf8');
      
      // TODO: Thêm logic kết nối máy in thực tế
      // Hiện tại chỉ tạo file, chưa gửi đến máy in
      console.log(`Receipt file created: ${filePath}`);
      
      return {
        success: true,
        message: `Hóa đơn đã được tạo thành công. File: ${filePath}`,
        filePath: filePath
      };
    } catch (error) {
      console.error('Error printing receipt:', error);
      return {
        success: false,
        message: `Lỗi khi in hóa đơn: ${error.message}`
      };
    }
  }

  // Tạo order test để demo
  async createTestOrder(): Promise<any> {
    return {
      id: 'test-order',
      orderNumber: 'HD001',
      createdAt: new Date(),
      subtotal: 150000,
      tax: 0, // Không thuế
      discount: 5000,
      total: 145000,
      table: {
        name: 'Bàn 1'
      },
      customer: {
        name: 'Nguyễn Văn A'
      },
      user: {
        firstName: 'Thu',
        lastName: 'Ngân'
      },
      orderItems: [
        {
          quantity: 2,
          price: 45000,
          subtotal: 90000,
          menu: {
            name: 'Phở Bò'
          }
        },
        {
          quantity: 1,
          price: 50000,
          subtotal: 50000,
          menu: {
            name: 'Bún Bò Huế'
          }
        },
        {
          quantity: 2,
          price: 15000,
          subtotal: 30000,
          menu: {
            name: 'Nước Cam'
          }
        }
      ]
    };
  }

  // Lấy thông tin kích thước hóa đơn
  async getReceiptSizeInfo(orderId: string): Promise<{ width: number; estimatedLength: number; itemCount: number; compactMode: boolean }> {
    try {
      let order;
      
      if (orderId === 'test-order') {
        order = await this.createTestOrder();
      } else {
        order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            orderItems: {
              include: {
                menu: true
              }
            }
          }
        });
      }

      if (!order) {
        throw new Error('Order not found');
      }

      const receiptConfig = await this.receiptConfigService.getConfig();
      const sizeInfo = this.calculateReceiptSize(order, receiptConfig);
      
      return {
        width: sizeInfo.width,
        estimatedLength: sizeInfo.estimatedLength,
        itemCount: order.orderItems.length,
        compactMode: receiptConfig.style.compactMode
      };
    } catch (error) {
      console.error('Error getting receipt size info:', error);
      throw new Error('Failed to get receipt size info');
    }
  }
}
