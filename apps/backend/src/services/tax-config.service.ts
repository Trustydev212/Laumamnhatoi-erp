import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class TaxConfigService {
  constructor(private prisma: PrismaService) {}

  // Cấu hình thuế mặc định
  private taxConfig = {
    vatRate: 0, // 0% - mặc định không thuế
    vatEnabled: false,
    serviceChargeRate: 0, // 0%
    serviceChargeEnabled: false,
    taxInclusive: false, // false = thuế cộng thêm, true = thuế đã bao gồm
    taxName: 'VAT',
    serviceChargeName: 'Phí phục vụ',
    currency: 'VND',
    currencySymbol: '₫',
    roundingMethod: 'round' // round, floor, ceil
  };

  // Lấy cấu hình thuế
  async getTaxConfig() {
    try {
      // Tạm thời dùng file system thay vì database
      const fs = require('fs');
      const path = require('path');
      const configFile = path.join(process.cwd(), 'tax-config.json');
      
      if (fs.existsSync(configFile)) {
        const fileContent = fs.readFileSync(configFile, 'utf8');
        const parsedConfig = JSON.parse(fileContent);
        this.taxConfig = { ...this.taxConfig, ...parsedConfig };
      }
      
      return this.taxConfig;
    } catch (error) {
      console.error('Error getting tax config:', error);
      return this.taxConfig;
    }
  }

  // Cập nhật cấu hình thuế
  async updateTaxConfig(newConfig: any) {
    try {
      const updatedConfig = { ...this.taxConfig, ...newConfig };
      
      // Tạm thời lưu vào file thay vì database
      const fs = require('fs');
      const path = require('path');
      const configFile = path.join(process.cwd(), 'tax-config.json');
      
      fs.writeFileSync(configFile, JSON.stringify(updatedConfig, null, 2));
      
      // Update trong memory
      this.taxConfig = updatedConfig;
      return updatedConfig;
    } catch (error) {
      console.error('Error updating tax config:', error);
      throw error;
    }
  }

  // Tính thuế cho đơn hàng
  async calculateTax(subtotal: number, orderId?: string) {
    const config = await this.getTaxConfig();
    
    let vatAmount = 0;
    let serviceChargeAmount = 0;
    let total = subtotal;
    
    // Tính VAT
    if (config.vatEnabled) {
      if (config.taxInclusive) {
        // Thuế đã bao gồm trong giá
        vatAmount = subtotal * (config.vatRate / 100) / (1 + config.vatRate / 100);
        total = subtotal;
      } else {
        // Thuế cộng thêm
        vatAmount = subtotal * (config.vatRate / 100);
        total = subtotal + vatAmount;
      }
    }
    
    // Tính phí phục vụ
    if (config.serviceChargeEnabled) {
      serviceChargeAmount = subtotal * (config.serviceChargeRate / 100);
      total += serviceChargeAmount;
    }
    
    // Làm tròn
    if (config.roundingMethod === 'round') {
      total = Math.round(total);
    } else if (config.roundingMethod === 'floor') {
      total = Math.floor(total);
    } else if (config.roundingMethod === 'ceil') {
      total = Math.ceil(total);
    }
    
    return {
      subtotal,
      vatAmount: Math.round(vatAmount),
      serviceChargeAmount: Math.round(serviceChargeAmount),
      total: Math.round(total),
      vatRate: config.vatRate,
      serviceChargeRate: config.serviceChargeRate,
      taxInclusive: config.taxInclusive,
      vatEnabled: config.vatEnabled,
      serviceChargeEnabled: config.serviceChargeEnabled
    };
  }

  // Áp dụng thuế cho đơn hàng
  async applyTaxToOrder(orderId: string) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true }
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      const taxCalculation = await this.calculateTax(Number(order.subtotal), orderId);
      
      // Cập nhật đơn hàng với thông tin thuế
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          tax: taxCalculation.vatAmount,
          total: taxCalculation.total
        }
      });
      
      return updatedOrder;
    } catch (error) {
      console.error('Error applying tax to order:', error);
      throw error;
    }
  }

  // Lấy danh sách cấu hình thuế có sẵn
  getAvailableTaxConfigs() {
    return [
      {
        name: 'Không thuế',
        vatRate: 0,
        vatEnabled: false,
        serviceChargeRate: 0,
        serviceChargeEnabled: false
      },
      {
        name: 'VAT 10%',
        vatRate: 10,
        vatEnabled: true,
        serviceChargeRate: 0,
        serviceChargeEnabled: false
      },
      {
        name: 'VAT 10% + Phí phục vụ 5%',
        vatRate: 10,
        vatEnabled: true,
        serviceChargeRate: 5,
        serviceChargeEnabled: true
      },
      {
        name: 'Phí phục vụ 10%',
        vatRate: 0,
        vatEnabled: false,
        serviceChargeRate: 10,
        serviceChargeEnabled: true
      }
    ];
  }

  // Reset về cấu hình mặc định
  async resetToDefault() {
    const defaultConfig = {
      vatRate: 10,
      vatEnabled: true,
      serviceChargeRate: 5,
      serviceChargeEnabled: false,
      taxInclusive: false,
      taxName: 'VAT',
      serviceChargeName: 'Phí phục vụ',
      currency: 'VND',
      currencySymbol: '₫',
      roundingMethod: 'round'
    };
    
    return await this.updateTaxConfig(defaultConfig);
  }
}
