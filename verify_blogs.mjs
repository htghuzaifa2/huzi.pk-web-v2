import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';

const SITEMAP_URL = 'http://localhost:3000/blogs-sitemap.xml';
const BASE_URL = 'http://localhost:3000';

async function verify() {
  console.log('Fetching sitemap...');
  const sitemapRes = await fetch(SITEMAP_URL);
  const sitemapText = await sitemapRes.text();

  let urls = [];
  try {
    const result = await parseStringPromise(sitemapText);
    urls = result.urlset.url.map(u => u.loc[0]);
  } catch (e) {
    // If simple parsing fails, try regex
    const matches = sitemapText.match(/<loc>(.*?)<\/loc>/g);
    if (matches) {
      urls = matches.map(m => m.replace(/<\/?loc>/g, ''));
    }
  }

  console.log(`Found ${urls.length} URLs.`);

  // Filter for local check (replace https://huzi.pk with http://localhost:3000)
  const localUrls = urls.map(u => u.replace('https://huzi.pk', 'http://localhost:3000'));

  let errorCount = 0;
  let linkIssues = 0;

  for (const url of localUrls) {
    try {
      const res = await fetch(url);
      if (res.status !== 200) {
        console.error(`[FAIL] ${url} returned ${res.status}`);
        errorCount++;
        continue;
      }

      const html = await res.text();
      const $ = cheerio.load(html);
      
      console.log(`[OK] ${url}`);

      // Check links
      $('a').each((i, el) => {
        const href = $(el).attr('href');
        const target = $(el).attr('target');
        
        if (!href) return;

        const isExternal = href.startsWith('http') && !href.includes('localhost') && !href.includes('huzi.pk');
        const isInternal = href.startsWith('/') || href.includes('localhost') || href.includes('huzi.pk');

        if (isExternal) {
          if (target !== '_blank') {
            console.warn(`  [LINK ISSUE] External link ${href} has target="${target || 'none'}" (expected _blank) on ${url}`);
            linkIssues++;
          }
        } else if (isInternal) {
           // Some internal links could be _blank if intended, but usually not.
           // User rule: "internal links can open in main tab" -> usually implies NO _blank, but not strictly forbidden.
           // User said: "internal links can open in main tab" 
           // We will just log if internal is _blank as info, not strict error unless user insisted.
           // Actually user said: "external links open in new tab not on main tab but internal links can open in main tab"
        }
      });

    } catch (e) {
      console.error(`[ERROR] Failed to fetch ${url}: ${e.message}`);
      errorCount++;
    }
  }

  console.log('\nVerification Complete.');
  console.log(`Failed Pages: ${errorCount}`);
  console.log(`Link Issues: ${linkIssues}`);
}

verify();
