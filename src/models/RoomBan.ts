export class RoomBanModel {
  constructor(
    public readonly id: string,
    public readonly roomId: string,
    public readonly userId: string,
    public readonly bannedAt: Date,
  ) {}
}
