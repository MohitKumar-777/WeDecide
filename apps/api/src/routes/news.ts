import { FastifyPluginAsync } from 'fastify';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['source'],
  }
});

const newsRoute: FastifyPluginAsync = async (app) => {

  // GET /api/v1/news?q=Cricket
  app.get('/', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const { q } = request.query as { q?: string };
    
    // Default to Indian Market News if no query is provided
    const query = q ? encodeURIComponent(q) : 'India Economy OR Sensex';
    
    // Google News RSS targeting Indian sources and region
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;

    try {
      const feed = await parser.parseURL(rssUrl);
      
      const articles = feed.items.slice(0, 10).map(item => {
        // Try to extract the source from the title (Google News appends it like "Article Title - Source Name")
        let sourceName = 'News';
        let cleanTitle = item.title ?? '';
        
        const dashIndex = cleanTitle.lastIndexOf(' - ');
        if (dashIndex > -1) {
          sourceName = cleanTitle.substring(dashIndex + 3);
          cleanTitle = cleanTitle.substring(0, dashIndex);
        }

        // Calculate a clean "time ago" string
        let timeAgo = 'Just now';
        if (item.pubDate) {
          const diffMs = Date.now() - new Date(item.pubDate).getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);
          
          if (diffDays > 0) timeAgo = `${diffDays}d ago`;
          else if (diffHours > 0) timeAgo = `${diffHours}h ago`;
          else if (diffMins > 0) timeAgo = `${diffMins}m ago`;
        }

        return {
          id: item.guid ?? item.link,
          title: cleanTitle,
          link: item.link,
          source: sourceName,
          time: timeAgo,
          pubDate: item.pubDate,
        };
      });

      return reply.send({ data: articles, requestId: request.id });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: { code: 'RSS_PARSE_FAILED', message: 'Failed to fetch live news', statusCode: 500 } });
    }
  });

};

export default newsRoute;
