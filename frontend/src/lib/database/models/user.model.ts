export interface User {
  clerk_id: string;
  email: string;
  firstName: string;
  lastName: string;
  credits: number;
  project_ids: string[];
  created_at: Date;
  planType: string | null; // Starter, Custom
  billingCycle: string | null; // one-time, monthly, annual
  isSubscribed: boolean; 
  planCredits: number; 
  nextRenewalDate: Date | null;
  subscriptionId: string | null;
}

export class UserModel implements User {
  constructor(
    public clerk_id: string,
    public email: string,
    public firstName: string,
    public lastName: string,
    public credits: number,
    public project_ids: string[],
    public created_at: Date,
    public planType: string | null = null,
    public billingCycle: string | null = null,
    public isSubscribed: boolean = false,
    public planCredits: number = 0,
    public nextRenewalDate: Date | null = null,
    public subscriptionId: string | null = null
  ) {}

  static fromObject(obj: any): UserModel {
    return new UserModel(
      obj.clerk_id,
      obj.email,
      obj.firstName,
      obj.lastName,
      obj.credits,
      obj.project_ids,
      new Date(obj.created_at),
      obj.planType,
      obj.billingCycle,
      obj.isSubscribed || false,
      obj.planCredits,
      obj.nextRenewalDate ? new Date(obj.nextRenewalDate) : null,
      obj.subscriptionId
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
      created_at: this.created_at,
      planType: this.planType,
      billingCycle: this.billingCycle,
      isSubscribed: this.isSubscribed,
      planCredits: this.planCredits,
      nextRenewalDate: this.nextRenewalDate,
      subscriptionId: this.subscriptionId
    };
  }
}
