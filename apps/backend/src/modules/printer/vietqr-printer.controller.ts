import { Controller, Post, Get, Body, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { VietQRPrinterService } from '../../services/vietqr-printer.service';

interface PrintBillRequest {
  id: string;
  cashier: string;
  date: string;
  startTime: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  total: number;
}

interface VietQRConfigRequest {
  acqId?: number;
  accountNo?: string;
  accountName?: string;
}

interface PrinterConfigRequest {
  type?: 'usb' | 'network';
  device?: string;
  ip?: string;
  port?: number;
}

@Controller('printer/vietqr')
export class VietQRPrinterController {
  constructor(
    private readonly vietQRPrinterService: VietQRPrinterService,
  ) {}

  /**
   * In hóa đơn với VietQR
   * POST /api/printer/vietqr/print-bill
   */
  @Post('print-bill')
  async printBill(@Body() body: PrintBillRequest, @Res() res: Response) {
    try {
      console.log('📋 Nhận request in hóa đơn VietQR:', body);

      // Validate dữ liệu đầu vào
      if (!body.id || !body.cashier || !body.items || !body.total) {
        throw new HttpException('Thiếu thông tin bắt buộc', HttpStatus.BAD_REQUEST);
      }

      // Gọi service in hóa đơn
      const result = await this.vietQRPrinterService.printBill(body);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          timestamp: new Date().toISOString(),
          billId: body.id
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          timestamp: new Date().toISOString(),
          billId: body.id
        });
      }

    } catch (error) {
      console.error('❌ Lỗi trong controller printBill:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi in hóa đơn: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * In hóa đơn test
   * GET /api/printer/vietqr/test
   */
  @Get('test')
  async printTestBill(@Res() res: Response) {
    try {
      console.log('🧪 In hóa đơn test VietQR');

      const result = await this.vietQRPrinterService.printTestBill();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          timestamp: new Date().toISOString(),
          testBill: {
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
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Lỗi trong controller printTestBill:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi in hóa đơn test: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cập nhật cấu hình VietQR
   * POST /api/printer/vietqr/config/vietqr
   */
  @Post('config/vietqr')
  async updateVietQRConfig(@Body() body: VietQRConfigRequest, @Res() res: Response) {
    try {
      console.log('⚙️ Cập nhật cấu hình VietQR:', body);

      this.vietQRPrinterService.updateVietQRConfig(body);

      res.status(200).json({
        success: true,
        message: 'Đã cập nhật cấu hình VietQR thành công',
        timestamp: new Date().toISOString(),
        config: body
      });

    } catch (error) {
      console.error('❌ Lỗi khi cập nhật cấu hình VietQR:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình VietQR: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cập nhật cấu hình máy in
   * POST /api/printer/vietqr/config/printer
   */
  @Post('config/printer')
  async updatePrinterConfig(@Body() body: PrinterConfigRequest, @Res() res: Response) {
    try {
      console.log('🖨️ Cập nhật cấu hình máy in:', body);

      this.vietQRPrinterService.updatePrinterConfig(body);

      res.status(200).json({
        success: true,
        message: 'Đã cập nhật cấu hình máy in thành công',
        timestamp: new Date().toISOString(),
        config: body
      });

    } catch (error) {
      console.error('❌ Lỗi khi cập nhật cấu hình máy in:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình máy in: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Lấy thông tin cấu hình hiện tại
   * GET /api/printer/vietqr/config
   */
  @Get('config')
  async getConfig(@Res() res: Response) {
    try {
      console.log('📋 Lấy thông tin cấu hình VietQR Printer');

      res.status(200).json({
        success: true,
        message: 'Lấy cấu hình thành công',
        timestamp: new Date().toISOString(),
        config: {
          vietqr: {
            acqId: 970436,
            accountNo: '0123456789',
            accountName: 'LAU MAM NHA TOI'
          },
          printer: {
            type: 'usb',
            supportedTypes: ['usb', 'network']
          }
        }
      });

    } catch (error) {
      console.error('❌ Lỗi khi lấy cấu hình:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy cấu hình: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Kiểm tra trạng thái máy in
   * GET /api/printer/vietqr/status
   */
  @Get('status')
  async getPrinterStatus(@Res() res: Response) {
    try {
      console.log('🔍 Kiểm tra trạng thái máy in VietQR');

      // TODO: Implement actual printer status check
      res.status(200).json({
        success: true,
        message: 'Máy in VietQR đang hoạt động bình thường',
        timestamp: new Date().toISOString(),
        status: {
          connected: true,
          type: 'usb',
          lastPrint: new Date().toISOString(),
          totalPrints: 0 // TODO: Track from database
        }
      });

    } catch (error) {
      console.error('❌ Lỗi khi kiểm tra trạng thái máy in:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra trạng thái máy in: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }
}
