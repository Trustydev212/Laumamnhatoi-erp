import { Controller, Post, Get, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrintService } from './print.service';
import { TaxConfigService } from '../../services/tax-config.service';

interface PrintBillRequest {
  id: string;
  table?: string;
  time: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
  }>;
  // Backend sẽ tự tính subtotal, thuế và total từ items theo cấu hình thuế
}

interface PrintQRRequest {
  amount: number;
  billId: string;
}

@Controller('print')
export class PrintController {
  constructor(
    private readonly printService: PrintService,
    private readonly taxConfigService: TaxConfigService
  ) {}

  /**
   * In hóa đơn thanh toán (không QR)
   * POST /api/print/print-bill
   */
  @Post('print-bill')
  async printBill(@Body() body: PrintBillRequest, @Res() res: Response) {
    try {
      console.log('📋 Nhận request in hóa đơn:', body);

      // Validate dữ liệu đầu vào
      if (!body.id || !body.time || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin bắt buộc: id, time, và items (phải có ít nhất 1 món)',
          timestamp: new Date().toISOString()
        });
      }

      // Gọi service in hóa đơn
      const result = await this.printService.printBill(body);

      // Always return 200 if service processed (even if printer not available)
      // Service will return success=true with warning message if printer unavailable
      res.status(200).json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
        billId: body.id,
        printed: result.success && !result.message.includes('không khả dụng')
      });

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
   * In QR thanh toán từ URL (download và in trực tiếp qua ESC/POS)
   * POST /api/print/print-qr-from-url
   */
  @Post('print-qr-from-url')
  async printQRFromURL(@Body() body: { qrUrl: string; amount: number; billId: string }, @Res() res: Response) {
    try {
      console.log('💳 Nhận request in QR từ URL:', body);

      // Validate dữ liệu đầu vào
      if (!body.qrUrl || !body.amount || !body.billId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin: qrUrl, amount hoặc billId',
          timestamp: new Date().toISOString()
        });
      }

      // Gọi service in QR từ URL
      const result = await this.printService.printQRFromURL(body);

      // Always return 200 if service processed (even if printer not available)
      res.status(200).json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
        billId: body.billId,
        amount: body.amount,
        printed: result.success && !result.message.includes('không khả dụng')
      });

    } catch (error) {
      console.error('❌ Lỗi trong controller printQRFromURL:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi in QR: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * In QR thanh toán riêng (VietQR động) - DEPRECATED: Dùng print-qr-from-url thay thế
   * POST /api/print/print-qr
   */
  @Post('print-qr')
  async printQR(@Body() body: PrintQRRequest, @Res() res: Response) {
    try {
      console.log('💳 Nhận request in QR:', body);

      // Validate dữ liệu đầu vào
      if (!body.amount || !body.billId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin amount hoặc billId',
          timestamp: new Date().toISOString()
        });
      }

      // Gọi service in QR
      const result = await this.printService.printPaymentQR(body);

      // Always return 200 if service processed (even if printer not available)
      // Service will return success=true with warning message if printer unavailable
      res.status(200).json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
        billId: body.billId,
        amount: body.amount,
        printed: result.success && !result.message.includes('không khả dụng')
      });

    } catch (error) {
      console.error('❌ Lỗi trong controller printQR:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi server khi in QR: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test in hóa đơn mẫu
   * POST /api/print/test-bill
   */
  @Post('test-bill')
  async testBill(@Res() res: Response) {
    try {
      const testBill = {
        id: 'HD20251029-001',
        table: 'Bàn 1',
        time: new Date().toLocaleTimeString('vi-VN'),
        items: [
          { name: 'Cà phê sữa', qty: 1, price: 20000 },
          { name: 'Bánh mì thịt', qty: 2, price: 15000 },
          { name: 'Nước ngọt', qty: 1, price: 10000 }
        ]
        // Backend sẽ tự tính thuế từ cấu hình
      };

      const result = await this.printService.printBill(testBill);

      res.status(200).json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
        testBill
      });

    } catch (error) {
      console.error('❌ Lỗi trong testBill:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi test in hóa đơn: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test in QR mẫu
   * POST /api/print/test-qr
   */
  @Post('test-qr')
  async testQR(@Res() res: Response) {
    try {
      const testQR = {
        amount: 50000,
        billId: 'HD20251029-001'
      };

      const result = await this.printService.printPaymentQR(testQR);

      res.status(200).json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
        testQR
      });

    } catch (error) {
      console.error('❌ Lỗi trong testQR:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi test in QR: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Lấy cấu hình thuế hiện tại
   * GET /api/print/tax-config
   */
  @Get('tax-config')
  async getTaxConfig(@Res() res: Response) {
    try {
      const taxConfig = await this.taxConfigService.getTaxConfig();
      
      res.status(200).json({
        success: true,
        taxConfig,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Lỗi trong getTaxConfig:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy cấu hình thuế: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cập nhật cấu hình thuế
   * POST /api/print/tax-config
   */
  @Post('tax-config')
  async updateTaxConfig(@Body() body: any, @Res() res: Response) {
    try {
      console.log('📝 Nhận request cập nhật cấu hình thuế:', body);

      const updatedConfig = await this.taxConfigService.updateTaxConfig(body);

      res.status(200).json({
        success: true,
        message: 'Cấu hình thuế đã được cập nhật thành công!',
        taxConfig: updatedConfig,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Lỗi trong updateTaxConfig:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình thuế: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Lấy cấu hình VietQR
   * GET /api/print/vietqr-config
   */
  @Get('vietqr-config')
  async getVietQRConfig(@Res() res: Response) {
    try {
      const config = await this.printService.getVietQRConfig();
      
      res.status(200).json({
        success: true,
        vietQRConfig: config,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Lỗi trong getVietQRConfig:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy cấu hình VietQR: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Cập nhật cấu hình VietQR
   * POST /api/print/vietqr-config
   */
  @Post('vietqr-config')
  async updateVietQRConfig(@Body() body: any, @Res() res: Response) {
    try {
      console.log('📝 Nhận request cập nhật cấu hình VietQR:', body);

      await this.printService.updateVietQRConfig(body);

      res.status(200).json({
        success: true,
        message: 'Cấu hình VietQR đã được cập nhật thành công!',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Lỗi trong updateVietQRConfig:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật cấu hình VietQR: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Tính thuế và trả về cho frontend hiển thị
   * POST /api/print/calculate-tax
   */
  @Post('calculate-tax')
  async calculateTax(@Body() body: { subtotal: number }, @Res() res: Response) {
    try {
      console.log('💰 Tính thuế cho subtotal:', body.subtotal);

      if (!body.subtotal || body.subtotal < 0) {
        return res.status(400).json({
          success: false,
          message: 'Subtotal phải là số dương',
          timestamp: new Date().toISOString()
        });
      }

      // Tính thuế từ TaxConfigService
      const taxConfig = await this.taxConfigService.getTaxConfig();
      const taxCalculation = await this.taxConfigService.calculateTax(body.subtotal);

      res.status(200).json({
        success: true,
        taxCalculation: {
          subtotal: taxCalculation.subtotal,
          vatAmount: taxCalculation.vatAmount,
          serviceChargeAmount: taxCalculation.serviceChargeAmount,
          total: taxCalculation.total,
          vatRate: taxCalculation.vatRate,
          serviceChargeRate: taxCalculation.serviceChargeRate,
          vatEnabled: taxCalculation.vatEnabled,
          serviceChargeEnabled: taxCalculation.serviceChargeEnabled,
          taxName: taxConfig.taxName || 'VAT',
          serviceChargeName: taxConfig.serviceChargeName || 'Phí phục vụ'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Lỗi trong calculateTax:', error);
      
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tính thuế: ' + (error instanceof Error ? error.message : String(error)),
        timestamp: new Date().toISOString()
      });
    }
  }
}
