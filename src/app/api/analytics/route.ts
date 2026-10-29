import { NextResponse } from 'next/server';
import { dataStore } from '@/services/repository/data-store';
import { discoveryService } from '@/services/discovery/discovery-service';
import { outreachService } from '@/services/ai/outreach-service';
import { emailService } from '@/services/email/email-service';

export async function GET() {
  const stats = dataStore.getPlatformStats();
  
  return NextResponse.json({
    success: true,
    stats,
    systemIntegrations: {
      discoveryProviders: discoveryService.getProviders(),
      llmProviders: outreachService.getProviders(),
      emailProviders: emailService.getProviders(),
      emergencyStop: process.env.EMERGENCY_STOP === 'true',
      defaultSendMode: process.env.DEFAULT_SEND_MODE || 'draft_only',
    },
  });
}
