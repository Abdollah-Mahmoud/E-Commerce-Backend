import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../model';
import { DatabaseRepository } from './database.repository';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRepository extends DatabaseRepository<User> {
  constructor(
    @InjectModel(User.name)
    protected override model: Model<UserDocument>,
  ) {
    super(model);
  }
}
