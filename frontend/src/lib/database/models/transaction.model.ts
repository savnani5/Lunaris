import { ObjectId } from 'mongodb';

export interface Transaction {
  _id: string;
  stripeId: string;
  amount: number;
  plan: string;
  credits: number;
  userId: string;
  createdAt: Date;
}

export class TransactionModel implements Transaction {
  constructor(
    public _id: string = new ObjectId().toString(),
    public stripeId: string,
    public amount: number,
    public plan: string,
    public credits: number,
    public userId: string,
    public createdAt: Date = new Date()
  ) {}

  static fromObject(obj: any): TransactionModel {
    return new TransactionModel(
      obj._id,
      obj.stripeId,
      obj.amount,
      obj.plan,
      obj.credits,
      obj.userId,
      new Date(obj.createdAt)
    );
  }

  toObject(): Transaction {
    return {
      _id: this._id,
      stripeId: this.stripeId,
      amount: this.amount,
      plan: this.plan,
      credits: this.credits,
      userId: this.userId,
      createdAt: this.createdAt
    };
  }
}