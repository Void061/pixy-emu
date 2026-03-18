export interface ChatMessageModel {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  createdAt: Date;
}
