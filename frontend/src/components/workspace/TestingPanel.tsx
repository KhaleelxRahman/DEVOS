import React, { useEffect, useState } from 'react';
import { FlaskConical, Play } from 'lucide-react';
import { testingApi } from '../../api';
import { Spinner, Badge } from '../common';

interface TestingPanelProps {
  projectId: string;
}

interface Job {
  id: string;
  label: string;
  available: boolean;
  timeout_seconds: number;
}

interface JobResult {
  job: string;
  label: string;
  status: string;
  exit_code: number;
  duration_ms: number;
  stdout: string;
  stderr: string;
}

export const TestingPanel: React.FC<TestingPanelProps> = ({ projectId }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [results, setResults] = useState<Record<string, JobResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    testingApi
      .listJobs(projectId)
      .then((res) => setJobs(res.data?.jobs || []))
      .catch((err) => setError(err.message || 'Failed to load test jobs'))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  const run = async (jobId: string) => {
    setRunning(jobId);
    setError('');
    try {
      const res = await testingApi.runJob(projectId, jobId);
      setResults((prev) => ({ ...prev, [jobId]: res.data! }));
    } catch (err: any) {
      setError(err.message || 'Test run failed');
    } finally {
      setRunning(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
        <Spinner size={16} />
      </div>
    );
  }

  return (
    <div style={{ fontSize: 12, overflowY: 'auto', height: '100%' }}>
      {error && <p style={{ color: 'var(--color-error)' }} role="alert">{error}</p>}
      {jobs.map((job) => {
        const result = results[job.id];
        return (
          <div key={job.id} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={13} />
                {job.label}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {result && (
                  <Badge variant={result.status === 'passed' ? 'success' : 'error'}>
                    {result.status} · {Math.round(result.duration_ms)}ms
                  </Badge>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  disabled={running !== null || !job.available}
                  onClick={() => run(job.id)}
                  aria-label={`Run ${job.label}`}
                >
                  {running === job.id ? <Spinner size={10} /> : <Play size={12} />}
                </button>
              </span>
            </div>
            {!job.available && (
              <p style={{ color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Tool not installed on this server</p>
            )}
            {result && (
              <pre style={{ background: 'var(--color-background)', padding: 8, borderRadius: 6, overflowX: 'auto', maxHeight: 160, color: 'var(--color-text-secondary)', marginTop: 6 }}>
                {result.stdout || result.stderr || '(no output)'}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
};
