import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcryptjs'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
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

type AvatarUploadFile = {
  filename: string
  mimetype?: string
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
        avatar_url: true,
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
        avatar_url: user.avatar_url,
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
        avatar_url: true,
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
        avatar_url: true,
        role_id: true,
        created_at: true,
      },
    })

    if (!user) {
      throw new NotFoundException('khong tim thay nguoi dung')
    }

    const [historyList, expStats, tongSoBaiDaLam] = await Promise.all([
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
          sap_xep_cau: {
            select: {
              id: true,
              topic_ids: true,
            },
          },
        },
      }),
      this.prisma.diem_kinh_nghiem.aggregate({
        where: {
          user_id: userId,
        },
        _sum: {
          exp: true,
        },
      }),
      this.prisma.lich_su_hoc.count({
        where: {
          user_id: userId,
        },
      }),
    ])

    return {
      user,
      stats: {
        so_bai_luyen_tap: tongSoBaiDaLam,
        tong_diem_kinh_nghiem: expStats._sum.exp ?? 0,
      },
      history: historyList
        .map((item) => {
          if (item.luyen_tap_dich_id && item.luyen_tap_dich) {
            return {
              id: item.id,
              created_at: item.created_at,
              loai_bai: 'luyen_tap_dich',
              bai_tap_id: item.luyen_tap_dich_id,
              tong_so_cau: item.tong_so_cau,
              so_cau_dung: item.so_cau_dung,
              diem: item.diem,
              level: item.luyen_tap_dich.level,
              topic_ids: item.luyen_tap_dich.topic_ids,
            }
          }

          if (item.sap_xep_cau_id && item.sap_xep_cau) {
            return {
              id: item.id,
              created_at: item.created_at,
              loai_bai: 'sap_xep_cau',
              bai_tap_id: item.sap_xep_cau_id,
              tong_so_cau: item.tong_so_cau,
              so_cau_dung: item.so_cau_dung,
              diem: item.diem,
              level: null,
              topic_ids: item.sap_xep_cau.topic_ids,
            }
          }

          return null
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
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

  async uploadAvatar(userId: number | undefined, avatarFile?: AvatarUploadFile) {
    if (!userId) {
      throw new UnauthorizedException('token khong hop le')
    }

    if (!avatarFile) {
      throw new BadRequestException('vui long chon file anh')
    }

    const mime = (avatarFile.mimetype || '').toLowerCase()
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(mime)) {
      throw new BadRequestException('chi ho tro anh jpg, png hoac webp')
    }

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar_url: true,
        role_id: true,
        created_at: true,
      },
    })

    if (!user) {
      throw new NotFoundException('khong tim thay nguoi dung')
    }

    const avatarUrl = `/public/avatars/${avatarFile.filename}`
    const updatedUser = await this.prisma.users.update({
      where: { id: userId },
      data: {
        avatar_url: avatarUrl,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar_url: true,
        role_id: true,
        created_at: true,
      },
    })

    if (user.avatar_url?.startsWith('/public/avatars/')) {
      const oldFileName = user.avatar_url.replace('/public/avatars/', '')
      const oldFilePath = join(process.cwd(), 'public', 'avatars', oldFileName)
      if (existsSync(oldFilePath)) {
        unlinkSync(oldFilePath)
      }
    }

    return {
      message: 'cap nhat avatar thanh cong',
      user: updatedUser,
    }
  }
}
