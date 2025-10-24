import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShiftService } from './shift.service';

@ApiTags('Shift')
@Controller('shifts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get()
  @ApiOperation({ summary: 'Get all shifts' })
  @ApiResponse({ status: 200, description: 'Shifts retrieved successfully' })
  async getShifts() {
    return this.shiftService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shift by ID' })
  @ApiResponse({ status: 200, description: 'Shift retrieved successfully' })
  async getShift(@Param('id') id: string) {
    return this.shiftService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Start a new shift' })
  @ApiResponse({ status: 201, description: 'Shift started successfully' })
  async startShift(@Body() startShiftDto: any) {
    return this.shiftService.startShift(startShiftDto);
  }

  @Patch(':id/end')
  @ApiOperation({ summary: 'End a shift' })
  @ApiResponse({ status: 200, description: 'Shift ended successfully' })
  async endShift(@Param('id') id: string, @Body() endShiftDto: any) {
    return this.shiftService.endShift(id, endShiftDto);
  }
}
