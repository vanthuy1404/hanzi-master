import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'

@Module({
  imports: [PrismaModule],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
