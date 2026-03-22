import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

type SaveExperienceInput = {
  user_id?: unknown
  exp?: unknown
}

@Injectable()
export class ExperienceService {
  constructor(private readonly prisma: PrismaService) {}

  private get diemKinhNghiemModel() {
    return (this.prisma as any).diem_kinh_nghiem
  }

  private normalizeUserId(userId: unknown, { required = false }: { required?: boolean } = {}) {
    if (userId === undefined || userId === null || userId === '') {
      if (required) {
        throw new BadRequestException('user_id la bat buoc')
      }
      return undefined
    }

    const parsed = Number(userId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('user_id khong hop le')
    }
    return parsed
  }

  private normalizeExp(exp: unknown, { required = false }: { required?: boolean } = {}) {
    if (exp === undefined || exp === null || exp === '') {
      if (required) {
        throw new BadRequestException('exp la bat buoc')
      }
      return undefined
    }

    const parsed = Number(exp)
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException('exp phai la so nguyen >= 0')
    }
    return parsed
  }

  private async getExperienceOrThrow(id: number) {
    const record = await this.diemKinhNghiemModel.findUnique({
      where: { id },
    })

    if (!record) {
      throw new NotFoundException('Khong tim thay diem_kinh_nghiem')
    }

    return record
  }

  private checkWritable(recordUserId: number, currentUserId?: number) {
    if (currentUserId === undefined) {
      return
    }

    if (recordUserId !== currentUserId) {
      throw new ForbiddenException('Ban khong co quyen quan ly ban ghi nay')
    }
  }

  async findAll(userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)

    return this.diemKinhNghiemModel.findMany({
      where: parsedUserId === undefined ? undefined : { user_id: parsedUserId },
      orderBy: {
        id: 'desc',
      },
    })
  }

  async findOne(id: number, userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)
    const record = await this.getExperienceOrThrow(id)
    this.checkWritable(record.user_id, parsedUserId)
    return record
  }

  async create(input: SaveExperienceInput) {
    const userId = this.normalizeUserId(input.user_id, { required: true })
    const exp = this.normalizeExp(input.exp, { required: true })

    return this.diemKinhNghiemModel.create({
      data: {
        user_id: userId,
        exp,
      },
    })
  }

  async update(id: number, input: SaveExperienceInput) {
    const currentUserId = this.normalizeUserId(input.user_id)
    const exp = this.normalizeExp(input.exp, { required: true })
    const record = await this.getExperienceOrThrow(id)
    this.checkWritable(record.user_id, currentUserId)

    return this.diemKinhNghiemModel.update({
      where: { id },
      data: { exp },
    })
  }

  async remove(id: number, userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)
    const record = await this.getExperienceOrThrow(id)
    this.checkWritable(record.user_id, parsedUserId)

    await this.diemKinhNghiemModel.delete({
      where: { id },
    })

    return {
      message: 'Da xoa diem_kinh_nghiem',
      id,
    }
  }
}
