import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { SeverityLevel, SourceType } from '../../common/types/index.js';

export class GeoLocationDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsNumber()
  altitudeMeters?: number;

  @IsOptional()
  @IsNumber()
  headingDegrees?: number;

  @IsOptional()
  @IsNumber()
  speedKnots?: number;
}

export class ConfidenceBreakdownDto {
  @IsNumber()
  overall!: number;

  @IsNumber()
  sourceAgreement!: number;

  @IsNumber()
  spatialAgreement!: number;

  @IsNumber()
  temporalAgreement!: number;

  @IsNumber()
  sourceReliability!: number;

  @IsNumber()
  dataFreshness!: number;
}

export class CreateEventDto {
  @IsString()
  id!: string;

  @IsIn(['radar', 'weather', 'personnel', 'log', 'incident'])
  sourceType!: SourceType;

  @IsString()
  timestamp!: string;

  @ValidateNested()
  @Type(() => GeoLocationDto)
  location!: GeoLocationDto;

  @IsIn(['low', 'medium', 'high', 'critical'])
  severity!: SeverityLevel;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  confidence?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfidenceBreakdownDto)
  confidenceBreakdown?: ConfidenceBreakdownDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  corroboratedBy?: string[];

  @IsOptional()
  @IsBoolean()
  isAnomaly?: boolean;

  @IsOptional()
  raw?: Record<string, unknown>;
}
