import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductRepository } from 'src/DB/repository/product.repository';
import {
  BrandModel,
  BrandRepository,
  CategoryModel,
  CategoryRepository,
  ProductModel,
} from 'src/DB';
import { S3Service } from 'src/common';

@Module({
  imports: [CategoryModel, BrandModel, ProductModel],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductRepository,
    BrandRepository,
    CategoryRepository,
    S3Service,
  ],
})
export class ProductModule {}
