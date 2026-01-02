'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function DiagnosticPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, role } = useAuth();
  const supabase = createClient();

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: User Authentication
    if (user) {
      diagnosticResults.push({
        name: 'User Authentication',
        status: 'success',
        message: `Logged in as ${user.email || 'unknown'}`,
        details: { id: user.id, role: role, email: user.email },
      });
    } else {
      diagnosticResults.push({
        name: 'User Authentication',
        status: 'error',
        message: 'Not authenticated',
      });
    }

    // Test 2: Check if jobs table exists and count
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true });

      if (jobsError) {
        diagnosticResults.push({
          name: 'Jobs Table Access',
          status: 'error',
          message: jobsError.message,
          details: jobsError,
        });
      } else {
        diagnosticResults.push({
          name: 'Jobs Table Access',
          status: 'success',
          message: `Can access jobs table`,
        });
      }
    } catch (err: any) {
      diagnosticResults.push({
        name: 'Jobs Table Access',
        status: 'error',
        message: err.message,
      });
    }

    // Test 3: Try to fetch jobs with full query
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          name,
          stage:job_stages(name, is_field_visible)
        `)
        .limit(5);

      if (jobsError) {
        diagnosticResults.push({
          name: 'Fetch Jobs Query',
          status: 'error',
          message: jobsError.message,
          details: jobsError,
        });
      } else {
        diagnosticResults.push({
          name: 'Fetch Jobs Query',
          status: jobsData && jobsData.length > 0 ? 'success' : 'warning',
          message: `Found ${jobsData?.length || 0} jobs`,
          details: jobsData,
        });
      }
    } catch (err: any) {
      diagnosticResults.push({
        name: 'Fetch Jobs Query',
        status: 'error',
        message: err.message,
      });
    }

    // Test 4: Check shop_tasks
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('shop_tasks')
        .select('*')
        .limit(5);

      if (tasksError) {
        diagnosticResults.push({
          name: 'Shop Tasks Query',
          status: 'error',
          message: tasksError.message,
          details: tasksError,
        });
      } else {
        diagnosticResults.push({
          name: 'Shop Tasks Query',
          status: tasksData && tasksData.length > 0 ? 'success' : 'warning',
          message: `Found ${tasksData?.length || 0} shop tasks`,
          details: tasksData,
        });
      }
    } catch (err: any) {
      diagnosticResults.push({
        name: 'Shop Tasks Query',
        status: 'error',
        message: err.message,
      });
    }

    // Test 5: Check job_stages
    try {
      const { data: stagesData, error: stagesError } = await supabase
        .from('job_stages')
        .select('*');

      if (stagesError) {
        diagnosticResults.push({
          name: 'Job Stages Query',
          status: 'error',
          message: stagesError.message,
          details: stagesError,
        });
      } else {
        const fieldVisibleStages = stagesData?.filter((s: any) => s.is_field_visible) || [];
        diagnosticResults.push({
          name: 'Job Stages Query',
          status: stagesData && stagesData.length > 0 ? 'success' : 'warning',
          message: `Found ${stagesData?.length || 0} stages (${fieldVisibleStages.length} field-visible)`,
          details: stagesData,
        });
      }
    } catch (err: any) {
      diagnosticResults.push({
        name: 'Job Stages Query',
        status: 'error',
        message: err.message,
      });
    }

    // Test 6: Check job_assignments for current user
    if (user?.id) {
      try {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('job_assignments')
          .select('*')
          .eq('user_id', user.id);

        if (assignmentsError) {
          diagnosticResults.push({
            name: 'Job Assignments',
            status: 'error',
            message: assignmentsError.message,
            details: assignmentsError,
          });
        } else {
          diagnosticResults.push({
            name: 'Job Assignments',
            status: assignmentsData && assignmentsData.length > 0 ? 'success' : 'warning',
            message: `User assigned to ${assignmentsData?.length || 0} jobs`,
            details: assignmentsData,
          });
        }
      } catch (err: any) {
        diagnosticResults.push({
          name: 'Job Assignments',
          status: 'error',
          message: err.message,
        });
      }
    }

    setResults(diagnosticResults);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      runDiagnostics();
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
          <p className="text-white/60 mt-1">Check database access and permissions</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Run Tests
        </button>
      </div>

      {!user && (
        <div className="card p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Not Authenticated</h3>
          <p className="text-white/60">Please log in to run diagnostics</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className="card p-4"
            >
              <div className="flex items-start gap-3">
                {result.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                )}
                {result.status === 'error' && (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                {result.status === 'warning' && (
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white">{result.name}</h3>
                  <p className={`text-sm mt-1 ${
                    result.status === 'success' ? 'text-green-400' :
                    result.status === 'error' ? 'text-red-400' :
                    'text-amber-400'
                  }`}>
                    {result.message}
                  </p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                        Show details
                      </summary>
                      <pre className="text-xs text-white/60 mt-2 p-2 bg-dark-bg rounded overflow-auto max-h-40">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-white">Next Steps</h3>
        <div className="space-y-2 text-sm text-white/60">
          <p><strong className="text-white">If you see "Found 0 jobs":</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>The migration hasn't been applied yet - see <code className="text-purple-400">APPLY_THIS_MIGRATION.sql</code></li>
            <li>Or there are no jobs in the database - create some in the admin panel</li>
            <li>Or no job stages are marked as field-visible - check job_stages table</li>
          </ol>

          <p className="mt-4"><strong className="text-white">If you see permission errors:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-4">
            <li>Apply the migration SQL in your Supabase dashboard</li>
            <li>Make sure RLS policies are set up correctly</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
