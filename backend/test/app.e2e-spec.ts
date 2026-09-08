import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('VANGUARD API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/v1/events ingests an event', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({
        id: 'evt-e2e-1',
        sourceType: 'radar',
        timestamp: new Date().toISOString(),
        location: { lat: 23.03, lng: 72.58 },
        severity: 'high',
        title: 'Radar detection',
        description: 'Unidentified contact approaching sector 4',
      })
      .expect(201);

    expect(res.body.created).toBe(true);
    expect(res.body.event.id).toBe('evt-e2e-1');
    expect(res.body.event.confidence).toBeGreaterThan(0);
    expect(res.body.event.corroboratedBy).toEqual([]);
  });

  it('POST /api/v1/events deduplicates identical IDs', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({
        id: 'evt-e2e-2',
        sourceType: 'weather',
        timestamp: new Date().toISOString(),
        location: { lat: 23.0, lng: 72.6 },
        severity: 'low',
        title: 'Weather observation',
        description: 'Visibility 5 km',
      })
      .expect(201);

    const dup = await request(app.getHttpServer())
      .post('/api/v1/events')
      .send({
        id: 'evt-e2e-2',
        sourceType: 'weather',
        timestamp: new Date().toISOString(),
        location: { lat: 23.0, lng: 72.6 },
        severity: 'low',
        title: 'Weather observation',
        description: 'Visibility 5 km',
      })
      .expect(201);

    expect(dup.body.created).toBe(false);
    expect(dup.body.duplicateOf).toBe('evt-e2e-2');
  });

  it('GET /api/v1/situation/current returns a threat state', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/situation/current')
      .expect(200);
    expect(res.body).toHaveProperty('threatLevel');
    expect(res.body).toHaveProperty('activeAlertsCount');
  });

  it('GET /api/v1/events lists ingested events with filters', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/events?source=radar')
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.every((e: { sourceType: string }) => e.sourceType === 'radar')).toBe(true);
  });

  it('GET /api/v1/intelligence/source-health returns all 5 sources', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/intelligence/source-health')
      .expect(200);
    expect(res.body).toHaveLength(5);
  });
});