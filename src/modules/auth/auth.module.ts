import { Module } from '@nestjs/common';
import { AuthenticationService } from './auth.service';
import { AuthenticationController } from './auth.controller';
import { OtpModel, OtpRepository, UserModel, UserRepository } from 'src/DB';
import { SecurityService } from 'src/common';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [UserModel, OtpModel],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    UserRepository,
    OtpRepository,
    SecurityService,
    JwtService,
  ],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
