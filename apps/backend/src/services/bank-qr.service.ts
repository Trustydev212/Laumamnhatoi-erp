import { Injectable } from '@nestjs/common';

@Injectable()
export class BankQRService {
  // Cấu hình ngân hàng
  private bankConfig = {
    bankCode: '970415', // Vietcombank
    accountNumber: '1234567890',
    accountName: 'NGUYEN VAN A',
    template: 'compact2', // compact2, compact, qr_only
    amount: 0,
    description: '',
    purpose: 'Thanh toan hoa don'
  };

  // Tạo QR code ngân hàng theo chuẩn VietQR
  generateBankQR(amount: number, description: string = '', purpose: string = 'Thanh toan hoa don'): string {
    const config = { ...this.bankConfig, amount, description, purpose };
    
    // Tạo URL VietQR
    const vietQRUrl = this.buildVietQRUrl(config);
    
    return vietQRUrl;
  }

  // Tạo QR code ngân hàng theo chuẩn VNPay
  generateVNPayQR(amount: number, description: string = ''): string {
    const config = { ...this.bankConfig, amount, description };
    
    // Tạo URL VNPay QR
    const vnpayQRUrl = this.buildVNPayQRUrl(config);
    
    return vnpayQRUrl;
  }

  // Tạo QR code ngân hàng theo chuẩn Momo
  generateMomoQR(amount: number, description: string = ''): string {
    const config = { ...this.bankConfig, amount, description };
    
    // Tạo URL Momo QR
    const momoQRUrl = this.buildMomoQRUrl(config);
    
    return momoQRUrl;
  }

  // Build VietQR URL
  private buildVietQRUrl(config: any): string {
    const baseUrl = 'https://img.vietqr.io/image';
    const params = new URLSearchParams({
      bank: config.bankCode,
      account: config.accountNumber,
      name: config.accountName,
      amount: config.amount.toString(),
      template: config.template,
      description: config.description
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  // Build VNPay QR URL
  private buildVNPayQRUrl(config: any): string {
    const baseUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const params = new URLSearchParams({
      vnp_Amount: (config.amount * 100).toString(), // VNPay yêu cầu amount * 100
      vnp_Command: 'pay',
      vnp_CreateDate: new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + '00',
      vnp_CurrCode: 'VND',
      vnp_IpAddr: '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: config.description,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: 'http://localhost:3000/payment/return',
      vnp_TmnCode: 'YOUR_TMN_CODE', // Cần thay bằng TMN code thực
      vnp_TxnRef: Date.now().toString(),
      vnp_Version: '2.1.0'
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  // Build Momo QR URL
  private buildMomoQRUrl(config: any): string {
    const baseUrl = 'https://payment.momo.vn/v2/gateway/api/create';
    const params = new URLSearchParams({
      partnerCode: 'YOUR_PARTNER_CODE', // Cần thay bằng partner code thực
      accessKey: 'YOUR_ACCESS_KEY', // Cần thay bằng access key thực
      requestId: Date.now().toString(),
      amount: config.amount.toString(),
      orderId: Date.now().toString(),
      orderInfo: config.description,
      returnUrl: 'http://localhost:3000/payment/return',
      notifyUrl: 'http://localhost:3000/payment/notify',
      extraData: '',
      requestType: 'captureMoMoWallet',
      signature: 'YOUR_SIGNATURE' // Cần tính toán signature thực
    });
    
    return `${baseUrl}?${params.toString()}`;
  }

  // Cập nhật cấu hình ngân hàng
  updateBankConfig(newConfig: any) {
    this.bankConfig = { ...this.bankConfig, ...newConfig };
  }

  // Lấy cấu hình ngân hàng
  getBankConfig() {
    return this.bankConfig;
  }

  // Tạo QR code cho nhiều ngân hàng
  generateMultiBankQR(amount: number, description: string = ''): any {
    return {
      vietqr: this.generateBankQR(amount, description),
      vnpay: this.generateVNPayQR(amount, description),
      momo: this.generateMomoQR(amount, description),
      amount,
      description,
      timestamp: new Date().toISOString()
    };
  }
}
