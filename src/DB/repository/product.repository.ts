import { Injectable } from '@nestjs/common';
import { Product, ProductDocument as TDocument } from '../model';
import { DatabaseRepository } from './database.repository';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ProductRepository extends DatabaseRepository<Product> {
  constructor(
    @InjectModel(Product.name)
    protected override model: Model<TDocument>,
  ) {
    super(model);
  }
}
