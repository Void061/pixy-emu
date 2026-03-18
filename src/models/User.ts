export class UserModel {
  constructor(
    public readonly id: string,
    public readonly username: string,
    public readonly email: string,
    public readonly pixies: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

/** Variant that includes password hash — only used internally by AuthService. */
export class UserWithPasswordModel extends UserModel {
  constructor(
    id: string,
    username: string,
    email: string,
    pixies: number,
    createdAt: Date,
    updatedAt: Date,
    public readonly password: string,
  ) {
    super(id, username, email, pixies, createdAt, updatedAt);
  }
}
