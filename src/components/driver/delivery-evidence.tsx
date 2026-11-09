import { useState } from 'react';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { secureUpload,MB } from '@/lib/secure-upload';
import { Input } from '@/components/ui/input';
export function DeliveryEvidence({id,onUploaded}:{id:string;onUploaded:(path:string)=>void}){const {user}=useAuth(),[busy,setBusy]=useState(false);return <label className="grid gap-2 text-sm"><span className="flex items-center gap-2"><Camera className="size-4"/>{busy?'Uploading evidence…':'Proof of delivery photo'}</span><Input aria-label="Proof of delivery photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!user} onChange={async e=>{const file=e.target.files?.[0];if(!file||!user)return;setBusy(true);try{const result=await secureUpload(file,{bucket:'job-photos',userId:user.id,scope:id,prefix:'delivery-proof',allowed:['image/jpeg','image/png','image/webp'],maxBytes:5*MB});onUploaded(result.path);toast.success('Evidence uploaded');}catch(err){toast.error(err instanceof Error?err.message:'Upload failed');}finally{setBusy(false);}}}/></label>;}
