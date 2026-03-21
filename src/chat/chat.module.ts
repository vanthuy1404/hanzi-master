import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'
import { OnlineStatusService } from './online-status.service'

@Module({
  imports: [PrismaModule],
  providers: [ChatGateway, ChatService, OnlineStatusService],
  exports: [OnlineStatusService, ChatGateway],
})
export class ChatModule {}
