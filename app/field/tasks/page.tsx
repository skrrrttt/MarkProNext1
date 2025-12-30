'use client';

import { ClipboardList } from 'lucide-react';

export default function FieldTasksPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <ClipboardList className="w-16 h-16 text-white/20 mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Tasks</h2>
      <p className="text-white/60">Coming soon</p>
    </div>
  );
}
