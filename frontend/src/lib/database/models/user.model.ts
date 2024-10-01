export interface User {
  clerk_id: string;
  email: string;
  firstName: string;
  lastName: string;
  credits: number;
  project_ids: string[];
  created_at: Date;
}

export class UserModel implements User {
  constructor(
    public clerk_id: string,
    public email: string,
    public firstName: string,
    public lastName: string,
    public credits: number,
    public project_ids: string[] = [],
    public created_at: Date = new Date(),
    
  ) {}

  static fromObject(obj: any): UserModel {
    return new UserModel(
      obj.clerk_id,
      obj.email,
      obj.firstName,
      obj.lastName,
      obj.credits,
      obj.project_ids,
      new Date(obj.created_at)
    );
  }

  toObject(): User {
    return {
      clerk_id: this.clerk_id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      credits: this.credits,
      project_ids: this.project_ids,
      created_at: this.created_at
    };
  }
}
