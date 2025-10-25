// Script sửa lỗi in hóa đơn cho máy XP-80C
// Usage: node fix-printer-escpos.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ESC/POS Commands cho máy in nhiệt 80mm
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CR = '\x0D';

// Cấu hình máy in
const PRINTER_CONFIG = {
  width: 48, // 48 characters per line (80mm)
  encoding: 'cp1252', // Windows-1252 encoding
  fontSize: {
    normal: 0,
    double: 1,
    large: 2
  }
};

// ESC/POS Commands
const ESC_POS = {
  // Reset printer
  RESET: ESC + '@',
  
  // Text formatting
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  
  // Font size
  FONT_A: ESC + 'M' + '\x00',
  FONT_B: ESC + 'M' + '\x01',
  
  // Alignment
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  
  // Line spacing
  LINE_SPACING: ESC + '3' + '\x18', // 24 dots
  
  // Cut paper
  CUT_PAPER: GS + 'V' + '\x00',
  
  // Feed paper
  FEED_PAPER: LF + LF + LF,
  
  // Barcode
  BARCODE_HEIGHT: GS + 'h' + '\x40', // 64 dots
  BARCODE_WIDTH: GS + 'w' + '\x02', // 2x width
  BARCODE_TEXT: GS + 'H' + '\x02', // Print text below barcode
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

// Tạo hóa đơn đơn giản (chỉ text)
function generateSimpleReceipt(orderData) {
  let receipt = '';
  
  // Header
  receipt += 'NHÀ TÔI ERP\n';
  receipt += 'Hệ thống quản lý quán ăn\n';
  receipt += '========================\n\n';
  
  // Order info
  receipt += `Hóa đơn: ${orderData.orderNumber}\n`;
  receipt += `Ngày: ${new Date().toLocaleString('vi-VN')}\n`;
  receipt += `Bàn: ${orderData.tableName}\n`;
  receipt += `Thu ngân: ${orderData.cashierName}\n`;
  receipt += '------------------------\n\n';
  
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
  receipt += `TỔNG CỘNG: ${orderData.total.toLocaleString('vi-VN')} VNĐ\n\n`;
  
  // Footer
  receipt += 'Cảm ơn quý khách!\n';
  receipt += 'Hẹn gặp lại!\n';
  
  return receipt;
}

// Test function
async function testReceipt() {
  try {
    console.log('🧾 Testing receipt generation...');
    
    // Sample order data
    const orderData = {
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
    
    // Generate receipts
    const escposReceipt = generateReceipt(orderData);
    const simpleReceipt = generateSimpleReceipt(orderData);
    
    console.log('✅ ESC/POS Receipt generated:');
    console.log('Length:', escposReceipt.length, 'bytes');
    console.log('Preview:');
    console.log(simpleReceipt);
    
    // Save to file for testing
    const fs = require('fs');
    fs.writeFileSync('receipt-escpos.txt', escposReceipt, 'binary');
    fs.writeFileSync('receipt-simple.txt', simpleReceipt, 'utf8');
    
    console.log('✅ Receipt files saved:');
    console.log('- receipt-escpos.txt (ESC/POS format)');
    console.log('- receipt-simple.txt (Simple text format)');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testReceipt();
