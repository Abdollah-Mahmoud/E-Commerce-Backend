import { Injectable } from '@nestjs/common';
import { Brand, BrandDocument as TDocument } from '../model';
import { DatabaseRepository } from './database.repository';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class BrandRepository extends DatabaseRepository<Brand> {
  constructor(
    @InjectModel(Brand.name)
    protected override model: Model<TDocument>,
  ) {
    super(model);
  }
}
