import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BankQRService } from './bank-qr.service';
import { TaxConfigService } from './tax-config.service';
import * as QRCode from 'qrcode';

@Injectable()
export class EnhancedPrinterService {
  constructor(
    private prisma: PrismaService,
    private bankQRService: BankQRService,
    private taxConfigService: TaxConfigService
  ) {}

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

  // Tạo QR code thông tin hóa đơn
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

  // Tạo QR code ngân hàng
  async generateBankQRCode(amount: number, description: string = ''): Promise<string | null> {
    try {
      const bankQRUrl = this.bankQRService.generateBankQR(amount, description);
      
      const qrCode = await QRCode.toString(bankQRUrl, {
        type: 'svg',
        width: this.receiptConfig.qrCode.size,
        margin: this.receiptConfig.qrCode.margin
      });
      
      return qrCode;
    } catch (error) {
      console.error('Bank QR Code generation error:', error);
      return null;
    }
  }

  // Tạo QR code đa ngân hàng
  async generateMultiBankQRCode(amount: number, description: string = ''): Promise<any> {
    try {
      const multiBankQR = this.bankQRService.generateMultiBankQR(amount, description);
      
      const qrCodes = {
        vietqr: await QRCode.toString(multiBankQR.vietqr, {
          type: 'svg',
          width: this.receiptConfig.qrCode.size,
          margin: this.receiptConfig.qrCode.margin
        }),
        vnpay: await QRCode.toString(multiBankQR.vnpay, {
          type: 'svg',
          width: this.receiptConfig.qrCode.size,
          margin: this.receiptConfig.qrCode.margin
        }),
        momo: await QRCode.toString(multiBankQR.momo, {
          type: 'svg',
          width: this.receiptConfig.qrCode.size,
          margin: this.receiptConfig.qrCode.margin
        })
      };
      
      return qrCodes;
    } catch (error) {
      console.error('Multi Bank QR Code generation error:', error);
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
      const price = Number(item.price).toLocaleString('vi-VN').padStart(8);
      receipt += `${name} ${qty} ${price}\n`;
    });
    
    // Totals
    receipt += '------------------------\n';
    receipt += `Tạm tính: ${Number(order.subtotal).toLocaleString('vi-VN')} VNĐ\n`;
    if (Number(order.tax) > 0) {
      receipt += `Thuế VAT: ${Number(order.tax).toLocaleString('vi-VN')} VNĐ\n`;
    }
    if (Number(order.discount) > 0) {
      receipt += `Giảm giá: -${Number(order.discount).toLocaleString('vi-VN')} VNĐ\n`;
    }
    receipt += '------------------------\n';
    receipt += this.ESC_POS.BOLD_ON;
    receipt += `TỔNG CỘNG: ${Number(order.total).toLocaleString('vi-VN')} VNĐ\n`;
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
