import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { googleCareersApplyUrl, parseGoogleCareersSearch } from '../bot/lib/sources/googleCareers.js';
import type { Region } from '../bot/lib/config.js';
import { fingerprint, interleaveByRegion, isProductRole, sameOpening } from '../bot/lib/sources/index.js';
import {
  linkedinSearchUrl,
  parseLinkedinPosting,
  parseLinkedinSearch,
} from '../bot/lib/sources/linkedin.js';
import { parseStaffamPosting, parseStaffamSearch, staffamCompanyApplyUrl } from '../bot/lib/sources/staffam.js';
import { remoteOkPosting } from '../bot/lib/sources/remoteBoards.js';
import { classifyRegion } from '../bot/lib/sources/types.js';

const linkedinCard = `<li>
  <div class="base-card" data-entity-urn="urn:li:jobPosting:4479838167">
    <h3 class="base-search-card__title">
      Senior Product Owner &amp; Analyst
    </h3>
    <h4 class="base-search-card__subtitle"><a href="#">  Acme Bank  </a></h4>
    <span class="job-search-card__location">
      Yerevan, Armenia
    </span>
    <time class="job-search-card__listdate" datetime="2026-10-15">1 day ago</time>
  </div>
</li>`;

describe('linkedin', () => {
  it('builds a geo-scoped search url', () => {
    const url = new URL(linkedinSearchUrl('Product Owner', 'armenia'));
    assert.equal(url.searchParams.get('geoId'), '103030111');
    assert.equal(url.searchParams.get('keywords'), 'Product Owner');
  });

  it('parses search cards', () => {
    assert.deepEqual(parseLinkedinSearch(`<!DOCTYPE html>${linkedinCard}`, 'armenia'), [
      {
        id: 'linkedin:4479838167',
        source: 'linkedin',
        title: 'Senior Product Owner & Analyst',
        company: 'Acme Bank',
        location: 'Yerevan, Armenia',
        region: 'armenia',
        url: 'https://www.linkedin.com/jobs/view/4479838167',
        postedAt: '2026-10-15',
      },
    ]);
  });

  it('parses a posting with an offsite apply url', () => {
    const html = `<code id="applyUrl" style="display: none"><!--"https://jobs.acme.com/apply?id=1&amp;src=li"--></code>
      <div class="show-more-less-html__markup"><p>Own the roadmap.</p><ul><li>5+ years</li></ul></div>
      <span class="description__job-criteria-text">Mid-Senior level</span>`;
    assert.deepEqual(parseLinkedinPosting(html), {
      text: 'Own the roadmap.\n- 5+ years',
      applyUrl: 'https://jobs.acme.com/apply?id=1&src=li',
      criteria: ['Mid-Senior level'],
    });
  });
});

const nextData = (pageProps: unknown) =>
  `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script>`;

describe('staff.am', () => {
  it('parses listings and skips promo rows without a title', () => {
    const html = nextData({
      jobs: [
        {
          id: 1,
          title: { en: 'Product Owner (Chinese &amp; English Speaker)' },
          slug: { en: 'product-owner-chinese-english-speaker' },
          category: { code: 'project-management' },
          companiesStruct: { title: { en: 'PopOK Gaming' } },
          job_city: { title: { en: 'Yerevan' } },
          activated_at: { staffam: '2026-10-16 10:00:00' },
          is_remote: false,
        },
        { itemType: 2 },
      ],
    });
    assert.deepEqual(parseStaffamSearch(html), [
      {
        id: 'staffam:1',
        source: 'staffam',
        title: 'Product Owner (Chinese & English Speaker)',
        company: 'PopOK Gaming',
        location: 'Yerevan, Armenia',
        region: 'armenia',
        url: 'https://staff.am/en/jobs/project-management/product-owner-chinese-english-speaker',
        postedAt: '2026-10-16 10:00:00',
      },
    ]);
  });

  it('joins posting sections', () => {
    const html = nextData({
      job: {
        description: { en: '<p>Join us.</p>' },
        responsibilities: { en: '<ul><li>Own backlog</li></ul>' },
      },
    });
    assert.deepEqual(parseStaffamPosting(html), {
      text: '## Description\nJoin us.\n\n## Responsibilities\n- Own backlog',
    });
  });

  it('reads the employer form out of a staff.am wrapper link', () => {
    const origin = 'https://amiobank.spark.work/career/job/308/application?lang=am';
    const jobUrl = `/en/applicants/job-announcement/add-cv-submits?id=1&originUrl=${encodeURIComponent(origin)}`;
    assert.equal(staffamCompanyApplyUrl(jobUrl), origin);
    const html = nextData({
      job: {
        description: { en: '<p>Join us.</p>' },
        job_url: jobUrl,
      },
    });
    assert.equal(parseStaffamPosting(html).applyUrl, origin);
  });
});

describe('google careers', () => {
  it('reads the apply link next to the listing', () => {
    const listing = 'https://www.google.com/about/careers/applications/jobs/results/123';
    const html = '<a href="./apply?jobId=abc&amp;loc=PL">Apply</a>';
    assert.equal(
      googleCareersApplyUrl(listing, html),
      'https://www.google.com/about/careers/applications/jobs/results/apply?jobId=abc&loc=PL',
    );
  });

  it('parses result cards', () => {
    const html = `<div><h3 class="QJPWVe">Technical Product Manager, Google Ads</h3>
      <p class="l103df">Google | <span class="pwO9Dc"><span class="r0wTof ">Dublin, Ireland</span><span class="r0wTof p3oCrc">; Zurich, Switzerland</span></span></p>
      <a href="jobs/results/129175929833300678-technical-product-manager-google-ads?q=x">Learn more</a></div>`;
    assert.deepEqual(parseGoogleCareersSearch(html, 'eu'), [
      {
        id: 'google-careers:129175929833300678',
        source: 'google-careers',
        title: 'Technical Product Manager, Google Ads',
        company: 'Google',
        location: 'Dublin, Ireland; Zurich, Switzerland',
        region: 'eu',
        url: 'https://www.google.com/about/careers/applications/jobs/results/129175929833300678',
      },
    ]);
  });
});

describe('remoteok', () => {
  it('keeps a posting when the description states a hiring email', () => {
    const posting = remoteOkPosting({
      id: '1',
      position: 'Product Manager',
      company: 'Acme',
      location: 'Worldwide',
      url: 'https://remoteok.com/remote-jobs/remote-product-manager-acme-1',
      date: '2026-10-18',
      description: '<p>Send your CV to jobs&#64;acme.com.</p>',
      apply_url: 'https://remoteok.com/remote-jobs/remote-product-manager-acme-1',
    });
    assert.equal(posting?.id, 'remoteok:1');
    assert.equal(posting?.employerEmail, 'jobs@acme.com');
    assert.equal(posting?.source, 'remoteok');
  });

  it('drops a posting that can only be opened through paid RemoteOK Apply', () => {
    assert.equal(
      remoteOkPosting({
        id: '2',
        position: 'Senior Product Manager',
        company: 'Distru',
        url: 'https://remoteok.com/remote-jobs/remote-senior-product-manager-distru-2',
        description: '<p>Apply on this page. Powering trade for the cannabis industry.</p>',
        apply_url: 'https://remoteok.com/remote-jobs/remote-senior-product-manager-distru-2',
      }),
      undefined,
    );
    assert.equal(
      remoteOkPosting({
        id: '3',
        position: 'Product Manager',
        company: 'Board',
        url: 'https://remoteok.com/remote-jobs/remote-product-manager-board-3',
        description: '<p>Questions: jobs@remoteok.com</p>',
      }),
      undefined,
    );
  });
});

describe('filters', () => {
  it('keeps product manager and owner roles only', () => {
    assert.equal(isProductRole('Senior Product Manager, Payments'), true);
    assert.equal(isProductRole('Product Owner (Chinese & English Speaker)'), true);
    assert.equal(isProductRole('Head of Product'), true);
    assert.equal(isProductRole('Product Marketing Manager'), false);
    assert.equal(isProductRole('Project Manager'), false);
    assert.equal(isProductRole('Product Manager Intern'), false);
    assert.equal(isProductRole('Head of Product Analytics - 100% Remote'), false);
  });

  it('interleaves regions so every market survives a size cap', () => {
    const job = (id: string, region: Region) =>
      ({
        id,
        region,
        source: 'linkedin',
        title: 'PM',
        company: 'X',
        location: '',
        url: 'https://x',
      }) as const;
    const ids = interleaveByRegion([job('us1', 'us'), job('us2', 'us'), job('am1', 'armenia')]).map(
      (item) => item.id,
    );
    assert.deepEqual(ids, ['us1', 'am1', 'us2']);
  });

  it('fingerprints the same job across boards identically', () => {
    assert.equal(
      fingerprint({ company: 'Acme, Inc.', title: 'Senior Product Manager – Growth' }),
      fingerprint({ company: 'ACME Inc', title: 'Senior Product Manager - Growth' }),
    );
    assert.equal(
      sameOpening(
        'optimum partners armenia|technical product owner',
        fingerprint({ company: 'Optimum Partners', title: 'Product Owner' }),
      ),
      true,
    );
    assert.equal(
      sameOpening(
        fingerprint({ company: 'Tabby', title: 'Senior Product Manager' }),
        fingerprint({ company: 'Tabby | تابي', title: 'Product Manager' }),
      ),
      true,
    );
    assert.equal(
      sameOpening(
        fingerprint({ company: 'Blend', title: 'Product Manager' }),
        fingerprint({ company: 'BurjX', title: 'Product Manager' }),
      ),
      false,
    );
  });

  it('classifies regions from locations', () => {
    assert.equal(classifyRegion('Dubai, Dubai, United Arab Emirates', 'remote'), 'uae');
    assert.equal(classifyRegion('Seattle, WA', 'remote'), 'us');
    assert.equal(classifyRegion('Berlin, DE', 'remote'), 'eu');
    assert.equal(classifyRegion('Remote (Worldwide)', 'eu'), 'remote');
    assert.equal(classifyRegion('Yerevan, Armenia', 'eu'), 'armenia');
  });
});
