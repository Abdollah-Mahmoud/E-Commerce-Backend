import { Injectable } from '@nestjs/common';
import { Category, CategoryDocument as TDocument } from '../model';
import { DatabaseRepository } from './database.repository';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class CategoryRepository extends DatabaseRepository<Category> {
  constructor(
    @InjectModel(Category.name)
    protected override model: Model<TDocument>,
  ) {
    super(model);
  }
}
