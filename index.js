const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = 'https://cinesubz.co';

const API_INFO = {
  developer: 'Mr Senal',
  version: 'v1.6 (Railway Optimized)',
  api_name: 'CineSubz Movie Downloader API'
};

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
  'Referer': 'https://cinesubz.co/',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
  'Sec-Fetch-User': '?1'
};

app.use(express.json());

// --- URL transformation mappings (Original - Strictly No Reductions) ---
const urlMappings = [
  { search: ['https://google.com/server11/1:/', 'https://google.com/server12/1:/', 'https://google.com/server13/1:/'], replace: 'https://cloud.sonic-cloud.online/server1/' },
  { search: ['https://google.com/server21/1:/', 'https://google.com/server22/1:/', 'https://google.com/server23/1:/'], replace: 'https://cloud.sonic-cloud.online/server2/' },
  { search: ['https://google.com/server3/1:/'], replace: 'https://cloud.sonic-cloud.online/server3/' },
  { search: ['https://google.com/server4/1:/'], replace: 'https://cloud.sonic-cloud.online/server4/' },
  { search: ['https://google.com/server5/1:/'], replace: 'https://cloud.sonic-cloud.online/server5/' }
];

function transformDownloadUrl(originalUrl) {
  let modifiedUrl = originalUrl;
  let urlChanged = false;
  
  for (const mapping of urlMappings) {
    if (urlChanged) break;
    for (const searchUrl of mapping.search) {
      if (originalUrl.includes(searchUrl)) {
        modifiedUrl = originalUrl.replace(searchUrl, mapping.replace);
        
        if (modifiedUrl.includes('.mp4?bot=cscloud2bot&code=')) {
          modifiedUrl = modifiedUrl.replace('.mp4?bot=cscloud2bot&code=', '?ext=mp4&bot=cscloud2bot&code=');
        } else if (modifiedUrl.includes('.mp4')) {
          modifiedUrl = modifiedUrl.replace('.mp4', '?ext=mp4');
        } else if (modifiedUrl.includes('.mkv?bot=cscloud2bot&code=')) {
          modifiedUrl = modifiedUrl.replace('.mkv?bot=cscloud2bot&code=', '?ext=mkv&bot=cscloud2bot&code=');
        } else if (modifiedUrl.includes('.mkv')) {
          modifiedUrl = modifiedUrl.replace('.mkv', '?ext=mkv');
        } else if (modifiedUrl.includes('.zip')) {
          modifiedUrl = modifiedUrl.replace('.zip', '?ext=zip');
        }
        
        urlChanged = true;
        break;
      }
    }
  }

  if (!urlChanged) {
    let tempUrl = originalUrl;
    if (tempUrl.includes('srilank222')) {
      tempUrl = tempUrl.replace('srilank222', 'srilanka2222');
      urlChanged = true;
    }
    if (tempUrl.includes('https://tsadsdaas.me/')) {
      tempUrl = tempUrl.replace('https://tsadsdaas.me/', 'http://tdsdfasdaddd.me/');
      urlChanged = true;
    }
    modifiedUrl = tempUrl;
  }
  
  return modifiedUrl;
}

// --- Root Endpoint ---
app.get('/', (req, res) => {
  res.json({
    developer: API_INFO.developer,
    version: API_INFO.version,
    api_name: API_INFO.api_name,
    endpoints: {
      search: '/search?q={query}',
      details: '/details?url={encoded_url}',
      episodes: '/episodes?url={encoded_url}',
      download: '/download?url={encoded_url}'
    }
  });
});

// --- Search Endpoint ---
app.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: 'Missing search query. Use ?q=movie_name' });

    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, { headers });
    const $ = cheerio.load(response.data);
    const results = [];

    $('.item-box, .display-item, article.item, article').each((i, el) => {
      const $item = $(el);
      const title = $item.find('.item-desc-title, .title, h3 a, .entry-title a').first().text().trim();
      const url = $item.find('a').first().attr('href');
      const poster = $item.find('img').first().attr('src') || $item.find('img').attr('data-src');
      const type = url && url.includes('/tvshows/') ? 'tvshow' : 'movie';

      if (title && url && url.includes('cinesubz')) {
        results.push({
          title,
          type,
          quality: $item.find('.badge-quality-corner').text().trim() || 'N/A',
          rating: $item.find('.imdb-score, .rating1').text().trim() || 'N/A',
          movie_url: url,
          poster
        });
      }
    });

    const uniqueResults = [...new Map(results.map(r => [r.movie_url, r])).values()];
    res.json({
      developer: API_INFO.developer,
      version: API_INFO.version,
      query: query,
      total_results: uniqueResults.length,
      results: uniqueResults
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// --- Details Endpoint ---
app.get('/details', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing URL parameter' });

    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);

    const title = $('.sheader .data h1').text().trim() || $('h1.entry-title').text().trim() || $('title').text().trim();
    const poster = $('meta[property="og:image"]').attr('content') || $('.sheader .poster img').attr('src');
    
    const downloadLinks = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href && (href.includes('/api-') || (href.includes('cinesubz') && (
        text.toLowerCase().includes('download') || text.match(/(480p|720p|1080p|2160p|4K)/i)
      )))) {
        const qualityMatch = text.match(/(480p|720p|1080p|2160p|4K)/i);
        downloadLinks.push({
          quality: qualityMatch ? qualityMatch[0] : 'Unknown',
          size: text.match(/(\d+(?:\.\d+)?\s*(?:MB|GB))/i)?.[1] || 'N/A',
          text: text,
          countdown_url: href
        });
      }
    });

    res.json({
      developer: API_INFO.developer,
      movie_info: {
        title: title,
        type: url.includes('/tvshows/') ? 'tvshow' : 'movie',
        poster_url: poster,
        movie_url: url
      },
      download_links: [...new Map(downloadLinks.filter(l => l.countdown_url).map(l => [l.countdown_url, l])).values()]
    });
  } catch (error) {
    res.status(500).json({ error: 'Details failed', message: error.message });
  }
});

// --- Episodes Endpoint ---
app.get('/episodes', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);
    const seasons = [];

    $('#seasons .se-c').each((i, seasonEl) => {
      const episodes = [];
      $(seasonEl).find('.se-a ul li').each((j, epEl) => {
        const $ep = $(epEl);
        episodes.push({
          episode: $ep.find('.numerando').text().trim(),
          title: $ep.find('.episodiotitle a').text().trim(),
          url: $ep.find('.episodiotitle a').attr('href'),
          date: $ep.find('.date').text().trim()
        });
      });
      seasons.push({
        season: $(seasonEl).find('.se-t').text().trim(),
        episodeCount: episodes.length,
        episodes
      });
    });

    res.json({ developer: API_INFO.developer, seasons });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Download Endpoint (Puppeteer with 15s Wait & Railway Optimized) ---
app.get('/download', async (req, res) => {
  let browser;
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Missing URL parameter' });

    // Step 1: Resolve countdown page via Axios
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);
    
    let rawLink = $('#link').attr('href') || $('.wait-done a').attr('href');
    
    if (!rawLink) {
        const match = response.data.match(/https?:\/\/google\.com\/server[^"'\s]+/);
        if (match) rawLink = match[0];
    }

    if (!rawLink) return res.json({ success: false, message: 'Could not resolve intermediate link' });

    // Step 2: Transform (Original logic)
    const finalTarget = transformDownloadUrl(rawLink);

    // Step 3: Handle Sonic/Server pages with Puppeteer
    if (finalTarget.includes('sonic-cloud') || finalTarget.includes('server')) {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });
        const page = await browser.newPage();
        await page.setUserAgent(headers['User-Agent']);
        
        console.log(`Rendering Page (15s wait): ${finalTarget}`);
        await page.goto(finalTarget, { waitUntil: 'networkidle2', timeout: 60000 });

        // --- THE 15 SECOND WAIT ---
        await new Promise(r => setTimeout(r, 15000)); 

        const extractedLinks = await page.evaluate(() => {
            const results = [];
            document.querySelectorAll('a').forEach(a => {
                const href = a.href;
                // Capture high-value download links
                if (href && (href.includes('drive.google') || href.includes('pixel') || href.includes('drain') || href.includes('gdtot') || href.includes('file') || href.includes('cloud'))) {
                    results.push({ name: a.innerText.trim() || 'Download Link', url: href });
                }
            });
            return results;
        });

        await browser.close();

        return res.json({
            developer: API_INFO.developer,
            success: true,
            method: "Puppeteer Engine (15s)",
            source_page: finalTarget,
            download_options: extractedLinks
        });
    }

    // Default response for non-server links (Telegram/Direct)
    res.json({
      developer: API_INFO.developer,
      success: true,
      download_url: finalTarget
    });

  } catch (error) {
    if (browser) await browser.close();
    console.error('Download Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Server Start ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║   CineSubz API v1.6 - Railway Active       ║
  ║   Wait Time: 15 Seconds                    ║
  ╚════════════════════════════════════════════╝
  🚀 Server running at: http://0.0.0.0:${PORT}
  `);
});

module.exports = app;
