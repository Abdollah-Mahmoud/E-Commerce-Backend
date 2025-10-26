import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Type,
} from '@nestjs/common';
import {
  compareHash,
  createNumericalOtp,
  IUser,
  LoginCredentialsResponse,
  OtpEnum,
  ProviderEnum,
  SecurityService,
} from 'src/common';
import {
  ConfirmEmailDto,
  LoginBodyDto,
  ResendConfirmEmailDto,
  SignupBodyDto,
} from './dto/signup.dto';
import { OtpRepository, UserDocument, UserRepository } from 'src/DB';
import { Types } from 'mongoose';
import { sign } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/common/services/token.service';

@Injectable()
export class AuthenticationService {
  private users: IUser[] = [];
  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpRepository: OtpRepository,
    private readonly securityService: SecurityService,
    private readonly tokenService: TokenService,
  ) {}

  private async createConfirmEmailOtp(userId: Types.ObjectId) {
    await this.otpRepository.create({
      data: [
        {
          code: createNumericalOtp(),
          expiredAt: new Date(Date.now() + 2 * 60 * 1000),
          createdBy: userId,
          type: OtpEnum.ConfirmEmail,
        },
      ],
    });
  }

  async signup(data: SignupBodyDto): Promise<string> {
    const { email, password, username } = data;
    const checkUserExist = await this.userRepository.findOne({
      filter: { email },
    });
    if (checkUserExist) {
      throw new ConflictException('email already exists ');
    }
    const [user] = await this.userRepository.create({
      data: [{ username, email, password }],
    });

    if (!user) {
      throw new BadRequestException(
        'failed to signup this account please try again later',
      );
    }

    if (!user) {
      throw new BadRequestException('failed to signup this resource');
    }

    await this.createConfirmEmailOtp(user._id);
    return 'Done';
  }

  async resendConfirmEmail(data: ResendConfirmEmailDto): Promise<string> {
    const { email } = data;
    const user = await this.userRepository.findOne({
      filter: { email, confirmedAt: { $exists: false } },
      options: {
        populate: [{ path: 'otp', match: { type: OtpEnum.ConfirmEmail } }],
      },
    });
    console.log({ user });

    if (!user) {
      throw new NotFoundException('Failed to find matching account');
    }

    if (user.otp?.length) {
      throw new ConflictException(
        `Sorry we cannot grant you new OTP until the existing one becomes expired please try again after:${user.otp[0].expiredAt}`,
      );
    }

    await this.createConfirmEmailOtp(user._id);
    return 'done';
  }

  async confirmEmail(data: ConfirmEmailDto): Promise<string> {
    const { email, otp } = data;
    const user = await this.userRepository.findOne({
      filter: { email, confirmedAt: { $exists: false } },
      options: {
        populate: [{ path: 'otp', match: { type: OtpEnum.ConfirmEmail } }],
      },
    });
    console.log({ user });

    if (!user) {
      throw new NotFoundException('Failed to find matching account');
    }

    if (
      !(
        user.otp?.length &&
        (await this.securityService.compareHash(otp, user.otp[0].code))
      )
    ) {
      throw new BadRequestException('invalid otp');
    }

    user.confirmedAt = new Date();
    await user.save();
    await this.otpRepository.deleteOne({ filter: { _id: user.otp[0]._id } });

    await this.createConfirmEmailOtp(user._id);
    return 'done';
  }

  async login(data: LoginBodyDto): Promise<LoginCredentialsResponse> {
    const { email, password } = data;
    const user = await this.userRepository.findOne({
      filter: {
        email,
        confirmedAt: { $exists: true },
        provider: ProviderEnum.SYSTEM,
      },
    });
    if (!user) {
      throw new NotFoundException('Failed to find matching account');
    }
    if (!(await this.securityService.compareHash(password, user.password))) {
      throw new NotFoundException('Failed to find matching account');
    }
    return await this.tokenService.createLoginCredentials(user as UserDocument);
  }
}
