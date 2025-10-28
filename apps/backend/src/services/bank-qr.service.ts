import { Injectable } from '@nestjs/common';

@Injectable()
export class BankQRService {
  // Danh sách ngân hàng hỗ trợ VietQR
  private bankList = [
    { id: '970436', name: 'Vietcombank', code: 'VCB' },
    { id: '970407', name: 'Techcombank', code: 'TCB' },
    { id: '970418', name: 'BIDV', code: 'BIDV' },
    { id: '970405', name: 'Agribank', code: 'AGB' },
    { id: '970422', name: 'MB Bank', code: 'MBB' },
    { id: '970432', name: 'VPBank', code: 'VPB' },
    { id: '970416', name: 'ACB', code: 'ACB' },
    { id: '970415', name: 'VietinBank', code: 'CTG' },
    { id: '970409', name: 'Sacombank', code: 'STB' },
    { id: '970428', name: 'HDBank', code: 'HDB' }
  ];

  // Cấu hình ngân hàng mặc định
  private bankConfig = {
    bankId: '970422', // MB Bank mặc định
    bankName: 'MB Bank',
    accountNumber: '1234567890',
    accountName: 'NGUYEN VAN A',
    template: 'compact2'
  };

  // Lấy danh sách ngân hàng
  getBankList() {
    return this.bankList;
  }

  // Tạo QR code ngân hàng theo chuẩn VietQR
  generateBankQR(amount: number, description: string = '', purpose: string = 'Thanh toan hoa don'): string {
    const config = { ...this.bankConfig, amount, description, purpose };
    
    // Tạo URL VietQR
    const vietQRUrl = this.buildVietQRUrl(config);
    
    return vietQRUrl;
  }

  // Build VietQR URL
  private buildVietQRUrl(config: any): string {
    const baseUrl = 'https://img.vietqr.io/image';
    const bankId = config.bankId || this.bankConfig.bankId;
    const accountNumber = config.accountNumber || this.bankConfig.accountNumber;
    const template = config.template || this.bankConfig.template;
    
    const params = new URLSearchParams();
    if (config.amount && config.amount > 0) {
      params.append('amount', config.amount.toString());
    }
    if (config.description) {
      params.append('addInfo', config.description);
    }
    
    const queryString = params.toString();
    const url = `${baseUrl}/${bankId}-${accountNumber}-${template}.png${queryString ? '?' + queryString : ''}`;
    
    return url;
  }

  // Cập nhật cấu hình ngân hàng
  updateBankConfig(newConfig: any) {
    this.bankConfig = { ...this.bankConfig, ...newConfig };
  }

  // Lấy cấu hình ngân hàng
  getBankConfig() {
    return this.bankConfig;
  }

  // Tạo QR code cho nhiều ngân hàng (chỉ VietQR)
  generateMultiBankQR(amount: number, description: string = ''): any {
    return {
      vietqr: this.generateBankQR(amount, description),
      amount,
      description,
      timestamp: new Date().toISOString()
    };
  }
}