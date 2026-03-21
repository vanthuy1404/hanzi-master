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
import { OnlineStatusService } from './online-status.service'

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

  constructor(
    private readonly chatService: ChatService,
    private readonly onlineStatusService: OnlineStatusService,
  ) {}

  afterInit() {
    // noop
  }

  emitToUser(userId: number, event: string, data: unknown) {
    this.server.to(`user_${userId}`).emit(event, data)
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.data?.user_id)
    if (Number.isInteger(userId) && userId > 0) {
      this.onlineStatusService.markOffline(userId)
      this.server.emit('presence_changed', { user_id: userId, is_online: false })
    }
  }

  @SubscribeMessage('register_user')
  handleRegisterUser(
    @MessageBody() payload: { user_id?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = Number(payload?.user_id)
    if (!Number.isInteger(userId) || userId <= 0) {
      return {
        event: 'register_failed',
        data: { message: 'user_id khong hop le' },
      }
    }

    const prevUserId = Number(client.data?.user_id)
    if (Number.isInteger(prevUserId) && prevUserId > 0 && prevUserId !== userId) {
      this.onlineStatusService.markOffline(prevUserId)
      this.server.emit('presence_changed', { user_id: prevUserId, is_online: false })
    }

    client.data.user_id = userId
    client.join(`user_${userId}`)
    this.onlineStatusService.markOnline(userId)
    this.server.emit('presence_changed', { user_id: userId, is_online: true })

    return {
      event: 'registered_user',
      data: { user_id: userId },
    }
  }

  @SubscribeMessage('join_chat')
  async handleJoinChat(
    @MessageBody() payload: JoinChatPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const user_id = Number(payload.user_id)
    const friend_id = Number(payload.friend_id)
    if (Number.isInteger(user_id) && user_id > 0 && !client.data?.user_id) {
      client.data.user_id = user_id
      this.onlineStatusService.markOnline(user_id)
      this.server.emit('presence_changed', { user_id, is_online: true })
    }
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
