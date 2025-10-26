import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageEnum } from '../enums';
import { createReadStream } from 'fs';
import { Upload } from '@aws-sdk/lib-storage';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
  }

  uploadfile = async ({
    storageApproach = StorageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    ACL = 'private',
    path = 'general',
    file,
  }: {
    storageApproach?: StorageEnum;
    Bucket?: string;
    ACL?: ObjectCannedACL;
    path?: string;
    file: Express.Multer.File;
  }): Promise<string> => {
    const command = new PutObjectCommand({
      Bucket,
      ACL,
      Key: `${process.env.APPLICATION_NAME}/${path}/${randomUUID()}_${
        file.originalname
      }`,
      Body:
        storageApproach === StorageEnum.memory
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);
    if (!command?.input?.Key) {
      throw new BadRequestException('fail to generate upload key');
    }
    return command.input.Key;
  };

  uploadLargefile = async ({
    storageApproach = StorageEnum.disk,
    Bucket = process.env.AWS_BUCKET_NAME,
    ACL = 'private',
    path = 'general',
    file,
  }: {
    storageApproach?: StorageEnum;
    Bucket?: string;
    ACL?: ObjectCannedACL;
    path?: string;
    file: Express.Multer.File;
  }): Promise<string> => {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket,
        ACL,
        Key: `${process.env.APPLICATION_NAME}/${path}/${randomUUID()}_${
          file.originalname
        }`,
        Body:
          storageApproach === StorageEnum.memory
            ? file.buffer
            : createReadStream(file.path),
        ContentType: file.mimetype,
      },
    });

    upload.on('httpUploadProgress', (Progress) => {
      console.log(`upload file progress is :::`, Progress);
    });
    const { Key } = await upload.done();
    if (!Key) {
      throw new BadRequestException('fail to generate upload key');
    }
    return Key;
  };

  uploadfiles = async ({
    storageApproach = StorageEnum.memory,
    Bucket = process.env.AWS_BUCKET_NAME as string,
    ACL = 'private',
    path = 'general',
    files,
    useLarge = false,
  }: {
    storageApproach?: StorageEnum;
    Bucket?: string;
    ACL?: ObjectCannedACL;
    path?: string;
    files: Express.Multer.File[];
    useLarge?: boolean;
  }): Promise<string[]> => {
    let urls: string[] = [];

    if (useLarge) {
      urls = await Promise.all(
        files.map((file) => {
          return this.uploadLargefile({
            file,
            path,
            ACL,
            Bucket,
            storageApproach,
          });
        }),
      );
    } else {
      urls = await Promise.all(
        files.map((file) => {
          return this.uploadfile({
            file,
            path,
            ACL,
            Bucket,
            storageApproach,
          });
        }),
      );
    }

    return urls;
  };

  createPreSignedUploadLink = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path = 'general',
    expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS),
    ContentType,
    Originalname,
  }: {
    Bucket?: string;
    path?: string;
    expiresIn?: number;
    Originalname: string;
    ContentType: string;
  }): Promise<{ url: string; key: string }> => {
    const command = new PutObjectCommand({
      Bucket,
      Key: `${
        process.env.APPLICATION_NAME
      }/${path}/${randomUUID()}_pre_${Originalname}`,
      ContentType,
    });
    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    if (!url || !command?.input?.Key) {
      throw new BadRequestException('failed to create presigned url');
    }

    return { url, key: command.input.Key };
  };

  createGetPreSignedLink = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key,
    expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS),
    downloadName = 'dummy',
    download = 'false',
  }: {
    Bucket?: string;
    Key: string;
    expiresIn?: number;
    downloadName?: string;
    download?: string;
  }): Promise<string> => {
    const command = new GetObjectCommand({
      Bucket,
      Key,
      ResponseContentDisposition:
        download === 'true'
          ? `attachment; filename="${downloadName || Key.split('/').pop()}"`
          : undefined,
    });
    const url = await getSignedUrl(await this.s3Client, command, { expiresIn });
    if (!url) {
      throw new BadRequestException('failed to create presigned url');
    }

    return url;
  };

  getFile = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key,
  }: {
    Bucket?: string;
    Key: string;
  }): Promise<GetObjectCommandOutput> => {
    const command = new GetObjectCommand({
      Bucket,
      Key,
    });
    return await this.s3Client.send(command);
  };

  deleteFile = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    Key,
  }: {
    Bucket?: string;
    Key: string;
  }): Promise<DeleteObjectCommandOutput> => {
    const command = new DeleteObjectCommand({
      Bucket,
      Key,
    });

    return await this.s3Client.send(command);
  };

  deleteFiles = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    urls,
    Quiet = false,
  }: {
    Bucket?: string;
    urls: string[];
    Quiet?: boolean;
  }): Promise<DeleteObjectsCommandOutput> => {
    /* Objects=[{key:"", {key:""] */
    const Objects = urls.map((url) => {
      return { Key: url };
    });
    console.log(Objects);
    const command = new DeleteObjectsCommand({
      Bucket,
      Delete: {
        Objects,
        Quiet,
      },
    });
    return await this.s3Client.send(command);
  };

  listDirectoryFiles = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path,
  }: {
    Bucket?: string;
    path: string;
  }): Promise<ListObjectsV2CommandOutput> => {
    const command = new ListObjectsV2Command({
      Bucket,
      Prefix: `${process.env.APPLICATION_NAME}/${path}`,
    });

    return await this.s3Client.send(command);
  };

  deleteFolderByPrefix = async ({
    Bucket = process.env.AWS_BUCKET_NAME as string,
    path,
    Quiet = false,
  }: {
    Bucket?: string;
    path: string;
    Quiet?: boolean;
  }): Promise<DeleteObjectsCommandOutput> => {
    const fileList = await this.listDirectoryFiles({
      Bucket,
      path,
    });
    if (!fileList?.Contents?.length) {
      throw new BadRequestException('empty directory');
    }
    const urls: string[] = fileList.Contents.map((file) => {
      return file.Key as string;
    });
    return await this.deleteFiles({
      urls,
      Bucket,
      Quiet,
    });
  };
}
