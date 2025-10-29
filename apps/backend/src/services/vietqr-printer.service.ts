import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ReceiptConfigService } from './receipt-config.service';
import { TaxConfigService } from './tax-config.service';
import axios from 'axios';
import * as escpos from 'escpos';
import * as escposUSB from 'escpos-usb';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

// Cấu hình VietQR Bank
interface VietQRConfig {
  acqId: number; // Mã ngân hàng (970436 = Vietcombank)
  accountNo: string;
  accountName: string;
}

// Cấu hình máy in
interface PrinterConfig {
  type: 'usb' | 'network';
  device?: string; // USB device path
  ip?: string; // IP address for network printer
  port?: number; // Port for network printer
}

@Injectable()
export class VietQRPrinterService {
  private readonly vietQRConfig: VietQRConfig = {
    acqId: 970436, // Vietcombank
    accountNo: '0123456789', // Số tài khoản thực tế
    accountName: 'LAU MAM NHA TOI' // Tên tài khoản
  };

  private readonly printerConfig: PrinterConfig = {
    type: 'usb', // hoặc 'network'
    // device: '/dev/usb/lp0', // Linux USB path
    // ip: '192.168.1.100', // IP máy in LAN
    // port: 9100
  };

  constructor(
    private prisma: PrismaService,
    private receiptConfigService: ReceiptConfigService,
    private taxConfigService: TaxConfigService,
  ) {
    // Cấu hình escpos-usb
    escpos.USB = escposUSB;
  }

  /**
   * In hóa đơn với VietQR qua Xprinter T80L
   */
  async printBill(billData: any): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🖨️ Bắt đầu in hóa đơn VietQR:', billData);

      // 1. Lấy cấu hình hóa đơn và thuế
      const receiptConfig = await this.receiptConfigService.getConfig();
      const taxConfig = await this.taxConfigService.getTaxConfig();

      // 2. Tạo mã QR VietQR động
      const qrBuffer = await this.generateVietQRImage(billData);

      // 3. Tạo và gửi lệnh ESC/POS
      const escposCommands = await this.generateEscposCommands(billData, receiptConfig, taxConfig, qrBuffer);

      // 4. In qua máy Xprinter
      await this.sendToPrinter(escposCommands);

      return {
        success: true,
        message: 'Hóa đơn đã được in thành công với VietQR!'
      };

    } catch (error) {
      console.error('❌ Lỗi khi in hóa đơn VietQR:', error);
      return {
        success: false,
        message: 'Lỗi khi in hóa đơn: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }

  /**
   * Tạo mã QR VietQR động từ API
   */
  private async generateVietQRImage(billData: any): Promise<Buffer> {
    try {
      const amount = Number(billData.total);
      const addInfo = `HD${billData.id}`;

      // Tạo URL VietQR API
      const qrUrl = `https://img.vietqr.io/image/${this.vietQRConfig.acqId}-${this.vietQRConfig.accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(this.vietQRConfig.accountName)}`;

      console.log('🔗 VietQR URL:', qrUrl);

      // Tải ảnh QR từ API
      const response = await axios.get(qrUrl, { 
        responseType: 'arraybuffer',
        timeout: 10000 // 10 giây timeout
      });

      const qrBuffer = Buffer.from(response.data, 'binary');
      console.log('✅ Đã tải QR VietQR thành công, kích thước:', qrBuffer.length, 'bytes');

      return qrBuffer;

    } catch (error) {
      console.error('❌ Lỗi khi tạo QR VietQR:', error);
      throw new Error('Không thể tạo mã QR VietQR: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Tạo lệnh ESC/POS cho máy Xprinter T80L
   */
  private async generateEscposCommands(billData: any, receiptConfig: any, taxConfig: any, qrBuffer: Buffer): Promise<Buffer> {
    try {
      // Khởi tạo printer
      const device = this.printerConfig.type === 'usb' 
        ? new escpos.USB() 
        : new escpos.Network(this.printerConfig.ip, this.printerConfig.port);

      const printer = new escpos.Printer(device);

      // Tạo buffer ESC/POS
      let commands = Buffer.from([]);

      // ==== HEADER ====
      commands = Buffer.concat([
        commands,
        Buffer.from('\x1B\x40'), // Initialize printer
        Buffer.from('\x1B\x61\x01'), // Center align
        Buffer.from('\x1B\x45\x01'), // Bold on
        Buffer.from('\x1B\x21\x30'), // Double size
        Buffer.from('LẨU MẮM NHÀ TÔI\n'),
        Buffer.from('\x1B\x21\x00'), // Normal size
        Buffer.from('HÓA ĐƠN THANH TOÁN\n'),
        Buffer.from('\x1B\x45\x00'), // Bold off
        Buffer.from(`Mã HĐ: ${billData.id}\n`),
        Buffer.from(`Thu ngân: ${billData.cashier}\n`),
        Buffer.from(`Giờ vào: ${billData.startTime} - Ngày: ${billData.date}\n`),
        Buffer.from('--------------------------------\n')
      ]);

      // ==== DANH SÁCH MÓN ====
      commands = Buffer.concat([
        commands,
        Buffer.from('\x1B\x61\x00'), // Left align
        Buffer.from('\x1B\x45\x01'), // Bold on
        Buffer.from('STT  Tên món             SL   Thành tiền\n'),
        Buffer.from('\x1B\x45\x00') // Bold off
      ]);

      // Thêm từng món ăn
      billData.items.forEach((item: any, index: number) => {
        const stt = (index + 1).toString().padEnd(3);
        const name = item.name.padEnd(18);
        const qty = item.qty.toString().padEnd(3);
        const price = item.price.toLocaleString().padStart(8);
        
        commands = Buffer.concat([
          commands,
          Buffer.from(`${stt} ${name} ${qty} ${price}\n`)
        ]);
      });

      // ==== TỔNG TIỀN ====
      commands = Buffer.concat([
        commands,
        Buffer.from('--------------------------------\n'),
        Buffer.from('\x1B\x61\x02'), // Right align
        Buffer.from('\x1B\x45\x01'), // Bold on
        Buffer.from(`Tổng cộng: ${billData.total.toLocaleString()} đ\n`),
        Buffer.from('\x1B\x45\x00'), // Bold off
        Buffer.from('\x1B\x61\x00'), // Left align
        Buffer.from('+ Thanh toán qua VietQR\n'),
        Buffer.from('\n')
      ]);

      // ==== QR CODE ====
      const qrBitmap = await this.convertPNGToEscposBitmap(qrBuffer);
      commands = Buffer.concat([
        commands,
        Buffer.from('\x1B\x61\x01'), // Center align
        qrBitmap, // ESC/POS bitmap
        Buffer.from('\n')
      ]);

      // ==== FOOTER ====
      commands = Buffer.concat([
        commands,
        Buffer.from('LẨU MẮM NHÀ TÔI\n'),
        Buffer.from('699 Phạm Hữu Lầu, Cao Lãnh, Đồng Tháp\n'),
        Buffer.from('Cảm ơn Quý khách!\n'),
        Buffer.from('\n\n'),
        Buffer.from('\x1D\x56\x00'), // Full cut
        Buffer.from('\x0A\x0A\x0A') // Feed paper
      ]);

      console.log('✅ Đã tạo lệnh ESC/POS thành công, kích thước:', commands.length, 'bytes');
      return commands;

    } catch (error) {
      console.error('❌ Lỗi khi tạo lệnh ESC/POS:', error);
      throw new Error('Không thể tạo lệnh ESC/POS: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Convert PNG buffer thành ESC/POS bitmap
   */
  private async convertPNGToEscposBitmap(pngBuffer: Buffer): Promise<Buffer> {
    try {
      console.log('🖼️ Converting PNG to ESC/POS bitmap...');
      
      // Sử dụng Sharp để resize và convert PNG thành bitmap
      const resizedImage = await sharp(pngBuffer)
        .resize(200, 200, { // Resize QR code về kích thước phù hợp
          fit: 'inside',
          withoutEnlargement: true
        })
        .grayscale() // Convert thành grayscale
        .threshold(128) // Threshold để tạo bitmap đen trắng
        .raw() // Lấy raw data
        .toBuffer();

      // Convert raw data thành ESC/POS bitmap commands
      const escposBitmap = this.rawToEscposBitmap(resizedImage, 200, 200);
      
      console.log('✅ Đã convert PNG thành ESC/POS bitmap thành công');
      return escposBitmap;

    } catch (error) {
      console.error('❌ Lỗi khi convert PNG:', error);
      return Buffer.from('');
    }
  }

  /**
   * Convert raw bitmap data thành ESC/POS bitmap commands
   */
  private rawToEscposBitmap(rawData: Buffer, width: number, height: number): Buffer {
    try {
      // ESC/POS bitmap command: GS v 0 m xL xH yL yH d1...dk
      // m = 0 (normal mode), xL xH = width, yL yH = height
      
      const widthBytes = Math.ceil(width / 8); // Convert width to bytes
      const heightBytes = height;
      
      // ESC/POS header
      let bitmapCommand = Buffer.from([
        0x1D, 0x76, 0x30, 0x00, // GS v 0 m
        widthBytes & 0xFF, (widthBytes >> 8) & 0xFF, // xL xH
        heightBytes & 0xFF, (heightBytes >> 8) & 0xFF  // yL yH
      ]);

      // Convert raw data thành bitmap data
      const bitmapData = Buffer.alloc(widthBytes * heightBytes);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < widthBytes; x++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const pixelX = x * 8 + bit;
            if (pixelX < width) {
              const pixelIndex = y * width + pixelX;
              if (pixelIndex < rawData.length && rawData[pixelIndex] > 128) {
                byte |= (0x80 >> bit); // Set bit to 1 for white pixels
              }
            }
          }
          bitmapData[y * widthBytes + x] = byte;
        }
      }

      return Buffer.concat([bitmapCommand, bitmapData]);

    } catch (error) {
      console.error('❌ Lỗi khi convert raw bitmap:', error);
      return Buffer.from('');
    }
  }

  /**
   * Gửi lệnh ESC/POS tới máy in
   */
  private async sendToPrinter(commands: Buffer): Promise<void> {
    try {
      console.log('📤 Gửi lệnh tới máy in Xprinter...');

      if (this.printerConfig.type === 'usb') {
        // In qua USB
        const device = new escpos.USB();
        
        device.open((error: any) => {
          if (error) {
            console.error('❌ Lỗi kết nối USB:', error);
            throw new Error('Không thể kết nối máy in USB: ' + error.message);
          }

          const printer = new escpos.Printer(device);
          printer.raw(commands);
          printer.close();
          
          console.log('✅ Đã gửi lệnh in qua USB thành công');
        });

      } else {
        // In qua LAN
        const device = new escpos.Network(this.printerConfig.ip, this.printerConfig.port);
        
        device.open((error: any) => {
          if (error) {
            console.error('❌ Lỗi kết nối LAN:', error);
            throw new Error('Không thể kết nối máy in LAN: ' + error.message);
          }

          const printer = new escpos.Printer(device);
          printer.raw(commands);
          printer.close();
          
          console.log('✅ Đã gửi lệnh in qua LAN thành công');
        });
      }

    } catch (error) {
      console.error('❌ Lỗi khi gửi tới máy in:', error);
      throw new Error('Không thể gửi lệnh tới máy in: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Test in hóa đơn mẫu
   */
  async printTestBill(): Promise<{ success: boolean; message: string }> {
    const testBill = {
      id: 'HD20251029-001',
      cashier: 'Triết',
      date: '29/10/2025',
      startTime: '13:30',
      items: [
        { name: 'Cà phê sữa', qty: 1, price: 20000 },
        { name: 'Bánh mì thịt', qty: 2, price: 15000 },
        { name: 'Nước ngọt', qty: 1, price: 10000 }
      ],
      total: 60000
    };

    return await this.printBill(testBill);
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

  /**
   * Cập nhật cấu hình máy in
   */
  updatePrinterConfig(config: Partial<PrinterConfig>): void {
    this.printerConfig.type = config.type ?? this.printerConfig.type;
    this.printerConfig.device = config.device ?? this.printerConfig.device;
    this.printerConfig.ip = config.ip ?? this.printerConfig.ip;
    this.printerConfig.port = config.port ?? this.printerConfig.port;
    
    console.log('✅ Đã cập nhật cấu hình máy in:', this.printerConfig);
  }
}
