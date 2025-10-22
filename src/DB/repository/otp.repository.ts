import { Injectable } from '@nestjs/common';
import { Otp, OtpDocument as TDocument } from '../model';
import { DatabaseRepository } from './database.repository';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class OtpRepository extends DatabaseRepository<Otp> {
  constructor(
    @InjectModel(Otp.name)
    protected override model: Model<TDocument>,
  ) {
    super(model);
  }
}
