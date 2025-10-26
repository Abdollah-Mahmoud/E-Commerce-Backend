import { InjectModel } from '@nestjs/mongoose';
import { Token, TokenDocument } from '../model';
import { DatabaseRepository } from './database.repository';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenRepository extends DatabaseRepository<Token> {
  constructor(
    @InjectModel(Token.name)
    protected override model: Model<TokenDocument>,
  ) {
    super(model);
  }
}
