import { Global, Module } from '@nestjs/common';
import {
  OtpModel,
  OtpRepository,
  TokenModel,
  TokenRepository,
  UserModel,
  UserRepository,
} from 'src/DB';
import { SecurityService } from 'src/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from 'src/common/services/token.service';

@Global()
@Module({
  imports: [UserModel, TokenModel, OtpModel],
  controllers: [],
  providers: [
    UserRepository,
    JwtService,
    TokenService,
    TokenRepository,
    OtpRepository,
    SecurityService,
  ],
  exports: [
    UserRepository,
    OtpRepository,
    SecurityService,
    JwtService,
    TokenService,
    TokenRepository,
    TokenModel,
    UserModel,
  ],
})
export class SharedAuthenticationModule {}
