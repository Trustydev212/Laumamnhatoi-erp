import { Injectable } from '@nestjs/common';
import { BankQRService } from './bank-qr.service';
import { TaxConfigService } from './tax-config.service';
import { ReceiptConfigService } from './receipt-config.service';

@Injectable()
export class HtmlReceiptService {
  constructor(
    private bankQRService: BankQRService,
    private taxConfigService: TaxConfigService,
    private receiptConfigService: ReceiptConfigService,
  ) {}

  // Tạo hóa đơn HTML với QR code thật
  async generateHtmlReceipt(orderId: string): Promise<string> {
    try {
      // Lấy cấu hình
      const config = await this.receiptConfigService.getConfig();
      const taxConfig = await this.taxConfigService.getTaxConfig();
      const bankConfig = this.bankQRService.getBankConfig();

      // Tạo order test nếu cần
      const order = orderId === 'test-order' ? this.createTestOrder() : await this.getOrderById(orderId);
      
      // Tính toán thuế
      const taxRate = Number(taxConfig.vatRate) || 0;
      const taxAmount = taxRate > 0 ? Number(order.subtotal) * (taxRate / 100) : 0;
      const finalTotal = taxRate > 0 ? Number(order.total) : Number(order.subtotal);

      // Tạo QR code URL
      const qrImageUrl = `https://img.vietqr.io/image/${bankConfig.bankId}-${bankConfig.accountNumber}-compact2.png?amount=${finalTotal}&addInfo=${encodeURIComponent(`Thanh toan hoa don ${order.orderNumber}`)}`;

      // Tạo HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Hóa đơn ${order.orderNumber}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 20px;
            max-width: 80mm;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 15px;
        }
        .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .subtitle {
            font-size: 14px;
            margin-bottom: 10px;
        }
        .separator {
            border-top: 2px solid #000;
            margin: 10px 0;
        }
        .info {
            margin-bottom: 15px;
        }
        .info-row {
            margin: 2px 0;
        }
        .items-table {
            width: 100%;
            margin-bottom: 15px;
        }
        .items-table th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 5px 0;
        }
        .items-table td {
            padding: 3px 0;
        }
        .items-table .name {
            width: 50%;
        }
        .items-table .qty {
            width: 15%;
            text-align: center;
        }
        .items-table .price {
            width: 20%;
            text-align: right;
        }
        .items-table .total {
            width: 15%;
            text-align: right;
        }
        .calculation {
            margin-bottom: 15px;
        }
        .total-row {
            font-weight: bold;
            font-size: 14px;
            border-top: 2px solid #000;
            padding-top: 5px;
            margin-top: 5px;
        }
        .qr-section {
            text-align: center;
            margin: 20px 0;
        }
        .qr-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .qr-image {
            margin: 10px 0;
        }
        .qr-image img {
            max-width: 150px;
            height: auto;
        }
        .bank-info {
            text-align: left;
            margin-top: 10px;
        }
        .bank-info div {
            margin: 2px 0;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
        }
        @media print {
            body { margin: 0; padding: 10px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="title">${config.header.title}</div>
        <div class="subtitle">${config.header.subtitle}</div>
        <div class="separator"></div>
        <div>${config.header.address}</div>
        <div>Tel: ${config.header.phone}</div>
        <div>Email: ${config.header.email}</div>
        <div>Web: ${config.header.website}</div>
        <div class="separator"></div>
    </div>

    <!-- Thông tin hóa đơn -->
    <div class="info">
        <div class="info-row">Hoa don: ${order.orderNumber}</div>
        <div class="info-row">Ban: ${order.table.name}</div>
        <div class="info-row">Ngay: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}</div>
        <div class="info-row">Gio: ${new Date(order.createdAt).toLocaleTimeString('vi-VN')}</div>
        <div class="info-row">Thu ngan: ${order.user?.username || 'admin'}</div>
        <div class="separator"></div>
    </div>

    <!-- Danh sách món ăn -->
    <table class="items-table">
        <thead>
            <tr>
                <th class="name">Ten</th>
                <th class="qty">SL</th>
                <th class="price">Gia</th>
                <th class="total">Tong</th>
            </tr>
        </thead>
        <tbody>
            ${order.orderItems.map((item: any) => {
              const itemTotal = Number(item.total) || (Number(item.menu.price || 0) * Number(item.quantity || 0));
              return `
                <tr>
                    <td class="name">${item.menu.name}</td>
                    <td class="qty">${item.quantity}</td>
                    <td class="price">${Number(item.menu.price || 0).toLocaleString('vi-VN')}</td>
                    <td class="total">${itemTotal.toLocaleString('vi-VN')}</td>
                </tr>
              `;
            }).join('')}
        </tbody>
    </table>

    <!-- Tính toán -->
    <div class="calculation">
        <div>Tam tinh: ${Number(order.subtotal).toLocaleString('vi-VN')} VND</div>
        ${taxRate > 0 && taxAmount > 0 ? `<div>Thue VAT (${taxRate}%): ${taxAmount.toLocaleString('vi-VN')} VND</div>` : ''}
        ${Number(order.discount) > 0 ? `<div>Giam gia: -${Number(order.discount).toLocaleString('vi-VN')} VND</div>` : ''}
        <div class="separator"></div>
        <div class="total-row">TONG CONG: ${finalTotal.toLocaleString('vi-VN')} VND</div>
    </div>

    <!-- QR Code Section -->
    <div class="qr-section">
        <div class="separator"></div>
        <div class="qr-title">QUET MA QR DE THANH TOAN</div>
        <div class="qr-image">
            <img src="${qrImageUrl}" alt="QR Code" />
        </div>
        <div>So tien: ${finalTotal.toLocaleString('vi-VN')} VND</div>
        <div class="bank-info">
            <div>Ngan hang: ${bankConfig.bankName}</div>
            <div>STK: ${bankConfig.accountNumber}</div>
            <div>Chu TK: ${bankConfig.accountName}</div>
            <div>Noi dung: ${order.orderNumber}</div>
        </div>
        <div class="separator"></div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <div>Cam on quy khach da su dung dich vu!</div>
        <div>Hen gap lai!</div>
        <div class="separator"></div>
    </div>

    <script>
        // Auto print khi load
        window.onload = function() {
            setTimeout(() => {
                window.print();
            }, 1000);
        }
    </script>
</body>
</html>`;

      return html;
    } catch (error) {
      console.error('Error generating HTML receipt:', error);
      throw error;
    }
  }

  // Tạo order test
  private createTestOrder() {
    return {
      id: 'test-order',
      orderNumber: '202510280025',
      subtotal: 130000,
      tax: 0,
      total: 130000,
      discount: 0,
      createdAt: new Date(),
      table: { name: 'Bàn 2' },
      user: { username: 'admin' },
      orderItems: [
        {
          quantity: 4,
          total: 20000,
          menu: { name: 'Trà Đá', price: 5000 }
        },
        {
          quantity: 2,
          total: 110000,
          menu: { name: 'Combo Phở + ...', price: 55000 }
        }
      ]
    };
  }

  // Lấy order từ database (placeholder)
  private async getOrderById(orderId: string) {
    // TODO: Implement database query
    return this.createTestOrder();
  }
}
