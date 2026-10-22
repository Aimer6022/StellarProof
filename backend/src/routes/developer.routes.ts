import { Router } from 'express';
import { generateApiKey, getApiKeyUsage } from '../controllers/developer.controller';
import { verifyJWT } from '../middlewares/jwt.middleware';

const router = Router();

router.post('/keys', generateApiKey);

/**
 * GET /api/v1/developer/api-keys/:keyId/usage
 * Retrieve aggregated API usage metrics for a specific API key.
 * 
 * Authentication: Required (JWT or API Key)
 * Authorization: Caller must own the API key
 * 
 * Query parameters:
 *   - from: ISO date string (defaults to 7 days ago)
 *   - to: ISO date string (defaults to now)
 *   - endpoint: optional filter by endpoint pattern
 *   - granularity: 'hour' or 'day' (defaults to 'hour')
 *   - limit: max results (defaults to 1000, max 10000)
 *   - skip: pagination offset (defaults to 0)
 * 
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "apiKeyId": "sha256hash...",
 *       "period": { "from": "2024-01-15T00:00:00Z", "to": "2024-01-22T00:00:00Z" },
 *       "totalRequests": 1234,
 *       "byEndpoint": [
 *         { "endpoint": "/api/v1/certificates", "method": "POST", "totalRequests": 500, "statusCodeBreakdown": { "201": 500 } },
 *         ...
 *       ],
 *       "byStatusCode": { "201": 500, "400": 10, "500": 5 },
 *       "hourlyBreakdown": [
 *         { "hour": "2024-01-15T00:00:00Z", "requests": 45, "statusCodeBreakdown": { "201": 45 } },
 *         ...
 *       ]
 *     }
 *   }
 */
router.get('/api-keys/:keyId/usage', verifyJWT, getApiKeyUsage);

export default router;
