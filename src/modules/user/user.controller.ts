import {
  Controller,
  Get,
  Headers,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Auth, RoleEnum, StorageEnum, successResponse, User } from 'src/common';
import type { UserDocument } from 'src/DB';
import { PreferredLanguageInterceptor } from 'src/common/interceptors';
import { delay, Observable, of } from 'rxjs';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import {
  cloudFileUpload,
  fileValidation,
  localFileUpload,
} from 'src/common/utils/multer';
import type { IMulterFile, IResponse, IUser } from '../../common/interfaces';
import { ProfileResponse } from './entities/user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}


  @UseInterceptors(
    FileInterceptor(
      'profileImage',
      cloudFileUpload({
        storageApproach: StorageEnum.memory,
        validation: fileValidation.image,
        fileSize: 2,
      }),
    ),
  )
  @Auth([RoleEnum.user])
  @Patch('profile-image')
  async profileImage(
    @User() user: UserDocument,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<IResponse<ProfileResponse>> {
    const profile = await this.userService.profileImage(file, user);
    return successResponse<ProfileResponse>({ data: { profile } });
  }
}
