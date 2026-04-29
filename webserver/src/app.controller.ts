import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiMap() {
    return {
      name: 'Honey Phoney API',
      version: 'v1'
    };
  }
}
