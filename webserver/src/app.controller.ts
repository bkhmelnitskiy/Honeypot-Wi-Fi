import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiMap() {
    return {
      name: 'Honey Phoney API',
      version: 'v1',
      endpoints: {
        auth: {
          'POST /api/v1/auth/register': 'Create a new account',
          'POST /api/v1/auth/login': 'Login and receive tokens',
          'POST /api/v1/auth/refresh': 'Refresh access token',
          'POST /api/v1/auth/logout': 'Revoke refresh token',
        },
        users: {
          'GET /api/v1/users/me': 'Get current user profile',
          'PATCH /api/v1/users/me': 'Update current user profile',
          'DELETE /api/v1/users/me': 'Delete account',
        },
        scans: {
          'POST /api/v1/scans': 'Upload a scan',
          'GET /api/v1/scans': 'List scans (paginated)',
          'GET /api/v1/scans/:id': 'Get scan details',
        },
        networks: {
          'GET /api/v1/networks': 'List networks (paginated)',
          'GET /api/v1/networks/:id': 'Get network details',
        },
        stats: {
          'GET /api/v1/stats/global': 'Global platform statistics',
          'GET /api/v1/stats/attacks': 'Attack type statistics',
        },
        sync: {
          'GET /api/v1/sync/status': 'Get sync status (incremental)',
          'POST /api/v1/sync/batch': 'Batch upload scans',
        },
      },
    };
  }
}
