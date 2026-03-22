import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ChatGateway } from '../chat/chat.gateway'
import { OnlineStatusService } from '../chat/online-status.service'
import { PrismaService } from '../prisma/prisma.service'

type FriendRequestInput = {
  user_id?: number
  friend_id?: number
}

type AcceptByRequestIdInput = {
  current_user_id?: unknown
  request_id?: unknown
}

@Injectable()
export class FriendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onlineStatusService: OnlineStatusService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async sendFriendRequest(input: FriendRequestInput) {
    const user_id = Number(input.user_id)
    const friend_id = Number(input.friend_id)

    this.validateIds(user_id, friend_id)

    const { friend } = await this.ensureUsersExist(user_id, friend_id)
    if (friend.role_id !== 3) {
      throw new BadRequestException('chi co the ket ban voi hoc sinh (role_id = 3)')
    }

    const existingRequest = await this.prisma.ket_ban.findFirst({
      where: {
        OR: [
          { user_id, friend_id },
          { user_id: friend_id, friend_id: user_id },
        ],
      },
    })

    if (existingRequest) {
      throw new ConflictException('loi moi ket ban da ton tai')
    }

    const request = await this.prisma.ket_ban.create({
      data: {
        user_id,
        friend_id,
      },
    })

    this.chatGateway.emitToUser(friend_id, 'friend_request_received', {
      request_id: request.id,
      from_user_id: user_id,
    })
    this.chatGateway.emitToUser(user_id, 'friend_request_sent', {
      request_id: request.id,
      to_user_id: friend_id,
    })

    return {
      message: 'gui loi moi ket ban thanh cong',
      data: request,
    }
  }

  async acceptFriendRequest(input: FriendRequestInput) {
    const user_id = Number(input.user_id)
    const friend_id = Number(input.friend_id)

    this.validateIds(user_id, friend_id)

    const request = await this.prisma.ket_ban.findUnique({
      where: {
        user_id_friend_id: {
          user_id,
          friend_id,
        },
      },
    })

    if (!request) {
      throw new NotFoundException('khong tim thay loi moi ket ban')
    }

    if (request.trang_thai === 'accepted') {
      return {
        message: 'hai nguoi da la ban be',
        data: request,
      }
    }

    if (request.trang_thai !== 'pending') {
      throw new BadRequestException('chi co the chap nhan loi moi dang pending')
    }

    const updatedRequest = await this.prisma.ket_ban.update({
      where: {
        user_id_friend_id: {
          user_id,
          friend_id,
        },
      },
      data: {
        trang_thai: 'accepted',
      },
    })

    this.chatGateway.emitToUser(user_id, 'friend_request_accepted', {
      user_id,
      friend_id,
      request_id: updatedRequest.id,
    })
    this.chatGateway.emitToUser(friend_id, 'friend_request_accepted', {
      user_id,
      friend_id,
      request_id: updatedRequest.id,
    })

    return {
      message: 'chap nhan ket ban thanh cong',
      data: updatedRequest,
    }
  }

  async getPendingRequests(userIdInput: unknown) {
    const userId = Number(userIdInput)
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }

    const [incoming, outgoing] = await Promise.all([
      this.prisma.ket_ban.findMany({
        where: {
          friend_id: userId,
          trang_thai: 'pending',
        },
        orderBy: {
          id: 'desc',
        },
      }),
      this.prisma.ket_ban.findMany({
        where: {
          user_id: userId,
          trang_thai: 'pending',
        },
        orderBy: {
          id: 'desc',
        },
      }),
    ])

    const userIds = [
      ...new Set([
        ...incoming.map((item) => item.user_id),
        ...outgoing.map((item) => item.friend_id),
      ]),
    ]

    const users = await this.prisma.users.findMany({
      where: {
        id: {
          in: userIds,
        },
        role_id: 3,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar_url: true,
        role_id: true,
      },
    })

    const userMap = new Map(users.map((item) => [item.id, item]))

    return {
      user_id: userId,
      incoming: incoming
        .map((item) => {
          const requester = userMap.get(item.user_id)
          if (!requester) return null
          return {
            request_id: item.id,
            user_id: item.user_id,
            friend_id: item.friend_id,
            trang_thai: item.trang_thai,
            created_at: item.created_at,
            requester: {
              ...requester,
              is_online: this.onlineStatusService.isOnline(requester.id),
            },
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
      outgoing: outgoing
        .map((item) => {
          const receiver = userMap.get(item.friend_id)
          if (!receiver) return null
          return {
            request_id: item.id,
            user_id: item.user_id,
            friend_id: item.friend_id,
            trang_thai: item.trang_thai,
            created_at: item.created_at,
            receiver: {
              ...receiver,
              is_online: this.onlineStatusService.isOnline(receiver.id),
            },
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    }
  }

  async acceptFriendRequestById(input: AcceptByRequestIdInput) {
    const currentUserId = Number(input.current_user_id)
    const requestId = Number(input.request_id)

    if (!Number.isInteger(currentUserId) || currentUserId <= 0) {
      throw new BadRequestException('current_user_id khong hop le')
    }

    if (!Number.isInteger(requestId) || requestId <= 0) {
      throw new BadRequestException('request_id khong hop le')
    }

    const request = await this.prisma.ket_ban.findUnique({
      where: {
        id: requestId,
      },
    })

    if (!request) {
      throw new NotFoundException('khong tim thay loi moi ket ban')
    }

    if (request.friend_id !== currentUserId) {
      throw new BadRequestException('ban khong phai nguoi nhan loi moi nay')
    }

    if (request.trang_thai === 'accepted') {
      return {
        message: 'hai nguoi da la ban be',
        data: request,
      }
    }

    if (request.trang_thai !== 'pending') {
      throw new BadRequestException('chi co the chap nhan loi moi dang pending')
    }

    const updated = await this.prisma.ket_ban.update({
      where: {
        id: requestId,
      },
      data: {
        trang_thai: 'accepted',
      },
    })

    this.chatGateway.emitToUser(updated.user_id, 'friend_request_accepted', {
      user_id: updated.user_id,
      friend_id: updated.friend_id,
      request_id: updated.id,
    })
    this.chatGateway.emitToUser(updated.friend_id, 'friend_request_accepted', {
      user_id: updated.user_id,
      friend_id: updated.friend_id,
      request_id: updated.id,
    })

    return {
      message: 'chap nhan ket ban thanh cong',
      data: updated,
    }
  }

  async getFriendList(userIdInput: unknown) {
    const userId = Number(userIdInput)
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }

    const friendships = await this.prisma.ket_ban.findMany({
      where: {
        trang_thai: 'accepted',
        OR: [{ user_id: userId }, { friend_id: userId }],
      },
      orderBy: {
        id: 'desc',
      },
    })

    const friendIds = [
      ...new Set(
        friendships.map((item) => (item.user_id === userId ? item.friend_id : item.user_id)),
      ),
    ]

    const users = await this.prisma.users.findMany({
      where: {
        id: {
          in: friendIds,
        },
        role_id: 3,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar_url: true,
        role_id: true,
      },
    })

    const userMap = new Map(users.map((item) => [item.id, item]))

    const friends = friendIds
      .map((friendId) => {
        const person = userMap.get(friendId)
        if (!person) {
          return null
        }

        return {
          id: person.id,
          username: person.username,
          email: person.email,
          role_id: person.role_id,
          is_online: this.onlineStatusService.isOnline(person.id),
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return {
      user_id: userId,
      friends,
    }
  }

  async getSuggestions(userIdInput: unknown, limitInput?: unknown) {
    const userId = Number(userIdInput)
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }

    const limit = Number(limitInput ?? 10)
    if (!Number.isInteger(limit) || limit <= 0 || limit > 50) {
      throw new BadRequestException('limit khong hop le')
    }

    const relations = await this.prisma.ket_ban.findMany({
      where: {
        OR: [{ user_id: userId }, { friend_id: userId }],
      },
      select: {
        user_id: true,
        friend_id: true,
      },
    })

    const excludedUserIds = new Set<number>([userId])
    relations.forEach((item) => {
      excludedUserIds.add(item.user_id)
      excludedUserIds.add(item.friend_id)
    })

    const excludedList = [...excludedUserIds]

    const suggestions = await this.prisma.users.findMany({
      where: {
        id: {
          notIn: excludedList,
        },
        role_id: 3,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar_url: true,
        role_id: true,
      },
      take: Math.max(limit * 3, limit),
    })

    const shuffled = suggestions
      .map((item) => ({ item, sortKey: Math.random() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map((entry) => entry.item)
      .slice(0, limit)
      .map((item) => ({
        ...item,
        is_online: this.onlineStatusService.isOnline(item.id),
      }))

    return {
      user_id: userId,
      suggestions: shuffled,
    }
  }

  private validateIds(user_id: number, friend_id: number) {
    if (!Number.isInteger(user_id) || user_id <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }

    if (!Number.isInteger(friend_id) || friend_id <= 0) {
      throw new BadRequestException('friend_id khong hop le')
    }

    if (user_id === friend_id) {
      throw new BadRequestException('khong the ket ban voi chinh minh')
    }
  }

  private async ensureUsersExist(user_id: number, friend_id: number) {
    const [user, friend] = await Promise.all([
      this.prisma.users.findUnique({ where: { id: user_id } }),
      this.prisma.users.findUnique({ where: { id: friend_id } }),
    ])

    if (!user) {
      throw new NotFoundException('khong tim thay user gui loi moi')
    }

    if (!friend) {
      throw new NotFoundException('khong tim thay user nhan loi moi')
    }

    return { user, friend }
  }
}
