import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'

type RegisterInput = {
  username?: string
  email?: string
  password?: string
}

type LoginInput = {
  username?: string
  password?: string
}

type ChangePasswordInput = {
  old_password?: string
  new_password?: string
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput) {
    const username = input.username?.trim()
    const email = input.email?.trim()
    const password = input.password

    if (!username || !password) {
      throw new BadRequestException('username va password la bat buoc')
    }

    const existingUser = await this.prisma.users.findUnique({
      where: { username },
    })

    if (existingUser) {
      throw new ConflictException('username da ton tai')
    }

    const password_hash = await hash(password, 10)

    const user = await this.prisma.users.create({
      data: {
        username,
        email: email || null,
        password_hash,
        role_id: 3,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
        created_at: true,
      },
    })

    return {
      message: 'dang ky thanh cong',
      user,
    }
  }

  async login(input: LoginInput) {
    const username = input.username?.trim()
    const password = input.password

    if (!username || !password) {
      throw new BadRequestException('username va password la bat buoc')
    }

    const user = await this.prisma.users.findUnique({
      where: { username },
    })

    if (!user?.password_hash) {
      throw new UnauthorizedException('thong tin dang nhap khong dung')
    }

    const isValidPassword = await compare(password, user.password_hash)

    if (!isValidPassword) {
      throw new UnauthorizedException('thong tin dang nhap khong dung')
    }

    const access_token = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role_id: user.role_id,
    })

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
      },
    }
  }

  async getMe(userId?: number) {
    if (!userId) {
      throw new UnauthorizedException('token khong hop le')
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
        created_at: true,
      },
    })

    if (!user) {
      throw new NotFoundException('khong tim thay nguoi dung')
    }

    return { user }
  }

  async getProfileSummary(userId?: number) {
    if (!userId) {
      throw new UnauthorizedException('token khong hop le')
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
        created_at: true,
      },
    })

    if (!user) {
      throw new NotFoundException('khong tim thay nguoi dung')
    }

    const [historyList, diemStats, practiceDistinct] = await Promise.all([
      this.prisma.lich_su_hoc.findMany({
        where: {
          user_id: userId,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 50,
        include: {
          luyen_tap_dich: {
            select: {
              id: true,
              level: true,
              topic_ids: true,
            },
          },
        },
      }),
      this.prisma.lich_su_hoc.aggregate({
        where: {
          user_id: userId,
        },
        _sum: {
          diem: true,
        },
      }),
      this.prisma.lich_su_hoc.findMany({
        where: {
          user_id: userId,
        },
        distinct: ['luyen_tap_dich_id'],
        select: {
          luyen_tap_dich_id: true,
        },
      }),
    ])

    return {
      user,
      stats: {
        so_bai_luyen_tap: practiceDistinct.length,
        tong_diem_kinh_nghiem: Number((diemStats._sum.diem ?? 0).toFixed(2)),
      },
      history: historyList.map((item) => ({
        id: item.id,
        created_at: item.created_at,
        luyen_tap_dich_id: item.luyen_tap_dich_id,
        tong_so_cau: item.tong_so_cau,
        so_cau_dung: item.so_cau_dung,
        diem: item.diem,
        level: item.luyen_tap_dich.level,
        topic_ids: item.luyen_tap_dich.topic_ids,
      })),
    }
  }

  async changePassword(userId: number | undefined, input: ChangePasswordInput) {
    if (!userId) {
      throw new UnauthorizedException('token khong hop le')
    }

    const oldPassword = input.old_password?.trim()
    const newPassword = input.new_password?.trim()

    if (!oldPassword || !newPassword) {
      throw new BadRequestException('old_password va new_password la bat buoc')
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('new_password phai co it nhat 6 ky tu')
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('new_password phai khac old_password')
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password_hash: true,
      },
    })

    if (!user?.password_hash) {
      throw new NotFoundException('khong tim thay nguoi dung')
    }

    const isValidOldPassword = await compare(oldPassword, user.password_hash)
    if (!isValidOldPassword) {
      throw new UnauthorizedException('mat khau cu khong dung')
    }

    const newPasswordHash = await hash(newPassword, 10)
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        password_hash: newPasswordHash,
      },
    })

    return {
      message: 'doi mat khau thanh cong',
    }
  }
}
