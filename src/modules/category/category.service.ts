import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { GetAllDto, UpdateCategoryDto } from './dto/update-category.dto';
import {
  BrandRepository,
  CategoryDocument,
  CategoryRepository,
  Lean,
  UserDocument,
} from 'src/DB';
import { FolderEnum, S3Service } from 'src/common';
import { Types } from 'mongoose';
import { randomUUID } from 'crypto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly brandRepository: BrandRepository,
    private readonly s3Service: S3Service,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    file: Express.Multer.File,
    user: UserDocument,
  ): Promise<CategoryDocument> {
    const { name } = createCategoryDto;
    const checkDuplicated = await this.categoryRepository.findOne({
      filter: { name, paranoId: false },
    });

    if (checkDuplicated) {
      throw new ConflictException(
        checkDuplicated.freezedAt
          ? 'Duplicated with archived Category'
          : 'Duplicated Category name',
      );
    }

    const brands: Types.ObjectId[] = [
      ...new Set(createCategoryDto.brands || []),
    ];
    if (
      brands &&
      (await this.brandRepository.find({ filter: { _id: { $in: brands } } }))
        .length != brands.length
    ) {
      throw new NotFoundException('some of the mentioned brands donot exist');
    }

    let assetFolderId: string = randomUUID();
    const image: string = await this.s3Service.uploadfile({
      file,
      path: `${FolderEnum.Category}/${assetFolderId}`,
    });

    const [Category] = await this.categoryRepository.create({
      data: [
        {
          ...createCategoryDto,
          image,
          assetFolderId,
          createdBy: user._id,
          brands: brands.map((brand) => {
            return Types.ObjectId.createFromHexString(
              brand as unknown as string,
            );
          }),
        },
      ],
    });

    if (!Category) {
      await this.s3Service.deleteFile({ Key: image });
      throw new BadRequestException('Fail to create this Category resource');
    }
    return Category;
  }

  async update(
    categoryId: Types.ObjectId,
    updateCategoryDto: UpdateCategoryDto,
    user: UserDocument,
  ): Promise<CategoryDocument | Lean<CategoryDocument>> {
    if (
      UpdateCategoryDto.name &&
      (await this.categoryRepository.findOne({
        filter: { name: UpdateCategoryDto.name },
      }))
    ) {
      throw new ConflictException('Duplicated Category name');
    }

    const brands: Types.ObjectId[] = [
      ...new Set(updateCategoryDto.brands || []),
    ];
    if (
      brands &&
      (await this.brandRepository.find({ filter: { _id: { $in: brands } } }))
        .length != brands.length
    ) {
      throw new NotFoundException('some of the mentioned brands donot exist');
    }

    const removedBrands = updateCategoryDto.brands ?? [];
    delete updateCategoryDto.removedBrands;
    const Category = await this.categoryRepository.findOneAndUpdate({
      filter: { _id: categoryId },
      update: [
        {
          $set: {
            ...updateCategoryDto,
            updatedBy: user._id,
            brands: {
              $setUnion: [
                {
                  $setDifference: [
                    '$brands',
                    (removedBrands || []).map((brand) => {
                      return Types.ObjectId.createFromHexString(
                        brand as unknown as string,
                      );
                    }),
                  ],
                },
                brands.map((brand) => {
                  return Types.ObjectId.createFromHexString(
                    brand as unknown as string,
                  );
                }),
              ],
            },
          },
        },
      ],
    });

    if (!Category) {
      throw new NotFoundException('Failed to find matching Category instance');
    }

    return Category;
  }

  async updateAttachment(
    categoryId: Types.ObjectId,
    file: Express.Multer.File,
    user: UserDocument,
  ): Promise<CategoryDocument | Lean<CategoryDocument>> {
    const Category = await this.categoryRepository.findOne({
      filter: { _id: categoryId },
    });
    if (!Category) {
      throw new NotFoundException('Failed to find matching Category instance');
    }

    const image = await this.s3Service.uploadfile({
      file,
      path: `${FolderEnum.Category}/${Category.assetFolderId}`,
    });
    const updatedCategory = await this.categoryRepository.findOneAndUpdate({
      filter: { _id: categoryId },
      update: {
        image,
        updatedBy: user._id,
      },
    });
    if (!updatedCategory) {
      await this.s3Service.deleteFile({ Key: image });
      throw new NotFoundException('Failed to find matching Category instance');
    }
    await this.s3Service.deleteFile({ Key: Category.image });
    return updatedCategory;
  }

  async restore(
    categoryId: Types.ObjectId,
    user: UserDocument,
  ): Promise<CategoryDocument | Lean<CategoryDocument>> {
    const category = await this.categoryRepository.findOneAndUpdate({
      filter: {
        _id: categoryId,
        paranoId: false,
        freezedAt: { $exists: true },
      },
      update: {
        restoredAt: new Date(),
        $unset: { freezedAt: true },
        updatedBy: user._id,
      },
      options: {
        new: false,
      },
    });
    if (!category) {
      throw new NotFoundException('Failed to find matching Category instance');
    }
    if (!category.freezedAt) {
      throw new BadRequestException('Category is not frozen');
    }
    return category;
  }

  async freeze(
    categoryId: Types.ObjectId,
    user: UserDocument,
  ): Promise<string> {
    const category = await this.categoryRepository.findOneAndUpdate({
      filter: { _id: categoryId },
      update: {
        freezedAt: new Date(),
        $unset: { restoredAt: true },
        updatedBy: user._id,
      },
      options: {
        new: false,
      },
    });
    if (!category) {
      throw new NotFoundException('Failed to find matching Category instance');
    }
    return 'Done';
  }

  async remove(
    categoryId: Types.ObjectId,
    user: UserDocument,
  ): Promise<string> {
    const Category = await this.categoryRepository.findOneAndDelete({
      filter: {
        _id: categoryId,
        paranoId: false,
        freezedAt: { $exists: true },
      },
    });
    if (!Category) {
      throw new NotFoundException('Failed to find matching Category instance');
    }
    await this.s3Service.deleteFile({ Key: Category.image });
    return 'Done';
  }

  async findAll(
    data: GetAllDto,
    archive: boolean = false,
  ): Promise<{
    docsCount?: number;
    limit?: number;
    pages?: number;
    currentPage?: number | undefined;
    result: CategoryDocument[] | Lean<CategoryDocument>[];
  }> {
    const { page, size, search } = data;
    const result = await this.categoryRepository.paginate({
      filter: {
        ...(search
          ? {
              $or: [
                { name: { $regex: search, $options: 'i' } },
                { slug: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
              ],
            }
          : {}),
        ...(archive ? { paranoId: false, freezedAt: { $exists: true } } : {}),
      },
      page,
      size,
    });
    return result;
  }

  async findOne(
    categoryId: Types.ObjectId,
    archive: boolean = false,
  ): Promise<CategoryDocument | Lean<CategoryDocument>> {
    const Category = await this.categoryRepository.findOne({
      filter: {
        _id: categoryId,
        ...(archive ? { paranoId: false, freezedAt: { $exists: true } } : {}),
      },
    });
    if (!Category) {
      throw new NotFoundException('Failed to find matching Category instance');
    }
    return Category;
  }
}
