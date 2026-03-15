import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

type JoinChatInput = {
  user_id?: number
  friend_id?: number
}

type SendMessageInput = JoinChatInput & {
  noi_dung?: string
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  buildRoomId(user_id: number, friend_id: number) {
    const [a, b] = [user_id, friend_id].sort((x, y) => x - y)
    return `chat_${a}_${b}`
  }

  async getConversation(input: JoinChatInput) {
    const user_id = Number(input.user_id)
    const friend_id = Number(input.friend_id)

    this.validateIds(user_id, friend_id)
    await this.ensureUsersExist(user_id, friend_id)
    await this.ensureFriendshipAccepted(user_id, friend_id)

    const prismaClient = this.prisma as any

    const messages = await prismaClient.lich_su_chat.findMany({
      where: {
        OR: [
          { user_id, friend_id },
          { user_id: friend_id, friend_id: user_id },
        ],
      },
      orderBy: {
        id: 'desc',
      },
      take: 100,
    })

    return messages.reverse()
  }

  async sendMessage(input: SendMessageInput) {
    const user_id = Number(input.user_id)
    const friend_id = Number(input.friend_id)
    const noi_dung = input.noi_dung?.trim()

    this.validateIds(user_id, friend_id)
    if (!noi_dung) {
      throw new BadRequestException('noi_dung la bat buoc')
    }

    await this.ensureUsersExist(user_id, friend_id)
    await this.ensureFriendshipAccepted(user_id, friend_id)

    const prismaClient = this.prisma as any

    return prismaClient.lich_su_chat.create({
      data: {
        user_id,
        friend_id,
        noi_dung,
      },
    })
  }

  private validateIds(user_id: number, friend_id: number) {
    if (!Number.isInteger(user_id) || user_id <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }

    if (!Number.isInteger(friend_id) || friend_id <= 0) {
      throw new BadRequestException('friend_id khong hop le')
    }

    if (user_id === friend_id) {
      throw new BadRequestException('khong the nhan tin voi chinh minh')
    }
  }

  private async ensureUsersExist(user_id: number, friend_id: number) {
    const [user, friend] = await Promise.all([
      this.prisma.users.findUnique({ where: { id: user_id } }),
      this.prisma.users.findUnique({ where: { id: friend_id } }),
    ])

    if (!user) {
      throw new NotFoundException('khong tim thay user gui')
    }

    if (!friend) {
      throw new NotFoundException('khong tim thay user nhan')
    }
  }

  private async ensureFriendshipAccepted(user_id: number, friend_id: number) {
    const friendship = await this.prisma.ket_ban.findFirst({
      where: {
        trang_thai: 'accepted',
        OR: [
          { user_id, friend_id },
          { user_id: friend_id, friend_id: user_id },
        ],
      },
    })

    if (!friendship) {
      throw new ForbiddenException('hai nguoi chua la ban be')
    }
  }
}
