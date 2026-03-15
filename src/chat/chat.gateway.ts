import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { ChatService } from './chat.service'

type JoinChatPayload = {
  user_id?: number
  friend_id?: number
}

type SendMessagePayload = JoinChatPayload & {
  noi_dung?: string
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server

  constructor(private readonly chatService: ChatService) {}

  afterInit() {
    // noop
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @MessageBody() payload: JoinChatPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const user_id = Number(payload.user_id)
    const friend_id = Number(payload.friend_id)
    const room = this.chatService.buildRoomId(user_id, friend_id)

    client.join(room)

    const messages = await this.chatService.getConversation({
      user_id,
      friend_id,
    })

    client.emit('chat_history', {
      room,
      messages,
    })

    return {
      event: 'joined_chat',
      data: { room },
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(@MessageBody() payload: SendMessagePayload) {
    const message = await this.chatService.sendMessage(payload)
    const room = this.chatService.buildRoomId(message.user_id, message.friend_id)

    this.server.to(room).emit('new_message', message)

    return {
      event: 'message_sent',
      data: message,
    }
  }
}
