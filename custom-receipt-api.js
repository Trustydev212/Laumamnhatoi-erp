// API endpoint để tùy chỉnh hóa đơn với QR code
// Usage: node custom-receipt-api.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.json());

// Cấu hình hóa đơn mặc định
let RECEIPT_CONFIG = {
  store: {
    name: 'NHÀ TÔI ERP',
    subtitle: 'Hệ thống quản lý quán ăn',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    phone: '0123 456 789',
    email: 'info@nhatoi.com',
    website: 'www.nhatoi.com',
    taxCode: '0123456789'
  },
  printer: {
    width: 48,
    encoding: 'cp1252'
  },
  qrCode: {
    enabled: true,
    size: 200,
    margin: 2
  },
  footer: {
    showQR: true,
    showWebsite: true,
    showTaxCode: true,
    showThankYou: true,
    customMessage: 'Cảm ơn quý khách đã sử dụng dịch vụ!'
  }
};

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

const ESC_POS = {
  RESET: ESC + '@',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  FONT_A: ESC + 'M' + '\x00',
  FONT_B: ESC + 'M' + '\x01',
  CUT_PAPER: GS + 'V' + '\x00',
  FEED_PAPER: LF + LF + LF,
};

// Tạo QR code
async function generateQRCode(orderData) {
  try {
    const qrData = {
      orderNumber: orderData.orderNumber,
      date: new Date().toISOString(),
      total: orderData.total,
      store: RECEIPT_CONFIG.store.name,
      website: RECEIPT_CONFIG.store.website
    };
    
    const qrString = JSON.stringify(qrData);
    const qrCode = await QRCode.toString(qrString, {
      type: 'svg',
      width: RECEIPT_CONFIG.qrCode.size,
      margin: RECEIPT_CONFIG.qrCode.margin
    });
    
    return qrCode;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
}

// Tạo hóa đơn tùy chỉnh
async function generateCustomReceipt(orderData, customConfig = {}) {
  const config = { ...RECEIPT_CONFIG, ...customConfig };
  let receipt = '';
  
  // Reset printer
  receipt += ESC_POS.RESET;
  
  // Header - Store info
  receipt += ESC_POS.ALIGN_CENTER;
  receipt += ESC_POS.BOLD_ON;
  receipt += ESC_POS.FONT_B;
  receipt += `${config.store.name}\n`;
  receipt += `${config.store.subtitle}\n`;
  receipt += '========================\n';
  
  // Store details
  receipt += ESC_POS.BOLD_OFF;
  receipt += ESC_POS.FONT_A;
  if (config.store.address) {
    receipt += `${config.store.address}\n`;
  }
  if (config.store.phone) {
    receipt += `ĐT: ${config.store.phone}\n`;
  }
  if (config.store.email) {
    receipt += `Email: ${config.store.email}\n`;
  }
  if (config.store.website) {
    receipt += `Web: ${config.store.website}\n`;
  }
  if (config.store.taxCode) {
    receipt += `MST: ${config.store.taxCode}\n`;
  }
  receipt += '========================\n';
  
  // Order info
  receipt += ESC_POS.ALIGN_LEFT;
  receipt += `Hóa đơn: ${orderData.orderNumber}\n`;
  receipt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
  receipt += `Bàn: ${orderData.tableName}\n`;
  receipt += `Thu ngân: ${orderData.cashierName}\n`;
  receipt += '------------------------\n';
  
  // Items
  receipt += 'MÓN ĂN                    SL   GIÁ\n';
  receipt += '------------------------\n';
  
  orderData.items.forEach(item => {
    const name = item.name.substring(0, 20).padEnd(20);
    const qty = item.quantity.toString().padStart(2);
    const price = item.price.toLocaleString('vi-VN').padStart(8);
    receipt += `${name} ${qty} ${price}\n`;
  });
  
  // Totals
  receipt += '------------------------\n';
  receipt += `Tạm tính: ${orderData.subtotal.toLocaleString('vi-VN')} VNĐ\n`;
  if (orderData.tax > 0) {
    receipt += `Thuế VAT: ${orderData.tax.toLocaleString('vi-VN')} VNĐ\n`;
  }
  if (orderData.discount > 0) {
    receipt += `Giảm giá: -${orderData.discount.toLocaleString('vi-VN')} VNĐ\n`;
  }
  receipt += '------------------------\n';
  receipt += ESC_POS.BOLD_ON;
  receipt += `TỔNG CỘNG: ${orderData.total.toLocaleString('vi-VN')} VNĐ\n`;
  receipt += ESC_POS.BOLD_OFF;
  
  // Payment info
  if (orderData.paymentMethod) {
    receipt += `Thanh toán: ${orderData.paymentMethod}\n`;
  }
  if (orderData.customerName) {
    receipt += `Khách hàng: ${orderData.customerName}\n`;
  }
  
  // Footer
  receipt += ESC_POS.ALIGN_CENTER;
  if (config.footer.showThankYou) {
    receipt += 'Cảm ơn quý khách!\n';
  }
  if (config.footer.customMessage) {
    receipt += `${config.footer.customMessage}\n`;
  }
  
  // QR Code info
  if (config.footer.showQR && config.qrCode.enabled) {
    receipt += '------------------------\n';
    receipt += 'Quét mã QR để xem chi tiết:\n';
  }
  
  // Feed and cut
  receipt += ESC_POS.FEED_PAPER;
  receipt += ESC_POS.CUT_PAPER;
  
  return receipt;
}

// API endpoint để cập nhật cấu hình hóa đơn
app.post('/api/receipt/config', (req, res) => {
  try {
    const { store, printer, qrCode, footer } = req.body;
    
    if (store) RECEIPT_CONFIG.store = { ...RECEIPT_CONFIG.store, ...store };
    if (printer) RECEIPT_CONFIG.printer = { ...RECEIPT_CONFIG.printer, ...printer };
    if (qrCode) RECEIPT_CONFIG.qrCode = { ...RECEIPT_CONFIG.qrCode, ...qrCode };
    if (footer) RECEIPT_CONFIG.footer = { ...RECEIPT_CONFIG.footer, ...footer };
    
    res.json({
      success: true,
      message: 'Receipt configuration updated',
      config: RECEIPT_CONFIG
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint để lấy cấu hình hiện tại
app.get('/api/receipt/config', (req, res) => {
  res.json({
    success: true,
    config: RECEIPT_CONFIG
  });
});

// API endpoint để in hóa đơn tùy chỉnh
app.post('/api/receipt/print', async (req, res) => {
  try {
    const { orderId, customConfig } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Lấy thông tin order từ database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        user: true,
        orderItems: {
          include: {
            menu: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Chuẩn bị dữ liệu hóa đơn
    const orderData = {
      orderNumber: order.orderNumber,
      tableName: order.table.name,
      cashierName: order.user.firstName + ' ' + order.user.lastName,
      customerName: order.customer?.name || null,
      paymentMethod: order.payments?.[0]?.method || 'Tiền mặt',
      items: order.orderItems.map(item => ({
        name: item.menu.name,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total: order.total
    };
    
    // Tạo hóa đơn tùy chỉnh
    const receipt = await generateCustomReceipt(orderData, customConfig);
    
    // Tạo QR code nếu được bật
    let qrCode = null;
    if (RECEIPT_CONFIG.qrCode.enabled) {
      qrCode = await generateQRCode(orderData);
    }
    
    res.set({
      'Content-Type': 'text/plain; charset=cp1252',
      'Content-Length': receipt.length,
      'X-Receipt-Type': 'custom',
      'X-Printer-Model': 'XP-80C',
      'X-QR-Code': qrCode ? 'enabled' : 'disabled'
    });
    
    res.send(receipt);
    
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint để tạo QR code riêng
app.post('/api/receipt/qr', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Lấy thông tin order từ database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        user: true,
        orderItems: {
          include: {
            menu: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Chuẩn bị dữ liệu hóa đơn
    const orderData = {
      orderNumber: order.orderNumber,
      tableName: order.table.name,
      cashierName: order.user.firstName + ' ' + order.user.lastName,
      items: order.orderItems.map(item => ({
        name: item.menu.name,
        quantity: item.quantity,
        price: item.price
      })),
      total: order.total
    };
    
    // Tạo QR code
    const qrCode = await generateQRCode(orderData);
    
    if (qrCode) {
      res.set({
        'Content-Type': 'image/svg+xml',
        'Content-Length': qrCode.length,
        'X-QR-Data': JSON.stringify(orderData)
      });
      res.send(qrCode);
    } else {
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
    
  } catch (error) {
    console.error('QR Code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint
app.get('/api/receipt/test', async (req, res) => {
  try {
    const testData = {
      orderNumber: 'HD001',
      tableName: 'Bàn 1',
      cashierName: 'Thu ngân A',
      customerName: 'Nguyễn Văn A',
      paymentMethod: 'Tiền mặt',
      items: [
        { name: 'Phở Bò', quantity: 2, price: 45000 },
        { name: 'Bún Bò Huế', quantity: 1, price: 50000 },
        { name: 'Nước Cam', quantity: 2, price: 15000 }
      ],
      subtotal: 155000,
      tax: 15500,
      discount: 5000,
      total: 165500
    };
    
    const receipt = await generateCustomReceipt(testData);
    const qrCode = await generateQRCode(testData);
    
    res.json({
      success: true,
      receipt: receipt,
      qrCode: qrCode,
      config: RECEIPT_CONFIG
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`🖨️ Custom Receipt API server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/receipt/test`);
  console.log(`Config endpoint: http://localhost:${PORT}/api/receipt/config`);
  console.log(`Print endpoint: POST http://localhost:${PORT}/api/receipt/print`);
  console.log(`QR endpoint: POST http://localhost:${PORT}/api/receipt/qr`);
});
