import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting simple database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@nhatoi.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.username);

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 12);
  
  const manager = await prisma.user.create({
    data: {
      username: 'manager',
      email: 'manager@nhatoi.com',
      password: managerPassword,
      firstName: 'Quản lý',
      lastName: 'Nhà hàng',
      role: 'MANAGER',
      isActive: true,
    },
  });

  console.log('✅ Manager user created:', manager.username);

  // Create cashier user
  const cashierPassword = await bcrypt.hash('cashier123', 12);
  
  const cashier = await prisma.user.create({
    data: {
      username: 'cashier',
      email: 'cashier@nhatoi.com',
      password: cashierPassword,
      firstName: 'Thu ngân',
      lastName: 'Viên',
      role: 'CASHIER',
      isActive: true,
    },
  });

  console.log('✅ Cashier user created:', cashier.username);

  // Create kitchen user
  const kitchenPassword = await bcrypt.hash('kitchen123', 12);
  
  const kitchen = await prisma.user.create({
    data: {
      username: 'kitchen',
      email: 'kitchen@nhatoi.com',
      password: kitchenPassword,
      firstName: 'Bếp trưởng',
      lastName: 'Nhà hàng',
      role: 'KITCHEN',
      isActive: true,
    },
  });

  console.log('✅ Kitchen user created:', kitchen.username);

  // Create sample categories
  const category1 = await prisma.category.create({
    data: {
      name: 'Món chính',
      description: 'Các món ăn chính',
      sortOrder: 1,
    },
  });
  console.log('✅ Category created:', category1.name);

  const category2 = await prisma.category.create({
    data: {
      name: 'Món phụ',
      description: 'Các món ăn phụ',
      sortOrder: 2,
    },
  });
  console.log('✅ Category created:', category2.name);

  const category3 = await prisma.category.create({
    data: {
      name: 'Đồ uống',
      description: 'Nước uống các loại',
      sortOrder: 3,
    },
  });
  console.log('✅ Category created:', category3.name);

  const category4 = await prisma.category.create({
    data: {
      name: 'Tráng miệng',
      description: 'Món tráng miệng',
      sortOrder: 4,
    },
  });
  console.log('✅ Category created:', category4.name);

  // Create sample tables
  const tables = [
    { name: 'Bàn 1', capacity: 4, location: 'Tầng 1' },
    { name: 'Bàn 2', capacity: 4, location: 'Tầng 1' },
    { name: 'Bàn 3', capacity: 6, location: 'Tầng 1' },
    { name: 'Bàn 4', capacity: 2, location: 'Tầng 1' },
    { name: 'Bàn 5', capacity: 8, location: 'Tầng 2' },
    { name: 'Bàn 6', capacity: 4, location: 'Tầng 2' },
    { name: 'Bàn 7', capacity: 6, location: 'Tầng 2' },
    { name: 'Bàn 8', capacity: 4, location: 'Tầng 2' },
  ];

  for (const tableData of tables) {
    const table = await prisma.table.create({
      data: tableData,
    });
    console.log('✅ Table created:', table.name);
  }

  // Create sample menu items
  const menu1 = await prisma.menu.create({
    data: {
      name: 'Phở Bò',
      description: 'Phở bò truyền thống',
      price: 45000,
      categoryId: category1.id,
      isActive: true,
      isAvailable: true,
    },
  });
  console.log('✅ Menu item created:', menu1.name);

  const menu2 = await prisma.menu.create({
    data: {
      name: 'Bún Bò Huế',
      description: 'Bún bò Huế đặc biệt',
      price: 50000,
      categoryId: category1.id,
      isActive: true,
      isAvailable: true,
    },
  });
  console.log('✅ Menu item created:', menu2.name);

  const menu3 = await prisma.menu.create({
    data: {
      name: 'Cơm Tấm',
      description: 'Cơm tấm sườn nướng',
      price: 35000,
      categoryId: category1.id,
      isActive: true,
      isAvailable: true,
    },
  });
  console.log('✅ Menu item created:', menu3.name);

  const menu4 = await prisma.menu.create({
    data: {
      name: 'Nước Cam',
      description: 'Nước cam tươi',
      price: 15000,
      categoryId: category3.id,
      isActive: true,
      isAvailable: true,
    },
  });
  console.log('✅ Menu item created:', menu4.name);

  const menu5 = await prisma.menu.create({
    data: {
      name: 'Trà Đá',
      description: 'Trà đá truyền thống',
      price: 5000,
      categoryId: category3.id,
      isActive: true,
      isAvailable: true,
    },
  });
  console.log('✅ Menu item created:', menu5.name);

  // Create sample ingredients
  const ingredients = [
    { name: 'Thịt bò', unit: 'kg', currentStock: 10, minStock: 2, costPrice: 200000 },
    { name: 'Bánh phở', unit: 'kg', currentStock: 5, minStock: 1, costPrice: 15000 },
    { name: 'Rau thơm', unit: 'bó', currentStock: 20, minStock: 5, costPrice: 5000 },
    { name: 'Hành tây', unit: 'kg', currentStock: 3, minStock: 1, costPrice: 25000 },
    { name: 'Tôm', unit: 'kg', currentStock: 2, minStock: 1, costPrice: 180000 },
    { name: 'Thịt heo', unit: 'kg', currentStock: 8, minStock: 2, costPrice: 120000 },
  ];

  for (const ingredientData of ingredients) {
    const ingredient = await prisma.ingredient.create({
      data: ingredientData,
    });
    console.log('✅ Ingredient created:', ingredient.name);
  }

  // Create sample customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'Nguyễn Văn A',
      phone: '0123456789',
      email: 'nguyenvana@email.com',
      points: 100,
      level: 'SILVER',
    },
  });
  console.log('✅ Customer created:', customer1.name);

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Trần Thị B',
      phone: '0987654321',
      email: 'tranthib@email.com',
      points: 250,
      level: 'GOLD',
    },
  });
  console.log('✅ Customer created:', customer2.name);

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Lê Văn C',
      phone: '0369258147',
      email: 'levanc@email.com',
      points: 50,
      level: 'BRONZE',
    },
  });
  console.log('✅ Customer created:', customer3.name);

  console.log('🎉 Simple database seeding completed successfully!');
  console.log('');
  console.log('📋 Test accounts:');
  console.log('👑 Admin: admin / admin123');
  console.log('👨‍💼 Manager: manager / manager123');
  console.log('💰 Cashier: cashier / cashier123');
  console.log('👨‍🍳 Kitchen: kitchen / kitchen123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
