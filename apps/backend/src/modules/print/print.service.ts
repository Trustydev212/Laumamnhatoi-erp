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
      console.log('🧾 In hóa đơn thanh toán:', JSON.stringify(bill, null, 2));

      // Validate và đảm bảo items tồn tại
      if (!bill || !bill.items || !Array.isArray(bill.items) || bill.items.length === 0) {
        console.error('❌ Dữ liệu hóa đơn không hợp lệ:', {
          hasBill: !!bill,
          hasItems: !!(bill && bill.items),
          isArray: bill?.items ? Array.isArray(bill.items) : false,
          itemsLength: bill?.items?.length || 0
        });
        return { 
          success: false, 
          message: 'Dữ liệu hóa đơn không hợp lệ: items phải là mảng và có ít nhất 1 món' 
        };
      }
      
      console.log('✅ Items hợp lệ:', bill.items.length, 'món');

      // Tính tổng tiền từ items - handle cả string và number
      const subtotal = bill.items.reduce((sum: number, item: any) => {
        // Convert price và qty sang number (handle cả string "12000" và number 12000)
        const price = typeof item.price === 'string' 
          ? parseFloat(item.price.replace(/[^\d.-]/g, '')) || 0
          : Number(item.price) || 0;
        const qty = typeof item.qty === 'string'
          ? parseInt(item.qty, 10) || 0
          : Number(item.qty) || 0;
        return sum + (price * qty);
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

      // Try to create printer device - handle errors if printer not found
      let device: any;
      let printer: any;
      
      try {
        device = this.createPrinterDevice();
        printer = new escpos.Printer(device);
      } catch (deviceError: any) {
        console.error('❌ Lỗi tạo device máy in:', deviceError);
        // On VPS/production, printer might not be available
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction || deviceError?.message?.includes('Can not find printer') || deviceError?.message?.includes('printer')) {
          console.warn('⚠️  Máy in không khả dụng trên server. Trả về thành công nhưng không thực sự in.');
          return {
            success: true,
            message: 'Hóa đơn đã được xử lý (máy in không khả dụng trên server). Vui lòng in từ client nếu cần.'
          };
        }
        throw deviceError;
      }

      return new Promise((resolve, reject) => {
        device.open((error: any) => {
          if (error) {
            console.error('❌ Lỗi kết nối máy in:', error);
            // On VPS/production, printer might not be available - return success with warning
            const isProduction = process.env.NODE_ENV === 'production';
            const errorMessage = error?.message || String(error);
            if (isProduction || 
                errorMessage.includes('Can not find printer') || 
                errorMessage.includes('printer') ||
                errorMessage.includes('ENOENT') ||
                errorMessage.includes('device')) {
              console.warn('⚠️  Máy in không khả dụng trên server. Trả về thành công nhưng không thực sự in.');
              resolve({ 
                success: true, 
                message: 'Hóa đơn đã được xử lý (máy in không khả dụng trên server). Vui lòng in từ client nếu cần.' 
              });
              return;
            }
            reject({ success: false, message: 'Không thể kết nối máy in: ' + errorMessage });
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
              // Convert price và qty sang number để tính toán
              const price = typeof item.price === 'string' 
                ? parseFloat(item.price.replace(/[^\d.-]/g, '')) || 0
                : Number(item.price) || 0;
              const qty = typeof item.qty === 'string'
                ? parseInt(item.qty, 10) || 0
                : Number(item.qty) || 0;
              const itemTotal = price * qty;
              const itemName = item.name || 'Món ăn';
              printer.text(
                `${(i + 1).toString().padEnd(3)} ${itemName.padEnd(18)} ${qty.toString().padEnd(3)} ${itemTotal.toLocaleString().padStart(8)}`
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

          } catch (printError: any) {
            console.error('❌ Lỗi khi in:', printError);
            const errorMessage = printError?.message || String(printError);
            
            // If printer error in production, return success with warning
            const isProduction = process.env.NODE_ENV === 'production';
            if (isProduction || 
                errorMessage.includes('Can not find printer') || 
                errorMessage.includes('printer') ||
                errorMessage.includes('ENOENT') ||
                errorMessage.includes('device')) {
              console.warn('⚠️  Máy in không khả dụng khi in. Trả về thành công.');
              resolve({
                success: true,
                message: 'Hóa đơn đã được xử lý (máy in không khả dụng trên server). Vui lòng in từ client nếu cần.'
              });
              return;
            }
            
            reject({ success: false, message: 'Lỗi khi in hóa đơn: ' + errorMessage });
          }
        });
      });

    } catch (error: any) {
      console.error('❌ Lỗi trong printBill:', error);
      const errorMessage = error?.message || String(error);
      
      // If printer-related error in production, return success with warning
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction || 
          errorMessage.includes('Can not find printer') || 
          errorMessage.includes('printer') ||
          errorMessage.includes('ENOENT') ||
          errorMessage.includes('device')) {
        console.warn('⚠️  Máy in không khả dụng. Trả về thành công.');
        return {
          success: true,
          message: 'Hóa đơn đã được xử lý (máy in không khả dụng trên server). Vui lòng in từ client nếu cần.'
        };
      }
      
      return { success: false, message: 'Lỗi hệ thống: ' + errorMessage };
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
      let qrBuffer: Buffer;
      try {
        const res = await axios.get(qrUrl, { responseType: 'arraybuffer', timeout: 10000 });
        qrBuffer = Buffer.from(res.data, 'binary');
      } catch (axiosError: any) {
        console.error('❌ Lỗi tải QR image từ VietQR:', axiosError);
        return {
          success: false,
          message: 'Không thể tải QR code từ VietQR API: ' + (axiosError?.message || String(axiosError))
        };
      }

      // Try to create printer device - handle errors if printer not found
      let device: any;
      let printer: any;
      
      try {
        device = this.createPrinterDevice();
        printer = new escpos.Printer(device);
      } catch (deviceError: any) {
        console.error('❌ Lỗi tạo device máy in:', deviceError);
        // On VPS/production, printer might not be available
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction || deviceError?.message?.includes('Can not find printer') || deviceError?.message?.includes('printer')) {
          console.warn('⚠️  Máy in không khả dụng trên server. Trả về thành công nhưng không thực sự in.');
          return {
            success: true,
            message: 'QR thanh toán đã được xử lý (máy in không khả dụng trên server). Vui lòng in từ client nếu cần.'
          };
        }
        throw deviceError;
      }

      return new Promise((resolve, reject) => {
        device.open((error: any) => {
          if (error) {
            console.error('❌ Lỗi kết nối máy in:', error);
            // On VPS/production, printer might not be available - return success with warning
            const isProduction = process.env.NODE_ENV === 'production';
            const errorMessage = error?.message || String(error);
            if (isProduction || 
                errorMessage.includes('Can not find printer') || 
                errorMessage.includes('printer') ||
                errorMessage.includes('ENOENT') ||
                errorMessage.includes('device')) {
              console.warn('⚠️  Máy in không khả dụng trên server. Trả về thành công nhưng không thực sự in.');
              resolve({ 
                success: true, 
                message: 'QR thanh toán đã được xử lý (máy in không khả dụng trên server). Vui lòng in từ client nếu cần.' 
              });
              return;
            }
            reject({ success: false, message: 'Không thể kết nối máy in: ' + errorMessage });
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
          } catch (printError: any) {
            console.error('❌ Lỗi khi in QR:', printError);
            const errorMessage = printError?.message || String(printError);
            
            // If printer error in production, return success with warning
            const isProduction = process.env.NODE_ENV === 'production';
            if (isProduction || 
                errorMessage.includes('Can not find printer') || 
                errorMessage.includes('printer') ||
                errorMessage.includes('ENOENT') ||
                errorMessage.includes('device')) {
              console.warn('⚠️  Máy in không khả dụng khi in QR. Trả về thành công.');
              resolve({
                success: true,
                message: 'QR thanh toán đã được xử lý (máy in không khả dụng trên server). Vui lòng in từ client nếu cần.'
              });
              return;
            }
            
            reject({ success: false, message: 'Lỗi khi in QR: ' + errorMessage });
          }
        });
      });

    } catch (error: any) {
      console.error('❌ Lỗi trong printPaymentQR:', error);
      const errorMessage = error?.message || String(error);
      
      // If printer-related error in production, return success with warning
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction || 
          errorMessage.includes('Can not find printer') || 
          errorMessage.includes('printer') ||
          errorMessage.includes('ENOENT') ||
          errorMessage.includes('device')) {
        console.warn('⚠️  Máy in không khả dụng. Trả về thành công.');
        return {
          success: true,
          message: 'QR thanh toán đã được xử lý (máy in không khả dụng trên server). Vui lòng in từ client nếu cần.'
        };
      }
      
      return { success: false, message: 'Lỗi hệ thống: ' + errorMessage };
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
   * Lấy cấu hình VietQR hiện tại
   */
  getVietQRConfig(): VietQRConfig {
    return { ...this.vietQRConfig };
  }

  /**
   * Cập nhật cấu hình VietQR (và lưu vào file nếu cần)
   */
  async updateVietQRConfig(config: Partial<VietQRConfig>): Promise<void> {
    this.vietQRConfig.acqId = config.acqId ?? this.vietQRConfig.acqId;
    this.vietQRConfig.accountNo = config.accountNo ?? this.vietQRConfig.accountNo;
    this.vietQRConfig.accountName = config.accountName ?? this.vietQRConfig.accountName;
    
    // TODO: Có thể lưu vào file nếu cần persist
    console.log('✅ Đã cập nhật cấu hình VietQR:', this.vietQRConfig);
  }
}
