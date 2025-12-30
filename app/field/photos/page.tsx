'use client';

import { Camera } from 'lucide-react';

export default function FieldPhotosPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <Camera className="w-16 h-16 text-white/20 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Photos</h2>
      <p className="text-white/60">Coming soon</p>
    </div>
  );
}
