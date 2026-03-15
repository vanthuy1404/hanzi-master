import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

type FriendRequestInput = {
  user_id?: number
  friend_id?: number
}

@Injectable()
export class FriendService {
  constructor(private readonly prisma: PrismaService) {}

  async sendFriendRequest(input: FriendRequestInput) {
    const user_id = Number(input.user_id)
    const friend_id = Number(input.friend_id)

    this.validateIds(user_id, friend_id)

    await this.ensureUsersExist(user_id, friend_id)

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

    return {
      message: 'chap nhan ket ban thanh cong',
      data: updatedRequest,
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
  }
}
