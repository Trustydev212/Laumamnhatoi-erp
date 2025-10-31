import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class ChatbotService {
  private openai: OpenAI | null = null;
  private apiKeyConfigured: boolean = false;
  
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) {
    // Initialize OpenAI client - Try ConfigService first, fallback to process.env
    const apiKey = this.configService.get<string>('OPENAI_API_KEY') || process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      console.warn('⚠️  OPENAI_API_KEY not found in environment variables.');
      console.warn('⚠️  Please add OPENAI_API_KEY to your .env file or environment variables.');
      console.warn('⚠️  Chatbot functionality will be disabled until API key is configured.');
      this.apiKeyConfigured = false;
    } else {
      try {
        this.openai = new OpenAI({ apiKey: apiKey.trim() });
        this.apiKeyConfigured = true;
        console.log('✅ OpenAI client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI client:', error);
        this.apiKeyConfigured = false;
      }
    }
  }

  /**
   * Get comprehensive business data for context
   */
  private async getBusinessContext(): Promise<string> {
    const [
      totalUsers,
      totalOrders,
      totalCustomers,
      recentOrders,
      revenueAggregate,
      inventorySummary,
      topItems
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.customer.count(),
      this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          orderItems: {
            include: {
              menu: {
                select: {
                  name: true,
                  price: true
                }
              }
            }
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.order.aggregate({
        where: {
          isPaid: true,
          paidAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        _sum: {
          subtotal: true // Doanh thu = subtotal (trước thuế)
        },
        _count: true
      }),
      this.prisma.ingredient.findMany({
        where: { isActive: true },
        select: {
          name: true,
          currentStock: true,
          minStock: true,
          unit: true,
          costPrice: true
        },
        take: 20
      }),
      this.prisma.orderItem.groupBy({
        by: ['menuId'],
        _sum: {
          quantity: true,
          subtotal: true
        },
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 10
      })
    ]);

    // Get menu names for top items
    const menuIds = topItems.map(item => item.menuId);
    const menus = await this.prisma.menu.findMany({
      where: { id: { in: menuIds } },
      select: { id: true, name: true }
    });
    const menuMap = new Map(menus.map(m => [m.id, m.name]));
    
    const topItemsWithNames = topItems.map(item => ({
      name: menuMap.get(item.menuId) || 'Unknown',
      quantity: item._sum.quantity || 0,
      revenue: Number(item._sum.subtotal || 0)
    }));

    const lowStockItems = inventorySummary.filter(
      ing => Number(ing.currentStock) <= Number(ing.minStock)
    );

    const totalInventoryValue = inventorySummary.reduce(
      (sum, ing) => sum + (Number(ing.currentStock) * Number(ing.costPrice)),
      0
    );

    // Format context string
    const context = `
=== HỆ THỐNG ERP - NHÀ TÔI RESTAURANT ===

**THỐNG KÊ TỔNG QUAN:**
- Tổng số người dùng: ${totalUsers}
- Tổng số đơn hàng: ${totalOrders}
- Tổng số khách hàng: ${totalCustomers}

**DOANH THU 30 NGÀY GẦN NHẤT:**
- Tổng doanh thu: ${Number(revenueAggregate._sum.subtotal || 0).toLocaleString('vi-VN')} đ (trước thuế)
- Số đơn đã thanh toán: ${revenueAggregate._count}

**TỒN KHO:**
- Tổng số nguyên liệu: ${inventorySummary.length}
- Nguyên liệu sắp hết: ${lowStockItems.length}
- Tổng giá trị tồn kho: ${totalInventoryValue.toLocaleString('vi-VN')} đ
- Danh sách nguyên liệu sắp hết: ${lowStockItems.map(ing => `${ing.name} (${ing.currentStock} ${ing.unit})`).join(', ') || 'Không có'}

**TOP MÓN ĂN (10 món bán chạy nhất):**
${topItemsWithNames.map((item, idx) => `${idx + 1}. ${item.name}: ${item.quantity} phần, doanh thu ${item.revenue.toLocaleString('vi-VN')} đ`).join('\n')}

**ĐƠN HÀNG GẦN ĐÂY (7 ngày):**
- Số đơn: ${recentOrders.length}
${recentOrders.slice(0, 5).map((order, idx) => 
  `  ${idx + 1}. Đơn #${order.orderNumber}: ${Number(order.total).toLocaleString('vi-VN')} đ (${order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'})`
).join('\n')}

=== KẾT THÚC DỮ LIỆU HỆ THỐNG ===
    `.trim();

    return context;
  }

  /**
   * Chat with AI using business context
   */
  async chat(message: string, userId: string): Promise<string> {
    if (!this.apiKeyConfigured || !this.openai) {
      return '⚠️ Chatbot chưa được cấu hình.\n\nVui lòng:\n1. Thêm OPENAI_API_KEY vào file .env của backend\n2. Hoặc set biến môi trường OPENAI_API_KEY\n3. Restart backend service để áp dụng thay đổi\n\nVí dụ trong .env:\nOPENAI_API_KEY=sk-your-api-key-here';
    }

    try {
      // Get business context
      const context = await this.getBusinessContext();

      const systemPrompt = `Bạn là một trợ lý AI thông minh chuyên phân tích dữ liệu cho hệ thống ERP của nhà hàng "LẨU MẮM NHÀ TÔI".

BẠN CÓ THỂ:
- Phân tích doanh thu, bán hàng, tồn kho
- Đưa ra insights và gợi ý cải thiện
- Trả lời câu hỏi về dữ liệu kinh doanh
- So sánh các chỉ số theo thời gian
- Đề xuất chiến lược kinh doanh

QUY TẮC:
- Luôn trả lời bằng tiếng Việt
- Sử dụng dữ liệu được cung cấp để đưa ra câu trả lời chính xác
- Nếu không có dữ liệu, hãy nói rõ
- Đưa ra số liệu cụ thể khi có thể
- Trình bày dễ hiểu, có cấu trúc rõ ràng
- Đề xuất hành động cụ thể khi phù hợp

Dữ liệu hiện tại của hệ thống sẽ được cung cấp trong context.`;

      const userMessage = `Dữ liệu hệ thống hiện tại:

${context}

---

Câu hỏi của người dùng: ${message}

Hãy phân tích và trả lời dựa trên dữ liệu trên.`;

      const completion = await this.openai.chat.completions.create({
        model: 'o1-mini', // Using o1-mini for better reasoning
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';

      // Log interaction for audit (optional)
      try {
        await this.prisma.auditLog.create({
          data: {
            userId,
            action: 'CHATBOT_QUERY',
            entity: 'Chatbot',
            entityId: 'chatbot',
            newValues: JSON.stringify({ message, response: response.substring(0, 200) })
          }
        });
      } catch (logError) {
        console.error('Failed to log chatbot interaction:', logError);
      }

      return response;

    } catch (error: any) {
      console.error('Chatbot error:', error);
      
      if (error?.status === 401) {
        return 'Lỗi xác thực OpenAI API. Vui lòng kiểm tra OPENAI_API_KEY.';
      } else if (error?.status === 429) {
        return 'Quá nhiều yêu cầu. Vui lòng thử lại sau vài giây.';
      } else if (error?.code === 'insufficient_quota') {
        return 'Hết hạn mức sử dụng OpenAI API. Vui lòng kiểm tra tài khoản.';
      }
      
      return `Xin lỗi, đã xảy ra lỗi: ${error?.message || 'Unknown error'}. Vui lòng thử lại.`;
    }
  }

  /**
   * Get quick insights (pre-computed analysis)
   */
  async getQuickInsights(): Promise<{
    revenue: string;
    inventory: string;
    topItems: string;
    alerts: string[];
  }> {
    try {
      const [
        revenueLast30Days,
        lowStockCount,
        topItemsData
      ] = await Promise.all([
        this.prisma.order.aggregate({
          where: {
            isPaid: true,
            paidAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          },
          _sum: { subtotal: true }, // Doanh thu = subtotal (trước thuế)
          _count: true
        }),
        this.prisma.ingredient.count({
          where: {
            isActive: true,
            currentStock: { lte: 0 }
          }
        }),
        this.prisma.orderItem.groupBy({
          by: ['menuId'],
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 3
        })
      ]);

      const menuIds = topItemsData.map(item => item.menuId);
      const menus = await this.prisma.menu.findMany({
        where: { id: { in: menuIds } },
        select: { id: true, name: true }
      });
      const menuMap = new Map(menus.map(m => [m.id, m.name]));

      const alerts: string[] = [];
      if (lowStockCount > 0) {
        alerts.push(`Có ${lowStockCount} nguyên liệu đã hết hàng, cần nhập thêm ngay.`);
      }

      return {
        revenue: `Doanh thu 30 ngày: ${Number(revenueLast30Days._sum.subtotal || 0).toLocaleString('vi-VN')} đ (trước thuế) từ ${revenueLast30Days._count} đơn hàng.`,
        inventory: `${lowStockCount} nguyên liệu cần bổ sung.`,
        topItems: `Top 3 món bán chạy: ${topItemsData.map((item, idx) => `${idx + 1}. ${menuMap.get(item.menuId) || 'Unknown'}`).join(', ')}.`,
        alerts
      };
    } catch (error) {
      console.error('Error getting quick insights:', error);
      return {
        revenue: 'Không thể tải dữ liệu doanh thu.',
        inventory: 'Không thể tải dữ liệu tồn kho.',
        topItems: 'Không thể tải dữ liệu món ăn.',
        alerts: []
      };
    }
  }
}
