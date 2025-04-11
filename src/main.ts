import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json());
  // CORS config for frontend/dev environments
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });

  // Explicitly use WS adapter
  app.useWebSocketAdapter(new WsAdapter(app));

  // ✅ Log incoming requests to /ocpp (WebSocket upgrade attempts)
  app.use('/ocpp', (req, res, next) => {
    console.log(`📡 HTTP request to /ocpp from ${req.ip}`);
    next();
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`🚀 Server running on port ${port}`);
}

bootstrap();
