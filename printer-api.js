// API endpoint để in hóa đơn tương thích với máy XP-80C
// Usage: node printer-api.js

const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(express.json());

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

// Tạo hóa đơn ESC/POS
function generateReceipt(orderData) {
  let receipt = '';
  
  // Reset printer
  receipt += ESC_POS.RESET;
  
  // Header
  receipt += ESC_POS.ALIGN_CENTER;
  receipt += ESC_POS.BOLD_ON;
  receipt += ESC_POS.FONT_B;
  receipt += 'NHÀ TÔI ERP\n';
  receipt += 'Hệ thống quản lý quán ăn\n';
  receipt += '========================\n';
  
  // Order info
  receipt += ESC_POS.ALIGN_LEFT;
  receipt += ESC_POS.BOLD_OFF;
  receipt += ESC_POS.FONT_A;
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
  
  // Total
  receipt += '------------------------\n';
  receipt += ESC_POS.BOLD_ON;
  receipt += `TỔNG CỘNG: ${orderData.total.toLocaleString('vi-VN')} VNĐ\n`;
  receipt += ESC_POS.BOLD_OFF;
  
  // Footer
  receipt += ESC_POS.ALIGN_CENTER;
  receipt += 'Cảm ơn quý khách!\n';
  receipt += 'Hẹn gặp lại!\n';
  
  // Feed and cut
  receipt += ESC_POS.FEED_PAPER;
  receipt += ESC_POS.CUT_PAPER;
  
  return receipt;
}

// API endpoint để in hóa đơn
app.post('/api/print/receipt', async (req, res) => {
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
    
    // Tạo hóa đơn ESC/POS
    const receipt = generateReceipt(orderData);
    
    // Trả về dữ liệu hóa đơn
    res.set({
      'Content-Type': 'text/plain; charset=cp1252',
      'Content-Length': receipt.length,
      'X-Receipt-Type': 'escpos',
      'X-Printer-Model': 'XP-80C'
    });
    
    res.send(receipt);
    
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint để in hóa đơn đơn giản (text only)
app.post('/api/print/receipt-simple', async (req, res) => {
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
    
    // Tạo hóa đơn đơn giản
    let receipt = '';
    receipt += 'NHÀ TÔI ERP\n';
    receipt += 'Hệ thống quản lý quán ăn\n';
    receipt += '========================\n\n';
    receipt += `Hóa đơn: ${order.orderNumber}\n`;
    receipt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
    receipt += `Bàn: ${order.table.name}\n`;
    receipt += `Thu ngân: ${order.user.firstName} ${order.user.lastName}\n`;
    receipt += '------------------------\n\n';
    receipt += 'MÓN ĂN                    SL   GIÁ\n';
    receipt += '------------------------\n';
    
    order.orderItems.forEach(item => {
      const name = item.menu.name.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(2);
      const price = item.price.toLocaleString('vi-VN').padStart(8);
      receipt += `${name} ${qty} ${price}\n`;
    });
    
    receipt += '------------------------\n';
    receipt += `TỔNG CỘNG: ${order.total.toLocaleString('vi-VN')} VNĐ\n\n`;
    receipt += 'Cảm ơn quý khách!\n';
    receipt += 'Hẹn gặp lại!\n';
    
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Length': receipt.length,
      'X-Receipt-Type': 'simple',
      'X-Printer-Model': 'XP-80C'
    });
    
    res.send(receipt);
    
  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test endpoint
app.get('/api/print/test', (req, res) => {
  const testData = {
    orderNumber: 'HD001',
    tableName: 'Bàn 1',
    cashierName: 'Thu ngân A',
    items: [
      { name: 'Phở Bò', quantity: 2, price: 45000 },
      { name: 'Bún Bò Huế', quantity: 1, price: 50000 },
      { name: 'Nước Cam', quantity: 2, price: 15000 }
    ],
    total: 155000
  };
  
  const receipt = generateReceipt(testData);
  
  res.set({
    'Content-Type': 'text/plain; charset=cp1252',
    'Content-Length': receipt.length,
    'X-Receipt-Type': 'escpos',
    'X-Printer-Model': 'XP-80C'
  });
  
  res.send(receipt);
});

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🖨️ Printer API server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/print/test`);
  console.log(`Print receipt: POST http://localhost:${PORT}/api/print/receipt`);
  console.log(`Print simple: POST http://localhost:${PORT}/api/print/receipt-simple`);
});
