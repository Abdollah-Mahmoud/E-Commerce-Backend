import { AuthenticationService } from './auth.service';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConfirmEmailDto,
  LoginBodyDto,
  ResendConfirmEmailDto,
  SignupBodyDto,
  SignupQueryDto,
} from './dto/signup.dto';

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
  ): Promise<{
    message: string;
  }> {
    await this.authenticationService.signup(body);
    return { message: 'done' };
  }

  @Post('resend-confirm-email')
  async resendConfirmEmail(
    @Body()
    body: ResendConfirmEmailDto,
  ): Promise<{
    message: string;
  }> {
    await this.authenticationService.resendConfirmEmail(body);
    return { message: 'done' };
  }

  @Patch('confirm-email')
  async confirmEmail(
    @Body()
    body: ConfirmEmailDto,
  ): Promise<{
    message: string;
  }> {
    await this.authenticationService.confirmEmail(body);
    return { message: 'done' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() Body: LoginBodyDto): Promise<{
    message: string;
    data: { credentials: { access_token: string; refresh_token: string } };
  }> {
    const credentials = await this.authenticationService.login(Body);
    return { message: 'Done', data: { credentials } };
  }
}
