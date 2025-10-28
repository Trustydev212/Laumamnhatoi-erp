import { Controller, Post, Body, Res, Param, Get } from '@nestjs/common';
import { Response } from 'express';
import { XprinterReceiptService } from '../../services/xprinter-receipt.service';

@Controller('printer/xprinter')
export class XprinterReceiptController {
  constructor(private xprinterReceiptService: XprinterReceiptService) {}

  // In hóa đơn trực tiếp lên máy Xprinter T80L
  @Post('print/:orderId')
  async printReceipt(
    @Param('orderId') orderId: string,
    @Body() body: { printerIP?: string; printerPort?: number },
    @Res() res: Response
  ) {
    try {
      const result = await this.xprinterReceiptService.printReceipt(orderId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      console.error('Print receipt error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error printing receipt: ' + error.message 
      });
    }
  }

  // Tạo file hóa đơn để in thủ công
  @Post('generate/:orderId')
  async generateReceiptFile(
    @Param('orderId') orderId: string,
    @Res() res: Response
  ) {
    try {
      const filePath = await this.xprinterReceiptService.generateReceiptFile(orderId);
      
      res.json({ 
        success: true, 
        filePath: filePath,
        message: 'Receipt file generated successfully' 
      });
    } catch (error) {
      console.error('Generate receipt file error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error generating receipt file: ' + error.message 
      });
    }
  }

  // Lấy nội dung hóa đơn để xem trước
  @Get('content/:orderId')
  async getReceiptContent(
    @Param('orderId') orderId: string,
    @Res() res: Response
  ) {
    try {
      const receiptContent = await this.xprinterReceiptService.generateReceipt(orderId);
      
      res.set({
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Length': receiptContent.length
      });
      
      res.send(receiptContent);
    } catch (error) {
      console.error('Get receipt content error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting receipt content: ' + error.message 
      });
    }
  }

  // Lấy thông tin kích thước hóa đơn
  @Get('size-info/:orderId')
  async getReceiptSizeInfo(
    @Param('orderId') orderId: string,
    @Res() res: Response
  ) {
    try {
      const sizeInfo = await this.xprinterReceiptService.getReceiptSizeInfo(orderId);
      
      res.json(sizeInfo);
    } catch (error) {
      console.error('Get receipt size info error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting receipt size info: ' + error.message 
      });
    }
  }

  // Helper method để xác định loại hóa đơn
  private getReceiptType(length: number): string {
    if (length <= 100) return 'Hóa đơn ngắn (≤100mm)';
    if (length <= 150) return 'Hóa đơn trung bình (100-150mm)';
    if (length <= 200) return 'Hóa đơn dài (150-200mm)';
    return 'Hóa đơn rất dài (>200mm)';
  }
}
