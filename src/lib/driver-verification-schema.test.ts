import { describe, expect, it } from 'vitest';
import { driverSubmissionSchema, driverReviewSchema } from './driver-verification-schema';
import { buildDriverOnboarding } from '@/components/driver/use-driver-onboarding';

describe('driver verification', () => {
  it('requires ID and licence details', () => {
    expect(driverSubmissionSchema.safeParse({identity: '',licence: 'ABC123'}).success).toBe(false);
    expect(driverSubmissionSchema.safeParse({identity: 'DUMMY-ID',licence: ''}).success).toBe(false);
    expect(driverSubmissionSchema.safeParse({identity: 'DUMMY-ID',licence: 'ABC123'}).success).toBe(true);
  });
  it('requires a reason for the admin decision', () => {
    expect(driverReviewSchema.safeParse({application: '33333333-3333-4333-8333-333333333333',status: 'approved',reason: ''}).success).toBe(false);
    expect(driverReviewSchema.safeParse({application: '33333333-3333-4333-8333-333333333333',status: 'rejected',reason: 'ID unreadable'}).success).toBe(true);
  });
  it('locks dispatch until admin approval even with complete documents', () => {
    const input = {vehicles:[{plate:'DUMMY'}],profile:{full_name:'Dummy Driver',phone:'+263000000000',city:'Harare',zone_radius_km:10,services:['express_bike'],licence_url:'licence',id_document_url:'id',vehicle_doc_url:'registration',verification_status:'pending'},online:false};
    expect(buildDriverOnboarding(input).steps.find(s=>s.key==='online')?.locked).toBe(true);
    expect(buildDriverOnboarding({...input,profile:{...input.profile,verification_status:'approved'}}).steps.find(s=>s.key==='online')?.locked).toBe(false);
  });
});