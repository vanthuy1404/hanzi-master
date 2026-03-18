import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'

type GenerateTranslationPracticeItem = {
  question: string
  answer: string
}

type GenerateTranslationPracticeResult = {
  items: GenerateTranslationPracticeItem[]
}

type SaveTranslationPracticeInput = {
  topic_ids?: unknown
  so_cau?: unknown
  level?: unknown
  user_id?: unknown
  items?: unknown
}

type SubmitTranslationPracticeInput = {
  user_id?: unknown
  answers?: unknown
}

type SubmitAnswerItem = {
  answer?: unknown
}

type TranslationPracticeRecord = {
  id: number
  user_id: number | null
  topic_ids: number[]
  so_cau: number
  level: string
  created_at: Date | null
  noi_dung: unknown
}

@Injectable()
export class TranslationPracticeService {
  private readonly logger = new Logger(TranslationPracticeService.name)
  private readonly promptCode = 'prompt-luyen-tap-dich'

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private normalizeUserId(
    userId: unknown,
    { required = false }: { required?: boolean } = {},
  ) {
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

  private normalizeQuestionCount(count: unknown) {
    const parsed = Number(count)
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 50) {
      throw new BadRequestException('so_cau phai la so nguyen trong khoang 1..50')
    }
    return parsed
  }

  private normalizeLevel(level: unknown) {
    const normalized = String(level ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')

    if (!normalized || normalized === 'trungbinh' || normalized === 'trung-binh') {
      return 'trung_binh'
    }

    if (normalized === 'de' || normalized === 'easy') {
      return 'de'
    }

    if (normalized === 'trung_binh' || normalized === 'medium') {
      return 'trung_binh'
    }

    if (normalized === 'kho' || normalized === 'hard') {
      return 'kho'
    }

    throw new BadRequestException('level khong hop le. Chi chap nhan: de, trung_binh, kho')
  }

  private normalizeTopicIds(topicIds: unknown) {
    if (!Array.isArray(topicIds) || topicIds.length === 0) {
      throw new BadRequestException('topic_ids phai la mang va khong duoc rong')
    }

    const parsed = [
      ...new Set(
        topicIds.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0),
      ),
    ]

    if (!parsed.length) {
      throw new BadRequestException('topic_ids khong hop le')
    }

    return parsed
  }

  private cleanGeminiText(rawText: string) {
    return rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  }

  private buildPrompt(
    vocabularies: Array<{
      hanzi: string | null
      pinyin_plain: string | null
      nghia_vi: string | null
      chu_de_id: number | null
    }>,
    soCau: number,
    level: string,
    basePrompt: string,
  ) {
    const vocabLines = vocabularies.map(
      (item, index) =>
        `${index + 1}. nghia_vi: ${item.nghia_vi ?? ''}; pinyin_plain: ${item.pinyin_plain ?? ''}; hanzi: ${item.hanzi ?? ''}; chu_de_id: ${item.chu_de_id ?? ''}`,
    )

    return [
      basePrompt,
      `Muc do de bai dang chon: ${level}.`,
      `Hay tao dung ${soCau} cau hoi.`,
      'Phan bo da dang thanh phan ngu phap: trang ngu thoi gian, noi chon, tan suat, muc do, phu dinh, cau hoi, tinh thai lich su.',
      'Khuyen khich dung dong tu tinh trang va cum dong tu pho bien trong giao tiep doi song.',
      'Answer phai la pinyin plain khong dau thanh, viet thuong. Cho phep nhieu dap an linh hoat cach nhau boi dau |.',
      'Chi su dung tu vung trong danh sach cho san lam hat nhan. Duoc phep them hu tu, dai tu, gioi tu, tro tu de cau tu nhien.',
      'Can bang do dai cau: co cau ngan, cau vua, va mot so cau dai hon co 2 ve.',
      'Tra ve DUNG JSON theo format: {"items":[{"question":"...","answer":"..."}]}. Khong them bat ky text nao ben ngoai JSON.',
      'Danh sach tu vung:',
      ...vocabLines,
    ].join('\n')
  }

  private normalizeGeneratedItems(payload: unknown, soCau: number) {
    const items = (payload as GenerateTranslationPracticeResult)?.items
    if (!Array.isArray(items) || items.length === 0) {
      throw new InternalServerErrorException('Gemini khong tra ve danh sach items hop le')
    }

    const normalized = items
      .map((item) => {
        const question = String(item?.question ?? '').trim()
        const answer = String(item?.answer ?? '').trim()
        if (!question || !answer) {
          return null
        }
        return {
          question,
          answer,
        }
      })
      .filter((item): item is GenerateTranslationPracticeItem => item !== null)

    if (!normalized.length) {
      throw new InternalServerErrorException('Khong co cau hoi hop le sau khi xu ly response tu Gemini')
    }

    return normalized.slice(0, soCau)
  }

  private normalizeItemsInput(items: unknown, soCau?: number) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items phai la mang va khong duoc rong')
    }

    const normalized = items
      .map((item) => {
        const question = String((item as { question?: unknown })?.question ?? '').trim()
        const answer = String((item as { answer?: unknown })?.answer ?? '').trim()
        if (!question || !answer) {
          return null
        }
        return { question, answer }
      })
      .filter((item): item is GenerateTranslationPracticeItem => item !== null)

    if (!normalized.length) {
      throw new BadRequestException('items khong hop le')
    }

    if (soCau && normalized.length < soCau) {
      throw new BadRequestException('So luong items nho hon so_cau')
    }

    return soCau ? normalized.slice(0, soCau) : normalized
  }

  private normalizeUserAnswer(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private normalizeSubmittedAnswers(input: unknown, expectedCount: number) {
    if (!Array.isArray(input)) {
      throw new BadRequestException('answers phai la mang')
    }

    if (input.length < expectedCount) {
      throw new BadRequestException('So luong answers khong du')
    }

    return input.slice(0, expectedCount).map((item) => {
      if (typeof item === 'string') {
        return item.trim()
      }
      const answer = String((item as SubmitAnswerItem)?.answer ?? '').trim()
      return answer
    })
  }

  private async validateTopicAccess(topicIds: number[], userId: number | null | undefined) {
    const topics = await this.prisma.chu_de.findMany({
      where: {
        id: { in: topicIds },
      },
      select: {
        id: true,
        user_id: true,
      },
    })

    if (topics.length !== topicIds.length) {
      throw new BadRequestException('Co topic_id khong ton tai')
    }

    const isReadable = topics.every((topic) => topic.user_id === null || topic.user_id === userId)
    if (!isReadable) {
      throw new ForbiddenException('Danh sach topic co chu de ban khong co quyen truy cap')
    }
  }

  private mapPracticeResponse(item: TranslationPracticeRecord) {
    return {
      id: item.id,
      user_id: item.user_id,
      topic_ids: item.topic_ids,
      so_cau: item.so_cau,
      level: item.level,
      created_at: item.created_at,
      items: this.normalizeItemsInput(item.noi_dung),
    }
  }

  private async getPracticeOrThrow(id: number) {
    const practice = await this.prisma.luyen_tap_dich.findUnique({
      where: { id },
    })

    if (!practice) {
      throw new NotFoundException('Khong tim thay bai luyen tap dich')
    }

    return practice
  }

  private checkWritablePractice(practiceUserId: number | null, currentUserId: number | null | undefined) {
    if (practiceUserId === null) {
      if (currentUserId !== null) {
        throw new ForbiddenException('Chi cho phep quan ly bai tap chung voi user_id = null')
      }
      return
    }

    if (currentUserId === undefined || currentUserId === null || practiceUserId !== currentUserId) {
      throw new ForbiddenException('Ban khong co quyen quan ly bai luyen tap nay')
    }
  }

  private async generateByGemini(prompt: string, soCau: number) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')?.trim()
    const apiUrl =
      this.configService.get<string>('GEMINI_API_URL')?.trim() ||
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

    if (!apiKey) {
      throw new InternalServerErrorException('Thieu GEMINI_API_KEY trong env')
    }

    const fullApiUrl = `${apiUrl}?key=${apiKey}`
    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }

    const response = await fetch(fullApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    let generatedPayload: unknown
    try {
      generatedPayload = JSON.parse(cleaned)
    } catch (error) {
      throw new InternalServerErrorException(
        `Khong parse duoc JSON bai tap tu Gemini: ${String(error)} - raw: ${cleaned}`,
      )
    }

    return this.normalizeGeneratedItems(generatedPayload, soCau)
  }

  private getFallbackPromptByLevel(level: string) {
    if (level === 'de') {
      return 'Ban la tro ly tao bai tap dich tu tieng Viet sang pinyin plain cho nguoi moi bat dau. Tao cau ngan, ro rang, de hieu, uu tien mau cau don gian.'
    }
    if (level === 'kho') {
      return 'Ban la tro ly tao bai tap dich tu tieng Viet sang pinyin plain cho muc do kha-gioi. Tao cau co cau truc da tang, nhieu thanh phan, va tinh hoi thoai tu nhien.'
    }
    return 'Ban la tro ly tao bai tap dich tu tieng Viet sang pinyin plain cho nguoi hoc giao tiep. Tao cau tu nhien, da dang, do kho trung binh.'
  }

  private async getPromptTemplate(level: string) {
    const prompt = await this.prisma.danh_muc_prompt.findFirst({
      where: {
        ma: this.promptCode,
        level,
      },
      select: {
        noi_dung: true,
      },
    })

    return prompt?.noi_dung?.trim() || this.getFallbackPromptByLevel(level)
  }

  async generate(input: { topic_ids?: unknown; so_cau?: unknown; level?: unknown; user_id?: unknown }) {
    const topicIds = this.normalizeTopicIds(input.topic_ids)
    const soCau = this.normalizeQuestionCount(input.so_cau)
    const level = this.normalizeLevel(input.level)
    const userId = this.normalizeUserId(input.user_id)

    await this.validateTopicAccess(topicIds, userId)

    const vocabularies = await this.prisma.tu_vung.findMany({
      where: {
        chu_de_id: {
          in: topicIds,
        },
        nghia_vi: {
          not: null,
        },
        pinyin_plain: {
          not: null,
        },
      },
      select: {
        hanzi: true,
        pinyin_plain: true,
        nghia_vi: true,
        chu_de_id: true,
      },
      orderBy: {
        id: 'asc',
      },
      take: 250,
    })

    if (!vocabularies.length) {
      throw new BadRequestException('Khong tim thay tu vung hop le trong cac chu de da chon')
    }

    const basePrompt = await this.getPromptTemplate(level)
    const prompt = this.buildPrompt(vocabularies, soCau, level, basePrompt)
    const items = await this.generateByGemini(prompt, soCau)

    return {
      user_id: userId ?? null,
      topic_ids: topicIds,
      so_cau: soCau,
      level,
      items,
    }
  }

  async save(input: SaveTranslationPracticeInput) {
    const topicIds = this.normalizeTopicIds(input.topic_ids)
    const soCau = this.normalizeQuestionCount(input.so_cau)
    const level = this.normalizeLevel(input.level)
    const userId = this.normalizeUserId(input.user_id)
    const items = this.normalizeItemsInput(input.items, soCau)

    await this.validateTopicAccess(topicIds, userId)

    const practice = await this.prisma.luyen_tap_dich.create({
      data: {
        user_id: userId ?? null,
        topic_ids: topicIds,
        so_cau: soCau,
        level,
        noi_dung: items,
      },
    })

    return this.mapPracticeResponse(practice)
  }

  async update(id: number, input: SaveTranslationPracticeInput) {
    const topicIds = this.normalizeTopicIds(input.topic_ids)
    const soCau = this.normalizeQuestionCount(input.so_cau)
    const level = this.normalizeLevel(input.level)
    const userId = this.normalizeUserId(input.user_id)
    const items = this.normalizeItemsInput(input.items, soCau)

    const existing = await this.getPracticeOrThrow(id)
    this.checkWritablePractice(existing.user_id, userId)
    await this.validateTopicAccess(topicIds, userId)

    const updated = await this.prisma.luyen_tap_dich.update({
      where: { id },
      data: {
        topic_ids: topicIds,
        so_cau: soCau,
        level,
        noi_dung: items,
      },
    })

    return this.mapPracticeResponse(updated)
  }

  async remove(id: number, userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)
    const existing = await this.getPracticeOrThrow(id)
    this.checkWritablePractice(existing.user_id, parsedUserId)

    await this.prisma.luyen_tap_dich.delete({
      where: { id },
    })

    return {
      message: 'Da xoa bai luyen tap',
      id,
    }
  }

  async submit(id: number, input: SubmitTranslationPracticeInput) {
    const parsedUserId = this.normalizeUserId(input.user_id, { required: true })
    if (parsedUserId === null || parsedUserId === undefined) {
      throw new BadRequestException('user_id phai la so nguyen duong')
    }
    const practice = await this.getPracticeOrThrow(id)

    const items = this.normalizeItemsInput(practice.noi_dung, practice.so_cau)
    const submittedAnswers = this.normalizeSubmittedAnswers(input.answers, items.length)

    const details = items.map((item, index) => {
      const userAnswer = submittedAnswers[index] ?? ''
      const normalizedUserAnswer = this.normalizeUserAnswer(userAnswer)
      const acceptedAnswers = item.answer
        .split('|')
        .map((part) => this.normalizeUserAnswer(part))
        .filter((part) => part.length > 0)

      const isCorrect = acceptedAnswers.includes(normalizedUserAnswer)

      return {
        index: index + 1,
        question: item.question,
        user_answer: userAnswer,
        system_answer: item.answer,
        is_correct: isCorrect,
      }
    })

    const tongSoCau = details.length
    const soCauDung = details.filter((item) => item.is_correct).length
    const diem = Number(((soCauDung / tongSoCau) * 10).toFixed(2))

    const lichSu = await this.prisma.lich_su_hoc.create({
      data: {
        user_id: parsedUserId,
        luyen_tap_dich_id: practice.id,
        tong_so_cau: tongSoCau,
        so_cau_dung: soCauDung,
        diem,
      },
    })

    return {
      history_id: lichSu.id,
      luyen_tap_dich_id: practice.id,
      tong_so_cau: tongSoCau,
      so_cau_dung: soCauDung,
      diem,
      details,
    }
  }

  async findAll(userId?: unknown) {
    const parsedUserId = this.normalizeUserId(userId)

    let practices: TranslationPracticeRecord[] = []

    try {
      practices = await this.prisma.luyen_tap_dich.findMany({
        where:
          parsedUserId === undefined
            ? { user_id: null }
            : {
                OR: [{ user_id: null }, { user_id: parsedUserId }],
              },
        orderBy: {
          id: 'desc',
        },
      })
    } catch (error) {
      // Allow UI to keep working even when migration for luyen_tap_dich is missing.
      this.logger.error('Khong the query luyen_tap_dich', error instanceof Error ? error.stack : String(error))
      return []
    }

    return practices.map((item) => this.mapPracticeResponse(item))
  }
}
