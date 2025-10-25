// Script tạo hóa đơn nâng cao với QR code và tùy chỉnh
// Usage: node enhanced-receipt.js

const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

// Cấu hình hóa đơn có thể tùy chỉnh
const RECEIPT_CONFIG = {
  // Thông tin cửa hàng
  store: {
    name: 'NHÀ TÔI ERP',
    subtitle: 'Hệ thống quản lý quán ăn',
    address: '123 Đường ABC, Quận 1, TP.HCM',
    phone: '0123 456 789',
    email: 'info@nhatoi.com',
    website: 'www.nhatoi.com',
    taxCode: '0123456789'
  },
  
  // Cấu hình in
  printer: {
    width: 48, // 48 characters per line (80mm)
    encoding: 'cp1252',
    fontSize: {
      normal: 0,
      double: 1,
      large: 2
    }
  },
  
  // Cấu hình QR code
  qrCode: {
    enabled: true,
    size: 200, // pixels
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  },
  
  // Cấu hình footer
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
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  FONT_A: ESC + 'M' + '\x00',
  FONT_B: ESC + 'M' + '\x01',
  CUT_PAPER: GS + 'V' + '\x00',
  FEED_PAPER: LF + LF + LF,
  // QR Code commands
  QR_CODE_SIZE: GS + 'k' + '\x03' + '\x00' + '\x10' + '\x10',
  QR_CODE_ERROR: GS + 'k' + '\x03' + '\x00' + '\x31' + '\x00',
  QR_CODE_STORE: GS + 'k' + '\x03' + '\x00' + '\x31' + '\x00',
  QR_CODE_PRINT: GS + 'k' + '\x03' + '\x00' + '\x31' + '\x00',
};

// Tạo QR code cho hóa đơn
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
      margin: RECEIPT_CONFIG.qrCode.margin,
      color: RECEIPT_CONFIG.qrCode.color
    });
    
    return qrCode;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
}

// Tạo hóa đơn nâng cao với QR code
async function generateEnhancedReceipt(orderData) {
  let receipt = '';
  
  // Reset printer
  receipt += ESC_POS.RESET;
  
  // Header - Store info
  receipt += ESC_POS.ALIGN_CENTER;
  receipt += ESC_POS.BOLD_ON;
  receipt += ESC_POS.FONT_B;
  receipt += `${RECEIPT_CONFIG.store.name}\n`;
  receipt += `${RECEIPT_CONFIG.store.subtitle}\n`;
  receipt += '========================\n';
  
  // Store details
  receipt += ESC_POS.BOLD_OFF;
  receipt += ESC_POS.FONT_A;
  if (RECEIPT_CONFIG.store.address) {
    receipt += `${RECEIPT_CONFIG.store.address}\n`;
  }
  if (RECEIPT_CONFIG.store.phone) {
    receipt += `ĐT: ${RECEIPT_CONFIG.store.phone}\n`;
  }
  if (RECEIPT_CONFIG.store.email) {
    receipt += `Email: ${RECEIPT_CONFIG.store.email}\n`;
  }
  if (RECEIPT_CONFIG.store.website) {
    receipt += `Web: ${RECEIPT_CONFIG.store.website}\n`;
  }
  if (RECEIPT_CONFIG.store.taxCode) {
    receipt += `MST: ${RECEIPT_CONFIG.store.taxCode}\n`;
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
  if (RECEIPT_CONFIG.footer.showThankYou) {
    receipt += 'Cảm ơn quý khách!\n';
  }
  if (RECEIPT_CONFIG.footer.customMessage) {
    receipt += `${RECEIPT_CONFIG.footer.customMessage}\n`;
  }
  
  // QR Code (if enabled)
  if (RECEIPT_CONFIG.footer.showQR && RECEIPT_CONFIG.qrCode.enabled) {
    receipt += '------------------------\n';
    receipt += 'Quét mã QR để xem chi tiết:\n';
    // Note: QR code sẽ được in riêng bằng lệnh ESC/POS
  }
  
  // Feed and cut
  receipt += ESC_POS.FEED_PAPER;
  receipt += ESC_POS.CUT_PAPER;
  
  return receipt;
}

// Tạo hóa đơn với QR code
async function generateReceiptWithQR(orderData) {
  try {
    // Tạo hóa đơn text
    const receipt = await generateEnhancedReceipt(orderData);
    
    // Tạo QR code
    const qrCode = await generateQRCode(orderData);
    
    return {
      receipt: receipt,
      qrCode: qrCode,
      config: RECEIPT_CONFIG
    };
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw error;
  }
}

// Test function
async function testEnhancedReceipt() {
  try {
    console.log('🧾 Testing enhanced receipt generation...');
    
    // Sample order data
    const orderData = {
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
    
    // Generate enhanced receipt
    const result = await generateReceiptWithQR(orderData);
    
    console.log('✅ Enhanced receipt generated!');
    console.log('Receipt length:', result.receipt.length, 'bytes');
    console.log('QR Code generated:', result.qrCode ? 'Yes' : 'No');
    
    // Save to files
    const fs = require('fs');
    fs.writeFileSync('enhanced-receipt.txt', result.receipt, 'binary');
    fs.writeFileSync('receipt-qr.svg', result.qrCode, 'utf8');
    fs.writeFileSync('receipt-config.json', JSON.stringify(result.config, null, 2), 'utf8');
    
    console.log('✅ Files saved:');
    console.log('- enhanced-receipt.txt (ESC/POS format)');
    console.log('- receipt-qr.svg (QR code)');
    console.log('- receipt-config.json (Configuration)');
    
    console.log('\n📋 Receipt preview:');
    console.log(result.receipt);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testEnhancedReceipt();
