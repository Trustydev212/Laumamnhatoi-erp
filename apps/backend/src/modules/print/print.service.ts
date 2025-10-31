import { Injectable } from '@nestjs/common';
import * as escpos from 'escpos';
import * as escposUSB from 'escpos-usb';
import axios from 'axios';
import { TaxConfigService } from '../../services/tax-config.service';

// Cấu hình máy in
interface PrinterConfig {
  type: 'usb' | 'network';
  ip?: string;
  port?: number;
}

// Cấu hình VietQR
interface VietQRConfig {
  acqId: number;
  accountNo: string;
  accountName: string;
}

@Injectable()
export class PrintService {
  private readonly printerConfig: PrinterConfig = {
    type: 'usb', // hoặc 'network'
    ip: '192.168.1.100', // IP máy in LAN
    port: 9100
  };

  private readonly vietQRConfig: VietQRConfig = {
    acqId: 970436, // Vietcombank
    accountNo: '0123456789',
    accountName: 'LAU MAM NHA TOI'
  };

  constructor(private readonly taxConfigService: TaxConfigService) {
    // Cấu hình escpos-usb
    escpos.USB = escposUSB;
  }

  /**
   * In hóa đơn thanh toán (không QR)
   */
  async printBill(bill: any): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧾 In hóa đơn thanh toán:', bill);

      // Tính tổng tiền từ items
      const subtotal = bill.items.reduce((sum: number, item: any) => {
        return sum + (item.price * item.qty);
      }, 0);

      // Lấy cấu hình thuế và tính thuế
      const taxConfig = await this.taxConfigService.getTaxConfig();
      const taxCalculation = await this.taxConfigService.calculateTax(subtotal);

      console.log('💰 Thông tin thuế:', {
        subtotal,
        vatAmount: taxCalculation.vatAmount,
        serviceChargeAmount: taxCalculation.serviceChargeAmount,
        total: taxCalculation.total,
        vatRate: taxCalculation.vatRate,
        vatEnabled: taxCalculation.vatEnabled,
        serviceChargeEnabled: taxCalculation.serviceChargeEnabled
      });

      const device = this.createPrinterDevice();
      const printer = new escpos.Printer(device);

      return new Promise((resolve, reject) => {
        device.open((error: any) => {
          if (error) {
            console.error('❌ Lỗi kết nối máy in:', error);
            reject({ success: false, message: 'Không thể kết nối máy in: ' + error.message });
            return;
          }

          try {
            printer
              // HEADER
              .align('ct').style('b').size(1, 1).text('NHÀ TÔI RESTAURANT')
              .size(0, 0).text('HÓA ĐƠN THANH TOÁN')
              .text('Cảm ơn quý khách!')
              .text('--------------------------------')
              
              // INFO
              .align('lt')
              .text(`Số đơn: ${bill.id}`)
              .text(`Bàn: ${bill.table || 'Tại quầy'}`)
              .text(`Thời gian: ${bill.time}`)
              .text('--------------------------------')
              
              // ITEMS
              .style('b').text('STT  Món ăn                SL   Giá').style('normal');

            bill.items.forEach((item: any, i: number) => {
              const itemTotal = item.price * item.qty;
              printer.text(
                `${(i + 1).toString().padEnd(3)} ${item.name.padEnd(18)} ${item.qty.toString().padEnd(3)} ${itemTotal.toLocaleString().padStart(8)}`
              );
            });

            printer.text('--------------------------------');

            // Tạm tính
            printer
              .align('rt')
              .style('normal')
              .text(`Tạm tính: ${subtotal.toLocaleString()} đ`);

            // Thuế VAT
            if (taxCalculation.vatEnabled && taxCalculation.vatAmount > 0) {
              printer
                .align('rt')
                .text(`${taxConfig.taxName || 'VAT'} (${taxCalculation.vatRate}%): ${taxCalculation.vatAmount.toLocaleString()} đ`);
            }

            // Phí phục vụ
            if (taxCalculation.serviceChargeEnabled && taxCalculation.serviceChargeAmount > 0) {
              printer
                .align('rt')
                .text(`${taxConfig.serviceChargeName || 'Phí phục vụ'} (${taxCalculation.serviceChargeRate}%): ${taxCalculation.serviceChargeAmount.toLocaleString()} đ`);
            }

            // Tổng cộng
            printer
              .align('rt')
              .style('b')
              .text(`Tổng cộng: ${taxCalculation.total.toLocaleString()} đ`)
              .style('normal')
              .feed(1)
              
              // FOOTER
              .align('ct')
              .text('699 Phạm Hữu Lầu, Cao Lãnh, Đồng Tháp')
              .text('Wifi: nhatoi2025')
              .text('Hẹn gặp lại quý khách!')
              .feed(2)
              .cut()
              .close();

            console.log('✅ In hóa đơn thành công');
            resolve({ success: true, message: 'Hóa đơn đã được in thành công!' });

          } catch (printError) {
            console.error('❌ Lỗi khi in:', printError);
            reject({ success: false, message: 'Lỗi khi in hóa đơn: ' + printError.message });
          }
        });
      });

    } catch (error) {
      console.error('❌ Lỗi trong printBill:', error);
      return { success: false, message: 'Lỗi hệ thống: ' + (error instanceof Error ? error.message : String(error)) };
    }
  }

  /**
   * In QR thanh toán riêng (VietQR động)
   */
  async printPaymentQR(data: { amount: number; billId: string }): Promise<{ success: boolean; message: string }> {
    try {
      console.log('💳 In QR thanh toán:', data);

      const { amount, billId } = data;
      const addInfo = `HD${billId}`;
      
      // Tạo URL VietQR
      const qrUrl = `https://img.vietqr.io/image/${this.vietQRConfig.acqId}-${this.vietQRConfig.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(this.vietQRConfig.accountName)}`;

      console.log('🔗 VietQR URL:', qrUrl);

      // Tải QR image
      const res = await axios.get(qrUrl, { responseType: 'arraybuffer' });
      const qrBuffer = Buffer.from(res.data, 'binary');

      const device = this.createPrinterDevice();
      const printer = new escpos.Printer(device);

      return new Promise((resolve, reject) => {
        device.open((error: any) => {
          if (error) {
            console.error('❌ Lỗi kết nối máy in:', error);
            reject({ success: false, message: 'Không thể kết nối máy in: ' + error.message });
            return;
          }

          try {
            escpos.Image.load(qrBuffer, (image: any) => {
              printer
                .align('ct').style('b').text('QR THANH TOÁN VIETQR').feed(1)
                .raster(image, 'dwdh').feed(1)
                .text(`Số tiền: ${amount.toLocaleString()} đ`)
                .text(`Mã hóa đơn: ${billId}`)
                .text('Quét QR để thanh toán').feed(2)
                .cut().close();

              console.log('✅ In QR thành công');
              resolve({ success: true, message: 'QR thanh toán đã được in thành công!' });
            });
          } catch (printError) {
            console.error('❌ Lỗi khi in QR:', printError);
            reject({ success: false, message: 'Lỗi khi in QR: ' + printError.message });
          }
        });
      });

    } catch (error) {
      console.error('❌ Lỗi trong printPaymentQR:', error);
      return { success: false, message: 'Lỗi hệ thống: ' + (error instanceof Error ? error.message : String(error)) };
    }
  }

  /**
   * Tạo printer device
   */
  private createPrinterDevice(): any {
    if (this.printerConfig.type === 'usb') {
      return new escpos.USB();
    } else {
      return new escpos.Network(this.printerConfig.ip, this.printerConfig.port);
    }
  }

  /**
   * Cập nhật cấu hình máy in
   */
  updatePrinterConfig(config: Partial<PrinterConfig>): void {
    this.printerConfig.type = config.type ?? this.printerConfig.type;
    this.printerConfig.ip = config.ip ?? this.printerConfig.ip;
    this.printerConfig.port = config.port ?? this.printerConfig.port;
    
    console.log('✅ Đã cập nhật cấu hình máy in:', this.printerConfig);
  }

  /**
   * Cập nhật cấu hình VietQR
   */
  updateVietQRConfig(config: Partial<VietQRConfig>): void {
    this.vietQRConfig.acqId = config.acqId ?? this.vietQRConfig.acqId;
    this.vietQRConfig.accountNo = config.accountNo ?? this.vietQRConfig.accountNo;
    this.vietQRConfig.accountName = config.accountName ?? this.vietQRConfig.accountName;
    
    console.log('✅ Đã cập nhật cấu hình VietQR:', this.vietQRConfig);
  }
}
