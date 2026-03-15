import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TopicsService {

    constructor(private prisma: PrismaService) {}

    // lấy toàn bộ topic
    async findAll() {
        return this.prisma.chu_de.findMany({
            orderBy: {
                id: 'asc',
            },
        })
    }

    // lấy 1 topic theo id
    async findOne(id: number) {
        return this.prisma.chu_de.findUnique({
            where: {
                id: id
            }
        })
    }

    // tạo topic mới
    async create(data: {
        ten_chu_de: string
        mo_ta?: string
        created_by?: number
    }) {
        return this.prisma.chu_de.create({
            data
        })
    }

    // update topic
    async update(id: number, data: {
        ten_chu_de?: string
        mo_ta?: string
    }) {
        return this.prisma.chu_de.update({
            where: { id },
            data
        })
    }

    // delete topic
    async remove(id: number) {
        return this.prisma.chu_de.delete({
            where: { id }
        })
    }

}