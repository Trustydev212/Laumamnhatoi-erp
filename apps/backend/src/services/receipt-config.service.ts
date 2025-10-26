import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ReceiptConfig {
  // Header settings
  header: {
    logo: string;
    title: string;
    subtitle: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
  
  // Receipt settings
  receipt: {
    showOrderNumber: boolean;
    showTable: boolean;
    showCustomer: boolean;
    showDate: boolean;
    showTime: boolean;
    showCashier: boolean;
  };
  
  // Items settings
  items: {
    showDescription: boolean;
    showQuantity: boolean;
    showPrice: boolean;
    showSubtotal: boolean;
    alignColumns: 'left' | 'center' | 'right';
    maxItemNameLength: number; // Tối đa ký tự cho tên món
  };
  
  // Footer settings
  footer: {
    showTax: boolean;
    showDiscount: boolean;
    showTotal: boolean;
    showQRCode: boolean;
    showBankInfo: boolean;
    customMessage: string;
    thankYouMessage: string;
  };
  
  // Style settings
  style: {
    width: number; // 80mm cho Xprinter T80L
    fontSize: 'small' | 'medium' | 'large';
    boldHeader: boolean;
    boldTotal: boolean;
    showBorders: boolean;
    showSeparators: boolean;
    maxLineLength: number; // Tối đa ký tự trên 1 dòng (80mm = ~32 ký tự)
    compactMode: boolean; // Chế độ compact để tiết kiệm giấy
  };
}

@Injectable()
export class ReceiptConfigService {
  constructor(private prisma: PrismaService) {}

  // Cấu hình mặc định
  getDefaultConfig(): ReceiptConfig {
    return {
      header: {
        logo: '🍽️',
        title: 'NHÀ TÔI ERP',
        subtitle: 'Hệ thống quản lý quán ăn',
        address: '123 Đường ABC, Quận XYZ, TP.HCM',
        phone: '0123 456 789',
        email: 'info@nhatoi-erp.com',
        website: 'www.nhatoi-erp.com'
      },
      receipt: {
        showOrderNumber: true,
        showTable: true,
        showCustomer: true,
        showDate: true,
        showTime: true,
        showCashier: true
      },
      items: {
        showDescription: true,
        showQuantity: true,
        showPrice: true,
        showSubtotal: true,
        alignColumns: 'left',
        maxItemNameLength: 20 // Tối đa 20 ký tự cho tên món
      },
      footer: {
        showTax: true,
        showDiscount: true,
        showTotal: true,
        showQRCode: true,
        showBankInfo: true,
        customMessage: 'Cảm ơn quý khách đã sử dụng dịch vụ!',
        thankYouMessage: 'Hẹn gặp lại!'
      },
      style: {
        width: 80, // 80mm cho Xprinter T80L
        fontSize: 'medium',
        boldHeader: true,
        boldTotal: true,
        showBorders: true,
        showSeparators: true,
        maxLineLength: 32, // 80mm = ~32 ký tự
        compactMode: false // Chế độ bình thường
      }
    };
  }

  // Lưu cấu hình
  async saveConfig(config: ReceiptConfig): Promise<void> {
    // TODO: Lưu vào database khi có model SystemConfig
    console.log('Saving receipt config:', config);
  }

  // Lấy cấu hình
  async getConfig(): Promise<ReceiptConfig> {
    // TODO: Lấy từ database khi có model SystemConfig
    return this.getDefaultConfig();
  }
}
