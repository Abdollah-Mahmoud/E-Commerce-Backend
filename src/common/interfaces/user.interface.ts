import { Types } from 'mongoose';
import { GenderEnum, LanguageEnum, ProviderEnum, RoleEnum } from '../enums';
import { OtpDocument } from 'src/DB';

export interface IUser {
  _id?: Types.ObjectId;
  firstName: string;
  lastName: string;
  username?: string;
  email: string;
  confirmedAt?: Date;
  password?: string;
  provider: ProviderEnum;
  role: RoleEnum;
  gender: GenderEnum;
  changeCredentialsTime?: Date;
  otp?: OtpDocument[];
  preferredLanguage: LanguageEnum;
  profilePicture?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
