import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applicationMessage,
  applicationSubject,
  extractEmployerEmail,
  gmailComposeUrl,
  isCompanyApplication,
  resolveApplication,
} from '../bot/lib/apply.js';

describe('employer email', () => {
  it('keeps a real hiring address and skips board addresses', () => {
    const text = 'Apply at jobs@optimum.am or noreply@linkedin.com';
    assert.equal(extractEmployerEmail(text), 'jobs@optimum.am');
    assert.equal(extractEmployerEmail('Write to noreply@staff.am'), undefined);
    assert.equal(
      extractEmployerEmail('Send your CV to recruitment.armenia+TPO2610@optimumpartners.com'),
      'recruitment.armenia+TPO2610@optimumpartners.com',
    );
    assert.equal(extractEmployerEmail('technical--343391@e.staff.am'), undefined);
  });
});

describe('application channel', () => {
  it('treats a different host as the company application', () => {
    assert.equal(
      isCompanyApplication('https://www.linkedin.com/jobs/view/1', 'https://jobs.acme.com/apply'),
      true,
    );
    assert.equal(
      isCompanyApplication('https://www.linkedin.com/jobs/view/1', 'https://www.linkedin.com/jobs/view/1'),
      false,
    );
  });
});

describe('resolve application', () => {
  it('emails the employer from Samvel when the posting has an address', () => {
    const route = resolveApplication({
      title: 'Technical Product Owner',
      listingUrl: 'https://staff.am/en/jobs/project-management/technical-product-owner-15',
      employerEmail: 'recruitment.armenia+TPO2610@optimumpartners.com',
      coverLetter: 'Hello hiring team.',
      canvaUrl: 'https://www.canva.com/d/abc',
    });
    assert.equal(route.channel, 'email');
    assert.equal(route.buttonLabel, 'Apply by email');
    assert.equal(applicationSubject('Technical Product Owner'), 'Technical Product Owner');
    assert.match(route.gmailUrl ?? '', /authuser=sam\.demirtshyan%40gmail\.com/);
    assert.ok(route.gmailUrl?.includes('to=recruitment.armenia%2BTPO2610%40optimumpartners.com'));
    assert.equal(route.listingUrl.startsWith('https://staff.am/'), true);
  });

  it('uses the company form when there is no employer email', () => {
    const route = resolveApplication({
      title: 'Product Manager',
      listingUrl: 'https://staff.am/en/jobs/project-management/product-manager-880',
      applyUrl: 'https://amiobank.spark.work/career/job/308/application?lang=am',
      coverLetter: 'Hello hiring team.',
    });
    assert.equal(route.channel, 'site');
    assert.equal(route.applyUrl, 'https://amiobank.spark.work/career/job/308/application?lang=am');
  });

  it('does not treat the job board listing as an application', () => {
    const route = resolveApplication({
      title: 'Product Owner',
      listingUrl: 'https://www.linkedin.com/jobs/view/1',
      applyUrl: 'https://www.linkedin.com/jobs/view/1',
      coverLetter: 'Hello hiring team.',
    });
    assert.equal(route.channel, 'board');
    assert.equal(route.applyUrl, undefined);
    assert.equal(route.listingUrl, 'https://www.linkedin.com/jobs/view/1');
  });
});

describe('gmail application', () => {
  it('addresses the employer from Samvel and includes the Canva CV', () => {
    const body = applicationMessage('Hello hiring team.', 'https://www.canva.com/d/abc');
    const url = gmailComposeUrl('jobs@optimum.am', 'Application: Product Owner — Samvel Demirtshyan', body);
    assert.match(url, /^https:\/\/mail\.google\.com\/mail\/\?authuser=sam\.demirtshyan%40gmail\.com/);
    assert.ok(url.includes('to=jobs%40optimum.am'));
    assert.ok(decodeURIComponent(url).includes('https://www.canva.com/d/abc'));
    assert.ok(decodeURIComponent(url).includes('sam.demirtshyan@gmail.com'));
  });
});
