import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  private normalizeUserId(userId: unknown, { required = false }: { required?: boolean } = {}) {
    if (userId === undefined || userId === null || userId === '') {
      if (required) {
        throw new BadRequestException('user_id la bat buoc')
      }
      return undefined
    }

    if (userId === 'null') {
      return null
    }

    const parsed = Number(userId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }
    return parsed
  }

  private async getTopicOrThrow(id: number) {
    const topic = await this.prisma.chu_de.findUnique({
      where: { id },
    })
    if (!topic) {
      throw new NotFoundException('Khong tim thay chu de')
    }
    return topic
  }

  private checkTopicReadable(topicUserId: number | null, userId?: number | null) {
    if (topicUserId === null) {
      return
    }

    if (userId === undefined || userId === null || topicUserId !== userId) {
      throw new ForbiddenException('Ban khong co quyen xem chu de nay')
    }
  }

  private checkTopicWritable(topicUserId: number | null, userId?: number | null) {
    if (topicUserId === null) {
      throw new ForbiddenException('Khong duoc sua chu de chung')
    }

    if (userId === undefined || userId === null || topicUserId !== userId) {
      throw new ForbiddenException('Ban khong co quyen quan ly chu de nay')
    }
  }

  // lấy toàn bộ topic
  async findAll(userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)

    return this.prisma.chu_de.findMany({
      where:
        parsedUserId === undefined
          ? { user_id: null }
          : {
              OR: [{ user_id: null }, { user_id: parsedUserId }],
            },
      orderBy: {
        id: 'asc',
      },
    })
  }

  // lấy 1 topic theo id
  async findOne(id: number, userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)
    const topic = await this.getTopicOrThrow(id)
    this.checkTopicReadable(topic.user_id, parsedUserId)
    return topic
  }

  // tạo topic mới
  async create(data: {
    ten_chu_de: string
    mo_ta?: string
    user_id?: number | null
  }) {
    const normalizedUserId = this.normalizeUserId(data.user_id)

    return this.prisma.chu_de.create({
      data: {
        ten_chu_de: data.ten_chu_de,
        mo_ta: data.mo_ta,
        user_id: normalizedUserId ?? null,
      },
    })
  }

  // update topic
  async update(
    id: number,
    data: {
      ten_chu_de?: string
      mo_ta?: string
    },
    userId: unknown,
  ) {
    const parsedUserId = this.normalizeUserId(userId, { required: true })
    const topic = await this.getTopicOrThrow(id)
    this.checkTopicWritable(topic.user_id, parsedUserId)

    return this.prisma.chu_de.update({
      where: { id },
      data,
    })
  }

  // delete topic
  async remove(id: number, userId: unknown) {
    const parsedUserId = this.normalizeUserId(userId, { required: true })
    const topic = await this.getTopicOrThrow(id)
    this.checkTopicWritable(topic.user_id, parsedUserId)

    return this.prisma.chu_de.delete({
      where: { id },
    })
  }
}
