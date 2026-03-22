import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import * as XLSX from 'xlsx'

type VocabularyInputItem = {
  hanzi: string
  pinyin?: string
  pinyin_plain?: string
  nghia_vi?: string
  nghia_en?: string
  example_cn?: string
  example_vi?: string
}

type GenerateVocabularyInput = {
  chu_de_id?: unknown
  so_luong?: unknown
  user_id?: unknown
}

type RandomVocabularyInput = {
  chu_de_id?: unknown
  so_luong?: unknown
  user_id?: unknown
}

type GenerateVocabularyResult = {
  items?: unknown
}

@Injectable()
export class VocabulariesService {
  private readonly promptCode = 'prompt-tu-vung'
  private readonly promptLevel = 'mac_dinh'

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private normalizeString(value: unknown) {
    if (value === undefined || value === null) {
      return undefined
    }

    const result = String(value).trim()
    return result.length > 0 ? result : undefined
  }

  private normalizeTopicId(chuDeId: unknown) {
    const parsed = Number(chuDeId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('chu_de_id khong hop le')
    }
    return parsed
  }

  private normalizeGenerateCount(value: unknown) {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100) {
      throw new BadRequestException('so_luong phai la so nguyen trong khoang 1..100')
    }
    return parsed
  }

  private normalizeRandomCount(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return 10
    }
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 500) {
      throw new BadRequestException('so_luong phai la so nguyen trong khoang 1..500')
    }
    return parsed
  }

  private normalizeOptionalTopicId(chuDeId: unknown) {
    if (chuDeId === undefined || chuDeId === null || chuDeId === '') {
      return undefined
    }
    return this.normalizeTopicId(chuDeId)
  }

  private normalizePositiveInt(
    value: unknown,
    {
      fallback,
      min,
      max,
      field,
    }: {
      fallback: number
      min: number
      max: number
      field: string
    },
  ) {
    if (value === undefined || value === null || value === '') {
      return fallback
    }

    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(`${field} khong hop le`)
    }

    return parsed
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

  private async ensureWritableTopic(chuDeId: number, userId?: number) {
    const topic = await this.prisma.chu_de.findUnique({
      where: { id: chuDeId },
      select: {
        id: true,
        user_id: true,
      },
    })

    if (!topic) {
      throw new NotFoundException('Khong tim thay chu de')
    }

    if (topic.user_id !== null && topic.user_id !== userId) {
      throw new ForbiddenException('Ban khong co quyen them tu vung vao chu de nay')
    }

    return topic
  }

  private normalizeBulkItem(item: VocabularyInputItem, chuDeId: number) {
    return {
      hanzi: this.normalizeString(item.hanzi),
      pinyin: this.normalizeString(item.pinyin),
      pinyin_plain: this.normalizeString(item.pinyin_plain),
      nghia_vi: this.normalizeString(item.nghia_vi),
      nghia_en: this.normalizeString(item.nghia_en),
      example_cn: this.normalizeString(item.example_cn),
      example_vi: this.normalizeString(item.example_vi),
      chu_de_id: chuDeId,
    }
  }

  private async findExistingByHanziOrPinyinInOwnerScope(
    hanzi: string | undefined,
    pinyin: string | undefined,
    ownerUserId: number | null,
  ) {
    const conditions: Array<{ hanzi?: string; pinyin?: string }> = []

    if (hanzi) {
      conditions.push({ hanzi })
    }
    if (pinyin) {
      conditions.push({ pinyin })
    }

    if (!conditions.length) {
      return null
    }

    return this.prisma.tu_vung.findFirst({
      where: {
        AND: [
          {
            OR: conditions,
          },
          {
            chu_de: {
              is: {
                user_id: ownerUserId,
              },
            },
          },
        ],
      },
    })
  }

  private normalizeHeader(value: unknown) {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
  }

  private mapHeaderToField(header: string) {
    const normalized = this.normalizeHeader(header)
    const map: Record<string, keyof VocabularyInputItem> = {
      hanzi: 'hanzi',
      pinyin: 'pinyin',
      pinyin_plain: 'pinyin_plain',
      nghia_vi: 'nghia_vi',
      nghia_en: 'nghia_en',
      example_cn: 'example_cn',
      example_vi: 'example_vi',
    }
    return map[normalized]
  }

  private parseVocabularyItemsFromExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      throw new BadRequestException('File excel khong co sheet')
    }

    const sheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
    })

    if (!rows.length) {
      throw new BadRequestException('File excel rong')
    }

    const headerRow = rows[0]
    const headerMap = headerRow.map((header) => this.mapHeaderToField(String(header)))

    if (!headerMap.some((field) => field === 'hanzi')) {
      throw new BadRequestException('Thieu cot hanzi trong header')
    }

    const items: VocabularyInputItem[] = []

    rows.slice(1).forEach((row) => {
      const item: Partial<VocabularyInputItem> = {}

      row.forEach((cell, columnIndex) => {
        const field = headerMap[columnIndex]
        if (!field) {
          return
        }
        item[field] = this.normalizeString(cell)
      })

      const hasData = Object.values(item).some((value) => value !== undefined)
      if (hasData) {
        items.push(item as VocabularyInputItem)
      }
    })

    return items
  }

  async findAll(userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)

    return this.prisma.tu_vung.findMany({
      where:
        parsedUserId === undefined
          ? {
              chu_de: {
                is: {
                  user_id: null,
                },
              },
            }
          : {
              chu_de: {
                is: {
                  OR: [{ user_id: null }, { user_id: parsedUserId }],
                },
              },
            },
      orderBy: {
        id: 'asc',
      },
    })
  }

  private cleanGeminiText(rawText: string) {
    return rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  }

  private async ensureReadableTopic(chuDeId: number, userId?: number) {
    const topic = await this.prisma.chu_de.findUnique({
      where: { id: chuDeId },
      select: {
        id: true,
        user_id: true,
        ten_chu_de: true,
        mo_ta: true,
      },
    })

    if (!topic) {
      throw new NotFoundException('Khong tim thay chu de')
    }

    if (topic.user_id !== null && topic.user_id !== userId) {
      throw new ForbiddenException('Ban khong co quyen truy cap chu de nay')
    }

    return topic
  }

  private buildGeneratePrompt(input: {
    basePrompt: string
    topicName: string
    topicDescription: string
    soLuong: number
    existingHanziList: string[]
  }) {
    const existingLines = input.existingHanziList
      .slice(0, 300)
      .map((hanzi, index) => `${index + 1}. ${hanzi}`)

    return [
      input.basePrompt,
      `Chu de: ${input.topicName || 'Khong ro ten chu de'}.`,
      `Mo ta chu de: ${input.topicDescription || 'Khong co mo ta'}.`,
      `Hay tao dung ${input.soLuong} tu vung moi lien quan den chu de.`,
      'Khong duoc tao trung voi cac tu da co san theo hanzi hoac pinyin_plain.',
      'Tra ve DUY NHAT JSON theo dinh dang: {"items":[{"hanzi":"...","pinyin":"...","pinyin_plain":"...","nghia_vi":"...","nghia_en":"...","example_cn":"...","example_vi":"..."}]}. Khong them text nao ben ngoai JSON.',
      'Yeu cau du lieu:',
      '- hanzi bat buoc co.',
      '- pinyin co dau thanh, pinyin_plain viet thuong khong dau.',
      '- nghia_vi ngan gon, de hieu.',
      '- nghia_en, example_cn, example_vi co the de rong neu khong can.',
      'Danh sach hanzi da co trong chu de (chi de tranh lap):',
      ...existingLines,
    ].join('\n')
  }

  private getFallbackPromptTemplate() {
    return 'Ban la tro ly tao du lieu tu vung tieng Trung theo chu de cho nguoi hoc tieng Trung.'
  }

  private async getPromptTemplate() {
    const prompt = await this.prisma.danh_muc_prompt.findFirst({
      where: {
        ma: this.promptCode,
        level: this.promptLevel,
      },
      select: {
        noi_dung: true,
      },
    })

    return prompt?.noi_dung?.trim() || this.getFallbackPromptTemplate()
  }

  private normalizeGeneratedItems(payload: unknown, soLuong: number) {
    const items = (payload as GenerateVocabularyResult)?.items
    if (!Array.isArray(items) || !items.length) {
      throw new InternalServerErrorException('AI khong tra ve danh sach items hop le')
    }

    const normalized = items
      .map((item) => ({
        hanzi: this.normalizeString((item as VocabularyInputItem)?.hanzi),
        pinyin: this.normalizeString((item as VocabularyInputItem)?.pinyin),
        pinyin_plain: this.normalizeString((item as VocabularyInputItem)?.pinyin_plain)?.toLowerCase(),
        nghia_vi: this.normalizeString((item as VocabularyInputItem)?.nghia_vi),
        nghia_en: this.normalizeString((item as VocabularyInputItem)?.nghia_en),
        example_cn: this.normalizeString((item as VocabularyInputItem)?.example_cn),
        example_vi: this.normalizeString((item as VocabularyInputItem)?.example_vi),
      }))
      .filter((item) => item.hanzi)

    if (!normalized.length) {
      throw new InternalServerErrorException('Khong co tu vung hop le sau khi xu ly response tu AI')
    }

    return normalized.slice(0, soLuong)
  }

  private async generateByGemini(prompt: string) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim()
    const apiUrl =
      this.configService.get<string>('GEMINI_API_URL')?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

    if (!apiKey) {
      throw new InternalServerErrorException('Thieu GEMINI_API_KEY trong env')
    }

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    const responseText = await response.text()
    if (!response.ok) {
      throw new InternalServerErrorException(`Gemini API loi (${response.status}): ${responseText}`)
    }

    let parsedApiResponse: any
    try {
      parsedApiResponse = JSON.parse(responseText)
    } catch (error) {
      throw new InternalServerErrorException(`Khong parse duoc JSON tu Gemini: ${String(error)}`)
    }

    const rawText = parsedApiResponse?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText || typeof rawText !== 'string') {
      throw new InternalServerErrorException('Gemini response khong dung dinh dang text')
    }

    const cleaned = this.cleanGeminiText(rawText)
    try {
      return JSON.parse(cleaned)
    } catch (error) {
      throw new InternalServerErrorException(
        `Khong parse duoc JSON tu AI generate vocab: ${String(error)} - raw: ${cleaned}`,
      )
    }
  }

  async findFlashCards(input: {
    user_id?: unknown
    chu_de_id?: unknown
    page?: unknown
    page_size?: unknown
  }) {
    const parsedUserId = this.normalizeUserId(input.user_id)
    const topicId = this.normalizeOptionalTopicId(input.chu_de_id)
    const page = this.normalizePositiveInt(input.page, {
      fallback: 1,
      min: 1,
      max: 100000,
      field: 'page',
    })
    const pageSize = this.normalizePositiveInt(input.page_size, {
      fallback: 9,
      min: 1,
      max: 60,
      field: 'page_size',
    })

    if (topicId !== undefined) {
      const topic = await this.prisma.chu_de.findUnique({
        where: { id: topicId },
        select: { id: true, user_id: true },
      })

      if (!topic) {
        throw new NotFoundException('Khong tim thay chu de')
      }

      if (topic.user_id !== null && topic.user_id !== parsedUserId) {
        throw new ForbiddenException('Ban khong co quyen truy cap chu de nay')
      }
    }

    const where =
      parsedUserId === undefined
        ? {
            ...(topicId !== undefined ? { chu_de_id: topicId } : {}),
            chu_de: {
              is: {
                user_id: null,
              },
            },
          }
        : {
            ...(topicId !== undefined ? { chu_de_id: topicId } : {}),
            chu_de: {
              is: {
                OR: [{ user_id: null }, { user_id: parsedUserId }],
              },
            },
          }

    const [totalItems, items] = await Promise.all([
      this.prisma.tu_vung.count({ where }),
      this.prisma.tu_vung.findMany({
        where,
        orderBy: {
          id: 'asc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: totalPages,
      },
    }
  }

  async findRandomByTopic(input: RandomVocabularyInput) {
    const topicId = this.normalizeTopicId(input.chu_de_id)
    const soLuong = this.normalizeRandomCount(input.so_luong)
    const parsedUserId = this.normalizeUserId(input.user_id)

    await this.ensureReadableTopic(topicId, parsedUserId)

    const vocabularies = await this.prisma.tu_vung.findMany({
      where: {
        chu_de_id: topicId,
      },
      orderBy: {
        id: 'asc',
      },
    })

    if (!vocabularies.length) {
      return []
    }

    const shuffled = [...vocabularies]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled.slice(0, Math.min(soLuong, shuffled.length))
  }

  async findOne(id: number, userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)
    const vocabulary = await this.prisma.tu_vung.findUnique({
      where: {
        id,
      },
      include: {
        chu_de: {
          select: {
            user_id: true,
          },
        },
      },
    })

    if (!vocabulary) {
      throw new NotFoundException('Khong tim thay tu vung')
    }

    const topicUserId = vocabulary.chu_de?.user_id
    if (topicUserId !== null && topicUserId !== undefined && topicUserId !== parsedUserId) {
      throw new ForbiddenException('Ban khong co quyen xem tu vung nay')
    }

    return vocabulary
  }

  async create(data: {
    hanzi: string
    pinyin?: string
    pinyin_plain?: string
    nghia_vi?: string
    nghia_en?: string
    example_cn?: string
    example_vi?: string
    chu_de_id?: number
    user_id?: number
  }) {
    const normalizedHanzi = this.normalizeString(data.hanzi)
    const normalizedPinyin = this.normalizeString(data.pinyin)

    if (!normalizedHanzi) {
      throw new BadRequestException('hanzi la bat buoc')
    }

    const topicId = this.normalizeTopicId(data.chu_de_id)
    const userId = this.normalizeUserId(data.user_id)
    const topic = await this.ensureWritableTopic(topicId, userId)

    const existing = await this.findExistingByHanziOrPinyinInOwnerScope(
      normalizedHanzi,
      normalizedPinyin,
      topic.user_id,
    )
    if (existing) {
      return {
        inserted: false,
        message: 'Tu vung da ton tai trong pham vi chu de cua user',
        existed: existing,
      }
    }

    return this.prisma.tu_vung.create({
      data: {
        hanzi: normalizedHanzi,
        pinyin: normalizedPinyin,
        pinyin_plain: this.normalizeString(data.pinyin_plain),
        nghia_vi: this.normalizeString(data.nghia_vi),
        nghia_en: this.normalizeString(data.nghia_en),
        example_cn: this.normalizeString(data.example_cn),
        example_vi: this.normalizeString(data.example_vi),
        chu_de_id: topicId,
      },
    })
  }

  async createBulk(data: VocabularyInputItem[], chuDeId: unknown, userId?: unknown) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new BadRequestException('Danh sach tu vung trong')
    }

    const topicId = this.normalizeTopicId(chuDeId)
    const parsedUserId = this.normalizeUserId(userId)
    const topic = await this.ensureWritableTopic(topicId, parsedUserId)
    const normalizedData = data
      .map((item) => this.normalizeBulkItem(item, topicId))
      .filter((item) => item.hanzi !== undefined)

    if (!normalizedData.length) {
      throw new BadRequestException('Khong co dong hop le de insert')
    }

    const hanziList = [
      ...new Set(
        normalizedData
          .map((item) => item.hanzi)
          .filter((value): value is string => value !== undefined),
      ),
    ]
    const pinyinList = [
      ...new Set(
        normalizedData
          .map((item) => item.pinyin)
          .filter((value): value is string => value !== undefined),
      ),
    ]

    const existingList = await this.prisma.tu_vung.findMany({
      where: {
        AND: [
          {
            OR: [{ hanzi: { in: hanziList } }, { pinyin: { in: pinyinList } }],
          },
          {
            chu_de: {
              is: {
                user_id: topic.user_id,
              },
            },
          },
        ],
      },
      select: {
        hanzi: true,
        pinyin: true,
      },
    })

    const existingHanziSet = new Set(
      existingList.map((item) => item.hanzi).filter((value): value is string => Boolean(value)),
    )
    const existingPinyinSet = new Set(
      existingList.map((item) => item.pinyin).filter((value): value is string => Boolean(value)),
    )

    const uniqueHanziSet = new Set<string>()
    const uniquePinyinSet = new Set<string>()
    const dataToInsert = normalizedData.filter((item) => {
      if (!item.hanzi || existingHanziSet.has(item.hanzi) || uniqueHanziSet.has(item.hanzi)) {
        return false
      }

      if (item.pinyin && (existingPinyinSet.has(item.pinyin) || uniquePinyinSet.has(item.pinyin))) {
        return false
      }

      uniqueHanziSet.add(item.hanzi)
      if (item.pinyin) {
        uniquePinyinSet.add(item.pinyin)
      }
      return true
    })

    if (!dataToInsert.length) {
      return {
        count: 0,
        skipped: normalizedData.length,
      }
    }

    const result = await this.prisma.tu_vung.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    })

    return {
      ...result,
      skipped: normalizedData.length - result.count,
    }
  }

  async createBulkFromExcel(file: { buffer?: Buffer } | undefined, chuDeId: unknown, userId?: unknown) {
    if (!file?.buffer) {
      throw new BadRequestException('Vui long gui file excel')
    }

    const items = this.parseVocabularyItemsFromExcel(file.buffer)
    return this.createBulk(items, chuDeId, userId)
  }

  async generateByAi(input: GenerateVocabularyInput) {
    const topicId = this.normalizeTopicId(input.chu_de_id)
    const soLuong = this.normalizeGenerateCount(input.so_luong)
    const parsedUserId = this.normalizeUserId(input.user_id)

    const topic = await this.ensureReadableTopic(topicId, parsedUserId)
    const existingItems = await this.prisma.tu_vung.findMany({
      where: { chu_de_id: topicId },
      select: {
        hanzi: true,
        pinyin_plain: true,
      },
      orderBy: { id: 'asc' },
      take: 500,
    })
    const existingHanziList = [
      ...new Set(
        existingItems.map((item) => (item.hanzi ?? '').trim()).filter((item) => item.length > 0),
      ),
    ]
    const basePrompt = await this.getPromptTemplate()

    const prompt = this.buildGeneratePrompt({
      basePrompt,
      topicName: topic.ten_chu_de ?? '',
      topicDescription: topic.mo_ta ?? '',
      soLuong,
      existingHanziList,
    })
    const payload = await this.generateByGemini(prompt)
    const generated = this.normalizeGeneratedItems(payload, soLuong)

    const existingHanziSet = new Set(
      existingItems.map((item) => (item.hanzi ?? '').trim()).filter((item) => item.length > 0),
    )
    const existingPinyinPlainSet = new Set(
      existingItems
        .map((item) => (item.pinyin_plain ?? '').trim().toLowerCase())
        .filter((item) => item.length > 0),
    )

    const uniqueHanziSet = new Set<string>()
    const uniquePinyinPlainSet = new Set<string>()
    const filtered = generated.filter((item) => {
      const hanzi = (item.hanzi ?? '').trim()
      const pinyinPlain = (item.pinyin_plain ?? '').trim().toLowerCase()
      if (!hanzi || existingHanziSet.has(hanzi) || uniqueHanziSet.has(hanzi)) {
        return false
      }
      if (
        pinyinPlain &&
        (existingPinyinPlainSet.has(pinyinPlain) || uniquePinyinPlainSet.has(pinyinPlain))
      ) {
        return false
      }
      uniqueHanziSet.add(hanzi)
      if (pinyinPlain) {
        uniquePinyinPlainSet.add(pinyinPlain)
      }
      return true
    })

    return filtered.map((item) => ({
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      pinyin_plain: item.pinyin_plain,
      nghia_vi: item.nghia_vi,
      nghia_en: item.nghia_en,
      example_cn: item.example_cn,
      example_vi: item.example_vi,
      chu_de_id: topicId,
    }))
  }

  async update(
    id: number,
    data: {
      hanzi?: string
      pinyin?: string
      pinyin_plain?: string
      nghia_vi?: string
      nghia_en?: string
      example_cn?: string
      example_vi?: string
      chu_de_id?: number
    },
    userId?: unknown,
  ) {
    const parsedUserId = this.normalizeUserId(userId, { required: true })
    const existing = await this.prisma.tu_vung.findUnique({
      where: { id },
      include: {
        chu_de: {
          select: {
            user_id: true,
          },
        },
      },
    })

    if (!existing) {
      throw new NotFoundException('Khong tim thay tu vung')
    }

    if (existing.chu_de?.user_id !== parsedUserId) {
      throw new ForbiddenException('Ban khong co quyen cap nhat tu vung nay')
    }

    if (data.chu_de_id !== undefined) {
      const nextTopicId = this.normalizeTopicId(data.chu_de_id)
      await this.ensureWritableTopic(nextTopicId, parsedUserId)
      data.chu_de_id = nextTopicId
    }

    return this.prisma.tu_vung.update({
      where: {
        id,
      },
      data: {
        ...data,
        hanzi: this.normalizeString(data.hanzi),
        pinyin: this.normalizeString(data.pinyin),
        pinyin_plain: this.normalizeString(data.pinyin_plain),
        nghia_vi: this.normalizeString(data.nghia_vi),
        nghia_en: this.normalizeString(data.nghia_en),
        example_cn: this.normalizeString(data.example_cn),
        example_vi: this.normalizeString(data.example_vi),
      },
    })
  }

  async remove(id: number, userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId, { required: true })
    const existing = await this.prisma.tu_vung.findUnique({
      where: { id },
      include: {
        chu_de: {
          select: {
            user_id: true,
          },
        },
      },
    })

    if (!existing) {
      throw new NotFoundException('Khong tim thay tu vung')
    }

    if (existing.chu_de?.user_id !== parsedUserId) {
      throw new ForbiddenException('Ban khong co quyen xoa tu vung nay')
    }

    return this.prisma.tu_vung.delete({
      where: {
        id,
      },
    })
  }
}
