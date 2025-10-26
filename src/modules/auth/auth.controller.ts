import { AuthenticationService } from './auth.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConfirmEmailDto,
  LoginBodyDto,
  ResendConfirmEmailDto,
  SignupBodyDto,
} from './dto/signup.dto';
import { IResponse, successResponse } from 'src/common';
import { LoginResponse } from './entities/auth.entity';

@UsePipes(
  new ValidationPipe({
    // stopAtFirstError: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('signup')
  async signup(
    @Body()
    body: SignupBodyDto,
  ): Promise<IResponse> {
    await this.authenticationService.signup(body);
    return successResponse();
  }

  @Post('resend-confirm-email')
  async resendConfirmEmail(
    @Body()
    body: ResendConfirmEmailDto,
  ): Promise<IResponse> {
    await this.authenticationService.resendConfirmEmail(body);
    return successResponse();
  }

  @Patch('confirm-email')
  async confirmEmail(
    @Body()
    body: ConfirmEmailDto,
  ): Promise<IResponse> {
    await this.authenticationService.confirmEmail(body);
    return successResponse();
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() Body: LoginBodyDto): Promise<IResponse<LoginResponse>> {
    const credentials = await this.authenticationService.login(Body);
    return successResponse<LoginResponse>({
      message: 'Done',
      data: { credentials },
    });
  }
}
