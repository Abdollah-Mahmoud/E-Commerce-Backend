import { Injectable } from '@nestjs/common';
import { S3Service, StorageEnum } from 'src/common';
import { UserDocument } from 'src/DB';

@Injectable()
export class UserService {
  constructor(private readonly s3Service: S3Service) {}

  async profileImage(
    file: Express.Multer.File,
    user: UserDocument,
  ): Promise<UserDocument> {
    user.profilePicture = await this.s3Service.uploadfile({
      file,
      storageApproach: StorageEnum.memory,
      path: `user/${user._id.toString()}`,
    });
    await user.save();
    return user;
  }
}
