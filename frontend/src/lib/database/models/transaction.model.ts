import { ObjectId } from 'mongodb';

export interface Transaction {
  _id: string;
  stripeId: string;
  amount: number;
  planType: string | null; // Starter or Custom
  billingCycle: string | null; // one-time, monthly, annual
  credits: number;
  userId: string;
  createdAt: Date;
  type: string; // "subscription created" or "subscription renewal" or "subscription cancelled" or "pay-as-you-go"
}

export class TransactionModel implements Transaction {
  constructor(
    public _id: string = new ObjectId().toString(),
    public stripeId: string,
    public amount: number,
    public planType: string | null,
    public billingCycle: string | null,
    public credits: number,
    public userId: string,
    public createdAt: Date = new Date(),
    public type: string
  ) {}

  static fromObject(obj: any): TransactionModel {
    return new TransactionModel(
      obj._id,
      obj.stripeId,
      obj.amount,
      obj.planType || null,
      obj.billingCycle || null,
      obj.credits,
      obj.userId,
      new Date(obj.createdAt),
      obj.type
    );
  }

  toObject(): Transaction {
    return {
      _id: this._id,
      stripeId: this.stripeId,
      amount: this.amount,
      planType: this.planType || null,
      billingCycle: this.billingCycle || null,
      credits: this.credits,
      userId: this.userId,
      createdAt: this.createdAt,
      type: this.type
    };
  }
}
