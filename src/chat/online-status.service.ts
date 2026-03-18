import { Injectable } from '@nestjs/common'

@Injectable()
export class OnlineStatusService {
  private readonly onlineCounter = new Map<number, number>()

  markOnline(userId: number) {
    const current = this.onlineCounter.get(userId) ?? 0
    this.onlineCounter.set(userId, current + 1)
  }

  markOffline(userId: number) {
    const current = this.onlineCounter.get(userId) ?? 0
    if (current <= 1) {
      this.onlineCounter.delete(userId)
      return
    }
    this.onlineCounter.set(userId, current - 1)
  }

  isOnline(userId: number) {
    return (this.onlineCounter.get(userId) ?? 0) > 0
  }
}
