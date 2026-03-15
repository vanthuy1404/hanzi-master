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
}
