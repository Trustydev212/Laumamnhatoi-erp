import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS - Dynamic origin handling for production and development
  app.enableCors({
    origin: (origin, callback) => {
      const whitelist = [
        'http://36.50.27.82:3002',
        'http://36.50.27.82:3001',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'https://ungained-larissa-ligniform.ngrok-free.dev',
      ];
      
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in whitelist
      if (whitelist.includes(origin)) return callback(null, true);
      
      // Check ngrok patterns
      if (/^https:\/\/.*\.ngrok-free\.dev$/.test(origin) ||
          /^https:\/\/.*\.ngrok\.io$/.test(origin) ||
          /^https:\/\/.*\.ngrok\.app$/.test(origin)) {
        return callback(null, true);
      }
      
      console.warn(`❌ Blocked by CORS: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'Cache-Control',
      'Pragma'
    ],
    exposedHeaders: ['Authorization'],
    optionsSuccessStatus: 200, // For legacy browser support
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Nhà Tôi ERP API')
    .setDescription('API documentation for restaurant management system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get('API_PORT', 3001);
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
