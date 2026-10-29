import dns from 'dns';
import { DomainHealthEntity } from '@/types';

/**
 * Validates domain DNS records for SPF, DKIM, DMARC, and MX records.
 * Provides actionable DNS configuration guidelines for Google Workspace or custom sending domains.
 */
export async function checkDomainHealth(domain: string): Promise<DomainHealthEntity> {
  const result: DomainHealthEntity = {
    id: `dh_${Date.now()}`,
    domain,
    spfStatus: 'missing',
    dkimStatus: 'missing',
    dmarcStatus: 'missing',
    dmarcPolicy: 'none',
    mxStatus: 'missing',
    details: {},
    checkedAt: new Date().toISOString(),
  };

  try {
    // 1. Check MX Records
    const mxRecords = await dns.promises.resolveMx(domain).catch(() => []);
    if (mxRecords && mxRecords.length > 0) {
      result.mxStatus = 'pass';
      result.details.mx = mxRecords.map(m => m.exchange);
    } else {
      result.mxStatus = 'missing';
      result.details.mxError = 'No MX records found for domain.';
    }

    // 2. Check SPF (TXT records on root domain)
    const txtRecords = await dns.promises.resolveTxt(domain).catch(() => []);
    const flatTxt = txtRecords.map(r => r.join(''));
    const spfRecord = flatTxt.find(t => t.startsWith('v=spf1'));

    if (spfRecord) {
      result.spfStatus = spfRecord.includes('~all') || spfRecord.includes('-all') ? 'pass' : 'invalid';
      result.details.spf = spfRecord;
    } else {
      result.spfStatus = 'missing';
      result.details.spfRecommendation = `v=spf1 include:_spf.google.com ~all`;
    }

    // 3. Check DMARC (TXT record on _dmarc.domain)
    const dmarcRecords = await dns.promises.resolveTxt(`_dmarc.${domain}`).catch(() => []);
    const flatDmarc = dmarcRecords.map(r => r.join(''));
    const dmarcRecord = flatDmarc.find(t => t.startsWith('v=DMARC1'));

    if (dmarcRecord) {
      result.dmarcStatus = 'pass';
      result.details.dmarc = dmarcRecord;
      if (dmarcRecord.includes('p=reject')) {
        result.dmarcPolicy = 'reject';
      } else if (dmarcRecord.includes('p=quarantine')) {
        result.dmarcPolicy = 'quarantine';
      } else {
        result.dmarcPolicy = 'none';
      }
    } else {
      result.dmarcStatus = 'missing';
      result.details.dmarcRecommendation = `v=DMARC1; p=none; rua=mailto:dmarc-reports@${domain}; pct=100; sp=none; aspf=r;`;
    }

    // 4. DKIM Check (Google selector: google._domainkey.domain)
    const dkimRecords = await dns.promises.resolveTxt(`google._domainkey.${domain}`).catch(() => []);
    const flatDkim = dkimRecords.map(r => r.join(''));
    if (flatDkim.length > 0 && flatDkim[0].includes('v=DKIM1')) {
      result.dkimStatus = 'pass';
      result.details.dkim = 'Google Workspace DKIM selector verified.';
    } else {
      result.dkimStatus = 'missing';
      result.details.dkimRecommendation = 'Generate DKIM key in Google Admin Console > Apps > Google Workspace > Gmail > Authenticate email';
    }
  } catch (err: any) {
    result.details.error = err.message || 'DNS query resolution error.';
  }

  return result;
}
