import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { AppService } from './app.service';
import { S3Service } from './common';
import type { Response } from 'express';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream';
const createS3WriteStreamPipe = promisify(pipeline);

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/upload/pre-signed/*path')
  async getPreSignedAssetUrl(
    @Query()
    query: {
      download?: 'true' | 'false';
      downloadName?: string;
    },
    @Param() params: { path: string[] },
  ) {
    const { downloadName, download } = query;
    const { path } = params;
    const Key = path.join('/');
    const url = await this.s3Service.createGetPreSignedLink({
      Key,
      download,
      downloadName,
    });

    return { message: 'Done', data: { url } };
  }

  @Get('/upload/*path')
  async getAsset(
    @Query()
    query: {
      download?: 'true' | 'false';
      downloadName?: string;
    },
    @Param() params: { path: string[] },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { downloadName, download } = query;
    const { path } = params;
    const Key = path.join('/');
    const s3Response = await this.s3Service.getFile({ Key });
    if (!s3Response?.Body) {
      throw new BadRequestException('failed to fetch asset');
    }

    res.set('Cross-Origin-Resource-Policy', 'cross-origin');

    res.setHeader(
      'Content-type',
      `${s3Response.ContentType || 'application/octet-stream'}`,
    );

    if (download === 'true') {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${downloadName || Key.split('/').pop()}"`,
      );
    }

    return await createS3WriteStreamPipe(
      s3Response.Body as NodeJS.ReadableStream,
      res,
    );
  }
}
